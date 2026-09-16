"""Shared snapshot format for all persistence backends."""
import hashlib
import json
from datetime import datetime, timezone

def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def canonical_json(data) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, allow_nan=False, separators=(",", ":"))


def checksum(data) -> str:
    return hashlib.sha256(canonical_json(data).encode("utf-8")).hexdigest()


def data_weight(data: dict) -> int:
    keys = (
        "daily", "scheduleByDate", "weekOptimizations", "trainingLogs",
        "foodLogs", "waterLogs", "painLogs", "sessionFeedback", "futurePlans",
        "capabilityRecords", "guidedWorkoutHistory",
        "sportSessions", "customSports", "athleteProfileHistory", "sportSessionHistory","multisportPeriods",
    )
    n = 0
    for k in keys:
        v = data.get(k)
        if isinstance(v, dict): n += len(v)
        elif isinstance(v, list): n += len(v)
    if isinstance(data.get("athleteProfile"), dict) and data["athleteProfile"].get("completedAt"):
        n += 1
    return n

