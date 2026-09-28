export type Measure = "duration" | "distance";
export const units = {
  duration: [
    ["s", "Saniye", 1],
    ["min", "Dakika", 60],
    ["h", "Saat", 3600],
  ],
  distance: [
    ["m", "Metre", 1],
    ["km", "Kilometre", 1000],
  ],
} as const;
export function factor(kind: Measure, unit: string) {
  return units[kind].find((u) => u[0] === unit)?.[2] || 1;
}
export function canonical(
  raw: string,
  multiplier: number,
): number | string | null {
  if (!raw.trim()) return null;
  if (!/^\d+(?:[.,]\d+)?$/.test(raw.trim())) return raw;
  const value = Number(raw.replace(",", ".")) * multiplier;
  return Number.isFinite(value) ? Number(value.toPrecision(12)) : raw;
}
export function preferredUnit(value: unknown, kind: Measure) {
  const n = Number(String(value).replace(",", "."));
  return kind === "distance"
    ? n >= 1000
      ? "km"
      : "m"
    : n >= 3600
      ? "h"
      : n >= 60
        ? "min"
        : "s";
}
export function displayed(value: unknown, multiplier: number) {
  if (value == null || value === "") return "";
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n)
    ? String(Number((n / multiplier).toPrecision(12)))
    : String(value);
}
export function formatQuantity(value: unknown, kind: Measure) {
  if (value == null || value === "") return "—";
  const unit = preferredUnit(value, kind);
  return `${displayed(value, factor(kind, unit)).replace(".", ",")} ${{ s: "sn", min: "dk", h: "saat", m: "m", km: "km" }[unit]}`;
}
export function measureFor(key: string): Measure | undefined {
  return [
    "seconds",
    "rest_seconds",
    "duration_seconds",
    "execution_seconds",
    "transition_seconds",
  ].includes(key)
    ? "duration"
    : key === "distance_m"
      ? "distance"
      : undefined;
}
export function formatRange(minimum: number, maximum: number, kind: Measure) {
  const unit = preferredUnit(minimum || maximum, kind),
    f = factor(kind, unit);
  const suffix = { s: "sn", min: "dk", h: "saat", m: "m", km: "km" }[unit];
  return `${displayed(minimum, f).replace(".", ",")}–${displayed(maximum, f).replace(".", ",")} ${suffix}`;
}
export function primaryMetrics(
  modality: string,
  movementId: string,
  seconds?: unknown,
  reps?: unknown,
) {
  if (modality === "cardio") return ["seconds", "distance_m"];
  if (
    modality === "isometric" ||
    modality === "circuit" ||
    (modality === "skill" &&
      (movementId === "mobility" || (seconds != null && reps == null)))
  )
    return ["seconds"];
  return ["reps", "external_kg"];
}
