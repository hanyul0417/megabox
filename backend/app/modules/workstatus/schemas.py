from datetime import date, time
from typing import List, Optional

from pydantic import BaseModel

from app.modules.workstatus.models import EventType


# ── 단일 이벤트 ──────────────────────────────────────────
class AttendanceEventOut(BaseModel):
    id: int
    user_id: int
    work_date: date
    event_type: EventType
    event_time: time

    model_config = {"from_attributes": True}


# ── 하루 근태 요약 (API 응답용) ──────────────────────────
class DailySummary(BaseModel):
    """출근~퇴근 하루 요약 (키오스크 + 관리자 공용)"""
    user_id: int
    user_name: Optional[str] = None
    position: Optional[str] = None
    work_date: date
    # 기존 프론트 호환: check_in / check_out 필드명 유지
    check_in: Optional[time] = None
    break_start: Optional[time] = None
    break_end: Optional[time] = None
    check_out: Optional[time] = None
    total_work_hours: Optional[float] = None
    day_hours: Optional[float] = None
    night_hours: Optional[float] = None
    break_warning: Optional[str] = None
    note: Optional[str] = None

    model_config = {"from_attributes": True}


# ── 키오스크 ─────────────────────────────────────────────
class KioskEmployeeDTO(BaseModel):
    id: int
    name: str
    position: str
    username: str
    profile_image: Optional[str] = None

    model_config = {"from_attributes": True}


class KioskEmployeesResponse(BaseModel):
    items: List[KioskEmployeeDTO]


class KioskActionInput(BaseModel):
    user_id: int


# ── 관리자 근태 조회 ─────────────────────────────────────
class MonthlyAttendanceResponse(BaseModel):
    records: List[DailySummary]
    total: int


# ── 엑셀 업로드 결과 ─────────────────────────────────────
class BulkImportResult(BaseModel):
    success_count: int
    error_count: int
    errors: List[str]


# ── 관리자 CRUD ──────────────────────────────────────────
class AdminRecordCreateRequest(BaseModel):
    user_id: int
    work_date: date
    check_in: time
    break_start: Optional[time] = None
    break_end: Optional[time] = None
    check_out: Optional[time] = None
    note: Optional[str] = None


class AdminRecordUpdateRequest(BaseModel):
    check_in: time
    break_start: Optional[time] = None
    break_end: Optional[time] = None
    check_out: Optional[time] = None
    note: Optional[str] = None
