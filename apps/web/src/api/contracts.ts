import { z } from "zod";
import type { components } from "./generated";
export const entitySchema = z
  .object({
    id: z.uuid(),
    version: z.number().int().nonnegative(),
    deleted_at: z.string().nullable().optional(),
  })
  .catchall(z.unknown());
export type Entity = z.infer<typeof entitySchema>;
export const changeSchema = z.object({
  kind: z.string(),
  entity: entitySchema,
});
export const snapshotSchema = z.object({
  api_version: z.literal(2),
  schema_version: z.literal(1),
  athlete_id: z.uuid(),
  cursor: z.number().int().nonnegative(),
  generation: z.uuid(),
  timezone: z.string(),
  week_start: z.number(),
  day_boundary_hour: z.number(),
  server_time: z.string(),
  shifts: z.array(entitySchema),
  optimizations: z.array(entitySchema),
  imports: z.array(entitySchema).default([]),
  medias: z.array(entitySchema).default([]),
  programs: z.array(entitySchema).default([]),
  program_days: z.array(entitySchema).default([]),
  program_exercises: z.array(entitySchema).default([]),
  prescriptions: z.array(entitySchema).default([]),
  slots: z.array(entitySchema).default([]),
  sessions: z.array(entitySchema).default([]),
  sets: z.array(entitySchema).default([]),
  foods: z.array(entitySchema).default([]),
  recipes: z.array(entitySchema).default([]),
  meals: z.array(entitySchema).default([]),
  hydrations: z.array(entitySchema).default([]),
  nutrition_days: z.array(entitySchema).default([]),
  checkins: z.array(entitySchema).default([]),
  sleeps: z.array(entitySchema).default([]),
  pains: z.array(entitySchema).default([]),
  measurements: z.array(entitySchema).default([]),
  capabilitys: z.array(entitySchema).default([]),
  goals: z.array(entitySchema).default([]),
  goal_measurements: z.array(entitySchema).default([]),
  events: z.array(entitySchema).default([]),
  profiles: z.array(entitySchema).default([]),
  episodes: z.array(entitySchema).default([]),
  cycles: z.array(entitySchema).default([]),
  labs: z.array(entitySchema).default([]),
  analysiss: z.array(entitySchema).default([]),
  archives: z.array(entitySchema).default([]),
});
export type EntityKey =
  | "shifts"
  | "optimizations"
  | "imports"
  | "medias"
  | "programs"
  | "program_days"
  | "program_exercises"
  | "prescriptions"
  | "slots"
  | "sessions"
  | "sets"
  | "foods"
  | "recipes"
  | "meals"
  | "hydrations"
  | "nutrition_days"
  | "checkins"
  | "sleeps"
  | "pains"
  | "measurements"
  | "capabilitys"
  | "goals"
  | "goal_measurements"
  | "events"
  | "profiles"
  | "episodes"
  | "cycles"
  | "labs"
  | "analysiss"
  | "archives";
export type Snapshot = z.infer<typeof snapshotSchema>;
export const ackSchema = z.object({
  operation_id: z.uuid(),
  cursor: z.number().int(),
  entity: entitySchema,
  changes: z.array(changeSchema),
  committed_at: z.string(),
});
export const pullSchema = z.object({
  cursor: z.number().int(),
  has_more: z.boolean(),
  generation: z.uuid(),
  changes: z.array(
    z.object({
      cursor: z.number(),
      operation_id: z.uuid(),
      changes: z.array(changeSchema),
    }),
  ),
});
export const meSchema = z.object({
  id: z.uuid(),
  athlete_id: z.uuid(),
  name: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  csrf: z.string(),
  version: z.number(),
});
export type Me = z.infer<typeof meSchema>;
export type Command = components["schemas"]["Command"];
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
export let serverClockOffset = 0;
export const serverNow = () => Date.now() + serverClockOffset;
export async function api(path: string, options: RequestInit = {}) {
  const response = await fetch("/api/v2/" + path, {
    ...options,
    credentials: "same-origin",
    signal: AbortSignal.timeout(12000),
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const date = response.headers.get("Date");
  if (date) {
    const ms = Date.parse(date);
    if (Number.isFinite(ms)) serverClockOffset = ms - Date.now();
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      "malformed",
      "Sunucunun yanıtı okunamadı. Yerel kayıtlar korundu.",
    );
  }
  if (!response.ok) {
    const result = z
      .object({
        error: z.object({
          code: z.string(),
          message: z.string(),
          details: z.record(z.string(), z.unknown()).optional(),
        }),
      })
      .safeParse(data);
    throw new ApiError(
      response.status,
      result.success ? result.data.error.code : "server_error",
      result.success ? result.data.error.message : "Sunucuya ulaşılamadı.",
      result.success ? result.data.error.details : {},
    );
  }
  return data;
}

/** Keep export bytes as text: parsing in JS would round unknown large legacy integers. */
export async function apiText(path: string) {
  const response = await fetch("/api/v2/" + path, {
    credentials: "same-origin",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new ApiError(
      response.status,
      "export_failed",
      "Sunucu yedeği alınamadı.",
    );
  return response.text();
}
