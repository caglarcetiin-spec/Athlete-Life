"""Explicit legacy record adapters; all unmapped values remain in source archive."""

from datetime import timedelta
from uuid import uuid5

from pydantic import ValidationError
from sqlalchemy import select

from .contracts import ShiftPatch
from .domain.scheduling import local_instant, shift_interval
from .errors import DomainError
from .legacy_workouts import day, number, stable
from .lifestyle import DEFINITIONS, REGISTRY
from .models import AthleteProfile, Shift
from .programming import touched


def migrate(db, athlete, run, data):
    changes = []
    warnings = []
    counts = {}
    goals = {}

    def mapping(value):
        return value if isinstance(value, dict) else {}

    def listing(value):
        return value if isinstance(value, list) else []

    def identity(path):
        return uuid5(athlete.id, run.source_digest + ":lifestyle:" + path)

    def add(kind, path, fields, extras=None):
        model, schema = REGISTRY[kind]
        try:
            parsed = schema.model_validate(fields).model_dump()
            if "local_date" in parsed and kind != "nutrition_day":
                parsed["timezone"] = athlete.timezone
            row = model(id=identity(path), athlete_id=athlete.id, source="legacy", **parsed, **(extras or {}))
            db.add(row)
            db.flush()
            changes.append(touched(row, kind))
            counts[kind] = counts.get(kind, 0) + 1
            return row
        except (ValidationError, ValueError, TypeError):
            warnings.append(path + ": biçim veya birim belirsiz; özgün kaydı arşivde korunuyor.")
            return None

    for when, r in mapping(data.get("scheduleByDate")).items():
        path = "/scheduleByDate/" + when
        if not day(when) or not isinstance(r, dict):
            warnings.append(path + ": kesin tarih/biçim yok; arşivde.")
            continue
        if db.scalar(
            select(Shift).where(
                Shift.athlete_id == athlete.id, Shift.local_date == day(when), Shift.deleted_at.is_(None)
            )
        ):
            warnings.append(path + ": mevcut vardiya korundu; kaynak vardiya arşivde karşılaştırılabilir.")
            continue
        status = r.get("status", r.get("workStatus"))
        pair = {"morning": ("10:00", "18:00"), "mid": ("12:00", "20:00"), "evening": ("14:00", "22:00")}.get(
            stable(r.get("shift", r.get("shiftType")))
        )
        start = r.get("start_local")
        end = r.get("end_local")
        if pair and not start and not end:
            start, end = pair
        try:
            if status not in ("work", "off", "annual"):
                raise ValueError("status")
            fields = ShiftPatch.model_validate(
                {
                    "local_date": when,
                    "status": status,
                    "start_local": start,
                    "end_local": end,
                    "social": str(r.get("social") or "")[:500],
                    "pinned": r.get("pinned") is True,
                }
            ).model_dump(exclude_unset=True)
            if status == "work" and (not start or not end):
                raise ValueError("hours")
            a, b = (
                shift_interval(day(when), start, end, athlete.timezone) if status == "work" else (None, None)
            )
            row = Shift(
                id=identity(path),
                athlete_id=athlete.id,
                source="legacy",
                timezone=athlete.timezone,
                start_at=a,
                end_at=b,
                **fields,
            )
            db.add(row)
            db.flush()
            changes.append(touched(row, "shift"))
            counts["shift"] = counts.get("shift", 0) + 1
        except (ValueError, ValidationError, DomainError):
            warnings.append(path + ": tarih veya vardiya saati belirsiz; arşivde.")
    for when, entries in mapping(data.get("foodLogs")).items():
        if not day(when):
            continue
        for i, r in enumerate(listing(entries)):
            if not isinstance(r, dict):
                continue
            macros = {
                new: number(r.get(old))
                for old, new in [
                    ("kcal", "kcal"),
                    ("p", "protein_g"),
                    ("c", "carbs_g"),
                    ("f", "fat_g"),
                    ("fiber", "fiber_g"),
                ]
            }
            add(
                "meal",
                f"/foodLogs/{when}/{i}",
                {
                    "local_date": when,
                    "name": str(r.get("name") or "Eski öğün")[:150],
                    "grams": number(r.get("grams")) or None,
                    **macros,
                },
                {
                    "nutrient_snapshot": {
                        "direct_portion": macros,
                        "source": "legacy-consumption",
                        "portion_label": r.get("serv"),
                        "servings": r.get("servings"),
                        "source_pointer": f"/foodLogs/{when}/{i}",
                    }
                },
            )
    water = mapping(data.get("water"))
    ledger = mapping(data.get("waterLogs"))
    for when in sorted(set(water) | set(ledger)):
        if not day(when):
            continue
        # A ledger is authoritative even when empty: legacy aggregate is a projection.
        rows = (
            listing(ledger[when])
            if isinstance(ledger.get(when), list)
            else [{"ml": water.get(when), "source": "legacy_total"}]
        )
        for i, r in enumerate(rows):
            if not isinstance(r, dict) or not number(r.get("ml")):
                continue
            add(
                "hydration",
                f"/water/{when}/{i}",
                {
                    "local_date": when,
                    "ml": r["ml"],
                    "note": "Eski su kaydı; " + str(r.get("source", ""))[:100],
                },
            )
    for when, r in mapping(data.get("daily")).items():
        if not day(when) or not isinstance(r, dict):
            continue
        check = {"local_date": when, "note": "Eski günlük; bilinmeyen ölçekler arşivde."}
        for key, old in [("fatigue", "fatigueLevel"), ("stress", "stress")]:
            if number(r.get(old)) is not None:
                check[key] = r[old]
        # Legacy energy was 1–5; do not silently interpret it on the 0–10 scale.
        if len(check) > 2:
            add("checkin", "/daily/" + when, check)
        if number(r.get("weight")):
            add(
                "measurement",
                "/daily/" + when + "/weight",
                {
                    "local_date": when,
                    "metric": "weight",
                    "value": r["weight"],
                    "unit": "kg",
                    "protocol": "legacy-self-report",
                },
            )
        if r.get("sleepTime") and r.get("wakeTime"):
            path = "/daily/" + when + "/sleep"
            try:
                if number(r.get("nightAwake")) not in (None, 0):
                    raise ValueError("unlocated awake interval")
                wake = day(when)
                start_day = wake - timedelta(days=1) if r["sleepTime"] >= r["wakeTime"] else wake
                a = local_instant(start_day, r["sleepTime"], athlete.timezone)
                b = local_instant(wake, r["wakeTime"], athlete.timezone)
                if not 0 < (b - a).total_seconds() < 86400:
                    raise ValueError("interval")
                model, _ = REGISTRY["sleep"]
                row = model(
                    id=identity(path),
                    athlete_id=athlete.id,
                    source="legacy",
                    start_at=a,
                    end_at=b,
                    timezone=athlete.timezone,
                    quality=None,
                    note="Eski saatler; uyanış tarihi kaynak günlük anahtarıdır. 1–5 kalite ölçeği arşivde korunur, 0–10 olarak yorumlanmadı.",
                )
                db.add(row)
                db.flush()
                changes.append(touched(row, "sleep"))
                counts["sleep"] = counts.get("sleep", 0) + 1
            except (ValueError, TypeError, DomainError):
                warnings.append(path + ": kesin uyku aralığı veya gece uyanıklığı çözümlenemedi; arşivde.")
    for when, entries in mapping(data.get("painLogs")).items():
        for i, r in enumerate(listing(entries)):
            if not isinstance(r, dict):
                continue
            if r.get("status") not in (None, "active"):
                warnings.append(f"/painLogs/{when}/{i}: aktif olmayan eski ağrı arşivde korundu.")
                continue
            add(
                "pain",
                f"/painLogs/{when}/{i}",
                {
                    "local_date": when,
                    "area": r.get("joint"),
                    "side": r.get("side", "unknown"),
                    "intensity": r.get("severity"),
                    "note": str(r.get("note") or "")[:1000],
                },
            )
    for i, report in enumerate(listing(data.get("healthLabRecords"))):
        if not isinstance(report, dict):
            continue
        for j, r in enumerate(listing(report.get("rows"))):
            path = f"/healthLabRecords/{i}/rows/{j}"
            if not isinstance(r, dict):
                continue
            if report.get("archivedAt"):
                warnings.append(path + ": arşivlenmiş ölçüm, güncel sonuç olarak aktarılmadı.")
                continue
            add(
                "lab",
                path,
                {
                    "local_date": report.get("date"),
                    "analyte": r.get("name"),
                    "comparator": r.get("comparator", "="),
                    "value": r.get("value"),
                    "unit": r.get("unit"),
                    "reference_low": r.get("low"),
                    "reference_high": r.get("high"),
                    "laboratory": str(report.get("lab") or "")[:150],
                    "method": str(r.get("method") or "")[:150],
                    "fasting": {"fasting": True, "nonfasting": False}.get(stable(report.get("fasting"))),
                    "note": str(report.get("notes") or "")[:1000],
                },
            )
    for i, r in enumerate(listing(data.get("bodyMeasurements"))):
        if not isinstance(r, dict) or not day(r.get("date")):
            continue
        for key, unit in [("weight", "kg"), ("waist", "cm"), ("height", "cm"), ("bodyfat", "percent")]:
            if number(r.get(key)):
                add(
                    "measurement",
                    f"/bodyMeasurements/{i}/{key}",
                    {
                        "local_date": r["date"],
                        "metric": key,
                        "value": r[key],
                        "unit": unit,
                        "protocol": "legacy-self-report",
                    },
                )
    for i, r in enumerate(listing(data.get("capabilityRecords"))):
        if not isinstance(r, dict) or not day(r.get("date")):
            continue
        definition = DEFINITIONS.get(stable(r.get("testId")), {})
        metric = definition.get("metric")
        value = r.get("value")
        unit = definition.get("unit") or {"seconds": "seconds", "reps": "reps", "load_reps": "kg"}.get(metric)
        if not definition or not unit:
            warnings.append(f"/capabilityRecords/{i}: test/birim belirsiz; arşivde.")
            continue
        components = {}
        if metric == "load_reps" or r.get("domain") == "strength":
            value = r.get("load")
            unit = "kg"
        if r.get("domain") == "running":
            value = r.get("minutes")
            unit = "min"
        for k, old in [
            ("reps", "reps"),
            ("bodyweight_kg", "bodyweight"),
            ("distance_km", "distanceKm"),
            ("external_kg", "load"),
        ]:
            if number(r.get(old)) is not None:
                components[k] = number(r[old])
        add(
            "capability",
            f"/capabilityRecords/{i}",
            {
                "local_date": r["date"],
                "definition_id": r["testId"],
                "protocol_version": "legacy-catalog-1",
                "variant": str(r.get("variant") or "legacy-unknown"),
                "side": r.get("side") if r.get("side") in ("left", "right", "both") else "unknown",
                "equipment": str(r.get("equipment") or ""),
                "value": number(value),
                "unit": unit,
                "components": components,
                "note": str(r.get("note") or ""),
            },
        )
    for i, r in enumerate(listing(data.get("athleteGoals"))):
        if not isinstance(r, dict):
            continue
        goal = add(
            "goal",
            f"/athleteGoals/{i}",
            {
                "title": r.get("title"),
                "metric": r.get("metric"),
                "variant": str(r.get("conditions") or ""),
                "baseline": r.get("baseline"),
                "target": r.get("target"),
                "unit": r.get("unit"),
                "start_date": r.get("startDate"),
                "target_date": r.get("targetDate"),
                "archived": bool(r.get("archivedAt")),
            },
        )
        if goal:
            goals[str(r.get("id"))] = goal.id
    for i, r in enumerate(listing(data.get("goalMeasurements"))):
        if not isinstance(r, dict) or str(r.get("goalId")) not in goals:
            continue
        add(
            "goal_measurement",
            f"/goalMeasurements/{i}",
            {
                "local_date": r.get("date"),
                "goal_id": goals[str(r["goalId"])],
                "value": r.get("value"),
                "note": str(r.get("conditions") or "")[:500],
            },
        )
    for i, r in enumerate(listing(data.get("healthEpisodes"))):
        if not isinstance(r, dict):
            continue
        add(
            "episode",
            f"/healthEpisodes/{i}",
            {
                "kind": r.get("kind"),
                "start_date": r.get("startDate"),
                "resolved_date": r.get("endDate"),
                "note": str(r.get("notes") or "")[:1500],
            },
        )
    profile = mapping(data.get("personalHealthProfile"))
    if profile and db.scalar(select(AthleteProfile).where(AthleteProfile.athlete_id == athlete.id)):
        warnings.append(
            "/personalHealthProfile: mevcut profil korundu; eski profil arşivde karşılaştırılabilir."
        )
        profile = {}
    if profile:
        add(
            "profile",
            "/personalHealthProfile",
            {
                "birth_date": profile.get("birthDate"),
                "sex": profile.get("sex")
                if profile.get("sex") in ("female", "male", "intersex")
                else "unspecified",
                "experience": profile.get("trainingHistory")
                if profile.get("trainingHistory") in ("new", "regular", "returning", "advanced")
                else "new",
                "cycle_tracking": profile.get("cycleTracking") is True,
            },
        )
    for when, r in mapping(data.get("cycleDays")).items():
        if not isinstance(r, dict):
            continue
        add(
            "cycle",
            "/cycleDays/" + when,
            {
                "local_date": when,
                "bleeding": {"medium": "moderate", "spotting": "light"}.get(
                    stable(r.get("bleeding")), r.get("bleeding") or "unknown"
                ),
                "symptoms": r.get("pain"),
                "note": str(r.get("notes") or "")[:1000],
            },
        )
    return changes, {
        "counts": counts,
        "warnings": warnings,
        "unmapped": "All original fields remain in legacy records and the source package.",
    }
