"""Tests for the MCP transparent proxy and tool-calls ingestion API."""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

pytestmark = pytest.mark.asyncio

MCP_TOOLS_CALL_BODY = {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {"name": "search", "arguments": {"query": "hello"}},
    "id": 1,
}

MCP_INITIALIZE_BODY = {
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {},
    "id": 1,
}


async def _create_server(client, name="Proxy Test Server", endpoint="http://upstream.internal/mcp"):
    resp = await client.post("/api/v1/servers", json={"name": name, "endpoint": endpoint})
    assert resp.status_code == 201
    return resp.json()


# ── Proxy endpoint ────────────────────────────────────────────────────────────

async def test_proxy_404_unknown_server(client):
    resp = await client.post(f"/api/v1/proxy/{uuid.uuid4()}/mcp", json=MCP_INITIALIZE_BODY)
    assert resp.status_code == 404


async def test_proxy_forwards_and_logs_tool_call(client):
    server = await _create_server(client)
    server_id = server["id"]

    upstream_response = MagicMock()
    upstream_response.status_code = 200
    upstream_response.content = b'{"jsonrpc":"2.0","result":{},"id":1}'
    upstream_response.headers = {"content-type": "application/json"}

    with patch("app.routers.proxy.httpx.AsyncClient") as mock_client_cls:
        mock_aclient = AsyncMock()
        mock_client_cls.return_value.__aenter__.return_value = mock_aclient
        mock_aclient.post.return_value = upstream_response

        resp = await client.post(
            f"/api/v1/proxy/{server_id}/mcp",
            json=MCP_TOOLS_CALL_BODY,
        )

    assert resp.status_code == 200

    tc_resp = await client.get(f"/api/v1/tool-calls?server_id={server_id}")
    assert tc_resp.status_code == 200
    calls = tc_resp.json()
    assert len(calls) == 1
    assert calls[0]["tool_name"] == "search"
    assert calls[0]["status"] == "success"


async def test_proxy_logs_error_on_upstream_5xx(client):
    server = await _create_server(client)
    server_id = server["id"]

    upstream_response = MagicMock()
    upstream_response.status_code = 503
    upstream_response.content = b'{"error":"Service Unavailable"}'
    upstream_response.headers = {"content-type": "application/json"}

    with patch("app.routers.proxy.httpx.AsyncClient") as mock_client_cls:
        mock_aclient = AsyncMock()
        mock_client_cls.return_value.__aenter__.return_value = mock_aclient
        mock_aclient.post.return_value = upstream_response

        resp = await client.post(
            f"/api/v1/proxy/{server_id}/mcp",
            json=MCP_TOOLS_CALL_BODY,
        )

    assert resp.status_code == 503

    tc_resp = await client.get(f"/api/v1/tool-calls?server_id={server_id}")
    calls = tc_resp.json()
    assert calls[0]["status"] == "error"


async def test_proxy_non_tool_call_not_logged(client):
    server = await _create_server(client)
    server_id = server["id"]

    upstream_response = MagicMock()
    upstream_response.status_code = 200
    upstream_response.content = b'{"jsonrpc":"2.0","result":{},"id":1}'
    upstream_response.headers = {"content-type": "application/json"}

    with patch("app.routers.proxy.httpx.AsyncClient") as mock_client_cls:
        mock_aclient = AsyncMock()
        mock_client_cls.return_value.__aenter__.return_value = mock_aclient
        mock_aclient.post.return_value = upstream_response

        await client.post(
            f"/api/v1/proxy/{server_id}/mcp",
            json=MCP_INITIALIZE_BODY,
        )

    tc_resp = await client.get(f"/api/v1/tool-calls?server_id={server_id}")
    assert tc_resp.json() == []


async def test_proxy_timeout_returns_504(client):
    server = await _create_server(client)
    server_id = server["id"]

    with patch("app.routers.proxy.httpx.AsyncClient") as mock_client_cls:
        mock_aclient = AsyncMock()
        mock_client_cls.return_value.__aenter__.return_value = mock_aclient
        mock_aclient.post.side_effect = httpx.TimeoutException("timeout")

        resp = await client.post(
            f"/api/v1/proxy/{server_id}/mcp",
            json=MCP_TOOLS_CALL_BODY,
        )

    assert resp.status_code == 504


# ── Tool-calls ingestion API ──────────────────────────────────────────────────

async def test_ingest_tool_call(client):
    server = await _create_server(client)
    server_id = server["id"]

    payload = {
        "server_id": server_id,
        "tool_name": "my_tool",
        "caller_agent": "agent-1",
        "duration_ms": 123.4,
        "status": "success",
    }
    resp = await client.post("/api/v1/tool-calls", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["tool_name"] == "my_tool"
    assert data["server_id"] == server_id
    assert data["caller_agent"] == "agent-1"


async def test_ingest_tool_call_unknown_server(client):
    payload = {
        "server_id": str(uuid.uuid4()),
        "tool_name": "my_tool",
        "status": "success",
    }
    resp = await client.post("/api/v1/tool-calls", json=payload)
    assert resp.status_code == 404


async def test_list_tool_calls_empty(client):
    resp = await client.get("/api/v1/tool-calls")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_tool_calls_filter_by_server(client):
    server_a = await _create_server(client, name="A")
    server_b = await _create_server(client, name="B")

    await client.post("/api/v1/tool-calls", json={"server_id": server_a["id"], "tool_name": "tool_a", "status": "success"})
    await client.post("/api/v1/tool-calls", json={"server_id": server_b["id"], "tool_name": "tool_b", "status": "success"})

    resp = await client.get(f"/api/v1/tool-calls?server_id={server_a['id']}")
    calls = resp.json()
    assert len(calls) == 1
    assert calls[0]["tool_name"] == "tool_a"
