"""Explicit schema and server entry points; never opens a browser or chooses a fallback DB."""

import argparse
import os
from pathlib import Path

import uvicorn
from alembic import command
from alembic.config import Config

from .config import Settings


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("serve", "migrate", "schema-check"))
    args = parser.parse_args()
    settings = Settings()
    if not settings.enabled:
        parser.error("ALOS_V2_ENABLED must be explicitly enabled")
    if args.action in {"migrate", "schema-check"}:
        config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
        if args.action == "migrate":
            command.upgrade(config, "head")
        else:
            command.check(config)
        return
    try:
        port = int(os.environ.get("PORT", "10005"))
        if not 1 <= port <= 65535:
            raise ValueError("range")
    except ValueError:
        parser.error("PORT must be an integer between 1 and 65535")
    uvicorn.run(
        "alos.main:create_app",
        factory=True,
        host="0.0.0.0",
        port=port,
        workers=1,
        access_log=False,
        proxy_headers=False,
    )


if __name__ == "__main__":
    main()
