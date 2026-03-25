"""Tool call API — direct ingestion and paginated audit log."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_workspace_from_any_auth, get_workspace_id
from app.models.server import MCPServer
from app.models.tool_call import ToolCall
from app.schemas.tool_call import ToolCallCreate, ToolCallResponse

router = APIRouter(prefix="/tool-calls", tags=["tool-calls"])


@router.get("", response_model=list[ToolCallResponse])
async def list_tool_calls(
    server_id: uuid.UUID | None = Query(None),
    tool_name: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    workspace_id: uuid.UUID = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ToolCall)
        .where(ToolCall.workspace_id == workspace_id)
        .order_by(ToolCall.called_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if server_id is not None:
        stmt = stmt.where(ToolCall.server_id == server_id)
    if tool_name is not None:
        stmt = stmt.where(ToolCall.tool_name == tool_name)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ToolCallResponse, status_code=status.HTTP_201_CREATED)
async def ingest_tool_call(
    payload: ToolCallCreate,
    workspace_id: uuid.UUID = Depends(get_workspace_from_any_auth),
    db: AsyncSession = Depends(get_db),
):
    server = await db.get(MCPServer, payload.server_id)
    if server is None or server.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")

    tc = ToolCall(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        server_id=payload.server_id,
        tool_name=payload.tool_name,
        caller_agent=payload.caller_agent,
        input_payload=payload.input_payload,
        output_size_bytes=payload.output_size_bytes,
        duration_ms=payload.duration_ms,
        status=payload.status,
        error=payload.error,
        called_at=datetime.now(timezone.utc),
    )
    db.add(tc)
    await db.flush()
    return tc
