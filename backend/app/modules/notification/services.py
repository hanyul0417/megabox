import json
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional

from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.modules.notification.models import Notification, PushSubscription

logger = logging.getLogger(__name__)

PUSH_TIMEOUT_SECONDS = 10
_push_executor = ThreadPoolExecutor(max_workers=8, thread_name_prefix="webpush")


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
    if not subscriptions:
        return

    unread_count = get_unread_count(db, user_id)
    payload = json.dumps(
        {"title": title, "body": body, "link": link, "unreadCount": unread_count}
    )

    # 발송은 구독 1건당 수백 ms가 걸리므로 API 응답을 막지 않도록 백그라운드에서 처리한다.
    for sub in subscriptions:
        _push_executor.submit(
            _send_push,
            subscription_id=sub.id,
            user_id=user_id,
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            payload=payload,
        )


def _send_push(
    subscription_id: int, user_id: int, subscription_info: dict, payload: str
) -> None:
    """워커 스레드에서 실행된다. 요청의 DB 세션을 공유하지 않는다."""
    try:
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims=dict(settings.VAPID_CLAIMS),
            timeout=PUSH_TIMEOUT_SECONDS,
        )
    except WebPushException as e:
        status_code = getattr(e.response, "status_code", None)
        if status_code in (404, 410):
            # 구독이 만료/취소됨 — 더 이상 유효하지 않으므로 제거
            _delete_subscription(subscription_id)
        else:
            logger.warning("웹 푸시 발송 실패 (user_id=%s): %s", user_id, e)
    except Exception:
        # executor는 예외를 삼키므로 여기서 남기지 않으면 실패를 알 수 없다
        logger.exception("웹 푸시 발송 오류 (user_id=%s)", user_id)


def _delete_subscription(subscription_id: int) -> None:
    db = SessionLocal()
    try:
        db.query(PushSubscription).filter(
            PushSubscription.id == subscription_id
        ).delete()
        db.commit()
    except Exception:
        logger.exception("만료된 푸시 구독 삭제 실패 (id=%s)", subscription_id)
    finally:
        db.close()


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
