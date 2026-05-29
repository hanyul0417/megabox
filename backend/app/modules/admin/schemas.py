from __future__ import annotations

from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_serializer, field_validator

from app.modules.auth.models import GenderEnum, PositionEnum, StatusEnum


# ── 요일별 불가 시간대 ────────────────────────────────────────────────────────
class UnavailableTimeSlot(BaseModel):
    start: str = Field(pattern=r"^\d{2}:\d{2}$", description="불가 시작 시간 HH:MM")
    end: str = Field(pattern=r"^\d{2}:\d{2}$", description="불가 종료 시간 HH:MM")


class UnavailableDayConfig(BaseModel):
    all_day: bool = False
    slots: List[UnavailableTimeSlot] = []


# key: "0"=일, "1"=월, ..., "6"=토
UnavailableTimes = Dict[str, UnavailableDayConfig]


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
    unavailable_days:    Optional[list[int]] = None
    unavailable_times:   Optional[UnavailableTimes] = None
    health_cert_expire:  Optional[date] = None
    weekend_dayoff_limit: Optional[int] = None
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
    unavailable_days:    Optional[list[int]] = None
    unavailable_times:   Optional[UnavailableTimes] = None
    health_cert_expire:  Optional[date]      = None
    annual_leave_hours:  Optional[Decimal]   = None
    wage:                Optional[int]       = None
    weekend_dayoff_limit: Optional[int]      = None
    employment_reported:  Optional[bool]     = None
    insure_hire_month:    Optional[bool]     = None


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
    birth_date:          Optional[date]      = None
    ssn:                 Optional[str]       = None
    bank_name:           Optional[str]       = None
    account_number:      Optional[str]       = None
    hire_date:           Optional[date]      = None
    retire_date:         Optional[date]      = None
    unavailable_days:    Optional[list[int]] = None
    unavailable_times:   Optional[dict]      = None
    health_cert_expire:  Optional[date]      = None
    wage:                Optional[int]       = None
    annual_leave_hours:  Optional[float]     = None
    profile_image:       Optional[str]       = None
    weekend_dayoff_limit: Optional[int]      = None
    employment_reported:  bool               = False
    insure_hire_month:    bool               = False

    model_config = {"from_attributes": True}


class UserDetailOut(UserOut):
    birth_date:     Optional[date]
    ssn:            Optional[str]
    bank_name:      Optional[str]
    account_number: Optional[str]
    hire_date:      Optional[date]
    retire_date:    Optional[date]
    unavailable_days:   Optional[list[int]]
    unavailable_times:  Optional[dict]
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
    hat:                 Optional[str] = None
    belt:                Optional[str] = None
    top_style:           Optional[str] = None
    top_size:            Optional[str] = None
    short_sleeve_style:  Optional[str] = None
    short_sleeve_size:   Optional[str] = None
    bottom_style:        Optional[str] = None
    bottom_size:         Optional[str] = None
    necktie:             Optional[str] = None


class UniformWithUserOut(BaseModel):
    user_id:             int
    name:                str
    position:            str
    gender:              Optional[str] = None
    is_active:           bool
    hat:                 Optional[str] = None
    belt:                Optional[str] = None
    top_style:           Optional[str] = None
    top_size:            Optional[str] = None
    short_sleeve_style:  Optional[str] = None
    short_sleeve_size:   Optional[str] = None
    bottom_style:        Optional[str] = None
    bottom_size:         Optional[str] = None
    necktie:             Optional[str] = None


class UniformStockUpdate(BaseModel):
    quantity: int = Field(ge=0, description="보유 재고 수량")


class UniformStockOut(BaseModel):
    item_key:  str
    category:  str   # 모자 / 벨트 / 상의 / 하의 / 넥타이
    variant:   str   # 헌팅캡 / 페도라 / 남 / 여 / 체크 / 데님
    quantity:  int   # 보유 재고
    issued:    int   # 지급 수량 (계산값)
    remaining: int   # 잔여 = quantity - issued


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


# ── 휴무 한도 설정 ────────────────────────────────────────────────────────
class DayoffSettingOut(BaseModel):
    monthly_limit: int
    default_annual_leave_hours: float
    annual_leave_pay_method: str = "scheduled"

    model_config = {"from_attributes": True}


class DayoffSettingUpdate(BaseModel):
    monthly_limit: int = Field(ge=0, description="월 한도 (0=무제한)")
    default_annual_leave_hours: Optional[float] = Field(None, ge=0, description="신규 가입자 기본 소정근로시간")
    annual_leave_pay_method: Optional[str] = Field(
        None,
        description="연차수당 계산 방식: scheduled | daily_avg | daily_avg_min_scheduled",
    )

# ── 직원 삭제 / 복구 ──────────────────────────────────────────────────────
class DeleteUserRequest(BaseModel):
    admin_password: str = Field(min_length=1, description="관리자 현재 비밀번호")
    delete_reason: Optional[str] = Field(None, max_length=500, description="삭제 사유 (선택)")


class DeletedUserOut(BaseModel):
    id:           int
    username:     str
    name:         str
    position:     PositionEnum
    hire_date:    Optional[date] = None
    deleted_at:   datetime
    delete_reason: Optional[str] = None
    days_remaining: int  # 복구 가능 잔여일

    model_config = {"from_attributes": True}


class PaginatedDeletedUsers(BaseModel):
    total: int
    items: list[DeletedUserOut]


# ── 체크리스트 ──────────────────────────────────────────────────────────────
class ChecklistItemCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6, description="요일 (0=월 ~ 6=일)")
    content: str = Field(min_length=1, max_length=100, description="항목 내용")
    sort_order: int = Field(default=0, ge=0)


class ChecklistItemUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=100)
    sort_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class ChecklistItemOut(BaseModel):
    id: int
    day_of_week: int
    content: str
    sort_order: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ChecklistItemWithStatus(BaseModel):
    id: int
    content: str
    sort_order: int
    is_checked: bool


class ChecklistToggleResponse(BaseModel):
    item_id: int
    checked: bool


# ── 키오스크 공지사항 ─────────────────────────────────────────────────────────
class KioskNoticeCreate(BaseModel):
    content: str = Field(min_length=1, max_length=200, description="공지 내용 (한 줄)")
    start_date: date
    end_date: date
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0)


class KioskNoticeUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=200)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = Field(None, ge=0)


class KioskNoticeOut(BaseModel):
    id: int
    content: str
    start_date: date
    end_date: date
    is_active: bool
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}