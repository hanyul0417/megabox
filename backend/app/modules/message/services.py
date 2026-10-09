from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import now_kst
from app.modules.auth.models import PositionEnum, StatusEnum, User
from app.modules.message.models import Message
from app.modules.message.schemas import MessageResponse, UserSearchResult
from app.modules.notification.services import create_notification


def _to_response(msg: Message) -> MessageResponse:
    return MessageResponse(
        id=msg.id,
        sender_id=msg.sender_id,
        sender_name=msg.sender.name,
        sender_position=msg.sender.position.value,
        receiver_id=msg.receiver_id,
        receiver_name=msg.receiver.name,
        receiver_position=msg.receiver.position.value,
        title=msg.title,
        content=msg.content,
        is_read=msg.is_read,
        read_at=msg.read_at,
        created_at=msg.created_at,
    )


def send_message(db: Session, sender: User, data) -> MessageResponse:
    if sender.id == data.receiver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="자기 자신에게 쪽지를 보낼 수 없습니다.",
        )

    receiver = (
        db.query(User)
        .filter(User.id == data.receiver_id, User.status == StatusEnum.approved)
        .first()
    )
    if not receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수신자를 찾을 수 없습니다.",
        )

    msg = Message(
        sender_id=sender.id,
        receiver_id=data.receiver_id,
        title="",
        content=data.content,
    )
    db.add(msg)
    db.flush()

    create_notification(
        db,
        recipient_id=receiver.id,
        title="새 쪽지",
        body=f"{sender.name}님이 쪽지를 보냈습니다.",
        link="/messages",
    )
    db.commit()
    db.refresh(msg)
    return _to_response(msg)


def get_inbox(db: Session, user: User) -> list[MessageResponse]:
    messages = (
        db.query(Message)
        .filter(
            Message.receiver_id == user.id,
            Message.is_deleted_by_receiver == False,  # noqa: E712
        )
        .order_by(Message.created_at.desc())
        .all()
    )
    return [_to_response(m) for m in messages]


def get_outbox(db: Session, user: User) -> list[MessageResponse]:
    messages = (
        db.query(Message)
        .filter(
            Message.sender_id == user.id,
            Message.is_deleted_by_sender == False,  # noqa: E712
        )
        .order_by(Message.created_at.desc())
        .all()
    )
    return [_to_response(m) for m in messages]


def get_message(db: Session, message_id: int, user: User) -> MessageResponse:
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="쪽지를 찾을 수 없습니다.",
        )

    # 본인이 sender 또는 receiver인 경우만 조회 가능
    if msg.sender_id != user.id and msg.receiver_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="권한이 없습니다.",
        )

    # 삭제된 쪽지 접근 차단
    if msg.sender_id == user.id and msg.is_deleted_by_sender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제된 쪽지입니다.",
        )
    if msg.receiver_id == user.id and msg.is_deleted_by_receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제된 쪽지입니다.",
        )

    return _to_response(msg)


def mark_read(db: Session, message_id: int, user: User) -> MessageResponse:
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="쪽지를 찾을 수 없습니다.",
        )

    if msg.receiver_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="수신자만 읽음 처리할 수 있습니다.",
        )

    if not msg.is_read:
        msg.is_read = True
        msg.read_at = now_kst()
        db.commit()
        db.refresh(msg)

    return _to_response(msg)


def delete_message(db: Session, message_id: int, user: User) -> None:
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="쪽지를 찾을 수 없습니다.",
        )

    if msg.sender_id == user.id:
        msg.is_deleted_by_sender = True
    elif msg.receiver_id == user.id:
        msg.is_deleted_by_receiver = True
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="권한이 없습니다.",
        )

    db.commit()


def get_contacts(db: Session, current_user: User) -> list[UserSearchResult]:
    """재직 중인 직원 전체 목록 (시스템·미화·본인 제외)"""
    users = (
        db.query(User)
        .filter(
            User.status == StatusEnum.approved,
            User.is_active == True,  # noqa: E712
            User.position != PositionEnum.system,
            User.position != PositionEnum.cleaner,
            User.id != current_user.id,
        )
        .order_by(User.position, func.isnull(User.hire_date), User.hire_date)
        .all()
    )
    return [UserSearchResult(id=u.id, name=u.name, position=u.position.value) for u in users]


def search_users(db: Session, query: str, current_user: User) -> list[UserSearchResult]:
    users = (
        db.query(User)
        .filter(
            User.name.contains(query),
            User.status == StatusEnum.approved,
            User.position != PositionEnum.system,
            User.id != current_user.id,
        )
        .limit(10)
        .all()
    )
    return [
        UserSearchResult(id=u.id, name=u.name, position=u.position.value)
        for u in users
    ]


def get_unread_count(db: Session, user: User) -> int:
    return (
        db.query(Message)
        .filter(
            Message.receiver_id == user.id,
            Message.is_read == False,  # noqa: E712
            Message.is_deleted_by_receiver == False,  # noqa: E712
        )
        .count()
    )
