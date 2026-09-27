"""Offline, lossless mapping proposal. Does not connect to or mutate a database."""

from copy import deepcopy

from .movements import VERSION, resolve

KINDS = ("set", "program_exercise", "slot")


def preview(records):
    changes = []
    counts = {"matched": 0, "ambiguous": 0, "unmatched": 0, "unchanged": 0}
    for kind in KINDS:
        for row in records.get(kind, []):
            result = resolve(row)
            status = result["status"]
            if status == "matched" and row.get("movement_id") == result["definition"]["id"]:
                status = "unchanged"
            counts[status] += 1
            changes.append(
                {
                    "kind": kind,
                    "id": row["id"],
                    "version": row.get("version"),
                    "status": status,
                    "absent_before": [k for k in ("movement_id", "catalog_version") if k not in row],
                    "before": {k: row.get(k) for k in ("movement_id", "catalog_version")},
                    "after": {"movement_id": result["definition"]["id"], "catalog_version": VERSION}
                    if status == "matched"
                    else None,
                    "candidates": result["candidates"],
                }
            )
    return {"catalog_version": VERSION, "counts": counts, "changes": changes}


def transform(records, proposal, rollback=False):
    """Apply to a COPY only. Refuse stale source values; reruns are idempotent."""
    output = deepcopy(records)
    for change in proposal["changes"]:
        if change["status"] != "matched":
            continue
        row = next(r for r in output[change["kind"]] if r["id"] == change["id"])
        source, target = (
            (change["after"], change["before"]) if rollback else (change["before"], change["after"])
        )
        current = {k: row.get(k) for k in source}
        if current == target:
            continue
        if current != source or row.get("version") != change["version"]:
            raise ValueError("Stale movement migration proposal; create a new dry run")
        row.update(target)
        if rollback:
            for key in change.get("absent_before", []):
                row.pop(key, None)
    return output
