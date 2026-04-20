"""Auth 라우터 — 회원가입, 로그인, 토큰 갱신/로그아웃, 마이페이지"""
from __future__ import annotations

import hashlib
import time
from datetime import datetime, timezone
from pathlib import Path

import jwt
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import KST, settings
from app.core.database import get_db
from app.core.redis import RedisKeys, get_redis
from app.core.security import get_current_user
from app.modules.auth import schemas, services
from app.modules.auth.models import PositionEnum, RefreshToken, StatusEnum, User
from app.utils.audit import write_audit_log
from app.utils.permission_utils import is_system

router = APIRouter()

_REFRESH_COOKIE = "refresh_token"
_REFRESH_PATH   = "/api/auth/refresh"


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=raw_token,
        httponly=True,
        secure=True,        # HTTPS 필수 (cross-site 쿠키는 항상 secure 필요)
        samesite="none",    # cross-site 허용 (프론트/백엔드 도메인이 다를 때)
        path=_REFRESH_PATH,
        max_age=services.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )


def _delete_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=_REFRESH_COOKIE,
        path=_REFRESH_PATH,
        httponly=True,
        secure=True,
        samesite="none",
    )


# ── 아이디 중복 확인 ──────────────────────────────────────────────────────
@router.get(
    "/check-username",
    response_model=schemas.UsernameCheckResponse,
    summary="아이디 중복 확인 (실시간)",
)
def check_username(
    username: str = Query(..., min_length=3, max_length=50),
    db: Session = Depends(get_db),
):
    exists = services.get_user_by_username(db, username) is not None
    if exists:
        return {"available": False, "message": "이미 사용 중인 아이디입니다."}
    return {"available": True, "message": "사용 가능한 아이디입니다."}


# ── 회원가입 신청 ─────────────────────────────────────────────────────────
@router.post(
    "/register",
    response_model=schemas.RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="회원가입 신청 (PENDING 상태)",
)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    # 아이디 중복
    if services.get_user_by_username(db, payload.username):
        raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다.")

    # 이메일 중복
    if db.query(User).filter(User.email == str(payload.email)).first():
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")

    user = User(
        username=payload.username,
        password=services.hash_password(payload.password),
        name=payload.name,
        position=PositionEnum.crew,
        gender=payload.gender,
        birth_date=payload.birth_date,
        ssn=services.encrypt_ssn(payload.ssn),
        phone=payload.phone,
        email=str(payload.email),
        bank_name=payload.bank_name,
        account_number=payload.account_number,
        hire_date=payload.hire_date,
        health_cert_expire=payload.health_cert_expire,
        unavailable_days=payload.unavailable_days,
        is_active=True,
        status=StatusEnum.pending,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="이미 사용 중인 아이디 또는 이메일입니다.")

    write_audit_log(db, "USER_REGISTERED", target_user_id=user.id, details={"username": user.username})
    db.commit()

    return {"message": "가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다."}


# ── 로그인 ────────────────────────────────────────────────────────────────
@router.post("/login", response_model=schemas.TokenResponse, summary="로그인")
async def login(
    request:  Request,
    payload:  schemas.LoginRequest,
    response: Response,
    db:       Session = Depends(get_db),
    redis=Depends(get_redis),
):
    ip          = request.client.host if request.client else "unknown"
    device_info = request.headers.get("User-Agent", "")[:500]

    user = services.get_user_by_username(db, payload.username)

    # 타이밍 공격 방지: 사용자가 없어도 verify 실행
    password_ok = services.verify_password(
        payload.password,
        user.password if user else services.DUMMY_HASH,
    )

    if not user or not password_ok:
        if user:
            user.login_failed_count    = (user.login_failed_count or 0) + 1
            user.last_login_failed_at  = datetime.now(KST)
            db.commit()
        write_audit_log(db, "USER_LOGIN_FAILED", ip=ip, details={"username": payload.username})
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )

    # 계정 상태 확인
    status_messages = {
        StatusEnum.pending:   "관리자 승인 대기중입니다.",
        StatusEnum.rejected:  "가입이 거절되었습니다. 관리자에게 문의하세요.",
        StatusEnum.suspended: "계정이 정지되었습니다. 관리자에게 문의하세요.",
    }
    if user.status in status_messages:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=status_messages[user.status],
        )

    # 토큰 발급
    access_token, jti, expires_in = services.create_access_token(user=user)
    raw_refresh = await services.issue_refresh_token(
        user=user, db=db, redis=redis,
        jti=jti, ip_address=ip, device_info=device_info,
    )

    # 로그인 성공 처리
    user.login_failed_count = 0
    user.last_login_at      = datetime.now(KST)
    write_audit_log(db, "USER_LOGIN_SUCCESS", actor_id=user.id, ip=ip)
    db.commit()

    # Refresh Token → httpOnly Cookie
    _set_refresh_cookie(response, raw_refresh)

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=schemas.UserMeResponse(
            id=user.id,
            username=user.username,
            name=user.name,
            position=user.position,
            is_active=user.is_active,
            is_system=user.position == PositionEnum.system,
            is_admin=user.position in {PositionEnum.admin, PositionEnum.system},
            status=user.status,
        ),
    )


