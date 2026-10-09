from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.auth.models import User
from app.modules.notification import services
from app.modules.notification.schemas import (
    NotificationListResponse,
    NotificationOut,
    PushSubscriptionCreate,
    PushUnsubscribeRequest,
    UnreadCountResponse,
    VapidPublicKeyResponse,
)

router = APIRouter()


@router.get(
    "/",
    response_model=NotificationListResponse,
    summary="내 알림 목록 조회",
)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = services.get_notifications(db, current_user.id)
    unread = services.get_unread_count(db, current_user.id)
    return NotificationListResponse(
        items=[NotificationOut.model_validate(n) for n in items],
        unread_count=unread,
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="읽지 않은 알림 수",
)
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return UnreadCountResponse(unread_count=services.get_unread_count(db, current_user.id))


@router.patch(
    "/{notification_id}/read",
    summary="단일 알림 읽음 처리",
)
def read_one(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    services.mark_read(db, notification_id, current_user.id)
    return {"ok": True}


@router.patch(
    "/read-all",
    summary="전체 알림 읽음 처리",
)
def read_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    services.mark_all_read(db, current_user.id)
    return {"ok": True}


@router.get(
    "/push/public-key",
    response_model=VapidPublicKeyResponse,
    summary="웹 푸시 VAPID 공개키 조회",
)
def push_public_key():
    return VapidPublicKeyResponse(public_key=settings.VAPID_PUBLIC_KEY)


@router.post(
    "/push/subscribe",
    summary="웹 푸시 구독 등록",
)
def push_subscribe(
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    services.save_push_subscription(
        db,
        current_user.id,
        payload.endpoint,
        payload.keys.p256dh,
        payload.keys.auth,
    )
    return {"ok": True}


@router.post(
    "/push/unsubscribe",
    summary="웹 푸시 구독 해제",
)
def push_unsubscribe(
    payload: PushUnsubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    services.delete_push_subscription(db, current_user.id, payload.endpoint)
    return {"ok": True}
