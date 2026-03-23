"""Database connection and session management (async SQLAlchemy)."""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

# Session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields an async database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables (dev convenience — use Alembic in prod)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Keep local/dev schemas resilient when model fields evolve.
        if conn.dialect.name == "postgresql":
            await conn.execute(
                text(
                    """
                    ALTER TABLE complaints
                    ADD COLUMN IF NOT EXISTS complaint_code VARCHAR(40)
                    """
                )
            )
            await conn.execute(
                text(
                    """
                    ALTER TABLE complaints
                    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id)
                    """
                )
            )
            await conn.execute(
                text(
                    """
                    ALTER TABLE complaints
                    ALTER COLUMN raw_audio_url TYPE TEXT
                    """
                )
            )
            await conn.execute(
                text(
                    """
                    ALTER TABLE complaints
                    ALTER COLUMN raw_image_url TYPE TEXT
                    """
                )
            )