# ── 토큰 갱신 ─────────────────────────────────────────────────────────────
@router.post("/refresh", response_model=schemas.AccessTokenResponse, summary="Access Token 재발급")
async def refresh(
    request:  Request,
    response: Response,
    db:       Session = Depends(get_db),
    redis=Depends(get_redis),
):
    raw_token = request.cookies.get(_REFRESH_COOKIE)
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not found")

    token_hash = hashlib.sha512(raw_token.encode()).hexdigest()

    # Redis에서 user_id 조회
    user_id_str = await redis.get(RedisKeys.refresh_token(token_hash))
    if not user_id_str:
        # 이미 사용된 토큰 → Refresh Token Reuse Attack 의심
        # DB에서 hash로 조회해 owner를 찾아 전체 세션 폐기
        db_token = db.query(RefreshToken).filter_by(token_hash=token_hash).first()
        if db_token:
            await services.revoke_all_sessions(
                user_id=db_token.user_id, db=db, redis=redis, reason="reuse"
            )
            db.commit()
            write_audit_log(db, "TOKEN_REUSE_DETECTED", target_user_id=db_token.user_id,
                            ip=request.client.host if request.client else None)
            db.commit()
        _delete_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = db.query(User).filter_by(id=int(user_id_str)).first()
    if not user or user.status != StatusEnum.approved:
        _delete_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or not active")

    # 새 Access Token 발급
    new_access_token, new_jti, expires_in = services.create_access_token(user=user)
    ip          = request.client.host if request.client else "unknown"
    device_info = request.headers.get("User-Agent", "")[:500]

    # Token Rotation
    new_raw_refresh = await services.rotate_refresh_token(
        old_hash=token_hash,
        user=user, db=db, redis=redis,
        new_jti=new_jti, ip_address=ip, device_info=device_info,
    )
    db.commit()

    # 새 Cookie 설정
    _set_refresh_cookie(response, new_raw_refresh)

    return schemas.AccessTokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=expires_in,
    )


