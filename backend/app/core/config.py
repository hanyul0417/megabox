import os
import time
from datetime import datetime, timedelta, timezone
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings
from sqlalchemy import Column, DateTime

os.environ["TZ"] = "Asia/Seoul"

try:
    time.tzset()
except AttributeError:
    pass

KST = timezone(timedelta(hours=9))


def now_kst() -> datetime:
    return datetime.now(KST)


class TimeStampedMixin:
    created_at = Column(
        DateTime, nullable=False, default=now_kst, comment="생성 시각(KST)"
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=now_kst,
        onupdate=now_kst,
        comment="수정 시각(KST)",
    )


class CreatedAtMixin:
    created_at = Column(
        DateTime, nullable=False, default=now_kst, comment="생성 시각(KST)"
    )


class Settings(BaseSettings):
    MODE: str = os.getenv("MODE", "dev")
    APP_NAME: str = "Megabox"
    TIMEZONE: str = "Asia/Seoul"

    # Database
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str

    # JWT (legacy keys — 하위 호환용)
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    JWT_EXPIRE_MINUTES: int = 720   # 실제 사용은 ACCESS_TOKEN_EXPIRE_MINUTES
    JWT_EXPIRE_DAYS: int = 7        # 실제 사용은 REFRESH_TOKEN_EXPIRE_DAYS

    # 토큰 수명 (canonical)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Admin
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str
    ADMIN_NAME: str
    ADMIN_EMAIL: str

    # Holiday API
    HOLIDAY_API_KEY: str

    # SSN encryption
    SSN_SECRET_KEY: str

    # CORS
    CORS_ORIGINS: List[str] = []

    # Redis
    REDIS_URL: str = "redis://megabox-redis:6379/0"

    # 파일 업로드
    UPLOAD_DIR: str = "D:/megabox_uploads"

    # 로그인 보호
    MAX_LOGIN_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def IS_PRODUCTION(self) -> bool:
        return self.MODE == "prod"

    class Config:
        env_file = f"envs/.env.{os.getenv('MODE', 'dev')}"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("["):
                import json
                return json.loads(v)
            return [i.strip() for i in v.split(",") if i.strip()]
        return v


settings = Settings()
