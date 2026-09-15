"""Local SQLite implementation of the state repository contract."""
import hashlib
import json
import sqlite3
import threading
from pathlib import Path
from state_common import utcnow, canonical_json, checksum, data_weight

LOCK = threading.RLock()
DB_PATH = None

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
            return recover_latest_verified(c)
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


def list_revisions():
    with LOCK, connect() as c:
        return [dict(r) for r in c.execute("SELECT revision,saved_at,reason,checksum,weight FROM state_revisions ORDER BY revision DESC LIMIT 50")]


def revision_data(revision):
    with LOCK, connect() as c:
        row = c.execute("SELECT payload,checksum FROM state_revisions WHERE revision=?", (revision,)).fetchone()
    if row is None:
        return None
    data = json.loads(row["payload"])
    if checksum(data) != row["checksum"]:
        raise ValueError("revision checksum mismatch")
    return data
