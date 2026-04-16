from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.auth.models import User
from app.modules.schedule.schemas.dayoff_schemas import (
    DayOffCreate,
    DayOffDecision,
    DayOffResponse,
)
from app.modules.schedule.services import dayoff_services

router = APIRouter()


@router.post(
    "/",
    response_model=DayOffResponse,
    status_code=status.HTTP_201_CREATED,
    summary="휴무 신청",
)
def create_dayoff(
    data: DayOffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dayoff_services.create_dayoff_request(db, current_user, data)


@router.get("/my", response_model=List[DayOffResponse], summary="내 휴무 신청 목록")
def get_my_dayoffs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dayoff_services.get_my_dayoff_requests(db, current_user)


@router.get(
    "/admin",
    response_model=List[DayOffResponse],
    summary="전체 휴무 신청 목록 (관리자)",
)
def get_all_dayoffs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dayoff_services.get_all_dayoff_requests(db, current_user)


@router.patch(
    "/{dayoff_id}/approve",
    response_model=DayOffResponse,
    summary="휴무 승인 (관리자)",
)
def approve_dayoff(
    dayoff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dayoff_services.approve_dayoff(db, dayoff_id, current_user)


@router.delete(
    "/{dayoff_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="승인된 휴무 삭제 (관리자)",
)
def delete_approved_dayoff(
    dayoff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dayoff_services.delete_approved_dayoff(db, dayoff_id, current_user)


@router.patch(
    "/{dayoff_id}/reject",
    response_model=DayOffResponse,
    summary="휴무 반려 (관리자)",
)
def reject_dayoff(
    dayoff_id: int,
    data: DayOffDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dayoff_services.reject_dayoff(
        db, dayoff_id, current_user, reject_reason=data.reject_reason or ""
    )
