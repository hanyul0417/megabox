from datetime import datetime
from typing import List

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    title: str
    body: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: List[NotificationOut]
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int
