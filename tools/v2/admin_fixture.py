"""Synthetic browser role provisioning; never operates on personal databases."""

import os

from alos.config import Settings
from alos.main import create_app
from alos.models import Administrator, User
from sqlalchemy import select


def create():
    name = os.environ["ALOS_SYNTHETIC_SPORT_DB"]
    if (
        not name.startswith("alos_test_sport_browser_")
        or os.environ.get("PYTHON_DOTENV_DISABLED") != "1"
    ):
        raise RuntimeError("Synthetic fixture required")
    app = create_app(
        Settings(
            database_url="postgresql://localhost:15432/" + name,
            enabled=True,
            environment="test",
            public_origin="http://127.0.0.1:10011",
        )
    )
    with app.state.database.sessions.begin() as db:
        user = db.scalar(select(User).where(User.username == "deniz"))
        db.add(Administrator(user_id=user.id))
    return app
