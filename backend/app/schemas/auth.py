from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    email: EmailStr
    display_name: str | None = None
    password: str
    invite_token: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str | None
    is_superadmin: bool
    is_active: bool
    created_at: datetime


class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    created_at: datetime


class WorkspaceSummary(BaseModel):
    id: UUID
    name: str
    slug: str
    role: str  # owner | admin | member


class PendingInviteResponse(BaseModel):
    token: str
    workspace_name: str
    workspace_id: UUID
    role: str
    expires_at: datetime


class MeResponse(BaseModel):
    user: UserResponse
    workspaces: list[WorkspaceSummary]
    current_workspace: WorkspaceSummary
    pending_invites: list[PendingInviteResponse] = []


class SwitchWorkspaceRequest(BaseModel):
    workspace_id: UUID


class AcceptInviteRequest(BaseModel):
    token: str
