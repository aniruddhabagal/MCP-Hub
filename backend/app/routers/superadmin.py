import uuid
from typing import Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_superadmin
from app.models.alert import AlertEvent
from app.models.analytics import AnalyticsSnapshot
from app.models.server import MCPServer
from app.models.tool_call import ToolCall
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.superadmin import (
    AdminOverviewResponse,
    AdminUpdateUserRequest,
    AdminUpdateWorkspaceRequest,
    AdminUserDetailResponse,
    AdminUserSummary,
    AdminWorkspaceDetailResponse,
    AdminWorkspaceSummary,
    ImpersonateResponse,
)
from app.utils.security import create_access_token, create_refresh_token

router = APIRouter(prefix="/admin", tags=["superadmin"])


# ── Overview ──────────────────────────────────────────────────────────────────

@router.get("/overview", response_model=AdminOverviewResponse)
async def platform_overview(
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    total_workspaces = (await db.execute(select(func.count(Workspace.id)))).scalar_one()
    total_servers = (await db.execute(select(func.count(MCPServer.id)))).scalar_one()
    total_tool_calls = (await db.execute(select(func.count(ToolCall.id)))).scalar_one()
    active_alerts = (
        await db.execute(
            select(func.count(AlertEvent.id)).where(AlertEvent.resolved_at.is_(None))
        )
    ).scalar_one()

    return AdminOverviewResponse(
        total_users=total_users,
        total_workspaces=total_workspaces,
        total_servers=total_servers,
        total_tool_calls=total_tool_calls,
        active_alerts=active_alerts,
    )


# ── Workspaces ────────────────────────────────────────────────────────────────

@router.get("/workspaces", response_model=list[AdminWorkspaceSummary])
async def list_all_workspaces(
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Workspace).order_by(Workspace.created_at.desc()))
    workspaces = result.scalars().all()

    output = []
    for ws in workspaces:
        member_count = (
            await db.execute(
                select(func.count(WorkspaceMember.id)).where(
                    WorkspaceMember.workspace_id == ws.id
                )
            )
        ).scalar_one()
        server_count = (
            await db.execute(
                select(func.count(MCPServer.id)).where(MCPServer.workspace_id == ws.id)
            )
        ).scalar_one()
        output.append(
            AdminWorkspaceSummary(
                id=ws.id,
                name=ws.name,
                slug=ws.slug,
                member_count=member_count,
                server_count=server_count,
                created_at=ws.created_at,
            )
        )
    return output


