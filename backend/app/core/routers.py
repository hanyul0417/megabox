from fastapi import APIRouter

from app.modules.admin.routers import admin_router, dayoff_setting_router, users_router
from app.modules.admin.routers.admin import checklist_router, holiday_router, kiosk_notice_router, shift_preset_router
from app.modules.admin.routers.dashboard import router as dashboard_router
from app.modules.wage.routers import admin_router as wage_admin_router

api_router = APIRouter()

routers = [
    ("/auth", "로그인관리", "app.modules.auth.routers"),
    ("/schedule", "스케줄관리", "app.modules.schedule.routers.schedule_router"),
    ("/payroll", "급여관리", "app.modules.payroll.router.routers"),
    ("/workstatus", "근태관리", "app.modules.workstatus.routers"),
    ("/community", "커뮤니티관리", "app.modules.community.routers"),
    ("/admin", "관리자", "app.modules.admin.routers"),
    ("/wage", "최저시급관리", "app.modules.wage.routers"),
    ("/notifications", "알림", "app.modules.notification.router"),
    ("/message", "쪽지", "app.modules.message.routers"),
]

for prefix, tag, module_path in routers:
    module = __import__(module_path, fromlist=["router"])
    api_router.include_router(module.router, prefix=prefix, tags=[tag])


# 관리자 - 유저관리
api_router.include_router(
    users_router,
    prefix="/admin",
    tags=["유저관리"],
)

api_router.include_router(
    admin_router,
    prefix="/admin",
    tags=["4대보험요율관리"],
)

# 관리자 - 최저시급 (기존 유지)
api_router.include_router(
    wage_admin_router,
    prefix="/admin/default-wage",
    tags=["최저시급관리"],
)

api_router.include_router(
    holiday_router,
    prefix="/admin",
    tags=["공휴일관리"],
)

api_router.include_router(
    dashboard_router,
    prefix="/admin",
    tags=["관리자대시보드"],
)

api_router.include_router(
    shift_preset_router,
    prefix="/admin",
    tags=["시프트프리셋관리"],
)

api_router.include_router(
    dayoff_setting_router,
    prefix="/admin",
    tags=["휴무한도설정"],
)

api_router.include_router(
    kiosk_notice_router,
    prefix="/admin",
    tags=["키오스크공지사항"],
)

api_router.include_router(
    checklist_router,
    prefix="/admin",
    tags=["체크리스트"],
)
