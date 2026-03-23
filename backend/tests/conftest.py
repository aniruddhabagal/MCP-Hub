"""Shared test fixtures.

Uses an in-process SQLite (aiosqlite) database — no external services required.
ARRAY and JSONB columns are not available in SQLite, so we patch those column
types to Text/JSON before create_all runs.
"""
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


def _patch_pg_types() -> None:
    """Replace PostgreSQL-only column types with SQLite-compatible equivalents."""
    for table in Base.metadata.tables.values():
        for col in table.columns:
            if isinstance(col.type, (ARRAY, JSONB)):
                col.type = JSON()


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    _patch_pg_types()
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    async def override_get_db():
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