@router.get("/workspaces/{workspace_id}", response_model=AdminWorkspaceDetailResponse)
async def get_workspace_detail(
    workspace_id: uuid.UUID,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    ws = await db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    member_count = (
        await db.execute(
            select(func.count(WorkspaceMember.id)).where(
                WorkspaceMember.workspace_id == ws.id
            )
        )
    ).scalar_one()
    server_count = (
        await db.execute(
            select(func.count(MCPServer.id)).where(MCPServer.workspace_id == ws.id)
        )
    ).scalar_one()

    return AdminWorkspaceDetailResponse(
        id=ws.id,
        name=ws.name,
        slug=ws.slug,
        member_count=member_count,
        server_count=server_count,
        created_at=ws.created_at,
    )


@router.patch("/workspaces/{workspace_id}", response_model=AdminWorkspaceSummary)
async def update_workspace(
    workspace_id: uuid.UUID,
    body: AdminUpdateWorkspaceRequest,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    ws = await db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if body.slug and body.slug != ws.slug:
        exists = await db.execute(select(Workspace).where(Workspace.slug == body.slug))
        if exists.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Slug already in use")

    if body.name is not None:
        ws.name = body.name
    if body.slug is not None:
        ws.slug = body.slug
    await db.flush()

    member_count = (
        await db.execute(
            select(func.count(WorkspaceMember.id)).where(
                WorkspaceMember.workspace_id == ws.id
            )
        )
    ).scalar_one()
    server_count = (
        await db.execute(
            select(func.count(MCPServer.id)).where(MCPServer.workspace_id == ws.id)
        )
    ).scalar_one()

    return AdminWorkspaceSummary(
        id=ws.id,
        name=ws.name,
        slug=ws.slug,
        member_count=member_count,
        server_count=server_count,
        created_at=ws.created_at,
    )


@router.delete("/workspaces/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: uuid.UUID,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    ws = await db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    await db.delete(ws)


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[AdminUserSummary])
async def list_all_users(
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()

    output = []
    for u in users:
        ws_count = (
            await db.execute(
                select(func.count(WorkspaceMember.id)).where(
                    WorkspaceMember.user_id == u.id
                )
            )
        ).scalar_one()
        output.append(
            AdminUserSummary(
                id=u.id,
                email=u.email,
                display_name=u.display_name,
                is_superadmin=u.is_superadmin,
                is_active=u.is_active,
                workspace_count=ws_count,
                created_at=u.created_at,
            )
        )
    return output


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
async def get_user_detail(
    user_id: uuid.UUID,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    u = await db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(
        select(WorkspaceMember, Workspace)
        .join(Workspace, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == u.id)
    )
    workspaces = [
        {"id": str(ws.id), "name": ws.name, "slug": ws.slug, "role": m.role}
        for m, ws in result.all()
    ]

    return AdminUserDetailResponse(
        id=u.id,
        email=u.email,
        display_name=u.display_name,
        is_superadmin=u.is_superadmin,
        is_active=u.is_active,
        created_at=u.created_at,
        workspaces=workspaces,
    )


@router.patch("/users/{user_id}", response_model=AdminUserDetailResponse)
async def update_user(
    user_id: uuid.UUID,
    body: AdminUpdateUserRequest,
    caller: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    u = await db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if body.is_active is not None:
        u.is_active = body.is_active
    if body.is_superadmin is not None:
        u.is_superadmin = body.is_superadmin
    if body.display_name is not None:
        u.display_name = body.display_name
    await db.flush()

    result = await db.execute(
        select(WorkspaceMember, Workspace)
        .join(Workspace, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == u.id)
    )
    workspaces = [
        {"id": str(ws.id), "name": ws.name, "slug": ws.slug, "role": m.role}
        for m, ws in result.all()
    ]

    return AdminUserDetailResponse(
        id=u.id,
        email=u.email,
        display_name=u.display_name,
        is_superadmin=u.is_superadmin,
        is_active=u.is_active,
        created_at=u.created_at,
        workspaces=workspaces,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    caller: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    if caller.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    u = await db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(u)


# ── Cross-workspace data ──────────────────────────────────────────────────────

@router.get("/servers")
async def list_all_servers(
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MCPServer, Workspace)
        .join(Workspace, MCPServer.workspace_id == Workspace.id)
        .order_by(MCPServer.created_at.desc())
        .limit(200)
    )
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "endpoint": s.endpoint,
            "status": s.status,
            "workspace_id": str(s.workspace_id),
            "workspace_name": ws.name,
            "created_at": s.created_at,
        }
        for s, ws in result.all()
    ]


@router.get("/tool-calls")
async def list_all_tool_calls(
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ToolCall)
        .order_by(ToolCall.called_at.desc())
        .limit(200)
    )
    calls = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "tool_name": c.tool_name,
            "status": c.status,
            "duration_ms": c.duration_ms,
            "workspace_id": str(c.workspace_id),
            "server_id": str(c.server_id),
            "called_at": c.called_at,
        }
        for c in calls
    ]


@router.get("/alerts/events")
async def list_all_alert_events(
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AlertEvent)
        .order_by(AlertEvent.fired_at.desc())
        .limit(200)
    )
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "state": e.state,
            "message": e.message,
            "value": e.value,
            "workspace_id": str(e.workspace_id),
            "rule_id": str(e.rule_id),
            "fired_at": e.fired_at,
            "resolved_at": e.resolved_at,
        }
        for e in events
    ]


@router.get("/analytics/global")
async def global_analytics(
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    total_calls = (await db.execute(select(func.count(ToolCall.id)))).scalar_one()
    total_errors = (
        await db.execute(
            select(func.count(ToolCall.id)).where(ToolCall.status == "error")
        )
    ).scalar_one()
    avg_latency = (
        await db.execute(select(func.avg(ToolCall.duration_ms)))
    ).scalar_one()

    # Top tools globally
    from sqlalchemy import desc
    top_tools_result = await db.execute(
        select(ToolCall.tool_name, func.count(ToolCall.id).label("call_count"))
        .group_by(ToolCall.tool_name)
        .order_by(desc("call_count"))
        .limit(10)
    )
    top_tools = [
        {"tool_name": row.tool_name, "call_count": row.call_count}
        for row in top_tools_result.all()
    ]

    return {
        "total_calls": total_calls,
        "total_errors": total_errors,
        "error_rate": round(total_errors / total_calls, 4) if total_calls else 0,
        "avg_latency_ms": round(avg_latency, 2) if avg_latency else None,
        "top_tools": top_tools,
    }


# ── Impersonation ─────────────────────────────────────────────────────────────

@router.post("/impersonate/{user_id}", response_model=ImpersonateResponse)
async def impersonate_user(
    user_id: uuid.UUID,
    caller: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    u = await db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    # Get the user's first workspace
    result = await db.execute(
        select(WorkspaceMember, Workspace)
        .join(Workspace, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == u.id)
        .order_by(WorkspaceMember.joined_at)
        .limit(1)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=400, detail="User has no workspaces")

    member, workspace = row
    access_token = create_access_token(
        user_id=u.id,
        workspace_id=workspace.id,
        role=member.role,
        is_superadmin=u.is_superadmin,
    )

    return ImpersonateResponse(
        access_token=access_token,
        impersonated_user_id=u.id,
        workspace_id=workspace.id,
    )
