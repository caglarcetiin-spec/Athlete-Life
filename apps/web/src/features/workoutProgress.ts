import type { Entity } from "../api/contracts";
export function plannedDays(date: string, programs: Entity[], days: Entity[]) {
  const instant = Date.parse(date + "T12:00:00Z");
  const weekday = (new Date(instant).getUTCDay() + 6) % 7;
  return days.filter(
    (d) =>
      Number(d.weekday) === weekday &&
      programs.some((p) => {
        const week =
          Math.floor(
            (instant - Date.parse(String(p.start_date) + "T12:00:00Z")) /
              604800000,
          ) + 1;
        return (
          p.status === "active" &&
          p.id === d.program_id &&
          week >= Number(d.first_week || 1) &&
          week <= Math.min(Number(d.last_week || p.weeks), Number(p.weeks))
        );
      }),
  );
}
