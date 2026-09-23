"""Read-only recalculation and explicit immutable decision snapshots."""

from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator
from sqlalchemy import select

from .contracts import StrictModel
from .domain.science import compute
from .errors import DomainError
from .models import AnalysisRun, Athlete, Change
from .programming import touched
from .service import MODELS, get_owned, register_lifestyle, serial


class AnalysisInput(StrictModel):
    as_of: datetime
    model_version: Literal["exposure-1", "exposure-1-conservative"] = "exposure-1"
    window_days: int = Field(default=28, ge=1, le=366)
    knowledge: Literal["recomputed", "as_known"] = "recomputed"

    @field_validator("as_of")
    @classmethod
    def aware(cls, value):
        if value.tzinfo is None:
            raise ValueError("Saat dilimi gerekli.")
        return value


def snapshot_in(db, athlete, knowledge_at=None):
    register_lifestyle()
    base = {"timezone": athlete.timezone, "cursor": athlete.sequence}
    if knowledge_at is None:
        for kind, model in MODELS.items():
            if kind in ("import", "media", "analysis"):
                continue
            base[kind + "s"] = [
                serial(r)
                for r in db.scalars(select(model).where(model.athlete_id == athlete.id).order_by(model.id))
            ]
    else:
        collected = {}
        base["cursor"] = 0
        for change in db.scalars(
            select(Change)
            .where(Change.athlete_id == athlete.id, Change.created_at <= knowledge_at)
            .order_by(Change.sequence)
        ):
            base["cursor"] = change.sequence
            for delta in change.changes:
                if delta["kind"] in ("import", "media", "analysis"):
                    continue
                collected.setdefault(delta["kind"], {})[delta["entity"]["id"]] = delta["entity"]
        for kind, rows in collected.items():
            base[kind + "s"] = list(rows.values())
    return base


def calculate(database, athlete_id, data, with_snapshot=False):
    with database.snapshot() as db:
        athlete = db.get(Athlete, athlete_id)
        snapshot = snapshot_in(db, athlete, data.as_of if data.knowledge == "as_known" else None)
        result = compute(snapshot, data.as_of, data.model_version, data.window_days, data.knowledge)
        return (result, snapshot) if with_snapshot else result


def apply(db, athlete, command):
    if command.command_type != "analysis.capture":
        raise DomainError("analysis_immutable", "Geçmiş kararlar değişmez; yeni hesap oluştur.")
    if get_owned(db, AnalysisRun, athlete.id, command.entity_id, command.expected_version, create=True):
        raise DomainError("analysis_immutable", "Geçmiş kararlar değişmez.", 409)
    data = AnalysisInput.model_validate(command.payload)
    snapshot = snapshot_in(db, athlete, data.as_of if data.knowledge == "as_known" else None)
    result = compute(snapshot, data.as_of, data.model_version, data.window_days, data.knowledge)
    row = AnalysisRun(
        id=command.entity_id,
        athlete_id=athlete.id,
        as_of=data.as_of,
        model_version=data.model_version,
        input_revision=result["input_revision"],
        input_digest=result["input_digest"],
        knowledge=data.knowledge,
        result=result,
    )
    db.add(row)
    db.flush()
    return row, None, [touched(row, "analysis")]
