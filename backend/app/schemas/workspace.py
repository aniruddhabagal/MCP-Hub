from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class WorkspaceCreateRequest(BaseModel):
    name: str
    slug: str | None = None


class WorkspaceUpdateRequest(BaseModel):
    name: str | None = None
    slug: str | None = None


class MemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    user_email: str
    user_display_name: str | None
    role: str  # owner | admin | member
    joined_at: datetime


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: str  # admin | member


class InviteResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    email: str
    role: str
    expires_at: datetime
    invited_by: UUID
    accepted_at: datetime | None
    created_at: datetime


class ChangeMemberRoleRequest(BaseModel):
    role: str  # admin | member


class ApiKeyCreateRequest(BaseModel):
    name: str
    expires_at: datetime | None = None


class ApiKeyResponse(BaseModel):
    id: UUID
    name: str
    key_prefix: str
    created_at: datetime
    last_used_at: datetime | None
    expires_at: datetime | None


class ApiKeySecretResponse(ApiKeyResponse):
    key_secret: str  # Only returned on creation


class WorkspaceDetailResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    created_at: datetime
    members: list[MemberResponse]
    pending_invites: list[InviteResponse]
    api_keys: list[ApiKeyResponse]
