"""Application configuration — loads environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "Jansewa AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"

    # ── Database ─────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/jansewa"
    DATABASE_SYNC_URL: str = "postgresql://postgres:postgres@localhost:5432/jansewa"

    # ── Redis ────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT / Auth ───────────────────────────────────────
    JWT_SECRET: str = "super-secret-jwt-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── AI / ML API keys ────────────────────────────────
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_VISION_ENABLED: bool = True

    # ── External services ───────────────────────────────
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    TWITTER_BEARER_TOKEN: Optional[str] = None
    MSG91_AUTH_KEY: Optional[str] = None
    MSG91_SMS_FLOW_ID: Optional[str] = None
    MSG91_SMS_SENDER: Optional[str] = None
    MSG91_WHATSAPP_FLOW_ID: Optional[str] = None
    MSG91_WHATSAPP_NUMBER: Optional[str] = None
    MSG91_WHATSAPP_ENDPOINT: str = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/"

    # Backward-compatible deprecated keys (ignored by MSG91 implementation).
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_SMS_FROM: Optional[str] = None
    TWILIO_WHATSAPP_FROM: Optional[str] = None

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None

    # ── Cloudinary ──────────────────────────────────────
    CLOUDINARY_URL: Optional[str] = None

    # ── CORS ────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://jansewa-ai.vercel.app",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
