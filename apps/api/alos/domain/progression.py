"""Conservative, read-only suggestions; never writes an accepted program."""

from collections import defaultdict

from ..policies import POLICIES
from .science import active, date_bounds


def propose(snapshot, as_of, readiness):
    suggestions = []
    zone = snapshot.get("timezone", "Europe/Istanbul")
    active_programs = {p["id"] for p in active(snapshot, "program") if p["status"] == "active"}
    active_days = {d["id"] for d in active(snapshot, "program_day") if d["program_id"] in active_programs}
    completed_sessions = {s["id"] for s in active(snapshot, "session") if s["status"] == "completed"}
    performed = [
        r for r in active(snapshot, "set") if r.get("status") != "skipped" and date_bounds(r, as_of, zone)
    ]
    for target in active(snapshot, "program_exercise"):
        if target["day_id"] not in active_days:
            continue
        exclusions = []
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
            reason = reason + [POLICIES["clinical_dose"]["reason"]]
        elif target.get("modality") == "strength" and before.get("rir") is not None:
            groups = defaultdict(list)
            for row in performed:
                if (
                    row.get("set_kind", "unknown") != "working"
                    or row.get("session_id") not in completed_sessions
                ):
                    exclusions.append(
                        {"id": row["id"], "reason": "Çalışma seti türü veya tamamlanmış seans doğrulanmamış."}
                    )
                    continue
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
                else:
                    exclusions.append(
                        {
                            "id": row["id"],
                            "reason": "Hareket, varyasyon, taraf, ekipman veya yük anlamı karşılaştırılabilir değil.",
                        }
                    )
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
                status = "review"
                rule = "two-comparable-completions-review-only"
                reason = [
                    "İki karşılaştırılabilir seansta hedef miktar ve bildirilen RIR korundu.",
                    POLICIES["progression"]["reason"],
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
                "model_version": "progression-review-2",
                "policy": POLICIES["clinical_dose"]
                if readiness["status"] == "caution"
                else POLICIES["progression"],
                "status": status,
                "before": before,
                "after": after,
                "reason": reason,
                "missing": missing,
                "input_lineage": sources,
                "excluded": exclusions.copy(),
                "input_revision": snapshot.get("cursor", 0),
                "approval": "Yeni program sürümü oluşturup onaylayarak uygulanır; ana plan otomatik değişmez.",
            }
        )
    return suggestions
