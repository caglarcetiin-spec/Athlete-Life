"""Exercise the unchanged Render entry command with isolated synthetic settings."""
import importlib.util
import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("render_entry", ROOT / "start_render.py")
entry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(entry)


def test_entry_reuses_existing_mongo_configuration():
    settings = entry.v2_environment({
        "MONGODB_URI": "mongodb://127.0.0.1:27028/?replicaSet=alos-test",
        "MONGODB_DATABASE": "alos_test_entry",
        "STORAGE_BACKEND": "mongodb", "ACCOUNT_STORAGE_BACKEND": "mongodb",
        "RENDER_EXTERNAL_URL": "https://example.invalid",
    })
    assert settings["ALOS_V2_MONGO_DATABASE"] == "alos_test_entry"
    assert settings["ALOS_V2_REGISTRATION_ENABLED"] == "0"
    assert settings["ALOS_V2_DATABASE_URL"].startswith("mongodb://127.0.0.1:27028/")


def test_maintenance_cannot_accept_writes_or_open_accounts():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    process = subprocess.Popen(
        [sys.executable, "start_render.py"], cwd=ROOT,
        env={**os.environ, "PYTHON_DOTENV_DISABLED": "1", "STORAGE_BACKEND": "mongodb",
             "ACCOUNT_STORAGE_BACKEND": "mongodb", "MONGODB_URI": "mongodb://127.0.0.1:1",
             "RENDER_EXTERNAL_URL": "https://example.invalid", "PORT": str(port),
             "ALOS_EDITION": "maintenance"}, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
    )
    try:
        for _ in range(100):
            try:
                with urlopen(f"http://127.0.0.1:{port}/health/ready", timeout=1) as response:
                    assert response.status == 200
                break
            except OSError:
                time.sleep(0.05)
        else:
            raise AssertionError("Maintenance entry did not start")
        for method in ("GET", "POST", "PUT", "PATCH", "DELETE"):
            try:
                urlopen(Request(f"http://127.0.0.1:{port}/api/state", method=method), timeout=1)
            except HTTPError as error:
                assert error.code == 503 and b'maintenance' in error.read()
            else:
                raise AssertionError("Maintenance accepted an account request")
    finally:
        process.terminate()
        process.wait(timeout=5)
        process.stderr.close()


def test_v2_entry_serves_packaged_ui_and_keeps_private_paths_closed(app):
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    process = subprocess.Popen(
        [sys.executable, "start_render.py"], cwd=ROOT,
        env={**os.environ, "PYTHON_DOTENV_DISABLED": "1", "STORAGE_BACKEND": "mongodb",
             "ACCOUNT_STORAGE_BACKEND": "mongodb",
             "MONGODB_URI": "mongodb://127.0.0.1:27028/?replicaSet=alos-test",
             "MONGODB_DATABASE": app.state.database.raw.name,
             "RENDER_EXTERNAL_URL": "https://example.invalid", "PORT": str(port),
             "ALOS_EDITION": "v2"}, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
    )
    try:
        for _ in range(100):
            try:
                with urlopen(f"http://127.0.0.1:{port}/health/ready", timeout=1) as response:
                    assert response.status == 200
                break
            except OSError:
                time.sleep(0.05)
        else:
            raise AssertionError("V2 Render entry did not start")
        with urlopen(f"http://127.0.0.1:{port}/", timeout=2) as response:
            assert b'id="root"' in response.read()
        with urlopen(f"http://127.0.0.1:{port}/sw.js", timeout=2) as response:
            assert b'alos-shell' in response.read()
        for path in (".env", "../.env", "build-manifest.json"):
            try:
                urlopen(f"http://127.0.0.1:{port}/{path}", timeout=2)
            except HTTPError as error:
                assert error.code == 404
            else:
                raise AssertionError("Private path was served")
    finally:
        process.terminate()
        process.wait(timeout=10)
        process.stderr.close()
