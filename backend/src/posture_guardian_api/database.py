"""Async SQLAlchemy engine and request-scoped database sessions."""

import asyncio
from collections.abc import AsyncIterator

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from posture_guardian_api.config import get_settings


class Base(DeclarativeBase):
    """Base class for all database models."""


settings = get_settings()
engine = create_async_engine(settings.normalized_database_url, pool_pre_ping=True)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)
BASELINE_REVISION = "20260716_01"


def _migration_config() -> Config:
    """Create an Alembic config without relying on the process working directory."""
    config = Config(str(settings.migration_root / "alembic.ini"))
    config.set_main_option("script_location", str(settings.migration_root / "migrations"))
    config.set_main_option(
        "sqlalchemy.url",
        settings.normalized_database_url.replace("%", "%%"),
    )
    return config


async def migrate_database() -> None:
    """Upgrade schema, preserving databases created by the pre-migration MVP."""
    async with engine.connect() as connection:
        table_names = await connection.run_sync(lambda sync: inspect(sync).get_table_names())
    config = _migration_config()
    legacy_tables = {"posture_sessions", "posture_samples", "session_feedback"}
    if "alembic_version" not in table_names and legacy_tables.issubset(table_names):
        await asyncio.to_thread(command.stamp, config, BASELINE_REVISION)
    await asyncio.to_thread(command.upgrade, config, "head")


async def get_db() -> AsyncIterator[AsyncSession]:
    """Yield one transaction-capable session per API request."""
    async with SessionFactory() as session:
        yield session
