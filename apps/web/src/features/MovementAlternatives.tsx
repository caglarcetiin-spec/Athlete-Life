import { useState } from "react";
import { api } from "../api/contracts";
import type { SyncStore } from "../sync/store";
import { profilePayload, type PlanningPrefs } from "./PlanningPreferences";
type Candidate = {
  modality: string;
  equipment: string;
  load_kind: string;
  catalog_version: string;
  movement_id: string;
  name: string;
  reason: string;
  difference: string;
};
export function MovementAlternatives({
  store,
  movementId,
  onSelect,
}: {
  store: SyncStore;
  movementId: string;
  onSelect: (c: Candidate) => void;
}) {
  const [rows, setRows] = useState<Candidate[] | null>(null),
    [message, setMessage] = useState("");
  return (
    <details>
      <summary>Ekipmana göre alternatif / tercihim</summary>
      <p>
        Ağrı nedeniyle değişiklik istiyorsan sağlık günlüğüne kaydet. Bu bölüm
        tıbbi uygunluk önermez.
      </p>
      <button
        type="button"
        className="secondary"
        onClick={() =>
          void api(
            "movement-alternatives?movement_id=" +
              encodeURIComponent(movementId),
          )
            .then((v) => {
              const r = v as { candidates: Candidate[]; notice: string };
              setRows(r.candidates);
              setMessage(r.notice);
            })
            .catch((e) => setMessage(e.message))
        }
      >
        Alternatifleri incele
      </button>
      <button
        type="button"
        className="text-button"
        onClick={() => {
          const p = store.view("profile")[0];
          if (!p) {
            setMessage("Önce profilini oluştur.");
            return;
          }
          const prefs = (p.planning_preferences || {}) as PlanningPrefs;
          void store
            .enqueue("profile.save", p, {
              ...profilePayload(p),
              planning_preferences: {
                ...prefs,
                disliked_movements: (prefs.disliked_movements || []).includes(
                  movementId,
                )
                  ? (prefs.disliked_movements || []).filter(
                      (id) => id !== movementId,
                    )
                  : [...(prefs.disliked_movements || []), movementId],
              },
            })
            .then(() =>
              setMessage(
                "Tercihin kaydedildi; sağlık kısıtı olarak yorumlanmaz.",
              ),
            )
            .catch((e) => setMessage(e.message));
        }}
      >
        {(
          (store.view("profile")[0]?.planning_preferences as PlanningPrefs)
            ?.disliked_movements || []
        ).includes(movementId)
          ? "Tercih dışı işaretini kaldır"
          : "Bu hareketi tercih etmiyorum"}
      </button>
      {message && <p role="status">{message}</p>}
      {rows?.length === 0 && (
        <p>
          Doğrulanmış ekipman ve örüntüyle uygun aday bulunamadı. Profil
          ekipmanlarını düzenleyebilir veya manuel seçebilirsin.
        </p>
      )}
      {rows?.map((r) => (
        <article key={r.movement_id}>
          <strong>{r.name}</strong>
          <p>
            {r.reason}. {r.difference}
          </p>
          <button type="button" onClick={() => onSelect(r)}>
            Taslakta bu hareketle değiştir
          </button>
        </article>
      ))}
    </details>
  );
}
