"""Conservative, read-only suggestions; never writes an accepted program."""

from collections import defaultdict

from .science import active, date_bounds


def propose(snapshot, as_of, readiness):
    suggestions = []
    zone = snapshot.get("timezone", "Europe/Istanbul")
    active_programs = {p["id"] for p in active(snapshot, "program") if p["status"] == "active"}
    active_days = {d["id"] for d in active(snapshot, "program_day") if d["program_id"] in active_programs}
    performed = [
        r for r in active(snapshot, "set") if r.get("status") != "skipped" and date_bounds(r, as_of, zone)
    ]
    for target in active(snapshot, "program_exercise"):
        if target["day_id"] not in active_days:
            continue
        before = {k: target.get(k) for k in ("sets", "reps", "seconds", "external_kg", "rir", "rest_seconds")}
        after = dict(before)
        reason = []
        sources = []
        missing = []
        status = "maintain"
        rule = "insufficient-comparable-performance"
        if readiness["status"] == "caution":
            status = "review"
            rule = "self-report-caution"
            reason = readiness["reasons"]
            if before.get("sets") and before["sets"] > 1:
                after["sets"] = before["sets"] - 1
            if before.get("external_kg"):
                after["external_kg"] = round(before["external_kg"] * 0.9, 2)
            if before.get("rir") is not None:
                after["rir"] = max(3, before["rir"])
            reason = reason + [
                "Bir set azaltma ve ek yükte %10 azaltma yalnız düzenlenebilir koçluk varsayımıdır; tıbbi dönüş protokolü değildir."
            ]
        elif target.get("modality") == "strength" and before.get("rir") is not None:
            groups = defaultdict(list)
            for row in performed:
                if all(
                    row.get(k) == target.get(k)
                    for k in (
                        "movement_id",
                        "variant",
                        "equipment",
                        "side",
                        "load_kind",
                        "external_kg",
                        "assistance_kg",
                    )
                ):
                    groups[row.get("session_id")].append(row)
            previous = sorted(
                groups.values(), key=lambda rows: max(r.get("occurred_at") or r["local_date"] for r in rows)
            )[-2:]
            sufficient = len(previous) == 2 and all(
                len(rows) >= target["sets"]
                and all(
                    r.get("reps") is not None
                    and r["reps"] >= (target.get("reps") or 0)
                    and r.get("rir") is not None
                    and r["rir"] >= target["rir"]
                    for r in rows
                )
                for rows in previous
            )
            sources = [r["id"] for rows in previous for r in rows]
            if sufficient:
                status = "proposed"
                rule = "two-comparable-completions"
                if before.get("external_kg"):
                    after["external_kg"] = round(before["external_kg"] * 1.025, 2)
                elif before.get("reps"):
                    after["reps"] = before["reps"] + 1
                reason = [
                    "İki benzer seansta hedef miktar ve bildirilen RIR korundu. Küçük artış incelenebilir; oran/tekrar adımı doğrulanmış kişisel eşik değildir."
                ]
            else:
                missing = ["İki karşılaştırılabilir seansta bütün setler ve RIR bilgisi"]
        else:
            missing = ["Bu modalite için doğrulanmış teknik kalite ve ilerleme protokolü"]
            reason = ["Süre, hız ve teknik beceriye kuvvet yük artışı kuralı uygulanmadı."]
        suggestions.append(
            {
                "exercise_id": target["id"],
                "name": target["name"],
                "variant": target.get("variant"),
                "rule_id": rule,
                "model_version": "progression-advice-1",
                "status": status,
                "before": before,
                "after": after,
                "reason": reason,
                "missing": missing,
                "input_lineage": sources,
                "input_revision": snapshot.get("cursor", 0),
                "approval": "Yeni program sürümü oluşturup onaylayarak uygulanır; ana plan otomatik değişmez.",
            }
        )
    return suggestions
