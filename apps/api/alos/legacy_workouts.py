"""Conservative adapter: only explicit structured targets/actuals become canonical.
Every original field stays in the immutable source. Ambiguity is reported, never guessed.
"""

from datetime import date
from uuid import uuid5

from pydantic import ValidationError
from sqlalchemy import select

from .db import utcnow
from .domain.workouts import Targets
from .models import (
    PerformedSet,
    Prescription,
    PrescriptionSlot,
    Program,
    ProgramDay,
    ProgramExercise,
    WorkoutSession,
)
from .programming import touched


def day(value):
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        return None


def number(value):
    try:
        if value in ("", None):
            return None
        result = float(str(value).replace(",", "."))
        return result if result >= 0 and result < float("inf") else None
    except (ValueError, TypeError):
        return None


def stable(value):
    return str(value) if isinstance(value, (str, int)) and not isinstance(value, bool) else None


def listing(value):
    return value if isinstance(value, list) else []


def legacy_targets(step):
    if not isinstance(step, dict):
        raise TypeError("step")
    name = str(step.get("name") or "Adsız eski hareket")[:150]
    kind = stable(step.get("type"))
    return Targets(
        movement_id=str(step.get("movement_id") or step.get("id") or "legacy:" + name)[:100],
        name=name,
        variant=str(step.get("variant") or "legacy-unknown")[:150],
        modality={
            "resistance": "strength",
            "skill": "skill",
            "interval": "cardio",
            "segment": "cardio",
            "STATIC": "isometric",
        }.get(kind, "strength"),
        reps=int(number(step.get("reps"))) if number(step.get("reps")) is not None else None,
        seconds=number(step.get("seconds")),
        distance_m=number(step.get("distanceM")),
        external_kg=number(step.get("loadKg", step.get("load"))),
        rir=number(step.get("rir")),
        rest_seconds=int(number(step.get("restSec"))) if number(step.get("restSec")) is not None else None,
    )


