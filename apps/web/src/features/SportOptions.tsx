export type SportOption = {
  id: string;
  name: string;
  aliases?: string;
  category?: string;
  category_label?: string;
};
export function SportOptions({ sports }: { sports: SportOption[] }) {
  const groups = new Map<string, SportOption[]>();
  for (const sport of sports) {
    const label = sport.category_label || "Diğer branşlar";
    groups.set(label, [...(groups.get(label) || []), sport]);
  }
  return (
    <>
      {[...groups]
        .sort(([a], [b]) => a.localeCompare(b, "tr"))
        .map(([label, items]) => (
          <optgroup key={label} label={label}>
            {items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        ))}
    </>
  );
}
