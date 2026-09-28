"""User-reported planning context and explicitly approved availability, not diagnoses."""

from copy import deepcopy
from datetime import date, timedelta
from typing import Literal

from pydantic import Field, model_validator

from .contracts import StrictModel


class CyclePlanning(StrictModel):
    applicable: Literal["yes", "no", "unspecified"] = "unspecified"
    last_start: date | None = None
    length_days: int | None = Field(default=None, ge=15, le=90)
    bleeding_days: int | None = Field(default=None, ge=1, le=14)
    preference: Literal["continue", "pause", "decide"] = "decide"
    confirm_estimated_breaks: bool = False

    @model_validator(mode="after")
    def consistent(self):
        if self.applicable != "yes" and (
            self.last_start or self.length_days or self.bleeding_days or self.confirm_estimated_breaks
        ):
            raise ValueError("Döngü takibi seçilmediğinde tarih bilgisi gönderilmez.")
        if (
            self.preference == "pause"
            and self.applicable == "yes"
            and (not self.last_start or not self.bleeding_days)
        ):
            raise ValueError(
                "Ara verilecek günler için son başlangıcı ve kanama süresini gir veya gün gün karar ver seç."
            )
        if self.confirm_estimated_breaks and (self.preference != "pause" or not self.length_days):
            raise ValueError(
                "Tahmini ara günlerini onaylamak için döngü uzunluğu ve ara verme tercihi gerekli."
            )
        return self


class AthleteIntake(StrictModel):
    age_years: int = Field(ge=13, le=100)
    height_cm: float = Field(ge=70, le=250)
    weight_kg: float = Field(ge=20, le=400)
    sex: Literal["female", "male", "intersex", "unspecified"]
    training_months: int = Field(ge=0, le=1000)
    recorded_on: date
    cycle: CyclePlanning = Field(default_factory=CyclePlanning)

    @model_validator(mode="after")
    def dates(self):
        if self.cycle.last_start and self.cycle.last_start > self.recorded_on:
            raise ValueError("Son adet başlangıcı kayıt gününden sonra olamaz.")
        return self


def break_dates(intake, start, weeks):
    if not intake or intake.cycle.applicable != "yes" or intake.cycle.preference != "pause":
        return []
    c = intake.cycle
    if not c.last_start or not c.bleeding_days:
        return []
    end = start + timedelta(weeks=weeks)
    first = c.last_start
    dates = set()
    if c.confirm_estimated_breaks and c.length_days:
        # Skip old cycles without iterating over years of history.
        skip = max(0, ((start - first).days - c.bleeding_days) // c.length_days)
        first += timedelta(days=skip * c.length_days)
    while first < end:
        for offset in range(c.bleeding_days):
            day = first + timedelta(days=offset)
            if start <= day < end:
                dates.add(day.isoformat())
        if not c.confirm_estimated_breaks or not c.length_days:
            break
        first += timedelta(days=c.length_days)
    return sorted(dates)


def schedule_breaks(program, intake):
    start = date.fromisoformat(str(program["start_date"]))
    blocked = set(break_dates(intake, start, program["weeks"]))
    if not blocked:
        return program, []
    result = deepcopy(program)
    result["days"] = []
    for day in program["days"]:
        for week in range(day.get("first_week", 1), (day.get("last_week") or program["weeks"]) + 1):
            week_start = start + timedelta(weeks=week - 1)
            scheduled = week_start + timedelta(days=(day["weekday"] - week_start.weekday()) % 7)
            row = deepcopy(day)
            row.update(first_week=week, last_week=week)
            if scheduled.isoformat() in blocked and row["kind"] == "training":
                row.update(kind="rest", label="Tercihine göre dinlenme", exercises=[])
            result["days"].append(row)
    return result, [
        "Tercihine göre dinlenme tarihleri: " + ", ".join(sorted(blocked)),
        "Gelecek döngüye ait tarihler yalnız onayladığın takvim tahminidir. Başlangıç değişirse yeni plan taslağı oluştur. Atlanan seans başka güne eklenmez; diğer günlerin dozu artmaz.",
    ]
