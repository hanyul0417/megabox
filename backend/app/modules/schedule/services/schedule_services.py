from __future__ import annotations

from collections import defaultdict
from datetime import date, time
from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.modules.auth.models import PositionEnum, User
from app.modules.schedule.models.dayoff_models import DayOffRequest, RequestStatusEnum
from app.modules.schedule.models.schedule_models import (
    Schedule,
    ScheduleStatusEnum,
    ScheduleWeek,
)
from app.modules.schedule.schemas.schedule_schemas import (
    DayOverlapResponse,
    EmployeeOverlapInfo,
    ScheduleCreate,
    ScheduleResponse,
    ScheduleUpdate,
    ScheduleWeekStatusUpdate,
    TimeSlotOverlap,
    WeekOverlapResponse,
    WeekScheduleResponse,
    ScheduleWeekResponse,
)
from app.modules.notification.services import create_notification, create_bulk_notifications
from app.modules.auth.models import StatusEnum
from app.utils.date_utils import get_iso_week_range
from app.utils.permission_utils import is_admin


# ─── 헬퍼 ─────────────────────────────────────────────────

def _fmt_time(t: time) -> str:
    return t.strftime("%H:%M")


def _parse_time(s: str) -> time:
    try:
        h, m = map(int, s.split(":"))
        return time(h, m)
    except Exception:
        raise HTTPException(400, f"잘못된 시간 형식: {s} (HH:MM 필요)")


def _build_schedule_response(schedule: Schedule) -> ScheduleResponse:
    pos = schedule.user.position
    pos_val = pos.value if hasattr(pos, "value") else str(pos)
    return ScheduleResponse(
        id=schedule.id,
        schedule_week_id=schedule.schedule_week_id,
        user_id=schedule.user_id,
        user_name=schedule.user.name if schedule.user else "",
        user_position=pos_val,
        work_date=schedule.work_date,
        start_time=_fmt_time(schedule.start_time),
        end_time=_fmt_time(schedule.end_time),
    )


def _build_week_response(week: ScheduleWeek) -> ScheduleWeekResponse:
    return ScheduleWeekResponse(
        id=week.id,
        year=week.year,
        week_number=week.week_number,
        status=week.status,
        created_by=week.created_by,
        created_at=week.created_at,
        updated_at=week.updated_at,
    )


def _is_future_week(year: int, week_number: int) -> bool:
    week_start, _ = get_iso_week_range(year, week_number)
    return week_start > date.today()


# ─── 주차 관리 ──────────────────────────────────────────────

def get_or_create_schedule_week(
    db: Session, year: int, week_number: int, user: User
) -> ScheduleWeek:
    if not is_admin(user):
        raise HTTPException(403, "관리자만 스케줄 주차를 생성할 수 있습니다.")

    week = (
        db.query(ScheduleWeek)
        .filter(ScheduleWeek.year == year, ScheduleWeek.week_number == week_number)
        .first()
    )
    if week is None:
        week = ScheduleWeek(year=year, week_number=week_number, created_by=user.id)
        db.add(week)
        db.commit()
        db.refresh(week)
    return week


def update_week_status(
    db: Session,
    year: int,
    week_number: int,
    data: ScheduleWeekStatusUpdate,
    user: User,
) -> ScheduleWeekResponse:
    if not is_admin(user):
        raise HTTPException(403, "관리자만 스케줄 상태를 변경할 수 있습니다.")

    week = (
        db.query(ScheduleWeek)
        .filter(ScheduleWeek.year == year, ScheduleWeek.week_number == week_number)
        .first()
    )
    if week is None:
        raise HTTPException(404, "해당 주차 스케줄이 존재하지 않습니다.")

    week.status = data.status
    db.commit()
    db.refresh(week)

    # 스케줄 확정 시 전체 활성 직원에게 알림
    if data.status == ScheduleStatusEnum.confirmed:
        week_start, week_end = get_iso_week_range(year, week_number)
        recipient_ids = [
            u.id for u in db.query(User.id).filter(
                User.position != PositionEnum.system,
                User.is_active == True,  # noqa: E712
                User.status == StatusEnum.approved,
            ).all()
        ]
        create_bulk_notifications(
            db,
            recipient_ids=recipient_ids,
            title="스케줄 확정",
            body=f"{week_start.month}월 {week_start.day}일 ~ {week_end.month}월 {week_end.day}일 스케줄이 확정되었습니다.",
        )
        db.commit()

    return _build_week_response(week)


# ─── 주간 스케줄 조회 ──────────────────────────────────────

