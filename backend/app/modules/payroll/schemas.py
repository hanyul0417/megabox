from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_serializer


class PayrollResponse(BaseModel):
    """
    관리자용 급여 응답 — 전직원 급여 조회 / 수정 결과
    """

    payroll_id: Optional[int] = None
    user_id: Optional[int] = None
    year: Optional[int] = None
    month: Optional[int] = None

    # ── 인적 정보 ────────────────────────────────────────
    name: Optional[str] = None
    position: Optional[str] = None
    wage: Optional[int] = None
    rrn: Optional[str] = None          # 주민등록번호 (관리자 페이지: 마스킹 없음)
    join_date: Optional[date] = None
    resign_date: Optional[date] = None
    last_work_day: Optional[date] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    email: Optional[str] = None

    # ── 근무 요약 ────────────────────────────────────────
    total_work_days: Optional[int] = None
    total_work_hours: Optional[float] = None
    avg_daily_hours: Optional[float] = None

    # ── 시간 항목 ────────────────────────────────────────
    day_hours: Optional[float] = None               # 주간 근무시간
    night_hours: Optional[float] = None             # 야간 근무시간
    weekly_allowance_hours: Optional[float] = None  # 주휴시간
    annual_leave_hours: Optional[float] = None      # 연차시간
    holiday_hours: Optional[float] = None           # 공휴일 근무시간
    labor_day_hours: Optional[float] = None         # 근로자의날 근무시간

    # ── 급여 항목 ────────────────────────────────────────
    day_wage: Optional[int] = None
    night_wage: Optional[int] = None
    weekly_allowance_pay: Optional[int] = None
    annual_leave_pay: Optional[int] = None
    holiday_pay: Optional[int] = None
    labor_day_pay: Optional[int] = None
    gross_pay: Optional[int] = None                 # 급여총액

    # ── 공제 항목 ────────────────────────────────────────
    insurance_health: Optional[int] = None
    insurance_care: Optional[int] = None
    insurance_employment: Optional[int] = None
    insurance_pension: Optional[int] = None

    total_deduction: Optional[int] = None           # 공제계
    net_pay: Optional[int] = None                   # 실수령액

    @field_serializer(
        "total_work_hours", "avg_daily_hours",
        "day_hours", "night_hours", "weekly_allowance_hours",
        "annual_leave_hours", "holiday_hours", "labor_day_hours",
        when_used="json",
    )
    def round_two_decimal(self, value):
        if value is None:
            return None
        return round(value, 2)


class PayrollPayResponse(BaseModel):
    """
    직원 본인 급여 명세서 응답
    """

    name: Optional[str] = None
    position: Optional[str] = None
    birth_date: Optional[date] = None
    pay_date: Optional[date] = None
    wage: Optional[int] = None

    # ── 근무 요약 ────────────────────────────────────────
    total_work_days: Optional[int] = None
    total_work_hours: Optional[float] = None
    avg_daily_hours: Optional[float] = None

    # ── 시간 항목 ────────────────────────────────────────
    day_hours: Optional[float] = None
    night_hours: Optional[float] = None
    weekly_allowance_hours: Optional[float] = None
    annual_leave_hours: Optional[float] = None
    holiday_hours: Optional[float] = None
    labor_day_hours: Optional[float] = None

    # ── 급여 항목 ────────────────────────────────────────
    day_wage: Optional[int] = None
    night_wage: Optional[int] = None
    weekly_allowance_pay: Optional[int] = None
    annual_leave_pay: Optional[int] = None
    holiday_pay: Optional[int] = None
    labor_day_pay: Optional[int] = None
    gross_pay: Optional[int] = None

    # ── 공제 ────────────────────────────────────────────
    insurance_health: Optional[int] = None
    insurance_care: Optional[int] = None
    insurance_employment: Optional[int] = None
    insurance_pension: Optional[int] = None

    total_deduction: Optional[int] = None
    net_pay: Optional[int] = None


class PayrollAdminUpdateInput(BaseModel):
    """
    관리자 급여 수정 입력
    - gross_pay, total_deduction, net_pay 는 계산값이므로 수정 불가
    - 나머지 항목 수정 시 자동 재계산
    """
    wage: Optional[int] = None
    day_hours: Optional[float] = None
    night_hours: Optional[float] = None
    weekly_allowance_hours: Optional[float] = None
    annual_leave_hours: Optional[float] = None
    annual_leave_pay: Optional[int] = None   # NULL → 자동계산, 값 설정 시 고정
    holiday_hours: Optional[float] = None
    labor_day_hours: Optional[float] = None
    insurance_health: Optional[int] = None
    insurance_care: Optional[int] = None
    insurance_employment: Optional[int] = None
    insurance_pension: Optional[int] = None
    last_work_day: Optional[date] = None


class PayrollPayDateCreate(BaseModel):
    year: int
    month: int
    pay_date: date


class PayrollAutoPayDateRequest(BaseModel):
    year: int
    month: int
    payment_day: int = 10


class PayrollPayDateUpdate(BaseModel):
    pay_date: date


class PayrollPayDateResponse(BaseModel):
    id: int
    year: int
    month: int
    pay_date: date

    model_config = {"from_attributes": True}


class PayrollEmailResult(BaseModel):
    """이메일 발송 결과"""
    user_id: int
    name: str
    email: Optional[str] = None
    success: bool
    error: Optional[str] = None


class PayrollBulkEmailResponse(BaseModel):
    """일괄 발송 결과"""
    total: int
    success_count: int
    fail_count: int
    skip_count: int  # 이메일 없는 직원
    results: list[PayrollEmailResult]


class PayrollBulkEmailLogResponse(BaseModel):
    """일괄 발송 이력 항목"""
    id: int
    year: int
    month: int
    sent_by_name: str
    sent_at: datetime
    success_count: int
    fail_count: int
    skip_count: int

    model_config = {"from_attributes": True}
