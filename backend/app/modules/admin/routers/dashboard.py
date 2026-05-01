"""관리자 대시보드 — 스케줄 기반 예상 급여 + 실제 근태 비교"""

from __future__ import annotations

from calendar import monthrange
from datetime import date, time
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_admin
from app.modules.admin.models import Holiday
from app.modules.auth.models import PositionEnum, StatusEnum, User
from app.modules.schedule.models.dayoff_models import DayOffRequest, RequestStatusEnum
from app.modules.schedule.models.schedule_models import Schedule, ScheduleWeek
from app.modules.workstatus.models import AttendanceEvent, EventType
from app.modules.workstatus.services import AttendanceService
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

    # 해당 월 공휴일 날짜 집합
    holiday_dates: set[date] = {
        row[0]
        for row in db.query(Holiday.date).filter(
            Holiday.date >= month_start,
            Holiday.date <= month_end,
        ).all()
    }

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
    # 이벤트 맵: (user_id, work_date) -> {EventType: AttendanceEvent}
    event_map: dict[tuple, dict] = {}
    for ev in attendance_events:
        if ev.event_type == EventType.CLOCK_IN:
            attendance_map.setdefault(ev.user_id, set()).add(ev.work_date)
        key = (ev.user_id, ev.work_date)
        if key not in event_map:
            event_map[key] = {}
        event_map[key][ev.event_type] = ev

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

        # 예상 급여 계산 (주간 + 야간*1.5)
        wage = _get_effective_wage(db, emp, year)
        emp_scheduled_gross = int(wage * emp_day_hours + wage * emp_night_hours * 1.5)

        # 실제 급여 — 근태 이벤트 직접 계산 (세전, 주간+야간1.5배+공휴일1.5배)
        emp_actual_hours = 0.0
        emp_actual_gross = 0
        for (uid, work_date_ev), evs in event_map.items():
            if uid != emp.id:
                continue
            day_min, night_min, _ = AttendanceService.calc_work_minutes(evs, work_date_ev)
            day_h = day_min / 60.0
            night_h = night_min / 60.0
            emp_actual_hours += day_h + night_h
            if work_date_ev in holiday_dates:
                emp_actual_gross += int(
                    wage * day_h
                    + wage * night_h * 1.5
                    + wage * (day_h + night_h) * 1.5
                )
            else:
                emp_actual_gross += int(wage * day_h + wage * night_h * 1.5)
        emp_actual_hours = round(emp_actual_hours, 2)

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