def get_week_schedules(
    db: Session,
    year: int,
    week_number: int,
    current_user: User,
) -> WeekScheduleResponse:
    """
    미래 주차 가시성 규칙:
    - 관리자: 항상 조회 가능
    - 일반 직원: CONFIRMED 상태여야만 미래 주차 조회 가능
    """
    week = (
        db.query(ScheduleWeek)
        .filter(ScheduleWeek.year == year, ScheduleWeek.week_number == week_number)
        .first()
    )

    if _is_future_week(year, week_number) and not is_admin(current_user):
        if week is None or week.status == ScheduleStatusEnum.draft:
            return WeekScheduleResponse(
                week=_build_week_response(week) if week else None,
                schedules=[],
            )

    schedules_q = (
        db.query(Schedule)
        .options(joinedload(Schedule.user))
        .join(ScheduleWeek, Schedule.schedule_week_id == ScheduleWeek.id)
        .filter(ScheduleWeek.year == year, ScheduleWeek.week_number == week_number)
        .order_by(Schedule.work_date, Schedule.start_time)
        .all()
    )

    return WeekScheduleResponse(
        week=_build_week_response(week) if week else None,
        schedules=[_build_schedule_response(s) for s in schedules_q],
    )


# ─── 스케줄 CRUD ───────────────────────────────────────────

_DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']


def create_schedule(
    db: Session,
    schedule_week_id: int,
    data: ScheduleCreate,
    user: User,
) -> ScheduleResponse:
    if not is_admin(user):
        raise HTTPException(403, "관리자만 스케줄을 생성할 수 있습니다.")

    week = db.query(ScheduleWeek).filter(ScheduleWeek.id == schedule_week_id).first()
    if week is None:
        raise HTTPException(404, "해당 주차 스케줄이 존재하지 않습니다.")

    # 고정 불가 요일 확인 (0=월 ~ 6=일, Python weekday()와 동일)
    employee = db.query(User).filter(User.id == data.user_id).first()
    if employee is None:
        raise HTTPException(404, "직원을 찾을 수 없습니다.")
    if employee.unavailable_days:
        work_weekday = data.work_date.weekday()
        if work_weekday in employee.unavailable_days:
            day_label = _DAY_LABELS[work_weekday]
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "UNAVAILABLE_DAY_CONFLICT",
                    "message": f"{employee.name}님의 고정 불가 요일({day_label}요일)에는 스케줄을 등록할 수 없습니다.",
                },
            )

    dayoff_exists = (
        db.query(DayOffRequest)
        .filter(
            DayOffRequest.user_id == data.user_id,
            DayOffRequest.request_date == data.work_date,
            DayOffRequest.status.in_([RequestStatusEnum.pending, RequestStatusEnum.approved]),
        )
        .first()
    )
    if dayoff_exists:
        status_label = "대기중" if dayoff_exists.status == RequestStatusEnum.pending else "승인된"
        raise HTTPException(
            status_code=409,
            detail={
                "code": "DAYOFF_CONFLICT",
                "message": f"{data.work_date} 날짜에 {status_label} 휴무 신청이 있어 스케줄을 등록할 수 없습니다.",
                "dayoff_status": dayoff_exists.status.value,
            },
        )

    dup = (
        db.query(Schedule)
        .filter(
            Schedule.schedule_week_id == schedule_week_id,
            Schedule.user_id == data.user_id,
            Schedule.work_date == data.work_date,
        )
        .first()
    )
    if dup:
        raise HTTPException(409, "해당 직원에게 이미 해당 날짜 스케줄이 존재합니다.")

    schedule = Schedule(
        schedule_week_id=schedule_week_id,
        user_id=data.user_id,
        work_date=data.work_date,
        start_time=_parse_time(data.start_time),
        end_time=_parse_time(data.end_time),
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    result = (
        db.query(Schedule)
        .options(joinedload(Schedule.user))
        .filter(Schedule.id == schedule.id)
        .first()
    )
    return _build_schedule_response(result)


def update_schedule(
    db: Session,
    schedule_id: int,
    data: ScheduleUpdate,
    user: User,
) -> ScheduleResponse:
    if not is_admin(user):
        raise HTTPException(403, "관리자만 스케줄을 수정할 수 있습니다.")

    schedule = (
        db.query(Schedule)
        .options(joinedload(Schedule.user))
        .filter(Schedule.id == schedule_id)
        .first()
    )
    if schedule is None:
        raise HTTPException(404, "존재하지 않는 스케줄입니다.")

    if data.work_date and data.work_date != schedule.work_date:
        # 고정 불가 요일 확인
        emp = db.query(User).filter(User.id == schedule.user_id).first()
        if emp and emp.unavailable_days:
            work_weekday = data.work_date.weekday()
            if work_weekday in emp.unavailable_days:
                day_label = _DAY_LABELS[work_weekday]
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "UNAVAILABLE_DAY_CONFLICT",
                        "message": f"{emp.name}님의 고정 불가 요일({day_label}요일)에는 스케줄을 등록할 수 없습니다.",
                    },
                )

        dayoff_exists = (
            db.query(DayOffRequest)
            .filter(
                DayOffRequest.user_id == schedule.user_id,
                DayOffRequest.request_date == data.work_date,
                DayOffRequest.status.in_(
                    [RequestStatusEnum.pending, RequestStatusEnum.approved]
                ),
            )
            .first()
        )
        if dayoff_exists:
            raise HTTPException(409, "해당 직원이 변경할 날짜에 휴무 신청 중입니다.")

    if data.work_date:
        schedule.work_date = data.work_date
    if data.start_time:
        schedule.start_time = _parse_time(data.start_time)
    if data.end_time:
        schedule.end_time = _parse_time(data.end_time)

    db.commit()
    db.refresh(schedule)

    # 스케줄 변경 시 해당 직원에게 알림 (관리자 본인 제외)
    if schedule.user_id != user.id:
        wd = schedule.work_date
        create_notification(
            db,
            recipient_id=schedule.user_id,
            title="스케줄 변경",
            body=f"{wd.month}월 {wd.day}일 스케줄이 변경되었습니다.",
        )
        db.commit()

    return _build_schedule_response(schedule)


