"""MongoDB repository: normalized collections, snapshot transactions and durable ACKs.

The identity map is transaction-local, never authoritative. Large record fields
are chunked inside the SAME transaction; no GridFS transaction assumptions.
"""

import copy
import hashlib
import json
import random
import time
from contextlib import contextmanager
from datetime import date, datetime
from functools import wraps
from uuid import UUID, uuid4

from bson import decode as bson_decode
from bson import encode as bson_encode
from pymongo import ASCENDING, MongoClient
from pymongo.errors import BulkWriteError, DuplicateKeyError, PyMongoError
from pymongo.read_concern import ReadConcern
from pymongo.write_concern import WriteConcern
from sqlalchemy import CheckConstraint, UniqueConstraint, inspect
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql.dml import Delete, Insert, Update

from .db import Base
from .errors import DomainError
from .mongo_query import check_expression, check_value, criteria, ordering, value

PREFIX = "alos_v2_"
REVISION = "mongo-v2-1"
CHUNK = 1024 * 1024


def retry_transaction(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        deadline = time.monotonic() + 10
        for attempt in range(40):
            try:
                return function(*args, **kwargs)
            except PyMongoError as exc:
                if exc.has_error_label("TransientTransactionError") and attempt < 39 and time.monotonic() < deadline:
                    time.sleep(min(0.01 * 2**min(attempt, 5), 0.25) + random.uniform(0, 0.025))
                    continue
                raise DomainError(
                    "storage_retry", "Kayıt tamamlanamadı; aynı işlemi yeniden dene.", 503
                ) from None

    return wrapped


def encode(column, raw):
    if isinstance(column.type, JSONB):
        return json.dumps(raw, ensure_ascii=True, separators=(",", ":"), allow_nan=False)
    return value(raw)


def decode(column, raw):
    if isinstance(column.type, JSONB):
        return json.loads(raw)
    if raw is None:
        return None
    kind = column.type.python_type
    if kind is UUID:
        return UUID(raw)
    if kind is datetime:
        return datetime.fromisoformat(raw)
    if kind is date:
        return date.fromisoformat(raw)
    if kind is bytes:
        return bytes(raw)
    return raw


def primary(table, data):
    return json.dumps([value(data[col.name]) for col in table.primary_key], separators=(",", ":"))


class Values(list):
    def all(self):
        return list(self)

    def first(self):
        return self[0] if self else None

    def scalar_one(self):
        if len(self) != 1:
            raise ValueError("Expected one repository result")
        return self[0]

    def scalar(self):
        return self.first()

    def scalars(self):
        return self


class MongoDatabase:
    backend = "mongodb"

    def __init__(self, uri, database_name):
        if not database_name or not database_name.replace("_", "").isalnum():
            raise ValueError("Explicit MongoDB database name required")
        self.uri = uri
        self.client = MongoClient(
            uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            appname="AthleteLifeV2",
            retryWrites=True,
            maxPoolSize=10,
        )
        self.raw = self.client[database_name]
        self.sessions = MongoSessions(self)
        self.engine = self  # lifecycle compatibility only; no SQL engine exists.
        self.models = {mapper.local_table.name: mapper.class_ for mapper in Base.registry.mappers}
        self.checks = {
            table.name: [
                check_expression(str(c.sqltext)) for c in table.constraints if isinstance(c, CheckConstraint)
            ]
            for table in Base.metadata.sorted_tables
        }

    def collection(self, table):
        return self.raw[PREFIX + (table if isinstance(table, str) else table.name)]

    def dispose(self):
        # Match SQLAlchemy pool.dispose: future repository use reconnects.
        name = self.raw.name
        self.client.close()
        self.client = MongoClient(
            self.uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            appname="AthleteLifeV2",
            retryWrites=True,
            maxPoolSize=10,
        )
        self.raw = self.client[name]

    def ready(self, _sql_revision=None):
        hello = self.client.admin.command("hello")
        if not hello.get("setName") and hello.get("msg") != "isdbgrid":
            return False
        row = self.collection("schema").find_one({"_id": "revision"})
        return bool(
            row and row.get("value") == REVISION
            and self.collection("cutovers").find_one({"status": {"$ne": "complete"}}) is None
        )

    def migrate(self):
        hello = self.client.admin.command("hello")
        if not hello.get("setName") and hello.get("msg") != "isdbgrid":
            raise RuntimeError("MongoDB replica set or sharded cluster required; no nontransaction fallback")
        for table in Base.metadata.sorted_tables:
            name = PREFIX + table.name
            if name not in self.raw.list_collection_names():
                self.raw.create_collection(name)
            coll = self.collection(table)
            for constraint in table.constraints:
                if isinstance(constraint, UniqueConstraint):
                    cols = [c.name for c in constraint.columns]
                    coll.create_index(
                        [(c, ASCENDING) for c in cols], unique=True, name="uq_" + "_".join(cols)
                    )
            for index in table.indexes:
                cols = [c.name for c in index.columns]
                options = {}
                if index.unique:
                    options["unique"] = True
                if index.name == "unique_session_slot_alive":
                    options["partialFilterExpression"] = {"deleted_at": None, "slot_id": {"$type": "string"}}
                coll.create_index([(c, ASCENDING) for c in cols], name=index.name, **options)
        self.collection("blobs").create_index([("record", 1), ("ordinal", 1)], unique=True)
        # Shared serialization fence protects application-enforced references against concurrent deletes.
        self.collection("locks").update_one({"_id": "writer"}, {"$setOnInsert": {"revision": 0}}, upsert=True)
        self.collection("schema").replace_one(
            {"_id": "revision"}, {"_id": "revision", "value": REVISION}, upsert=True
        )

    @contextmanager
    def snapshot(self):
        with self.sessions() as session:
            yield session


class MongoSessions:
    def __init__(self, database):
        self.database = database

    def __call__(self):
        return MongoSession(self.database, write=False)

    def begin(self):
        return MongoSession(self.database, write=True)


class MongoSession:
    def __init__(self, database, write):
        self.database, self.write = database, write
        self.rows, self.original, self.deleted = {}, {}, set()
        self.session = None

    def __enter__(self):
        self.session = self.database.client.start_session()
        self.session.start_transaction(
            read_concern=ReadConcern("snapshot"), write_concern=WriteConcern("majority")
        )
        try:
            if self.write:
                self.database.collection("locks").update_one(
                    {"_id": "writer"}, {"$inc": {"revision": 1}}, session=self.session
                )
        except Exception:
            self.session.end_session()
            raise
        return self

    def __exit__(self, kind, error, traceback):
        try:
            if kind is None and self.write:
                self.flush()
                deadline = time.monotonic() + 20
                while True:
                    try:
                        self.session.commit_transaction()
                        break
                    except PyMongoError as exc:
                        if (
                            exc.has_error_label("UnknownTransactionCommitResult")
                            and time.monotonic() < deadline
                        ):
                            continue
                        raise
            elif self.session.in_transaction:
                self.session.abort_transaction()
        finally:
            self.session.end_session()
        return False

    def key(self, row):
        table = inspect(type(row)).local_table
        return table.name, primary(table, {c.name: getattr(row, c.name) for c in table.primary_key})

    def add(self, row):
        if not self.write:
            raise RuntimeError("Read-only snapshot")
        for column in inspect(type(row)).columns:
            if getattr(row, column.name) is None and column.default is not None:
                default = column.default
                setattr(
                    row, column.name, default.arg(None) if default.is_callable else copy.deepcopy(default.arg)
                )
        key = self.key(row)
        if key not in self.rows:
            self.rows[key], self.original[key] = row, None

    def add_all(self, rows):
        for row in rows:
            self.add(row)

    def plain(self, row):
        return {c.name: getattr(row, c.name) for c in inspect(type(row)).columns}

    def document(self, row):
        return {c.name: encode(c, getattr(row, c.name)) for c in inspect(type(row)).columns}

    def unpack(self, model, document, metadata_only=False):
        if document is None:
            return None
        key = model.__tablename__, document["_id"]
        if key in self.rows:
            return self.rows[key]
        if "_large" in document and not metadata_only:
            chunks = self.database.collection("blobs").find(
                {"record": document["_large"]}, session=self.session, batch_size=4
            ).sort("ordinal", 1)
            data = bytearray()
            for chunk in chunks:
                data.extend(chunk["content"])
            if len(data) != document["_size"] or hashlib.sha256(data).hexdigest() != document["_sha256"]:
                raise RuntimeError("Private record content integrity failure")
            document = bson_decode(data)
        row = model(**{c.name: decode(c, b"" if metadata_only and c.name == "content" else document[c.name]) for c in inspect(model).columns})
        self.rows[key], self.original[key] = row, copy.deepcopy(self.plain(row))
        return row

    def get(self, model, identity, with_for_update=False):
        table = inspect(model).local_table
        values = identity if isinstance(identity, tuple) else (identity,)
        ident = primary(table, dict(zip([c.name for c in table.primary_key], values, strict=True)))
        key = table.name, ident
        if key in self.deleted:
            return None
        if key in self.rows:
            return self.rows[key]
        return self.unpack(
            model, self.database.collection(table).find_one({"_id": ident}, session=self.session)
        )

    def scalars(self, statement):
        self.flush()
        table = statement.get_final_froms()[0]
        if len(statement.get_final_froms()) != 1:
            raise ValueError("Repository joins are not supported")
        coll = self.database.collection(table)
        where = criteria(statement._where_criteria)
        selected = list(statement.selected_columns)
        if len(selected) == 1 and getattr(selected[0], "name", "") == "count":
            return Values([coll.count_documents(where, session=self.session)])
        model = self.database.models[table.name]
        cursor = coll.find(where, session=self.session)
        order = ordering(statement._order_by_clauses)
        if order:
            cursor = cursor.sort(order)
        if statement._offset_clause is not None:
            cursor = cursor.skip(statement._offset_clause.value)
        if statement._limit_clause is not None:
            if statement._limit_clause.value == 0:
                return Values()
            cursor = cursor.limit(statement._limit_clause.value)
        metadata_only = bool(statement.get_execution_options().get("alos_media_metadata"))
        if metadata_only and (self.write or table.name != "media_objects"):
            raise ValueError("Metadata projection is only for read-only media queries")
        return Values(self.unpack(model, doc, metadata_only) for doc in cursor)

    def scalar(self, statement):
        return self.scalars(statement).first()

    def execute(self, statement):
        if isinstance(statement, Delete):
            self.flush()
            for doc in self.database.collection(statement.table).find(
                criteria(statement._where_criteria), session=self.session
            ):
                self.delete(self.unpack(self.database.models[statement.table.name], doc))
            self.flush()
            return Values()
        if isinstance(statement, Update):
            self.flush()
            model = self.database.models[statement.table.name]
            fields = {getattr(k, "name", str(k)): v.value for k, v in statement._values.items()}
            for doc in self.database.collection(statement.table).find(
                criteria(statement._where_criteria), session=self.session
            ):
                row = self.unpack(model, doc)
                for name, new_value in fields.items():
                    setattr(row, name, new_value)
            self.flush()
            return Values()
        if isinstance(statement, Insert):
            fields = {getattr(k, "name", str(k)): v.value for k, v in statement._values.items()}
            model = self.database.models[statement.table.name]
            keys = tuple(fields[c.name] for c in statement.table.primary_key)
            if not self.get(model, keys if len(keys) > 1 else keys[0]):
                self.add(model(**fields))
                self.flush()
            return Values()
        return self.scalars(statement)

    def delete(self, row):
        if not self.write:
            raise RuntimeError("Read-only snapshot")
        self.deleted.add(self.key(row))

    def flush(self):
        if not self.write:
            return
        try:
            inserts = {}
            references = set()
            for key, row in list(self.rows.items()):
                if key in self.deleted:
                    continue
                plain = self.plain(row)
                if plain == self.original[key]:
                    continue
                data = self.document(row)
                table = inspect(type(row)).local_table
                for col in table.columns:
                    if plain[col.name] is None and not col.nullable and not isinstance(col.type, JSONB):
                        raise IntegrityError(None, None, ValueError("Required record field"))
                    if (
                        isinstance(plain[col.name], str)
                        and getattr(col.type, "length", None)
                        and len(plain[col.name]) > col.type.length
                    ):
                        raise IntegrityError(None, None, ValueError("Record field too long"))
                if any(check_value(c, plain) is False for c in self.database.checks[table.name]):
                    raise IntegrityError(None, None, ValueError("Record constraint"))
                for constraint in table.foreign_key_constraints:
                    vals = [plain[element.parent.name] for element in constraint.elements]
                    if any(v is None for v in vals):
                        continue
                    target = constraint.elements[0].column.table
                    match = {
                        el.column.name: value(v) for el, v in zip(constraint.elements, vals, strict=True)
                    }
                    reference = (target.name, json.dumps(match, sort_keys=True))
                    known = any(
                        row_key[0] == target.name and row_key not in self.deleted
                        and all(value(getattr(known_row, name)) == expected for name, expected in match.items())
                        for row_key, known_row in self.rows.items()
                    )
                    if not known and reference not in references and not self.database.collection(target).find_one(match, session=self.session):
                        raise IntegrityError(None, None, ValueError("Record reference"))
                    references.add(reference)
                coll = self.database.collection(table)
                creating = self.original[key] is None
                old = None if creating else coll.find_one({"_id": key[1]}, {"_large": 1}, session=self.session)
                if old and old.get("_large"):
                    self.database.collection("blobs").delete_many(
                        {"record": old["_large"]}, session=self.session
                    )
                doc = {"_id": key[1], **data}
                if any(isinstance(v, (str, bytes)) and len(v) >= CHUNK for v in doc.values()):
                    from .bson_stream import document_chunks
                    blob_id = str(uuid4())
                    digest, size, batch = hashlib.sha256(), 0, []
                    for ordinal, chunk in enumerate(document_chunks(doc)):
                        digest.update(chunk)
                        size += len(chunk)
                        batch.append({"record": blob_id, "ordinal": ordinal, "content": chunk})
                        if len(batch) == 4:
                            self.database.collection("blobs").insert_many(batch, session=self.session)
                            batch.clear()
                    if batch:
                        self.database.collection("blobs").insert_many(batch, session=self.session)
                    doc = {k: v for k, v in doc.items()
                           if not (isinstance(v, (str, bytes)) and len(v) >= CHUNK)
                           and len(bson_encode({"v": v})) < CHUNK}
                    doc.update(_large=blob_id, _size=size, _sha256=digest.hexdigest())
                if creating:
                    inserts.setdefault(table.name, []).append(doc)
                else:
                    coll.replace_one({"_id": key[1]}, doc, upsert=True, session=self.session)
                self.original[key] = copy.deepcopy(plain)
            # New identities use insert semantics, never upsert: duplicates still abort
            # the entire transaction. Batching avoids one network round trip per row.
            for table, documents in inserts.items():
                self.database.collection(table).insert_many(documents, ordered=True, session=self.session)
            for table, identity in list(self.deleted):
                coll = self.database.collection(table)
                old = coll.find_one({"_id": identity}, session=self.session)
                if old:
                    for child in Base.metadata.sorted_tables:
                        for fk in child.foreign_key_constraints:
                            if fk.elements[0].column.table.name != table:
                                continue
                            match = {el.parent.name: old[el.column.name] for el in fk.elements}
                            for dependent in self.database.collection(child).find(
                                match, {"_id": 1}, session=self.session
                            ):
                                if (child.name, dependent["_id"]) not in self.deleted:
                                    raise IntegrityError(
                                        None, None, ValueError("Referenced record cannot be deleted")
                                    )
                if old and old.get("_large"):
                    self.database.collection("blobs").delete_many(
                        {"record": old["_large"]}, session=self.session
                    )
                coll.delete_one({"_id": identity}, session=self.session)
        except DuplicateKeyError:
            raise IntegrityError(None, None, ValueError("Unique record constraint")) from None
        except BulkWriteError as error:
            if any(item.get("code") == 11000 for item in error.details.get("writeErrors", [])):
                raise IntegrityError(None, None, ValueError("Unique record constraint")) from None
            raise
