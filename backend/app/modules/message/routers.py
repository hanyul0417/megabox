from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.message import services
from app.modules.message.schemas import (
    MessageCreate,
    MessageResponse,
    UnreadCountResponse,
    UserSearchResult,
)
from app.utils.permission_utils import is_system

router = APIRouter()


def _get_message_user(user=Depends(get_current_user)):
    """시스템 계정 차단"""
    if is_system(user):
        raise HTTPException(403, "출근용 계정은 쪽지 기능을 사용할 수 없습니다.")
    return user


@router.get(
    "/inbox",
    response_model=list[MessageResponse],
    summary="받은 쪽지 목록",
)
def get_inbox(
    db: Session = Depends(get_db),
    user=Depends(_get_message_user),
):
    return services.get_inbox(db, user)


@router.get(
    "/outbox",
    response_model=list[MessageResponse],
    summary="보낸 쪽지 목록",
)
def get_outbox(
    db: Session = Depends(get_db),
    user=Depends(_get_message_user),
):
    return services.get_outbox(db, user)


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="미읽음 쪽지 수",
)
def get_unread_count(
    db: Session = Depends(get_db),
    user=Depends(_get_message_user),
):
    count = services.get_unread_count(db, user)
    return UnreadCountResponse(count=count)


@router.get(
    "/users/search",
    response_model=list[UserSearchResult],
    summary="수신자 검색",
)
def search_users(
    q: str = Query(..., min_length=1, description="검색어 (이름)"),
    db: Session = Depends(get_db),
    user=Depends(_get_message_user),
):
    return services.search_users(db, q, user)


@router.get(
    "/{message_id}",
    response_model=MessageResponse,
    summary="쪽지 상세 조회 (수신자인 경우 자동 읽음 처리)",
)
def get_message(
    message_id: int,
    db: Session = Depends(get_db),
    user=Depends(_get_message_user),
):
    msg = services.get_message(db, message_id, user)
    # 수신자가 조회하면 자동 읽음 처리
    if msg.receiver_id == user.id and not msg.is_read:
        msg = services.mark_read(db, message_id, user)
    return msg


@router.post(
    "/",
    response_model=MessageResponse,
    summary="쪽지 보내기",
    status_code=201,
)
def send_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    user=Depends(_get_message_user),
):
    return services.send_message(db, user, data)


@router.delete(
    "/{message_id}",
    status_code=204,
    summary="쪽지 삭제",
)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    user=Depends(_get_message_user),
):
    services.delete_message(db, message_id, user)
