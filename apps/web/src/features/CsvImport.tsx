import { useState } from "react";
import { api, type Entity } from "../api/contracts";
import type { SyncStore } from "../sync/store";
type Summary = {
  errors: { line: number; message: string }[];
  rows: {
    line: number;
    date: string;
    session: string;
    mapping: string;
    fields: { name: string; movement_id: string; external_kg?: number };
  }[];
  source_sha256: string;
  unknown_fields: string[];
};
export function CsvImport({ store }: { store: SyncStore }) {
  const [raw, setRaw] = useState(""),
    [delimiter, setDelimiter] = useState(","),
    [columns, setColumns] = useState<Record<string, string>>({}),
    [stage, setStage] = useState<Entity | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const summary = stage?.summary as Summary | undefined;
  async function preview() {
    setBusy(true);
    try {
      setStage(
        (await api("imports/stage", {
          method: "POST",
          headers: { "X-CSRF-Token": store.me.csrf },
          body: JSON.stringify({
            format: "alos-csv-1",
            csv: raw,
            delimiter,
            columns,
          }),
        })) as Entity,
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <h2>Gerçek set geçmişini CSV ile taşı</h2>
      <p>
        Genel Athlete Life formatı; Strong/Hevy bağlayıcısı değildir. En fazla 2
        MB / 1000 satır. Tarih YYYY-MM-DD; yük birimi kg veya lb. Plan şablonu
        bu alandan aktarılmaz.
      </p>
      <a className="link-button secondary" href="/api/v2/sets/export.csv">
        Gerçek setlerimi CSV indir
      </a>
      <label>
        UTF-8 CSV dosyası
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setStage(null);
            if (!f) return;
            if (f.size > 2 * 1024 * 1024) {
              setError("Dosya 2 MB sınırını aşıyor.");
              return;
            }
            void f
              .text()
              .then(setRaw)
              .catch(() => setError("Dosya okunamadı."));
          }}
        />
      </label>
      <label>
        Ayraç
        <select
          value={delimiter}
          onChange={(e) => {
            setDelimiter(e.target.value);
            setStage(null);
          }}
        >
          <option value=",">Virgül</option>
          <option value=";">Noktalı virgül</option>
          <option value={"\t"}>Sekme</option>
        </select>
      </label>
      <details>
        <summary>Sütunları eşle (başlıklar farklıysa)</summary>
        <div className="form-grid">
          {[
            "date",
            "session",
            "movement_id",
            "name",
            "modality",
            "reps",
            "external_kg",
            "load_unit",
            "seconds",
            "distance_m",
            "rir",
            "rpe",
            "variant",
            "equipment",
            "side",
            "load_kind",
            "set_kind",
            "superset_group",
            "sequence",
          ].map((key) => (
            <label key={key}>
              {key}
              <input
                value={columns[key] ?? key}
                onChange={(e) => {
                  setColumns({ ...columns, [key]: e.target.value });
                  setStage(null);
                }}
              />
            </label>
          ))}
        </div>
      </details>
      <button disabled={!raw || busy} onClick={() => void preview()}>
        Satırları doğrula ve önizle
      </button>
      {error && <p role="alert">{error}</p>}
      {summary && (
        <>
          <p>
            {summary.rows.length} geçerli satır · {summary.errors.length} hata.
            Bilinmeyen sütunlar: {summary.unknown_fields.join(", ") || "Yok"};
            özgün dosyada korunur.
          </p>
          {summary.errors.map((e) => (
            <p role="alert" key={e.line}>
              Satır {e.line}: {e.message}
            </p>
          ))}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Satır</th>
                  <th>Tarih / seans</th>
                  <th>Hareket</th>
                  <th>Yük (kg)</th>
                  <th>Eşleme</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((r) => (
                  <tr key={r.line}>
                    <td>{r.line}</td>
                    <td>
                      {r.date} · {r.session}
                    </td>
                    <td>{r.fields.name}</td>
                    <td>{r.fields.external_kg ?? "Bilinmiyor"}</td>
                    <td>
                      {r.mapping === "matched"
                        ? "Katalog"
                        : "Özel hareket; kas eşlemesi yok"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            disabled={
              busy ||
              !!summary.errors.length ||
              !summary.rows.length ||
              stage?.status !== "staged"
            }
            onClick={() => {
              setBusy(true);
              void store
                .enqueue("import.apply", stage, {})
                .then(() => {
                  setStage(null);
                  setRaw("");
                })
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          >
            Önizlemeyi onayla, tamamını aktar
          </button>
          {stage?.status === "applied" && (
            <p>Bu dosya daha önce aktarıldı; kopya oluşturulmadı.</p>
          )}
        </>
      )}
    </section>
  );
}
