from datetime import date

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import configure_mappers

from app.core.config import KST, now_kst, settings
from app.core.database import Base, SessionLocal, engine
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
from app.modules.auth.services import hash_password
from app.modules.workstatus.models import AttendanceEvent  # noqa: F401 — create_all 인식
from app.modules.payroll.models import Payroll, PayrollPayDate  # noqa: F401

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


app.include_router(api_router, prefix="/api")