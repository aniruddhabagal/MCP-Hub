import uuid
from typing import Tuple

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.workspace import ApiKey, Workspace, WorkspaceMember
from app.utils.security import decode_token, hash_password

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise exc
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise exc

    if payload.get("type") == "refresh":
        raise exc

    user_id = payload.get("sub")
    if not user_id:
        raise exc

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise exc
    return user


async def get_current_workspace(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> Tuple[User, Workspace, str]:
    """
    Returns (user, workspace, role).
    Super admins bypass membership check — they can access any workspace via wid in JWT.
    """
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise exc
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise exc

    if payload.get("type") == "refresh":
        raise exc

    user_id = payload.get("sub")
    workspace_id = payload.get("wid")
    role = payload.get("role", "member")
    is_superadmin = payload.get("sa", False)

    if not user_id:
        raise exc

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise exc

    if not workspace_id or workspace_id == "*":
        if is_superadmin:
            # Super admin without specific workspace — no workspace context
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No workspace selected — use /auth/switch-workspace",
            )
        raise exc

    ws_result = await db.execute(
        select(Workspace).where(Workspace.id == uuid.UUID(workspace_id))
    )
    workspace = ws_result.scalar_one_or_none()
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    # Super admins bypass membership check
    if is_superadmin:
        return (user, workspace, role)

    member_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == user.id,
        )
    )
    member = member_result.scalar_one_or_none()
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this workspace",
        )
    return (user, workspace, member.role)


def require_role(*roles: str):
    """Factory: returns a dependency that enforces the caller has one of the given roles.
    Super admins always pass."""

    async def _check(
        ctx: Tuple[User, Workspace, str] = Depends(get_current_workspace),
    ) -> Tuple[User, Workspace, str]:
        user, workspace, role = ctx
        if user.is_superadmin:
            return ctx
        if role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {' or '.join(roles)}",
            )
        return ctx

    return _check


async def require_superadmin(
    user: User = Depends(get_current_user),
) -> User:
    if not user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )
    return user


def get_workspace_id(
    ctx: Tuple[User, Workspace, str] = Depends(get_current_workspace),
) -> uuid.UUID:
    _, workspace, _ = ctx
    return workspace.id


async def authenticate_api_key(
    x_api_key: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> Tuple[uuid.UUID, uuid.UUID] | None:
    """Returns (workspace_id, key_id) if API key is valid, else None."""
    if not x_api_key:
        return None
    import hashlib
    key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()
    result = await db.execute(select(ApiKey).where(ApiKey.key_hash == key_hash))
    api_key = result.scalar_one_or_none()
    if api_key is None:
        return None
    if api_key.expires_at:
        from datetime import datetime, timezone
        if api_key.expires_at < datetime.now(timezone.utc):
            return None
    # Update last_used_at
    from sqlalchemy import update as sa_update
    from datetime import datetime, timezone
    await db.execute(
        sa_update(ApiKey)
        .where(ApiKey.id == api_key.id)
        .values(last_used_at=datetime.now(timezone.utc))
    )
    return (api_key.workspace_id, api_key.id)


async def get_workspace_from_any_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    x_api_key: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID:
    """Tries JWT first, falls back to API key. Returns workspace_id."""
    # Try JWT
    if credentials is not None:
        try:
            payload = decode_token(credentials.credentials)
            if payload.get("type") != "refresh":
                workspace_id = payload.get("wid")
                if workspace_id and workspace_id != "*":
                    return uuid.UUID(workspace_id)
        except JWTError:
            pass

    # Try API key
    if x_api_key:
        import hashlib
        key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()
        result = await db.execute(select(ApiKey).where(ApiKey.key_hash == key_hash))
        api_key = result.scalar_one_or_none()
        if api_key is not None:
            if api_key.expires_at:
                from datetime import datetime, timezone
                if api_key.expires_at >= datetime.now(timezone.utc):
                    return api_key.workspace_id
            else:
                return api_key.workspace_id

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required (JWT or API key)",
    )
