import uuid
from datetime import datetime

from pydantic import BaseModel, HttpUrl


class ServerCreate(BaseModel):
    name: str
    description: str | None = None
    endpoint: str
    owner: str | None = None
    version: str | None = None
    tags: list[str] | None = None


class ServerUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    endpoint: str | None = None
    owner: str | None = None
    version: str | None = None
    tags: list[str] | None = None
    status: str | None = None


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
    created_at: datetime
    updated_at: datetime
