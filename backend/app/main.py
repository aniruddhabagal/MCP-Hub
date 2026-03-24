import asyncio
from contextlib import asynccontextmanager

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.redis_client import close_redis, get_redis
from app.routers import admin, alerts, analytics, health, proxy, servers, tool_calls, websocket


def _run_migrations() -> None:
    """Run alembic upgrade head (synchronous, safe to call from a thread)."""
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run migrations in a thread executor — alembic env uses asyncio.run()
    # internally, which would conflict with the already-running event loop.
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _run_migrations)
    await get_redis()
    yield
    # Shutdown
    await close_redis()


app = FastAPI(
    title="MCPHub",
    description="MCP Server Registry, Health Monitor & Dashboard",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


API_PREFIX = "/api/v1"

app.include_router(servers.router, prefix=API_PREFIX)
app.include_router(health.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)
app.include_router(proxy.router, prefix=API_PREFIX)
app.include_router(tool_calls.router, prefix=API_PREFIX)
app.include_router(alerts.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)
app.include_router(websocket.router)  # /ws/dashboard — no API prefix


@app.get("/health")
async def health_ping():
    return {"status": "ok"}
