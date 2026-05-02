from __future__ import annotations

from calendar import monthrange
from datetime import date
from typing import Dict, List

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.modules.admin.models import DayoffSetting, Holiday
from app.modules.community.models import CategoryEnum, Comment, Post
from app.modules.schedule.models.dayoff_models import DayOffRequest, RequestStatusEnum
from app.modules.schedule.models.schedule_models import ScheduleStatusEnum, ScheduleWeek
from app.modules.schedule.schemas.dayoff_schemas import DayOffCalendarEntry, DayOffCreate, DayOffDecision, DayOffResponse
from app.modules.auth.models import PositionEnum, StatusEnum, User
from app.modules.notification.services import create_notification, create_bulk_notifications
from app.utils.date_utils import get_iso_week_range, get_month_range
from app.utils.permission_utils import is_admin


def _build_dayoff_response(d: DayOffRequest) -> DayOffResponse:
    user_name = d.user.name if d.user else ""
    return DayOffResponse(
        id=d.id,
        user_id=d.user_id,
        user_name=user_name,
        request_date=d.request_date,
        reason=d.reason,
        status=d.status,
        is_weekend_or_holiday=d.is_weekend_or_holiday,
        processed_by=d.processed_by,
        created_at=d.created_at,
    )


def _get_week_for_date(db: Session, target_date: date) -> ScheduleWeek | None:
    """날짜가 속한 주차의 ScheduleWeek 조회"""
    iso = target_date.isocalendar()
    return (
        db.query(ScheduleWeek)
        .filter(
            ScheduleWeek.year == iso[0],
            ScheduleWeek.week_number == iso[1],
        )
        .first()
    )


def create_dayoff_request(
    db: Session,
    user: User,
    data: DayOffCreate,
) -> DayOffResponse:
    """
    휴무 신청.
    - 해당 날짜가 속한 주차가 CONFIRMED 상태이면 신청 불가
    - 주말/공휴일은 해당 월 2회 제한
    """
    # 중복 신청 체크
    existing = (
        db.query(DayOffRequest)
        .filter(
            DayOffRequest.user_id == user.id,
            DayOffRequest.request_date == data.request_date,
            DayOffRequest.status != RequestStatusEnum.rejected,
        )
        .first()
    )
    if existing:
        raise HTTPException(409, "이미 해당 날짜에 휴무 신청이 존재합니다.")

    # 스케줄이 CONFIRMED된 주차는 신청 불가
    week = _get_week_for_date(db, data.request_date)
    if week and week.status == ScheduleStatusEnum.confirmed:
        raise HTTPException(
            400,
            "해당 날짜의 스케줄이 이미 확정되어 휴무 신청이 불가합니다.",
        )

    # 주말/공휴일 판정
    is_weekend = data.request_date.weekday() >= 5
    is_holiday_flag = False
    if not is_weekend:
        holiday = db.query(Holiday).filter(Holiday.date == data.request_date).first()
        if holiday:
            is_holiday_flag = True

    is_woh = is_weekend or is_holiday_flag

    # 주말/공휴일 월 한도 체크 (개인 override → 전역 설정 → 기본 2)
    if is_woh:
        if user.weekend_dayoff_limit is not None:
            limit = user.weekend_dayoff_limit
        else:
            setting = db.get(DayoffSetting, 1)
            limit = setting.monthly_limit if setting else 2

        if limit > 0:  # 0 = 무제한
            month_start, month_end = get_month_range(data.request_date)
            count = (
                db.query(DayOffRequest)
                .filter(
                    DayOffRequest.user_id == user.id,
                    DayOffRequest.request_date >= month_start,
                    DayOffRequest.request_date <= month_end,
                    DayOffRequest.is_weekend_or_holiday.is_(True),
                    DayOffRequest.status.in_(
                        [RequestStatusEnum.pending, RequestStatusEnum.approved]
                    ),
                )
                .count()
            )
            if count >= limit:
                raise HTTPException(
                    409,
                    f"이번 달 주말/공휴일 휴무 신청은 최대 {limit}회입니다.",
                )

    dayoff = DayOffRequest(
        user_id=user.id,
        request_date=data.request_date,
        reason=data.reason,
        status=RequestStatusEnum.pending,
        is_weekend_or_holiday=is_woh,
    )
    db.add(dayoff)
    db.flush()

    # 커뮤니티 자동 게시글 생성 후 post_id 저장
    post = _create_dayoff_post(db, user, dayoff)
    db.flush()
    dayoff.post_id = post.id

    # 관리자 전원에게 알림
    admin_ids = [
        u.id for u in db.query(User.id).filter(
            User.position == PositionEnum.admin,
            User.is_active == True,  # noqa: E712
            User.status == StatusEnum.approved,
        ).all()
    ]
    d = data.request_date
    create_bulk_notifications(
        db,
        recipient_ids=admin_ids,
        title="휴무 신청",
        body=f"{user.name}님이 {d.month}월 {d.day}일 휴무를 신청했습니다.",
        link="/admin",
    )

    db.commit()
    db.refresh(dayoff)

    result = (
        db.query(DayOffRequest)
        .options(joinedload(DayOffRequest.user))
        .filter(DayOffRequest.id == dayoff.id)
        .first()
    )
    return _build_dayoff_response(result)


