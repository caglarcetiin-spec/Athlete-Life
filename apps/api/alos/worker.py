"""DB-backed lease; processing remains safe after a worker dies before its ACK."""

import asyncio
import logging
from datetime import timedelta
from uuid import uuid4

from pymongo.errors import PyMongoError
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError

from .db import utcnow
from .errors import DomainError
from .models import Outbox
from .mongo_db import retry_transaction


@retry_transaction
def claim(database):
    if getattr(database, "backend", None) == "mongodb":
        # Avoid a write fence every second when a free-tier queue is empty.
        with database.snapshot() as snapshot:
            if (
                snapshot.scalar(
                    select(Outbox)
                    .where(Outbox.processed_at.is_(None), Outbox.available_at <= utcnow())
                    .limit(1)
                )
                is None
            ):
                return None
    with database.sessions.begin() as db:
        now = utcnow()
        row = db.scalar(
            select(Outbox)
            .where(
                Outbox.processed_at.is_(None),
                Outbox.available_at <= now,
                or_(Outbox.leased_until.is_(None), Outbox.leased_until < now),
            )
            .order_by(Outbox.available_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if row is None:
            return None
        row.lease_token, row.leased_until = uuid4(), now + timedelta(seconds=30)
        row.attempts += 1
        return row.id, row.lease_token


@retry_transaction
def process(database, job):
    job_id, token = job
    with database.sessions.begin() as db:
        row = db.get(Outbox, job_id, with_for_update=True)
        if not row or row.processed_at or row.lease_token != token:
            return False
        # Current projection reads the source on demand. This durable notification records
        # the invalidation watermark; no external, non-transactional side effects exist.
        row.processed_at = utcnow()
        row.leased_until = None
        return True


async def run(database):
    """One lightweight consumer per instance; durable leases coordinate instances."""
    while True:
        try:
            job = await asyncio.to_thread(claim, database)
            if job:
                await asyncio.to_thread(process, database, job)
            else:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            raise
        except (SQLAlchemyError, PyMongoError, DomainError) as exc:
            if isinstance(exc, DomainError) and exc.code != "storage_retry":
                raise
            # Driver messages may contain connection details; log only the error class.
            logging.getLogger(__name__).warning("Outbox retry deferred: %s", type(exc).__name__)
            await asyncio.sleep(15)
