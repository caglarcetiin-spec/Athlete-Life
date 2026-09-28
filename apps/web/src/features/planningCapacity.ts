type Capacity = { movement_id: string; reps?: number; seconds?: number };
type Option = {
  movement_id: string;
  name: string;
  metric: string;
  block: string;
};

export function capacityMaximum(option: Pick<Option, "metric" | "block">) {
  return option.metric === "seconds"
    ? [
        "conditioning",
        "sport_technique",
        "sport_practice",
        "sport_tactics",
      ].includes(option.block)
      ? 86400
      : 600
    : 100;
}

export function capacityError(capacities: Capacity[], options: Option[]) {
  for (const capacity of capacities) {
    const option = options.find((o) => o.movement_id === capacity.movement_id);
    if (!option) continue; // Catalog eligibility is also checked by the server.
    const value =
      option.metric === "seconds" ? capacity.seconds : capacity.reps;
    const max = capacityMaximum(option);
    if (
      value != null &&
      (!Number.isFinite(value) ||
        value <= 0 ||
        value > max ||
        (option.metric !== "seconds" && !Number.isInteger(value)))
    ) {
      return `${option.name}: ${option.metric === "seconds" ? `0’dan büyük, en fazla ${max} saniye` : "1–100 arasında tam sayı tekrar"} gir veya kapasiteyi boş bırak.`;
    }
  }
  return "";
}
