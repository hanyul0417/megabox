from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    BigInteger,
    DECIMAL,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class PositionEnum(str, enum.Enum):
    admin   = "관리자"   # 통합 관리자 (구 점장 + 매니저 + 바이저)
    leader  = "리더"
    crew    = "크루"
    cleaner = "미화"
    system  = "시스템"


class GenderEnum(str, enum.Enum):
    male   = "남"
    female = "여"


class StatusEnum(str, enum.Enum):
    pending   = "pending"    # 가입 신청 (승인 대기)
    approved  = "approved"   # 정상 활성 계정
    rejected  = "rejected"   # 가입 거절
    suspended = "suspended"  # 관리자 정지


class User(Base):
    __tablename__ = "users"

    id       = Column(Integer, primary_key=True, index=True)
    username = Column(String(50),  unique=True, nullable=False, comment="로그인 ID")
    password = Column(String(255), nullable=False,              comment="비밀번호(bcrypt_sha256)")
    name     = Column(String(20),  nullable=False,              comment="이름")
    position = Column(Enum(PositionEnum), nullable=False,       comment="직급")
    gender   = Column(Enum(GenderEnum),   nullable=True,        comment="성별")
    birth_date = Column(Date, nullable=True, comment="생년월일")

    ssn            = Column(String(255), nullable=True, comment="주민등록번호(Fernet 암호화)")
    phone          = Column(String(20),  nullable=True, comment="휴대폰번호")
    email          = Column(String(100), nullable=True, unique=True, comment="이메일")
    bank_name      = Column(String(50),  nullable=True, comment="은행명")
    account_number = Column(String(50),  nullable=True, comment="계좌번호")
    hire_date      = Column(Date,        nullable=True, comment="입사일")
    retire_date    = Column(Date,        nullable=True, comment="퇴사일")
    unavailable_days   = Column(JSON, nullable=True, comment="고정 불가 요일 [0=일~6=토]")
    health_cert_expire = Column(Date, nullable=True, comment="보건증 만료일")
    annual_leave_hours = Column(DECIMAL(3, 1), default=Decimal("5.5"), comment="연차 시간")
    wage           = Column(Integer, default=0, nullable=False, comment="개인 시급 (0이면 최저시급 적용)")
    is_active      = Column(Boolean, default=True, nullable=False, comment="재직 상태")

    # ── 계정 상태 ──────────────────────────────────────
    status = Column(
        Enum(StatusEnum),
        nullable=False,
        default=StatusEnum.approved,
        comment="계정 상태",
    )

    # 승인/거절 추적
    approved_by      = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at      = Column(DateTime, nullable=True)
    rejection_reason = Column(String(500), nullable=True, comment="거절 사유")

    # 정지 추적
    suspended_by   = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    suspended_at   = Column(DateTime, nullable=True)
    suspend_reason = Column(String(500), nullable=True, comment="정지 사유")

    # ── 보안 / 로그인 추적 ────────────────────────────
    login_failed_count   = Column(SmallInteger, default=0, nullable=False, comment="연속 로그인 실패 횟수")
    last_login_failed_at = Column(DateTime, nullable=True, comment="마지막 로그인 실패 시각")
    last_login_at        = Column(DateTime, nullable=True, comment="마지막 로그인 성공 시각")

    # ── 프로필 이미지 ──────────────────────────────────
    profile_image = Column(String(255), nullable=True, comment="프로필 이미지 파일명")

    # ── Relationships ─────────────────────────────────
    attendance_events = relationship("AttendanceEvent", back_populates="user", cascade="all, delete")
    payrolls          = relationship("Payroll",         back_populates="user", cascade="all, delete")
    user_wages  = relationship("UserWage",   back_populates="user", cascade="all, delete")
    posts    = relationship("Post",    back_populates="author", cascade="all, delete")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")

    schedules = relationship(
        "Schedule",
        foreign_keys="Schedule.user_id",
        back_populates="user",
        cascade="all, delete",
    )
    day_off_requests = relationship(
        "DayOffRequest",
        foreign_keys="DayOffRequest.user_id",
        back_populates="user",
        cascade="all, delete",
    )
    processed_day_off_requests = relationship(
        "DayOffRequest",
        foreign_keys="DayOffRequest.processed_by",
        back_populates="processor",
    )
    shift_requests_sent = relationship(
        "ShiftRequest",
        foreign_keys="ShiftRequest.requester_id",
        back_populates="requester",
        cascade="all, delete",
    )
    shift_requests_received = relationship(
        "ShiftRequest",
        foreign_keys="ShiftRequest.target_user_id",
        back_populates="target_user",
    )
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete")
    notifications  = relationship("Notification", back_populates="recipient", cascade="all, delete")

    def __repr__(self) -> str:
        return f"<User(username={self.username}, position={self.position}, status={self.status})>"


class RefreshToken(Base):
    """Refresh Token 발급 기록 (Redis가 primary store, DB는 감사 목적)"""
    __tablename__ = "refresh_tokens"

    id         = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(128), unique=True, nullable=False, comment="SHA-512 해시")
    jti        = Column(String(36),  nullable=True, comment="대응하는 Access Token JTI")
    device_info = Column(String(500), nullable=True, comment="User-Agent")
    ip_address  = Column(String(45),  nullable=True)
    issued_at   = Column(DateTime,    nullable=False)
    expires_at  = Column(DateTime,    nullable=False)
    is_revoked  = Column(Boolean, default=False, nullable=False)
    revoked_at  = Column(DateTime, nullable=True)
    revoke_reason = Column(String(100), nullable=True, comment="logout / rotated / reuse / admin")

    user = relationship("User", back_populates="refresh_tokens")


class AuditLog(Base):
    """불변 감사 로그 — 절대 UPDATE/DELETE 하지 않는다"""
    __tablename__ = "audit_logs"

    id             = Column(BigInteger, primary_key=True, autoincrement=True)
    event_type     = Column(String(50),  nullable=False, comment="이벤트 유형")
    actor_id       = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ip_address     = Column(String(45),  nullable=True)
    user_agent     = Column(String(500), nullable=True)
    details        = Column(JSON,        nullable=True)
    created_at     = Column(DateTime,    nullable=False)
