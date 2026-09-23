import { useState } from "react";
import {
  CalendarDays,
  Plus,
  Sparkles,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { api, type Entity } from "../api/contracts";
import type { SyncStore } from "../sync/store";
import { displayDate, today } from "../time";
export type ExerciseDraft = {
  target_range?: {
    unit: "reps" | "seconds" | "m";
    minimum: number | string;
    maximum: number | string;
  } | null;
  movement_id: string;
  name: string;
  variant?: string;
  modality?: string;
  equipment?: string;
  side?: string;
  load_kind?: string;
  sets: number | string;
  reps?: number | string | null;
  seconds?: number | string | null;
  distance_m?: number | string | null;
  external_kg?: number | string | null;
  rir?: number | string | null;
  rest_seconds?: number | string | null;
};
type DayDraft = {
  first_week?: number;
  last_week?: number | null;
  weekday: number;
  label: string;
  kind: "training" | "rest";
  exercises: ExerciseDraft[];
  pinned?: boolean;
};
type PlanDraft = {
  name: string;
  goal: string;
  start_date: string;
  weeks: number;
  days: DayDraft[];
  parent_id?: string;
};
const weekdays = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];
const blank = (): PlanDraft => ({
  name: "Yeni dönemim",
  goal: "",
  start_date: today(),
  weeks: 4,
  days: weekdays.map((_, weekday) => ({
    weekday,
    label: "Çalışma",
    kind: "rest",
    exercises: [],
  })),
});
const words = {
  strength: "Hareket / tekrar",
  isometric: "Sabit tutuş",
  cardio: "Süre / mesafe",
  skill: "Teknik deneme",
  circuit: "Tur / istasyon",
};
export function Programming({
  store,
  onWorkout,
}: {
  store: SyncStore;
  onWorkout: () => void;
}) {
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [objective, setObjective] = useState("hybrid");
  const [experience, setExperience] = useState("new");
  const [sport, setSport] = useState("strength");
  const [days, setDays] = useState([0, 2, 4]);
  const [adult, setAdult] = useState(false);
  const [symptoms, setSymptoms] = useState(false);
  const programs = store
    .view("program")
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  function edit(next: PlanDraft) {
    setDraft(next);
    void store.saveDraft("program", next).catch((e) => setError(e.message));
  }
  async function start() {
    const saved = await store.loadDraft("program");
    setDraft(saved || blank());
  }
  async function suggest() {
    if (!draft) return;
    try {
      const response = (await api("program-drafts", {
        method: "POST",
        headers: { "X-CSRF-Token": store.me.csrf },
        body: JSON.stringify({
          goal: draft.goal,
          objective,
          experience,
          sport,
          weeks: draft.weeks,
          start_date: draft.start_date,
          weekdays: days,
          adult,
          symptoms,
        }),
      })) as { program: PlanDraft; notes: string[] };
      edit(response.program);
      setNotes(response.notes);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function copy(program: Entity) {
    const dayRows = store
      .view("program_day")
      .filter((d) => d.program_id === program.id);
    const exercises = store.view("program_exercise");
    edit({
      name: String(program.name) + " · yeni sürüm",
      goal: String(program.goal),
      start_date: today(),
      weeks: Number(program.weeks),
      parent_id: program.id,
      days: dayRows.map((d) => ({
        first_week: Number(d.first_week || 1),
        last_week: d.last_week == null ? null : Number(d.last_week),
        weekday: Number(d.weekday),
        label: String(d.label),
        kind: d.kind as "rest" | "training",
        pinned: Boolean(d.pinned),
        exercises: exercises
          .filter((e) => e.day_id === d.id)
          .sort((a, b) => Number(a.position) - Number(b.position))
          .map(
            (e) =>
              Object.fromEntries(
                Object.entries(e).filter(([k]) =>
                  [
                    "target_range",
                    "movement_id",
                    "name",
                    "variant",
                    "modality",
                    "equipment",
                    "side",
                    "load_kind",
                    "sets",
                    "reps",
                    "seconds",
                    "distance_m",
                    "external_kg",
                    "assistance_kg",
                    "bodyweight_kg",
                    "rir",
                    "rpe",
                    "rest_seconds",
                  ].includes(k),
                ),
              ) as ExerciseDraft,
          ),
      })),
    });
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Senin hedefin, senin planın</span>
          <h1>Antrenman planım</h1>
          <p>
            Hedefini anlat, taslağı düzenle ve hazır olduğunda ana planına al.
          </p>
        </div>
        <CalendarDays className="heading-icon" />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button onClick={() => void start()}>
          <Plus size={18} />
          Dönem oluştur
        </button>
        <button className="secondary" onClick={onWorkout}>
          Antrenmana geç
        </button>
      </div>
      {draft && (
        <section className="card builder">
          <h2>1 · Nereye ulaşmak istiyorsun?</h2>
          <div className="form-grid">
            <label>
              Dönem adı
              <input
                value={draft.name}
                onChange={(e) => edit({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              Başlangıç tarihi
              <input
                type="date"
                value={draft.start_date}
                onChange={(e) => edit({ ...draft, start_date: e.target.value })}
              />
            </label>
            <label>
              Hafta sayısı
              <select
                aria-label="Hafta sayısı"
                value={draft.weeks}
                onChange={(e) =>
                  edit({ ...draft, weeks: Number(e.target.value) })
                }
              >
                {[4, 8, 12, 16, 24].map((w) => (
                  <option key={w} value={w}>
                    {w} hafta
                  </option>
                ))}
              </select>
            </label>
            <label className="wide">
              Dönem sonunda neyi geliştirmek istiyorsun?
              <textarea
                value={draft.goal}
                onChange={(e) => edit({ ...draft, goal: e.target.value })}
                placeholder="Örneğin kontrollü barfiks sayımı artırmak ve rahat 5 km koşmak"
                maxLength={1000}
              />
            </label>
          </div>
          <details open>
            <summary>
              Öneriyle başla · istersen aşağıda tamamen elle oluştur
            </summary>
            <div className="form-grid">
              <label>
                Önceliğim
                <select
                  aria-label="Önceliğim"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                >
                  <option value="hybrid">Kuvvet ve dayanıklılık</option>
                  <option value="strength">Kuvvet</option>
                  <option value="hypertrophy">Kas gelişimi</option>
                  <option value="endurance">Dayanıklılık</option>
                  <option value="skill">Beceri</option>
                </select>
              </label>
              <label>
                Deneyimim
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                >
                  <option value="new">Yeni başlıyorum</option>
                  <option value="returning">Ara verdim, dönüyorum</option>
                  <option value="regular">Düzenli çalışıyorum</option>
                  <option value="advanced">İleri düzey</option>
                </select>
              </label>
              <label>
                Branş
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                >
                  <option value="strength">Kuvvet / fitness</option>
                  <option value="calisthenics">Kalistenik</option>
                  <option value="running">Koşu</option>
                  <option value="walking">Yürüyüş</option>
                  <option value="custom">Başka branş · elle planla</option>
                </select>
              </label>
            </div>
            <fieldset>
              <legend>Hangi günler çalışmak istersin?</legend>
              <div className="choices">
                {weekdays.map((name, index) => (
                  <label className="check" key={name}>
                    <input
                      type="checkbox"
                      checked={days.includes(index)}
                      onChange={(e) =>
                        setDays(
                          e.target.checked
                            ? [...days, index].sort()
                            : days.filter((d) => d !== index),
                        )
                      }
                    />
                    {name}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="check">
              <input
                type="checkbox"
                checked={adult}
                onChange={(e) => setAdult(e.target.checked)}
              />
              18 yaş veya üzerindeyim.
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={symptoms}
                onChange={(e) => setSymptoms(e.target.checked)}
              />
              Şu anda hastalık, yaralanma veya değerlendirilmesi gereken belirti
              var.
            </label>
            <button
              className="secondary"
              disabled={!draft.goal}
              onClick={() => void suggest()}
            >
              <Sparkles size={18} />
              Bir başlangıç taslağı hazırla
            </button>
          </details>
          {notes.map((n) => (
            <p className="notice" key={n}>
              {n}
            </p>
          ))}
          <h2>2 · Günlerini ve çalışmalarını düzenle</h2>
          <p>
            Her çalışmanın hafta aralığını seçebilirsin: örneğin 1–3. haftalar
            normal çalışma, 4. hafta daha hafif bir çalışma. Aynı gün için
            farklı haftalarda farklı hareket ve hedefler eklenebilir. Set bir
            tekrar grubudur. Sabit tutuşta saniye, koşuda süre veya mesafe
            kullan. RIR, set sonunda yapabileceğini düşündüğün ek tekrar
            sayısıdır.
          </p>
          {draft.days.map((day, index) => (
            <details
              className="plan-day"
              key={index}
              open={day.kind === "training"}
            >
              <summary>
                <strong>{weekdays[day.weekday]}</strong> · {day.first_week || 1}
                –{day.last_week || draft.weeks}. hafta ·{" "}
                {day.kind === "rest"
                  ? "Dinlenme"
                  : `${day.exercises.length} hareket`}
              </summary>
              <div className="form-grid">
                <label>
                  İlk uygulama haftası
                  <select
                    aria-label={weekdays[day.weekday] + " ilk hafta"}
                    value={day.first_week || 1}
                    onChange={(e) =>
                      edit({
                        ...draft,
                        days: draft.days.map((d, i) =>
                          i === index
                            ? { ...d, first_week: Number(e.target.value) }
                            : d,
                        ),
                      })
                    }
                  >
                    {Array.from({ length: draft.weeks }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}. hafta
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Son uygulama haftası
                  <select
                    aria-label={weekdays[day.weekday] + " son hafta"}
                    value={day.last_week || draft.weeks}
                    onChange={(e) =>
                      edit({
                        ...draft,
                        days: draft.days.map((d, i) =>
                          i === index
                            ? { ...d, last_week: Number(e.target.value) }
                            : d,
                        ),
                      })
                    }
                  >
                    {Array.from({ length: draft.weeks }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}. hafta
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Günün türü
                  <select
                    aria-label={weekdays[day.weekday] + " türü"}
                    value={day.kind}
                    onChange={(e) =>
                      edit({
                        ...draft,
                        days: draft.days.map((d, i) =>
                          i === index
                            ? {
                                ...d,
                                kind: e.target.value as DayDraft["kind"],
                                exercises:
                                  e.target.value === "rest" ? [] : d.exercises,
                              }
                            : d,
                        ),
                      })
                    }
                  >
                    <option value="rest">Dinlenme</option>
                    <option value="training">Antrenman</option>
                  </select>
                </label>
                {day.kind === "training" && (
                  <label>
                    Çalışma adı
                    <input
                      value={day.label}
                      onChange={(e) =>
                        edit({
                          ...draft,
                          days: draft.days.map((d, i) =>
                            i === index ? { ...d, label: e.target.value } : d,
                          ),
                        })
                      }
                    />
                  </label>
                )}
              </div>
              {day.kind === "training" && (
                <>
                  {day.exercises.map((exercise, ei) => {
                    const update = (key: string, value: unknown) =>
                      edit({
                        ...draft,
                        days: draft.days.map((d, i) =>
                          i === index
                            ? {
                                ...d,
                                exercises: d.exercises.map((x, j) =>
                                  j === ei ? { ...x, [key]: value } : x,
                                ),
                              }
                            : d,
                        ),
                      });
                    return (
                      <div className="exercise-editor" key={ei}>
                        <div className="form-grid">
                          <label className="wide">
                            Hareket adı
                            <input
                              value={exercise.name}
                              onChange={(e) => update("name", e.target.value)}
                            />
                          </label>
                          <label>
                            Çalışma türü
                            <select
                              value={exercise.modality || "strength"}
                              onChange={(e) =>
                                update("modality", e.target.value)
                              }
                            >
                              {Object.entries(words).map(([v, label]) => (
                                <option value={v} key={v}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Varyasyon / koşul
                            <input
                              value={exercise.variant || "standard"}
                              onChange={(e) =>
                                update("variant", e.target.value)
                              }
                            />
                          </label>
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={!!exercise.target_range}
                              onChange={(e) =>
                                update(
                                  "target_range",
                                  e.target.checked
                                    ? { unit: "reps", minimum: "", maximum: "" }
                                    : null,
                                )
                              }
                            />
                            Tek değer yerine hedef aralığı belirle
                          </label>
                          {exercise.target_range && (
                            <>
                              <label>
                                Aralık birimi
                                <select
                                  value={exercise.target_range.unit}
                                  onChange={(e) =>
                                    update("target_range", {
                                      ...exercise.target_range,
                                      unit: e.target.value,
                                    })
                                  }
                                >
                                  <option value="reps">Tekrar</option>
                                  <option value="seconds">Saniye</option>
                                  <option value="m">Metre</option>
                                </select>
                              </label>
                              <label>
                                Alt hedef
                                <input
                                  inputMode="decimal"
                                  value={exercise.target_range.minimum}
                                  onChange={(e) =>
                                    update("target_range", {
                                      ...exercise.target_range,
                                      minimum: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Üst hedef
                                <input
                                  inputMode="decimal"
                                  value={exercise.target_range.maximum}
                                  onChange={(e) =>
                                    update("target_range", {
                                      ...exercise.target_range,
                                      maximum: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <p>
                                Runner bu aralığı hedef olarak gösterir.
                                Gerçekte yaptığın sayı ayrıca girilir.
                              </p>
                            </>
                          )}
                          <label>
                            Set / tur
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={exercise.sets}
                              onChange={(e) => update("sets", e.target.value)}
                            />
                          </label>
                          {[
                            ["reps", "Tekrar"],
                            ["seconds", "Süre (sn)"],
                            ["distance_m", "Mesafe (m)"],
                            ["external_kg", "Ek ağırlık (kg)"],
                            ["rir", "Yedekte tekrar (RIR)"],
                            ["rest_seconds", "Dinlenme (sn)"],
                          ].map(([key, label]) => (
                            <label key={key}>
                              {label}
                              <input
                                inputMode="decimal"
                                value={String(
                                  exercise[key as keyof ExerciseDraft] ?? "",
                                )}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  update(key, value === "" ? null : value);
                                }}
                              />
                            </label>
                          ))}
                        </div>
                        <button
                          className="text-button"
                          onClick={() =>
                            edit({
                              ...draft,
                              days: draft.days.map((d, i) =>
                                i === index
                                  ? {
                                      ...d,
                                      exercises: d.exercises.filter(
                                        (_, j) => j !== ei,
                                      ),
                                    }
                                  : d,
                              ),
                            })
                          }
                        >
                          <Trash2 size={16} />
                          Hareketi kaldır
                        </button>
                      </div>
                    );
                  })}
                  <button
                    className="secondary small"
                    onClick={() =>
                      edit({
                        ...draft,
                        days: draft.days.map((d, i) =>
                          i === index
                            ? {
                                ...d,
                                exercises: [
                                  ...d.exercises,
                                  {
                                    movement_id:
                                      "custom-" + crypto.randomUUID(),
                                    name: "",
                                    modality: "strength",
                                    sets: 2,
                                    reps: 8,
                                    rest_seconds: 90,
                                  },
                                ],
                              }
                            : d,
                        ),
                      })
                    }
                  >
                    <Plus size={16} />
                    Hareket / set / interval ekle
                  </button>
                </>
              )}
              <button
                className="text-button"
                onClick={() =>
                  edit({
                    ...draft,
                    days: [
                      ...draft.days,
                      {
                        ...day,
                        label: day.label + " · başka faz",
                        exercises: day.exercises.map((e) => ({ ...e })),
                      },
                    ],
                  })
                }
              >
                Bu günün farklı haftaları için çalışma ekle
              </button>
              <button
                className="text-button"
                onClick={() =>
                  edit({
                    ...draft,
                    days: draft.days.filter((_, i) => i !== index),
                  })
                }
              >
                Bu çalışma gününü kaldır
              </button>
            </details>
          ))}
          <h2>3 · İncele ve kaydet</h2>
          <p>
            Taslağı kaydetmek ana programını değiştirmez. Kayıt kartından “Ana
            planım yap” ile onaylayabilirsin.
          </p>
          <div className="actions">
            <button
              onClick={() =>
                void store
                  .enqueue("program.create", null, {
                    ...draft,
                    days: draft.days.map((day) => ({
                      ...day,
                      exercises: day.exercises.map((exercise) => ({
                        ...exercise,
                        ...(exercise.target_range
                          ? {
                              target_range: {
                                ...exercise.target_range,
                                minimum: String(
                                  exercise.target_range.minimum,
                                ).replace(",", "."),
                                maximum: String(
                                  exercise.target_range.maximum,
                                ).replace(",", "."),
                              },
                              reps: null,
                              seconds: null,
                              distance_m: null,
                            }
                          : {}),
                      })),
                    })),
                  } as unknown as Record<string, unknown>)
                  .then(() => {
                    setDraft(null);
                    return store.saveDraft("program", null);
                  })
                  .catch((e) => setError(e.message))
              }
            >
              Taslağı kaydet
            </button>
            <button className="secondary" onClick={() => setDraft(null)}>
              Taslağı cihazda tut, kapat
            </button>
          </div>
        </section>
      )}
      <section className="program-list">
        {programs.map((p) => (
          <article className="card" key={p.id}>
            <span className="eyebrow">
              {p.status === "active"
                ? "Ana planım"
                : p.status === "archived"
                  ? "Geçmiş dönem"
                  : "Onay bekleyen taslak"}
            </span>
            <h2>{String(p.name)}</h2>
            <p>{String(p.goal)}</p>
            <p>
              {displayDate(String(p.start_date))} · {Number(p.weeks)} hafta
            </p>
            {Boolean(p.decisions) &&
              typeof p.decisions === "object" &&
              p.decisions !== null &&
              "missing" in p.decisions &&
              (p.decisions.missing as string[]).map((n) => <p key={n}>{n}</p>)}
            <div className="actions">
              {p.status === "draft" && (
                <button
                  disabled={Boolean(p.local_pending)}
                  onClick={() =>
                    void store
                      .enqueue("program.activate", p, {})
                      .catch((e) => setError(e.message))
                  }
                >
                  <CheckCircle2 size={18} />
                  Ana planım yap
                </button>
              )}
              <button className="secondary" onClick={() => copy(p)}>
                Yeni sürümünü düzenle
              </button>
              {p.status === "active" && (
                <button
                  className="text-button"
                  onClick={() =>
                    void store
                      .enqueue("program.archive", p, {})
                      .catch((e) => setError(e.message))
                  }
                >
                  Programı arşive al
                </button>
              )}
            </div>
          </article>
        ))}
        {!programs.length && !draft && (
          <div className="card">
            <h2>İlk adım, hedefini belirlemek.</h2>
            <p>
              Henüz bir planın yok. İstersen önerilerle başla, istersen kendi
              programını gir.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
