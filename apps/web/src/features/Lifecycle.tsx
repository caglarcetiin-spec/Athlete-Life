import { useState } from "react";
import type { SyncStore } from "../sync/store";
import type { Entity, EntityKey } from "../api/contracts";
import { api } from "../api/contracts";
import { saveFile } from "./Backups";
export function Lifecycle({ store }: { store: SyncStore }) {
  const [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [archive, setArchive] = useState<Record<string, unknown>>();
  const kinds = [
    "session",
    "set",
    "meal",
    "hydration",
    "checkin",
    "sleep",
    "pain",
    "measurement",
    "capability",
    "goal",
    "goal_measurement",
    "event",
    "episode",
    "cycle",
    "lab",
    "food",
    "recipe",
  ];
  const removed = kinds
    .flatMap((kind) =>
      ((store.snapshot?.[(kind + "s") as EntityKey] || []) as Entity[])
        .filter((r) => r.deleted_at)
        .map((r) => ({ kind, row: r })),
    )
    .sort((a, b) =>
      String(b.row.deleted_at).localeCompare(String(a.row.deleted_at)),
    )
    .slice(0, 100);
  return (
    <>
      <section className="card">
        <h2>Dönem arşivim</h2>
        <p>
          Yeni başlangıçta mevcut plan, antrenman ve günlük verilerinin bir
          kopyası arşivlenir. Yeni hesaplamalar boş bir dönemden başlar.
          Profilin ve fotoğrafların korunur.
        </p>
        <button className="secondary" onClick={() => setOpen(!open)}>
          Arşivleyerek yeni başlangıç
        </button>
        {open && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                if (store.pending.length)
                  throw Error("Önce bekleyen değişiklikleri eşitle.");
                await store.enqueue("archive.reset", null, {
                  label: f.get("label"),
                  confirmation: f.get("confirmation"),
                  expected_cursor: store.snapshot?.cursor,
                });
                setOpen(false);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label>
              Arşiv adı
              <input
                name="label"
                required
                maxLength={150}
                placeholder="Örn. İlk 12 haftam"
              />
            </label>
            <p>
              Mevcut güncel kayıtlar arşive kaldırılacak. Devam etmek için YENİ
              BAŞLANGIÇ yaz.
            </p>
            <label>
              Onay metni
              <input
                name="confirmation"
                required
                pattern="YENİ BAŞLANGIÇ"
                autoComplete="off"
              />
            </label>
            <button disabled={store.pending.length > 0}>
              Arşivle ve yeni döneme başla
            </button>
          </form>
        )}
        {store.view("archive").map((r) => (
          <article className="record-row" key={r.id}>
            <div>
              <strong>{String(r.label)}</strong>
              <p>{new Date(String(r.created_at)).toLocaleString("tr-TR")}</p>
            </div>
            <button
              className="secondary small"
              onClick={() =>
                void api("archives/" + r.id)
                  .then((v) => setArchive(v as Record<string, unknown>))
                  .catch((e) => setError(e.message))
              }
            >
              İncele
            </button>
            <a
              className="link-button secondary"
              href={"/api/v2/archives/" + r.id + "/pdf"}
            >
              PDF indir
            </a>
            <button
              className="text-button"
              onClick={() =>
                void api("archives/" + r.id)
                  .then((v) => saveFile(v, "Athlete-Life-donem-arsivi.json"))
                  .catch((e) => setError(e.message))
              }
            >
              Veriyi indir
            </button>
          </article>
        ))}
        {archive && (
          <details open>
            <summary>{String(archive.label)} · Kayıt özeti</summary>
            <dl className="metrics-grid">
              {Object.entries(archive.counts as Record<string, number>).map(
                ([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ),
              )}
            </dl>
            <details>
              <summary>Arşivlenmiş kayıtların tamamı</summary>
              <pre>{JSON.stringify(archive.records, null, 2)}</pre>
            </details>
          </details>
        )}
      </section>
      <section className="card">
        <h2>Son silinen kayıtlar</h2>
        <p>
          Doğrudan sildiğin bir kaydı sürüm kontrolüyle geri alabilirsin. Yeni
          başlangıçla arşive kaldırılmış kayıtlar eski dönemden incelenir.
        </p>
        {removed.map(({ kind, row }) => (
          <article className="record-row" key={row.id}>
            <div>
              <strong>
                {String(
                  row.title || row.name || row.area || row.analyte || kind,
                )}
              </strong>
              <p>
                {String(row.local_date || "")} · {kind}
              </p>
            </div>
            <button
              className="secondary small"
              disabled={store.pending.some(
                (p) => p.command.entity_id === row.id,
              )}
              onClick={() =>
                void store
                  .enqueue("record.restore", row, { kind })
                  .catch((e) => setError(e.message))
              }
            >
              Geri al
            </button>
          </article>
        ))}
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
