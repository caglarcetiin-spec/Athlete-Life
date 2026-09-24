import { z } from "zod";
const rangeSchema = z.object({ low: z.number(), high: z.number() });
export type Range = z.infer<typeof rangeSchema>;
export const recoverySchema = z.object({
  version: z.string(),
  meaning: z.string(),
  forecast_assumption: z.string(),
  groups: z.record(
    z.string(),
    z.object({
      fatigue: rangeSchema,
      reserve: rangeSchema,
      last_load_at: z.string(),
      released_since_last_load: rangeSchema,
      forecast: z.array(z.object({ hours: z.number(), fatigue: rangeSchema })),
      uncertain_time: z.boolean(),
      missing_effort: z.boolean(),
      sources: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          local_date: z.string(),
          reps: z.number().nullable(),
          external_kg: z.number().nullable(),
          rir: z.number().nullable(),
          rpe: z.number().nullable(),
        }),
      ),
    }),
  ),
});
export type MuscleRecovery = z.infer<typeof recoverySchema>;
export const muscleNames: Record<string, string> = {
  chest: "Göğüs",
  frontDelts: "Ön omuz",
  sideDelts: "Yan omuz",
  rearDelts: "Arka omuz",
  triceps: "Arka kol",
  biceps: "Ön kol kası",
  forearms: "Önkol",
  lats: "Kanat",
  upperBack: "Üst sırt",
  traps: "Trapez",
  lowerBack: "Bel / omurga çevresi",
  spinalErectors: "Omurga erektörleri",
  abs: "Karın",
  obliques: "Yan karın",
  glutes: "Kalça",
  quads: "Ön bacak",
  hamstrings: "Arka bacak",
  adductors: "İç bacak",
  calves: "Baldır",
  hipFlexors: "Kalça fleksörleri",
  scapular: "Kürek kemiği çevresi",
};
export const regions = [
  "",
  "chest",
  "frontDelts",
  "sideDelts",
  "rearDelts",
  "triceps",
  "biceps",
  "forearms",
  "lats",
  "upperBack",
  "traps",
  "lowerBack",
  "abs",
  "obliques",
  "glutes",
  "quads",
  "hamstrings",
  "adductors",
  "calves",
  "hipFlexors",
  "scapular",
];
export function rangeText(value: Range) {
  return value.low === value.high
    ? `%${value.low.toFixed(1)}`
    : `%${value.low.toFixed(1)}–${value.high.toFixed(1)}`;
}
export function recoveryGroup(report: MuscleRecovery | undefined, key: string) {
  return (
    report?.groups[key] ||
    (key === "lowerBack" ? report?.groups.spinalErectors : undefined)
  );
}
