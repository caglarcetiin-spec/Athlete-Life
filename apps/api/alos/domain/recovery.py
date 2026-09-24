"""Versioned workload visualization index, not measured tissue damage or capacity.

Eight effort-weighted sets is a display scale, not a physiological threshold.
Half lives are explicit inherited engineering assumptions. Missing effort is a
range; lifestyle context is reported separately, not assigned invented multipliers.
"""

import math

VERSION = "load-reserve-1"
SCALE = 8.0


def summarize(entries, as_of):
    def index(value):
        return round(100 * -math.expm1(-max(0, value) / SCALE), 1)

    def values(at, rows):
        low = high = 0.0
        for entry in rows:
            if entry["earliest"] > at:
                continue
            half = entry["half_hours"]
            low += (
                0
                if entry["latest"] > at
                else entry["dose_low"] * 2 ** (-(at - entry["earliest"]).total_seconds() / 3600 / half)
            )
            high += entry["dose_high"] * 2 ** (-max(0, (at - entry["latest"]).total_seconds() / 3600) / half)
        return {"low": index(low), "high": index(high)}

    from datetime import timedelta

    result = {}
    for group in sorted({e["group"] for e in entries}):
        rows = [e for e in entries if e["group"] == group]
        current = values(as_of, rows)
        last = max(e["latest"] for e in rows)
        last = min(last, as_of)
        initial = values(last, rows)
        sources = [{k: v for k, v in e.items() if k not in ("group", "earliest", "latest")} for e in rows]
        result[group] = {
            "fatigue": current,
            "reserve": {"low": round(100 - current["high"], 1), "high": round(100 - current["low"], 1)},
            "last_load_at": last.isoformat(),
            "released_since_last_load": dict(
                zip(
                    ("low", "high"),
                    sorted(round(max(0, initial[k] - current[k]), 1) for k in ("low", "high")),
                )
            ),
            "forecast": [{"hours": h, "fatigue": values(as_of + timedelta(hours=h), rows)} for h in (24, 48)],
            "sources": sources,
            "uncertain_time": any(e["earliest"] != e["latest"] for e in rows),
            "missing_effort": any(e["rir"] is None and e["rpe"] is None for e in rows),
        }
    return {
        "version": VERSION,
        "scale": SCALE,
        "groups": result,
        "meaning": "Yorgunluk ve rezerv yüzdeleri doğrulanmamış yük modeli endeksidir; doku hasarı, kas büyümesi veya gerçek kuvvet kapasitesi ölçümü değildir.",
        "forecast_assumption": "Yeni antrenman eklenmezse; sabit model varsayımlarıyla.",
        "calibrated": False,
    }


def contribution(row, amount, group, weight, earliest, latest, half):
    modality = row.get("modality", "strength")
    # Keep quantities transparent. Non-strength modalities are not silently
    # converted to hypertrophy-equivalent sets or a strength reserve percentage.
    if modality != "strength":
        return None
    reps = max(0, row.get("reps") or 0)
    rep_factor = min(2.0, max(0.5, math.sqrt(reps / 10)))
    rir, rpe = row.get("rir"), row.get("rpe")
    effort = (
        max(0.35, min(1.0, 1.0 - rir * 0.12))
        if rir is not None
        else max(0.35, min(1.0, rpe / 10))
        if rpe is not None
        else None
    )
    dose = amount * weight * rep_factor
    return {
        "group": "lowerBack" if group == "spinalErectors" else group,
        "earliest": earliest,
        "latest": latest,
        "dose_low": dose * (effort if effort is not None else 0.35),
        "dose_high": dose * (effort if effort is not None else 1.0),
        "half_hours": half,
        "id": row["id"],
        "name": row.get("name") or row.get("movement_id"),
        "local_date": row.get("local_date"),
        "reps": row.get("reps"),
        "external_kg": row.get("external_kg"),
        "rir": rir,
        "rpe": rpe,
        "note": "Mutlak kg kaydı gösterilir; kişisel kapasite kalibrasyonu olmadan hasar katsayısına çevrilmez.",
    }