def _create_dayoff_post(db: Session, user: User, dayoff: DayOffRequest) -> Post:
    d = dayoff.request_date
    weekday_ko = ["월", "화", "수", "목", "금", "토", "일"][d.weekday()]
    day_str = f"{d.year}년 {d.month}월 {d.day}일({weekday_ko})"
    woh_note = " (주말/공휴일)" if dayoff.is_weekend_or_holiday else ""

    post = Post(
        category=CategoryEnum.dayoff,
        title=f"[휴무신청] {user.name}님의 {day_str}{woh_note} 휴무 신청",
        content=(
            f"{user.name}님이 {day_str}{woh_note}에 휴무를 신청하였습니다.\n\n"
            f"사유: {dayoff.reason}\n\n"
            "관리자의 검토를 부탁드립니다."
        ),
        author_id=user.id,
        system_generated=True,
    )
    db.add(post)
    return post


def get_my_dayoff_requests(db: Session, user: User) -> List[DayOffResponse]:
    rows = (
        db.query(DayOffRequest)
        .options(joinedload(DayOffRequest.user))
        .filter(DayOffRequest.user_id == user.id)
        .order_by(DayOffRequest.request_date.desc())
        .all()
    )
    return [_build_dayoff_response(r) for r in rows]


def get_all_dayoff_requests(db: Session, user: User) -> List[DayOffResponse]:
    if not is_admin(user):
        raise HTTPException(403, "관리자만 전체 휴무 신청 목록을 조회할 수 있습니다.")
    rows = (
        db.query(DayOffRequest)
        .options(joinedload(DayOffRequest.user))
        .order_by(DayOffRequest.created_at.desc())
        .all()
    )
    return [_build_dayoff_response(r) for r in rows]


def approve_dayoff(db: Session, dayoff_id: int, admin_user: User) -> DayOffResponse:
    if not is_admin(admin_user):
        raise HTTPException(403, "관리자만 휴무를 승인할 수 있습니다.")

    dayoff = (
        db.query(DayOffRequest)
        .options(joinedload(DayOffRequest.user))
        .filter(DayOffRequest.id == dayoff_id)
        .first()
    )
    if dayoff is None:
        raise HTTPException(404, "존재하지 않는 휴무 신청입니다.")
    if dayoff.status != RequestStatusEnum.pending:
        raise HTTPException(409, "이미 처리된 휴무 신청입니다.")

    dayoff.status = RequestStatusEnum.approved
    dayoff.processed_by = admin_user.id

    # 연결된 게시글에 승인 댓글 자동 생성
    if dayoff.post_id:
        comment = Comment(
            post_id=dayoff.post_id,
            author_id=admin_user.id,
            content="승인되었습니다.",
            comment_type="approved",
        )
        db.add(comment)

    # 신청자에게 알림
    d = dayoff.request_date
    create_notification(
        db,
        recipient_id=dayoff.user_id,
        title="휴무 승인",
        body=f"{d.month}월 {d.day}일 휴무 신청이 승인되었습니다.",
        link="/apply/dayoff",
    )

    db.commit()
    db.refresh(dayoff)
    return _build_dayoff_response(dayoff)


