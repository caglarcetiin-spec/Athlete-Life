import { useState } from "react";
import type { SyncStore } from "../sync/store";
import { today } from "../time";
import { profilePayload, type PlanningPrefs } from "./PlanningPreferences";

export type AthleteContext = {
  age_years: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  sex: "female" | "male" | "intersex" | "unspecified";
  training_months: number | null;
  recorded_on: string;
  cycle: {
    applicable: "yes" | "no" | "unspecified";
    last_start: string | null;
    length_days: number | null;
    bleeding_days: number | null;
    preference: "continue" | "pause" | "decide";
    confirm_estimated_breaks: boolean;
  };
};
export const emptyCycle = (): AthleteContext["cycle"] => ({
  applicable: "unspecified",
  last_start: null,
  length_days: null,
  bleeding_days: null,
  preference: "decide",
  confirm_estimated_breaks: false,
});
export const emptyIntake = (): AthleteContext => ({
  age_years: null,
  height_cm: null,
  weight_kg: null,
  sex: "unspecified",
  training_months: null,
  recorded_on: today(),
  cycle: emptyCycle(),
});
export function intakeError(v: AthleteContext | null | undefined): string {
  if (!v) return "Yaşını, boyunu, kilonu ve spor geçmişini tamamla.";
  for (const [key, label, min, max, integer] of [
    ["age_years", "Yaş", 13, 100, true],
    ["height_cm", "Boy", 70, 250, false],
    ["weight_kg", "Kilo", 20, 400, false],
    ["training_months", "Spor geçmişi", 0, 1000, true],
  ] as const) {
    const n = v[key];
    if (
      n === null ||
      !Number.isFinite(n) ||
      n < min ||
      n > max ||
      (integer && !Number.isInteger(n))
    )
      return `${label}: ${min}–${max} arasında ${integer ? "tam " : ""}bir sayı gir.`;
  }
  const c = v.cycle;
  if (c.applicable === "yes") {
    if (c.last_start && c.last_start > today())
      return "Son adet başlangıcı gelecekte olamaz.";
    if (
      c.length_days !== null &&
      (!Number.isInteger(c.length_days) ||
        c.length_days < 15 ||
        c.length_days > 90)
    )
      return "Döngü uzunluğunu 15–90 gün arasında gir veya boş bırak.";
    if (
      c.bleeding_days !== null &&
      (!Number.isInteger(c.bleeding_days) ||
        c.bleeding_days < 1 ||
        c.bleeding_days > 14)
    )
      return "Adet süresini 1–14 gün arasında gir veya boş bırak.";
    if (c.preference === "pause" && (!c.last_start || !c.bleeding_days))
      return "Ara vereceğin günleri belirlemek için son başlangıç ve adet süresi gerekli. Bilmiyorsan gün gün karar ver seç.";
    if (c.confirm_estimated_breaks && !c.length_days)
      return "Tahmini ara günleri için döngü uzunluğunu gir.";
  }
  return "";
}
export function IntakeFields({
  value,
  onChange,
}: {
  value: AthleteContext;
  onChange: (v: AthleteContext) => void;
}) {
  const patch = (v: Partial<AthleteContext>) =>
    onChange({ ...value, ...v, recorded_on: today() });
  const cycle = (v: Partial<AthleteContext["cycle"]>) =>
    patch({ cycle: { ...value.cycle, ...v } });
  return (
    <fieldset className="intake-fields">
      <legend>Bedenin ve spor geçmişin</legend>
      <p>
        Ölçülerini kendin bildirirsin. Bu bilgiler beden yapısı, kas oranı veya
        sağlık tanısı olarak yorumlanmaz.
      </p>
      <div className="intake-grid">
        {(
          [
            ["age_years", "Yaşın", 13, 100, 1],
            ["height_cm", "Boyun (cm)", 70, 250, 0.1],
            ["weight_kg", "Kilon (kg)", 20, 400, 0.1],
            ["training_months", "Toplam spor geçmişin (ay)", 0, 1000, 1],
          ] as const
        ).map(([key, label, min, max, step]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              inputMode={step === 1 ? "numeric" : "decimal"}
              min={min}
              max={max}
              step={step}
              required
              value={value[key] ?? ""}
              onChange={(e) =>
                patch({
                  [key]: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
        ))}
        <label>
          Cinsiyet
          <select
            aria-label="Cinsiyet"
            value={value.sex}
            onChange={(e) => {
              const sex = e.target.value as AthleteContext["sex"];
              patch({
                sex,
                cycle:
                  sex === "male" || sex === "unspecified"
                    ? emptyCycle()
                    : value.cycle,
              });
            }}
          >
            <option value="unspecified">Belirtmek istemiyorum</option>
            <option value="female">Kadın</option>
            <option value="male">Erkek</option>
            <option value="intersex">İnterseks</option>
          </select>
        </label>
      </div>
      <p>
        Hiç spor yapmadıysan geçmişine 0 yaz. Program temel hareketleri öğrenme
        ve düzen oluşturma ile başlar. Her branştaki deneyimini sonraki
        adımlarda ayrıca belirtebilirsin.
      </p>
      {value.age_years !== null && value.age_years < 18 && (
        <p className="notice">
          18 yaş altında otomatik AI planı hazırlanmaz. Bir uzmanla hazırladığın
          programı elle kaydedebilirsin.
        </p>
      )}
      {(value.sex === "female" || value.sex === "intersex") && (
        <fieldset>
          <legend>Adet döngüsü ve çalışma tercihin · isteğe bağlı</legend>
          <label>
            Döngü bilgisi eklemek ister misin?
            <select
              aria-label="Döngü bilgisi eklemek ister misin?"
              value={value.cycle.applicable}
              onChange={(e) =>
                patch({
                  cycle: {
                    ...emptyCycle(),
                    applicable: e.target
                      .value as AthleteContext["cycle"]["applicable"],
                  },
                })
              }
            >
              <option value="unspecified">Paylaşmak istemiyorum</option>
              <option value="yes">Evet, planımda kullan</option>
              <option value="no">Benim için geçerli değil</option>
            </select>
          </label>
          {value.cycle.applicable === "yes" && (
            <>
              <div className="intake-grid">
                <label>
                  Son adet başlangıcı
                  <input
                    type="date"
                    max={today()}
                    value={value.cycle.last_start || ""}
                    onChange={(e) =>
                      cycle({ last_start: e.target.value || null })
                    }
                  />
                </label>
                <label>
                  Adet süresi (gün)
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={value.cycle.bleeding_days ?? ""}
                    onChange={(e) =>
                      cycle({
                        bleeding_days: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  />
                </label>
                <label>
                  Genellikle iki başlangıç arası (gün)
                  <input
                    type="number"
                    min={15}
                    max={90}
                    placeholder="Düzensiz veya bilinmiyorsa boş bırak"
                    value={value.cycle.length_days ?? ""}
                    onChange={(e) =>
                      cycle({
                        length_days: e.target.value
                          ? Number(e.target.value)
                          : null,
                        confirm_estimated_breaks: false,
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Adet günlerinde nasıl çalışmak istersin?
                <select
                  aria-label="Adet günlerinde nasıl çalışmak istersin?"
                  value={value.cycle.preference}
                  onChange={(e) =>
                    cycle({
                      preference: e.target
                        .value as AthleteContext["cycle"]["preference"],
                      confirm_estimated_breaks: false,
                    })
                  }
                >
                  <option value="decide">Gün gün kendim karar vereceğim</option>
                  <option value="continue">
                    Aynı programla devam etmek istiyorum
                  </option>
                  <option value="pause">
                    Bu günlerde ara vermek istiyorum
                  </option>
                </select>
              </label>
              {value.cycle.preference === "pause" && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={value.cycle.confirm_estimated_breaks}
                    disabled={!value.cycle.length_days}
                    onChange={(e) =>
                      cycle({ confirm_estimated_breaks: e.target.checked })
                    }
                  />
                  Döngü uzunluğuma göre tahmin edilen gelecek adet günlerini de
                  bu planda dinlenme olarak kullan.
                </label>
              )}
              <p>
                Gelecek tarihler tahmindir; hormon veya performans ölçümü
                değildir. Ara vermeyi seçersen ilgili günler dinlenme olur, yük
                başka güne yığılmaz. Tarihin değişirse taslağını yeniden
                hazırla. Gün gün karar verme ve devam etme seçenekleri planın
                takvimini değiştirmez.
              </p>
            </>
          )}
        </fieldset>
      )}
    </fieldset>
  );
}
export function AthleteAssessment({
  store,
  onSaved,
}: {
  store: SyncStore;
  onSaved?: () => void;
}) {
  const profile = store.view("profile")[0];
  const prefs = (profile?.planning_preferences || {}) as PlanningPrefs;
  const [value, setValue] = useState<AthleteContext>(
    () =>
      prefs.intake || {
        ...emptyIntake(),
        sex: (profile?.sex as AthleteContext["sex"]) || "unspecified",
      },
  );
  const [experience, setExperience] = useState(
    String(profile?.experience || "new"),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        const problem = intakeError(value);
        if (problem) {
          setError(problem);
          return;
        }
        try {
          const current = store.view("profile")[0];
          await store.enqueue("profile.save", current || null, {
            ...(current ? profilePayload(current) : {}),
            sex: value.sex,
            experience: value.training_months === 0 ? "new" : experience,
            cycle_tracking: value.cycle.applicable === "yes",
            planning_preferences: {
              ...((current?.planning_preferences as PlanningPrefs) || {}),
              intake: { ...value, recorded_on: today() },
            },
          });
          setMessage("Bilgilerin cihazda kaydedildi; sunucuya eşitleniyor.");
          onSaved?.();
        } catch (err) {
          setError((err as Error).message);
        }
      }}
    >
      <h2>Başlangıç analizin</h2>
      <p>
        Önce seni tanıyalım. Sonra branşlarını, hedefini, ekipmanlarını ve
        haftalık düzenini seçip programını birlikte hazırlayacağız.
      </p>
      <IntakeFields value={value} onChange={setValue} />
      {value.training_months !== 0 && (
        <label>
          Şu anki antrenman düzeyin
          <select
            aria-label="Şu anki antrenman düzeyin"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          >
            <option value="new">Yeni başlıyorum</option>
            <option value="returning">Ara verdim, geri dönüyorum</option>
            <option value="regular">Düzenli çalışıyorum</option>
            <option value="advanced">İleri düzeyim</option>
          </select>
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button disabled={Boolean(profile?.local_pending)}>
        {onSaved
          ? "Analizi kaydet ve planına geç"
          : "Analiz bilgilerimi kaydet"}
      </button>
    </form>
  );
}
