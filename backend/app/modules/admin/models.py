from __future__ import annotations

from decimal import Decimal

from sqlalchemy import DECIMAL, Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.config import TimeStampedMixin, now_kst
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


class UserUniform(Base):
    """직원별 유니폼 지급 현황 (크루·리더 대상, 유저당 1행)"""

    __tablename__ = "user_uniform"

    id      = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)

    hat                 = Column(String(20), nullable=True, comment="모자 (헌팅캡/페도라)")
    belt                = Column(String(10), nullable=True, comment="벨트 (남/여)")
    top_style           = Column(String(20), nullable=True, comment="긴팔 스타일 (체크/데님)")
    top_size            = Column(String(20), nullable=True, comment="긴팔 사이즈")
    short_sleeve_style  = Column(String(20), nullable=True, comment="반팔 스타일 (체크/데님)")
    short_sleeve_size   = Column(String(20), nullable=True, comment="반팔 사이즈")
    bottom_style        = Column(String(10), nullable=True, comment="하의 종류 (남/여)")
    bottom_size         = Column(String(20), nullable=True, comment="하의 사이즈")
    necktie             = Column(String(10), nullable=True, comment="넥타이 (남/여)")
    updated_at          = Column(DateTime, nullable=True)

    user = relationship("User", backref="uniform")


class UniformStock(Base):
    """유니폼 항목별 보유 재고"""

    __tablename__ = "uniform_stock"

    id       = Column(Integer, primary_key=True, autoincrement=True)
    item_key = Column(String(50), nullable=False, unique=True, comment="예: hat_헌팅캡")
    quantity = Column(Integer,    nullable=False, default=0,   comment="보유 재고 수량")


class DayoffSetting(Base):
    """주말/공휴일 휴무 신청 전역 설정 — 항상 id=1 단일 행"""

    __tablename__ = "dayoff_setting"

    id = Column(Integer, primary_key=True, autoincrement=True)
    monthly_limit = Column(
        Integer, nullable=False, default=2, comment="주말/공휴일 월 신청 한도 (0=무제한)"
    )
    default_annual_leave_hours = Column(
        Numeric(4, 2), nullable=False, default=5.50, comment="신규 가입자 기본 소정근로시간"
    )
    annual_leave_pay_method = Column(
        String(30),
        nullable=False,
        default="scheduled",
        comment="연차수당 계산 방식: scheduled=소정근로시간, daily_avg=일평균, daily_avg_min_scheduled=일평균+소정최소",
    )


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


class KioskNotice(Base):
    """키오스크 한 줄 공지사항 (최대 5개, 게시 기간 설정)"""

    __tablename__ = "kiosk_notices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    content = Column(String(200), nullable=False, comment="공지 내용 (한 줄)")
    start_date = Column(Date, nullable=False, comment="게시 시작일")
    end_date = Column(Date, nullable=False, comment="게시 종료일")
    is_active = Column(Boolean, nullable=False, default=True, comment="수동 활성 여부")
    sort_order = Column(Integer, nullable=False, default=0, comment="표시 순서")
    created_at = Column(DateTime, nullable=False, default=now_kst, comment="생성 시각")
