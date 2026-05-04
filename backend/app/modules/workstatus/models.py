from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class EventType(str, enum.Enum):
    CLOCK_IN = "CLOCK_IN"
    BREAK_START = "BREAK_START"
    BREAK_END = "BREAK_END"
    CLOCK_OUT = "CLOCK_OUT"


class AttendanceEvent(Base):
    """
    이벤트 기반 근태 테이블
    - 각 이벤트(출근/휴식시작/휴식종료/퇴근)를 개별 레코드로 저장
    - 근무시간은 이벤트에서 계산 (저장 X)
    - user_id + work_date + event_type 조합 유니크
    """

    __tablename__ = "attendance_events"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "work_date", "event_type",
            name="uq_attendance_event",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    work_date = Column(Date, nullable=False, index=True)
    event_type = Column(SQLEnum(EventType), nullable=False)
    event_time = Column(Time, nullable=False)
    note       = Column(String(500), nullable=True, comment="비고")
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="attendance_events")


class AttendanceRoundingHistory(Base):
    """출퇴근 시간 보정 이력 — 되돌리기 지원을 위해 보정 전 값 스냅샷 저장"""

    __tablename__ = "attendance_rounding_history"

    id            = Column(Integer, primary_key=True, index=True)
    year          = Column(Integer, nullable=False)
    month         = Column(Integer, nullable=False)
    applied_by    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    applied_at    = Column(DateTime, default=datetime.now, nullable=False)
    snapshot      = Column(JSON, nullable=False, comment="보정 전 {event_id, user_id, work_date, event_type, original_time} 목록")
    adjusted_count = Column(Integer, nullable=False, default=0)
    is_reverted   = Column(Boolean, default=False, nullable=False)
    reverted_at   = Column(DateTime, nullable=True)
