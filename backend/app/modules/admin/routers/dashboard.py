"""관리자 대시보드 — 스케줄 기반 예상 급여 + 실제 근태 비교"""

from __future__ import annotations

import math
from calendar import monthrange
from datetime import date, time, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_admin
from app.modules.admin.models import DayoffSetting, Holiday
from app.modules.auth.models import PositionEnum, StatusEnum, User
from app.modules.payroll.models import Payroll
from app.modules.schedule.models.dayoff_models import DayOffRequest, RequestStatusEnum
from app.modules.schedule.models.schedule_models import Schedule, ScheduleWeek
from app.modules.workstatus.models import AttendanceEvent, EventType
from app.modules.wage.models import DefaultWage, UserWage

router = APIRouter()


# ─── 응답 스키마 ──────────────────────────────────────────


class HeadcountSummary(BaseModel):
    total_employees: int
    scheduled_employees: int
    absent_employees: int


class WorkSummary(BaseModel):
    total_scheduled_hours: float
    total_actual_hours: float
    avg_scheduled_hours: Optional[float] = None
    avg_actual_hours: Optional[float] = None


class PayrollSummary(BaseModel):
    total_scheduled_gross: int
    total_actual_gross: int


class DayoffSummary(BaseModel):
    total_approved: int
    total_pending: int


class EmployeeDetail(BaseModel):
    user_id: int
    name: str
    position: str
    profile_image: Optional[str] = None
    scheduled_hours: float
    actual_hours: float
    scheduled_gross: int
    actual_gross: int
    dayoff_count: int
    absent_days: int


class DashboardResponse(BaseModel):
    headcount_summary: HeadcountSummary
    work_summary: WorkSummary
    payroll_summary: PayrollSummary
    dayoff_summary: DayoffSummary
    per_employee: List[EmployeeDetail]


# ─── 유틸 ────────────────────────────────────────────────


def _ceil10(value: float) -> int:
    """급여 항목 10원 단위 올림 — 급여명세 서비스와 동일한 로직"""
    return math.ceil(value / 10) * 10


def _time_to_hours(t: time) -> float:
    return t.hour + t.minute / 60.0


def _calc_schedule_hours(start: time, end: time) -> tuple[float, float]:
    """스케줄의 주간/야간 시간 분리. 야간 = 22:00~06:00 구간."""
    start_min = start.hour * 60 + start.minute
    end_min = end.hour * 60 + end.minute

    # 야간 근무 (자정 넘김)
    if end_min <= start_min:
        end_min += 24 * 60

    day_hours = 0.0
    night_hours = 0.0

    # 분 단위로 계산
    for m in range(start_min, end_min):
        hour_of_day = (m // 60) % 24
        if hour_of_day >= 22 or hour_of_day < 6:
            night_hours += 1.0 / 60
        else:
            day_hours += 1.0 / 60

    return round(day_hours, 2), round(night_hours, 2)


def _is_holiday(db: Session, target_date: date) -> bool:
    return db.query(Holiday.id).filter(Holiday.date == target_date).first() is not None


def _iso_week_key(d: date) -> tuple[int, int]:
    """ISO 주차 (year, week) 반환"""
    iso = d.isocalendar()
    return (iso[0], iso[1])


def _get_annual_leave_method(db: Session) -> str:
    setting = db.get(DayoffSetting, 1)
    return getattr(setting, "annual_leave_pay_method", "scheduled") or "scheduled"


def _apply_annual_leave_method(
    method: str,
    scheduled_hours: float,
    total_work_hours: float,
    total_work_days: int,
) -> float:
    from decimal import Decimal
    if method in ("daily_avg", "daily_avg_min_scheduled") and total_work_days > 0:
        daily_avg = total_work_hours / total_work_days
        if method == "daily_avg_min_scheduled":
            return max(daily_avg, scheduled_hours)
        return daily_avg
    return scheduled_hours


def _count_work_days_for_user(db: Session, user_id: int, year: int, month: int) -> int:
    month_start = date(year, month, 1)
    month_end = (
        date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)
    )
    return (
        db.query(AttendanceEvent.work_date)
        .filter(
            AttendanceEvent.user_id == user_id,
            AttendanceEvent.event_type == EventType.CLOCK_OUT,
            AttendanceEvent.work_date >= month_start,
            AttendanceEvent.work_date < month_end,
        )
        .distinct()
        .count()
    )


