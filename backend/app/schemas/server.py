import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, model_validator


class ServerCreate(BaseModel):
    name: str
    description: str | None = None
    endpoint: str
    owner: str | None = None
    version: str | None = None
    tags: list[str] | None = None
    auth_type: str | None = None  # "none" | "bearer" | "api_key_header" | "basic"
    auth_credentials: dict[str, Any] | None = None

    @model_validator(mode="after")
    def validate_auth(self):
        if self.auth_type and self.auth_type != "none" and not self.auth_credentials:
            raise ValueError("auth_credentials required when auth_type is set")
        return self


class ServerUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    endpoint: str | None = None
    owner: str | None = None
    version: str | None = None
    tags: list[str] | None = None
    status: str | None = None
    auth_type: str | None = None
    auth_credentials: dict[str, Any] | None = None


class ServerResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    description: str | None
    endpoint: str
    owner: str | None
    version: str | None
    tags: list[str] | None
    status: str
    auth_type: str | None = None
    has_credentials: bool = False
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def mask_credentials(cls, data: Any) -> Any:
        """Never expose raw credentials — only expose whether they exist."""
        if hasattr(data, "__dict__"):
            # ORM model
            obj = data
            return {
                "id": obj.id,
                "name": obj.name,
                "description": obj.description,
                "endpoint": obj.endpoint,
                "owner": obj.owner,
                "version": obj.version,
                "tags": obj.tags,
                "status": obj.status,
                "auth_type": obj.auth_type,
                "has_credentials": bool(obj.auth_credentials),
                "created_at": obj.created_at,
                "updated_at": obj.updated_at,
            }
        # dict
        creds = data.pop("auth_credentials", None)
        data["has_credentials"] = bool(creds)
        return data
