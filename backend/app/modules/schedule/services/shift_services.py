from __future__ import annotations

from typing import List

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.modules.auth.models import User
from app.modules.schedule.models.dayoff_models import RequestStatusEnum
from app.modules.schedule.models.schedule_models import Schedule
from app.modules.schedule.models.shift_models import ShiftChangeTypeEnum, ShiftRequest
from app.modules.schedule.schemas.shift_schemas import (
    ShiftDecision,
    ShiftRequestCreate,
    ShiftRequestResponse,
)
from app.utils.permission_utils import is_admin


def _fmt_time(t) -> str:
    if t is None:
        return ""
    return t.strftime("%H:%M")


def _build_shift_response(req: ShiftRequest) -> ShiftRequestResponse:
    req_sched = req.requester_schedule
    tgt_sched = req.target_schedule
    return ShiftRequestResponse(
        id=req.id,
        type=req.type,
        requester_id=req.requester_id,
        requester_name=req.requester.name if req.requester else "",
        requester_schedule_id=req.requester_schedule_id,
        requester_work_date=req_sched.work_date if req_sched else None,
        requester_start_time=_fmt_time(req_sched.start_time) if req_sched else None,
        requester_end_time=_fmt_time(req_sched.end_time) if req_sched else None,
        target_user_id=req.target_user_id,
        target_user_name=req.target_user.name if req.target_user else "",
        target_schedule_id=req.target_schedule_id,
        target_work_date=tgt_sched.work_date if tgt_sched else None,
        target_start_time=_fmt_time(tgt_sched.start_time) if tgt_sched else None,
        target_end_time=_fmt_time(tgt_sched.end_time) if tgt_sched else None,
        status=req.status,
        note=req.note,
        reject_reason=req.reject_reason,
        created_at=req.created_at,
    )


def _load_shift(db: Session, shift_id: int) -> ShiftRequest:
    req = (
        db.query(ShiftRequest)
        .options(
            joinedload(ShiftRequest.requester),
            joinedload(ShiftRequest.target_user),
            joinedload(ShiftRequest.requester_schedule).joinedload(Schedule.user),
            joinedload(ShiftRequest.target_schedule).joinedload(Schedule.user),
        )
        .filter(ShiftRequest.id == shift_id)
        .first()
    )
    if req is None:
        raise HTTPException(404, "존재하지 않는 근무교대 신청입니다.")
    return req


def create_shift_request(
    db: Session,
    user: User,
    data: ShiftRequestCreate,
) -> ShiftRequestResponse:
    """근무교대 / 대타 신청"""

    # 본인에게 근무교대 신청 불가
    if data.target_user_id == user.id:
        raise HTTPException(
            400,
            detail={
                "code": "SELF_SHIFT_NOT_ALLOWED",
                "message": "본인에게 근무교대를 신청할 수 없습니다.",
            },
        )

    # 신청자 스케줄 검증
    req_schedule = (
        db.query(Schedule)
        .options(joinedload(Schedule.user))
        .filter(Schedule.id == data.requester_schedule_id)
        .first()
    )
    if req_schedule is None:
        raise HTTPException(404, "신청자 근무 슬롯을 찾을 수 없습니다.")
    if req_schedule.user_id != user.id:
        raise HTTPException(403, "자신의 근무 슬롯만 교대 신청할 수 있습니다.")

    # EXCHANGE: 상대방 스케줄 검증
    if data.type == ShiftChangeTypeEnum.exchange:
        if data.target_schedule_id is None:
            raise HTTPException(400, "근무교대(EXCHANGE)는 상대방 근무 슬롯이 필요합니다.")
        tgt_schedule = (
            db.query(Schedule)
            .filter(Schedule.id == data.target_schedule_id)
            .first()
        )
        if tgt_schedule is None:
            raise HTTPException(404, "상대방 근무 슬롯을 찾을 수 없습니다.")
        if tgt_schedule.user_id != data.target_user_id:
            raise HTTPException(400, "상대방 근무 슬롯이 선택한 직원의 것이 아닙니다.")

    # 대상 직원 존재 확인
    target_user = db.query(User).filter(User.id == data.target_user_id).first()
    if target_user is None:
        raise HTTPException(404, "대상 직원을 찾을 수 없습니다.")

    shift_req = ShiftRequest(
        type=data.type,
        requester_id=user.id,
        requester_schedule_id=data.requester_schedule_id,
        target_user_id=data.target_user_id,
        target_schedule_id=data.target_schedule_id,
        status=RequestStatusEnum.pending,
        note=data.note,
    )
    db.add(shift_req)
    db.flush()

    db.commit()
    db.refresh(shift_req)
    return _build_shift_response(_load_shift(db, shift_req.id))


