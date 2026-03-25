"""WebSocket endpoint for real-time dashboard updates — workspace-scoped.

Clients connect to /ws/dashboard?token=<jwt> and receive JSON messages for
their workspace whenever:
- A health probe run completes (type: "probe_complete")
- An alert fires or resolves (type: "alert_event")

Events are published to Redis pub/sub channel "mcphub:dashboard:{workspace_id}"
by the health prober and alert evaluator agents.

Unauthenticated connections are rejected with WebSocket close code 4001.
"""
import asyncio
import logging

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter
from jose import JWTError

from app.redis_client import get_redis
from app.utils.security import decode_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=4001)
        return

    try:
        payload = decode_token(token)
        if payload.get("type") == "refresh":
            await websocket.close(code=4001)
            return
        wid = payload.get("wid")
        if not wid or wid == "*":
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return

    channel = f"mcphub:dashboard:{wid}"
    await websocket.accept()
    redis = await get_redis()

    pubsub = redis.pubsub()
    await pubsub.subscribe(channel)

    async def _listen():
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])

    listener = asyncio.create_task(_listen())
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("WebSocket closed: %s", exc)
    finally:
        listener.cancel()
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()
