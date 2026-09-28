import { useState } from "react";
import type { Entity } from "../api/contracts";
import type { SyncStore } from "../sync/store";
export type EquipmentProfile = {
  id: string;
  name: string;
  revision: number;
  equipment: string[];
  available_kg: number[];
  original_text: string;
};
export type PlanningPrefs = {
  goal?: string;
  weekdays?: number[];
  minutes?: number | null;
  equipment_profiles?: EquipmentProfile[];
  active_equipment_id?: string | null;
  disliked_movements?: string[];
  optional_modules?: string[];
};
export const equipmentOptions = [
  "Barbell",
  "Squat Rack",
  "Dumbbell",
  "Pull-Up Bar",
  "Rings",
  "Weight Belt",
  "EZ Bar",
  "Backpack",
  "Parallettes",
  "Elevated Support",
  "Outdoor",
  "Treadmill",
  "Bench",
  "Pool",
  "Medicine Ball",
];
const labels = [
  "Bar",
  "Squat rack",
  "Dambıl",
  "Barfiks barı",
  "Halka",
  "Ağırlık kemeri",
  "EZ bar",
  "Sırt çantası",
  "Paralel tutacak",
  "Yükseltilmiş destek",
  "Dış mekân",
  "Koşu bandı",
  "Ağırlık sehpası",
  "Yüzme havuzu",
  "Sağlık topu",
];
export function profilePayload(profile: Entity) {
  return Object.fromEntries(
    [
      "birth_date",
      "sex",
      "experience",
      "cycle_tracking",
      "interface_mode",
      "avatar_id",
      "equipment",
      "sport_ids",
      "tutorial_completed",
      "planning_preferences",
    ]
      .filter((k) => profile[k] !== undefined)
      .map((k) => [k, profile[k]]),
  );
}
export function PlanningPreferences({
  store,
  profile,
}: {
  store: SyncStore;
  profile: Entity;
}) {
  const [prefs, setPrefs] = useState<PlanningPrefs>(
    (profile.planning_preferences as PlanningPrefs) || {},
  );
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const profiles = prefs.equipment_profiles || [];
  const change = (p: EquipmentProfile, patch: Partial<EquipmentProfile>) =>
    setPrefs({
      ...prefs,
      equipment_profiles: profiles.map((r) =>
        r.id === p.id ? { ...r, ...patch, revision: r.revision + 1 } : r,
      ),
    });
  return (
    <section className="card">
      <h2>Planlama tercihlerim</h2>
      <p>
        Seçimin yeni plan ve seanslarda saklanır. Geçmiş seansın ekipman bilgisi
        değişmez.
      </p>
      <label>
        Hedefim
        <input
          value={prefs.goal || ""}
          maxLength={1000}
          onChange={(e) => setPrefs({ ...prefs, goal: e.target.value })}
        />
      </label>
      <label>
        Bir seans için ayırabileceğim dakika
        <input
          type="number"
          min={1}
          max={1440}
          value={prefs.minutes ?? ""}
          onChange={(e) =>
            setPrefs({
              ...prefs,
              minutes: e.target.value ? Number(e.target.value) : null,
            })
          }
        />
      </label>
      <fieldset>
        <legend>Uygun günlerim</legend>
        {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((label, i) => (
          <label className="check" key={i}>
            <input
              type="checkbox"
              checked={(prefs.weekdays || [0, 2, 4]).includes(i)}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  weekdays: e.target.checked
                    ? [...(prefs.weekdays || [0, 2, 4]), i]
                    : (prefs.weekdays || [0, 2, 4]).filter((d) => d !== i),
                })
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>İsteğe bağlı günlükler</legend>
        {[
          ["nutrition", "Beslenme"],
          ["sleep", "Uyku"],
          ["hydration", "Su"],
        ].map(([id, label]) => (
          <label className="check" key={id}>
            <input
              type="checkbox"
              checked={(
                prefs.optional_modules || ["nutrition", "sleep", "hydration"]
              ).includes(id)}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  optional_modules: e.target.checked
                    ? [
                        ...(prefs.optional_modules || [
                          "nutrition",
                          "sleep",
                          "hydration",
                        ]),
                        id,
                      ]
                    : (
                        prefs.optional_modules || [
                          "nutrition",
                          "sleep",
                          "hydration",
                        ]
                      ).filter((v) => v !== id),
                })
              }
            />
            {label}
          </label>
        ))}
        <small>Kapatmak geçmiş kayıtlarını silmez.</small>
      </fieldset>
      <h3>Ekipman profillerim</h3>
      <p>
        Önceki serbest kayıt:{" "}
        {((profile.equipment as string[]) || []).join(", ") || "Belirtilmemiş"}.
        Aşağıdan doğrulayarak seç.
      </p>
      {profiles.map((p) => (
        <fieldset key={p.id}>
          <legend>
            {p.name} · {p.revision}. sürüm
          </legend>
          <label>
            Profil adı
            <input
              value={p.name}
              maxLength={100}
              onChange={(e) => change(p, { name: e.target.value })}
            />
          </label>
          <label className="check">
            <input
              type="radio"
              name="active-equipment"
              checked={prefs.active_equipment_id === p.id}
              onChange={() => setPrefs({ ...prefs, active_equipment_id: p.id })}
            />
            Yeni plan ve seanslarda kullan
          </label>
          <div className="form-grid">
            {equipmentOptions.map((id, i) => (
              <label className="check" key={id}>
                <input
                  type="checkbox"
                  checked={p.equipment.includes(id)}
                  onChange={(e) =>
                    change(p, {
                      equipment: e.target.checked
                        ? [...p.equipment, id]
                        : p.equipment.filter((v) => v !== id),
                    })
                  }
                />
                {labels[i]}
              </label>
            ))}
          </div>
          <label>
            Mevcut toplam ağırlıklar (kg, noktalı virgülle ayır)
            <input
              defaultValue={p.available_kg.join("; ")}
              placeholder="Örneğin 5; 7,5; 10"
              onBlur={(e) => {
                const values = e.target.value.trim()
                  ? e.target.value
                      .split(";")
                      .map((v) => Number(v.trim().replace(",", ".")))
                  : [];
                if (
                  values.some((v) => !Number.isFinite(v) || v < 0 || v > 2000)
                ) {
                  setError(
                    "Ağırlıkları kg olarak, noktalı virgülle ayırarak gir.",
                  );
                  return;
                }
                setError("");
                change(p, { available_kg: values });
              }}
            />
          </label>
        </fieldset>
      ))}
      <button
        className="secondary"
        onClick={() =>
          setPrefs({
            ...prefs,
            equipment_profiles: [
              ...profiles,
              {
                id: crypto.randomUUID(),
                name: "Yeni ekipman profilim",
                revision: 1,
                equipment: [],
                available_kg: [],
                original_text: ((profile.equipment as string[]) || []).join(
                  ", ",
                ),
              },
            ],
          })
        }
      >
        Ekipman profili ekle
      </button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button
        disabled={!!profile.local_pending || !!error}
        onClick={() =>
          void store
            .enqueue("profile.save", profile, {
              ...profilePayload(profile),
              planning_preferences: prefs,
            })
            .then(() =>
              setNotice(
                "Tercihlerin cihazda kaydedildi; sunucu eşitlemesi bekleniyor.",
              ),
            )
            .catch((e) => setError(e.message))
        }
      >
        Tercihlerimi kaydet
      </button>
    </section>
  );
}
