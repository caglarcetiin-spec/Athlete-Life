import { QuantityInput } from "./QuantityInput";
import { useState } from "react";
import { api } from "../api/contracts";
import type { SyncStore } from "../sync/store";
type Estimate = {
  known_seconds: number;
  estimated_seconds: number | null;
  unknown_sets: number;
  meaning: string;
};
export function DurationPreview({
  store,
  day,
  minutes,
}: {
  store: SyncStore;
  day: unknown;
  minutes?: number | null;
}) {
  const [original] = useState(() => structuredClone(day));
  const [budget, setBudget] = useState(String(minutes || "")),
    [execution, setExecution] = useState(""),
    [transition, setTransition] = useState("");
  const [result, setResult] = useState<Estimate[] | null>(null),
    [error, setError] = useState("");
  async function preview() {
    try {
      const values = [execution, transition].map((s) =>
        s.trim() ? Number(s.replace(",", ".")) : null,
      );
      if (
        values.some(
          (v) => v !== null && (!Number.isFinite(v) || v < 0 || v > 86400),
        )
      )
        throw new Error("Süreleri 0–86400 saniye teknik aralığında gir.");
      const results = await Promise.all(
        [original, day].map((d) =>
          api("program-duration", {
            method: "POST",
            headers: { "X-CSRF-Token": store.me.csrf },
            body: JSON.stringify({
              days: [d],
              execution_seconds: values[0],
              transition_seconds: values[1],
            }),
          }),
        ),
      );
      setResult(results as Estimate[]);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <details>
      <summary>Süre bütçesi ve değişiklik önizlemesi</summary>
      <div className="form-grid">
        <label>
          Ayırabildiğim dakika
          <input
            inputMode="numeric"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>
        <QuantityInput
          label="Tekrarla ölçülen setin tahmini süresi"
          kind="duration"
          value={execution}
          onChange={(v) => setExecution(String(v ?? ""))}
        />
        <QuantityInput
          label="Hareketler arası geçiş"
          kind="duration"
          value={transition}
          onChange={(v) => setTransition(String(v ?? ""))}
        />
      </div>
      <button
        type="button"
        className="secondary"
        onClick={() => void preview()}
      >
        Öncesi ve taslağı karşılaştır
      </button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div>
          {result.map((r, i) => (
            <p key={i}>
              <strong>
                {i === 0 ? "Açılıştaki gün" : "Düzenlediğin taslak"}:
              </strong>{" "}
              {r.estimated_seconds === null
                ? `Tahmin eksik; bilinen süre ${Math.round(r.known_seconds / 60)} dakika, süresi bilinmeyen ${r.unknown_sets} set`
                : `Yaklaşık ${(r.estimated_seconds / 60).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} dakika`}
            </p>
          ))}
          {result[1].estimated_seconds !== null && Number(budget) > 0 && (
            <p>
              {result[1].estimated_seconds > Number(budget) * 60
                ? "Taslak belirttiğin bütçeyi aşıyor."
                : "Varsayımlara göre bütçe içinde; kesin süre garantisi değildir."}
            </p>
          )}
          <p>{result[1].meaning}</p>
        </div>
      )}
      <p>
        Kısaltma otomatik yapılmaz. Yukarıdaki hareket/setleri düzenleyip tekrar
        karşılaştır; yalnız yeni plan sürümünü onayladığında uygulanır. Geçmiş
        gerçek setler korunur.
      </p>
    </details>
  );
}
