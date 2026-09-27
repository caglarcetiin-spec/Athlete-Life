import { useEffect, useState } from "react";
import { api } from "../api/contracts";
export type ExerciseDefinition = {
  load_kind: string;
  modality: string;
  id: string;
  name: string;
  catalog_version: string;
  aliases: string[];
  metric: string;
  equipment: string[];
  muscles: Record<string, number>;
};
export function ExercisePicker({
  onSelect,
}: {
  onSelect: (d: ExerciseDefinition) => void;
}) {
  const [catalog, setCatalog] = useState<ExerciseDefinition[]>([]),
    [query, setQuery] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    void api("catalogs")
      .then((v) =>
        setCatalog((v as { movements: ExerciseDefinition[] }).movements),
      )
      .catch(() =>
        setError(
          "Hareket kataloğu açılamadı; özel hareket kaydı yapabilirsin.",
        ),
      );
  }, []);
  const normalize = (s: string) =>
    s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i");
  const results = catalog.filter((d) =>
    [d.name, ...d.aliases].some((n) => normalize(n).includes(normalize(query))),
  );
  return (
    <div className="exercise-picker" onChange={(e) => e.stopPropagation()}>
      <label>
        Katalogda hareket ara
        <input
          aria-label="Katalogda hareket ara"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Örneğin squat veya çömelme"
        />
      </label>
      <label>
        Katalogdan hareket seç
        <select
          aria-label="Katalogdan hareket seç"
          value=""
          onChange={(e) => {
            const d = catalog.find((d) => d.id === e.target.value);
            if (d) onSelect(d);
          }}
        >
          <option value="">Seçim yap — özel hareket için aşağıya yaz</option>
          {results.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="status">{error}</p>}
      <small>
        Katalog seçimi hareket kimliğini kaydeder. Benzer görünen farklı
        varyasyonlar birleştirilmez.
      </small>
    </div>
  );
}
