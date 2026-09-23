"""Mongo-specific commit boundaries and query semantics on an isolated replica set."""
import json
import os
import selectors
import subprocess
import sys
import time
from pathlib import Path
from uuid import UUID

from alos.contracts import Command
from alos.errors import DomainError
from alos.models import Operation
from alos.mongo_query import query
from alos.service import execute
from conftest import cmd
from sqlalchemy import column, select


def test_null_predicates_match_sql_where(app):
    coll = app.state.database.collection("predicate_probe")
    coll.insert_many([{"x": None}, {"x": 1}, {"x": 2}])
    x = column("x")
    assert [r["x"] for r in coll.find(query(x != 1))] == [2]
    assert [r["x"] for r in coll.find(query(x.not_in([1])))] == [2]
    assert list(coll.find(query(x.not_in([1, None])))) == []
    assert len(list(coll.find(query(x.not_in([]))))) == 3
    assert [r["x"] for r in coll.find(query(x.in_([1, None])))] == [1]
    assert len(list(coll.find(query(x.is_(None))))) == 1


def test_stale_schema_is_not_ready(app):
    database = app.state.database
    assert database.ready()
    database.collection("schema").update_one({"_id": "revision"}, {"$set": {"value": "old"}})
    assert not database.ready()
    database.migrate()
    assert database.ready()


def test_process_death_at_commit_boundaries(app):
    script = '''import json,sys,time
from uuid import UUID
from pymongo.synchronous.client_session import ClientSession
from alos.mongo_db import MongoDatabase
from alos.contracts import Command
from alos.service import execute
args=json.loads(sys.stdin.readline())
database=MongoDatabase("mongodb://127.0.0.1:27028/?replicaSet=alos-test",args["name"])
original=ClientSession.commit_transaction
def boundary(self):
    if args["phase"]=="after": original(self)
    print("BOUNDARY",flush=True)
    time.sleep(120)
ClientSession.commit_transaction=boundary
execute(database,UUID(args["athlete"]),Command.model_validate(args["command"]))
'''
    database, athlete = app.state.database, app.state.athletes[0]
    for phase, day, count in [("after", "2026-09-20", 1), ("before", "2026-09-21", 0)]:
        command = cmd(local_date=day)
        process = subprocess.Popen(
            [sys.executable, "-c", script], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, text=True,
            env={**os.environ, "PYTHONPATH": str(Path("apps/api").resolve())},
        )
        try:
            process.stdin.write(json.dumps({"name": database.raw.name, "athlete": str(athlete),
                                           "phase": phase, "command": command}) + "\n")
            process.stdin.flush()
            with selectors.DefaultSelector() as selector:
                selector.register(process.stdout, selectors.EVENT_READ)
                assert selector.select(timeout=20), "Commit boundary not reached"
            assert process.stdout.readline().strip() == "BOUNDARY"
        finally:
            process.kill()
            process.wait(timeout=5)
            for pipe in (process.stdin, process.stdout, process.stderr):
                pipe.close()
        with database.snapshot() as snapshot:
            records = snapshot.scalars(select(Operation).where(Operation.operation_id == UUID(command["operation_id"])))
            assert len(records) == count
        # A lost response retries the same operation. A killed transaction can retain
        # its write fence until Mongo's default transaction lifetime expires.
        started = time.monotonic()
        while True:
            try:
                ack = execute(database, athlete, Command.model_validate(command))
                break
            except DomainError as error:
                assert error.code == "storage_retry"
                assert time.monotonic() - started < 95, "Orphaned transaction did not release fence"
        assert ack["entity"]["id"] == command["entity_id"]
        with database.snapshot() as snapshot:
            assert len(snapshot.scalars(select(Operation).where(Operation.operation_id == UUID(command["operation_id"])))) == 1
        print(f"{phase} commit crash recovery: {time.monotonic() - started:.2f}s")
