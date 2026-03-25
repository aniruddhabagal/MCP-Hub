import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceInvite, WorkspaceMember
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    PendingInviteResponse,
    RefreshRequest,
    SignupRequest,
    SwitchWorkspaceRequest,
    TokenResponse,
    UserResponse,
    WorkspaceSummary,
)
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)

# Role hierarchy for invite-based upgrades (owner cannot be assigned via invite)
_ROLE_RANK = {"member": 0, "admin": 1}


def _is_superadmin_email(email: str) -> bool:
    if not settings.superadmin_emails:
        return False
    return email.lower() in [e.strip().lower() for e in settings.superadmin_emails.split(",")]


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


async def _get_user_workspaces(user_id: uuid.UUID, db: AsyncSession) -> list[WorkspaceSummary]:
    result = await db.execute(
        select(WorkspaceMember, Workspace)
        .join(Workspace, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user_id)
        .order_by(WorkspaceMember.joined_at)
    )
    rows = result.all()
    return [
        WorkspaceSummary(id=ws.id, name=ws.name, slug=ws.slug, role=member.role)
        for member, ws in rows
    ]


def _pick_workspace(
    workspaces: list[WorkspaceSummary],
    last_workspace_id: uuid.UUID | None,
) -> WorkspaceSummary:
    """Smart workspace selection order:
    1. last_workspace_id (if still a member)
    2. An org workspace (role != owner, i.e. user was invited)
    3. Owned workspace
    4. First workspace
    """
    if last_workspace_id:
        last = next((w for w in workspaces if w.id == last_workspace_id), None)
        if last:
            return last
    org = next((w for w in workspaces if w.role != "owner"), None)
    if org:
        return org
    owned = next((w for w in workspaces if w.role == "owner"), None)
    if owned:
        return owned
    return workspaces[0]


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    is_superadmin = _is_superadmin_email(body.email)
    user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        is_superadmin=is_superadmin,
    )
    db.add(user)
    await db.flush()

    # Always create personal workspace as a safety net
    base_slug = _slugify(body.display_name or body.email.split("@")[0])
    slug = base_slug
    counter = 1
    while True:
        exists = await db.execute(select(Workspace).where(Workspace.slug == slug))
        if not exists.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    workspace_name = f"{body.display_name or body.email.split('@')[0]}'s Workspace"
    personal_ws = Workspace(name=workspace_name, slug=slug)
    db.add(personal_ws)
    await db.flush()

    member = WorkspaceMember(
        workspace_id=personal_ws.id,
        user_id=user.id,
        role="owner",
    )
    db.add(member)
    await db.flush()

    # If invite_token provided, try to auto-accept
    target_ws_id = personal_ws.id
    target_role = "owner"

    if body.invite_token:
        invite_result = await db.execute(
            select(WorkspaceInvite).where(WorkspaceInvite.token == body.invite_token)
        )
        invite = invite_result.scalar_one_or_none()
        if (
            invite
            and invite.accepted_at is None
            and invite.expires_at > datetime.now(timezone.utc)
            and invite.email.lower() == user.email.lower()
        ):
            # Auto-accept: add membership to invited workspace
            invited_member = WorkspaceMember(
                workspace_id=invite.workspace_id,
                user_id=user.id,
                role=invite.role,
            )
            db.add(invited_member)
            invite.accepted_at = datetime.now(timezone.utc)
            await db.flush()

            target_ws_id = invite.workspace_id
            target_role = invite.role

    user.last_workspace_id = target_ws_id
    await db.flush()

    access_token = create_access_token(
        user_id=user.id,
        workspace_id=target_ws_id,
        role=target_role,
        is_superadmin=is_superadmin,
    )
    refresh_token = create_refresh_token(user.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Auto-promote to superadmin if in env list
    if _is_superadmin_email(body.email) and not user.is_superadmin:
        user.is_superadmin = True
        await db.flush()

    workspaces = await _get_user_workspaces(user.id, db)
    if not workspaces:
        raise HTTPException(status_code=500, detail="User has no workspaces")

    ws = _pick_workspace(workspaces, user.last_workspace_id)
    user.last_workspace_id = ws.id
    await db.flush()

    access_token = create_access_token(
        user_id=user.id,
        workspace_id=ws.id,
        role=ws.role,
        is_superadmin=user.is_superadmin,
    )
    refresh_token = create_refresh_token(user.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or disabled")

    workspaces = await _get_user_workspaces(user.id, db)
    if not workspaces:
        raise HTTPException(status_code=500, detail="User has no workspaces")

    ws = _pick_workspace(workspaces, user.last_workspace_id)
    user.last_workspace_id = ws.id
    await db.flush()

    access_token = create_access_token(
        user_id=user.id,
        workspace_id=ws.id,
        role=ws.role,
        is_superadmin=user.is_superadmin,
    )
    new_refresh = create_refresh_token(user.id)
    return TokenResponse(access_token=access_token, refresh_token=new_refresh)


@router.get("/me", response_model=MeResponse)
async def me(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if payload.get("type") == "refresh":
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    wid = payload.get("wid")
    role = payload.get("role", "member")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    workspaces = await _get_user_workspaces(user.id, db)

    # current workspace from JWT
    current = next((w for w in workspaces if str(w.id) == wid), None)
    if not current and workspaces:
        current = workspaces[0]
    if not current:
        raise HTTPException(status_code=500, detail="User has no workspaces")

    # Pending invites for this user's email
    pending_result = await db.execute(
        select(WorkspaceInvite, Workspace)
        .join(Workspace, WorkspaceInvite.workspace_id == Workspace.id)
        .where(
            WorkspaceInvite.email == user.email,
            WorkspaceInvite.accepted_at.is_(None),
            WorkspaceInvite.expires_at > datetime.now(timezone.utc),
        )
    )
    pending_invites = [
        PendingInviteResponse(
            token=inv.token,
            workspace_name=ws.name,
            workspace_id=inv.workspace_id,
            role=inv.role,
            expires_at=inv.expires_at,
        )
        for inv, ws in pending_result.all()
    ]

    return MeResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            is_superadmin=user.is_superadmin,
            is_active=user.is_active,
            created_at=user.created_at,
        ),
        workspaces=workspaces,
        current_workspace=current,
        pending_invites=pending_invites,
    )


@router.post("/switch-workspace", response_model=TokenResponse)
async def switch_workspace(
    body: SwitchWorkspaceRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    is_sa = payload.get("sa", False)

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    ws_result = await db.execute(select(Workspace).where(Workspace.id == body.workspace_id))
    workspace = ws_result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Super admins can switch into any workspace
    if is_sa or user.is_superadmin:
        role = "owner"  # effective role for super admin
    else:
        member_result = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace.id,
                WorkspaceMember.user_id == user.id,
            )
        )
        member = member_result.scalar_one_or_none()
        if not member:
            raise HTTPException(status_code=403, detail="Not a member of this workspace")
        role = member.role

    user.last_workspace_id = workspace.id
    await db.flush()

    access_token = create_access_token(
        user_id=user.id,
        workspace_id=workspace.id,
        role=role,
        is_superadmin=user.is_superadmin,
    )
    refresh_token = create_refresh_token(user.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/accept-invite/{token}", response_model=TokenResponse)
async def accept_invite(
    token: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Must be logged in to accept an invite")
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    invite_result = await db.execute(
        select(WorkspaceInvite).where(WorkspaceInvite.token == token)
    )
    invite = invite_result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.accepted_at is not None:
        raise HTTPException(status_code=400, detail="Invite already accepted")
    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite has expired")
    if invite.email.lower() != user.email.lower():
        raise HTTPException(status_code=403, detail="Invite is for a different email address")

    # Check if already a member — handle role upgrade
    existing_member_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == invite.workspace_id,
            WorkspaceMember.user_id == user.id,
        )
    )
    existing_member = existing_member_result.scalar_one_or_none()

    if existing_member:
        current_rank = _ROLE_RANK.get(existing_member.role, -1)
        invite_rank = _ROLE_RANK.get(invite.role, -1)
        if invite_rank > current_rank:
            # Upgrade role
            existing_member.role = invite.role
            invite.accepted_at = datetime.now(timezone.utc)
            await db.flush()
        else:
            raise HTTPException(
                status_code=400, detail="Already a member with equal or higher role"
            )
    else:
        member = WorkspaceMember(
            workspace_id=invite.workspace_id,
            user_id=user.id,
            role=invite.role,
        )
        db.add(member)
        invite.accepted_at = datetime.now(timezone.utc)
        await db.flush()

    user.last_workspace_id = invite.workspace_id
    await db.flush()

    access_token = create_access_token(
        user_id=user.id,
        workspace_id=invite.workspace_id,
        role=invite.role,
        is_superadmin=user.is_superadmin,
    )
    refresh_token = create_refresh_token(user.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
