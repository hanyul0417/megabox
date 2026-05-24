import asyncio
import os
from datetime import date
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import configure_mappers

from app.core.config import KST, now_kst, settings
from app.core.database import Base, SessionLocal, engine
from app.core.migrations import run_migrations
from app.core.redis import get_redis
from app.core.routers import api_router
from app.modules.auth.models import (
    AuditLog,          # noqa: F401 — create_all 이 인식하도록 임포트
    GenderEnum,
    PositionEnum,
    RefreshToken,      # noqa: F401
    StatusEnum,
    User,
)
from app.modules.admin.models import DayoffSetting, ShiftPreset, UserUniform, UniformStock  # noqa: F401 — create_all 인식
from app.modules.auth.services import hash_password
from app.modules.admin.services import purge_expired_deleted_users
from app.modules.workstatus.models import AttendanceEvent, AttendanceRoundingHistory  # noqa: F401 — create_all 인식
from app.modules.payroll.models import Payroll, PayrollBulkEmailLog, PayrollPayDate  # noqa: F401
from app.modules.notification.models import Notification  # noqa: F401 — create_all 인식
from app.modules.message.models import Message  # noqa: F401 — create_all 인식
from app.modules.schedule.models.fixed_dayoff_models import FixedDayOffRequest  # noqa: F401
from app.modules.community.models import Post, Comment, PostLike, CommentLike, CommentMention, PostAttachment  # noqa: F401 — create_all 인식

configure_mappers()

app = FastAPI(
    title=settings.APP_NAME,
    docs_url="/docs" if not settings.IS_PRODUCTION else None,
    redoc_url="/redoc" if not settings.IS_PRODUCTION else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)

    # Redis 연결 검증
    redis = get_redis()
    await redis.ping()

    # 관리자 계정 초기화 (없는 경우에만)
    db = SessionLocal()
    try:
        admin = db.query(User).filter_by(username=settings.ADMIN_USERNAME).first()
        if not admin:
            db.add(User(
                username=settings.ADMIN_USERNAME,
                password=hash_password(settings.ADMIN_PASSWORD),
                birth_date=date(1998, 2, 4),
                name=settings.ADMIN_NAME,
                position=PositionEnum.admin,
                gender=GenderEnum.male,
                email=settings.ADMIN_EMAIL,
                phone="010-0000-0000",
                is_active=True,
                status=StatusEnum.approved,
            ))
        db.commit()
    finally:
        db.close()

    # 소프트 삭제 30일 만료 자동 정리 태스크 시작
    asyncio.create_task(_daily_purge_task())


async def _daily_purge_task():
    """매일 00:05 KST에 소프트 삭제 30일 초과 직원 하드 삭제"""
    import asyncio
    from datetime import datetime, timedelta
    from app.core.config import KST
    while True:
        now = datetime.now(KST)
        # 다음 00:05 KST까지 대기
        next_run = now.replace(hour=0, minute=5, second=0, microsecond=0)
        if now >= next_run:
            next_run += timedelta(days=1)
        wait_seconds = (next_run - now).total_seconds()
        await asyncio.sleep(wait_seconds)
        db = SessionLocal()
        try:
            count = purge_expired_deleted_users(db)
            db.commit()
            if count > 0:
                print(f"[purge] 소프트 삭제 만료 직원 {count}명 하드 삭제 완료")
        except Exception as e:
            db.rollback()
            print(f"[purge] 하드 삭제 오류: {e}")
        finally:
            db.close()


app.include_router(api_router, prefix="/api")

# ── 업로드 디렉토리 생성 + Static 마운트 ─────────────────────────────────
_upload_dir = Path(settings.UPLOAD_DIR)
(_upload_dir / "profiles").mkdir(parents=True, exist_ok=True)
(_upload_dir / "community").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_upload_dir)), name="uploads")