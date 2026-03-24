from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AdminWorkspaceSummary(BaseModel):
    id: UUID
    name: str
    slug: str
    member_count: int
    server_count: int
    created_at: datetime


class AdminUserSummary(BaseModel):
    id: UUID
    email: str
    display_name: str | None
    is_superadmin: bool
    is_active: bool
    workspace_count: int
    created_at: datetime


class AdminOverviewResponse(BaseModel):
    total_users: int
    total_workspaces: int
    total_servers: int
    total_tool_calls: int
    active_alerts: int


class AdminWorkspaceDetailResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    member_count: int
    server_count: int
    created_at: datetime


class AdminUserDetailResponse(BaseModel):
    id: UUID
    email: str
    display_name: str | None
    is_superadmin: bool
    is_active: bool
    created_at: datetime
    workspaces: list[dict]  # [{id, name, slug, role}]


class AdminUpdateWorkspaceRequest(BaseModel):
    name: str | None = None
    slug: str | None = None


class AdminUpdateUserRequest(BaseModel):
    is_active: bool | None = None
    is_superadmin: bool | None = None
    display_name: str | None = None


class ImpersonateResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    impersonated_user_id: UUID
    workspace_id: UUID
