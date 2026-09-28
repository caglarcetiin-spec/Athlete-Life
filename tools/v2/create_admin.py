"""Explicit local operator provisioning; password via hidden terminal prompt only."""

import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps/api"))
from alos.auth import create_user
from alos.config import Settings
from alos.db import open_database
from alos.models import Administrator, SecurityAudit, User
from sqlalchemy import select

parser = argparse.ArgumentParser()
parser.add_argument("--username", required=True)
parser.add_argument("--name", required=True)
args = parser.parse_args()
settings = Settings()
if not settings.enabled:
    raise SystemExit("Explicit application configuration required")
database = open_database(settings)
try:
    with database.snapshot() as db:
        exists = (
            db.scalar(
                select(User).where(User.username == args.username.strip().casefold())
            )
            is not None
        )
    if exists:
        raise SystemExit(
            "Account exists; refusing to overwrite password or grant privileges implicitly."
        )
    password = getpass.getpass("New administrator password: ")
    with database.sessions.begin() as db:
        user, _ = create_user(db, args.username, args.name, password)
        db.add(Administrator(user_id=user.id))
        db.add(SecurityAudit(user_id=user.id, event="admin_provisioned"))
    password = None
    print("Administrator created. Credentials were not printed.")
finally:
    database.engine.dispose()
