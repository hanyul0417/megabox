from __future__ import annotations

from typing import List

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.modules.auth.models import PositionEnum, StatusEnum, User
from app.modules.notification.services import create_bulk_notifications, create_notification
from app.modules.schedule.models.fixed_dayoff_models import FixedDayOffRequest, FixedDayOffStatusEnum
from app.modules.schedule.schemas.fixed_dayoff_schemas import (
    FixedDayOffCreate,
    FixedDayOffResponse,
)
from app.utils.permission_utils import is_admin

DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]


def _build_response(req: FixedDayOffRequest) -> FixedDayOffResponse:
    return FixedDayOffResponse(
        id=req.id,
        user_id=req.user_id,
        user_name=req.user.name if req.user else "",
        requested_days=req.requested_days or [],
        reason=req.reason,
        status=req.status,
        processed_by=req.processed_by,
        reject_reason=req.reject_reason,
        created_at=req.created_at,
    )


def create_fixed_dayoff_request(
    db: Session, user: User, data: FixedDayOffCreate
) -> FixedDayOffResponse:
    if not data.requested_days and data.requested_days != []:
        raise HTTPException(400, "신청 요일을 선택해주세요.")
    for d in data.requested_days:
        if d < 0 or d > 6:
            raise HTTPException(400, "요일 값은 0(일)~6(토) 범위여야 합니다.")

    # 대기중인 신청이 있으면 중복 방지
    existing = (
        db.query(FixedDayOffRequest)
        .filter(
            FixedDayOffRequest.user_id == user.id,
            FixedDayOffRequest.status == FixedDayOffStatusEnum.pending,
        )
        .first()
    )
    if existing:
        raise HTTPException(409, "이미 검토 중인 고정휴무 신청이 있습니다.")

    req = FixedDayOffRequest(
        user_id=user.id,
        requested_days=sorted(data.requested_days),
        reason=data.reason,
        status=FixedDayOffStatusEnum.pending,
    )
    db.add(req)
    db.flush()

    admin_ids = [
        u.id
        for u in db.query(User.id)
        .filter(
            User.position == PositionEnum.admin,
            User.is_active == True,  # noqa: E712
            User.status == StatusEnum.approved,
        )
        .all()
    ]
    days_str = ", ".join(DAY_LABELS[d] + "요일" for d in sorted(data.requested_days))
    create_bulk_notifications(
        db,
        recipient_ids=admin_ids,
        title="고정휴무 신청",
        body=f"{user.name}님이 고정휴무를 신청했습니다. ({days_str})",
        link="/admin",
    )

    db.commit()
    db.refresh(req)

    result = (
        db.query(FixedDayOffRequest)
        .options(joinedload(FixedDayOffRequest.user))
        .filter(FixedDayOffRequest.id == req.id)
        .first()
    )
    return _build_response(result)


def get_my_fixed_dayoff_requests(db: Session, user: User) -> List[FixedDayOffResponse]:
    rows = (
        db.query(FixedDayOffRequest)
        .options(joinedload(FixedDayOffRequest.user))
        .filter(FixedDayOffRequest.user_id == user.id)
        .order_by(FixedDayOffRequest.created_at.desc())
        .all()
    )
    return [_build_response(r) for r in rows]


def get_all_fixed_dayoff_requests(db: Session, user: User) -> List[FixedDayOffResponse]:
    if not is_admin(user):
        raise HTTPException(403, "관리자만 전체 고정휴무 신청 목록을 조회할 수 있습니다.")
    rows = (
        db.query(FixedDayOffRequest)
        .options(joinedload(FixedDayOffRequest.user))
        .order_by(FixedDayOffRequest.created_at.desc())
        .all()
    )
    return [_build_response(r) for r in rows]


def approve_fixed_dayoff(db: Session, req_id: int, admin_user: User) -> FixedDayOffResponse:
    if not is_admin(admin_user):
        raise HTTPException(403, "관리자만 승인할 수 있습니다.")

    req = (
        db.query(FixedDayOffRequest)
        .options(joinedload(FixedDayOffRequest.user))
        .filter(FixedDayOffRequest.id == req_id)
        .first()
    )
    if req is None:
        raise HTTPException(404, "존재하지 않는 신청입니다.")
    if req.status != FixedDayOffStatusEnum.pending:
        raise HTTPException(409, "이미 처리된 신청입니다.")

    req.status = FixedDayOffStatusEnum.approved
    req.processed_by = admin_user.id

    # user.unavailable_days 업데이트
    target_user = db.get(User, req.user_id)
    if target_user:
        target_user.unavailable_days = req.requested_days

    days_str = ", ".join(DAY_LABELS[d] + "요일" for d in sorted(req.requested_days))
    create_notification(
        db,
        recipient_id=req.user_id,
        title="고정휴무 승인",
        body=f"고정휴무 신청이 승인되었습니다. ({days_str})",
        link="/apply/fixed-dayoff",
    )

    db.commit()
    db.refresh(req)
    return _build_response(req)


def reject_fixed_dayoff(
    db: Session, req_id: int, admin_user: User, reject_reason: str = ""
) -> FixedDayOffResponse:
    if not is_admin(admin_user):
        raise HTTPException(403, "관리자만 반려할 수 있습니다.")

    req = (
        db.query(FixedDayOffRequest)
        .options(joinedload(FixedDayOffRequest.user))
        .filter(FixedDayOffRequest.id == req_id)
        .first()
    )
    if req is None:
        raise HTTPException(404, "존재하지 않는 신청입니다.")
    if req.status != FixedDayOffStatusEnum.pending:
        raise HTTPException(409, "이미 처리된 신청입니다.")

    req.status = FixedDayOffStatusEnum.rejected
    req.processed_by = admin_user.id
    req.reject_reason = reject_reason or None

    body = "고정휴무 신청이 반려되었습니다."
    if reject_reason.strip():
        body += f" 사유: {reject_reason.strip()}"
    create_notification(db, recipient_id=req.user_id, title="고정휴무 반려", body=body, link="/apply/fixed-dayoff")

    db.commit()
    db.refresh(req)
    return _build_response(req)
