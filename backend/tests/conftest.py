"""Shared test fixtures.

Uses an in-process SQLite (aiosqlite) database — no external services required.
ARRAY and JSONB columns are not available in SQLite, so we patch those column
types to Text/JSON before create_all runs.

Auth dependencies are overridden so that all endpoints behave as if a workspace
owner is authenticated.  Tests that exercise auth failures explicitly can clear
or replace the overrides as needed.
"""
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.dependencies.auth import (
    get_current_workspace,
    get_workspace_from_any_auth,
    get_workspace_id,
)
from app.main import app
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.utils.security import hash_password

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

# Stable UUIDs used across all tests
TEST_WORKSPACE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


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
        # Seed a default test user and workspace so FK constraints are satisfied
        # when tests create MCPServer, AlertRule, HealthCheck, etc. directly.
        user = User(
            id=TEST_USER_ID,
            email="test@example.com",
            password_hash=hash_password("password"),
            display_name="Test User",
        )
        workspace = Workspace(
            id=TEST_WORKSPACE_ID,
            name="Test Workspace",
            slug="test",
        )
        session.add(user)
        session.add(workspace)
        await session.flush()
        member = WorkspaceMember(
            workspace_id=TEST_WORKSPACE_ID,
            user_id=TEST_USER_ID,
            role="owner",
        )
        session.add(member)
        await session.flush()
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    test_user = User(
        id=TEST_USER_ID,
        email="test@example.com",
        password_hash="",
        display_name="Test User",
        is_active=True,
        is_superadmin=False,
    )
    test_workspace = Workspace(
        id=TEST_WORKSPACE_ID,
        name="Test Workspace",
        slug="test",
    )

    async def override_get_db():
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    def override_workspace():
        return (test_user, test_workspace, "owner")

    def override_workspace_id():
        return TEST_WORKSPACE_ID

    def override_any_auth():
        return TEST_WORKSPACE_ID

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_workspace] = override_workspace
    app.dependency_overrides[get_workspace_id] = override_workspace_id
    app.dependency_overrides[get_workspace_from_any_auth] = override_any_auth

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
