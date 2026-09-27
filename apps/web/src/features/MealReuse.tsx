import { useState } from "react";
import type { SyncStore } from "../sync/store";
import { profilePayload, type PlanningPrefs } from "./PlanningPreferences";
export function MealReuse({
  store,
  selected,
}: {
  store: SyncStore;
  selected: string;
}) {
  const [id, setId] = useState(""),
    [grams, setGrams] = useState(""),
    [date, setDate] = useState(selected),
    [message, setMessage] = useState("");
  const rows = store
    .view("meal")
    .filter((r) => !r.local_pending)
    .sort((a, b) => String(b.local_date).localeCompare(String(a.local_date)));
  const profile = store.view("profile")[0],
    prefs = (profile?.planning_preferences || {}) as PlanningPrefs & {
      favorite_meal_ids?: string[];
    };
  const source = rows.find((r) => r.id === id),
    favorite = prefs.favorite_meal_ids || [];
  const factor =
    grams && source?.grams
      ? Number(grams.replace(",", ".")) / Number(source.grams)
      : 1;
  return (
    <details className="card">
      <summary>Son öğünü veya favorimi tekrar kullan</summary>
      <label>
        Kaydedilmiş öğün
        <select
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setGrams("");
          }}
        >
          <option value="">Öğün seç</option>
          {rows
            .filter((r, i) => i < 200 || favorite.includes(r.id))
            .sort(
              (a, b) =>
                Number(favorite.includes(b.id)) -
                Number(favorite.includes(a.id)),
            )
            .map((r) => (
              <option key={r.id} value={r.id}>
                {favorite.includes(r.id) ? "★ " : ""}
                {String(r.name)} · {String(r.local_date)}
              </option>
            ))}
        </select>
      </label>
      {source && (
        <>
          <label>
            Kopyanın tarihi
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {source.grams != null && (
            <label>
              Yeni porsiyon (g, boşsa aynı)
              <input
                inputMode="decimal"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
              />
            </label>
          )}
          <p>
            Önizleme: {date} · {String(source.name)} ·{" "}
            {source.kcal == null
              ? "Enerji bilinmiyor"
              : `${(Number(source.kcal) * factor).toLocaleString("tr-TR")} kcal`}{" "}
            ·{" "}
            {source.protein_g == null
              ? "Protein bilinmiyor"
              : `${(Number(source.protein_g) * factor).toLocaleString("tr-TR")} g protein`}
          </p>
          <p>
            Kaydedildiği sürüm kullanılır; güncel tarif değişiklikleri bu
            kopyaya taşınmaz.
          </p>
          <div className="actions">
            <button
              onClick={() => {
                if (!date || !Number.isFinite(factor) || factor <= 0) {
                  setMessage("Tarih ve porsiyonu kontrol et.");
                  return;
                }
                void store
                  .enqueue("meal.save", null, {
                    local_date: date,
                    name: source.name,
                    meal_type: source.meal_type,
                    copy_from: source.id,
                    grams: grams ? Number(grams.replace(",", ".")) : null,
                  })
                  .then(() => {
                    setMessage(
                      "Kopya kaydedildi; eşitleme durumunu üstten izleyebilirsin.",
                    );
                    setId("");
                  })
                  .catch((e) => setMessage(e.message));
              }}
            >
              Önizlemeyi onayla ve ekle
            </button>
            {profile && (
              <button
                className="secondary"
                disabled={!!profile.local_pending}
                onClick={() =>
                  void store
                    .enqueue("profile.save", profile, {
                      ...profilePayload(profile),
                      planning_preferences: {
                        ...prefs,
                        favorite_meal_ids: favorite.includes(id)
                          ? favorite.filter((v) => v !== id)
                          : [...favorite, id],
                      },
                    })
                    .catch((e) => setMessage(e.message))
                }
              >
                {favorite.includes(id) ? "Favoriden çıkar" : "Favoriye ekle"}
              </button>
            )}
          </div>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
