"""Exercise the production entry point and fail-closed startup using synthetic data."""

import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path
from uuid import uuid4

root = Path(__file__).resolve().parents[2]
name = "alos_test_smoke_" + uuid4().hex
server = None
base_env = {k: v for k, v in os.environ.items() if not k.startswith("ALOS_V2_")}
base_env.update(PYTHONPATH=str(root / "apps/api"), PYTHON_DOTENV_DISABLED="1")
try:
    missing = subprocess.run(
        [sys.executable, "-m", "alos.cli", "serve"],
        env=base_env,
        capture_output=True,
        timeout=15,
        check=False,
    )
    assert missing.returncode != 0 and b"database_url" in missing.stderr
    subprocess.run(
        [sys.executable, "tools/v2/test_database.py", "create", name],
        cwd=root,
        check=True,
    )
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    env = {
        **base_env,
        "ALOS_V2_ENABLED": "1",
        "ALOS_V2_DATABASE_URL": "postgresql://localhost:15432/" + name,
        "ALOS_V2_ENVIRONMENT": "test",
        "ALOS_V2_PUBLIC_ORIGIN": f"http://127.0.0.1:{port}",
        "PORT": str(port),
    }
    subprocess.run(
        [sys.executable, "-m", "alos.cli", "migrate"], cwd=root, env=env, check=True
    )
    subprocess.run(
        [sys.executable, "-m", "alos.cli", "schema-check"],
        cwd=root,
        env=env,
        check=True,
    )
    with tempfile.TemporaryFile() as log:
        server = subprocess.Popen(
            [sys.executable, "-m", "alos.cli", "serve"],
            cwd=root,
            env=env,
            stdout=log,
            stderr=log,
        )
        base = f"http://127.0.0.1:{port}"
        for attempt in range(100):
            try:
                with urllib.request.urlopen(base + "/health/ready", timeout=1) as r:
                    if r.status == 200:
                        break
            except OSError:
                if server.poll() is not None:
                    raise AssertionError("Server exited before readiness")
                time.sleep(0.1)
        else:
            raise AssertionError("Readiness timeout")
        with urllib.request.urlopen(base + "/") as r:
            assert r.status == 200 and b'<div id="root">' in r.read()
        try:
            urllib.request.urlopen(base + "/.env")
            raise AssertionError("Private file visible")
        except urllib.error.HTTPError as exc:
            assert exc.code == 404
        server.terminate()
        server.wait(timeout=15)
        log.seek(0)
        output = log.read().decode()
        assert f"0.0.0.0:{port}" in output
        assert "Application shutdown complete" in output
    print(
        json.dumps(
            {
                "result": "PASS",
                "checks": [
                    "missing DB fails closed",
                    "explicit migrate and schema-check",
                    "0.0.0.0:PORT readiness",
                    "built frontend served",
                    "private path denied",
                    "SIGTERM graceful shutdown",
                ],
                "container": "NOT RUN: no Docker runtime installed",
            },
            indent=2,
        )
    )
finally:
    if server and server.poll() is None:
        server.kill()
        server.wait()
    subprocess.run(
        [sys.executable, "tools/v2/test_database.py", "drop", name],
        cwd=root,
        check=True,
    )
