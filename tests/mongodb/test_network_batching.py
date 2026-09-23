"""Synthetic network-delay regression; never connects to Atlas."""
import hashlib
import json
import time

from alos.cutover import migrate_account
from pymongo.collection import Collection
from test_cutover import source


def test_large_cutover_bounds_round_trips_with_network_delay(app, monkeypatch):
    bundle = source()
    data = {"waterLogs": {"2026-09-20": [{"ml": 100} for _ in range(350)]}}
    payload = json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    bundle["state"] = {"payload": payload, "checksum": hashlib.sha256(payload.encode()).hexdigest()}
    counts = {"find_one": 0, "insert_many": 0, "replace_one": 0}

    def delayed(name, original):
        def call(*args, **kwargs):
            counts[name] += 1
            time.sleep(0.02)
            return original(*args, **kwargs)
        return call

    for name in counts:
        monkeypatch.setattr(Collection, name, delayed(name, getattr(Collection, name)))
    migrate_account(app.state.database, bundle)
    # Most writes are per-domain flushes; archival rows/change/audit rows batch.
    # Foreign-key checks must reuse transaction-local parents instead of 2+ reads/row.
    assert counts["find_one"] < 60
    assert counts["insert_many"] < 400
    assert app.state.database.ready()
