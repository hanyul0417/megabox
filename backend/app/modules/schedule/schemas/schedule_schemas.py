from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel

from app.modules.schedule.models.schedule_models import ScheduleStatusEnum


class ScheduleWeekCreate(BaseModel):
    year: int
    week_number: int


class ScheduleWeekResponse(BaseModel):
    id: int
    year: int
    week_number: int
    status: ScheduleStatusEnum
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScheduleWeekStatusUpdate(BaseModel):
    status: ScheduleStatusEnum


class ScheduleCreate(BaseModel):
    user_id: int
    work_date: date
    start_time: str  # "HH:MM"
    end_time: str    # "HH:MM"


class ScheduleUpdate(BaseModel):
    work_date: Optional[date] = None
    start_time: Optional[str] = None  # "HH:MM"
    end_time: Optional[str] = None    # "HH:MM"


class ScheduleResponse(BaseModel):
    id: int
    schedule_week_id: int
    user_id: int
    user_name: str
    user_position: str
    work_date: date
    start_time: str  # "HH:MM"
    end_time: str    # "HH:MM"

    class Config:
        from_attributes = True


# ─── 시간 겹침 분석 스키마 ─────────────────────────────────

class EmployeeOverlapInfo(BaseModel):
    user_id: int
    name: str
    position: str


class TimeSlotOverlap(BaseModel):
    start_time: str   # "HH:MM"
    end_time: str     # "HH:MM"
    employees: List[EmployeeOverlapInfo]
    count: int


class DayOverlapResponse(BaseModel):
    work_date: str    # "YYYY-MM-DD"
    slots: List[TimeSlotOverlap]


class WeekOverlapResponse(BaseModel):
    year: int
    week_number: int
    days: List[DayOverlapResponse]


# ─── 주간 전체 응답 ────────────────────────────────────────

class WeekScheduleResponse(BaseModel):
    week: Optional[ScheduleWeekResponse] = None
    schedules: List[ScheduleResponse]
