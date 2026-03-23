import pytest

pytestmark = pytest.mark.asyncio


async def test_list_servers_empty(client):
    resp = await client.get("/api/v1/servers")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_create_server(client):
    payload = {
        "name": "My MCP Server",
        "endpoint": "http://localhost:9000/mcp",
        "owner": "team-a",
        "version": "1.0.0",
        "tags": ["search", "internal"],
    }
    resp = await client.post("/api/v1/servers", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My MCP Server"
    assert data["status"] == "unknown"
    assert data["id"]
    return data["id"]


async def test_get_server(client):
    create_resp = await client.post(
        "/api/v1/servers",
        json={"name": "Test", "endpoint": "http://example.com/mcp"},
    )
    server_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/servers/{server_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == server_id


async def test_get_server_not_found(client):
    import uuid
    resp = await client.get(f"/api/v1/servers/{uuid.uuid4()}")
    assert resp.status_code == 404


async def test_update_server(client):
    create_resp = await client.post(
        "/api/v1/servers",
        json={"name": "Original", "endpoint": "http://example.com/mcp"},
    )
    server_id = create_resp.json()["id"]

    resp = await client.patch(f"/api/v1/servers/{server_id}", json={"name": "Updated"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated"


async def test_delete_server(client):
    create_resp = await client.post(
        "/api/v1/servers",
        json={"name": "ToDelete", "endpoint": "http://example.com/mcp"},
    )
    server_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/v1/servers/{server_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/servers/{server_id}")
    assert resp.status_code == 404


async def test_list_servers_returns_created(client):
    for i in range(3):
        await client.post(
            "/api/v1/servers",
            json={"name": f"Server {i}", "endpoint": f"http://s{i}.example.com/mcp"},
        )
    resp = await client.get("/api/v1/servers")
    assert resp.status_code == 200
    assert len(resp.json()) == 3