def get_my_shift_requests(db: Session, user: User) -> List[ShiftRequestResponse]:
    rows = (
        db.query(ShiftRequest)
        .options(
            joinedload(ShiftRequest.requester),
            joinedload(ShiftRequest.target_user),
            joinedload(ShiftRequest.requester_schedule).joinedload(Schedule.user),
            joinedload(ShiftRequest.target_schedule).joinedload(Schedule.user),
        )
        .filter(
            (ShiftRequest.requester_id == user.id)
            | (ShiftRequest.target_user_id == user.id)
        )
        .order_by(ShiftRequest.created_at.desc())
        .all()
    )
    return [_build_shift_response(r) for r in rows]


def get_all_shift_requests_for_users(db: Session) -> List[ShiftRequestResponse]:
    rows = (
        db.query(ShiftRequest)
        .options(
            joinedload(ShiftRequest.requester),
            joinedload(ShiftRequest.target_user),
            joinedload(ShiftRequest.requester_schedule).joinedload(Schedule.user),
            joinedload(ShiftRequest.target_schedule).joinedload(Schedule.user),
        )
        .order_by(ShiftRequest.created_at.desc())
        .all()
    )
    return [_build_shift_response(r) for r in rows]


def get_all_shift_requests(db: Session, user: User) -> List[ShiftRequestResponse]:
    if not is_admin(user):
        raise HTTPException(403, "관리자만 전체 근무교대 신청 목록을 조회할 수 있습니다.")
    rows = (
        db.query(ShiftRequest)
        .options(
            joinedload(ShiftRequest.requester),
            joinedload(ShiftRequest.target_user),
            joinedload(ShiftRequest.requester_schedule).joinedload(Schedule.user),
            joinedload(ShiftRequest.target_schedule).joinedload(Schedule.user),
        )
        .order_by(ShiftRequest.created_at.desc())
        .all()
    )
    return [_build_shift_response(r) for r in rows]


def approve_shift_request(
    db: Session, shift_id: int, admin_user: User
) -> ShiftRequestResponse:
    """
    승인 시 스케줄 자동 변경:
    - EXCHANGE: 두 스케줄의 user_id 교환
    - SUBSTITUTE: 신청자 스케줄의 user_id → 대타 직원 ID로 변경
    """
    if not is_admin(admin_user):
        raise HTTPException(403, "관리자만 근무교대를 승인할 수 있습니다.")

    req = _load_shift(db, shift_id)
    if req.status != RequestStatusEnum.pending:
        raise HTTPException(409, "이미 처리된 신청입니다.")

    req_schedule = req.requester_schedule
    if req_schedule is None:
        raise HTTPException(400, "신청자 근무 슬롯이 삭제되었습니다.")

    if req.type == ShiftChangeTypeEnum.exchange:
        tgt_schedule = req.target_schedule
        if tgt_schedule is None:
            raise HTTPException(400, "상대방 근무 슬롯이 삭제되었습니다.")
        # user_id 교환
        req_user_id = req_schedule.user_id
        tgt_user_id = tgt_schedule.user_id
        req_schedule.user_id = tgt_user_id
        tgt_schedule.user_id = req_user_id

    else:  # SUBSTITUTE
        # 신청자 슬롯 → 대타 직원으로 변경
        req_schedule.user_id = req.target_user_id

    req.status = RequestStatusEnum.approved
    req.processed_by = admin_user.id

    db.commit()
    db.refresh(req)
    return _build_shift_response(_load_shift(db, shift_id))


def reject_shift_request(
    db: Session, shift_id: int, admin_user: User, reject_reason: str = ""
) -> ShiftRequestResponse:
    if not is_admin(admin_user):
        raise HTTPException(403, "관리자만 근무교대를 반려할 수 있습니다.")

    req = _load_shift(db, shift_id)
    if req.status != RequestStatusEnum.pending:
        raise HTTPException(409, "이미 처리된 신청입니다.")

    req.status = RequestStatusEnum.rejected
    req.processed_by = admin_user.id
    req.reject_reason = reject_reason.strip() if reject_reason else None

    db.commit()
    db.refresh(req)
    return _build_shift_response(_load_shift(db, shift_id))
