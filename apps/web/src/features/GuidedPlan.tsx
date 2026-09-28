import { BranchMethods } from "./BranchMethods";
import {
  addBranch,
  removeBranch,
  toggleBranchMethod,
  branchMap,
  activeBranches,
} from "./branchSelection";
import { PerformanceFocus } from "./PerformanceFocus";
import {
  enduranceOnly,
  nextMethods,
  focusOptions,
  runningEquipment,
  combatEquipment,
  swimmingEquipment,
} from "./planningJourney";
import {
  SportTrainingFields,
  branchMethods,
  type SportTrainingProfile,
  type SportReadiness,
} from "./SportTrainingFields";
import { SportOptions, type SportOption } from "./SportOptions";
import { FocusMap } from "./FocusMap";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { api, ApiError } from "../api/contracts";
import type { SyncStore } from "../sync/store";
import type { PlanDraft } from "./Programming";
import { today } from "../time";
import { type PlanningPrefs, equipmentOptions } from "./PlanningPreferences";
import { capacityError, capacityMaximum } from "./planningCapacity";

const groups: Record<string, string> = {
  chest: "Göğüs",
  back: "Sırt",
  shoulders: "Omuz",
  arms: "Kol",
  core: "Karın",
  quads: "Ön bacak",
  posterior: "Kalça ve arka bacak",
  calves: "Baldır",
};
const names = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];
const equipmentNames = [
  "Bar",
  "Squat kafesi",
  "Dambıl",
  "Barfiks barı",
  "Halka",
  "Ağırlık kemeri",
  "EZ bar",
  "Sırt çantası",
  "Paralel tutacak",
  "Yükseltilmiş destek",
  "Açık alan",
  "Koşu bandı",
  "Ağırlık sehpası",
  "Yüzme havuzu",
  "Sağlık topu",
];
type Competency = { movement_id: string; reps?: number; seconds?: number };
type PlannerOption = {
  run_form?: "continuous" | "interval" | null;
  sport_id?: string | null;
  movement_id: string;
  name: string;
  metric: string;
  family: string;
  equipment: string[];
  methods: string[];
  competency_required: boolean;
  block: string;
};
type SportExperience = {
  sport_id: string;
  level: string | null;
  years: number | null;
  sessions_per_week: number | null;
  session_minutes: number | null;
  known_skills: string;
};
type Answers = {
  sport_methods: Record<string, string[]>;
  performance_focus: string[];
  running_profile: {
    target_distance_km: number | null;
    continuous_minutes: number | null;
    weekly_minutes: number | null;
  } | null;
  sport_readiness: SportReadiness[];
  sport_experience: SportExperience[];
  sport_ids: string[];
  training_history: string;
  methods: string[];
  competencies: Competency[];
  conditioning_minutes: number;
  experience: string;
  objective: string;
  equipment: string[];
  weekdays: number[];
  minutes: number;
  split: string;
  focus: Record<string, number>;
  goal: string;
  name: string;
  weeks: number;
  start_date: string;
  adult: boolean;
  symptoms: boolean;
};
type Preview = {
  program: PlanDraft;
  notes: string[];
  review: {
    days: {
      weekday: number;
      estimated_minutes: number;
      working_sets: number;
      missing_patterns: string[];
      blocks: {
        movement_id: string;
        block: string;
        family_label: string;
        reason: string;
      }[];
    }[];
    skill_sets: number;
    isometric_seconds: number;
    conditioning_seconds: number;
    status: string;
    excluded: { movement_id: string; reason: string }[];
    muscle_sets: Record<string, number>;
    meaning: string;
    duration_assumptions: string;
  };
};
const titles = [
  "Nereden başlıyoruz?",
  "Hangi yöntemleri birlikte çalışıyorsun?",
  "Hangi hareketleri kontrollü yapabiliyorsun?",
  "Neyi geliştirmek istiyorsun?",
  "Elinin altında neler var?",
  "Antrenmana ne zaman yer açabilirsin?",
  "Hangi bölgeler önceliğin?",
  "Nasıl çalışmak istersin?",
  "Son bir kontrol",
  "Planına göz at",
];
export function GuidedPlan({
  store,
  onUse,
  onClose,
}: {
  store: SyncStore;
  onUse: (plan: PlanDraft, notes: string[]) => void;
  onClose: () => void;
}) {
  const profile = store.view("profile")[0];
  const [answers, setAnswers] = useState<Answers>({
    sport_methods: {},
    performance_focus: [],
    running_profile: null,
    sport_readiness: [],
    sport_ids: (profile?.sport_ids as string[]) || [],
    training_history: "",
    sport_experience: [],
    methods: ["weights"],
    competencies: [],
    conditioning_minutes: 10,
    experience: String(profile?.experience || "new"),
    objective: "strength_hypertrophy",
    equipment: [],
    weekdays: [0, 2, 4],
    minutes: 45,
    split: "full_body",
    focus: {},
    goal: "",
    name: "Yeni antrenman dönemim",
    weeks: 8,
    start_date: today(),
    adult: false,
    symptoms: false,
  });
  const [step, setStep] = useState(0),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [options, setOptions] = useState<PlannerOption[]>([]);
  const [sportTraining, setSportTraining] = useState<SportTrainingProfile[]>(
    [],
  );

  const [sports, setSports] = useState<SportOption[]>([]);
  const [sportSearch, setSportSearch] = useState("");
  const [sportCategory, setSportCategory] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [capabilitySearch, setCapabilitySearch] = useState("");
  const synced = Boolean(store.snapshot);
  const [engine, setEngine] = useState<"ai" | "standard">("ai");
  const [consent, setConsent] = useState(false);
  const [statusRevision, setStatusRevision] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    available: boolean;
    message: string;
    provider?: "OpenAI" | "EVREN";
    consent_version?: string;
  } | null>(null);
  const consentScope = useRef("");
  useEffect(() => {
    if (!synced) return;
    let active = true;
    setAiStatus(null);
    void api("ai-planning-status")
      .then((value) => {
        if (active) {
          const result = value as {
            available: boolean;
            message: string;
            provider: "OpenAI" | "EVREN";
            consent_version: string;
          };
          const scope = `${result.provider}:${result.consent_version}`;
          if (consentScope.current !== scope) setConsent(false);
          consentScope.current = scope;
          setAiStatus(result);
        }
      })
      .catch(() => {
        if (active)
          setAiStatus({
            available: false,
            message: "AI bağlantı durumu okunamadı. Yenileyerek tekrar dene.",
          });
      });
    return () => {
      active = false;
    };
  }, [synced, statusRevision]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // Old eight-step drafts retain answers but restart so new questions are not skipped.
  const phase = step === 0 ? 0 : step >= 3 ? step - 2 : -1;
  useEffect(() => {
    if (!synced) return;
    let live = true;
    void api("guided-planning-options")
      .then((result) => {
        if (live) {
          setOptions((result as { movements: PlannerOption[] }).movements);
          setSportTraining(
            (result as { sport_training: SportTrainingProfile[] })
              .sport_training || [],
          );

          setSports((result as { sports: typeof sports }).sports || []);
        }
      })
      .catch(() => {
        if (live)
          setOptionsError(
            "Yetkinlik kataloğu açılamadı. Sayfayı yenileyerek tekrar dene; yetkinlikler varsayılmayacak.",
          );
      });
    return () => {
      live = false;
    };
  }, [synced]);
  useEffect(() => {
    if (!synced) return;
    let live = true;
    void store
      .loadDraft("guided-plan")
      .then((saved) => {
        if (live) {
          if (saved?.answers) {
            setAnswers((previous) => ({ ...previous, ...saved.answers }));
            setStep(
              saved.form_version === 2 ? Math.min(saved.step || 0, 8) : 0,
            );
          } else {
            const current = store.view("profile")[0];
            const prefs = (current?.planning_preferences ||
              {}) as PlanningPrefs;
            const equipment = prefs.equipment_profiles?.find(
              (p) => p.id === prefs.active_equipment_id,
            );
            setAnswers((previous) => ({
              ...previous,
              sport_ids: (current?.sport_ids as string[]) || [],
              experience: String(current?.experience || "new"),
              equipment: equipment?.equipment || [],
              goal: prefs.goal || "",
              weekdays:
                prefs.weekdays?.length && prefs.weekdays.length <= 6
                  ? prefs.weekdays
                  : previous.weekdays,
              minutes: [15, 20, 30, 45, 60, 75, 90, 120, 180].includes(
                prefs.minutes || 0,
              )
                ? prefs.minutes!
                : 45,
            }));
          }
          setReady(true);
        }
      })
      .catch(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [store, synced]);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  function update(patch: Partial<Answers>) {
    const next = { ...answers, ...patch };
    setAnswers(next);
    // Only changes to the outbound payload require renewed consent.
    if (
      Object.keys(patch).some(
        (key) => !["name", "start_date", "adult", "symptoms"].includes(key),
      )
    )
      setConsent(false);
    setError("");
    setPreview(null);
    void store
      .saveDraft("guided-plan", { answers: next, step, form_version: 2 })
      .catch(() =>
        setError(
          "Bu cihazda taslak saklanamadı. Sayfayı kapatmadan işlemi tamamla.",
        ),
      );
  }
  function go(next: number) {
    setStep(next);
    setError("");
    void store
      .saveDraft("guided-plan", {
        answers,
        step: Math.min(next, 8),
        form_version: 2,
      })
      .catch(() => setError("Taslak cihazda saklanamadı."));
  }
  const total = Object.values(answers.focus).reduce((a, b) => a + b, 0);
  const isEndurance = enduranceOnly(answers.methods);
  const isRunning = answers.methods.includes("running");
  const combat = answers.sport_ids.some(
    (id) => sports.find((s) => s.id === id)?.category === "combat",
  );
  const showPerformance =
    isRunning ||
    isEndurance ||
    answers.methods.some((m) => branchMethods.includes(m)) ||
    combat;
  const showMuscles = answers.methods.some((m) =>
    ["weights", "calisthenics", "gymnastics"].includes(m),
  );
  const branchMode = answers.methods.some((m) => branchMethods.includes(m));
  const selectedProfiles = sportTraining.filter((p) =>
    answers.sport_ids.includes(p.sport_id),
  );
  const minDays = branchMode
    ? Math.max(1, activeBranches(answers).length)
    : answers.split === "push_pull_legs"
      ? 3
      : answers.split === "upper_lower"
        ? 2
        : 1;
  const valid =
    phase === 1
      ? !!answers.goal.trim()
      : phase === 3
        ? answers.weekdays.length > 0 && answers.weekdays.length <= 6
        : phase === 5
          ? answers.weekdays.length >= minDays
          : phase === 6
            ? !!answers.name.trim() && !!answers.start_date
            : step === 1
              ? answers.methods.length > 0 &&
                (!branchMode || answers.sport_ids.length > 0)
              : true;
  const environmentOptions = Array.from(
    new Map([
      ...(isRunning ? runningEquipment : []),
      ...(combat ? combatEquipment : []),
      ...(answers.methods.includes("swimming") ? swimmingEquipment : []),
      ...(showMuscles ||
      (!isRunning && !combat && !answers.methods.includes("swimming"))
        ? equipmentOptions.map(
            (e, i) => [e, equipmentNames[i]] as [string, string],
          )
        : []),
    ]).entries(),
  );
  function toggleMethod(key: string) {
    const next = nextMethods(answers.methods, key);
    const priorityIds = focusOptions(next.methods, combat).map(([id]) => id);
    update({
      ...next,
      performance_focus: (answers.performance_focus || []).filter((id) =>
        priorityIds.includes(id),
      ),
      ...(enduranceOnly(next.methods)
        ? { focus: {}, objective: "endurance" }
        : {}),
      sport_methods:
        key === "running" &&
        next.methods.includes("running") &&
        !answers.sport_ids.some((id) =>
          ["running", "trail-running", "track-running"].includes(id),
        )
          ? { ...branchMap(answers), running: [] }
          : answers.sport_methods,
      sport_ids:
        key === "running" &&
        next.methods.includes("running") &&
        !answers.sport_ids.some((id) =>
          ["running", "trail-running", "track-running"].includes(id),
        )
          ? [...answers.sport_ids, "running"]
          : answers.sport_ids,
    });
  }
  function selectBranch(id: string) {
    const profile = sportTraining.find((p) => p.sport_id === id);
    if (!profile) return;
    const next = addBranch(answers, profile);
    update({
      ...next,
      ...(enduranceOnly(next.methods)
        ? { objective: "endurance", focus: {} }
        : next.methods.some((m) => branchMethods.includes(m))
          ? { objective: "technique" }
          : {}),
    });
  }
  function changeBranchMethod(sport: string, method: string) {
    update(toggleBranchMethod(answers, sport, method));
  }
  const capacityIssue = capacityError(answers.competencies, options);
  async function generate() {
    if (busy) return;
    if (capacityIssue) {
      go(2);
      setError(capacityIssue);
      return;
    }
    if (!valid) {
      setError("Program adı ve başlangıç tarihini tamamla.");
      return;
    }
    if (engine === "ai") {
      if (!aiStatus?.available) {
        setSetupOpen(true);
        setError(
          aiStatus
            ? "AI bağlantısı henüz hazır değil. Aşağıdaki AI kurulumu adımlarını tamamlayıp bağlantıyı yeniden kontrol et. Onay kutusu tek başına API bağlantısını açmaz."
            : "Bağlantı durumu kontrol ediliyor. Birazdan tekrar dene.",
        );
        return;
      }
      if (!answers.adult || answers.symptoms) {
        setError(
          "AI planı için yetişkin onayını kontrol et. Belirti bildirdiğinde otomatik AI planı oluşturulmaz.",
        );
        return;
      }
      if (!consent) {
        setError("AI taslağı oluşturmak için veri gönderim onayını işaretle.");
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      const result = (await api(
        engine === "ai" ? "ai-program-drafts" : "guided-program-drafts",
        {
          method: "POST",
          headers: { "X-CSRF-Token": store.me.csrf },
          body: JSON.stringify(
            engine === "ai"
              ? {
                  ...answers,
                  ...(isEndurance
                    ? { split: "endurance_days", focus: {} }
                    : {}),
                  consent: aiStatus?.consent_version ?? "planning-form-v1",
                }
              : {
                  ...answers,
                  ...(isEndurance
                    ? { split: "endurance_days", focus: {} }
                    : {}),
                },
          ),
        },
      )) as Preview;
      setPreview(result);
      go(9);
    } catch (e) {
      if (e instanceof ApiError && e.code === "ai_no_candidates") {
        go(e.details.section === "competencies" ? 2 : 4);
      }
      setError(
        (e as Error).name === "TimeoutError"
          ? "AI yanıtı bekleme süresini aştı. Form seçimlerin korundu; biraz sonra yeniden deneyebilirsin."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  function choices(
    key: "experience" | "objective" | "split",
    options: [string, string, string][],
  ) {
    return (
      <div className="guided-options">
        {options.map(([value, title, text]) => (
          <button
            type="button"
            className="guided-option secondary"
            aria-pressed={answers[key] === value}
            key={value}
            onClick={() => update({ [key]: value })}
          >
            <strong>
              {title}
              {answers[key] === value && <Check size={18} />}
            </strong>
            <span>{text}</span>
          </button>
        ))}
      </div>
    );
  }
  if (!ready) return <p role="status">Plan tercihlerin açılıyor…</p>;
  return (
    <section
      className="card guided-plan"
      aria-label="Adım adım program oluştur"
    >
      <div className="guided-top">
        <span className="eyebrow">Sana göre bir başlangıç · {step + 1}/10</span>
        <button className="text-button" disabled={busy} onClick={onClose}>
          Daha sonra
        </button>
      </div>
      <progress
        max={10}
        value={step + 1}
        aria-label="Program oluşturma ilerlemesi"
      />
      <h2 ref={heading} tabIndex={-1}>
        {step === 2 && isRunning
          ? "Hangi koşu türlerini daha önce yaptın?"
          : step === 6 && showPerformance
            ? "Hangi performans hedefleri önceliğin?"
            : step === 7 && isEndurance
              ? "Dayanıklılık haftanı nasıl düzenleyelim?"
              : titles[step]}
      </h2>
      <fieldset className="guided-fields" disabled={busy}>
        {phase === 0 && (
          <>
            {choices("experience", [
              [
                "new",
                "Yeni başlıyorum",
                "Hareketleri ve düzenli çalışmayı öğreniyorum.",
              ],
              [
                "returning",
                "Ara verdim, geri dönüyorum",
                "Önce ritmimi tekrar kurmak istiyorum.",
              ],
              [
                "regular",
                "Düzenli çalışıyorum",
                "Temel hareketleri biliyorum.",
              ],
              [
                "advanced",
                "İleri düzeyim",
                "Planımı ayrıntılı düzenlemek istiyorum.",
              ],
            ])}
            <p>
              Bu seçim yalnız bu taslağı etkiler; mevcut profilini veya
              geçmişini değiştirmez.
            </p>
          </>
        )}
        {step === 1 && (
          <>
            <label>
              Branş ara
              <input
                type="search"
                value={sportSearch}
                onChange={(e) => setSportSearch(e.target.value)}
                placeholder="Koşu, yüzme, binicilik…"
              />
            </label>
            <label>
              Branş kategorisi
              <select
                aria-label="Branş kategorisi"
                value={sportCategory}
                onChange={(e) => setSportCategory(e.target.value)}
              >
                <option value="">Tüm kategoriler</option>
                {[
                  ...new Set(
                    sports.map((s) => s.category_label || "Diğer branşlar"),
                  ),
                ]
                  .sort((a, b) => a.localeCompare(b, "tr"))
                  .map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Çalıştığın branşı ekle
              <select
                aria-label="Çalıştığın branşı ekle"
                value=""
                onChange={(e) => e.target.value && selectBranch(e.target.value)}
              >
                <option value="">
                  199 branştan seç · birden fazla ekleyebilirsin
                </option>
                <SportOptions
                  sports={sports.filter(
                    (s) =>
                      !answers.sport_ids.includes(s.id) &&
                      (!sportCategory || s.category_label === sportCategory) &&
                      (
                        s.name +
                        " " +
                        (s.aliases || "") +
                        " " +
                        (s.category_label || "")
                      )
                        .toLocaleLowerCase("tr-TR")
                        .includes(sportSearch.toLocaleLowerCase("tr-TR")),
                  )}
                />
              </select>
            </label>
            <div className="actions">
              {answers.sport_ids.map((id) => (
                <button
                  key={id}
                  className="secondary small"
                  onClick={() =>
                    update({
                      ...removeBranch(answers, id),
                      sport_readiness: (answers.sport_readiness || []).filter(
                        (r) => r.sport_id !== id,
                      ),
                      competencies: answers.competencies.filter(
                        (c) =>
                          options.find((o) => o.movement_id === c.movement_id)
                            ?.sport_id !== id,
                      ),
                      sport_experience: answers.sport_experience.filter(
                        (s) => s.sport_id !== id,
                      ),
                    })
                  }
                >
                  {sports.find((s) => s.id === id)?.name || id} · kaldır
                </button>
              ))}
            </div>
            <label>
              Spor geçmişin ve şu anki düzenin
              <textarea
                maxLength={1000}
                value={answers.training_history}
                onChange={(e) => update({ training_history: e.target.value })}
                placeholder="Örneğin 2 yıldır yüzüyorum, haftada 3 seans; serbest ve sırtüstü biliyorum."
              />
            </label>
            <p>
              Branşların ve burada yazdığın geçmiş AI taslağının bağlamına
              eklenir. Aşağıda programa katmak istediğin çalışma yöntemlerini
              seç.
            </p>
            <p>
              Birden fazla yöntem seçebilirsin. Hibrit, bu yöntemlerin tek
              haftada birlikte planlanmasıdır.
            </p>
            {sportCategory &&
              !selectedProfiles.some(
                (p) =>
                  sports.find((s) => s.id === p.sport_id)?.category_label ===
                  sportCategory,
              ) && (
                <section
                  className="notice"
                  aria-label="Kategoriye uygun yöntemler"
                >
                  <h3>{sportCategory} yöntemleri</h3>
                  <p>
                    Yöntemleri seçebilmek için yukarıdan bu kategorideki
                    branşını ekle.
                  </p>
                  {sportTraining
                    .filter(
                      (p) =>
                        sports.find((s) => s.id === p.sport_id)
                          ?.category_label === sportCategory,
                    )
                    .slice(0, 3)
                    .map((p) => (
                      <p key={p.sport_id}>
                        <strong>{p.name}:</strong>{" "}
                        {p.techniques
                          .slice(0, 3)
                          .map((t) => t.name)
                          .join(", ")}
                        ; uygulama ve teknik analiz.
                      </p>
                    ))}
                </section>
              )}
            <BranchMethods
              profiles={selectedProfiles}
              state={answers}
              onBranch={changeBranchMethod}
              onSupport={toggleMethod}
            />
            <p>
              Branş yöntemleri sonraki adımdaki teknikleri ve AI taslağını
              belirler. Katalog temel çalışma başlıklarını içerir; eksiksiz
              uzman müfredatı değildir.
            </p>
          </>
        )}
        {step === 2 && (
          <>
            {isRunning && (
              <fieldset>
                <legend>Koşu geçmişin ve hedefin</legend>
                <p>
                  Değerleri bilmiyorsan boş bırak. Hedef mesafe ölçülmüş
                  kapasite sayılmaz; pace veya nabız eşiği uydurulmaz.
                </p>
                {(
                  [
                    [
                      "continuous_minutes",
                      "Şu an rahatça kesintisiz koşabildiğin dakika",
                      240,
                    ],
                    [
                      "weekly_minutes",
                      "Son haftalarda haftalık koşu süren (dakika)",
                      3000,
                    ],
                    ["target_distance_km", "Hedef koşu mesafen (km)", 200],
                  ] as const
                ).map(([key, label, max]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      min={key === "weekly_minutes" ? 0 : 0.1}
                      max={max}
                      step="any"
                      value={answers.running_profile?.[key] ?? ""}
                      onChange={(e) =>
                        update({
                          running_profile: {
                            target_distance_km: null,
                            continuous_minutes: null,
                            weekly_minutes: null,
                            ...answers.running_profile,
                            [key]: e.target.value
                              ? Number(e.target.value)
                              : null,
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </fieldset>
            )}
            {branchMode && (
              <SportTrainingFields
                profiles={selectedProfiles.filter((p) =>
                  activeBranches(answers).includes(p.sport_id),
                )}
                readiness={answers.sport_readiness || []}
                onChange={(sport_readiness) => update({ sport_readiness })}
              />
            )}
            {branchMode && (
              <p>
                Teknik listesinden bildiğin ve eğitmeninle kontrollü
                çalışabildiğin hareketleri seç. Taktik analiz ve genel uygulama
                blokları için ayrıca hareket işaretlemek gerekmez.
              </p>
            )}
            {answers.sport_ids.map((id) => {
              const entry = answers.sport_experience.find(
                (s) => s.sport_id === id,
              );
              const change = (patch: Partial<SportExperience>) =>
                update({
                  sport_experience: [
                    ...answers.sport_experience.filter(
                      (s) => s.sport_id !== id,
                    ),
                    {
                      sport_id: id,
                      level: null,
                      years: null,
                      sessions_per_week: null,
                      session_minutes: null,
                      known_skills: "",
                      ...entry,
                      ...patch,
                    },
                  ],
                });
              return (
                <details key={id} className="card">
                  <summary>
                    {sports.find((s) => s.id === id)?.name || id} · branşa özgü
                    deneyimim
                  </summary>
                  <p>
                    Bu branştaki geçmişin diğer sporlardaki yeterliğinden ayrı
                    değerlendirilir. Alanları boş bırakırsan bilinmiyor olarak
                    kalır.
                  </p>
                  <label>
                    Bu branştaki seviyem
                    <select
                      aria-label={id + " seviyesi"}
                      value={entry?.level || ""}
                      onChange={(e) => change({ level: e.target.value })}
                    >
                      <option value="" disabled>
                        Seç
                      </option>
                      <option value="new">Yeni başlıyorum</option>
                      <option value="returning">Ara verdim</option>
                      <option value="regular">Düzenli çalışıyorum</option>
                      <option value="advanced">İleri düzey</option>
                    </select>
                  </label>
                  <div className="form-grid">
                    {(
                      [
                        ["years", "Kaç yıldır yapıyorsun?", 0, 100],
                        [
                          "sessions_per_week",
                          "Şu an haftada kaç seans?",
                          0,
                          21,
                        ],
                        [
                          "session_minutes",
                          "Ortalama seans süresi (dk)",
                          5,
                          480,
                        ],
                      ] as const
                    ).map(([key, label, min, max]) => (
                      <label key={key}>
                        {label}
                        <input
                          aria-label={id + " " + label}
                          type="number"
                          min={min}
                          max={max}
                          step={key === "years" ? 0.5 : 1}
                          value={entry?.[key] ?? ""}
                          onChange={(e) =>
                            change({
                              [key]:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    Bildiğin teknikler ve takip ettiğin performans
                    <textarea
                      maxLength={500}
                      value={entry?.known_skills || ""}
                      onChange={(e) => change({ known_skills: e.target.value })}
                      placeholder="Örneğin serbest yüzme, 100 m sürem; boksta bildiğim teknikler…"
                    />
                  </label>
                </details>
              );
            })}
            <p>
              Yalnız tekniğini bildiğin ve kontrollü yapabildiğin hareketleri
              seç. İleri düzey seçmek, front lever veya muscle-up yapabildiğin
              anlamına gelmez. Sayılar isteğe bağlı, kendi bildirdiğin güncel
              kapasitedir.
            </p>
            {optionsError && <p role="alert">{optionsError}</p>}
            <label>
              Hareket ara
              <input
                type="search"
                value={capabilitySearch}
                onChange={(e) => setCapabilitySearch(e.target.value)}
                placeholder={
                  isRunning
                    ? "Örneğin tempo, interval, uzun koşu"
                    : branchMode
                      ? "Örneğin jab, kata, geçiş tekniği"
                      : "Örneğin front lever, barfiks, squat"
                }
              />
            </label>
            <p>
              {answers.competencies.length} hareket seçildi. Arama seçimlerini
              değiştirmez.
            </p>
            <div className="capability-options">
              {options
                .filter(
                  (o) =>
                    (!o.sport_id ||
                      (answers.sport_ids.includes(o.sport_id) &&
                        o.methods.some((m) =>
                          (branchMap(answers)[o.sport_id!] || []).includes(m),
                        ))) &&
                    o.methods.some((m) => answers.methods.includes(m)) &&
                    `${o.name} ${o.movement_id}`
                      .toLocaleLowerCase("tr")
                      .includes(capabilitySearch.toLocaleLowerCase("tr")),
                )
                .map((o) => {
                  const selected = answers.competencies.find(
                    (c) => c.movement_id === o.movement_id,
                  );
                  return (
                    <div className="capability-choice" key={o.movement_id}>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={(e) =>
                            update({
                              competencies: e.target.checked
                                ? [
                                    ...answers.competencies,
                                    { movement_id: o.movement_id },
                                  ]
                                : answers.competencies.filter(
                                    (c) => c.movement_id !== o.movement_id,
                                  ),
                            })
                          }
                        />
                        {o.name}
                      </label>
                      {selected && (
                        <label>
                          {o.run_form === "interval"
                            ? "Tek koşu aralığının süresi (sn, isteğe bağlı)"
                            : o.sport_id
                              ? "Bir turdaki kontrollü çalışma süren (sn, isteğe bağlı)"
                              : o.block === "conditioning"
                                ? "Kesintisiz çalışma süresi (sn)"
                                : o.metric === "seconds"
                                  ? "Kontrollü tutuş / süre (sn)"
                                  : "Kontrollü tekrar sayısı"}
                          <input
                            aria-label={o.name + " kapasitesi"}
                            type="number"
                            min={o.metric === "seconds" ? 0.01 : 1}
                            max={capacityMaximum(o)}
                            step={o.metric === "seconds" ? "any" : 1}
                            inputMode="numeric"
                            value={
                              (o.metric === "seconds"
                                ? selected.seconds
                                : selected.reps) ?? ""
                            }
                            onChange={(e) =>
                              update({
                                competencies: answers.competencies.map((c) =>
                                  c.movement_id === o.movement_id
                                    ? {
                                        movement_id: c.movement_id,
                                        ...(e.target.value
                                          ? {
                                              [o.metric === "seconds"
                                                ? "seconds"
                                                : "reps"]: Number(
                                                e.target.value,
                                              ),
                                            }
                                          : {}),
                                      }
                                    : c,
                                ),
                              })
                            }
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
            </div>
            <p>
              Boş bıraktığın kapasiteye test sonucu uydurulmaz. Seçmediğin ileri
              beceriler programa konulmaz.
            </p>
          </>
        )}
        {phase === 1 && (
          <>
            {choices(
              "objective",
              isEndurance
                ? [
                    [
                      "endurance",
                      "Dayanıklılık ve mesafe",
                      "Rahat sürdürülebilen süre ve düzenli çalışma.",
                    ],
                    [
                      "technique",
                      "Teknik ve tempo kontrolü",
                      "Bildiğin koşu/yüzme çalışmalarında kontrollü uygulama.",
                    ],
                  ]
                : [
                    [
                      "power",
                      "Patlayıcı güç",
                      "Bildiğin sıçrama/atış teknikleriyle hız ve teknik kalite; yöntemlerde patlayıcı gücü de seç.",
                    ],
                    [
                      "endurance",
                      "Dayanıklılık",
                      "Koşu veya yüzmede süre ve düzenli katılım hedefi.",
                    ],
                    [
                      "technique",
                      "Tekniğimi geliştirmek",
                      "Bildiğin becerileri kontrollü çalışmak; yeni teknikler için eğitmen desteği.",
                    ],
                    [
                      "hypertrophy",
                      "Kas geliştirmek",
                      "Kas gelişimine yönelik başlangıç taslağı.",
                    ],
                    [
                      "strength",
                      "Güçlenmek",
                      "Kuvvet odağı ve daha uzun dinlenmeler.",
                    ],
                    [
                      "strength_hypertrophy",
                      "İkisi birlikte",
                      "Kuvvet ve kas gelişimini birlikte takip et.",
                    ],
                  ],
            )}
            <label>
              Somut hedefin ne?
              <textarea
                maxLength={1000}
                placeholder={
                  isRunning
                    ? "Örneğin 8 haftada düzenli koşmak ve rahat 5 km tamamlamak"
                    : combat
                      ? "Örneğin ayak çalışması ve raunt dayanıklılığımı geliştirmek"
                      : "Örneğin 8 haftada düzen kurmak ve şınav sayımı takip etmek"
                }
                value={answers.goal}
                onChange={(e) => update({ goal: e.target.value })}
              />
            </label>
            <p>
              Ölçülebilir hedeflerini Gelişim bölümünden takip edebilirsin.
              Hedefin, gerçekleşmiş performans veya gelişim garantisi değildir.
            </p>
          </>
        )}
        {phase === 2 && (
          <>
            <p>
              {isRunning
                ? "Koşabileceğin ortamı seç. Pist, yol, park, patika ve yokuş farklı seçeneklerdir; saat veya nabız sensörü zorunlu değildir."
                : "Yalnız gerçekten kullanabildiğin ekipmanları seç. Partner ve eğitmen bilgisi ayrıca değerlendirilir."}
            </p>
            <div className="guided-options">
              {environmentOptions.map(([item, label]) => (
                <button
                  className="guided-option secondary"
                  aria-pressed={answers.equipment.includes(item)}
                  key={item}
                  onClick={() =>
                    update({
                      equipment: answers.equipment.includes(item)
                        ? answers.equipment.filter((e) => e !== item)
                        : [...answers.equipment, item],
                    })
                  }
                >
                  {label}
                  {answers.equipment.includes(item) && <Check size={18} />}
                </button>
              ))}
            </div>
          </>
        )}
        {phase === 3 && (
          <>
            <fieldset>
              <legend>Çalışabileceğin günler · en fazla 6</legend>
              <div className="guided-options">
                {names.map((name, index) => (
                  <button
                    type="button"
                    className="guided-option secondary"
                    aria-pressed={answers.weekdays.includes(index)}
                    key={name}
                    disabled={
                      !answers.weekdays.includes(index) &&
                      answers.weekdays.length === 6
                    }
                    onClick={() =>
                      update({
                        weekdays: answers.weekdays.includes(index)
                          ? answers.weekdays.filter((d) => d !== index)
                          : [...answers.weekdays, index].sort(),
                      })
                    }
                  >
                    {name}
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              Bir seansa ayırabileceğin süre
              <select
                aria-label="Bir seansa ayırabileceğin süre"
                value={answers.minutes}
                onChange={(e) => update({ minutes: Number(e.target.value) })}
              >
                {[15, 20, 30, 45, 60, 75, 90, 120, 180].map((m) => (
                  <option key={m} value={m}>
                    {m} dakika
                  </option>
                ))}
              </select>
            </label>
            {!isEndurance &&
              answers.methods.some((m) =>
                ["conditioning", "running", "swimming"].includes(m),
              ) && (
                <label>
                  Bir seanstaki kondisyon süresi
                  <select
                    aria-label="Bir seanstaki kondisyon süresi"
                    value={answers.conditioning_minutes}
                    onChange={(e) =>
                      update({ conditioning_minutes: Number(e.target.value) })
                    }
                  >
                    {[5, 10, 15, 20, 30, 45].map((n) => (
                      <option key={n} value={n}>
                        {n} dakika
                      </option>
                    ))}
                  </select>
                </label>
              )}
            <p>
              Haftada {answers.weekdays.length * answers.minutes} dakika ·
              seçmediğin günler dinlenme.
            </p>
          </>
        )}
        {phase === 4 && (
          <>
            {showPerformance && (
              <PerformanceFocus
                methods={answers.methods}
                combat={combat}
                value={answers.performance_focus || []}
                onChange={(performance_focus) => update({ performance_focus })}
              />
            )}
            {showMuscles && (
              <details open={!showPerformance}>
                <summary>
                  {showPerformance
                    ? "Ek kuvvet çalışması için kas öncelikleri (isteğe bağlı)"
                    : "Kas bölgesi öncelikleri"}
                </summary>
                <p>
                  İstersen toplam 5 öncelik puanını dağıt. Hepsini kullanmak
                  zorunda değilsin. Bu puanlar büyüme yüzdesi değildir.
                </p>
                <FocusMap focus={answers.focus} />
                <strong role="status">{total} / 5 puan kullanıldı</strong>
                <div className="guided-muscles">
                  {Object.entries(groups).map(([id, name]) => (
                    <div className="guided-muscle" key={id}>
                      <span>{name}</span>
                      <div>
                        <button
                          className="secondary small"
                          aria-label={name + " önceliğini azalt"}
                          disabled={!answers.focus[id]}
                          onClick={() =>
                            update({
                              focus: {
                                ...answers.focus,
                                [id]: (answers.focus[id] || 0) - 1,
                              },
                            })
                          }
                        >
                          −
                        </button>
                        <output aria-label={name + " öncelik puanı"}>
                          {answers.focus[id] || 0}
                        </output>
                        <button
                          className="secondary small"
                          aria-label={name + " önceliğini artır"}
                          disabled={total >= 5}
                          onClick={() =>
                            update({
                              focus: {
                                ...answers.focus,
                                [id]: (answers.focus[id] || 0) + 1,
                              },
                            })
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
        {phase === 5 && (
          <>
            {choices(
              "split",
              isEndurance
                ? [
                    [
                      "endurance_days",
                      "Dayanıklılık günleri",
                      "Koşu/yüzme çalışmaları süre ve günlere göre düzenlenir. Koşuda kolay günler temel, yoğun çalışma ayrı gündür.",
                    ],
                  ]
                : branchMode
                  ? [
                      [
                        "sport_days",
                        "Branş günleri",
                        "Her güne bir branş; seçtiğin sırayla dönüşümlü. Teknik, uygulama ve destek aynı seansta.",
                      ],
                    ]
                  : [
                      [
                        "full_body",
                        "Tüm vücut",
                        "Her çalışma gününde farklı ana hareketleri bir arada yap.",
                      ],
                      [
                        "upper_lower",
                        "Üst / alt vücut",
                        "Üst ve alt vücut günleri dönüşümlü; en az 2 gün.",
                      ],
                      [
                        "push_pull_legs",
                        "İtiş / çekiş / bacak",
                        "Çalışma günlerini üç gruba ayır; en az 3 gün.",
                      ],
                    ],
            )}
            {!valid && (
              <p role="alert">
                Bu düzen için en az {minDays} çalışma günü seç veya düzeni
                değiştir.
              </p>
            )}
            <label>
              Dönem uzunluğu
              <select
                aria-label="Dönem uzunluğu"
                value={answers.weeks}
                onChange={(e) => update({ weeks: Number(e.target.value) })}
              >
                {[4, 8, 12].map((w) => (
                  <option key={w} value={w}>
                    {w} hafta
                  </option>
                ))}
              </select>
            </label>
            {branchMode && (
              <section aria-label="Haftalık branş dağılımı">
                <h3>Haftanın çalışma düzeni</h3>
                {[...answers.weekdays].sort().map((day, i) => (
                  <p key={day}>
                    {names[day]} ·{" "}
                    {sports.find(
                      (s) =>
                        s.id ===
                        activeBranches(answers)[
                          i % activeBranches(answers).length
                        ],
                    )?.name || "Önce branş seç"}
                  </p>
                ))}
              </section>
            )}
            <p>
              Haftalık plan tekrar eder. Otomatik ağırlık artırılmaz;
              değişiklikleri yeni plan sürümüyle onaylarsın.
            </p>
          </>
        )}
        {phase === 6 && (
          <>
            <label>
              Program adı
              <input
                maxLength={150}
                value={answers.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </label>
            <label>
              Başlangıç tarihi
              <input
                type="date"
                value={answers.start_date}
                onChange={(e) => update({ start_date: e.target.value })}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={answers.adult}
                onChange={(e) => update({ adult: e.target.checked })}
              />
              18 yaş veya üzerindeyim.
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={answers.symptoms}
                onChange={(e) => update({ symptoms: e.target.checked })}
              />
              Şu anda hastalık, yaralanma veya değerlendirilmesi gereken belirti
              var.
            </label>
            <p>
              Yetişkin onayı yoksa veya belirtiler varsa AI çağrısı yapılmaz.
              Standart taslakta otomatik hareket dozu yerine düzenleyebileceğin
              gün planı hazırlanır. Kayıtlı sağlık uyarıları da dikkate alınır.
            </p>
            <div className="card">
              <h3>Planı nasıl hazırlayalım?</h3>
              <fieldset className="planner-engine-options">
                <legend>Hazırlama yöntemi</legend>
                <label className="check">
                  <input
                    type="radio"
                    name="planner-engine"
                    value="ai"
                    checked={engine === "ai"}
                    onChange={() => {
                      setEngine("ai");
                      setError("");
                    }}
                  />
                  AI ile hazırla
                </label>
                <label className="check">
                  <input
                    type="radio"
                    name="planner-engine"
                    value="standard"
                    checked={engine === "standard"}
                    onChange={() => {
                      setEngine("standard");
                      setError("");
                    }}
                  />
                  Standart taslak
                </label>
              </fieldset>
              {engine === "ai" && (
                <>
                  <p role="status">
                    {aiStatus?.message || "AI bağlantısı kontrol ediliyor…"}
                  </p>
                  {!aiStatus?.available && (
                    <div className="notice">
                      <strong>AI üretimi için bağlantı kurulmalı</strong>
                      <p>
                        Seçimini ve onayını verebilirsin. Program üretmek için
                        uygulama sahibinin AI sağlayıcı hesabını ve sunucu
                        bağlantısını tamamlaması gerekiyor.
                      </p>
                      <button
                        type="button"
                        className="secondary"
                        aria-expanded={setupOpen}
                        onClick={() => setSetupOpen(!setupOpen)}
                      >
                        AI kurulum adımları
                      </button>
                      {setupOpen && (
                        <ol>
                          <li>
                            <a
                              href={
                                aiStatus?.provider === "EVREN"
                                  ? "https://evren.ssyz.org.tr/llm/models"
                                  : "https://developers.openai.com/api/docs/quickstart"
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {aiStatus?.provider ?? "OpenAI"} API hesabını ve
                              anahtarını oluştur.
                            </a>
                          </li>
                          <li>
                            API anahtarı ve model, uygulama sahibi tarafından
                            sunucunun gizli ayarlarına eklenmeli. Anahtarı bu
                            forma veya sohbete yazma.
                          </li>
                          <li>
                            Sunucu yeniden başladıktan sonra aşağıdaki bağlantı
                            kontrolünü çalıştır.
                          </li>
                        </ol>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    className="secondary"
                    disabled={aiStatus === null}
                    onClick={() => {
                      setError("");
                      setStatusRevision((n) => n + 1);
                    }}
                  >
                    Bağlantıyı yeniden kontrol et
                  </button>
                  <p>
                    AI; hedefini, ekipmanını, yöntemlerini, deneyimini,
                    bildirdiğin hareket kapasitesini, gün/süre ve performans
                    önceliklerini {aiStatus?.provider ?? "AI sağlayıcısı"}{" "}
                    üzerinden değerlendirir. Sağlayıcının kota ve ücretlendirme
                    koşulları geçerlidir.
                  </p>
                  <p>
                    Hesap kimliğin, şifren ve kayıtlı sağlık geçmişin
                    gönderilmez. Serbest hedef alanına yazdıkların gönderilir;
                    buraya kimlik veya özel sağlık bilgisi yazma.
                  </p>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => {
                        setConsent(e.target.checked);
                        setError("");
                      }}
                    />
                    Bu formdaki planlama bilgilerimin AI taslağı için{" "}
                    {aiStatus?.provider === "EVREN" ? "EVREN’e" : "OpenAI'ye"}{" "}
                    gönderilmesini kabul ediyorum.
                  </label>
                  <p>
                    AI taslağı ekipman, süre ve kayıt kurallarından geçer. Son
                    düzenlemeyi ve ana plana alma kararını sen verirsin.
                  </p>
                </>
              )}
            </div>
          </>
        )}
        {phase === 7 && preview && (
          <>
            <h3>{preview.program.name}</h3>
            {preview.program.ai_origin && (
              <div className="notice">
                <strong>AI ile hazırlanan taslak</strong>
                <p>{preview.program.ai_origin.summary}</p>
                <p>
                  Model: {preview.program.ai_origin.model} · Düzenleyip
                  onayladıktan sonra planına alınır.
                </p>
              </div>
            )}
            {preview.review.status === "needs_review" && (
              <p className="notice" role="status">
                Bazı günler veya hedefler eksik kaldı. Aşağıdaki uyarıları
                gözden geçir; süreyi, ekipmanı veya yetkinliklerini
                değiştirebilirsin.
              </p>
            )}
            <div className="notice">
              {preview.notes
                .filter(
                  (n) =>
                    n.includes("eksik") ||
                    n.includes("karşılan") ||
                    n.includes("kondisyon isteği") ||
                    n.startsWith("Teknik çalışma sırası düzenlendi:"),
                )
                .map((n) => (
                  <p key={n}>{n}</p>
                ))}
            </div>
            <p>
              {answers.weeks} hafta · haftada {answers.weekdays.length} gün ·{" "}
              {answers.goal}
            </p>
            {preview.program.days.map((day) => (
              <details
                key={day.weekday}
                className="plan-day"
                open={
                  day.weekday ===
                  preview.program.days.find((d) => d.kind === "training")
                    ?.weekday
                }
              >
                <summary>
                  {names[day.weekday]} ·{" "}
                  {day.kind === "rest"
                    ? "Dinlenme"
                    : `${day.label} · ${day.exercises.length} hareket · ${preview.review.days.find((d) => d.weekday === day.weekday)?.estimated_minutes ?? "—"} dk`}
                </summary>
                {day.exercises.map((e, i) => {
                  const info = preview.review.days
                    .find((d) => d.weekday === day.weekday)
                    ?.blocks?.find((b) => b.movement_id === e.movement_id);
                  const blocks: Record<string, string> = {
                    skill: "Teknik / beceri",
                    main: "Ana çalışma",
                    accessory: "Tamamlayıcı",
                    conditioning: "Kondisyon",
                  };
                  return (
                    <div className="plan-exercise-summary" key={i}>
                      <span className="eyebrow">
                        {info ? blocks[info.block] : "Çalışma"}
                      </span>
                      <p>
                        <strong>{e.name}</strong>
                      </p>
                      <p>
                        {e.sets} set ×{" "}
                        {e.seconds != null
                          ? `${e.seconds} saniye`
                          : `${e.reps} tekrar`}{" "}
                        · {e.rest_seconds} sn dinlenme
                        {e.rir != null ? ` · ${e.rir} tekrar yedek` : ""}
                      </p>
                      <details>
                        <summary>Neden bu hareket?</summary>
                        <p>{info?.reason || "Seçimlerinle oluşturuldu."}</p>
                      </details>
                    </div>
                  );
                })}
                {day.kind === "training" && (
                  <p>
                    Tahmini{" "}
                    {preview.review.days.find((d) => d.weekday === day.weekday)
                      ?.estimated_minutes ?? "—"}{" "}
                    dakika
                  </p>
                )}
              </details>
            ))}
            <details>
              <summary>
                {showMuscles
                  ? "Kas dağılımı ve seçim gerekçeleri"
                  : "Çalışma süresi ve seçim gerekçeleri"}
              </summary>
              <p>{preview.review.meaning}</p>
              {showMuscles &&
                Object.entries(preview.review.muscle_sets).map(([id, n]) => (
                  <p key={id}>
                    {groups[id]}: {n} ağırlıklandırılmış set / hafta
                  </p>
                ))}
              <p>
                Teknik tekrar setleri: {preview.review.skill_sets} set · toplam
                tutuş: {preview.review.isometric_seconds} sn · kondisyon:{" "}
                {Math.round(preview.review.conditioning_seconds / 60)} dk /
                hafta
              </p>
              <p>{preview.review.duration_assumptions}</p>
              {branchMode && (
                <p>
                  Branş çalışmalarında her satırdaki tur × saniye ayrı takip
                  edilir; bu süreler kas gelişimi yüzdesi değildir.
                </p>
              )}
              {preview.notes.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </details>
            <p>
              Hedefler gerçek antrenman kaydı değildir. Sonraki ekranda
              hareketleri değiştirebilir, taslağı kaydedip ana planın olarak
              seçebilirsin.
            </p>
          </>
        )}
        {((step === 2 && capacityIssue) || error) && (
          <p className="error" role="alert">
            {(step === 2 && capacityIssue) || error}
          </p>
        )}
      </fieldset>
      <div className="guided-footer">
        <button
          className="secondary"
          disabled={phase === 0 || busy}
          onClick={() => go(step - 1)}
        >
          <ArrowLeft size={18} />
          Geri
        </button>
        {phase < 6 ? (
          <button
            disabled={!valid || (step === 2 && !!capacityIssue)}
            onClick={() => go(step + 1)}
          >
            Devam
            <ArrowRight size={18} />
          </button>
        ) : phase === 6 ? (
          <button disabled={busy} onClick={() => void generate()}>
            <Sparkles size={18} />
            {busy
              ? "Taslak hazırlanıyor…"
              : engine === "ai"
                ? "AI ile programımı hazırla"
                : "Programımı hazırla"}
          </button>
        ) : (
          <button
            onClick={() => preview && onUse(preview.program, preview.notes)}
          >
            Düzenle ve kaydet
            <ArrowRight size={18} />
          </button>
        )}
      </div>
      {busy && engine === "ai" && (
        <p role="status">
          AI taslağı hazırlanıyor. Yanıt yaklaşık 1–3 dakika sürebilir;
          seçimlerin korunuyor.
        </p>
      )}
    </section>
  );
}
