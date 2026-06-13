from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.auth.models import User
from app.modules.schedule.schemas.shift_schemas import (
    ShiftDecision,
    ShiftRequestCreate,
    ShiftRequestResponse,
)
from app.modules.schedule.services import shift_services

router = APIRouter()


@router.post(
    "/",
    response_model=ShiftRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="근무교대 / 대타 신청",
)
def create_shift_request(
    data: ShiftRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shift_services.create_shift_request(db, current_user, data)


@router.get(
    "/my",
    response_model=List[ShiftRequestResponse],
    summary="내 근무교대 신청 목록",
)
def get_my_shift_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shift_services.get_my_shift_requests(db, current_user)


@router.get(
    "/all",
    response_model=List[ShiftRequestResponse],
    summary="전체 근무교대 신청 목록 (일반 유저)",
)
def get_all_shifts_for_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shift_services.get_all_shift_requests_for_users(db)


@router.get(
    "/admin",
    response_model=List[ShiftRequestResponse],
    summary="전체 근무교대 신청 목록 (관리자)",
)
def get_all_shift_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shift_services.get_all_shift_requests(db, current_user)


@router.patch(
    "/{shift_id}/approve",
    response_model=ShiftRequestResponse,
    summary="근무교대 승인 (관리자) - 스케줄 자동 변경",
)
def approve_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shift_services.approve_shift_request(db, shift_id, current_user)


@router.patch(
    "/{shift_id}/reject",
    response_model=ShiftRequestResponse,
    summary="근무교대 반려 (관리자)",
)
def reject_shift(
    shift_id: int,
    data: ShiftDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shift_services.reject_shift_request(
        db, shift_id, current_user, reject_reason=data.reject_reason or ""
    )
