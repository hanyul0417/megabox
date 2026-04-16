from __future__ import annotations

from decimal import Decimal

from sqlalchemy import DECIMAL, Column, Date, Integer, String, UniqueConstraint

from app.core.config import TimeStampedMixin
from app.core.database import Base


# 공휴일
class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)

    date = Column(Date, nullable=False, comment="공휴일 날짜")
    label = Column(String(100), nullable=False, comment="공휴일 설명")

    __table_args__ = (UniqueConstraint("date", name="uq_holiday_date"),)


# 시프트 프리셋 (빠른 선택)
class ShiftPreset(TimeStampedMixin, Base):
    """
    스케줄 생성 시 빠른 선택용 시프트 프리셋
    - 최대 8개까지 등록 가능
    - 이름, 시작/종료 시간, 테두리 색상, 폰트 색상 관리
    """

    __tablename__ = "shift_presets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    label = Column(String(20), nullable=False, comment="프리셋 이름 (예: 오전, 미들)")
    start_time = Column(String(5), nullable=False, comment="시작 시간 HH:MM")
    end_time = Column(String(5), nullable=False, comment="종료 시간 HH:MM")
    border_color = Column(String(7), nullable=False, default="#e5e7eb", comment="테두리 색상 (hex)")
    font_color = Column(String(7), nullable=False, default="#374151", comment="폰트 색상 (hex)")
    sort_order = Column(Integer, nullable=False, default=0, comment="정렬 순서")


class InsuranceRate(TimeStampedMixin, Base):
    """
    근로자 공제 보험 요율 (연 단위)
    - 국민연금
    - 건강보험
    - 장기요양보험
    - 고용보험
    """

    __tablename__ = "insurance_rates"
    __table_args__ = (UniqueConstraint("year", name="uq_insurance_rates_year"),)

    id = Column(Integer, primary_key=True, autoincrement=True)

    year = Column(
        Integer,
        nullable=False,
        comment="보험 요율 기준 연도 (예: 2025)",
    )

    # 요율은 % 그대로 저장 (예: 9.0000 = 9%)
    national_pension_rate = Column(
        DECIMAL(8, 4),
        default=Decimal("0.00"),
    )

    health_insurance_rate = Column(
        DECIMAL(8, 4),
        default=Decimal("0.00"),
    )

    long_term_care_rate = Column(
        DECIMAL(8, 4),
        nullable=False,
        default=Decimal("0.00"),
    )

    employment_insurance_rate = Column(
        DECIMAL(8, 4),
        nullable=False,
        default=Decimal("0.00"),
    )
