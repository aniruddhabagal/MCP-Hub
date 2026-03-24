import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.health_prober import _probe_one
from app.database import get_db
from app.models.server import MCPServer
from app.schemas.server import ServerCreate, ServerResponse, ServerUpdate

router = APIRouter(prefix="/servers", tags=["servers"])


@router.get("", response_model=list[ServerResponse])
async def list_servers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MCPServer).order_by(MCPServer.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=ServerResponse, status_code=status.HTTP_201_CREATED)
async def create_server(body: ServerCreate, db: AsyncSession = Depends(get_db)):
    server = MCPServer(**body.model_dump())
    db.add(server)
    await db.flush()
    await db.refresh(server)
    return server


@router.get("/{server_id}", response_model=ServerResponse)
async def get_server(server_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    server = await db.get(MCPServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


@router.patch("/{server_id}", response_model=ServerResponse)
async def update_server(
    server_id: uuid.UUID, body: ServerUpdate, db: AsyncSession = Depends(get_db)
):
    server = await db.get(MCPServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(server, field, value)
    await db.flush()
    await db.refresh(server)
    return server


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_server(server_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    server = await db.get(MCPServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    await db.delete(server)


@router.post("/{server_id}/probe")
async def probe_server(server_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    server = await db.get(MCPServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    result = await _probe_one(server, db)
    await db.flush()
    return result
