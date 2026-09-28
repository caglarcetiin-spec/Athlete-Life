import { useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "../api/contracts";
import type { SyncStore } from "../sync/store";

type Context = {
  window: { from: string; to: string; days: number; comparison_from: string };
  coverage: {
    selected_signal_count: number;
    unmapped_sets: number;
    date_only_sets: number;
  };
  facts: { id: string; kind: string; period: string; [key: string]: unknown }[];
  limitations: string[];
};
type Preview = {
  digest: string;
  context: Context;
  configuration: {
    available: boolean;
    provider: string;
    model: string;
    consent_version: string;
    message: string;
  };
};
type Review = {
  overview: string;
  findings: { title: string; text: string; evidence_ids: string[] }[];
  next_steps: string[];
  limitations: string[];
};
type Result = {
  review: Review;
  context: Context;
  digest: string;
  provider: string;
  model: string;
  version: string;
};
const scopes = [
  ["include_measurements", "Kilo, bel çevresi ve vücut ölçülerim"],
  ["include_capabilities", "Performans testlerim"],
  ["include_goals", "Hedef ilerleme kayıtlarım"],
  ["include_nutrition", "Beslenme ve su toplamlarım"],
  ["include_sleep", "Uyku sürelerim"],
] as const;
export function AIProgress({
  store,
  selected,
}: {
  store: SyncStore;
  selected: string;
}) {
  const [days, setDays] = useState(28),
    [end, setEnd] = useState(selected);
  const [include, setInclude] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<Preview | null>(null),
    [consent, setConsent] = useState(false),
    [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const params = { end_date: end, days, ...include };
  function invalidate() {
    setPreview(null);
    setConsent(false);
    setError("");
  }
  async function post(path: string, body: unknown) {
    return api(path, {
      method: "POST",
      headers: { "X-CSRF-Token": store.me.csrf },
      body: JSON.stringify(body),
    });
  }
  async function previewData() {
    setBusy(true);
    setError("");
    setConsent(false);
    try {
      setPreview((await post("ai-progress-preview", params)) as Preview);
    } catch (e) {
      setError((e as Error).message);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }
  async function review() {
    if (!preview || !consent || busy) return;
    setBusy(true);
    setError("");
    try {
      const next = (await post("ai-progress-review", {
        ...params,
        consent: preview.configuration.consent_version,
        preview_digest: preview.digest,
      })) as Result;
      setResult(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function download() {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `Athlete-Life-AI-${result.context.window.from}-${result.context.window.to}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="card ai-progress">
      <details>
        <summary>
          <Sparkles size={20} /> AI ile dönem değerlendirmesi
        </summary>
        <p>
          Kaydettiğin antrenmanları aynı uzunluktaki önceki dönemle karşılaştır.
          Eklemek istediğin ölçüleri seç; göndermeden önce özeti incele. AI
          mevcut programını değiştirmez.
        </p>
        <fieldset disabled={busy}>
          <div className="form-grid">
            <label>
              Analiz bitiş tarihi
              <input
                type="date"
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  invalidate();
                }}
              />
            </label>
            <label>
              İncelenecek dönem
              <select
                aria-label="İncelenecek dönem"
                value={days}
                onChange={(e) => {
                  setDays(Number(e.target.value));
                  invalidate();
                }}
              >
                {[7, 14, 28, 56, 84].map((d) => (
                  <option key={d} value={d}>
                    {d / 7} hafta
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p>
            Antrenman kayıtları ve katalogdan hesaplanan kas yükü özeti dahil
            edilir.
          </p>
          {scopes.map(([key, label]) => (
            <label key={key} className="checkbox">
              <input
                type="checkbox"
                checked={!!include[key]}
                onChange={(e) => {
                  setInclude({ ...include, [key]: e.target.checked });
                  invalidate();
                }}
              />
              {label}
            </label>
          ))}
          <button
            className="secondary"
            disabled={!end || store.pending.length > 0}
            onClick={() => void previewData()}
          >
            Gönderilecek verileri incele
          </button>
          {store.pending.length > 0 && (
            <p>
              Son kayıtların eşitlenmesini bekle; analiz sunucudaki kayıtlardan
              hazırlanır.
            </p>
          )}
          {preview && (
            <section className="notice" aria-label="AI gönderim özeti">
              <h3>{preview.configuration.provider} ile değerlendir</h3>
              <p>
                {preview.context.window.from} – {preview.context.window.to} ·
                Önceki dönem {preview.context.window.comparison_from} tarihinden
                başlar.
              </p>
              <p>
                {preview.context.coverage.selected_signal_count} kayıt / günlük
                özet · {preview.context.coverage.unmapped_sets} kas eşlemesi
                eksik kayıt
              </p>
              <p>
                Kimlik, serbest notlar, fotoğraf, kan tahlili, ağrı ve regl
                verileri gönderilmez. Seçtiğin sayısal kayıtlar yukarıdaki AI
                sağlayıcısına gider.
              </p>
              <details>
                <summary>
                  Gönderilecek tam veri özeti ({preview.context.facts.length}{" "}
                  dayanak)
                </summary>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    maxHeight: 320,
                    overflow: "auto",
                  }}
                >
                  {JSON.stringify(preview.context, null, 2)}
                </pre>
              </details>
              {!preview.configuration.available && (
                <p role="status">{preview.configuration.message}</p>
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                Bu özetteki seçili kayıtlarımın {preview.configuration.provider}{" "}
                sağlayıcısına gelişim yorumu için gönderilmesini kabul ediyorum.
              </label>
              <button
                disabled={
                  !consent ||
                  !preview.configuration.available ||
                  !preview.context.coverage.selected_signal_count ||
                  store.pending.length > 0
                }
                onClick={() => void review()}
              >
                <Sparkles size={17} /> Gelişimimi AI ile analiz et
              </button>
              {!preview.context.coverage.selected_signal_count && (
                <p>Bu dönemde seçili kapsamlarda kayıt yok.</p>
              )}
            </section>
          )}
        </fieldset>
        {busy && (
          <p role="status">İşlem sürüyor… Sonuç birkaç dakika sürebilir.</p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {result && (
          <article aria-label="AI gelişim yorumu">
            <h3>
              {result.context.window.from} – {result.context.window.to}{" "}
              değerlendirmesi
            </h3>
            <p className="caption">
              {result.provider} · {result.model} · AI yorumu; klinik
              değerlendirme veya kas büyümesi ölçümü değildir.
            </p>
            <p>{result.review.overview}</p>
            {result.review.findings.map((finding, i) => (
              <section key={i}>
                <h4>{finding.title}</h4>
                <p>{finding.text}</p>
                <details>
                  <summary>Dayandığı kayıt özeti</summary>
                  <pre
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                  >
                    {JSON.stringify(
                      result.context.facts.filter((f) =>
                        finding.evidence_ids.includes(f.id),
                      ),
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </section>
            ))}
            <h4>Sonraki adımlar</h4>
            <ul>
              {result.review.next_steps.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <h4>Verinin sınırları</h4>
            <ul>
              {[
                ...result.context.limitations,
                ...result.review.limitations,
              ].map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <button className="secondary" onClick={download}>
              Değerlendirmeyi indir
            </button>
            <p className="caption">
              Yorum bu ekranda tutulur. Saklamak için indir; kayıtların ve
              programın otomatik değiştirilmez.
            </p>
          </article>
        )}
      </details>
    </section>
  );
}
