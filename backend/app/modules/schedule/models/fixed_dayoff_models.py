import enum

from sqlalchemy import JSON, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.config import now_kst
from app.core.database import Base


class FixedDayOffStatusEnum(str, enum.Enum):
    pending = "PENDING"
    approved = "APPROVED"
    rejected = "REJECTED"


class FixedDayOffRequest(Base):
    """고정휴무 신청 — 직원이 특정 요일을 고정 휴무로 신청"""

    __tablename__ = "fixed_dayoff_request"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    requested_days = Column(
        JSON, nullable=False, comment="신청 요일 배열 [0=일~6=토]"
    )
    reason = Column(String(255), nullable=True, comment="신청 사유")
    status = Column(
        Enum(FixedDayOffStatusEnum),
        default=FixedDayOffStatusEnum.pending,
        nullable=False,
    )
    processed_by = Column(
        Integer, ForeignKey("users.id"), nullable=True, comment="처리한 관리자 ID"
    )
    reject_reason = Column(String(255), nullable=True, comment="반려 사유")
    created_at = Column(DateTime, nullable=False, default=now_kst)
    updated_at = Column(DateTime, nullable=False, default=now_kst, onupdate=now_kst)

    user = relationship("User", foreign_keys=[user_id])
    processor = relationship("User", foreign_keys=[processed_by])
