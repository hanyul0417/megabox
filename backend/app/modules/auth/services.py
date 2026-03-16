"""Auth 서비스 — 토큰 발급/갱신/폐기, 패스워드, Rate Limit"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from cryptography.fernet import Fernet
from passlib.context import CryptContext
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import KST, settings
from app.core.redis import RedisKeys
from app.modules.auth.models import PositionEnum, RefreshToken, StatusEnum, User

# ── 상수 ────────────────────────────────────────────────────────────────
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS   = settings.REFRESH_TOKEN_EXPIRE_DAYS
MAX_LOGIN_ATTEMPTS          = settings.MAX_LOGIN_ATTEMPTS
LOGIN_LOCKOUT_MINUTES       = settings.LOGIN_LOCKOUT_MINUTES
MAX_CONCURRENT_SESSIONS     = 5

# ── 패스워드 ─────────────────────────────────────────────────────────────
pwd_context = CryptContext(
    schemes=["bcrypt_sha256", "bcrypt"],
    default="bcrypt_sha256",
    deprecated=["bcrypt"],
)


DUMMY_HASH = pwd_context.hash("__dummy_timing_prevention__")


def hash_password(raw: str) -> str:
    return pwd_context.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    return pwd_context.verify(raw, hashed)


# ── 사용자 조회 ───────────────────────────────────────────────────────────
def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()


def is_admin_position(pos: PositionEnum) -> bool:
    return pos in {PositionEnum.admin, PositionEnum.system}


# ── SSN 암호화 ────────────────────────────────────────────────────────────
fernet = Fernet(settings.SSN_SECRET_KEY)


def encrypt_ssn(ssn: str) -> str:
    return fernet.encrypt(ssn.encode()).decode()


def decrypt_ssn(token: str) -> str:
    return fernet.decrypt(token.encode()).decode()


# ── Access Token (JWT) ────────────────────────────────────────────────────
def create_access_token(*, user: User) -> tuple[str, str, int]:
    """JWT Access Token 발급.

    Returns:
        (token_str, jti, expires_in_seconds)
    """
    now = datetime.now(timezone.utc)
    jti = str(uuid.uuid4())
    exp = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub":       str(user.id),
        "jti":       jti,
        "username":  user.username,
        "position":  user.position.value,
        "is_admin":  user.position in {PositionEnum.admin, PositionEnum.system},
        "is_system": user.position == PositionEnum.system,
        "iat":       int(now.timestamp()),
        "exp":       int(exp.timestamp()),
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti, ACCESS_TOKEN_EXPIRE_MINUTES * 60


# ── Refresh Token (Opaque) ────────────────────────────────────────────────
def _make_refresh_token() -> tuple[str, str]:
    """(raw_token, sha512_hash) 쌍을 생성한다.

    raw_token: 클라이언트에게 전달 (httpOnly Cookie)
    sha512_hash: Redis/DB 저장 키
    """
    raw    = secrets.token_hex(64)  # 128-char hex
    hashed = hashlib.sha512(raw.encode()).hexdigest()
    return raw, hashed


async def issue_refresh_token(
    *,
    user: User,
    db: Session,
    redis: Redis,
    jti: str,
    ip_address: str | None,
    device_info: str | None,
) -> str:
    """Refresh Token을 Redis(primary) + DB(audit)에 저장하고 raw token을 반환한다."""
    raw_token, token_hash = _make_refresh_token()
    now_dt   = datetime.now(KST)
    expires  = now_dt + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    ttl_secs = REFRESH_TOKEN_EXPIRE_DAYS * 86400

    # ① Redis 저장
    await redis.setex(RedisKeys.refresh_token(token_hash), ttl_secs, str(user.id))
    await redis.sadd(RedisKeys.session(user.id), token_hash)

    # ② 동시 세션 제한 (초과 시 가장 임의의 세션 1개 제거)
    session_hashes: set = await redis.smembers(RedisKeys.session(user.id))
    if len(session_hashes) > MAX_CONCURRENT_SESSIONS:
        oldest = next(iter(session_hashes - {token_hash}))
        await redis.delete(RedisKeys.refresh_token(oldest))
        await redis.srem(RedisKeys.session(user.id), oldest)

    # ③ DB 기록
    db.add(RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        jti=jti,
        device_info=device_info,
        ip_address=ip_address,
        issued_at=now_dt,
        expires_at=expires,
    ))

    return raw_token


async def rotate_refresh_token(
    *,
    old_hash: str,
    user: User,
    db: Session,
    redis: Redis,
    new_jti: str,
    ip_address: str | None,
    device_info: str | None,
) -> str:
    """기존 Refresh Token을 폐기하고 새 토큰을 발급한다 (Token Rotation)."""
    # 기존 폐기
    await redis.delete(RedisKeys.refresh_token(old_hash))
    await redis.srem(RedisKeys.session(user.id), old_hash)
    db.query(RefreshToken).filter_by(token_hash=old_hash).update({
        "is_revoked":    True,
        "revoked_at":    datetime.now(KST),
        "revoke_reason": "rotated",
    })

    # 새 토큰 발급
    return await issue_refresh_token(
        user=user, db=db, redis=redis,
        jti=new_jti, ip_address=ip_address, device_info=device_info,
    )


async def revoke_all_sessions(*, user_id: int, db: Session, redis: Redis, reason: str) -> None:
    """사용자의 모든 세션을 강제 만료시킨다 (탈취 감지 / 정지 처리 시)."""
    session_hashes: set = await redis.smembers(RedisKeys.session(user_id))
    for h in session_hashes:
        await redis.delete(RedisKeys.refresh_token(h))
    if session_hashes:
        await redis.delete(RedisKeys.session(user_id))

    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.is_revoked.is_(False),
    ).update({
        "is_revoked":    True,
        "revoked_at":    datetime.now(KST),
        "revoke_reason": reason,
    })


async def revoke_access_token(*, jti: str, redis: Redis, remaining_ttl: int) -> None:
    """로그아웃된 Access Token의 JTI를 블랙리스트에 등록한다."""
    if remaining_ttl > 0:
        await redis.setex(RedisKeys.blacklist(jti), remaining_ttl, "1")


# ── Rate Limiting ─────────────────────────────────────────────────────────
async def check_login_rate_limit(*, username: str, ip: str, redis: Redis) -> None:
    """로그인 시도 횟수 확인. 초과 시 TooManyRequestsError를 발생시킨다."""
    ip_key   = RedisKeys.login_rate_ip(ip)
    user_key = RedisKeys.login_rate_user(username)

    ip_count   = await redis.incr(ip_key)
    user_count = await redis.incr(user_key)

    lockout_ttl = LOGIN_LOCKOUT_MINUTES * 60
    if ip_count == 1:
        await redis.expire(ip_key, lockout_ttl)
    if user_count == 1:
        await redis.expire(user_key, lockout_ttl)

    if ip_count > MAX_LOGIN_ATTEMPTS or user_count > MAX_LOGIN_ATTEMPTS:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"로그인 시도가 너무 많습니다. {LOGIN_LOCKOUT_MINUTES}분 후 다시 시도해주세요.",
        )


async def reset_login_rate_limit(*, username: str, ip: str, redis: Redis) -> None:
    """로그인 성공 시 카운터를 초기화한다."""
    await redis.delete(
        RedisKeys.login_rate_ip(ip),
        RedisKeys.login_rate_user(username),
    )
