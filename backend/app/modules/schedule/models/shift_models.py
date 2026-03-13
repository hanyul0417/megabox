import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.core.config import now_kst
from app.core.database import Base
from app.modules.schedule.models.dayoff_models import RequestStatusEnum


class ShiftChangeTypeEnum(str, enum.Enum):
    exchange = "EXCHANGE"      # 1:1 근무 교대
    substitute = "SUBSTITUTE"  # 대타 (1:0 대체)


class ShiftRequest(Base):
    """근무교대 / 대타 신청"""

    __tablename__ = "shift_request"

    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(
        Enum(ShiftChangeTypeEnum),
        nullable=False,
        comment="EXCHANGE=근무교대, SUBSTITUTE=대타",
    )

    # 신청자
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # 신청자가 양도할 근무 슬롯
    requester_schedule_id = Column(
        Integer,
        ForeignKey("schedule.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # 상대방 직원
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # EXCHANGE일 때 상대방이 양도할 근무 슬롯 (SUBSTITUTE는 NULL)
    target_schedule_id = Column(
        Integer,
        ForeignKey("schedule.id", ondelete="SET NULL"),
        nullable=True,
    )

    status = Column(
        Enum(RequestStatusEnum),
        default=RequestStatusEnum.pending,
        nullable=False,
    )
    note = Column(Text, nullable=True, comment="신청 메모")
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, nullable=False, default=now_kst)
    updated_at = Column(DateTime, nullable=False, default=now_kst, onupdate=now_kst)

    requester = relationship(
        "User", foreign_keys=[requester_id], back_populates="shift_requests_sent"
    )
    target_user = relationship(
        "User", foreign_keys=[target_user_id], back_populates="shift_requests_received"
    )
    requester_schedule = relationship("Schedule", foreign_keys=[requester_schedule_id])
    target_schedule = relationship("Schedule", foreign_keys=[target_schedule_id])
    processor = relationship("User", foreign_keys=[processed_by])

    def __repr__(self):
        return (
            f"<ShiftRequest id={self.id} type={self.type} "
            f"requester={self.requester_id} target={self.target_user_id} "
            f"status={self.status}>"
        )
