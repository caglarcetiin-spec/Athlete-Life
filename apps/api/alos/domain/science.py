"""Pure, clock-injected decision support. Outputs are not tissue measurements."""

import hashlib
import json
import re
from datetime import UTC, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from ..errors import DomainError
from ..lifestyle import capability_series, nutrition_summary

MODELS = {
    "exposure-1": {"strength": 36, "isometric": 36, "skill": 24, "cardio": 24, "circuit": 30},
    "exposure-1-conservative": {"strength": 48, "isometric": 48, "skill": 36, "cardio": 36, "circuit": 42},
}
UNITS = {
    "strength": "ağırlıklı gerçek set",
    "isometric": "ağırlıklı tutuş saniyesi",
    "skill": "ağırlıklı teknik deneme",
    "cardio": "ağırlıklı çalışma saniyesi",
    "circuit": "ağırlıklı dakika",
}
MOVEMENTS = json.loads((Path(__file__).parents[1] / "catalogs/movements.json").read_text())
normalize = lambda s: re.sub(r"[^a-z0-9]", "", str(s).casefold())
BY_NAME = {normalize(k): v for k, v in MOVEMENTS.items()}
ALIASES = {
    "squat": "squat",
    "inclinepushup": "pushup",
    "easy locomotion": "walking",
    "glutebridge": "glutebridge",
}


def instant(value):
    result = datetime.fromisoformat(str(value))
    if result.tzinfo is None:
        raise DomainError("as_of", "Saat dilimiyle bir zaman gerekli.")
    return result.astimezone(UTC)


def active(snapshot, kind):
    return [r for r in snapshot.get(kind + "s", []) if not r.get("deleted_at")]


def date_bounds(row, as_of, zone):
    if row.get("occurred_at"):
        at = instant(row["occurred_at"])
        return (at, at, False) if at <= as_of else None
    local = row.get("local_date")
    if not local:
        return None
    start = datetime.combine(
        datetime.fromisoformat(local).date(), time.min, ZoneInfo(row.get("timezone") or zone)
    ).astimezone(UTC)
    end = start + timedelta(days=1)
    if start > as_of:
        return None
    return start, min(end, as_of), end > as_of


def movement(row):
    key = normalize(row.get("movement_id", ""))
    return (
        BY_NAME.get(key)
        or BY_NAME.get(normalize(ALIASES.get(key, "")))
        or BY_NAME.get(normalize(row.get("name", "")))
    )


