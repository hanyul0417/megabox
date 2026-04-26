from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.auth.models import User
from app.modules.schedule.routers.dayoff_router import router as dayoff_router
from app.modules.schedule.routers.fixed_dayoff_router import router as fixed_dayoff_router
from app.modules.schedule.routers.shift_router import router as shift_router
from app.modules.schedule.schemas.schedule_schemas import (
    ScheduleCreate,
    ScheduleResponse,
    ScheduleUpdate,
    ScheduleWeekCreate,
    ScheduleWeekResponse,
    ScheduleWeekStatusUpdate,
    WeekOverlapResponse,
    WeekScheduleResponse,
)
from app.modules.schedule.services import schedule_services
from app.utils.permission_utils import is_system


def block_system_user(user: User = Depends(get_current_user)) -> User:
    if is_system(user):
        raise HTTPException(403, "시스템 계정은 접근할 수 없습니다.")
    return user


router = APIRouter(dependencies=[Depends(block_system_user)])
router.include_router(dayoff_router, prefix="/dayoff", tags=["휴무신청"])
router.include_router(shift_router, prefix="/shift", tags=["근무교대"])
router.include_router(fixed_dayoff_router, prefix="/fixed-dayoff", tags=["고정휴무신청"])


@router.get("/users", summary="스케줄 배정용 직원 목록")
def get_schedule_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = schedule_services.get_schedule_users(db, current_user)
    return [
        {
            "id": u.id,
            "name": u.name,
            "username": u.username,
            "position": u.position.value if hasattr(u.position, "value") else str(u.position),
        }
        for u in users
    ]


@router.get(
    "/week/{year}/{week_number}",
    response_model=WeekScheduleResponse,
    summary="주간 스케줄 조회",
)
def get_week_schedules(
    year: int,
    week_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_services.get_week_schedules(db, year, week_number, current_user)


@router.post(
    "/week",
    response_model=ScheduleWeekResponse,
    status_code=status.HTTP_201_CREATED,
    summary="주차 생성 (관리자)",
)
def create_schedule_week(
    data: ScheduleWeekCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    week = schedule_services.get_or_create_schedule_week(
        db, data.year, data.week_number, current_user
    )
    return ScheduleWeekResponse(
        id=week.id,
        year=week.year,
        week_number=week.week_number,
        status=week.status,
        created_by=week.created_by,
        created_at=week.created_at,
        updated_at=week.updated_at,
    )


@router.patch(
    "/week/{year}/{week_number}/status",
    response_model=ScheduleWeekResponse,
    summary="주차 상태 변경 DRAFT ↔ CONFIRMED (관리자)",
)
def update_week_status(
    year: int,
    week_number: int,
    data: ScheduleWeekStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_services.update_week_status(db, year, week_number, data, current_user)


@router.get(
    "/week/{year}/{week_number}/overlap",
    response_model=WeekOverlapResponse,
    summary="주간 시간 겹침 분석",
)
def get_week_overlap(
    year: int,
    week_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_services.calculate_time_overlap(db, year, week_number)


@router.post(
    "/",
    response_model=ScheduleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="스케줄 생성 (관리자)",
)
def create_schedule(
    data: ScheduleCreate,
    schedule_week_id: int = Query(..., description="주차 ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_services.create_schedule(db, schedule_week_id, data, current_user)


@router.patch(
    "/{schedule_id}",
    response_model=ScheduleResponse,
    summary="스케줄 수정 (관리자)",
)
def update_schedule(
    schedule_id: int,
    data: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_services.update_schedule(db, schedule_id, data, current_user)


@router.delete(
    "/{schedule_id}",
    status_code=status.HTTP_200_OK,
    summary="스케줄 삭제 (관리자)",
)
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return schedule_services.delete_schedule(db, schedule_id, current_user)
