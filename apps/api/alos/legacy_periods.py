"""Preserve the explicit legacy weekly planner, including ranges and light weeks."""

import json
import math
from pathlib import Path
from uuid import uuid5

from pydantic import ValidationError

from .contracts import Command
from .legacy_workouts import day, listing, number
from .models import Program, ProgramDay, ProgramExercise
from .programming import ProgramInput, apply_program, touched

MOVEMENTS = json.loads((Path(__file__).parent / "catalogs/movements.json").read_text())


def migrate(db, athlete, run, data):
    changes = []
    warnings = []
    count = 0
    for pi, period in enumerate(listing(data.get("trainingPeriods"))):
        pointer = f"/trainingPeriods/{pi}"
        if (
            not isinstance(period, dict)
            or not day(period.get("startDate"))
            or not isinstance(period.get("weekly"), list)
            or len(period["weekly"]) != 7
        ):
            warnings.append(pointer + ": kesin tarih veya yedi günlük yapı yok; ham arşivde.")
            continue
        weeks = number(period.get("weeks"))
        if not weeks or not weeks.is_integer() or not 1 <= weeks <= 52:
            warnings.append(pointer + ": hafta sayısı belirsiz; ham arşivde.")
            continue
        days = []
        every = number(period.get("deloadEvery"))
        for week in range(1, int(weeks) + 1):
            lighter = every in (3, 4, 6) and week % every == 0
            for weekday, rows in enumerate(period["weekly"]):
                exercises = []
                for ri, row in enumerate(listing(rows)):
                    if not isinstance(row, dict):
                        continue
                    knowledge = MOVEMENTS.get(str(row.get("name")), {})
                    unit = knowledge.get("metric")
                    low = number(row.get("min"))
                    high = number(row.get("max"))
                    sets = number(row.get("sets"))
                    if (
                        unit not in ("reps", "seconds", "minutes", "km")
                        or low is None
                        or high is None
                        or low <= 0
                        or high < low
                        or not sets
                        or not sets.is_integer()
                        or sets > 30
                    ):
                        warnings.append(
                            f"{pointer}/weekly/{weekday}/{ri}: hedef/birim belirsiz; ham arşivde."
                        )
                        continue
                    factor = 60 if unit == "minutes" else 1000 if unit == "km" else 1
                    modality = (
                        "isometric"
                        if knowledge.get("type") == "STATIC"
                        else "cardio"
                        if unit in ("minutes", "km") or "RUN" in str(knowledge.get("type"))
                        else "strength"
                    )
                    load = number(row.get("load"))
                    exercises.append(
                        {
                            "movement_id": str(row["name"])[:100],
                            "name": str(row["name"])[:150],
                            "variant": "legacy-preserved",
                            "modality": modality,
                            "sets": max(1, math.floor(sets * (0.65 if lighter else 1) + 0.5)),
                            "target_range": {
                                "unit": "m"
                                if unit == "km"
                                else "seconds"
                                if unit in ("seconds", "minutes")
                                else "reps",
                                "minimum": low * factor,
                                "maximum": high * factor,
                            },
                            "external_kg": round(load * (0.9 if lighter else 1), 6)
                            if load is not None
                            else None,
                            "rir": number(row.get("rir")),
                            "rest_seconds": number(row.get("rest")),
                        }
                    )
                days.append(
                    {
                        "weekday": weekday,
                        "first_week": week,
                        "last_week": week,
                        "label": ("Hafif hafta" if lighter else "Çalışma") + f" · {week}. hafta",
                        "kind": "training" if exercises else "rest",
                        "exercises": exercises,
                    }
                )
        payload = {
            "name": str(period.get("name") or "Eski dönem")[:150],
            "goal": str(period.get("model") or period.get("goal") or "Eski dönem hedefi")[:1000],
            "start_date": period["startDate"],
            "weeks": int(weeks),
            "days": days,
        }
        try:
            ProgramInput.model_validate(payload)
        except ValidationError:
            warnings.append(pointer + ": dönem hedefleri doğrulanamadı; tamamı ham arşivde.")
            continue
        command = Command(
            operation_id=uuid5(athlete.id, run.source_digest + pointer + ":operation"),
            entity_id=uuid5(athlete.id, run.source_digest + pointer),
            expected_version=0,
            schema_version=1,
            command_type="program.create",
            payload=payload,
        )
        program, _, deltas = apply_program(db, athlete, command)
        program.status = "archived"
        program.decisions = {
            **program.decisions,
            "source_pointer": pointer,
            "legacy_model": period.get("model"),
            "legacy_progression": period.get("progression"),
            "legacy_deload_every": period.get("deloadEvery"),
            "missing": program.decisions["missing"]
            + ["Eski dönem kütüphanede korundu. Yeni sürümünü inceleyip yalnız sen ana plana alabilirsin."],
        }
        for delta in deltas:
            model = {"program": Program, "program_day": ProgramDay, "program_exercise": ProgramExercise}[
                delta["kind"]
            ]
            entity = db.get(model, delta["entity"]["id"])
            entity.source = "legacy"
            db.flush()
            changes.append(touched(entity, delta["kind"]))
        count += 1
    return changes, {
        "programs": count,
        "warnings": list(dict.fromkeys(warnings)),
        "policy": "Preserved library only; no automatic active plan replacement.",
    }
