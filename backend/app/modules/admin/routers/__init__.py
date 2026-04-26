from fastapi import APIRouter

from .admin import dayoff_setting_router, router as admin_router
from .users import router as users_router

router = APIRouter()
__all__ = ["users_router", "admin_router", "dayoff_setting_router"]
