"""Pure, clock-injected decision support. Outputs are not tissue measurements."""

import hashlib
import json
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from ..errors import DomainError
from ..lifestyle import capability_series, nutrition_summary
from ..movements import VERSION as CATALOG_VERSION
from ..movements import resolve
from ..sports import BY_SPORT
from .recovery import contribution, summarize

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
    end = datetime.combine(
        datetime.fromisoformat(local).date() + timedelta(days=1),
        time.min,
        ZoneInfo(row.get("timezone") or zone),
    ).astimezone(UTC)
    if start > as_of:
        return None
    return start, min(end, as_of), end > as_of


def movement(row):
    return resolve(row)["definition"]


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
    distribution = {}
    recovery_entries = []
    unmapped = []
    uncertain = []
    missing = []
    set_rows = []
    for row in active(snapshot, "set"):
        if row.get("local_date", "") < start:
            continue
        if row.get("status") == "skipped":
            continue
        bounds = date_bounds(row, as_of, zone)
        if bounds is None:
            continue
        earliest, latest, partial = bounds
        modality = row.get("modality", "strength")
        resolution = resolve(row)
        definition = resolution["definition"]
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
        if definition and not definition.get("muscles"):
            unmapped.append(
                {
                    "id": row["id"],
                    "code": "missing_mapping",
                    "candidates": resolution["candidates"],
                    "reason": "Katalogda bu hareket için kas dağılımı tanımlanmamış.",
                }
            )
            continue
        if not definition or amount is None:
            unmapped.append(
                {
                    "id": row["id"],
                    "code": resolution["status"] if not definition else "missing_quantity",
                    "candidates": resolution["candidates"],
                    "reason": "Hareket eşleşmiyor."
                    if not definition and resolution["status"] == "unmatched"
                    else "Birden fazla hareket adayı var; katalogdan seç."
                    if not definition
                    else "Çalışma türüne uygun miktar bilinmiyor.",
                }
            )
            continue
        half = MODELS[model_version][modality]
        for group, weight in definition.get("muscles", {}).items():
            if not isinstance(weight, (float, int)) or not 0 <= weight <= 1:
                continue
            entry = contribution(row, amount, group, weight, earliest, latest, half)
            if entry is not None:
                recovery_entries.append(entry)
            recorded = distribution.setdefault(group, {}).setdefault(
                modality, {"amount": 0.0, "unit": UNITS[modality], "source_ids": []}
            )
            recorded["amount"] += float(amount) * weight
            recorded["source_ids"].append(row["id"])
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
            "Devam eden rahatsızlık veya kaydettiğin dönüş aralığı var. Bu kayıt tıbbi antrenman uygunluğu belirlemez; sayısal program değişikliği yapılmadı."
        )
    if any(r["intensity"] > 0 for r in pains):
        reasons.append("Ağrı bildirimi var; kas haritası antrenmana uygunluk onayı değildir.")
    if check and check.get("fatigue") is not None and check["fatigue"] >= 7:
        reasons.append(
            "Yorgunluk bildirimini planı gözden geçirirken dikkate al. Bu kayıt tek başına sayısal doz önerisi üretmez."
        )
    if any(r.get("symptoms") is not None and r["symptoms"] >= 7 for r in cycles):
        reasons.append(
            "Döngü belirti kaydın var; fazdan otomatik performans cezası veya doz değişikliği üretilmedi."
        )
    if not check:
        missing.append("Bugünün enerji/yorgunluk öz-bildirimi")
    profiles = active(snapshot, "profile")
    modules = (
        (profiles[0].get("planning_preferences") or {}).get(
            "optional_modules", ["nutrition", "sleep", "hydration"]
        )
        if profiles
        else ["nutrition", "sleep", "hydration"]
    )
    if recent_sleep is None and "sleep" in modules:
        missing.append("Son iki günde biten uyku kaydı")
    nutrition = nutrition_summary(snapshot, on)
    if nutrition["status"] != "complete" and "nutrition" in modules:
        missing.append("Tamamlanmış beslenme günlüğü")
    if nutrition["water_ml"] is None and "hydration" in modules:
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
        span = goal["target"] - goal["baseline"]
        progress = ((latest["value"] - goal["baseline"]) / span * 100 or 0.0) if span else None
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
    branch_practice = {}
    timeline = {}
    for row in set_rows:
        definition = resolve(row)["definition"]
        if definition and definition.get("sport_id"):
            sport = definition["sport_id"]
            method = definition["method"]
            summary = branch_practice.setdefault(
                (sport, method),
                {
                    "sport_id": sport,
                    "sport": BY_SPORT[sport]["name"],
                    "method": method,
                    "physical": definition["physical"],
                    "recorded_rounds": 0,
                    "known_seconds": None,
                    "missing_duration_rounds": 0,
                    "source_ids": [],
                },
            )
            summary["recorded_rounds"] += 1
            if row.get("seconds") is None:
                summary["missing_duration_rounds"] += 1
            else:
                summary["known_seconds"] = (summary["known_seconds"] or 0) + row["seconds"]
            summary["source_ids"].append(row["id"])
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
        "catalog_version": CATALOG_VERSION,
        "calculation_revision": "unified-revision-2",
        "optional_modules": modules,
        "as_of": as_of.isoformat(),
        "input_revision": snapshot.get("cursor", 0),
        "knowledge": knowledge,
        "window": {"from": start, "to": on, "days": window_days},
        "readiness": readiness,
        "muscles": muscles,
        "recorded_distribution": distribution,
        "set_counts": {
            kind: sum(r.get("set_kind", "unknown") == kind for r in set_rows)
            for kind in ("working", "warmup", "unknown")
        },
        "effort_policy": {
            "used": "RIR when present; otherwise RPE",
            "warning_ids": [
                r["id"] for r in set_rows if r.get("rir") is not None and r.get("rpe") is not None
            ],
            "meaning": "İki efor alanı birlikte girildiğinde dönüşüm varsayılmaz; RIR önceliklidir. Bilgileri gözden geçir.",
        },
        "branch_practice": list(branch_practice.values()),
        "modality_loads": loads,
        "ad_hoc_loads": events,
        "nutrition": nutrition,
        "goals": goals,
        "timeline": sorted(timeline.values(), key=lambda r: r["date"]),
        "capability": capability_series(capability),
        "coverage": {
            "total_sets": len(set_rows),
            "analyzed_sets": len(set_rows) - len(unmapped),
            "missing": missing,
            "date_only_loads": len(uncertain),
            "unmapped_loads": unmapped,
            "interpretation": "Veri kapsaması; klinik güven olasılığı değildir.",
        },
        "input_lineage": sorted(lineage, key=lambda x: (x["kind"], x["id"])),
        "evidence_ids": [
            "exposure-decay",
            "load-reserve",
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

    period_sessions = [r for r in active(snapshot, "session") if start <= r.get("local_date", "") <= on]
    period_prescriptions = [r for r in active(snapshot, "prescription") if start <= r["scheduled_date"] <= on]
    result["period_summary"] = {
        "planned_materialized_sessions": len(period_prescriptions),
        "completed_sessions": sum(r["status"] == "completed" for r in period_sessions),
        "actual_sets": len(set_rows),
        "plan_versions": sorted({r["program_id"] for r in period_prescriptions}),
        "meaning": "Payda yalnız tarihe bağlanmış plan hedeflerini içerir. Kaydı olmayan gün yapılmadı sayılmaz; eski seanslar yeni planla yeniden yazılmaz.",
        "session_feedback": [
            {"id": r["id"], "local_date": r["local_date"], "feedback": r.get("feedback", {})}
            for r in period_sessions
        ],
    }
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
    result["report_records"] = {
        kind + "s": [r for r in active(snapshot, kind) if start <= r.get("local_date", "") <= on]
        for kind in ("lab", "pain")
    }
    result["report_records"]["sets"] = set_rows
    result["muscle_recovery"] = summarize(recovery_entries, as_of)
    result["input_digest"] = hashlib.sha256(
        json.dumps(relevant, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    ).hexdigest()
    return result
