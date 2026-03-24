"""WebSocket endpoint for real-time dashboard updates.

Clients connect to /ws/dashboard and receive JSON messages whenever:
- A health probe run completes (type: "probe_complete")
- An alert fires or resolves (type: "alert_event")

Events are published to Redis pub/sub channel "mcphub:dashboard" by the
health prober and alert evaluator agents.
"""
import asyncio
import json
import logging

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter

from app.redis_client import get_redis

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

CHANNEL = "mcphub:dashboard"


@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    await websocket.accept()
    redis = await get_redis()

    # Each connection gets its own pubsub instance to avoid cross-connection state
    pubsub = redis.pubsub()
    await pubsub.subscribe(CHANNEL)

    async def _listen():
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])

    listener = asyncio.create_task(_listen())
    try:
        # Keep alive — discard any incoming client frames
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("WebSocket closed: %s", exc)
    finally:
        listener.cancel()
        await pubsub.unsubscribe(CHANNEL)
        await pubsub.aclose()
