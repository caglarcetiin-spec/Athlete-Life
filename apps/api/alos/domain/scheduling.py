from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from ..errors import DomainError


def local_instant(day: date, value: str, zone: str, fold: int = 0) -> datetime:
    try:
        tz = ZoneInfo(zone)
        naive = datetime.combine(day, time.fromisoformat(value))
    except (ZoneInfoNotFoundError, ValueError):
        raise DomainError("invalid_time", "Tarih, saat veya saat dilimini kontrol et.") from None
    aware = naive.replace(tzinfo=tz, fold=fold)
    utc = aware.astimezone(UTC)
    roundtrip = utc.astimezone(tz)
    if roundtrip.replace(tzinfo=None) != naive or roundtrip.fold != fold:
        raise DomainError("nonexistent_local_time", "Bu saat, seçilen bölgede saat değişimi nedeniyle yok.")
    return utc


def shift_interval(
    day: date, start: str, end: str, zone: str, start_fold: int = 0, end_fold: int = 0
) -> tuple[datetime, datetime]:
    # Equal clocks mean a full next-day shift, never a negative interval.
    end_day = day + timedelta(days=1) if end <= start else day
    a = local_instant(day, start, zone, start_fold)
    b = local_instant(end_day, end, zone, end_fold)
    if b <= a:
        raise DomainError("invalid_interval", "Bitiş saati başlangıçtan sonra olmalı.")
    return a, b


def week_of(day: date, first: int = 0) -> date:
    return day - timedelta(days=(day.weekday() - first) % 7)


def clock(value: int) -> str:
    value %= 1440
    return f"{value // 60:02d}:{value % 60:02d}"


def propose_week(start: date, shifts: list[dict]) -> list[dict]:
    """Scheduling heuristic, not an exercise prescription or sleep measurement."""
    by_day = {s["local_date"]: s for s in shifts if not s.get("deleted_at")}
    rows = []
    for offset in range(7):
        key = (start + timedelta(days=offset)).isoformat()
        row = by_day.get(key)
        if not row:
            rows.append(
                {
                    "local_date": key,
                    "status": "unknown",
                    "window": None,
                    "reason": "Vardiya girilmedi. Uygun saat varsayılmadı.",
                    "input": None,
                }
            )
            continue
        if row["status"] == "work":
            h, m = map(int, row["end_local"].split(":"))
            candidate = h * 60 + m + row["commute_min"] + 45
            overnight = row["end_local"] <= row["start_local"]
            window = None if overnight or candidate >= 1440 else clock(candidate)
            reason = (
                "Gece vardiyası: önce uyku ve toparlanma zamanını belirle."
                if overnight
                else "İş çıkışı ve ulaşım sonrası bir seçenek; uygunsa sen seç."
            )
        else:
            window = "11:00"
            reason = "İzin günü için değiştirilebilir saat önerisi."
        if row["status"] == "work" and not overnight and candidate >= 1440:
            reason = (
                "İş çıkışı ve ulaşım sonrası saat ertesi güne taşıyor; bu gün için otomatik saat önerilmedi."
            )
        if row.get("social"):
            reason += " Sosyal planını da kontrol et; serbest metin saat olarak yorumlanmadı."
        rows.append(
            {
                "local_date": key,
                "status": row["status"],
                "window": window,
                "reason": reason,
                "pinned": row["pinned"],
                "input": {"id": row["id"], "version": row["version"]},
            }
        )
    return rows
