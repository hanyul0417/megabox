import enum

from sqlalchemy import (
    BigInteger,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.core.config import now_kst
from app.core.database import Base


class ScheduleStatusEnum(str, enum.Enum):
    draft = "DRAFT"
    confirmed = "CONFIRMED"


class ScheduleWeek(Base):
    """주차 단위 스케줄 묶음 (DRAFT/CONFIRMED 상태 관리)"""

    __tablename__ = "schedule_week"
    __table_args__ = (
        UniqueConstraint("year", "week_number", name="uq_schedule_week_year_week"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(Integer, nullable=False, index=True)
    week_number = Column(Integer, nullable=False, index=True)
    status = Column(
        Enum(ScheduleStatusEnum),
        default=ScheduleStatusEnum.draft,
        nullable=False,
        comment="DRAFT=작성중, CONFIRMED=확정",
    )
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=now_kst)
    updated_at = Column(DateTime, nullable=False, default=now_kst, onupdate=now_kst)

    creator = relationship("User", foreign_keys=[created_by])
    schedules = relationship(
        "Schedule",
        back_populates="schedule_week",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self):
        return (
            f"<ScheduleWeek id={self.id} year={self.year} "
            f"week={self.week_number} status={self.status}>"
        )


class Schedule(Base):
    """개별 근무 슬롯"""

    __tablename__ = "schedule"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_week_id = Column(
        Integer,
        ForeignKey("schedule_week.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        comment="근무 대상 직원",
    )
    work_date = Column(Date, nullable=False, index=True, comment="근무 날짜")
    start_time = Column(Time, nullable=False, comment="근무 시작 시간")
    end_time = Column(Time, nullable=False, comment="근무 종료 시간")
    created_at = Column(DateTime, nullable=False, default=now_kst)
    updated_at = Column(DateTime, nullable=False, default=now_kst, onupdate=now_kst)

    schedule_week = relationship("ScheduleWeek", back_populates="schedules")
    user = relationship("User", foreign_keys=[user_id], back_populates="schedules")

    def __repr__(self):
        return (
            f"<Schedule id={self.id} user_id={self.user_id} "
            f"work_date={self.work_date} {self.start_time}~{self.end_time}>"
        )


class SchedulePayrollSnapshot(Base):
    """스케줄 기반 예상 급여 스냅샷"""

    __tablename__ = "schedule_payroll_snapshot"
    __table_args__ = (
        UniqueConstraint("user_id", "year", "month", name="uq_sps_user_year_month"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    year = Column(SmallInteger, nullable=False)
    month = Column(SmallInteger, nullable=False)
    scheduled_hours = Column(Numeric(6, 2), nullable=False, default=0)
    scheduled_day_hours = Column(Numeric(6, 2), default=0)
    scheduled_night_hours = Column(Numeric(6, 2), default=0)
    wage_snapshot = Column(Integer, nullable=False)
    scheduled_gross = Column(Integer, nullable=False, default=0)
    calculated_at = Column(DateTime, default=func.now())

    user = relationship("User", foreign_keys=[user_id])
