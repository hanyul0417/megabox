from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel

from app.modules.schedule.models.dayoff_models import RequestStatusEnum
from app.modules.schedule.models.shift_models import ShiftChangeTypeEnum


class ShiftRequestCreate(BaseModel):
    """근무교대 / 대타 신청"""

    type: ShiftChangeTypeEnum
    requester_schedule_id: int
    target_user_id: int
    target_schedule_id: Optional[int] = None  # EXCHANGE만 사용
    note: Optional[str] = None


class ShiftRequestResponse(BaseModel):
    """근무교대 신청 응답"""

    id: int
    type: ShiftChangeTypeEnum
    requester_id: int
    requester_name: str
    requester_schedule_id: Optional[int] = None
    requester_work_date: Optional[date] = None
    requester_start_time: Optional[str] = None
    requester_end_time: Optional[str] = None
    target_user_id: int
    target_user_name: str
    target_schedule_id: Optional[int] = None
    target_work_date: Optional[date] = None
    target_start_time: Optional[str] = None
    target_end_time: Optional[str] = None
    status: RequestStatusEnum
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ShiftDecision(BaseModel):
    """근무교대 승인/반려"""

    reject_reason: Optional[str] = None
    note: Optional[str] = None
