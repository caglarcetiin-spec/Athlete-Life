import { today } from "./time";
export const routes = new Set([
  "today",
  "week",
  "workout",
  "program",
  "nutrition",
  "health",
  "capability",
  "status",
  "reports",
  "science",
  "goals",
  "system",
  "backups",
  "tools",
  "profile",
  "guide",
  "events",
]);
export function readLocation(url: URL, fallback = today()) {
  const candidate = url.searchParams.get("date");
  const valid =
    !!candidate &&
    /^\d{4}-\d{2}-\d{2}$/.test(candidate) &&
    !Number.isNaN(Date.parse(candidate + "T12:00:00Z")) &&
    new Date(candidate + "T12:00:00Z").toISOString().slice(0, 10) === candidate;
  const hash = url.hash.slice(1);
  return {
    route: routes.has(hash) ? hash : "today",
    selected: valid ? candidate : fallback,
    following: !valid,
  };
}
