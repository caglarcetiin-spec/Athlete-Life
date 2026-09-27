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
        window, window_date = None, None
        required = (
            "available_start_local",
            "available_end_local",
            "sleep_start_local",
            "sleep_end_local",
            "training_minutes",
        )
        if any(not row.get(k) for k in required):
            reason = "Uygun saat aralığı, planlanan uyku penceresi ve antrenman süresi gerekli; eksik saatten takvim üretilmedi."
        else:
            zone = row.get("timezone", "Europe/Istanbul")
            base_day = date.fromisoformat(key)
            try:
                work_end = None
                if row["status"] == "work":
                    _, work_end = shift_interval(
                        base_day,
                        row["start_local"],
                        row["end_local"],
                        zone,
                        row.get("start_fold", 0),
                        row.get("end_fold", 0),
                    )
                    base_day = work_end.astimezone(ZoneInfo(zone)).date()
                available_start, available_end = shift_interval(
                    base_day, row["available_start_local"], row["available_end_local"], zone
                )
                candidate = (
                    max(
                        available_start,
                        work_end + timedelta(minutes=row.get("commute_min", 0) + row.get("prep_min", 0)),
                    )
                    if work_end
                    else available_start
                )
                duration = timedelta(minutes=row["training_minutes"])
                blocked = []
                # Repeat the explicitly entered sleep window across any midnight
                # crossed by availability; also respect neighbouring work shifts.
                for n in range(-1, 3):
                    blocked.append(
                        shift_interval(
                            base_day + timedelta(days=n),
                            row["sleep_start_local"],
                            row["sleep_end_local"],
                            zone,
                        )
                    )
                for shift in by_day.values():
                    if shift["status"] != "work":
                        continue
                    a, b = shift_interval(
                        date.fromisoformat(shift["local_date"]),
                        shift["start_local"],
                        shift["end_local"],
                        shift.get("timezone", zone),
                        shift.get("start_fold", 0),
                        shift.get("end_fold", 0),
                    )
                    margin = timedelta(minutes=shift.get("commute_min", 0) + shift.get("prep_min", 0))
                    blocked.append((a - margin, b + margin))
                for a, b in sorted(blocked):
                    if candidate < b and candidate + duration > a:
                        candidate = b
                if candidate + duration <= available_end:
                    local = candidate.astimezone(ZoneInfo(zone))
                    window, window_date = local.strftime("%H:%M"), local.date().isoformat()
                    reason = "Girdiğin uygun saat, ulaşım, hazırlık ve planlanan uyku aralığına göre aday. Gerçek uyku kaydı veya toparlanma onayı değildir."
                else:
                    reason = "Girilen antrenman süresi uygun pencereye sığmıyor; otomatik kısaltma yapılmadı."
            except DomainError:
                reason = "Yerel saat penceresi geçersiz veya yaz saati geçişinde yok; saatleri düzelt."
        if row.get("social"):
            reason += " Sosyal planını da kontrol et; serbest metin saat olarak yorumlanmadı."
        rows.append(
            {
                "local_date": key,
                "status": row["status"],
                "window": window,
                "window_date": window_date,
                "policy_version": "explicit-window-2",
                "reason": reason,
                "pinned": row["pinned"],
                "input": {"id": row["id"], "version": row["version"]},
            }
        )
    return rows
