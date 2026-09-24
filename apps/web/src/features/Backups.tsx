import { useEffect, useState } from "react";
import { Archive, Download, Upload, CheckCircle2 } from "lucide-react";
import { Lifecycle } from "./Lifecycle";
import { RecordForm, decimalField, note, choice } from "./Records";
import { api, apiText, type Entity } from "../api/contracts";
import type { SyncStore } from "../sync/store";
export function saveFile(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function backupAll(store: SyncStore): Promise<string> {
  try {
    const canonical_text = await apiText("backups/export");
    saveFile(
      {
        format: "alos-v2-transfer-text",
        canonical_text,
        pending_journal: store.pending,
        local_drafts: (await store.exportLocal()).drafts,
        exported_at: new Date().toISOString(),
      },
      "Athlete-Life-tam-yedek.json",
    );
    return "Tam veri yedeği indirildi. Bekleyen işlemler ve taslaklar ayrı bölümlerde korundu.";
  } catch {
    saveFile(
      await store.exportLocal(),
      "Athlete-Life-cihaz-bekleyen-kayitlar.json",
    );
    return "Sunucuya ulaşılamadı. Yalnız bu cihazdaki kayıtlar, bekleyen işlemler ve taslaklar indirildi; bu dosya tam sunucu yedeği değildir. Bağlantı geldiğinde tam yedeği yeniden indir.";
  }
}
export function Backups({ store }: { store: SyncStore }) {
  const [stage, setStage] = useState<Entity | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState("");
  const [domain, setDomain] = useState("");
  const [rows, setRows] = useState<Entity[]>([]);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const runs = store.view("import");
  useEffect(() => {
    void api(
      "legacy?offset=" +
        offset +
        (domain ? "&domain=" + encodeURIComponent(domain) : ""),
    )
      .then((data) => {
        const result = data as { records: Entity[]; has_more: boolean };
        setRows(result.records);
        setMore(result.has_more);
      })
      .catch((e) => setError(e.message));
  }, [domain, offset, store.snapshot?.cursor]);
  async function preview(file: File) {
    setBusy(true);
    setError("");
    try {
      if (file.size > 192 * 1024 * 1024)
        throw new Error(
          "Dosya 192 MB sınırını aşıyor. Büyük arşiv için yönetici geri yükleme aracı gerekli; mevcut kayıtların değişmedi.",
        );
      const result = await api("imports/stage", {
        method: "POST",
        headers: { "X-CSRF-Token": store.me.csrf },
        body: await file.text(),
      });
      setStage(result as Entity);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const summary = stage?.summary as
    | {
        counts: Record<string, number>;
        warnings: string[];
        unknown_fields: string[];
        pending_count?: number;
      }
    | undefined;
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Geçmişin seninle</span>
          <h1>Yedekler ve arşiv</h1>
          <p>
            Kayıtlarını indir, eski sürümden taşı veya korunmuş geçmişini
            incele.
          </p>
        </div>
        <Archive className="heading-icon" />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="today-grid">
        <section className="card">
          <Download />
          <h2>Tüm verileri yedekle</h2>
          <p>
            Sunucudaki kayıtların ve bu cihazın bekleyen işlemleri ayrı
            bölümlerde yer alır. {store.pending.length} işlem eşitleme bekliyor.
          </p>
          <button
            onClick={() =>
              void backupAll(store)
                .then(setDownloadNotice)
                .catch((e) => setError(e.message))
            }
          >
            Tam yedeği indir
          </button>
          {downloadNotice && <p role="status">{downloadNotice}</p>}
          <p className="caption">
            Bu dosya kişisel sağlık verilerini içerebilir. Güvenli bir yerde
            sakla.
          </p>
        </section>
        <section className="card">
          <Upload />
          <h2>Yedeğini incele</h2>
          <p>
            Önce kapsamı gösteririz. “Aktarımı onayla” seçeneğine basmadan
            geçmişin değiştirilmez.
          </p>
          <label>
            JSON veya .alosbackup veri yedeği
            <input
              type="file"
              accept=".json,.alosbackup,application/json"
              disabled={busy}
              onChange={(e) =>
                e.target.files?.[0] && void preview(e.target.files[0])
              }
            />
          </label>
          <p className="caption">
            Kod ZIP dosyası veri yedeği değildir. Farklı bir sitenin tarayıcı
            kayıtlarına buradan erişilemez.
          </p>
        </section>
      </div>
      {stage && summary && (
        <section className="card">
          <h2>
            {stage.status === "applied"
              ? "Bu kaynak zaten aktarılmış"
              : "Aktarım önizlemesi"}
          </h2>
          <dl className="metrics-grid">
            {Object.entries(summary.counts).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {summary.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
          {summary.pending_count ? (
            <p>
              Yedekte {summary.pending_count} bekleyen işlem var. Korunur;
              otomatik olarak yapılmış kayda çevrilmez.
            </p>
          ) : null}
          <p>
            {summary.unknown_fields.length} bilinmeyen alan kayıpsız arşivde
            korunacak.
          </p>
          <button
            disabled={
              !store.snapshot ||
              stage.status === "applied" ||
              store.pending.some((p) => p.command.entity_id === stage.id)
            }
            onClick={() =>
              void store
                .enqueue("import.apply", stage, {})
                .then(() => setStage(null))
                .catch((e) => setError(e.message))
            }
          >
            <CheckCircle2 size={18} />
            Aktarımı onayla
          </button>
        </section>
      )}
      <Lifecycle store={store} />
      <section className="card">
        <h2>Fotoğraf arşivi</h2>
        <div className="media-grid">
          {store
            .view("media")
            .filter((photo) => String(photo.mime).startsWith("image/"))
            .map((photo) => (
              <figure key={photo.id}>
                <img
                  loading="lazy"
                  src={"/api/v2/media/" + photo.id}
                  alt={String(photo.name)}
                />
                <figcaption>{String(photo.name)}</figcaption>
                <details>
                  <summary>Tarih ve ölçümler</summary>
                  <RecordForm
                    key={photo.id + ":" + photo.version}
                    initial={{
                      ...((photo.details as Record<string, unknown>) || {}),
                      captured_date: photo.captured_date,
                    }}
                    fields={[
                      {
                        key: "captured_date",
                        label: "Fotoğrafın çekildiği tarih",
                        type: "date",
                      },
                      choice(
                        "view",
                        "Görünüş",
                        [
                          ["unknown", "Belirtilmedi"],
                          ["front", "Ön"],
                          ["back", "Arka"],
                          ["side", "Yan"],
                          ["other", "Diğer"],
                        ],
                        "unknown",
                      ),
                      decimalField(
                        "weight_kg",
                        "Bu tarihte ölçtüğüm ağırlık (kg)",
                      ),
                      decimalField(
                        "waist_cm",
                        "Bu tarihte ölçtüğüm bel çevresi (cm)",
                      ),
                      note,
                    ]}
                    onSave={(values) =>
                      store.enqueue("media.annotate", photo, values)
                    }
                  />
                  <p className="caption">
                    Bu ölçümleri sen girersin; fotoğraftan vücut ölçümü
                    çıkarılmaz. Boş tarih geçmişe yönelik tahminle doldurulmaz.
                  </p>
                </details>
              </figure>
            ))}
        </div>
      </section>
      <section className="card">
        <h2>3B model dosyalarım</h2>
        {store
          .view("media")
          .filter((media) => media.mime === "model/gltf-binary")
          .map((media) => (
            <p key={media.id}>
              <a href={"/api/v2/media/" + media.id}>
                {String(media.name)} — indir
              </a>
            </p>
          ))}
      </section>
      <section className="card">
        <h2>Korunmuş eski kayıtlar</h2>
        <p>
          Eski alanlar kaynak adıyla görüntülenir. Belirsiz zamanlar gerçek
          ölçüm gibi yorumlanmaz.
        </p>
        <label htmlFor="archive-domain">Kayıt grubu</label>
        <select
          id="archive-domain"
          value={domain}
          onChange={(e) => {
            setDomain(e.target.value);
            setOffset(0);
          }}
        >
          <option value="">Tümü</option>
          {[
            ...new Set(
              runs.flatMap((r) =>
                Object.keys(
                  (r.summary as { counts?: Record<string, number> })?.counts ||
                    {},
                ),
              ),
            ),
          ].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        {rows.map((row) => (
          <details key={row.id}>
            <summary>
              {String(row.domain)} · {String(row.pointer)}
            </summary>
            <pre>{JSON.stringify(row.value, null, 2)}</pre>
          </details>
        ))}
        {!rows.length && <p>Bu grupta aktarılmış kayıt yok.</p>}
        <div className="actions">
          <button
            className="secondary"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - 100))}
          >
            Önceki kayıtlar
          </button>
          <button
            className="secondary"
            disabled={!more}
            onClick={() => setOffset(offset + 100)}
          >
            Sonraki kayıtlar
          </button>
        </div>
      </section>
    </>
  );
}
