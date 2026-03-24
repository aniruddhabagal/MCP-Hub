import uuid
from typing import Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.health_prober import _probe_one
from app.database import get_db
from app.dependencies.auth import get_workspace_id, require_role
from app.models.server import MCPServer
from app.schemas.server import ServerCreate, ServerResponse, ServerUpdate

router = APIRouter(prefix="/servers", tags=["servers"])


async def _get_server_in_workspace(
    server_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> MCPServer:
    server = await db.get(MCPServer, server_id)
    if not server or server.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


@router.get("", response_model=list[ServerResponse])
async def list_servers(
    workspace_id: uuid.UUID = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MCPServer)
        .where(MCPServer.workspace_id == workspace_id)
        .order_by(MCPServer.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ServerResponse, status_code=status.HTTP_201_CREATED)
async def create_server(
    body: ServerCreate,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    _, workspace, _ = ctx
    server = MCPServer(workspace_id=workspace.id, **body.model_dump())
    db.add(server)
    await db.flush()
    await db.refresh(server)
    return server


@router.get("/{server_id}", response_model=ServerResponse)
async def get_server(
    server_id: uuid.UUID,
    workspace_id: uuid.UUID = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    return await _get_server_in_workspace(server_id, workspace_id, db)


@router.patch("/{server_id}", response_model=ServerResponse)
async def update_server(
    server_id: uuid.UUID,
    body: ServerUpdate,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    _, workspace, _ = ctx
    server = await _get_server_in_workspace(server_id, workspace.id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(server, field, value)
    await db.flush()
    await db.refresh(server)
    return server


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_server(
    server_id: uuid.UUID,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    _, workspace, _ = ctx
    server = await _get_server_in_workspace(server_id, workspace.id, db)
    await db.delete(server)


@router.post("/{server_id}/probe")
async def probe_server(
    server_id: uuid.UUID,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    _, workspace, _ = ctx
    server = await _get_server_in_workspace(server_id, workspace.id, db)
    result = await _probe_one(server, db)
    await db.flush()
    return result
