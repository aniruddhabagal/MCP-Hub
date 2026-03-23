from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.redis_client import close_redis, get_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
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


@app.get("/health")
async def health():
    return {"status": "ok"}
