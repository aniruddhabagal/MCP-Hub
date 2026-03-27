"""Pydantic schemas for the Tool Playground endpoints."""
import uuid
from typing import Any

from pydantic import BaseModel


class ToolDefinition(BaseModel):
    """A single tool as returned by the MCP tools/list method."""
    name: str
    description: str | None = None
    inputSchema: dict[str, Any] | None = None  # JSON Schema


class ToolListResponse(BaseModel):
    tools: list[ToolDefinition]
    server_id: uuid.UUID
    cached: bool = False


class ToolInvokeRequest(BaseModel):
    tool_name: str
    arguments: dict[str, Any] = {}


class ToolInvokeResponse(BaseModel):
    tool_name: str
    status: str          # "success" | "error"
    result: Any | None = None
    error: str | None = None
    duration_ms: float
    tool_call_id: uuid.UUID
    truncated: bool = False
