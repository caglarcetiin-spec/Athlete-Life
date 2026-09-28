"""Running session taxonomy and editable dose guardrails; not measured thresholds."""

VERSION = "running-planner-1"
# id: label, form, demanding, specific environment (any of), per-bout cap
RUNS = {
    "run-walk": ("Koşu ve yürüyüş dönüşümlü", "interval", False, [], 120),
    "zone-2-run": ("Kolay tempoda koşu", "continuous", False, [], 5400),
    "recovery-run": ("Hafif toparlanma koşusu", "continuous", False, [], 1800),
    "long-run": ("Uzun ve rahat koşu", "continuous", False, [], 5400),
    "steady-run": ("Sabit ritimli koşu", "continuous", False, [], 2700),
    "tempo-run": ("Tempo koşusu", "continuous", True, [], 1200),
    "threshold-run": ("Kontrollü eşik çalışması", "interval", True, [], 180),
    "intervals": ("Aralıklı koşu", "interval", True, [], 120),
    "vo2-intervals": ("Yüksek eforlu aerobik interval", "interval", True, [], 120),
    "fartlek-run": ("Fartlek: değişken ritimli koşu", "interval", True, [], 120),
    "running-strides": ("Kontrollü kısa hızlanmalar", "interval", True, [], 20),
    "hill-repeats": ("Yokuş tekrarları", "interval", True, ["Hill", "Incline Treadmill"], 45),
    "trail-easy-run": ("Rahat patika koşusu", "continuous", False, ["Trail"], 2700),
    "sprint": ("Sprint teknik çalışması", "interval", True, ["Track"], 10),
    "hill-sprint": ("Kısa yokuş hızlanması", "interval", True, ["Hill"], 10),
}
NEW_IDS = {
    "run-walk",
    "recovery-run",
    "steady-run",
    "fartlek-run",
    "running-strides",
    "hill-repeats",
    "trail-easy-run",
}
DEFINITIONS = [
    {
        "id": key,
        "name": values[0],
        "displayNameTR": values[0],
        "aliases": [],
        "catalog_version": VERSION,
        "type": "RUN",
        "modality": "cardio",
        "metric": "seconds",
        "load_kind": "none",
        "equipment": ["Outdoor", "Treadmill"],
        "muscles": {},
        "note": "Süre temelli çalışma. Tempo, nabız bölgesi, VO2max veya kas gelişimi ölçülmez. Aralıklarda dinlenme rahat yürüyüş olabilir; kaydedilen çalışma süresinden ayrıdır.",
    }
    for key, values in RUNS.items()
    if key in NEW_IDS
]


def pure_running(data):
    return "running" in data.methods and set(data.methods) <= {"running", "conditioning"}


def level(data):
    entries = [
        s.level
        for s in data.sport_experience
        if s.sport_id in {"running", "trail-running", "track-running"} and s.level
    ]
    return entries[0] if entries else data.experience


def demanding_day(data):
    return (
        sorted(data.weekdays)[1]
        if level(data) in {"regular", "advanced"} and len(data.weekdays) >= 3
        else None
    )


def allowed_on_day(data, key, day):
    return key not in RUNS or not RUNS[key][2] or day == demanding_day(data)


def exclusion(data, key, available):
    from .movements import normalize

    if key not in RUNS:
        return None
    _, _, demanding, places, _ = RUNS[key]
    if demanding and demanding_day(data) is None:
        return "Bu yoğun çalışma için düzenli koşu geçmişi ve en az üç çalışma günü belirt; kolay çalışmalar kullanılabilir"
    if places and not {normalize(p) for p in places} & available:
        return "Gerekli koşu ortamı seçilmedi: " + ", ".join(places)
    return None


def rules(data, key, capacity=None):
    _, form, _, _, max_seconds = RUNS[key]
    if pure_running(data):
        time_budget = max(60, data.minutes * 60 - (480 if data.minutes >= 30 else 300) - 60)
    else:
        time_budget = data.conditioning_minutes * 60
    max_seconds = min(max_seconds, time_budget)
    if capacity and capacity.seconds:
        max_seconds = min(max_seconds, max(1, int(capacity.seconds * 0.8)))
    continuous = data.running_profile.continuous_minutes if data.running_profile else None
    if continuous is not None and form == "continuous":
        max_seconds = min(max_seconds, max(1, int(continuous * 60)))
    return {
        "modality": "cardio",
        "reps": None,
        "seconds": {"min": 1, "max": max_seconds},
        "rir": None,
        "rest_min": 60 if form == "interval" else 0,
        "rest_max": 300 if form == "interval" else 0,
        "sets_max": 5 if form == "interval" else 1,
    }


def validate_week(plan, data):
    """Allow only one demanding run day per repeating week; bounded volume is not clearance."""
    from .errors import DomainError

    for day in plan.days:
        hard = [e for e in day.exercises if e.movement_id in RUNS and RUNS[e.movement_id][2]]
        if len(hard) > 1 or any(not allowed_on_day(data, e.movement_id, day.weekday) for e in hard):
            raise DomainError(
                "ai_plan_invalid", "AI yoğun koşu günlerinin dağılımına uymadı; taslak kabul edilmedi.", 502
            )

    weekly = data.running_profile.weekly_minutes if data.running_profile else None
    if weekly is not None and weekly > 0:
        seconds = sum(
            (e.seconds or 0) * e.sets for d in plan.days for e in d.exercises if e.movement_id in RUNS
        )
        if seconds > weekly * 60:
            raise DomainError(
                "ai_plan_invalid", "AI bildirdiğin haftalık koşu süresini aştı; taslak kabul edilmedi.", 502
            )
