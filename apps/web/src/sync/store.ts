import { openDB, deleteDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  ackSchema,
  api,
  ApiError,
  pullSchema,
  snapshotSchema,
  type Command,
  type Entity,
  type EntityKey,
  type Me,
  type Snapshot,
} from "../api/contracts";
export type Pending = {
  id: string;
  command: Command;
  base: Entity | null;
  created: number;
  state: "queued" | "in_flight" | "conflict" | "failed";
  attempts: number;
  leaseUntil: number;
  leaseOwner?: string;
  nextTry: number;
  error?: string;
  current?: Entity;
};
interface LocalDB extends DBSchema {
  meta: { key: string; value: Snapshot | string };
  outbox: { key: string; value: Pending; indexes: { created: number } };
}
const plural = (kind: string) => kind + "s";
export function mergeEntities(base: Entity[], incoming: Entity[]) {
  const map = new Map(base.map((e) => [e.id, e]));
  for (const row of incoming) {
    const old = map.get(row.id);
    if (!old || row.version >= old.version) map.set(row.id, row);
  }
  return [...map.values()];
}
function applyChanges(
  snapshot: Snapshot,
  changes: { kind: string; entity: Entity }[],
) {
  const result = { ...snapshot };
  for (const c of changes) {
    const key = plural(c.kind) as EntityKey;
    result[key] = mergeEntities(result[key] || [], [c.entity]);
  }
  return result;
}
export class SyncStore {
  private db!: IDBPDatabase<LocalDB>;
  private stopped = false;
  private syncing = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private owner = crypto.randomUUID();
  private channel: BroadcastChannel | undefined;
  writing = 0;
  snapshot: Snapshot | null = null;
  pending: Pending[] = [];
  error = "";
  lastSync = "";
  listeners = new Set<() => void>();
  constructor(readonly me: Me) {}
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  notify() {
    for (const fn of this.listeners) fn();
  }
  async init() {
    this.db = await openDB<LocalDB>(
      "alos-v2:" + location.origin + ":" + this.me.athlete_id,
      1,
      {
        upgrade(db) {
          db.createObjectStore("meta");
          db.createObjectStore("outbox", { keyPath: "id" }).createIndex(
            "created",
            "created",
          );
        },
      },
    );
    this.channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("alos-v2:" + this.me.athlete_id)
        : undefined;
    if (this.channel)
      this.channel.onmessage = () => {
        void this.refresh();
      };
    await this.refresh();
    await this.sync();
    this.timer = setInterval(() => {
      void this.sync();
    }, 3000);
    window.addEventListener("online", this.wake);
    document.addEventListener("visibilitychange", this.wake);
    navigator.storage?.persist?.().catch(() => false);
  }
  wake = () => {
    if (document.visibilityState !== "hidden") void this.sync();
  };
  async refresh() {
    const tx = this.db.transaction(["meta", "outbox"], "readonly");
    this.snapshot =
      ((await tx.objectStore("meta").get("snapshot")) as
        Snapshot | undefined) || null;
    this.lastSync =
      ((await tx.objectStore("meta").get("lastSync")) as string) || "";
    this.pending = await tx.objectStore("outbox").index("created").getAll();
    await tx.done;
    this.notify();
  }
  async enqueue(
    type: string,
    entity: Entity | null,
    payload: Record<string, unknown>,
    entityId?: string,
  ) {
    this.writing++;
    this.notify();
    try {
      return await this.commitLocal(type, entity, payload, entityId);
    } finally {
      this.writing--;
      this.notify();
    }
  }
  private async commitLocal(
    type: string,
    entity: Entity | null,
    payload: Record<string, unknown>,
    entityId?: string,
  ) {
    if (!this.snapshot) throw new Error("İlk sunucu eşitlemesi tamamlanmalı.");
    const id = entity?.id || entityId || crypto.randomUUID();
    const command: Command = {
      operation_id: crypto.randomUUID(),
      entity_id: id,
      expected_version: entity?.version || 0,
      schema_version: 1,
      command_type: type,
      payload,
    };
    const tx = this.db.transaction(["outbox", "meta"], "readwrite");
    const pending = await tx.objectStore("outbox").getAll();
    if (pending.some((p) => p.command.entity_id === id)) {
      tx.abort();
      await tx.done.catch(() => {});
      throw new Error(
        "Bu kaydın önceki değişikliği eşitlenmeli veya çatışması çözülmeli.",
      );
    }
    try {
      await tx
        .objectStore("outbox")
        .put({
          id: command.operation_id,
          command,
          base: entity,
          created: Date.now(),
          state: "queued",
          attempts: 0,
          leaseUntil: 0,
          nextTry: 0,
        });
      // Both the canonical cache reference and its overlay journal are transactionally durable.
      const base = await tx.objectStore("meta").get("snapshot");
      if (base) await tx.objectStore("meta").put(base, "snapshot");
      await tx.done;
    } catch {
      this.error =
        "Cihaza kaydedilemedi. Tarayıcı depolamasını kontrol et; formun açık kaldı.";
      this.notify();
      throw new Error(this.error);
    }
    await this.refresh();
    this.channel?.postMessage("change");
    void this.sync();
    return id;
  }
  view(kind: string): Entity[] {
    if (!this.snapshot) return [];
    let rows = [...(this.snapshot[plural(kind) as EntityKey] || [])];
    for (const p of this.pending) {
      if (p.command.command_type.split(".")[0] !== kind) continue;
      const old = rows.find((r) => r.id === p.command.entity_id);
      const entity = {
        ...old,
        ...p.command.payload,
        id: p.command.entity_id,
        version: p.command.expected_version,
        local_pending: true,
        ...(p.command.command_type.endsWith(".delete")
          ? { deleted_at: new Date(p.created).toISOString() }
          : {}),
      };
      rows = rows.filter((r) => r.id !== entity.id);
      rows.push(entity);
    }
    return rows.filter((r) => !r.deleted_at);
  }
  async claim() {
    const tx = this.db.transaction("outbox", "readwrite");
    const all = await tx.store.index("created").getAll();
    const now = Date.now();
    const row = all.find(
      (p) =>
        (p.state === "queued" || p.state === "in_flight") &&
        p.leaseUntil <= now &&
        p.nextTry <= now,
    );
    if (row) {
      row.state = "in_flight";
      row.leaseUntil = now + 15000;
      row.leaseOwner = this.owner;
      row.attempts++;
      await tx.store.put(row);
    }
    await tx.done;
    return row;
  }
  async sync() {
    if (this.syncing || this.stopped) return;
    this.syncing = true;
    try {
      if (!this.snapshot) {
        const snap = snapshotSchema.parse(await api("bootstrap"));
        if (snap.athlete_id !== this.me.athlete_id)
          throw new Error("Hesap eşleşmiyor.");
        await this.db.put("meta", snap, "snapshot");
        await this.refresh();
      }
      let job: Pending | undefined;
      while (!this.stopped && (job = await this.claim())) {
        try {
          const ack = ackSchema.parse(
            await api("commands", {
              method: "POST",
              headers: { "X-CSRF-Token": this.me.csrf },
              body: JSON.stringify(job.command),
            }),
          );
          if (ack.operation_id !== job.id)
            throw new Error("İşlem onayı eşleşmiyor.");
          const tx = this.db.transaction(["meta", "outbox"], "readwrite");
          const current = (await tx
            .objectStore("meta")
            .get("snapshot")) as Snapshot;
          await tx
            .objectStore("meta")
            .put(applyChanges(current, ack.changes), "snapshot"); // ACK never skips the pull cursor.
          await tx.objectStore("outbox").delete(job.id);
          await tx.objectStore("meta").put(ack.committed_at, "lastSync");
          await tx.done;
        } catch (e) {
          const tx = this.db.transaction("outbox", "readwrite");
          const stored = await tx.store.get(job.id);
          if (stored && stored.leaseOwner === this.owner) {
            const conflict = e instanceof ApiError && e.status === 409;
            const fail =
              e instanceof ApiError && [400, 403, 404, 422].includes(e.status);
            stored.state = conflict ? "conflict" : fail ? "failed" : "queued";
            stored.leaseUntil = 0;
            stored.error =
              e instanceof Error ? e.message : "İşlem gönderilemedi.";
            stored.current =
              e instanceof ApiError
                ? (e.details.current as Entity | undefined)
                : undefined;
            stored.nextTry =
              Date.now() +
              Math.min(60000, 1000 * 2 ** Math.min(stored.attempts, 5));
            await tx.store.put(stored);
          }
          await tx.done;
          throw e;
        }
      }
      let more = true;
      while (more && !this.stopped) {
        const current = (await this.db.get("meta", "snapshot")) as Snapshot;
        const result = pullSchema.parse(
          await api("changes?after=" + current.cursor),
        );
        if (result.generation !== current.generation)
          throw new Error(
            "Sunucu geri yüklenmiş. Yerel kuyruk korundu; destek üzerinden uzlaştırma gerekli.",
          );
        const tx = this.db.transaction("meta", "readwrite");
        const latest = (await tx.store.get("snapshot")) as Snapshot;
        if (result.cursor >= latest.cursor) {
          const merged = applyChanges(
            latest,
            result.changes.flatMap((c) => c.changes),
          );
          merged.cursor = result.cursor;
          await tx.store.put(merged, "snapshot");
        }
        await tx.done;
        more = result.has_more;
      }
      this.error = "";
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Eşitleme bekliyor.";
      if (e instanceof ApiError && e.status === 401) {
        this.stopped = true;
        window.dispatchEvent(new CustomEvent("alos-session-expired"));
      }
    } finally {
      this.syncing = false;
      await this.refresh();
      this.channel?.postMessage("change");
    }
  }
  async discard(id: string) {
    const tx = this.db.transaction("outbox", "readwrite");
    const row = await tx.store.get(id);
    if (row?.state === "in_flight") {
      tx.abort();
      await tx.done.catch(() => {});
      throw new Error("Gönderilmekte olan kayıt tamamlanmalı.");
    }
    await tx.store.delete(id);
    await tx.done;
    await this.refresh();
  }
  async retry() {
    const tx = this.db.transaction("outbox", "readwrite");
    for (const row of await tx.store.getAll()) {
      if (row.state === "queued") {
        row.nextTry = 0;
        await tx.store.put(row);
      }
    }
    await tx.done;
    await this.sync();
  }
  async saveDraft(key: string, value: unknown) {
    await this.db.put("meta", JSON.stringify(value), "draft:" + key);
  }
  async loadDraft(key: string) {
    const value = await this.db.get("meta", "draft:" + key);
    return typeof value === "string" ? JSON.parse(value) : null;
  }
  async exportLocal() {
    const tx = this.db.transaction("meta", "readonly");
    const drafts: Record<string, unknown> = {};
    let cursor = await tx.store.openCursor();
    while (cursor) {
      if (
        String(cursor.key).startsWith("draft:") &&
        typeof cursor.value === "string"
      ) {
        const value = JSON.parse(cursor.value);
        if (value !== null) drafts[String(cursor.key).slice(6)] = value;
      }
      cursor = await cursor.continue();
    }
    await tx.done;
    return {
      format: "alos-local-journal",
      athlete_id: this.me.athlete_id,
      canonical: this.snapshot,
      pending: this.pending,
      drafts,
      exported_at: new Date().toISOString(),
    };
  }
  async eraseLocal() {
    if (this.pending.length) throw new Error("Bekleyen kayıtlar korunmalı.");
    this.close();
    this.db.close();
    await deleteDB("alos-v2:" + location.origin + ":" + this.me.athlete_id);
  }
  close() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    window.removeEventListener("online", this.wake);
    document.removeEventListener("visibilitychange", this.wake);
    this.channel?.close();
    this.channel =
      undefined; /* keep DB open until any in-flight ACK transaction finishes */
  }
}
