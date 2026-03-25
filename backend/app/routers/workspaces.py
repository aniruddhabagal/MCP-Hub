import hashlib
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_workspace, require_role
from app.models.user import User
from app.models.workspace import ApiKey, Workspace, WorkspaceInvite, WorkspaceMember
from app.schemas.workspace import (
    ApiKeyCreateRequest,
    ApiKeyResponse,
    ApiKeySecretResponse,
    ChangeMemberRoleRequest,
    InviteMemberRequest,
    InviteResponse,
    MemberResponse,
    WorkspaceCreateRequest,
    WorkspaceUpdateRequest,
)
from app.schemas.auth import WorkspaceSummary
from app.utils.security import create_access_token, create_refresh_token

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


async def _resolve_workspace(
    workspace_id: uuid.UUID,
    ctx: Tuple,
    db: AsyncSession,
) -> Workspace:
    user, current_ws, role = ctx
    ws = await db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    # Super admins can access any workspace; others must be members
    if user.is_superadmin:
        return ws
    if ws.id != current_ws.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return ws


# ── Workspace CRUD ────────────────────────────────────────────────────────────

@router.post("", response_model=WorkspaceSummary, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    body: WorkspaceCreateRequest,
    ctx: Tuple = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    user, _, _ = ctx
    slug = body.slug or _slugify(body.name)

    exists = await db.execute(select(Workspace).where(Workspace.slug == slug))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already in use")

    workspace = Workspace(name=body.name, slug=slug)
    db.add(workspace)
    await db.flush()

    member = WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner")
    db.add(member)
    await db.flush()

    return WorkspaceSummary(id=workspace.id, name=workspace.name, slug=workspace.slug, role="owner")


@router.get("", response_model=list[WorkspaceSummary])
async def list_workspaces(
    ctx: Tuple = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    user, _, _ = ctx
    result = await db.execute(
        select(WorkspaceMember, Workspace)
        .join(Workspace, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user.id)
        .order_by(WorkspaceMember.joined_at)
    )
    return [
        WorkspaceSummary(id=ws.id, name=ws.name, slug=ws.slug, role=m.role)
        for m, ws in result.all()
    ]


@router.get("/{workspace_id}", response_model=WorkspaceSummary)
async def get_workspace(
    workspace_id: uuid.UUID,
    ctx: Tuple = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    user, current_ws, role = ctx
    ws = await _resolve_workspace(workspace_id, ctx, db)
    # If super admin, role isn't from membership
    if user.is_superadmin and ws.id != current_ws.id:
        role = "owner"
    return WorkspaceSummary(id=ws.id, name=ws.name, slug=ws.slug, role=role)


@router.patch("/{workspace_id}", response_model=WorkspaceSummary)
async def update_workspace(
    workspace_id: uuid.UUID,
    body: WorkspaceUpdateRequest,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    user, current_ws, role = ctx
    ws = await _resolve_workspace(workspace_id, ctx, db)

    if body.slug and body.slug != ws.slug:
        exists = await db.execute(select(Workspace).where(Workspace.slug == body.slug))
        if exists.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Slug already in use")

    if body.name is not None:
        ws.name = body.name
    if body.slug is not None:
        ws.slug = body.slug

    await db.flush()
    return WorkspaceSummary(id=ws.id, name=ws.name, slug=ws.slug, role=role)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: uuid.UUID,
    ctx: Tuple = Depends(require_role("owner")),
    db: AsyncSession = Depends(get_db),
):
    ws = await _resolve_workspace(workspace_id, ctx, db)
    await db.delete(ws)


# ── Members ───────────────────────────────────────────────────────────────────

@router.get("/{workspace_id}/members", response_model=list[MemberResponse])
async def list_members(
    workspace_id: uuid.UUID,
    ctx: Tuple = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    await _resolve_workspace(workspace_id, ctx, db)
    result = await db.execute(
        select(WorkspaceMember, User)
        .join(User, WorkspaceMember.user_id == User.id)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .order_by(WorkspaceMember.joined_at)
    )
    return [
        MemberResponse(
            id=m.id,
            user_id=m.user_id,
            user_email=u.email,
            user_display_name=u.display_name,
            role=m.role,
            joined_at=m.joined_at,
        )
        for m, u in result.all()
    ]


@router.post("/{workspace_id}/members/invite", response_model=InviteResponse, status_code=201)
async def invite_member(
    workspace_id: uuid.UUID,
    body: InviteMemberRequest,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    user, _, _ = ctx
    await _resolve_workspace(workspace_id, ctx, db)

    if body.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role must be admin or member")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    invite = WorkspaceInvite(
        workspace_id=workspace_id,
        email=body.email.lower(),
        role=body.role,
        token=token,
        invited_by=user.id,
        expires_at=expires_at,
    )
    db.add(invite)
    await db.flush()

    return InviteResponse(
        id=invite.id,
        workspace_id=invite.workspace_id,
        email=invite.email,
        role=invite.role,
        expires_at=invite.expires_at,
        invited_by=invite.invited_by,
        accepted_at=invite.accepted_at,
        created_at=invite.created_at,
    )


@router.patch("/{workspace_id}/members/{user_id}", response_model=MemberResponse)
async def change_member_role(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    body: ChangeMemberRoleRequest,
    ctx: Tuple = Depends(require_role("owner")),
    db: AsyncSession = Depends(get_db),
):
    await _resolve_workspace(workspace_id, ctx, db)

    if body.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role must be admin or member")

    result = await db.execute(
        select(WorkspaceMember, User)
        .join(User, WorkspaceMember.user_id == User.id)
        .where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Member not found")

    member, u = row
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot change the owner's role")

    member.role = body.role
    await db.flush()

    return MemberResponse(
        id=member.id,
        user_id=member.user_id,
        user_email=u.email,
        user_display_name=u.display_name,
        role=member.role,
        joined_at=member.joined_at,
    )


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    ctx: Tuple = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    caller, _, caller_role = ctx
    await _resolve_workspace(workspace_id, ctx, db)

    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    is_self = caller.id == user_id
    is_admin_plus = caller_role in ("admin", "owner") or caller.is_superadmin

    if not is_self and not is_admin_plus:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    if member.role == "owner" and not caller.is_superadmin:
        raise HTTPException(status_code=400, detail="Cannot remove the workspace owner")

    await db.delete(member)


# ── Invites ───────────────────────────────────────────────────────────────────

@router.get("/{workspace_id}/invites", response_model=list[InviteResponse])
async def list_invites(
    workspace_id: uuid.UUID,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    await _resolve_workspace(workspace_id, ctx, db)
    result = await db.execute(
        select(WorkspaceInvite)
        .where(
            WorkspaceInvite.workspace_id == workspace_id,
            WorkspaceInvite.accepted_at.is_(None),
        )
        .order_by(WorkspaceInvite.created_at.desc())
    )
    invites = result.scalars().all()
    return [
        InviteResponse(
            id=i.id,
            workspace_id=i.workspace_id,
            email=i.email,
            role=i.role,
            expires_at=i.expires_at,
            invited_by=i.invited_by,
            accepted_at=i.accepted_at,
            created_at=i.created_at,
        )
        for i in invites
    ]


@router.delete("/{workspace_id}/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_invite(
    workspace_id: uuid.UUID,
    invite_id: uuid.UUID,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    await _resolve_workspace(workspace_id, ctx, db)
    result = await db.execute(
        select(WorkspaceInvite).where(
            WorkspaceInvite.id == invite_id,
            WorkspaceInvite.workspace_id == workspace_id,
        )
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    await db.delete(invite)


# ── API Keys ──────────────────────────────────────────────────────────────────

@router.post(
    "/{workspace_id}/api-keys",
    response_model=ApiKeySecretResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_api_key(
    workspace_id: uuid.UUID,
    body: ApiKeyCreateRequest,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    user, _, _ = ctx
    await _resolve_workspace(workspace_id, ctx, db)

    raw_key = f"mhk_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:8]

    api_key = ApiKey(
        workspace_id=workspace_id,
        name=body.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        created_by=user.id,
        expires_at=body.expires_at,
    )
    db.add(api_key)
    await db.flush()

    return ApiKeySecretResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        created_at=api_key.created_at,
        last_used_at=api_key.last_used_at,
        expires_at=api_key.expires_at,
        key_secret=raw_key,
    )


@router.get("/{workspace_id}/api-keys", response_model=list[ApiKeyResponse])
async def list_api_keys(
    workspace_id: uuid.UUID,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    await _resolve_workspace(workspace_id, ctx, db)
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.workspace_id == workspace_id)
        .order_by(ApiKey.created_at.desc())
    )
    return [
        ApiKeyResponse(
            id=k.id,
            name=k.name,
            key_prefix=k.key_prefix,
            created_at=k.created_at,
            last_used_at=k.last_used_at,
            expires_at=k.expires_at,
        )
        for k in result.scalars().all()
    ]


@router.delete(
    "/{workspace_id}/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def revoke_api_key(
    workspace_id: uuid.UUID,
    key_id: uuid.UUID,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    await _resolve_workspace(workspace_id, ctx, db)
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.workspace_id == workspace_id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    await db.delete(key)
