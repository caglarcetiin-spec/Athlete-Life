from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class Database:
    def __init__(self, url: str):
        self.engine = create_engine(
            url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            connect_args={"connect_timeout": 5, "options": "-c timezone=UTC"},
        )
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)

    def ready(self, revision):
        from sqlalchemy import text

        with self.engine.connect() as conn:
            return conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == revision

    @contextmanager
    def snapshot(self):
        with (
            self.engine.connect().execution_options(isolation_level="REPEATABLE READ") as conn,
            self.sessions(bind=conn) as db,
            db.begin(),
        ):
            yield db

    def session(self) -> Iterator[Session]:
        with self.sessions() as session:
            yield session


def open_database(settings):
    if settings.database_url.startswith(("mongodb://", "mongodb+srv://")):
        from .mongo_db import MongoDatabase

        return MongoDatabase(settings.database_url, settings.mongo_database)
    return Database(settings.database_url)
