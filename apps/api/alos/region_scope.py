"""Explicit strength-region scope. Sport techniques/cardio retain their own semantics."""

GROUPS = {
    "chest": ["chest"],
    "back": ["lats", "upperBack", "scapular", "lowerBack"],
    "shoulders": ["frontDelts", "sideDelts", "rearDelts"],
    "arms": ["biceps", "triceps", "forearms"],
    "core": ["abs", "obliques", "hipFlexors"],
    "quads": ["quads"],
    "posterior": ["glutes", "hamstrings"],
    "calves": ["calves"],
}
LABELS = dict(
    zip(
        GROUPS,
        ["Göğüs", "Sırt", "Omuz", "Kol", "Karın", "Ön bacak", "Kalça ve arka bacak", "Baldır"],
        strict=True,
    )
)


def selected(data):
    return {k for k, n in data.focus.items() if n > 0}


def focused(data):
    return data.region_mode == "selected" and bool(selected(data))


def exclusion(data, definition):
    if not focused(data) or definition["modality"] not in {"strength", "skill", "isometric"}:
        return None
    scores = {
        k: max((definition.get("muscles", {}).get(m, 0) for m in members), default=0)
        for k, members in GROUPS.items()
    }
    peak = max(scores.values(), default=0)
    if not peak or not any(scores[k] >= peak for k in selected(data)):
        return "Ana hedefi seçtiğin kas bölgelerinde değil"
    return None


def day_kind(data, index):
    # A focused region selection is a session scope, not an upper/lower week.
    if focused(data) or data.split in {"full_body", "sport_days", "endurance_days"}:
        return "full_body"
    return (
        ["upper", "lower"][index % 2] if data.split == "upper_lower" else ["push", "pull", "legs"][index % 3]
    )
