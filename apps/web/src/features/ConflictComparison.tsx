import type { Pending } from "../sync/store";
const labels: Record<string, string> = {
  name: "Ad",
  title: "Başlık",
  local_date: "Tarih",
  value: "Değer",
  unit: "Birim",
  metric: "Ölçüm",
  reps: "Tekrar",
  external_kg: "Harici yük (kg)",
  rir: "Yedekte tekrar",
  rpe: "Bildirilen efor",
  seconds: "Süre (sn)",
  note: "Not",
  social: "Sosyal not",
  days: "Plan günleri",
  status: "Durum",
  goal: "Hedef",
  planning_preferences: "Planlama tercihleri",
  equipment: "Ekipman",
  intensity: "Şiddet",
  area: "Bölge",
  grams: "Porsiyon (g)",
  kcal: "Enerji (kcal)",
  protein_g: "Protein (g)",
};
const display = (v: unknown) =>
  v == null
    ? "Bilinmiyor"
    : typeof v === "object"
      ? JSON.stringify(v)
      : String(v);
export function ConflictComparison({ pending }: { pending: Pending }) {
  return (
    <div className="table-scroll">
      <table>
        <caption>Değiştirdiğin alanlar</caption>
        <thead>
          <tr>
            <th>Alan</th>
            <th>Düzenleme öncesi</th>
            <th>Bu cihaz</th>
            <th>Sunucu</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(pending.command.payload).map(([key, value]) => (
            <tr key={key}>
              <th>{labels[key] || key.replaceAll("_", " ")}</th>
              <td>{display(pending.base?.[key])}</td>
              <td>{display(value)}</td>
              <td>{display(pending.current?.[key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