def migrate(db, athlete, run, data):
    changes = []
    warnings = []
    counts = {"program": 0, "session": 0, "set": 0}
    active_exists = (
        db.scalar(
            select(Program.id).where(
                Program.athlete_id == athlete.id, Program.status == "active", Program.deleted_at.is_(None)
            )
        )
        is not None
    )
    settings = data.get("settings") if isinstance(data.get("settings"), dict) else {}
    pinned = stable(settings.get("pinnedPeriodId"))

    def identity(path):
        return uuid5(athlete.id, run.source_digest + ":canonical:" + path)

    for index, period in enumerate(
        data.get("multisportPeriods", []) if isinstance(data.get("multisportPeriods"), list) else []
    ):
        if not isinstance(period, dict):
            continue
        start = day(period.get("startDate"))
        weeks = number(period.get("weeks"))
        if not start or not weeks or not 1 <= weeks <= 52:
            warnings.append(f"multisportPeriods/{index}: tarih/hafta belirsiz; arşivde korundu.")
            continue
        blocks = period.get("blocks", [])
        if not isinstance(blocks, list):
            continue
        p = Program(
            id=identity("period/" + str(index)),
            athlete_id=athlete.id,
            name=str(period.get("name") or "Eski dönem")[:150],
            goal=str(period.get("goal") or "Eski kayıtta hedef belirtilmemiş")[:1000],
            start_date=start,
            weeks=int(weeks),
            status="active"
            if pinned is not None
            and pinned == stable(period.get("id"))
            and not active_exists
            and not period.get("archivedOn")
            else "archived",
            model_version="legacy-preserved-1",
            decisions={"source_pointer": "/multisportPeriods/" + str(index), "unverified": True},
            source="legacy",
        )
        db.add(p)
        db.flush()
        changes.append(touched(p, "program"))
        counts["program"] += 1
        if p.status == "active":
            active_exists = True
        for bi, block in enumerate(blocks):
            if (
                not isinstance(block, dict)
                or not isinstance(block.get("day"), int)
                or not 0 <= block["day"] <= 6
            ):
                warnings.append(f"multisportPeriods/{index}/blocks/{bi}: gün belirsiz; arşivde korundu.")
                continue
            d = ProgramDay(
                id=identity(f"period/{index}/day/{bi}"),
                athlete_id=athlete.id,
                program_id=p.id,
                weekday=block["day"],
                label=str(block.get("name") or block.get("sportId") or "Çalışma")[:120],
                kind="training",
                source="legacy",
            )
            db.add(d)
            db.flush()
            changes.append(touched(d, "program_day"))
            for ei, step in enumerate(block.get("steps", []) if isinstance(block.get("steps"), list) else []):
                try:
                    targets = legacy_targets(step)
                    sets = int(step.get("sets", 0))
                    if not 1 <= sets <= 30:
                        raise ValueError("sets")
                    exercise = ProgramExercise(
                        id=identity(f"period/{index}/day/{bi}/exercise/{ei}"),
                        athlete_id=athlete.id,
                        day_id=d.id,
                        position=ei,
                        sets=sets,
                        source="legacy",
                        **targets.model_dump(),
                    )
                    db.add(exercise)
                    db.flush()
                    changes.append(touched(exercise, "program_exercise"))
                except (ValidationError, ValueError, TypeError, AttributeError):
                    warnings.append(
                        f"multisportPeriods/{index}/blocks/{bi}/steps/{ei}: hedef biçimi belirsiz; arşivde korundu."
                    )
    sport_ids = set()

    def make_session(path, when, title, status="completed"):
        s = WorkoutSession(
            id=identity(path),
            athlete_id=athlete.id,
            local_date=when,
            timezone=athlete.timezone,
            title=str(title)[:150],
            status=status,
            time_precision="date_only",
            source="legacy",
        )
        db.add(s)
        db.flush()
        changes.append(touched(s, "session"))
        counts["session"] += 1
        return s

    def make_set(path, session, targets, slot_id=None):
        if not any((targets.reps, targets.seconds, targets.distance_m)):
            return
        row = PerformedSet(
            id=identity(path),
            athlete_id=athlete.id,
            session_id=session.id,
            slot_id=slot_id,
            local_date=session.local_date,
            timezone=session.timezone,
            time_precision="date_only",
            status="completed",
            source="legacy",
            **targets.model_dump(),
        )
        db.add(row)
        db.flush()
        changes.append(touched(row, "set"))
        counts["set"] += 1

    for si, sport in enumerate(
        data.get("sportSessions", []) if isinstance(data.get("sportSessions"), list) else []
    ):
        if not isinstance(sport, dict) or not (when := day(sport.get("date"))):
            continue
        s = make_session("sport/" + str(si), when, sport.get("sportId") or "Eski branş seansı")
        if stable(sport.get("id")) is not None:
            sport_ids.add(stable(sport.get("id")))
        workout = sport.get("workout") or {}
        if not isinstance(workout, dict):
            continue
        steps = {
            stable(step.get("id")): step
            for step in listing(workout.get("steps"))
            if isinstance(step, dict) and stable(step.get("id")) is not None
        }
        for ai, actual in enumerate(
            workout.get("actual", []) if isinstance(workout.get("actual"), list) else []
        ):
            if not isinstance(actual, dict) or actual.get("done") is not True:
                continue
            step = steps.get(stable(actual.get("stepId")))
            if not step:
                warnings.append(f"sportSessions/{si}/actual/{ai}: hareket eşleşmiyor; arşivde.")
                continue
            try:
                make_set(f"sport/{si}/set/{ai}", s, legacy_targets({**step, **actual}))
            except (ValidationError, TypeError, ValueError):
                warnings.append(f"sportSessions/{si}/actual/{ai}: değer birimi belirsiz; arşivde.")
    guided = {}
    active_run = data.get("activeWorkoutRun")
    if (
        isinstance(active_run, dict)
        and day(active_run.get("date"))
        and isinstance(active_run.get("steps"), list)
    ):
        actual = [
            a for a in listing(active_run.get("actual")) if isinstance(a, dict) and a.get("done") is True
        ]
        rx = Prescription(
            id=identity("active-run/rx"),
            athlete_id=athlete.id,
            scheduled_date=day(active_run["date"]),
            timezone=athlete.timezone,
            title="Eski açık çalışma",
            locked_at=utcnow() if actual else None,
            source="legacy",
            decision={"model_version": "legacy-preserved-1", "source_pointer": "/activeWorkoutRun"},
        )
        db.add(rx)
        db.flush()
        changes.append(touched(rx, "prescription"))
        s = make_session(
            "active-run/session",
            day(active_run["date"]),
            "Eski açık çalışma",
            "paused" if actual else "ready",
        )
        s.prescription_id = rx.id
        db.flush()
        slots = {}
        ordinal = 0
        for ei, step in enumerate(active_run["steps"]):
            try:
                targets = legacy_targets(step)
                total = int(step.get("sets", 0))
                if not 1 <= total <= 30:
                    continue
                for index in range(total):
                    slot = PrescriptionSlot(
                        id=identity(f"active-run/slot/{ei}/{index}"),
                        athlete_id=athlete.id,
                        prescription_id=rx.id,
                        ordinal=ordinal,
                        set_index=index,
                        source="legacy",
                        **targets.model_dump(),
                    )
                    db.add(slot)
                    db.flush()
                    changes.append(touched(slot, "slot"))
                    slots[(stable(step.get("id")), index)] = slot
                    ordinal += 1
            except (ValidationError, ValueError, TypeError, AttributeError):
                warnings.append(f"activeWorkoutRun/steps/{ei}: slot güvenle çözümlenemedi; arşivde.")
        for index, a in enumerate(actual):
            slot = (
                slots.get((stable(a.get("stepId")), a.get("index")))
                if isinstance(a.get("index"), int) and stable(a.get("stepId")) is not None
                else None
            )
            if slot:
                values = {k: getattr(slot, k) for k in Targets.model_fields}
                values.update(
                    reps=number(a.get("reps")),
                    seconds=number(a.get("seconds")),
                    distance_m=number(a.get("distanceM")),
                    external_kg=number(a.get("loadKg")),
                    rir=number(a.get("rir")),
                )
                try:
                    make_set(f"active-run/actual/{index}", s, Targets(**values), slot.id)
                except ValidationError:
                    warnings.append(f"activeWorkoutRun/actual/{index}: belirsiz; arşivde.")
        changes.append(touched(s, "session"))
    old_guided = data.get("activeGuidedWorkout")
    if (
        isinstance(old_guided, dict)
        and isinstance(old_guided.get("items"), list)
        and day(old_guided.get("targetDate"))
    ):
        when = day(old_guided.get("actualAthleteDay")) or day(old_guided["targetDate"])
        rx = Prescription(
            id=identity("guided/rx"),
            athlete_id=athlete.id,
            scheduled_date=day(old_guided["targetDate"]),
            timezone=athlete.timezone,
            title=str(old_guided.get("planName") or "Eski yönlendirmeli çalışma")[:150],
            source="legacy",
            decision={
                "model_version": "legacy-preserved-1",
                "source_pointer": "/activeGuidedWorkout",
                "original_items": old_guided["items"],
            },
        )
        db.add(rx)
        db.flush()
        changes.append(touched(rx, "prescription"))
        s = make_session(
            "guided/session",
            when,
            rx.title,
            "completed" if old_guided.get("phase") == "complete" else "paused",
        )
        s.prescription_id = rx.id
        db.flush()
        slots = {}
        ordinal = 0
        for ei, item in enumerate(old_guided["items"]):
            if not isinstance(item, dict):
                continue
            total = number(item.get("setCount"))
            if not total or not 1 <= total <= 30:
                continue
            metric = item.get("metric")
            low = number(item.get("resultMin"))
            high = number(item.get("resultMax"))
            value = low if low == high else None
            for index in range(int(total)):
                try:
                    targets = Targets(
                        movement_id="legacy:" + str(item.get("name", "movement"))[:90],
                        name=str(item.get("name") or "Eski hareket")[:150],
                        variant="legacy-unknown",
                        modality="isometric"
                        if metric == "seconds"
                        else "cardio"
                        if metric in ("minutes", "km")
                        else "strength",
                        reps=int(value) if value is not None and metric == "reps" else None,
                        seconds=value * (60 if metric == "minutes" else 1)
                        if value is not None and metric in ("seconds", "minutes")
                        else None,
                        distance_m=value * 1000 if value is not None and metric == "km" else None,
                        external_kg=number(item.get("load")),
                        rir=number(item.get("targetRir")),
                    )
                except (ValidationError, ValueError, TypeError):
                    warnings.append(f"activeGuidedWorkout/items/{ei}: hedef belirsiz; arşivde.")
                    continue
                slot = PrescriptionSlot(
                    id=identity(f"guided/slot/{ei}/{index}"),
                    athlete_id=athlete.id,
                    prescription_id=rx.id,
                    ordinal=ordinal,
                    set_index=index,
                    source="legacy",
                    **targets.model_dump(),
                )
                db.add(slot)
                db.flush()
                slots[(ei, index)] = slot
                changes.append(touched(slot, "slot"))
                ordinal += 1
        guided[stable(old_guided.get("id"))] = (s, slots, rx)
        changes.append(touched(s, "session"))
    logs = data.get("trainingLogs", {})
    if isinstance(logs, dict):
        for date_key, rows in logs.items():
            when = day(date_key)
            if not when or not isinstance(rows, list):
                continue
            for ri, entry in enumerate(rows):
                if not isinstance(entry, dict):
                    continue
                if (
                    entry.get("source") == "sport_program"
                    and stable(entry.get("sportSessionId")) in sport_ids
                ):
                    continue
                when = day(entry.get("athleteDay")) or when
                linked = (
                    guided.get(stable(entry.get("guidedSessionId")))
                    if stable(entry.get("guidedSessionId")) is not None
                    else None
                )
                s = (
                    linked[0]
                    if linked
                    else make_session(f"log/{date_key}/{ri}", when, entry.get("name") or "Eski hareket")
                )
                for i, value in enumerate(
                    entry.get("sets", []) if isinstance(entry.get("sets"), list) else []
                ):
                    val = number(value.get("reps") if isinstance(value, dict) else value)
                    if val is None:
                        continue
                    step = {
                        **entry,
                        "reps": int(val) if entry.get("type") != "STATIC" else None,
                        "seconds": val if entry.get("type") == "STATIC" else None,
                    }
                    try:
                        slot = linked[1].get((entry.get("guidedExerciseIndex"), i)) if linked else None
                        make_set(
                            f"log/{date_key}/{ri}/set/{i}", s, legacy_targets(step), slot.id if slot else None
                        )
                        if linked:
                            linked[2].locked_at = utcnow()
                            changes.append(touched(linked[2], "prescription"))
                    except (ValidationError, TypeError, ValueError):
                        warnings.append(f"trainingLogs/{date_key}/{ri}/sets/{i}: belirsiz; arşivde.")
    if (data.get("activeGuidedWorkout") and not guided) or (
        data.get("activeWorkoutRun")
        and (not isinstance(active_run, dict) or not isinstance(active_run.get("steps"), list))
    ):
        warnings.append(
            "Eski açık Runner, orijinal reçete/slot eşlemesi doğrulanana kadar arşivde devam bilgisiyle korunur; otomatik yeni seansa dönüştürülmedi."
        )
    return changes, {"counts": counts, "warnings": warnings, "adapter": "legacy-workout-1"}
