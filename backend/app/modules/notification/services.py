from typing import List

from sqlalchemy.orm import Session

from app.modules.notification.models import Notification


def create_notification(
    db: Session,
    recipient_id: int,
    title: str,
    body: str,
) -> Notification:
    """단일 알림 생성"""
    noti = Notification(recipient_id=recipient_id, title=title, body=body)
    db.add(noti)
    return noti


def create_bulk_notifications(
    db: Session,
    recipient_ids: List[int],
    title: str,
    body: str,
) -> None:
    """여러 사용자에게 동일한 알림 생성"""
    for rid in recipient_ids:
        db.add(Notification(recipient_id=rid, title=title, body=body))


def get_notifications(
    db: Session,
    user_id: int,
    limit: int = 50,
) -> List[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.recipient_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )


def get_unread_count(db: Session, user_id: int) -> int:
    return (
        db.query(Notification)
        .filter(Notification.recipient_id == user_id, Notification.is_read == False)  # noqa: E712
        .count()
    )


def mark_read(db: Session, notification_id: int, user_id: int) -> bool:
    noti = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.recipient_id == user_id)
        .first()
    )
    if not noti:
        return False
    noti.is_read = True
    db.commit()
    return True


def mark_all_read(db: Session, user_id: int) -> None:
    (
        db.query(Notification)
        .filter(Notification.recipient_id == user_id, Notification.is_read == False)  # noqa: E712
        .update({"is_read": True})
    )
    db.commit()
