from __future__ import annotations

from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_serializer

from app.modules.auth.models import GenderEnum, PositionEnum, StatusEnum


# ── User (직원) ──────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username:  str = Field(min_length=3, max_length=50)
    password:  str = Field(min_length=4, max_length=255)
    name:      str = Field(min_length=2, max_length=10)
    position:  PositionEnum
    gender:    GenderEnum
    birth_date:     Optional[date] = None
    ssn:            Optional[str]  = None
    phone:          Optional[str]  = None
    email:          Optional[EmailStr] = None
    bank_name:      Optional[str]  = None
    account_number: Optional[str]  = None
    hire_date:      Optional[date] = None
    retire_date:    Optional[date] = None
    unavailable_days:   Optional[list[int]] = None
    health_cert_expire: Optional[date] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    name:       Optional[str]          = None
    position:   Optional[PositionEnum] = None
    gender:     Optional[GenderEnum]   = None
    birth_date: Optional[date]         = None
    ssn:        Optional[str]          = None
    password:   Optional[str]          = None
    phone:      Optional[str]          = None
    email:      Optional[EmailStr]     = None
    is_active:  Optional[bool]         = None
    bank_name:      Optional[str]  = None
    account_number: Optional[str]  = None
    hire_date:      Optional[date] = None
    retire_date:    Optional[date] = None
    unavailable_days:   Optional[list[int]] = None
    health_cert_expire: Optional[date]      = None
    annual_leave_hours: Optional[Decimal]   = None
    wage:       Optional[int]          = None


class UserOut(BaseModel):
    id:       int
    username: str
    name:     str
    position: PositionEnum
    gender:   Optional[GenderEnum]
    phone:    Optional[str]
    email:    Optional[EmailStr]
    is_active: bool
    status:   StatusEnum
    birth_date:         Optional[date]   = None
    ssn:                Optional[str]    = None
    bank_name:          Optional[str]    = None
    account_number:     Optional[str]    = None
    hire_date:          Optional[date]   = None
    retire_date:        Optional[date]   = None
    unavailable_days:   Optional[list[int]] = None
    health_cert_expire: Optional[date]   = None
    wage:               Optional[int]   = None
    annual_leave_hours: Optional[float] = None
    profile_image:      Optional[str]   = None

    model_config = {"from_attributes": True}


class UserDetailOut(UserOut):
    birth_date:     Optional[date]
    ssn:            Optional[str]
    bank_name:      Optional[str]
    account_number: Optional[str]
    hire_date:      Optional[date]
    retire_date:    Optional[date]
    unavailable_days:   Optional[list[int]]
    health_cert_expire: Optional[date]
    wage:                 Optional[int]
    login_failed_count:   Optional[int]
    last_login_at:        Optional[datetime]
    last_login_failed_at: Optional[datetime]


class PaginatedUsers(BaseModel):
    total: int
    items: List[UserOut]


# ── 시급 일괄 적용 ────────────────────────────────────────────────────────
class BulkWageUpdate(BaseModel):
    wage: int = Field(gt=0, description="적용할 시급")
    zero_only: bool = Field(True, description="True: 시급 미설정(0) 직원만 | False: 전체 직원")


class BulkWageUpdateResult(BaseModel):
    updated_count: int


# ── 가입 승인 대기 ────────────────────────────────────────────────────────
class PendingUserOut(BaseModel):
    id:       int
    username: str
    name:     str
    gender:   Optional[GenderEnum]
    birth_date:         Optional[date]
    phone:              Optional[str]
    email:              Optional[EmailStr]
    hire_date:          Optional[date]
    health_cert_expire: Optional[date]
    unavailable_days:   Optional[list[int]]

    model_config = {"from_attributes": True}


class PaginatedPendingUsers(BaseModel):
    total: int
    items: List[PendingUserOut]


# ── 승인/거절/정지 액션 ───────────────────────────────────────────────────
class RejectRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500, description="거절 사유 (선택)")


class SuspendRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500, description="정지 사유 (선택)")


# ── 공휴일 ────────────────────────────────────────────────────────────────
class HolidayCreate(BaseModel):
    date:  date
    label: str


class HolidayUpdate(BaseModel):
    date:  Optional[date] = None
    label: Optional[str]  = None


class HolidayOut(BaseModel):
    id:    int
    date:  date
    label: str

    model_config = {"from_attributes": True}


# ── 유니폼 ───────────────────────────────────────────────────
class UniformUpdate(BaseModel):
    hat:          Optional[str] = None
    belt:         Optional[str] = None
    top_style:    Optional[str] = None
    top_size:     Optional[str] = None
    bottom_style: Optional[str] = None
    bottom_size:  Optional[str] = None
    necktie:      Optional[str] = None


class UniformWithUserOut(BaseModel):
    user_id:      int
    name:         str
    position:     str
    hat:          Optional[str] = None
    belt:         Optional[str] = None
    top_style:    Optional[str] = None
    top_size:     Optional[str] = None
    bottom_style: Optional[str] = None
    bottom_size:  Optional[str] = None
    necktie:      Optional[str] = None


# ── 시프트 프리셋 ─────────────────────────────────────────────────────────
class ShiftPresetCreate(BaseModel):
    label: str = Field(min_length=1, max_length=20, description="프리셋 이름")
    start_time: str = Field(pattern=r"^\d{2}:\d{2}$", description="시작 시간 HH:MM")
    end_time: str = Field(pattern=r"^\d{2}:\d{2}$", description="종료 시간 HH:MM")
    border_color: str = Field(default="#e5e7eb", pattern=r"^#[0-9a-fA-F]{6}$", description="테두리 색상 hex")
    font_color: str = Field(default="#374151", pattern=r"^#[0-9a-fA-F]{6}$", description="폰트 색상 hex")
    sort_order: int = Field(default=0, ge=0)


class ShiftPresetUpdate(BaseModel):
    label: Optional[str] = Field(None, min_length=1, max_length=20)
    start_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    end_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    border_color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    font_color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    sort_order: Optional[int] = Field(None, ge=0)


class ShiftPresetOut(BaseModel):
    id: int
    label: str
    start_time: str
    end_time: str
    border_color: str
    font_color: str
    sort_order: int

    model_config = {"from_attributes": True}


# ── 4대보험 요율 ──────────────────────────────────────────────────────────
class InsuranceRateCreate(BaseModel):
    year: int

    national_pension_rate:    Decimal
    health_insurance_rate:    Decimal
    long_term_care_rate:      Decimal
    employment_insurance_rate: Decimal

    model_config = {
        "json_schema_extra": {
            "example": {
                "year": "2025",
                "national_pension_rate": "4.75",
                "health_insurance_rate": "3.595",
                "long_term_care_rate":   "12.95",
                "employment_insurance_rate": "0.9",
            }
        }
    }


class InsuranceRateUpdate(BaseModel):
    national_pension_rate:    Decimal
    health_insurance_rate:    Decimal
    long_term_care_rate:      Decimal
    employment_insurance_rate: Decimal


class InsuranceRateResponse(BaseModel):
    id:   int
    year: int

    national_pension_rate:    Optional[float] = None
    health_insurance_rate:    Optional[float] = None
    long_term_care_rate:      Optional[float] = None
    employment_insurance_rate: Optional[float] = None

    @field_serializer(
        "national_pension_rate",
        "health_insurance_rate",
        "long_term_care_rate",
        "employment_insurance_rate",
        when_used="json",
    )
    def serialize_rate(self, value):
        if value is None:
            return None
        if isinstance(value, float):
            value = Decimal(str(value))
        return str(value.quantize(Decimal("0.0000"), rounding=ROUND_HALF_UP))

    model_config = {"from_attributes": True}
