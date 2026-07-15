"""Async SQLAlchemy engine and request-scoped database sessions."""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from posture_guardian_api.config import get_settings


class Base(DeclarativeBase):
    """Base class for all database models."""


settings = get_settings()
engine = create_async_engine(settings.normalized_database_url, pool_pre_ping=True)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)


async def create_tables() -> None:
    """Create prototype tables when the service starts."""
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncIterator[AsyncSession]:
    """Yield one transaction-capable session per API request."""
    async with SessionFactory() as session:
        yield session
