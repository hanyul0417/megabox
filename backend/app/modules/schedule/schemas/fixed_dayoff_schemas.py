from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.modules.schedule.models.fixed_dayoff_models import FixedDayOffStatusEnum


class FixedDayOffCreate(BaseModel):
    requested_days: List[int]  # [0=일~6=토]
    reason: Optional[str] = None


class FixedDayOffResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    requested_days: List[int]
    reason: Optional[str] = None
    status: FixedDayOffStatusEnum
    processed_by: Optional[int] = None
    reject_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FixedDayOffDecision(BaseModel):
    reject_reason: Optional[str] = None
