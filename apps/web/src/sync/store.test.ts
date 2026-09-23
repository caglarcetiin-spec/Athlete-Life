import "fake-indexeddb/auto";
import { IDBObjectStore } from "fake-indexeddb";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { openDB } from "idb";
import { mergeEntities, SyncStore } from "./store";
import { selectedAfterTick, today } from "../time";
const owner = "ab917ba1-34c8-4b1a-b187-7f0a38f03285";
const me = {
  id: owner,
  athlete_id: owner,
  username: "test",
  name: "Test",
  email: null,
  csrf: "synthetic-csrf",
  version: 1,
};
const snap = {
  api_version: 2,
  schema_version: 1,
  athlete_id: owner,
  cursor: 0,
  generation: "537282e1-c249-4e0d-bb16-49e2d520b503",
  timezone: "Europe/Istanbul",
  week_start: 0,
  day_boundary_hour: 0,
  server_time: "2026-09-15T00:00:00Z",
  shifts: [],
  optimizations: [],
};
let stores: SyncStore[] = [];
beforeEach(() => {
  vi.stubGlobal("location", { origin: "http://unit-" + crypto.randomUUID() });
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { visibilityState: "visible" }),
  );
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("BroadcastChannel", undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (input: string) =>
        new Response(
          JSON.stringify(
            input.includes("bootstrap")
              ? snap
              : {
                  cursor: 0,
                  generation: snap.generation,
                  has_more: false,
                  changes: [],
                },
          ),
        ),
    ),
  );
});
afterEach(() => {
  for (const s of stores) s.close();
  stores = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function setup() {
  const s = new SyncStore(me);
  stores.push(s);
  await s.init();
  return s;
}
describe("durable client protocol", () => {
  it("keeps the newest version when an old response arrives", () => {
    const id = crypto.randomUUID();
    expect(
      mergeEntities(
        [{ id, version: 3, social: "new" }],
        [{ id, version: 1, social: "old" }],
      )[0].social,
    ).toBe("new");
  });
  it("never shows success when IndexedDB rejects the journal write", async () => {
    const s = await setup();
    const original = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      if (this.name === "outbox")
        throw new DOMException("Quota", "QuotaExceededError");
      return original.apply(this, args);
    });
    await expect(
      s.enqueue("shift.save", null, { local_date: "2026-09-15" }),
    ).rejects.toThrow("Cihaza kaydedilemedi");
    expect(s.pending).toHaveLength(0);
    expect(s.view("shift")).toHaveLength(0);
  });
  it("retains cached data and queue when server returns 500 or malformed 200", async () => {
    const s = await setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    await s.enqueue("shift.save", null, {
      local_date: "2026-09-15",
      social: "Offline",
    });
    await vi.waitFor(() => expect(s.pending).toHaveLength(1));
    expect(s.view("shift")[0].social).toBe("Offline");
    await s.sync();
    expect(s.pending).toHaveLength(1);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}")),
    );
    await s.sync();
    expect(s.snapshot?.athlete_id).toBe(owner);
    expect(s.pending).toHaveLength(1);
  });
  it("keeps offline commands scoped to the original owner after 401", async () => {
    const s = await setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { code: "login_required", message: "Expired" },
            }),
            { status: 401 },
          ),
      ),
    );
    await s.enqueue("shift.save", null, { local_date: "2026-09-15" });
    await vi.waitFor(() => expect(s.error).toBe("Expired"));
    expect(s.pending).toHaveLength(1);
    const db = await openDB("alos-v2:" + location.origin + ":" + owner);
    expect(await db.count("outbox")).toBe(1);
    db.close();
    const other = new SyncStore({
      ...me,
      id: crypto.randomUUID(),
      athlete_id: crypto.randomUUID(),
    });
    stores.push(other);
    await other.init();
    expect(other.pending).toHaveLength(0);
    expect(other.snapshot).toBeNull();
  });
  it("advances today but preserves a deliberately selected past date", () => {
    const next = today("Europe/Istanbul", new Date("2026-09-16T21:01:00Z"));
    expect(next).toBe("2026-09-17");
    expect(selectedAfterTick("2026-09-16", true, next)).toBe(next);
    expect(selectedAfterTick("2026-09-10", false, next)).toBe("2026-09-10");
  });
});