def delete_schedule(db: Session, schedule_id: int, user: User) -> dict:
    if not is_admin(user):
        raise HTTPException(403, "관리자만 스케줄을 삭제할 수 있습니다.")

    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if schedule is None:
        raise HTTPException(404, "존재하지 않는 스케줄입니다.")

    # ShiftRequest 중 해당 schedule_id를 참조하는 레코드 먼저 삭제
    from app.modules.schedule.models.shift_models import ShiftRequest

    db.query(ShiftRequest).filter(
        (ShiftRequest.requester_schedule_id == schedule_id)
        | (ShiftRequest.target_schedule_id == schedule_id)
    ).delete(synchronize_session="fetch")

    db.delete(schedule)
    db.commit()
    return {"message": "스케줄이 삭제되었습니다."}


def get_schedule_users(db: Session, current_user: Optional[User] = None) -> List[User]:
    query = db.query(User).filter(
        User.position != PositionEnum.system,
        User.status == "approved",
        User.is_active.is_(True),
    )
    if current_user is not None and not is_admin(current_user):
        query = query.filter(User.id != current_user.id)
    return query.order_by(User.name).all()


# ─── Sweep Line 시간 겹침 분석 ─────────────────────────────

def _time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def _minutes_to_time_str(minutes: int) -> str:
    h = minutes // 60
    m = minutes % 60
    return f"{h:02d}:{m:02d}"


def _calculate_day_overlaps(schedules: List[Schedule]) -> List[TimeSlotOverlap]:
    if not schedules:
        return []

    events: List[Tuple[int, int, int, str, str]] = []
    for s in schedules:
        start_min = _time_to_minutes(s.start_time)
        end_min = _time_to_minutes(s.end_time)
        pos = s.user.position if s.user else ""
        pos_val = pos.value if hasattr(pos, "value") else str(pos)
        name = s.user.name if s.user else ""
        events.append((start_min, 1, s.user_id, name, pos_val))
        events.append((end_min, -1, s.user_id, name, pos_val))

    # 같은 시간이면 종료(-1)를 시작(+1)보다 먼저 처리
    events.sort(key=lambda x: (x[0], x[1]))

    slots: List[TimeSlotOverlap] = []
    current_employees: Dict[int, dict] = {}
    prev_time: Optional[int] = None

    for time_val, event_type, user_id, name, position in events:
        if prev_time is not None and prev_time < time_val and current_employees:
            slots.append(
                TimeSlotOverlap(
                    start_time=_minutes_to_time_str(prev_time),
                    end_time=_minutes_to_time_str(time_val),
                    employees=[
                        EmployeeOverlapInfo(
                            user_id=uid,
                            name=emp["name"],
                            position=emp["position"],
                        )
                        for uid, emp in current_employees.items()
                    ],
                    count=len(current_employees),
                )
            )

        if event_type == 1:
            current_employees[user_id] = {"name": name, "position": position}
        else:
            current_employees.pop(user_id, None)

        prev_time = time_val

    return slots


def calculate_time_overlap(
    db: Session,
    year: int,
    week_number: int,
) -> WeekOverlapResponse:
    schedules = (
        db.query(Schedule)
        .options(joinedload(Schedule.user))
        .join(ScheduleWeek, Schedule.schedule_week_id == ScheduleWeek.id)
        .filter(ScheduleWeek.year == year, ScheduleWeek.week_number == week_number)
        .order_by(Schedule.work_date, Schedule.start_time)
        .all()
    )

    by_date: Dict[date, List[Schedule]] = defaultdict(list)
    for s in schedules:
        by_date[s.work_date].append(s)

    days = []
    for work_date in sorted(by_date.keys()):
        slots = _calculate_day_overlaps(by_date[work_date])
        days.append(DayOverlapResponse(work_date=str(work_date), slots=slots))

    return WeekOverlapResponse(year=year, week_number=week_number, days=days)