# ── 로그아웃 ─────────────────────────────────────────────────────────────
@router.post("/logout", summary="로그아웃")
async def logout(
    request:  Request,
    response: Response,
    db:       Session = Depends(get_db),
    redis=Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    # Access Token JTI 블랙리스트 등록
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        raw_access = auth_header[7:]
        try:
            payload  = jwt.decode(
                raw_access, settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            jti      = payload.get("jti", "")
            exp      = payload.get("exp", 0)
            now_unix = int(datetime.now(timezone.utc).timestamp())
            remaining_ttl = max(exp - now_unix, 1)
            if jti:
                await services.revoke_access_token(jti=jti, redis=redis, remaining_ttl=remaining_ttl)
        except jwt.PyJWTError:
            pass

    # Refresh Token 폐기
    raw_token = request.cookies.get(_REFRESH_COOKIE)
    if raw_token:
        token_hash = hashlib.sha512(raw_token.encode()).hexdigest()
        await redis.delete(RedisKeys.refresh_token(token_hash))
        await redis.srem(RedisKeys.session(current_user.id), token_hash)
        db.query(RefreshToken).filter_by(token_hash=token_hash).update({
            "is_revoked":    True,
            "revoked_at":    datetime.now(KST),
            "revoke_reason": "logout",
        })

    _delete_refresh_cookie(response)
    write_audit_log(db, "USER_LOGOUT", actor_id=current_user.id,
                    ip=request.client.host if request.client else None)
    db.commit()

    return {"message": "로그아웃 완료"}


# ── 내 정보 조회 ──────────────────────────────────────────────────────────
@router.get("/me", response_model=schemas.UserMeResponse, summary="내 정보 조회")
async def me(current_user: User = Depends(get_current_user)):
    return schemas.UserMeResponse(
        id=current_user.id,
        username=current_user.username,
        name=current_user.name,
        position=current_user.position,
        is_active=current_user.is_active,
        is_system=current_user.position == PositionEnum.system,
        is_admin=current_user.position in {PositionEnum.admin, PositionEnum.system},
        status=current_user.status,
    )


# ── 마이페이지: 내 프로필 상세 조회 ──────────────────────────────────────
@router.get("/me/profile", response_model=schemas.MyProfileResponse, summary="내 상세 프로필")
def my_profile(current_user: User = Depends(get_current_user)):
    return schemas.MyProfileResponse(
        id=current_user.id,
        username=current_user.username,
        name=current_user.name,
        position=current_user.position.value if current_user.position else "",
        gender=current_user.gender.value if current_user.gender else None,
        birth_date=current_user.birth_date,
        phone=current_user.phone,
        email=current_user.email,
        bank_name=current_user.bank_name,
        account_number=current_user.account_number,
        hire_date=current_user.hire_date,
        profile_image=current_user.profile_image,
    )


# ── 마이페이지: 내 정보 수정 ──────────────────────────────────────────────
@router.patch("/me/profile", response_model=schemas.MyProfileResponse, summary="내 정보 수정")
def update_my_profile(
    payload: schemas.UpdateMyProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_data = payload.model_dump(exclude_none=True)
    if "email" in update_data:
        email_str = str(update_data["email"])
        conflict = db.query(User).filter(User.email == email_str, User.id != current_user.id).first()
        if conflict:
            raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")
        update_data["email"] = email_str
    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return schemas.MyProfileResponse(
        id=current_user.id,
        username=current_user.username,
        name=current_user.name,
        position=current_user.position.value if current_user.position else "",
        gender=current_user.gender.value if current_user.gender else None,
        birth_date=current_user.birth_date,
        phone=current_user.phone,
        email=current_user.email,
        bank_name=current_user.bank_name,
        account_number=current_user.account_number,
        hire_date=current_user.hire_date,
        profile_image=current_user.profile_image,
    )


# ── 마이페이지: 비밀번호 변경 ────────────────────────────────────────────
@router.post("/change-password", summary="비밀번호 변경")
def change_password(
    payload: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not services.verify_password(payload.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")
    current_user.password = services.hash_password(payload.new_password)
    write_audit_log(db, "PASSWORD_CHANGED", actor_id=current_user.id)
    db.commit()
    return {"message": "비밀번호가 변경되었습니다."}


# ── 마이페이지: 프로필 이미지 업로드 ─────────────────────────────────────
_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MAX_SIZE = 5 * 1024 * 1024  # 5 MB

@router.post("/me/avatar", response_model=schemas.MyProfileResponse, summary="프로필 이미지 업로드")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="jpg, png, webp, gif 파일만 업로드 가능합니다.")

    contents = await file.read()
    if len(contents) > _MAX_SIZE:
        raise HTTPException(status_code=400, detail="파일 크기는 5MB 이하만 가능합니다.")

    ext = Path(file.filename or "img.jpg").suffix.lower() or ".jpg"
    filename = f"{current_user.id}_{int(time.time())}{ext}"
    save_path = Path(settings.UPLOAD_DIR) / "profiles" / filename

    save_path.parent.mkdir(parents=True, exist_ok=True)
    save_path.write_bytes(contents)

    # 기존 이미지 삭제
    if current_user.profile_image:
        old_path = Path(settings.UPLOAD_DIR) / "profiles" / current_user.profile_image
        if old_path.exists():
            old_path.unlink(missing_ok=True)

    current_user.profile_image = filename
    db.commit()
    db.refresh(current_user)

    return schemas.MyProfileResponse(
        id=current_user.id,
        username=current_user.username,
        name=current_user.name,
        position=current_user.position.value if current_user.position else "",
        gender=current_user.gender.value if current_user.gender else None,
        birth_date=current_user.birth_date,
        phone=current_user.phone,
        email=current_user.email,
        bank_name=current_user.bank_name,
        account_number=current_user.account_number,
        hire_date=current_user.hire_date,
        profile_image=current_user.profile_image,
    )


# ── 재직 스태프 목록 ──────────────────────────────────────────────────────
@router.get(
    "/staff",
    response_model=list[schemas.StaffResponse],
    summary="재직중인 리더/크루 목록 조회",
)
async def staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if is_system(current_user):
        raise HTTPException(status_code=403, detail="시스템 계정은 조회할 수 없습니다.")

    staff_list = (
        db.query(User)
        .filter(
            User.is_active.is_(True),
            User.status == StatusEnum.approved,
            User.position.in_([PositionEnum.leader, PositionEnum.crew]),
            User.id != current_user.id,
        )
        .all()
    )
    return staff_list