def compute(snapshot, as_of, model_version="exposure-1", window_days=28, knowledge="recomputed"):
    if model_version not in MODELS:
        raise DomainError("model_version", "Hesap sürümü desteklenmiyor.")
    if as_of.tzinfo is None:
        raise DomainError("as_of", "Saat dilimi gerekli.")
    zone = snapshot.get("timezone", "Europe/Istanbul")
    on = as_of.astimezone(ZoneInfo(zone)).date().isoformat()
    start = (as_of.astimezone(ZoneInfo(zone)).date() - timedelta(days=window_days - 1)).isoformat()
    # Actual future events cannot influence an earlier decision, even on the same local day.
    daily_keys = (
        "sets",
        "events",
        "meals",
        "hydrations",
        "nutrition_days",
        "checkins",
        "pains",
        "measurements",
        "capabilitys",
        "goal_measurements",
        "cycles",
        "labs",
    )
    snapshot = {
        **snapshot,
        **{
            k: [
                r
                for r in snapshot.get(k, [])
                if (not r.get("local_date") or r["local_date"] <= on)
                and (not r.get("occurred_at") or instant(r["occurred_at"]) <= as_of)
            ]
            for k in daily_keys
        },
    }
    lineage = []
    loads = []
    muscles = {}
    unmapped = []
    uncertain = []
    missing = []
    set_rows = []
    for row in active(snapshot, "set"):
        if row.get("status") == "skipped":
            continue
        bounds = date_bounds(row, as_of, zone)
        if bounds is None:
            continue
        earliest, latest, partial = bounds
        modality = row.get("modality", "strength")
        definition = movement(row)
        mode = definition.get("physiology", {}).get("mode") if definition else None
        if modality == "strength":
            amount = 1.0 if row.get("reps") is not None and row["reps"] > 0 else None
        elif modality == "isometric":
            amount = row.get("seconds")
        elif modality == "skill":
            amount = 1.0 if row.get("reps") or row.get("seconds") else None
        elif modality == "cardio":
            amount = row.get("seconds")
        elif modality == "circuit":
            amount = row.get("seconds") / 60 if row.get("seconds") is not None else None
        else:
            amount = None
        raw = {
            "reps": row.get("reps"),
            "seconds": row.get("seconds"),
            "distance_m": row.get("distance_m"),
            "external_kg": row.get("external_kg"),
            "assistance_kg": row.get("assistance_kg"),
            "bodyweight_kg": row.get("bodyweight_kg"),
            "rir": row.get("rir"),
            "rpe": row.get("rpe"),
        }
        if row.get("local_date", "") >= start:
            set_rows.append(row)
        loads.append(
            {
                "id": row["id"],
                "session_id": row.get("session_id"),
                "local_date": row["local_date"],
                "modality": modality,
                "mode": mode,
                "raw": raw,
                "hypertrophy_sets": None if modality != "strength" else amount,
                "unit": UNITS.get(modality),
                "amount": amount,
            }
        )
        lineage.append({"kind": "set", "id": row["id"], "version": row["version"]})
        if earliest != latest or partial:
            uncertain.append(row["id"])
        if not definition or amount is None:
            unmapped.append(
                {"id": row["id"], "reason": "Kas eşlemesi veya modaliteye uygun miktar bilinmiyor."}
            )
            continue
        half = MODELS[model_version][modality]
        for group, weight in definition.get("muscles", {}).items():
            if not isinstance(weight, (float, int)) or not 0 <= weight <= 1:
                continue
            exposure = float(amount) * weight
            low = (
                0.0
                if partial
                else exposure * 2 ** (-max(0, (as_of - earliest).total_seconds() / 3600) / half)
            )
            high = exposure * 2 ** (-max(0, (as_of - latest).total_seconds() / 3600) / half)
            result = muscles.setdefault(group, {}).setdefault(
                modality, {"low": 0.0, "high": 0.0, "unit": UNITS[modality], "source_ids": []}
            )
            result["low"] += low
            result["high"] += high
            result["source_ids"].append(row["id"])
    events = []
    for row in active(snapshot, "event"):
        if row.get("kind") != "physical" or row.get("status") != "occurred" or row.get("duplicate_of"):
            continue
        if date_bounds(row, as_of, zone) is None:
            continue
        events.append(
            {
                "id": row["id"],
                "local_date": row["local_date"],
                "modality": row.get("modality"),
                "seconds": row.get("duration_seconds"),
                "session_rpe_load": row["duration_seconds"] / 60 * row["rpe"]
                if row.get("duration_seconds") is not None and row.get("rpe") is not None
                else None,
                "unit": "süre × öz-bildirim eforu (AU)",
                "muscle_distribution": None,
            }
        )
        lineage.append({"kind": "event", "id": row["id"], "version": row["version"]})
    sleeps = [
        r
        for r in active(snapshot, "sleep")
        if instant(r["end_at"]) <= as_of and instant(r["end_at"]) > as_of - timedelta(days=2)
    ]
    # Merge overlapping intervals. Two devices reporting the same night must not double its duration.
    intervals = sorted((instant(r["start_at"]), instant(r["end_at"])) for r in sleeps)
    merged = []
    for a, b in intervals:
        if merged and a <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(b, merged[-1][1]))
        else:
            merged.append((a, b))
    recent_sleep = sum((b - a).total_seconds() / 3600 for a, b in merged) if merged else None
    checkins = sorted(
        [r for r in active(snapshot, "checkin") if r["local_date"] == on],
        key=lambda r: (r.get("updated_at", ""), r["id"]),
    )
    check = checkins[-1] if checkins else None
    pains = [r for r in active(snapshot, "pain") if r["local_date"] == on]
    episodes = [
        r
        for r in active(snapshot, "episode")
        if r["start_date"] <= on
        and (
            r.get("resolved_date") is None
            or r["resolved_date"] >= on
            or r.get("return_until")
            and r["return_until"] >= on
        )
    ]
    cycles = [r for r in active(snapshot, "cycle") if r["local_date"] == on]
    reasons = []
    if episodes:
        reasons.append(
            "Devam eden rahatsızlık veya kaydettiğin kademeli dönüş aralığı var. Daha hafif çalışma seçeneğini değerlendir."
        )
    if any(r["intensity"] >= 4 for r in pains):
        reasons.append("Ağrı bildirimi var; kas haritası antrenmana uygunluk onayı değildir.")
    if check and check.get("fatigue") is not None and check["fatigue"] >= 7:
        reasons.append(
            "Yüksek yorgunluk bildirdin. Efor ve çalışma miktarını azaltmayı değerlendirebilirsin."
        )
    if any(r.get("symptoms") is not None and r["symptoms"] >= 7 for r in cycles):
        reasons.append("Döngü belirtilerin yüksek; çalışma seçimini kendi toleransına göre düzenle.")
    if not check:
        missing.append("Bugünün enerji/yorgunluk öz-bildirimi")
    if recent_sleep is None:
        missing.append("Son iki günde biten uyku kaydı")
    nutrition = nutrition_summary(snapshot, on)
    if nutrition["status"] != "complete":
        missing.append("Tamamlanmış beslenme günlüğü")
    if nutrition["water_ml"] is None:
        missing.append("Su kaydı")
    for kind, rows in [
        ("sleep", sleeps),
        ("checkin", checkins),
        ("pain", pains),
        ("episode", episodes),
        ("cycle", cycles),
    ]:
        lineage.extend({"kind": kind, "id": r["id"], "version": r["version"]} for r in rows)
    readiness = {
        "status": "caution" if reasons else "unknown" if not check else "self_report_available",
        "score": None,
        "reasons": reasons or ["Kayıtlar bir güvenli antrenman garantisi değildir."],
        "self_report": check,
        "sleep_hours_in_recorded_intervals": recent_sleep,
        "sleep_source_ids": [r["id"] for r in sleeps],
        "pain": pains,
        "episode_ids": [r["id"] for r in episodes],
        "cycle_multiplier": None,
    }
    goals = []
    for goal in active(snapshot, "goal"):
        if goal["start_date"] > on:
            continue
        points = [
            {
                "id": goal["id"],
                "local_date": goal["start_date"],
                "value": goal["baseline"],
                "source": "baseline",
            }
        ]
        points += [
            {"id": r["id"], "local_date": r["local_date"], "value": r["value"], "source": "goal_measurement"}
            for r in active(snapshot, "goal_measurement")
            if r["goal_id"] == goal["id"] and goal["start_date"] <= r["local_date"] <= on
        ]
        if goal["metric"] == "weight" and goal["unit"] == "kg":
            explicit_dates = {p["local_date"] for p in points if p["source"] == "goal_measurement"}
            points.extend(
                {"id": r["id"], "local_date": r["local_date"], "value": r["value"], "source": "measurement"}
                for r in active(snapshot, "measurement")
                if r["metric"] == "weight"
                and r["unit"] == "kg"
                and goal["start_date"] <= r["local_date"] <= on
                and r["local_date"] not in explicit_dates
            )
        points.sort(key=lambda r: (r["local_date"], r["source"] != "baseline", r["id"]))
        latest = points[-1]
        progress = (latest["value"] - goal["baseline"]) / (goal["target"] - goal["baseline"]) * 100
        # Target line is the user's desired path, not a physiological forecast.
        duration = (
            datetime.fromisoformat(goal["target_date"]) - datetime.fromisoformat(goal["start_date"])
        ).days
        elapsed = (datetime.fromisoformat(on) - datetime.fromisoformat(goal["start_date"])).days
        expected = goal["baseline"] + (goal["target"] - goal["baseline"]) * min(1, elapsed / max(1, duration))
        goals.append(
            {
                "id": goal["id"],
                "title": goal["title"],
                "unit": goal["unit"],
                "target": goal["target"],
                "points": points,
                "progress": progress if len(points) > 1 else None,
                "deviation_from_user_line": latest["value"] - expected if len(points) > 1 else None,
                "latest": latest,
                "archived": goal["archived"],
            }
        )
    timeline = {}
    for row in set_rows:
        d = timeline.setdefault(
            row["local_date"],
            {
                "date": row["local_date"],
                "strength_sets": 0,
                "isometric_seconds": 0,
                "cardio_seconds": 0,
                "distance_m": 0,
                "source_ids": [],
            },
        )
        if row["modality"] == "strength":
            d["strength_sets"] += 1
        if row["modality"] == "isometric" and row.get("seconds") is not None:
            d["isometric_seconds"] += row["seconds"]
        if row["modality"] == "cardio":
            if row.get("seconds") is not None:
                d["cardio_seconds"] += row["seconds"]
            if row.get("distance_m") is not None:
                d["distance_m"] += row["distance_m"]
        d["source_ids"].append(row["id"])
    for group in muscles.values():
        for item in group.values():
            item["low"] = round(item["low"], 5)
            item["high"] = round(item["high"], 5)
    capability = [r for r in active(snapshot, "capability") if r["local_date"] <= on]
    result = {
        "model_version": model_version,
        "as_of": as_of.isoformat(),
        "input_revision": snapshot.get("cursor", 0),
        "knowledge": knowledge,
        "window": {"from": start, "to": on, "days": window_days},
        "readiness": readiness,
        "muscles": muscles,
        "modality_loads": loads,
        "ad_hoc_loads": events,
        "nutrition": nutrition,
        "goals": goals,
        "timeline": sorted(timeline.values(), key=lambda r: r["date"]),
        "capability": capability_series(capability),
        "coverage": {
            "missing": missing,
            "date_only_loads": len(uncertain),
            "unmapped_loads": unmapped,
            "interpretation": "Veri kapsaması; klinik güven olasılığı değildir.",
        },
        "input_lineage": sorted(lineage, key=lambda x: (x["kind"], x["id"])),
        "evidence_ids": [
            "exposure-decay",
            "session-rpe",
            "cycle-individual",
            "illness-return",
            "lab-reference",
        ],
        "calibration": {
            "status": "disabled",
            "reason": "Kişisel zamana sıralı doğrulama ve uzman incelemesi yok; başlangıç modeli kullanılıyor.",
        },
        "recovery_eta": None,
        "notice": "Tahmini kalan antrenman maruziyeti; ölçülmüş kas hasarı veya iyileşme yüzdesi değildir.",
    }
    relevant = {
        k: v for k, v in snapshot.items() if k not in ("server_time", "analysiss", "imports", "medias")
    }
    from .progression import propose

    result["progression"] = propose(snapshot, as_of, readiness)
    result["daily_context"] = []
    for index in range(window_days):
        current = (datetime.fromisoformat(start).date() + timedelta(days=index)).isoformat()
        n = nutrition_summary(snapshot, current)
        sleep_rows = [
            r
            for r in active(snapshot, "sleep")
            if instant(r["end_at"]) <= as_of
            and instant(r["end_at"]).astimezone(ZoneInfo(r.get("timezone") or zone)).date().isoformat()
            == current
        ]
        intervals = sorted((instant(r["start_at"]), instant(r["end_at"])) for r in sleep_rows)
        merged = []
        for a, b in intervals:
            if merged and a <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(b, merged[-1][1]))
            else:
                merged.append((a, b))
        result["daily_context"].append(
            {
                "date": current,
                "nutrition_status": n["status"],
                "energy_kcal": n["totals"]["kcal"],
                "protein_g": n["totals"]["protein_g"],
                "water_ml": n["water_ml"],
                "sleep_hours": sum((b - a).total_seconds() / 3600 for a, b in merged) if merged else None,
                "source_ids": n["source_ids"] + [r["id"] for r in sleep_rows],
            }
        )
    result["input_digest"] = hashlib.sha256(
        json.dumps(relevant, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    ).hexdigest()
    return result
