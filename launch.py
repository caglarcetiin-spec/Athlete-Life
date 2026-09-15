"""Athlete Life OS v10 application server.
Serves the existing UI unchanged and persists canonical application state in SQLite.
"""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import threading
import time
import webbrowser
from contextlib import contextmanager
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "10000"))
APP_VERSION = "10.0.0"
ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("ATHLETE_LIFE_OS_DATA_DIR", Path.home() / ".athlete-life-os"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "athlete-life-os.sqlite3"
LOCK = threading.RLock()


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def canonical_json(data) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def checksum(data) -> str:
    return hashlib.sha256(canonical_json(data).encode("utf-8")).hexdigest()


def data_weight(data: dict) -> int:
    keys = (
        "daily", "scheduleByDate", "weekOptimizations", "trainingLogs",
        "foodLogs", "waterLogs", "painLogs", "sessionFeedback", "futurePlans",
        "capabilityRecords", "guidedWorkoutHistory",
    )
    n = 0
    for k in keys:
        v = data.get(k)
        if isinstance(v, dict): n += len(v)
        elif isinstance(v, list): n += len(v)
    return n


def connect():
    c = sqlite3.connect(DB_PATH, timeout=15, isolation_level=None, check_same_thread=False)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA synchronous=FULL")
    c.execute("PRAGMA foreign_keys=ON")
    return c


def init_db():
    with LOCK, connect() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS app_state (
          id INTEGER PRIMARY KEY CHECK(id=1),
          revision INTEGER NOT NULL,
          saved_at TEXT NOT NULL,
          reason TEXT NOT NULL,
          checksum TEXT NOT NULL,
          payload TEXT NOT NULL,
          weight INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS state_revisions (
          revision INTEGER PRIMARY KEY,
          saved_at TEXT NOT NULL,
          reason TEXT NOT NULL,
          checksum TEXT NOT NULL,
          payload TEXT NOT NULL,
          weight INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_state_revisions_saved_at ON state_revisions(saved_at DESC);
        """)


def read_state():
    with LOCK, connect() as c:
        r = c.execute("SELECT * FROM app_state WHERE id=1").fetchone()
        if not r:
            return None
        try:
            data = json.loads(r["payload"])
        except Exception:
            return None
        if checksum(data) != r["checksum"]:
            return recover_latest_verified(c)
        return {
            "revision": r["revision"], "savedAt": r["saved_at"], "reason": r["reason"],
            "checksum": r["checksum"], "weight": r["weight"], "data": data,
        }


def recover_latest_verified(c=None):
    own = c is None
    c = c or connect()
    try:
        rows = c.execute("SELECT * FROM state_revisions ORDER BY revision DESC LIMIT 100").fetchall()
        for r in rows:
            try: data = json.loads(r["payload"])
            except Exception: continue
            if checksum(data) == r["checksum"]:
                return {"revision": r["revision"], "savedAt": r["saved_at"], "reason": r["reason"], "checksum": r["checksum"], "weight": r["weight"], "data": data}
        return None
    finally:
        if own: c.close()


def commit_state(data: dict, reason: str):
    if not isinstance(data, dict):
        raise ValueError("state must be an object")
    with LOCK, connect() as c:
        c.execute("BEGIN IMMEDIATE")
        try:
            cur = c.execute("SELECT revision, payload, checksum FROM app_state WHERE id=1").fetchone()
            current_rev = int(cur["revision"]) if cur else 0
            client_rev = int((data.get("meta") or {}).get("persistenceRevision") or 0)
            next_rev = max(current_rev, client_rev) + 1
            saved_at = utcnow()
            cloned = json.loads(json.dumps(data, ensure_ascii=False))
            meta = dict(cloned.get("meta") or {})
            meta.update({"persistenceRevision": next_rev, "lastSavedAt": saved_at, "lastSaveReason": reason})
            cloned["meta"] = meta
            payload = canonical_json(cloned)
            sum_ = hashlib.sha256(payload.encode("utf-8")).hexdigest()
            weight = data_weight(cloned)
            c.execute("INSERT OR REPLACE INTO state_revisions(revision,saved_at,reason,checksum,payload,weight) VALUES(?,?,?,?,?,?)",
                      (next_rev, saved_at, reason, sum_, payload, weight))
            c.execute("INSERT OR REPLACE INTO app_state(id,revision,saved_at,reason,checksum,payload,weight) VALUES(1,?,?,?,?,?,?)",
                      (next_rev, saved_at, reason, sum_, payload, weight))
            # Retain the latest 250 durable server revisions.
            c.execute("DELETE FROM state_revisions WHERE revision NOT IN (SELECT revision FROM state_revisions ORDER BY revision DESC LIMIT 250)")
            c.execute("COMMIT")
        except Exception:
            c.execute("ROLLBACK")
            raise
    return {"revision": next_rev, "savedAt": saved_at, "checksum": sum_, "weight": weight, "data": cloned}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            return
        super().log_message(fmt, *args)

    def _json(self, status: int, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length", "0") or 0)
        raw = self.rfile.read(n) if n else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            s = read_state()
            return self._json(200, {"ok": True, "version": APP_VERSION, "database": str(DB_PATH), "revision": s["revision"] if s else 0, "savedAt": s["savedAt"] if s else None})
        if path == "/api/state":
            s = read_state()
            return self._json(200, {"ok": True, "data": s["data"] if s else None, "revision": s["revision"] if s else 0, "savedAt": s["savedAt"] if s else None, "checksum": s["checksum"] if s else None})
        if path == "/api/revisions":
            with LOCK, connect() as c:
                rows = c.execute("SELECT revision,saved_at,reason,checksum,weight FROM state_revisions ORDER BY revision DESC LIMIT 50").fetchall()
            return self._json(200, {"ok": True, "revisions": [dict(r) for r in rows]})
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path in ("/api/state", "/api/state/beacon"):
            try:
                body = self._body()
                result = commit_state(body.get("data") or {}, str(body.get("reason") or "client-save"))
                return self._json(200, {"ok": True, "revision": result["revision"], "savedAt": result["savedAt"], "checksum": result["checksum"]})
            except Exception as e:
                return self._json(400, {"ok": False, "error": str(e)})
        if path.startswith("/api/restore/"):
            try:
                rev = int(path.rsplit("/", 1)[-1])
                with LOCK, connect() as c:
                    row = c.execute("SELECT payload FROM state_revisions WHERE revision=?", (rev,)).fetchone()
                if not row: return self._json(404, {"ok": False, "error": "revision not found"})
                result = commit_state(json.loads(row["payload"]), f"restore-revision-{rev}")
                return self._json(200, {"ok": True, "revision": result["revision"], "savedAt": result["savedAt"]})
            except Exception as e:
                return self._json(400, {"ok": False, "error": str(e)})
        return self._json(404, {"ok": False, "error": "not found"})


def main():
    init_db()
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError:
        print(f"{PORT} portu kullanılıyor. Eski Athlete Life OS sunucusunu kapatıp tekrar başlat.")
        return 1
    with server:
        print(f"Athlete Life OS v{APP_VERSION} Dynamic: http://{HOST}:{PORT}")
        print(f"Kalıcı SQLite veritabanı: {DB_PATH}")
        print("Durdurmak için Ctrl+C")
        webbrowser.open(f"http://{HOST}:{PORT}/index.html?v={APP_VERSION}")
        try: server.serve_forever()
        except KeyboardInterrupt: pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
