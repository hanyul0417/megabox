from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.auth.models import User
from app.modules.notification import services
from app.modules.notification.schemas import (
    NotificationListResponse,
    NotificationOut,
    UnreadCountResponse,
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
