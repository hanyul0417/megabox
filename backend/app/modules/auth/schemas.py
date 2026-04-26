from __future__ import annotations

import re
from datetime import date
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.modules.auth.models import GenderEnum, PositionEnum, StatusEnum


# ── 아이디 중복 확인 ──────────────────────────────────────────────────────
class UsernameCheckResponse(BaseModel):
    available: bool
    message: str


# ── 회원가입 ─────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    """직원 자가 회원가입 요청 — PENDING 상태로 저장"""

    # Step 1 (필수)
    username:   str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password:   str = Field(min_length=8, max_length=100)
    name:       str = Field(min_length=2, max_length=20)
    gender:     GenderEnum
    birth_date: date

    # Step 2 (필수)
    ssn:   str = Field(min_length=14, max_length=14, description="XXXXXX-XXXXXXX 형식")
    phone: str = Field(min_length=10, max_length=13)
    email: EmailStr

    # Step 3 (선택)
    bank_name:          Optional[str]       = None
    account_number:     Optional[str]       = None
    hire_date:          Optional[date]      = None
    health_cert_expire: Optional[date]      = None
    unavailable_days:   Optional[List[int]] = Field(
        default=None, description="0=일요일 ~ 6=토요일"
    )

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("비밀번호에 영문 대문자가 포함되어야 합니다.")
        if not re.search(r"[0-9]", v):
            raise ValueError("비밀번호에 숫자가 포함되어야 합니다.")
        if not re.search(r"[!@#$%^&*]", v):
            raise ValueError("비밀번호에 특수문자(!@#$%^&*)가 포함되어야 합니다.")
        return v

    @field_validator("ssn")
    @classmethod
    def validate_ssn_format(cls, v: str) -> str:
        if not re.match(r"^\d{6}-\d{7}$", v):
            raise ValueError("주민등록번호 형식이 올바르지 않습니다. (XXXXXX-XXXXXXX)")
        return v


class RegisterResponse(BaseModel):
    message: str


# ── 로그인 ────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


# ── 토큰 응답 ─────────────────────────────────────────────────────────────
class UserMeResponse(BaseModel):
    """로그인/me 엔드포인트 사용자 정보"""
    id:        int
    username:  str
    name:      str
    position:  PositionEnum
    is_active: bool
    is_system: bool
    is_admin:  bool
    status:    StatusEnum

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """로그인 성공 응답 — Refresh Token은 httpOnly Cookie로 전달"""
    access_token: str
    token_type:   str = "bearer"
    expires_in:   int          # 초 단위 (예: 900 = 15분)
    user:         UserMeResponse


class AccessTokenResponse(BaseModel):
    """Refresh 엔드포인트 응답"""
    access_token: str
    token_type:   str = "bearer"
    expires_in:   int


# ── 기존 /me 응답 (하위 호환) ─────────────────────────────────────────────
class UserResponse(BaseModel):
    id:        int
    username:  str
    name:      str
    position:  str
    is_active: bool

    model_config = {"from_attributes": True}


# ── 스태프 목록 ───────────────────────────────────────────────────────────
class StaffResponse(BaseModel):
    id:       int
    name:     str
    position: PositionEnum

    model_config = {"from_attributes": True}


# ── 마이페이지 ─────────────────────────────────────────────────────────────
class MyProfileResponse(BaseModel):
    id:               int
    username:         str
    name:             str
    position:         str
    gender:           Optional[str] = None
    birth_date:       Optional[date] = None
    phone:            Optional[str] = None
    email:            Optional[str] = None
    bank_name:        Optional[str] = None
    account_number:   Optional[str] = None
    hire_date:        Optional[date] = None
    profile_image:    Optional[str] = None
    unavailable_days: Optional[List[int]] = None

    model_config = {"from_attributes": True}


class UpdateMyProfileRequest(BaseModel):
    phone:          Optional[str] = None
    email:          Optional[EmailStr] = None
    bank_name:      Optional[str] = None
    account_number: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str = Field(min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def validate_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("영문 대문자가 포함되어야 합니다.")
        if not re.search(r"[0-9]", v):
            raise ValueError("숫자가 포함되어야 합니다.")
        if not re.search(r"[!@#$%^&*]", v):
            raise ValueError("특수문자(!@#$%^&*)가 포함되어야 합니다.")
        return v

    @model_validator(mode="after")
    def passwords_must_differ(self) -> "ChangePasswordRequest":
        if self.current_password == self.new_password:
            raise ValueError("새 비밀번호는 현재 비밀번호와 달라야 합니다.")
        return self
