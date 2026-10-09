from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MessageCreate(BaseModel):
    receiver_id: int
    content: str


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender_id: int
    sender_name: str
    sender_position: str
    receiver_id: int
    receiver_name: str
    receiver_position: str
    content: str
    is_read: bool
    read_at: datetime | None
    created_at: datetime


class UserSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    position: str


class UnreadCountResponse(BaseModel):
    count: int
