import { FocusMap } from "./FocusMap";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { api } from "../api/contracts";
import type { SyncStore } from "../sync/store";
import type { PlanDraft } from "./Programming";
import { today } from "../time";
import { type PlanningPrefs, equipmentOptions } from "./PlanningPreferences";

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
];
type Answers = {
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
    days: { weekday: number; estimated_minutes: number }[];
    muscle_sets: Record<string, number>;
    meaning: string;
    duration_assumptions: string;
  };
};
const titles = [
  "Nereden başlıyoruz?",
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
  const [preview, setPreview] = useState<Preview | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const synced = Boolean(store.snapshot);
  useEffect(() => {
    if (!synced) return;
    let live = true;
    void store
      .loadDraft("guided-plan")
      .then((saved) => {
        if (live) {
          if (saved?.answers) {
            setAnswers(saved.answers);
            setStep(Math.min(saved.step || 0, 6));
          } else {
            const current = store.view("profile")[0];
            const prefs = (current?.planning_preferences ||
              {}) as PlanningPrefs;
            const equipment = prefs.equipment_profiles?.find(
              (p) => p.id === prefs.active_equipment_id,
            );
            setAnswers((previous) => ({
              ...previous,
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
    setPreview(null);
    void store
      .saveDraft("guided-plan", { answers: next, step })
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
      .saveDraft("guided-plan", { answers, step: Math.min(next, 6) })
      .catch(() => setError("Taslak cihazda saklanamadı."));
  }
  const total = Object.values(answers.focus).reduce((a, b) => a + b, 0);
  const minDays =
    answers.split === "push_pull_legs"
      ? 3
      : answers.split === "upper_lower"
        ? 2
        : 1;
  const valid =
    step === 1
      ? !!answers.goal.trim()
      : step === 3
        ? answers.weekdays.length > 0 && answers.weekdays.length <= 6
        : step === 5
          ? answers.weekdays.length >= minDays
          : step === 6
            ? !!answers.name.trim() && !!answers.start_date
            : true;
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const result = (await api("guided-program-drafts", {
        method: "POST",
        headers: { "X-CSRF-Token": store.me.csrf },
        body: JSON.stringify(answers),
      })) as Preview;
      setPreview(result);
      go(7);
    } catch (e) {
      setError((e as Error).message);
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
        <span className="eyebrow">Sana göre bir başlangıç · {step + 1}/8</span>
        <button className="text-button" onClick={onClose}>
          Daha sonra
        </button>
      </div>
      <progress
        max={8}
        value={step + 1}
        aria-label="Program oluşturma ilerlemesi"
      />
      <h2 ref={heading} tabIndex={-1}>
        {titles[step]}
      </h2>
      {step === 0 && (
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
            ["regular", "Düzenli çalışıyorum", "Temel hareketleri biliyorum."],
            [
              "advanced",
              "İleri düzeyim",
              "Planımı ayrıntılı düzenlemek istiyorum.",
            ],
          ])}
          <p>
            Bu seçim yalnız bu taslağı etkiler; mevcut profilini veya geçmişini
            değiştirmez.
          </p>
        </>
      )}
      {step === 1 && (
        <>
          {choices("objective", [
            [
              "hypertrophy",
              "Kas geliştirmek",
              "Kas gelişimine yönelik başlangıç taslağı.",
            ],
            ["strength", "Güçlenmek", "Kuvvet odağı ve daha uzun dinlenmeler."],
            [
              "strength_hypertrophy",
              "İkisi birlikte",
              "Kuvvet ve kas gelişimini birlikte takip et.",
            ],
          ])}
          <label>
            Somut hedefin ne?
            <textarea
              maxLength={1000}
              placeholder="Örneğin 8 haftada düzen kurmak ve şınav sayımı takip etmek"
              value={answers.goal}
              onChange={(e) => update({ goal: e.target.value })}
            />
          </label>
          <p>
            Kas büyümesine yüzde garantisi vermeyiz. Ölçülebilir hedeflerini
            Durumum bölümünden takip edebilirsin.
          </p>
        </>
      )}
      {step === 2 && (
        <>
          <p>
            Yalnız gerçekten kullanabildiklerini seç. Hiçbiri seçili değilse
            vücut ağırlığı ve zemin kullanılır.
          </p>
          <div className="guided-options">
            {equipmentOptions.map((item, i) => (
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
                {equipmentNames[i]}
                {answers.equipment.includes(item) && <Check size={18} />}
              </button>
            ))}
          </div>
        </>
      )}
      {step === 3 && (
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
          <p>
            Haftada {answers.weekdays.length * answers.minutes} dakika ·
            seçmediğin günler dinlenme.
          </p>
        </>
      )}
      {step === 4 && (
        <>
          <p>
            İstersen toplam 5 öncelik puanını dağıt. Hepsini kullanmak zorunda
            değilsin. Bu puanlar büyüme yüzdesi değildir.
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
        </>
      )}
      {step === 5 && (
        <>
          {choices("split", [
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
          ])}
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
          <p>
            Haftalık plan tekrar eder. Otomatik ağırlık artırılmaz;
            değişiklikleri yeni plan sürümüyle onaylarsın.
          </p>
        </>
      )}
      {step === 6 && (
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
            Yetişkin onayı yoksa veya belirtiler varsa otomatik hareket dozu
            yerine düzenleyebileceğin gün planı hazırlanır. Kayıtlı sağlık
            uyarıları da dikkate alınır.
          </p>
        </>
      )}
      {step === 7 && preview && (
        <>
          <h3>{preview.program.name}</h3>
          <p>
            {answers.weeks} hafta · haftada {answers.weekdays.length} gün ·{" "}
            {answers.goal}
          </p>
          {preview.program.days.map((day) => (
            <details
              key={day.weekday}
              className="plan-day"
              open={day.kind === "training"}
            >
              <summary>
                {names[day.weekday]} ·{" "}
                {day.kind === "rest" ? "Dinlenme" : day.label}
              </summary>
              {day.exercises.map((e, i) => (
                <p key={i}>
                  <strong>{e.name}</strong> · {e.sets} set × {e.reps} tekrar ·{" "}
                  {e.rest_seconds} sn dinlenme · {e.rir} tekrar yedek
                </p>
              ))}
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
            <summary>Kas dağılımı ve seçim gerekçeleri</summary>
            <p>{preview.review.meaning}</p>
            {Object.entries(preview.review.muscle_sets).map(([id, n]) => (
              <p key={id}>
                {groups[id]}: {n} ağırlıklandırılmış set / hafta
              </p>
            ))}
            <p>{preview.review.duration_assumptions}</p>
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
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="guided-footer">
        <button
          className="secondary"
          disabled={step === 0 || busy}
          onClick={() => go(step - 1)}
        >
          <ArrowLeft size={18} />
          Geri
        </button>
        {step < 6 ? (
          <button disabled={!valid} onClick={() => go(step + 1)}>
            Devam
            <ArrowRight size={18} />
          </button>
        ) : step === 6 ? (
          <button disabled={!valid || busy} onClick={() => void generate()}>
            <Sparkles size={18} />
            {busy ? "Taslak hazırlanıyor…" : "Programımı hazırla"}
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
    </section>
  );
}
