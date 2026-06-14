import enum

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.config import now_kst
from app.core.database import Base


class RequestStatusEnum(str, enum.Enum):
    pending = "PENDING"
    approved = "APPROVED"
    rejected = "REJECTED"


class DayOffRequest(Base):
    """휴무 신청"""

    __tablename__ = "day_off_request"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    request_date = Column(Date, nullable=False, index=True, comment="휴무 신청 날짜")
    reason = Column(String(255), nullable=False, comment="휴무 사유")
    status = Column(
        Enum(RequestStatusEnum),
        default=RequestStatusEnum.pending,
        nullable=False,
        comment="신청 상태",
    )
    is_weekend_or_holiday = Column(
        Boolean, default=False, nullable=False, comment="주말/공휴일 여부"
    )
    processed_by = Column(
        Integer, ForeignKey("users.id"), nullable=True, comment="처리한 관리자 ID"
    )
    created_at = Column(DateTime, nullable=False, default=now_kst)
    updated_at = Column(DateTime, nullable=False, default=now_kst, onupdate=now_kst)

    reject_reason = Column(String(500), nullable=True, comment="반려 사유")

    post_id = Column(
        Integer,
        ForeignKey("community_post.id", ondelete="SET NULL"),
        nullable=True,
        comment="연결된 커뮤니티 게시글 ID",
    )

    user = relationship("User", foreign_keys=[user_id], back_populates="day_off_requests")
    processor = relationship(
        "User", foreign_keys=[processed_by], back_populates="processed_day_off_requests"
    )

    def __repr__(self):
        return (
            f"<DayOffRequest id={self.id} user_id={self.user_id} "
            f"date={self.request_date} status={self.status}>"
        )
