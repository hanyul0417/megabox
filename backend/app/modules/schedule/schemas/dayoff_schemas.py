from __future__ import annotations

from datetime import date, datetime
from typing import Dict, List, Optional

from pydantic import BaseModel

from app.modules.schedule.models.dayoff_models import RequestStatusEnum


class DayOffCreate(BaseModel):
    """휴무 신청"""

    request_date: date
    reason: str = ""


class DayOffResponse(BaseModel):
    """휴무 조회 응답"""

    id: int
    user_id: int
    user_name: str
    request_date: date
    reason: str
    status: RequestStatusEnum
    is_weekend_or_holiday: bool
    processed_by: Optional[int] = None
    reject_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DayOffDecision(BaseModel):
    """휴무 승인/반려"""

    reject_reason: Optional[str] = None
    note: Optional[str] = None


class DayOffCalendarEntry(BaseModel):
    """캘린더용 휴무 항목"""

    user_name: str
    status: RequestStatusEnum

    class Config:
        from_attributes = True
