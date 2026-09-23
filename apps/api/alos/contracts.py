from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Login(StrictModel):
    username: Annotated[str, StringConstraints(min_length=3, max_length=40)]
    password: Annotated[str, StringConstraints(min_length=8, max_length=128)]


class Signup(Login):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class Command(StrictModel):
    operation_id: UUID
    entity_id: UUID
    expected_version: int = Field(ge=0)
    schema_version: Literal[1] = 1
    command_type: Annotated[str, StringConstraints(max_length=80)]
    payload: dict


class ShiftPatch(StrictModel):
    local_date: date | None = None
    timezone: str | None = Field(default=None, max_length=80)
    status: Literal["work", "off", "annual"] | None = None
    start_local: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    end_local: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    start_fold: int | None = Field(default=None, ge=0, le=1)
    end_fold: int | None = Field(default=None, ge=0, le=1)
    social: str | None = Field(default=None, max_length=500)
    commute_min: int | None = Field(default=None, ge=0, le=720)
    prep_min: int | None = Field(default=None, ge=0, le=720)
    sleep_target_min: int | None = Field(default=None, ge=60, le=1440)
    pinned: bool | None = None

    @field_validator(
        "local_date",
        "timezone",
        "status",
        "social",
        "commute_min",
        "prep_min",
        "sleep_target_min",
        "start_fold",
        "end_fold",
        "pinned",
    )
    @classmethod
    def explicit_null_rejected(cls, value):
        if value is None:
            raise ValueError("Bu alan boş olamaz.")
        return value


class Optimize(StrictModel):
    week_start: date
    input_cursor: int = Field(ge=0)


class Empty(StrictModel):
    pass


class EntityChange(StrictModel):
    kind: str
    entity: dict


class CommandResult(StrictModel):
    operation_id: UUID
    cursor: int
    entity: dict
    changes: list[EntityChange]
    committed_at: str


class BootstrapResult(StrictModel):
    api_version: Literal[2] = 2
    schema_version: Literal[1] = 1
    athlete_id: UUID
    cursor: int
    generation: UUID
    timezone: str
    week_start: int
    day_boundary_hour: int
    shifts: list[dict]
    optimizations: list[dict]
