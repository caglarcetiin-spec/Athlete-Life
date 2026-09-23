export function today(
  zone = "Europe/Istanbul",
  now = new Date(),
  boundary = 0,
) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now.getTime() - boundary * 3600000));
}
export function addDays(value: string, days: number) {
  const d = new Date(value + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function weekOf(value: string, start = 0) {
  const day = (new Date(value + "T12:00:00Z").getUTCDay() + 6) % 7;
  return addDays(value, -((day - start + 7) % 7));
}
export function selectedAfterTick(
  selected: string,
  followingToday: boolean,
  now: string,
) {
  return followingToday ? now : selected;
}
export function displayDate(value: string, weekday = false) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    ...(weekday ? { weekday: "long" as const } : {}),
    timeZone: "UTC",
  }).format(new Date(value + "T12:00:00Z"));
}
