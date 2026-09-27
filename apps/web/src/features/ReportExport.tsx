import { useState } from "react";
import { api } from "../api/contracts";
type Preview = {
  as_of: string;
  input_digest: string;
  sections: {
    title: string;
    headers: string[];
    rows: unknown[][];
    notes: string[];
  }[];
};
export function ReportExport({ query }: { query: string }) {
  const [selection, setSelection] = useState(["training", "nutrition"]),
    [preview, setPreview] = useState<Preview | null>(null),
    [error, setError] = useState("");
  const params =
    query + "&selection=" + encodeURIComponent(selection.join(","));
  return (
    <section className="card">
      <h2>Rapor içeriğini seç</h2>
      <fieldset>
        <legend>Dosyaya dahil edilecek bilgiler</legend>
        {[
          ["training", "Antrenman ve hedefler"],
          ["nutrition", "Beslenme ve su"],
          ["health", "Hassas sağlık kayıtları"],
        ].map(([key, label]) => (
          <label className="check" key={key}>
            <input
              type="checkbox"
              checked={selection.includes(key)}
              onChange={(e) => {
                setSelection(
                  e.target.checked
                    ? [...selection, key]
                    : selection.filter((k) => k !== key),
                );
                setPreview(null);
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <button
        disabled={!selection.length}
        onClick={() =>
          void api("reports/preview?" + params)
            .then((r) => {
              setPreview(r as Preview);
              setError("");
            })
            .catch((e) => setError(e.message))
        }
      >
        Seçimimi önizle
      </button>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <>
          <p>Bu içerik PDF’ye yazılacak. Kendiliğinden kimseye gönderilmez.</p>
          {preview.sections.map((s) => (
            <section key={s.title}>
              <h3>{s.title}</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {s.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.rows.map((r, i) => (
                      <tr key={i}>
                        {r.map((v, j) => (
                          <td key={j}>{v == null ? "Bilgi yok" : String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {s.notes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </section>
          ))}
          <a
            className="link-button"
            href={
              "/api/v2/reports/pdf?" +
              params +
              "&expected_digest=" +
              encodeURIComponent(preview.input_digest)
            }
          >
            Önizlenen PDF’yi indir
          </a>
        </>
      )}
    </section>
  );
}
