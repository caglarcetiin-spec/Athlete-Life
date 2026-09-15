"""Select storage explicitly; never fall back after a MongoDB failure."""
import os
from pathlib import Path


def load_environment():
    config = Path(__file__).resolve().parent / ".env"
    if config.is_file():
        from dotenv import load_dotenv
        load_dotenv(config, override=False)


def create_store(sqlite_path):
    backend = os.environ.get("STORAGE_BACKEND", "sqlite").lower()
    if backend == "sqlite":
        import sqlite_store
        sqlite_store.DB_PATH = sqlite_path
        sqlite_path.parent.mkdir(parents=True, exist_ok=True)
        sqlite_store.backend = "sqlite"
        return sqlite_store
    if backend == "mongodb":
        uri = os.environ.get("MONGODB_URI", "").strip()
        if not uri:
            raise ValueError("MONGODB_URI is required for mongodb")
        from mongo_store import MongoStore
        return MongoStore(uri, os.environ.get("MONGODB_DATABASE", "athlete_life"))
    raise ValueError("STORAGE_BACKEND must be sqlite or mongodb")
