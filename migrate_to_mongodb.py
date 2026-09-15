"""Explicit, non-destructive import of the latest verified SQLite snapshot."""
import argparse
import os
from pathlib import Path
import sqlite_store
from state_repository import create_store, load_environment


def migrate(source, target):
    if not source.is_file():
        raise ValueError("SQLite source does not exist")
    sqlite_store.DB_PATH = source
    state = sqlite_store.read_state()
    if state is None:
        raise ValueError("No verified SQLite state to migrate")
    target.init_db()
    if target.list_revisions():
        raise ValueError("Destination is not empty; migration refused")
    result = target.commit_state(state["data"], "sqlite-to-mongodb-migration")
    verified = target.read_state()
    if not verified or verified["checksum"] != result["checksum"]:
        raise RuntimeError("Migration verification failed")
    return result["revision"]


def main():
    load_environment()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sqlite-path", type=Path, required=True)
    args = parser.parse_args()
    if os.environ.get("STORAGE_BACKEND") != "mongodb":
        parser.error("Set STORAGE_BACKEND=mongodb and MONGODB_URI first")
    try:
        revision = migrate(args.sqlite_path, create_store(args.sqlite_path))
    except Exception:
        print("Aktarım başarısız. Kaynak dosyayı, boş hedef veritabanını ve bağlantı ayarlarını kontrol edin.")
        return 1
    print(f"Aktarım doğrulandı. MongoDB revizyonu: {revision}. SQLite kaynağı korundu.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
