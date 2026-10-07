export function estimateInfo(value: unknown): { assumption: string; sources: string[] } | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.source === "estimated-reference-portion") return {
    assumption: String(data.assumption || "Referans porsiyondan hesaplandı"),
    sources: Array.isArray(data.sources) ? data.sources.filter((s): s is string => typeof s === "string" && s.startsWith("https://")) : [],
  };
  return estimateInfo(data.original_source);
}
export function MealEstimateNote({ snapshot }: { snapshot: unknown }) {
  const info = estimateInfo(snapshot);
  if (!info) return null;
  return <div><strong>Tahmini besin değerleri</strong><p>{info.assumption}</p>
    <small>Düzenleme veya kopyalama yapıldıysa ilk tahminin varsayımları gösterilir. Değerler ölçüm değildir.</small>
    <p>{info.sources.map((url,i) => <a key={url} href={url} target="_blank" rel="noreferrer">Kaynak {i+1} </a>)}</p>
  </div>;
}
