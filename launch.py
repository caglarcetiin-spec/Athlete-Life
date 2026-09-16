"""Athlete Life OS v10 application server.
Serves the UI with a configurable SQLite or MongoDB state repository.
"""
from __future__ import annotations

import json
import os
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from state_repository import create_store, load_environment

load_environment()

HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "10000"))
APP_VERSION = "10.1.0"
ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("ATHLETE_LIFE_OS_DATA_DIR", Path.home() / ".athlete-life-os"))
DB_PATH = DATA_DIR / "athlete-life-os.sqlite3"

STORE = None


def init_db():
    global STORE
    STORE = create_store(DB_PATH)
    STORE.init_db()


def read_state():
    return STORE.read_state()


def commit_state(data, reason):
    if not isinstance(data, dict) or not isinstance(data.get("meta", {}), dict):
        raise ValueError("state and meta must be objects")
    return STORE.commit_state(data, reason)


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
        if self.command != "HEAD":
            self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length", "0") or 0)
        raw = self.rfile.read(n) if n else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def do_GET(self):
        try:
            return self._get()
        except Exception:
            return self._json(503, {"ok": False, "error": "database unavailable"})

    def _get(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            s = read_state()
            return self._json(200, {"ok": True, "version": APP_VERSION, "database": STORE.backend, "revision": s["revision"] if s else 0, "savedAt": s["savedAt"] if s else None})
        if path == "/api/state":
            s = read_state()
            return self._json(200, {"ok": True, "data": s["data"] if s else None, "revision": s["revision"] if s else 0, "savedAt": s["savedAt"] if s else None, "checksum": s["checksum"] if s else None})
        if path == "/api/revisions":
            rows = STORE.list_revisions()
            return self._json(200, {"ok": True, "revisions": [dict(r) for r in rows]})
        # Never serve credentials, database files or server source as static assets.
        target = Path(self.translate_path(self.path)).resolve()
        if (not target.is_relative_to(ROOT) or any(part.startswith(".") for part in target.relative_to(ROOT).parts)
                or (target != ROOT and target.suffix.lower() not in {".html", ".js", ".css", ".json", ".png", ".jpg", ".svg", ".ico", ".glb", ".woff", ".woff2"})):
            return self._json(404, {"ok": False, "error": "not found"})
        return super().do_GET()

    def do_HEAD(self):
        return self.do_GET()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def do_POST(self):
        path = urlparse(self.path).path
        if path in ("/api/state", "/api/state/beacon"):
            try:
                body = self._body()
                result = commit_state(body["data"], str(body.get("reason") or "client-save"))
                return self._json(200, {"ok": True, "revision": result["revision"], "savedAt": result["savedAt"], "checksum": result["checksum"]})
            except (ValueError, KeyError, TypeError):
                return self._json(400, {"ok": False, "error": "invalid state or revision"})
            except Exception:
                return self._json(503, {"ok": False, "error": "database unavailable"})
        if path.startswith("/api/restore/"):
            try:
                rev = int(path.rsplit("/", 1)[-1])
                data = STORE.revision_data(rev)
                if data is None: return self._json(404, {"ok": False, "error": "revision not found"})
                result = commit_state(data, f"restore-revision-{rev}")
                return self._json(200, {"ok": True, "revision": result["revision"], "savedAt": result["savedAt"]})
            except (ValueError, KeyError, TypeError):
                return self._json(400, {"ok": False, "error": "invalid state or revision"})
            except Exception:
                return self._json(503, {"ok": False, "error": "database unavailable"})
        return self._json(404, {"ok": False, "error": "not found"})


def main():
    try:
        init_db()
    except Exception:
        print("Veritabanı başlatılamadı. STORAGE_BACKEND, MONGODB_URI ve bağımlılıkları kontrol edin.")
        return 1
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError:
        print(f"{PORT} portu kullanılıyor. Eski Athlete Life OS sunucusunu kapatıp tekrar başlat.")
        return 1
    with server:
        print(f"Athlete Life OS v{APP_VERSION} Dynamic: http://{HOST}:{PORT}")
        print(f"Kalıcı veritabanı: {STORE.backend}")
        print("Durdurmak için Ctrl+C")
        webbrowser.open(f"http://{HOST}:{PORT}/index.html?v={APP_VERSION}")
        try: server.serve_forever()
        except KeyboardInterrupt: pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
