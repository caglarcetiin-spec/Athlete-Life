"""Check migration/model drift in a fresh synthetic database, then remove it."""

import os
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

from alembic import command
from alembic.config import Config

root = Path(__file__).resolve().parents[2]
name = "alos_test_schema_" + uuid4().hex
try:
    subprocess.run(
        [sys.executable, "tools/v2/test_database.py", "create", name],
        cwd=root,
        check=True,
    )
    os.environ["ALOS_V2_DATABASE_URL"] = "postgresql+psycopg://localhost:15432/" + name
    command.check(Config(str(root / "apps/api/alembic.ini")))
finally:
    subprocess.run(
        [sys.executable, "tools/v2/test_database.py", "drop", name],
        cwd=root,
        check=True,
    )
