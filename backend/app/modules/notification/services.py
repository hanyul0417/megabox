import json
import logging
from typing import List, Optional

from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.notification.models import Notification, PushSubscription

logger = logging.getLogger(__name__)


def create_notification(
    db: Session,
    recipient_id: int,
    title: str,
    body: str,
    link: Optional[str] = None,
) -> Notification:
    """단일 알림 생성 (+ 웹 푸시 발송)"""
    noti = Notification(recipient_id=recipient_id, title=title, body=body, link=link)
    db.add(noti)
    _push_to_user(db, recipient_id, title, body, link)
    return noti


def create_bulk_notifications(
    db: Session,
    recipient_ids: List[int],
    title: str,
    body: str,
    link: Optional[str] = None,
) -> None:
    """여러 사용자에게 동일한 알림 생성 (+ 웹 푸시 발송)"""
    for rid in recipient_ids:
        db.add(Notification(recipient_id=rid, title=title, body=body, link=link))
        _push_to_user(db, rid, title, body, link)


# ─────────────────────────────────────────────
# 웹 푸시 (PWA 설치 후 폰 알림처럼 수신)
# ─────────────────────────────────────────────
def save_push_subscription(
    db: Session, user_id: int, endpoint: str, p256dh: str, auth: str
) -> None:
    """구독 등록 (동일 endpoint 존재 시 키 갱신)"""
    existing = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.user_id == user_id,
            PushSubscription.endpoint == endpoint,
        )
        .first()
    )
    if existing:
        existing.p256dh = p256dh
        existing.auth = auth
    else:
        db.add(
            PushSubscription(
                user_id=user_id, endpoint=endpoint, p256dh=p256dh, auth=auth
            )
        )
    db.commit()


def delete_push_subscription(db: Session, user_id: int, endpoint: str) -> None:
    db.query(PushSubscription).filter(
        PushSubscription.user_id == user_id,
        PushSubscription.endpoint == endpoint,
    ).delete()
    db.commit()


def _push_to_user(
    db: Session, user_id: int, title: str, body: str, link: Optional[str]
) -> None:
    """VAPID 미설정이면 조용히 스킵 (DB 알림만 생성됨)"""
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        return

    subscriptions = (
        db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
    )
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=json.dumps({"title": title, "body": body, "link": link}),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims=dict(settings.VAPID_CLAIMS),
            )
        except WebPushException as e:
            status_code = getattr(e.response, "status_code", None)
            if status_code in (404, 410):
                # 구독이 만료/취소됨 — 더 이상 유효하지 않으므로 제거
                db.query(PushSubscription).filter(
                    PushSubscription.id == sub.id
                ).delete()
                db.commit()
            else:
                logger.warning("웹 푸시 발송 실패 (user_id=%s): %s", user_id, e)


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
