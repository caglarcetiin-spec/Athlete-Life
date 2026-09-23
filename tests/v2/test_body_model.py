import json
import struct

from conftest import login


def synthetic_glb():
    document = {
        "asset": {"version": "2.0"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "synthetic_triangle"}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}],
        "buffers": [{"byteLength": 36}],
        "bufferViews": [{"buffer": 0, "byteLength": 36}],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,
                "count": 3,
                "type": "VEC3",
                "min": [-1, 0, 0],
                "max": [1, 1, 0],
            }
        ],
    }
    raw = json.dumps(document).encode()
    raw += b" " * ((-len(raw)) % 4)
    geometry = struct.pack("<9f", -1, 0, 0, 1, 0, 0, 0, 1, 0)
    return (
        struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(raw) + 8 + len(geometry))
        + struct.pack("<II", len(raw), 0x4E4F534A)
        + raw
        + struct.pack("<II", len(geometry), 0x004E4942)
        + geometry
    )


def test_library_model_is_explicit_owner_scoped_and_failure_isolated(
    app, client, tmp_path
):
    assert client.get("/api/v2/body-model").json()["status"] == "unconfigured"
    assert client.get("/api/v2/body-model/content").status_code == 404
    path = tmp_path / "synthetic.glb"
    path.write_bytes(synthetic_glb())
    app.state.settings.body_model_path = path
    app.state.settings.body_model_owner_id = app.state.athletes[0]
    assert client.get("/api/v2/body-model").json()["available"] is True
    response = client.get("/api/v2/body-model/content")
    assert (
        response.content == synthetic_glb()
        and "no-store" in response.headers["cache-control"]
    )
    other = login(app, "arda", "test-password-456")
    assert other.get("/api/v2/body-model").json()["available"] is False
    assert other.get("/api/v2/body-model/content").status_code == 404
    path.write_bytes(b"broken")
    assert client.get("/api/v2/body-model").status_code == 503
    assert client.get("/api/v2/bootstrap").status_code == 200


def test_uploaded_model_is_private_deduplicated_exported_and_restorable(app, client):
    import base64

    from conftest import cmd
    from test_core import write

    raw = synthetic_glb()
    operation = cmd(
        "media.save",
        name="Synthetic model.glb",
        mime="model/gltf-binary",
        content=base64.b64encode(raw).decode(),
    )
    saved = write(client, operation)
    assert write(client, operation) == saved
    model_id = saved["entity"]["id"]
    assert client.get("/api/v2/body-model").json()["status"] == "uploaded"
    response = client.get("/api/v2/body-model/content")
    assert response.content == raw and "no-store" in response.headers["cache-control"]
    other = login(app, "arda", "test-password-456")
    assert other.get("/api/v2/body-model/content").status_code == 404
    assert other.get("/api/v2/media/" + model_id).status_code == 404
    profile = write(client, cmd("profile.save", experience="new"))["entity"]
    assert (
        client.post(
            "/api/v2/commands",
            json=cmd(
                "profile.save", profile["id"], profile["version"], avatar_id=model_id
            ),
        ).status_code
        == 422
    )
    package = client.get("/api/v2/backups/export").json()
    staged = other.post("/api/v2/imports/stage", json=package).json()
    write(other, cmd("import.apply", staged["id"], staged["version"]))
    assert other.get("/api/v2/body-model/content").content == raw
    assert len(other.get("/api/v2/bootstrap").json()["medias"]) == 1
    malformed = bytearray(raw)
    malformed[0] = 0
    assert (
        client.post(
            "/api/v2/commands",
            json=cmd(
                "media.save",
                name="bad.glb",
                mime="model/gltf-binary",
                content=base64.b64encode(malformed).decode(),
            ),
        ).status_code
        == 422
    )
    assert client.get("/api/v2/body-model/content").content == raw