def _get_effective_wage(db: Session, user: User, year: int) -> int:
    """유저 개인 시급 > 기본(최저)시급 순서로 결정"""
    if user.wage and user.wage > 0:
        return user.wage

    # UserWage 테이블에서 해당 연도 시급 조회
    ref_date = date(year, 1, 1)
    user_wage = (
        db.query(UserWage)
        .filter(
            UserWage.user_id == user.id,
            UserWage.start_date <= ref_date,
            (UserWage.end_date.is_(None) | (UserWage.end_date >= ref_date)),
        )
        .order_by(UserWage.start_date.desc())
        .first()
    )
    if user_wage:
        return user_wage.wage

    # DefaultWage(최저시급)
    default_wage = (
        db.query(DefaultWage).filter(DefaultWage.year == year).first()
    )
    return default_wage.wage if default_wage else 0


# ─── 메인 API ────────────────────────────────────────────


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    summary="관리자 대시보드 데이터",
)
def get_dashboard(
    year: int = Query(..., description="연도"),
    month: int = Query(..., description="월 (1~12)"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    month_start = date(year, month, 1)
    _, last_day = monthrange(year, month)
    month_end = date(year, month, last_day)

    # 활성 직원 목록 (system 제외)
    employees: List[User] = (
        db.query(User)
        .filter(
            User.position != PositionEnum.system,
            User.status == StatusEnum.approved,
            User.is_active.is_(True),
        )
        .all()
    )

    # 해당 월 스케줄 조회
    schedules: List[Schedule] = (
        db.query(Schedule)
        .options(joinedload(Schedule.user))
        .join(ScheduleWeek, Schedule.schedule_week_id == ScheduleWeek.id)
        .filter(
            Schedule.work_date >= month_start,
            Schedule.work_date <= month_end,
        )
        .all()
    )

    # 해당 월 근태 이벤트
    attendance_events: List[AttendanceEvent] = (
        db.query(AttendanceEvent)
        .filter(
            AttendanceEvent.work_date >= month_start,
            AttendanceEvent.work_date <= month_end,
        )
        .all()
    )

    # 해당 월 급여 데이터
    payrolls: List[Payroll] = (
        db.query(Payroll)
        .filter(Payroll.year == year, Payroll.month == month)
        .all()
    )

    # 해당 월 휴무 신청
    dayoffs: List[DayOffRequest] = (
        db.query(DayOffRequest)
        .filter(
            DayOffRequest.request_date >= month_start,
            DayOffRequest.request_date <= month_end,
        )
        .all()
    )

    # ── 직원별 집계 ──────────────────────────────────────

    # 스케줄 맵: user_id -> list of schedules
    schedule_map: dict[int, list[Schedule]] = {}
    for s in schedules:
        schedule_map.setdefault(s.user_id, []).append(s)

    # 근태 맵: user_id -> set of work_dates (출근 기록 있는 날)
    attendance_map: dict[int, set[date]] = {}
    for ev in attendance_events:
        if ev.event_type == EventType.CLOCK_IN:
            attendance_map.setdefault(ev.user_id, set()).add(ev.work_date)

    # 급여 맵: user_id -> Payroll
    payroll_map: dict[int, Payroll] = {p.user_id: p for p in payrolls}

    # 휴무 맵: user_id -> count (approved)
    dayoff_count_map: dict[int, int] = {}
    dayoff_approved_count = 0
    dayoff_pending_count = 0
    for d in dayoffs:
        if d.status == RequestStatusEnum.approved:
            dayoff_count_map[d.user_id] = dayoff_count_map.get(d.user_id, 0) + 1
            dayoff_approved_count += 1
        elif d.status == RequestStatusEnum.pending:
            dayoff_pending_count += 1

    # 직원별 상세 계산
    per_employee: List[EmployeeDetail] = []
    total_scheduled_hours = 0.0
    total_actual_hours = 0.0
    total_scheduled_gross = 0
    total_actual_gross = 0
    scheduled_emp_count = 0
    absent_emp_count = 0

    for emp in employees:
        user_schedules = schedule_map.get(emp.id, [])
        user_payroll = payroll_map.get(emp.id)
        user_attendance_dates = attendance_map.get(emp.id, set())
        user_dayoff_count = dayoff_count_map.get(emp.id, 0)

        # 스케줄 시간 계산
        emp_day_hours = 0.0
        emp_night_hours = 0.0
        emp_scheduled_dates: set[date] = set()

        for s in user_schedules:
            day_h, night_h = _calc_schedule_hours(s.start_time, s.end_time)
            emp_day_hours += day_h
            emp_night_hours += night_h
            emp_scheduled_dates.add(s.work_date)

        emp_scheduled_hours = round(emp_day_hours + emp_night_hours, 2)

        # 예상 급여 계산 (주간 + 야간*1.5 + 주휴수당 + 공휴일수당 + 연차수당)
        wage = _get_effective_wage(db, emp, year)

        # 기본 급여 (주간 + 야간 1.5배)
        base_gross = _ceil10(wage * emp_day_hours) + _ceil10(wage * emp_night_hours * 1.5)

        # 주휴수당: ISO 주차별로 스케줄 시간 합산, 주 15h 이상이면 발생
        # 주휴시간 = 해당 주 근무시간 합계 / 5 (소정근로일수 5일 기준)
        week_hours: dict[tuple[int, int], float] = {}
        for s in user_schedules:
            d_h, n_h = _calc_schedule_hours(s.start_time, s.end_time)
            wk = _iso_week_key(s.work_date)
            week_hours[wk] = week_hours.get(wk, 0.0) + d_h + n_h

        weekly_allowance_hours = sum(
            wh / 5 for wh in week_hours.values() if wh >= 15
        )
        weekly_allowance_pay = _ceil10(wage * weekly_allowance_hours)

        # 공휴일수당: 스케줄 날짜가 공휴일이면 해당 시간에 1.5배
        holiday_hours = 0.0
        for s in user_schedules:
            if _is_holiday(db, s.work_date):
                d_h, n_h = _calc_schedule_hours(s.start_time, s.end_time)
                holiday_hours += d_h + n_h
        holiday_pay = _ceil10(wage * holiday_hours * 1.5)

        # 연차수당: 직원 연차시간(기본 5.5h) × 1건 (월 1회 지급 추정)
        annual_leave_hours = float(emp.annual_leave_hours) if emp.annual_leave_hours else 5.5
        annual_leave_pay = _ceil10(wage * annual_leave_hours)

        emp_scheduled_gross = base_gross + weekly_allowance_pay + holiday_pay + annual_leave_pay

        # 실제 급여 — payroll 테이블 기반 세전 총액 (급여명세 gross_pay와 동일 계산)
        emp_actual_hours = 0.0
        emp_actual_gross = 0
        if user_payroll:
            emp_actual_hours = round(
                float(user_payroll.day_hours) + float(user_payroll.night_hours), 2
            )
            w = user_payroll.wage
            weekly_pay = (
                user_payroll.weekly_allowance_pay
                if user_payroll.weekly_allowance_pay is not None
                else _ceil10(w * float(user_payroll.weekly_allowance_hours))
            )

            # 연차수당: 급여명세와 동일 로직 (입사/퇴사월 면제 + annual_leave_method 적용)
            if user_payroll.annual_leave_pay is not None:
                annual_leave_pay = user_payroll.annual_leave_pay
            else:
                total_work_hours_actual = float(user_payroll.day_hours) + float(user_payroll.night_hours)
                total_work_days_actual = _count_work_days_for_user(db, emp.id, year, month)

                hire_date = emp.hire_date
                is_hire_month = (
                    hire_date is not None
                    and hire_date.year == year
                    and hire_date.month == month
                )
                retire_date = emp.retire_date
                is_retire_month = (
                    retire_date is not None
                    and retire_date.year == year
                    and retire_date.month == month
                )
                last_day_of_month = (
                    date(year + 1, 1, 1) if month == 12
                    else date(year, month + 1, 1)
                ) - timedelta(days=1)
                is_last_day_retire = is_retire_month and retire_date.day == last_day_of_month.day
                no_leave = (is_hire_month and hire_date.day != 1) or (
                    is_retire_month and not is_last_day_retire
                )

                if no_leave:
                    effective_leave_hours = 0.0
                else:
                    al_method = _get_annual_leave_method(db)
                    effective_leave_hours = _apply_annual_leave_method(
                        al_method,
                        float(user_payroll.annual_leave_hours),
                        total_work_hours_actual,
                        total_work_days_actual,
                    )

                annual_leave_count = user_payroll.annual_leave_count or 1
                annual_leave_pay = _ceil10(w * effective_leave_hours * annual_leave_count)

            emp_actual_gross = (
                _ceil10(w * float(user_payroll.day_hours))
                + _ceil10(w * float(user_payroll.night_hours) * 1.5)
                + weekly_pay
                + annual_leave_pay
                + _ceil10(w * float(user_payroll.holiday_hours) * 1.5)
            )

        # 미출근 일수: 스케줄이 있지만 출근 기록이 없는 날
        absent_days = len(emp_scheduled_dates - user_attendance_dates)

        if user_schedules:
            scheduled_emp_count += 1
        if absent_days > 0:
            absent_emp_count += 1

        total_scheduled_hours += emp_scheduled_hours
        total_actual_hours += emp_actual_hours
        total_scheduled_gross += emp_scheduled_gross
        total_actual_gross += emp_actual_gross

        pos_val = emp.position.value if hasattr(emp.position, "value") else str(emp.position)

        per_employee.append(
            EmployeeDetail(
                user_id=emp.id,
                name=emp.name,
                position=pos_val,
                profile_image=emp.profile_image,
                scheduled_hours=emp_scheduled_hours,
                actual_hours=emp_actual_hours,
                scheduled_gross=emp_scheduled_gross,
                actual_gross=emp_actual_gross,
                dayoff_count=user_dayoff_count,
                absent_days=absent_days,
            )
        )

    emp_count = len(employees)

    return DashboardResponse(
        headcount_summary=HeadcountSummary(
            total_employees=emp_count,
            scheduled_employees=scheduled_emp_count,
            absent_employees=absent_emp_count,
        ),
        work_summary=WorkSummary(
            total_scheduled_hours=round(total_scheduled_hours, 2),
            total_actual_hours=round(total_actual_hours, 2),
            avg_scheduled_hours=(
                round(total_scheduled_hours / scheduled_emp_count, 2)
                if scheduled_emp_count > 0
                else None
            ),
            avg_actual_hours=(
                round(total_actual_hours / emp_count, 2)
                if emp_count > 0
                else None
            ),
        ),
        payroll_summary=PayrollSummary(
            total_scheduled_gross=total_scheduled_gross,
            total_actual_gross=total_actual_gross,
        ),
        dayoff_summary=DayoffSummary(
            total_approved=dayoff_approved_count,
            total_pending=dayoff_pending_count,
        ),
        per_employee=per_employee,
    )
