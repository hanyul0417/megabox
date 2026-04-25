from decimal import Decimal

from sqlalchemy import DECIMAL, Column, Date, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class Payroll(Base):
    __tablename__ = "payroll"
    __table_args__ = (
        UniqueConstraint("user_id", "year", "month", name="uq_user_year_month"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # 기본설정
    year = Column(Integer, nullable=False)   # 연도
    month = Column(Integer, nullable=False)  # 월
    wage = Column(Integer, nullable=False)   # 시급 (생성 시 스냅샷)

    # 마지막 근무일
    last_work_day = Column(Date, nullable=True)

    # ── 근무시간 ────────────────────────────────────────
    day_hours = Column(
        DECIMAL(6, 2), default=Decimal("0.00"), nullable=False
    )  # 주간 근무시간 (06:00~22:00)

    night_hours = Column(
        DECIMAL(6, 2), default=Decimal("0.00"), nullable=False
    )  # 야간 근무시간 (22:00~06:00)

    weekly_allowance_hours = Column(
        DECIMAL(6, 2), default=Decimal("0.00"), nullable=False
    )  # 주휴시간

    weekly_allowance_pay = Column(
        Integer, nullable=True, default=None
    )  # 주휴수당 직접 입력값 (NULL이면 wage × weekly_allowance_hours 자동계산)

    annual_leave_hours = Column(
        DECIMAL(5, 2), default=Decimal("0.00"), nullable=False
    )  # 연차시간 (User.annual_leave_hours 스냅샷)

    annual_leave_count = Column(
        Integer, default=1, nullable=False
    )  # 미사용 연차 개수 (기본 1, 퇴사 정산 시 실제 잔여 일수 입력)

    annual_leave_pay = Column(
        Integer, nullable=True, default=None
    )  # 연차수당 직접 입력값 (NULL이면 wage × annual_leave_hours 자동계산)

    holiday_hours = Column(
        DECIMAL(6, 2), default=Decimal("0.00"), nullable=False
    )  # 공휴일 근무시간 (근로자의날 포함)

    # ── 공제 (관리자가 직접 수정 가능, 0이면 요율 자동 계산) ──────
    insurance_health = Column(Integer, default=0, nullable=False)       # 건강보험
    insurance_care = Column(Integer, default=0, nullable=False)         # 요양보험
    insurance_employment = Column(Integer, default=0, nullable=False)   # 고용보험
    insurance_pension = Column(Integer, default=0, nullable=False)      # 국민연금

    user = relationship("User", back_populates="payrolls")


class PayrollBulkEmailLog(Base):
    """급여명세서 일괄발송 이력"""
    __tablename__ = "payroll_bulk_email_log"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    sent_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=False)
    success_count = Column(Integer, nullable=False, default=0)
    fail_count = Column(Integer, nullable=False, default=0)
    skip_count = Column(Integer, nullable=False, default=0)

    sent_by = relationship("User")


class PayrollPayDate(Base):
    """
    연/월 기준 급여 지급일 관리 테이블
    """

    __tablename__ = "payroll_pay_date"
    __table_args__ = (
        UniqueConstraint(
            "year",
            "month",
            name="uq_payroll_pay_date_year_month",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    pay_date = Column(Date, nullable=False)
