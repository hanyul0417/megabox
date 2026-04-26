from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.auth.models import User
from app.modules.schedule.schemas.fixed_dayoff_schemas import (
    FixedDayOffCreate,
    FixedDayOffDecision,
    FixedDayOffResponse,
)
from app.modules.schedule.services import fixed_dayoff_services

router = APIRouter()


@router.post(
    "/",
    response_model=FixedDayOffResponse,
    status_code=status.HTTP_201_CREATED,
    summary="고정휴무 신청",
)
def create_fixed_dayoff(
    data: FixedDayOffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return fixed_dayoff_services.create_fixed_dayoff_request(db, current_user, data)


@router.get("/my", response_model=List[FixedDayOffResponse], summary="내 고정휴무 신청 목록")
def get_my_fixed_dayoffs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return fixed_dayoff_services.get_my_fixed_dayoff_requests(db, current_user)


@router.get(
    "/admin",
    response_model=List[FixedDayOffResponse],
    summary="전체 고정휴무 신청 목록 (관리자)",
)
def get_all_fixed_dayoffs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return fixed_dayoff_services.get_all_fixed_dayoff_requests(db, current_user)


@router.patch(
    "/{req_id}/approve",
    response_model=FixedDayOffResponse,
    summary="고정휴무 승인 (관리자)",
)
def approve_fixed_dayoff(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return fixed_dayoff_services.approve_fixed_dayoff(db, req_id, current_user)


@router.patch(
    "/{req_id}/reject",
    response_model=FixedDayOffResponse,
    summary="고정휴무 반려 (관리자)",
)
def reject_fixed_dayoff(
    req_id: int,
    data: FixedDayOffDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return fixed_dayoff_services.reject_fixed_dayoff(
        db, req_id, current_user, reject_reason=data.reject_reason or ""
    )