def delete_approved_dayoff(db: Session, dayoff_id: int, admin_user: User) -> None:
    if not is_admin(admin_user):
        raise HTTPException(403, "관리자만 승인된 휴무를 삭제할 수 있습니다.")

    dayoff = (
        db.query(DayOffRequest)
        .options(joinedload(DayOffRequest.user))
        .filter(DayOffRequest.id == dayoff_id)
        .first()
    )
    if dayoff is None:
        raise HTTPException(404, "존재하지 않는 휴무 신청입니다.")
    if dayoff.status != RequestStatusEnum.approved:
        raise HTTPException(409, "승인된 휴무 신청만 삭제할 수 있습니다.")

    d = dayoff.request_date
    create_notification(
        db,
        recipient_id=dayoff.user_id,
        title="휴무 삭제",
        body=f"{d.month}월 {d.day}일 승인된 휴무가 관리자에 의해 삭제되었습니다.",
        link="/apply/dayoff",
    )

    db.delete(dayoff)
    db.commit()


def get_dayoff_calendar(
    db: Session, year: int, month: int
) -> Dict[str, List[DayOffCalendarEntry]]:
    """월별 전체 직원 휴무 현황 (PENDING + APPROVED)"""
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])

    rows = (
        db.query(DayOffRequest)
        .options(joinedload(DayOffRequest.user))
        .filter(
            DayOffRequest.request_date >= start,
            DayOffRequest.request_date <= end,
            DayOffRequest.status.in_(
                [RequestStatusEnum.pending, RequestStatusEnum.approved]
            ),
        )
        .order_by(DayOffRequest.request_date, DayOffRequest.created_at)
        .all()
    )

    result: Dict[str, List[DayOffCalendarEntry]] = {}
    for r in rows:
        date_str = r.request_date.isoformat()
        if date_str not in result:
            result[date_str] = []
        result[date_str].append(
            DayOffCalendarEntry(
                user_name=r.user.name if r.user else "",
                status=r.status,
            )
        )

    return result


def reject_dayoff(
    db: Session, dayoff_id: int, admin_user: User, reject_reason: str = ""
) -> DayOffResponse:
    if not is_admin(admin_user):
        raise HTTPException(403, "관리자만 휴무를 반려할 수 있습니다.")

    dayoff = (
        db.query(DayOffRequest)
        .options(joinedload(DayOffRequest.user))
        .filter(DayOffRequest.id == dayoff_id)
        .first()
    )
    if dayoff is None:
        raise HTTPException(404, "존재하지 않는 휴무 신청입니다.")
    if dayoff.status != RequestStatusEnum.pending:
        raise HTTPException(409, "이미 처리된 휴무 신청입니다.")

    dayoff.status = RequestStatusEnum.rejected
    dayoff.processed_by = admin_user.id

    # 연결된 게시글에 반려 댓글 자동 생성
    if dayoff.post_id:
        reason_content = reject_reason.strip() if reject_reason.strip() else "반려되었습니다."
        comment = Comment(
            post_id=dayoff.post_id,
            author_id=admin_user.id,
            content=reason_content,
            comment_type="rejected",
        )
        db.add(comment)

    # 신청자에게 알림
    d = dayoff.request_date
    reason_text = reject_reason.strip() if reject_reason.strip() else ""
    body = f"{d.month}월 {d.day}일 휴무 신청이 반려되었습니다."
    if reason_text:
        body += f" 사유: {reason_text}"
    create_notification(
        db,
        recipient_id=dayoff.user_id,
        title="휴무 반려",
        body=body,
        link="/apply/dayoff",
    )

    db.commit()
    db.refresh(dayoff)
    return _build_dayoff_response(dayoff)
