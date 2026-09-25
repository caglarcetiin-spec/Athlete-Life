import { useEffect, useState, lazy, Suspense } from "react";
import { recoverySchema } from "./muscleRecovery";
const BodyModel = lazy(() => import("./BodyModel"));
import { z } from "zod";
import {
  ChartNoAxesCombined,
  Target,
  RefreshCw,
  Download,
  BookOpen,
} from "lucide-react";
import { api } from "../api/contracts";
import type { SyncStore } from "../sync/store";
import { DayToolbar, shown } from "./Records";
const point = z
  .object({ id: z.string(), local_date: z.string(), value: z.number() })
  .catchall(z.unknown());
const schema = z.object({
  muscle_recovery: recoverySchema.optional(),
  model_version: z.string(),
  as_of: z.string(),
  input_revision: z.number(),
  input_digest: z.string(),
  knowledge: z.string(),
  notice: z.string(),
  window: z.object({ from: z.string(), to: z.string(), days: z.number() }),
  readiness: z.object({
    status: z.string(),
    reasons: z.array(z.string()),
    sleep_hours_in_recorded_intervals: z.number().nullable(),
    pain: z.array(
      z.object({ id: z.string(), area: z.string(), intensity: z.number() }),
    ),
  }),
  coverage: z.object({
    missing: z.array(z.string()),
    date_only_loads: z.number(),
    unmapped_loads: z.array(z.object({ id: z.string(), reason: z.string() })),
  }),
  muscles: z.record(
    z.string(),
    z.record(
      z.string(),
      z.object({
        low: z.number(),
        high: z.number(),
        unit: z.string(),
        source_ids: z.array(z.string()),
      }),
    ),
  ),
  timeline: z.array(
    z.object({
      date: z.string(),
      strength_sets: z.number(),
      isometric_seconds: z.number(),
      cardio_seconds: z.number(),
      distance_m: z.number(),
      source_ids: z.array(z.string()),
    }),
  ),
  goals: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      unit: z.string(),
      target: z.number(),
      progress: z.number().nullable(),
      deviation_from_user_line: z.number().nullable(),
      points: z.array(point),
      latest: point,
    }),
  ),
  capability: z.array(
    z.object({
      definition_id: z.string(),
      variant: z.string(),
      side: z.string(),
      protocol_version: z.string(),
      equipment: z.string(),
      unit: z.string(),
      points: z.array(point),
      best: point.nullable(),
      missing: z.array(z.string()),
    }),
  ),
  daily_context: z.array(
    z.object({
      date: z.string(),
      nutrition_status: z.string(),
      energy_kcal: z.number().nullable(),
      protein_g: z.number().nullable(),
      water_ml: z.number().nullable(),
      sleep_hours: z.number().nullable(),
      source_ids: z.array(z.string()),
    }),
  ),
  progression: z.array(
    z.object({
      exercise_id: z.string(),
      name: z.string(),
      status: z.string(),
      rule_id: z.string(),
      before: z.record(z.string(), z.unknown()),
      after: z.record(z.string(), z.unknown()),
      reason: z.array(z.string()),
      missing: z.array(z.string()),
      approval: z.string(),
    }),
  ),
  calibration: z.object({ status: z.string(), reason: z.string() }),
  input_lineage: z.array(
    z.object({ kind: z.string(), id: z.string(), version: z.number() }),
  ),
});
type Report = z.infer<typeof schema>;
const muscleNames: Record<string, string> = {
  lats: "Kanat",
  upperBack: "Üst sırt",
  lowerBack: "Alt sırt",
  chest: "Göğüs",
  frontDelts: "Ön omuz",
  rearDelts: "Arka omuz",
  sideDelts: "Yan omuz",
  biceps: "Ön kol kası",
  triceps: "Arka kol kası",
  forearms: "Önkol",
  abs: "Karın",
  obliques: "Yan karın",
  quads: "Ön bacak",
  hamstrings: "Arka bacak",
  glutes: "Kalça",
  calves: "Baldır",
  hipFlexors: "Kalça fleksörleri",
  scapular: "Kürek kemiği çevresi",
};
export function Trend({
  points,
  unit,
  label,
}: {
  points: { date: string; value: number }[];
  unit: string;
  label: string;
}) {
  if (!points.length) return <p>Bu aralıkta karşılaştırılabilir kayıt yok.</p>;
  const min = Math.min(...points.map((p) => p.value)),
    max = Math.max(...points.map((p) => p.value)),
    span = max - min || 1;
  const dates = points.map((p) => Date.parse(p.date)),
    first = Math.min(...dates),
    last = Math.max(...dates);
  const xy = points.map((p, i) => ({
    x: 35 + ((dates[i] - first) / (last - first || 1)) * 530,
    y: 130 - ((p.value - min) / span) * 95,
    ...p,
  }));
  return (
    <div className="trend">
      <svg
        viewBox="0 0 600 175"
        role="img"
        aria-label={label + "; ayrıntılar aşağıdaki tabloda"}
      >
        <line x1="35" x2="565" y1="130" y2="130" className="chart-grid" />
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          points={xy.map((p) => p.x + "," + p.y).join(" ")}
        />
        {xy.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="currentColor">
              <title>{p.date + ": " + shown(p.value, unit)}</title>
            </circle>
          </g>
        ))}
        <text x="35" y="160">
          {points[0].date}
        </text>
        <text textAnchor="end" x="565" y="160">
          {points.at(-1)?.date}
        </text>
      </svg>
      <details>
        <summary>
          {label} · Değer tablosu ({unit})
        </summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Değer ({unit})</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={i}>
                  <td>{p.date}</td>
                  <td>{shown(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
function MuscleMap({ report }: { report: Report }) {
  const [selected, setSelected] = useState("");
  const groups = Object.keys(report.muscles);
  const layout: [string, number, number, number, number][] = [
    ["frontDelts", 63, 86, 23, 28],
    ["chest", 90, 93, 48, 32],
    ["biceps", 48, 120, 22, 44],
    ["triceps", 160, 120, 22, 44],
    ["forearms", 32, 169, 20, 50],
    ["abs", 99, 132, 31, 51],
    ["obliques", 79, 140, 15, 43],
    ["quads", 77, 214, 32, 76],
    ["calves", 76, 300, 23, 62],
    ["lats", 325, 111, 49, 49],
    ["upperBack", 327, 85, 45, 24],
    ["lowerBack", 335, 161, 30, 28],
    ["glutes", 318, 192, 66, 37],
    ["hamstrings", 321, 234, 25, 60],
  ];
  const channels = report.muscles[selected];
  return (
    <section className="card">
      <span className="eyebrow">Zamanla yeniden hesaplanan model</span>
      <h2>Kas bölgeleri</h2>
      <p>{report.notice}</p>
      <svg
        className="body-map"
        viewBox="0 0 470 390"
        role="img"
        aria-label="Ön ve arka vücut şeması. Bölge değerleri aşağıdaki seçim ve metinde bulunur."
      >
        <g fill="var(--tint)" stroke="var(--line)">
          <circle cx="114" cy="42" r="23" />
          <circle cx="350" cy="42" r="23" />
          <path d="M91 73 L137 73 L157 185 L144 213 L135 375 L111 375 L107 234 L101 375 L77 375 L74 213 L68 183Z" />
          <path d="M327 73 L373 73 L393 185 L380 213 L371 375 L347 375 L343 234 L337 375 L313 375 L310 213 L304 183Z" />
        </g>
        {layout.map(([key, x, y, w, h]) => (
          <rect
            key={key}
            x={x}
            y={y}
            width={w}
            height={h}
            rx="10"
            fill={report.muscles[key] ? "var(--accent)" : "var(--line)"}
            opacity={
              report.muscles[key]?.[Object.keys(report.muscles[key])[0]]?.high
                ? 0.7
                : 0.4
            }
          />
        ))}
        <text x="114" y="387" textAnchor="middle">
          Ön
        </text>
        <text x="350" y="387" textAnchor="middle">
          Arka
        </text>
      </svg>
      <p className="caption">
        Renk yalnız kaydedilmiş maruziyet bulunan bölgeyi belirtir. Gri alan
        “tam iyileşti” anlamına gelmez.
      </p>
      <label>
        İncelenecek kas bölgesi
        <select
          aria-label="İncelenecek kas bölgesi"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Bölge seç</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {muscleNames[g] || g}
            </option>
          ))}
        </select>
      </label>
      {channels && (
        <div className="muscle-readout">
          <h3>{muscleNames[selected] || selected}</h3>
          {Object.entries(channels).map(([key, v]) => (
            <p key={key}>
              {shown(v.low)}–{shown(v.high)} {v.unit}{" "}
              <small>· {v.source_ids.length} kaynak kayıt</small>
            </p>
          ))}
        </div>
      )}
      {!groups.length && (
        <p>Hareketi ve miktarı eşleşen gerçek yük kaydı yok.</p>
      )}
      <p>
        {report.coverage.date_only_loads} kaydın saati bilinmiyor; aralıkla
        gösteriliyor. {report.coverage.unmapped_loads.length} kayıt için kas
        eşlemesi veya miktar eksik.
      </p>
    </section>
  );
}
export function Reports({
  store,
  selected,
  onDate,
  statusOnly = false,
}: {
  store: SyncStore;
  selected: string;
  onDate: (s: string) => void;
  statusOnly?: boolean;
}) {
  const visibilityKey = "alos-body-open:" + store.me.athlete_id;
  const [showBody, setShowBody] = useState(() => {
    try {
      return localStorage.getItem(visibilityKey) === "yes";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let active = true;
    let preference: string | null = null;
    try {
      preference = localStorage.getItem(visibilityKey);
    } catch {
      /* Storage may be unavailable. */
    }
    if (preference === null)
      void api("body-model")
        .then((value) => {
          if (active && (value as { available?: boolean }).available) {
            try {
              if (localStorage.getItem(visibilityKey) === "no") return;
              localStorage.setItem(visibilityKey, "yes");
            } catch {
              /* Display only. */
            }
            setShowBody(true);
          }
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [visibilityKey]);
  function toggleBody() {
    setShowBody((value) => {
      const next = !value;
      try {
        localStorage.setItem(visibilityKey, next ? "yes" : "no");
      } catch {
        /* Display only. */
      }
      return next;
    });
  }
  const [report, setReport] = useState<Report>(),
    [days, setDays] = useState(28),
    [knowledge, setKnowledge] = useState("recomputed"),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(false),
    [saved, setSaved] = useState(""),
    [metric, setMetric] = useState("strength_sets");
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState !== "hidden" && !saved)
        setRefresh((n) => n + 1);
    }, 60000);
    const resume = () => {
      if (document.visibilityState !== "hidden" && !saved)
        setRefresh((n) => n + 1);
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
    };
  }, [saved]);
  useEffect(() => {
    if (saved) {
      const row = store.view("analysis").find((r) => r.id === saved);
      if (row) {
        const parsed = schema.safeParse(row.result);
        if (parsed.success) setReport(parsed.data);
        else
          setError(
            "Saklanan hesap sürümü açılamadı. Kaynak yedekte korunuyor.",
          );
      }
      return;
    }
    let active = true;
    setLoading(true);
    void api(
      "analysis?on=" +
        selected +
        "&window_days=" +
        days +
        "&knowledge=" +
        knowledge,
    )
      .then((value) => {
        const data = schema.parse(value);
        if (active) {
          setReport(data);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    selected,
    days,
    knowledge,
    store.snapshot?.cursor,
    refresh,
    saved,
    store,
  ]);
  const metrics: Record<string, [string, string]> = {
    strength_sets: ["Gerçek kuvvet setleri", "set"],
    isometric_seconds: ["Sabit tutuş süresi", "sn"],
    cardio_seconds: ["Kardiyo çalışma süresi", "sn"],
    distance_m: ["Kardiyo mesafesi", "m"],
  };
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Kaydına dayanan içgörüler</span>
          <h1>{statusOnly ? "Durumum" : "Raporlar"}</h1>
          <p>
            {statusOnly
              ? "Hedeflerin ve bugün bildiğimiz durumun."
              : "Yük, alışkanlık ve gelişim. Her hesap kendi kaynaklarıyla birlikte."}
          </p>
        </div>
        {statusOnly ? (
          <Target className="heading-icon" />
        ) : (
          <ChartNoAxesCombined className="heading-icon" />
        )}
      </div>
      {!statusOnly && (
        <>
          <button className="secondary" onClick={toggleBody}>
            {showBody ? "3B görünümü kapat" : "3B kütüphanemi aç"}
          </button>
          {showBody && (
            <Suspense fallback={<p role="status">3B görünüm hazırlanıyor…</p>}>
              <BodyModel
                store={store}
                recovery={error ? undefined : report?.muscle_recovery}
                asOf={report?.as_of}
                context={report?.readiness.reasons}
                frozen={
                  !!saved || selected !== new Date().toLocaleDateString("en-CA")
                }
                exposure={report?.muscles}
                pending={loading}
                error={error}
                onNow={() => {
                  setSaved("");
                  setKnowledge("recomputed");
                  onDate(new Date().toLocaleDateString("en-CA"));
                  setRefresh((n) => n + 1);
                }}
              />
            </Suspense>
          )}
        </>
      )}
      <DayToolbar selected={selected} onDate={onDate} />
      <div className="report-controls">
        <label>
          Zaman aralığı
          <select
            aria-label="Zaman aralığı"
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setSaved("");
            }}
          >
            {[
              [1, "Günlük"],
              [7, "Haftalık"],
              [28, "4 hafta"],
              [84, "12 hafta"],
            ].map(([n, label]) => (
              <option key={n} value={n}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hesap görünümü
          <select
            aria-label="Hesap görünümü"
            value={knowledge}
            onChange={(e) => {
              setKnowledge(e.target.value);
              setSaved("");
            }}
          >
            <option value="recomputed">Güncel kayıtlarla yeniden hesap</option>
            <option value="as_known">O tarihte bilinen kayıtlarla</option>
          </select>
        </label>
        <button
          className="icon"
          aria-label="Raporu yenile"
          onClick={() => setRefresh((n) => n + 1)}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}{" "}
          {report ? "Ekrandaki son başarılı hesap güncel olmayabilir." : ""}
        </p>
      )}
      {loading && <p role="status">Kayıtlar değerlendiriliyor…</p>}
      {report && (
        <>
          <section className="card">
            <span className="eyebrow">
              {saved ? "Kaydedilmiş karar" : "Son hesap"} ·{" "}
              {new Date(report.as_of).toLocaleString("tr-TR")}
            </span>
            <h2>
              {report.readiness.status === "caution"
                ? "Bugün kendine alan aç."
                : report.readiness.status === "unknown"
                  ? "Biraz daha bilgiye ihtiyacımız var."
                  : "Kendi bildirimlerinle ilerle."}
            </h2>
            {report.readiness.reasons.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>
              Eksik:{" "}
              {report.coverage.missing.join(" · ") ||
                "Listelenmiş eksik yok; bu bir güvenlik garantisi değildir."}
            </p>
            {report.readiness.pain.map((p) => (
              <p className="notice" key={p.id}>
                Ağrı: {p.area} · {p.intensity}/10
              </p>
            ))}
            <div className="actions">
              <a className="link-button secondary" href="#health">
                Günlük durumumu gir
              </a>
              <a className="link-button secondary" href="#goals">
                Hedeflerimi düzenle
              </a>
            </div>
          </section>
          {report.goals.map((g) => (
            <section className="card" key={g.id}>
              <span className="eyebrow">Hedefim</span>
              <h2>{g.title}</h2>
              <div className="metric-grid">
                <div className="metric">
                  <span>Son ölçüm</span>
                  <strong>{shown(g.latest.value, g.unit)}</strong>
                </div>
                <div className="metric">
                  <span>Hedefe göre ilerleme</span>
                  <strong>
                    {shown(g.progress, g.progress == null ? "" : "%")}
                  </strong>
                </div>
              </div>
              <Trend
                points={g.points.map((p) => ({
                  date: p.local_date,
                  value: p.value,
                }))}
                unit={g.unit}
                label={g.title}
              />
              <p>
                Çizgisel hedef yolundan fark:{" "}
                {shown(g.deviation_from_user_line, g.unit)}. Bu karşılaştırma
                senin hedef tarihine dayanır; biyolojik gelişim tahmini
                değildir.
              </p>
            </section>
          ))}
          {!report.goals.length && (
            <section className="card">
              <h2>İlk hedefini belirle.</h2>
              <p>Ölçülebilir bir hedef eklediğinde gelişimin burada görünür.</p>
              <a href="#goals" className="link-button">
                Hedef ekle
              </a>
            </section>
          )}
          {report.progression.length > 0 && (
            <section className="card">
              <h2>Program incelemesi</h2>
              {report.progression.map((r) => (
                <details key={r.exercise_id}>
                  <summary>
                    {r.name} ·{" "}
                    {r.status === "proposed"
                      ? "Küçük artış değerlendirilebilir"
                      : r.status === "review"
                        ? "Daha hafif seçenek var"
                        : "Mevcut hedefi izle"}
                  </summary>
                  {r.reason.map((s) => (
                    <p key={s}>{s}</p>
                  ))}
                  {r.missing.map((s) => (
                    <p key={s}>Eksik: {s}</p>
                  ))}
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Hedef</th>
                          <th>Mevcut</th>
                          <th>İncelenecek seçenek</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(r.before).map((k) => (
                          <tr key={k}>
                            <td>
                              {(
                                {
                                  sets: "Set",
                                  reps: "Tekrar",
                                  seconds: "Saniye",
                                  external_kg: "Ek yük (kg)",
                                  rir: "Yedekte tekrar (RIR)",
                                  rest_seconds: "Dinlenme (sn)",
                                } as Record<string, string>
                              )[k] || k}
                            </td>
                            <td>{shown(r.before[k])}</td>
                            <td>{shown(r.after[k])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p>{r.approval}</p>
                  <a href="#program" className="link-button secondary">
                    Programımı incele
                  </a>
                </details>
              ))}
            </section>
          )}
          {!statusOnly && (
            <>
              <section className="card">
                <h2>Gerçekleşen çalışmalar</h2>
                <label>
                  Grafikte göster
                  <select
                    aria-label="Grafikte göster"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                  >
                    {Object.entries(metrics).map(([key, [label]]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <Trend
                  points={report.timeline.map((r) => ({
                    date: r.date,
                    value: Number(r[metric as keyof typeof r]),
                  }))}
                  unit={metrics[metric][1]}
                  label={metrics[metric][0]}
                />
                <p>
                  Yalnız kayıt bulunan günler gösterilir. Eksik gün, yapılmamış
                  antrenman sayılmaz.
                </p>
                <details>
                  <summary>Dayanak seansları aç</summary>
                  {report.timeline.map((r) => (
                    <p key={r.date}>
                      <a href={"?date=" + r.date + "#workout"}>
                        {r.date} · {r.source_ids.length} gerçek kayıt
                      </a>
                    </p>
                  ))}
                </details>
              </section>
              <details className="card">
                <summary>2B alternatif harita ve yük tablosu</summary>
                <MuscleMap report={report} />
              </details>
              <section className="card">
                <h2>Beslenme ve uyku eğilimleri</h2>
                <p>
                  Grafikler yalnız kayıtlı değerleri gösterir. Kısmi beslenme
                  günleri tam günlük tüketim gibi kullanılmaz.
                </p>
                <Trend
                  label="Tam kaydedilmiş günlerde protein"
                  unit="g"
                  points={report.daily_context
                    .filter(
                      (r) =>
                        r.nutrition_status === "complete" &&
                        r.protein_g != null,
                    )
                    .map((r) => ({ date: r.date, value: r.protein_g! }))}
                />
                <Trend
                  label="Kaydedilen uyku"
                  unit="saat"
                  points={report.daily_context
                    .filter((r) => r.sleep_hours != null)
                    .map((r) => ({ date: r.date, value: r.sleep_hours! }))}
                />
                <p>
                  {
                    report.daily_context.filter(
                      (r) => r.nutrition_status === "complete",
                    ).length
                  }
                  /{report.window.days} günün beslenme kaydı tamamlandı.
                </p>
              </section>
              <section className="card">
                <h2>Karşılaştırılabilir yetenek sonuçları</h2>
                {report.capability.length ? (
                  report.capability.map((r, i) => (
                    <details key={i}>
                      <summary>
                        {r.definition_id.replaceAll("_", " ")} · {r.variant} ·{" "}
                        {r.side}
                      </summary>
                      <p>
                        En iyi:{" "}
                        {r.best
                          ? shown(r.best.value, r.unit)
                          : "Yönü doğrulanmış karşılaştırma yok"}{" "}
                        · {r.protocol_version} · {r.equipment}
                      </p>
                      <Trend
                        points={r.points.map((p) => ({
                          date: p.local_date,
                          value: p.value,
                        }))}
                        unit={r.unit}
                        label={r.definition_id}
                      />
                      {r.missing.map((s) => (
                        <p key={s}>{s}</p>
                      ))}
                    </details>
                  ))
                ) : (
                  <p>Karşılaştırılabilir test kaydı henüz yok.</p>
                )}
                <a className="text-button" href="#capability">
                  Capability Lab’i aç
                </a>
              </section>
            </>
          )}
          <section className="card">
            <h2>Bu hesabın dayanağı</h2>
            <p>
              Model {report.model_version} · Veri sürümü {report.input_revision}{" "}
              ·{" "}
              {report.knowledge === "as_known"
                ? "O tarihte bilinen kayıtlar"
                : "Güncel kayıtlarla yeniden hesap"}
            </p>
            <p>{report.calibration.reason}</p>
            <div className="actions">
              <button
                className="secondary"
                disabled={loading || Boolean(error) || store.pending.length > 0}
                onClick={() =>
                  void store
                    .enqueue("analysis.capture", null, {
                      as_of: report.as_of,
                      window_days: days,
                      knowledge,
                      model_version: report.model_version,
                    })
                    .catch((e) => setError(e.message))
                }
              >
                Kararı geçmişime kaydet
              </button>
              <a
                href={
                  "/api/v2/reports/pdf?on=" + selected + "&window_days=" + days
                }
                className="link-button secondary"
              >
                <Download size={17} />
                PDF raporu
              </a>
              <a className="link-button secondary" href="#science">
                <BookOpen size={17} />
                Bilim ve sınırlar
              </a>
            </div>
            <label>
              Saklanan kararlar
              <select
                aria-label="Saklanan kararlar"
                value={saved}
                onChange={(e) => setSaved(e.target.value)}
              >
                <option value="">Canlı hesap</option>
                {store.view("analysis").map((r) => (
                  <option key={r.id} value={r.id}>
                    {new Date(String(r.as_of)).toLocaleString("tr-TR")} ·{" "}
                    {String(r.model_version)}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </>
      )}
    </>
  );
}
export function Science() {
  const [rules, setRules] = useState<Record<string, unknown>[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    void api("evidence")
      .then((v) => setRules((v as { rules: Record<string, unknown>[] }).rules))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Şeffaf hesaplar</span>
          <h1>Bilim ve model sınırları</h1>
          <p>
            Yazılım testi, insan fizyolojisinin doğrulandığı anlamına gelmez.
            Sayısal ürün varsayımları ayrıca belirtilir.
          </p>
        </div>
        <BookOpen className="heading-icon" />
      </div>
      {error && <p role="alert">{error}</p>}
      {rules.map((r) => (
        <section className="card" key={String(r.id)}>
          <span className="eyebrow">
            {r.status === "heuristic"
              ? "Ürün varsayımı"
              : "Uzman incelemesi bekleniyor"}
          </span>
          <h2>{String(r.title)}</h2>
          <p>{String(r.interpretation)}</p>
          <details>
            <summary>Kaynak, kapsam ve sınırlılık</summary>
            {[
              "authors_year",
              "population",
              "experience",
              "outcome",
              "limitation",
              "access_scope",
              "product_parameter",
            ].map((k) => (
              <p key={k}>{String(r[k])}</p>
            ))}
            {Boolean(r.url) && (
              <a
                className="text-button"
                href={String(r.url)}
                target="_blank"
                rel="noreferrer"
              >
                Asıl kaynağı aç
              </a>
            )}
          </details>
        </section>
      ))}
    </>
  );
}
