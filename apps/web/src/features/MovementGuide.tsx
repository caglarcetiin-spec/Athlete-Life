import {
  catalogGuide,
  muscleLabels,
  type CatalogMovement,
} from "./catalogVisuals";
import { api } from "../api/contracts";
import { useEffect, useId, useState } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import { findMovement, type Movement } from "./movementLibrary";

function Pose({
  pose,
  label,
  equipment,
}: {
  pose: string;
  label: string;
  equipment?: string;
}) {
  const id = useId();
  const [head, ...lines] = pose.split("|");
  const [cx, cy] = head.split(",");
  return (
    <svg viewBox="0 0 180 170" role="img" aria-labelledby={id}>
      <title id={id}>{label}</title>
      <path d="M15 151H165" className="pose-floor" />
      {equipment && (
        <path
          d={equipment}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
        />
      )}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {lines.map((d, i) => (
          <path d={d} key={i} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r="10" fill="currentColor" />
    </svg>
  );
}
function Anatomy({ movement }: { movement: Movement }) {
  const id = useId();
  const regions = [
    [
      "chest",
      "M33 38Q43 32 49 39L49 51L35 50Z M51 39Q58 32 67 38L65 50L51 51Z",
    ],
    ["core", "M38 54H62L60 82H40Z"],
    ["quads", "M34 88L48 91L45 121H32Z M52 91L66 88L68 121H55Z"],
    ["shoulders", "M29 34L35 37L33 50L23 47Z M65 37L71 34L77 47L67 50Z"],
    ["triceps", "M123 51L131 53L127 69L120 66Z M169 53L177 51L180 66L173 69Z"],
    [
      "glutes",
      "M136 78Q145 73 149 80L149 92L134 92Z M151 80Q159 73 164 78L166 92H151Z",
    ],
    ["back", "M144 42H149V76L144 73Z M151 42H156V73L151 76Z"],
  ];
  return (
    <svg
      viewBox="0 0 200 160"
      role="img"
      aria-labelledby={id}
      className="muscle-map"
    >
      <title id={id}>Şematik kas haritası: {movement.muscles}</title>
      {[0, 100].map((x) => (
        <g key={x} transform={`translate(${x} 0)`} className="anatomy-base">
          <circle cx="50" cy="19" r="10" />
          <path d="M34 35Q50 28 66 35L62 66L67 90L70 141H56L50 102L44 141H30L33 90L38 66Z" />
          <path
            d="M30 40L22 76M70 40L78 76"
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
          />
        </g>
      ))}
      {regions
        .filter(([key]) => movement.regions.includes(key))
        .map(([key, d]) => (
          <path key={key} d={d} className="muscle-active" />
        ))}
      <text x="50" y="157" textAnchor="middle">
        Ön
      </text>
      <text x="150" y="157" textAnchor="middle">
        Arka
      </text>
    </svg>
  );
}
export function MovementCard({ movement }: { movement: Movement }) {
  return (
    <article className="movement-card">
      <p className="eyebrow">
        {movement.visualScope || "Başlangıç ve hareket pozisyonu"}
      </p>
      <div className="movement-poses">
        {movement.poses.map((pose, i) => (
          <figure key={i}>
            <Pose
              pose={pose}
              equipment={movement.equipmentPaths?.[i]}
              label={`${movement.name} — ${movement.phases[i]}`}
            />
            <figcaption>
              <span>{i + 1}</span>
              {movement.phases[i]}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="movement-notes">
        <div>
          <span className="eyebrow">Hareketi tanı</span>
          <h3>{movement.name}</h3>
          <p>{movement.cue}</p>
          <p className="caption">{movement.detail}</p>
          <a href={movement.source} target="_blank" rel="noreferrer">
            Uygulama kaynağını aç <ChevronRight size={13} />
          </a>
        </div>
        {movement.regions.length > 0 && (
          <div className="movement-muscles">
            <Anatomy movement={movement} />
            <strong>{movement.muscles}</strong>
          </div>
        )}
      </div>
      <p className="caption">
        Şematik anlatım · Renkler hedef kas bölgelerini gösterir; ölçülmüş kas
        aktivasyonu veya kişisel teknik değerlendirmesi değildir.
      </p>
    </article>
  );
}
export function MovementHelp({
  name,
  variant = "standard",
}: {
  name: string;
  variant?: string;
}) {
  const [catalog, setCatalog] = useState<CatalogMovement[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    let live = true;
    void api("catalogs")
      .then((v) => {
        if (live) setCatalog((v as { movements: CatalogMovement[] }).movements);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open]);
  const norm = (v: string) =>
    v.trim().toLocaleLowerCase("tr-TR").replace(/[-_ ]/g, "");
  const candidate = catalog.find((m) =>
    [m.id, m.name, m.displayNameTR || "", ...(m.aliases || [])].some(
      (v) => norm(v) === norm(name),
    ),
  );
  const movement =
    findMovement(name, variant) ||
    (["standard", "standart", ""].includes(variant) && candidate
      ? catalogGuide(candidate)
      : undefined);
  if (!name.trim()) return null;
  return (
    <details
      className="movement-help"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <BookOpen size={17} /> Hareket görseli ve uygulama rehberi
      </summary>
      {movement ? (
        <MovementCard movement={movement} />
      ) : (
        <p className="caption">
          “{name}” için bu varyasyona ait görsel henüz yok. Genel bir hareketi
          bu kaydın tekniği gibi göstermiyoruz. Aşağıdaki kütüphaneden tüm
          katalog hareketlerini inceleyebilirsin.
        </p>
      )}
    </details>
  );
}
const modalities: Record<string, string> = {
  strength: "Kuvvet",
  isometric: "Sabit tutuş",
  skill: "Beceri",
  cardio: "Dayanıklılık",
  circuit: "Devre çalışması",
};
function CatalogMuscleMap({ muscles }: { muscles: Record<string, number> }) {
  const id = useId();
  const [selected, setSelected] = useState(
    Object.keys(muscles).sort((a, b) => muscles[b] - muscles[a])[0] || "",
  );
  const regions: [string, string][] = [
    [
      "chest",
      "M35 38Q43 33 49 39L49 53L36 51Z M51 39Q60 33 65 38L64 51L51 53Z",
    ],
    ["abs", "M43 55H57L56 84H44Z"],
    ["obliques", "M36 55L41 58L42 83L37 81Z M59 58L64 55L63 81L58 83Z"],
    ["frontDelts", "M30 34L35 38L32 49L24 44Z"],
    ["sideDelts", "M70 34L75 44L67 49L65 38Z"],
    ["biceps", "M24 48L31 51L27 69L20 66Z M69 51L76 48L80 66L73 69Z"],
    ["forearms", "M19 69L26 72L21 92L14 88Z M74 72L81 69L86 88L79 92Z"],
    ["hipFlexors", "M37 86H47L45 101L36 96Z M53 86H63L64 96L55 101Z"],
    ["quads", "M35 102L47 106L43 136L33 136Z M53 106L65 102L67 136L57 136Z"],
    ["upperBack", "M140 35L150 31L160 35L156 49H144Z"],
    ["scapular", "M136 40L144 46L144 60L133 55Z M156 46L164 40L167 55L156 60Z"],
    ["lats", "M135 59L146 64L149 81L139 73Z M154 64L165 59L161 73L151 81Z"],
    ["lowerBack", "M142 77L150 83L158 77V92H142Z"],
    [
      "rearDelts",
      "M129 34L135 39L132 50L123 45Z M165 39L171 34L177 45L168 50Z",
    ],
    ["triceps", "M124 48L131 51L128 70L120 66Z M169 51L176 48L180 66L172 70Z"],
    ["glutes", "M137 94L149 94V107L134 106Z M151 94L163 94L166 106L151 107Z"],
    ["hamstrings", "M135 111H146L143 136H133Z M154 111H165L167 136H157Z"],
    ["calves", "M134 140H144L141 162H134Z M156 140H166V162H159Z"],
  ];
  return (
    <figure className="interactive-muscles">
      <svg
        viewBox="0 0 200 185"
        role="group"
        aria-labelledby={id}
        className="muscle-map"
      >
        <title id={id}>Kas bölgelerine dokunarak ayrıntıyı göster</title>
        {[0, 100].map((x) => (
          <g key={x} transform={`translate(${x} 0)`} className="anatomy-base">
            <circle cx="50" cy="16" r="10" />
            <path d="M30 34Q50 25 70 34L62 77L67 102L68 164H56L50 118L44 164H32L33 102L38 77Z" />
            <path
              d="M30 37L20 91M70 37L80 91"
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
            />
          </g>
        ))}
        {regions
          .filter(([key]) => muscles[key] > 0)
          .map(([key, d]) => (
            <path
              key={key}
              d={d}
              role="button"
              tabIndex={0}
              aria-label={muscleLabels[key]}
              aria-pressed={selected === key}
              className={
                selected === key ? "muscle-region selected" : "muscle-region"
              }
              onClick={() => setSelected(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(key);
                }
              }}
            >
              <title>{muscleLabels[key]}</title>
            </path>
          ))}
        <text x="50" y="181" textAnchor="middle">
          Ön
        </text>
        <text x="150" y="181" textAnchor="middle">
          Arka
        </text>
      </svg>
      <figcaption aria-live="polite">
        <strong>{muscleLabels[selected] || selected}</strong> ·{" "}
        {muscles[selected] >= 0.8
          ? "Katalogda yüksek katkı"
          : "Katalogda yardımcı katkı"}
        . Bu eşleme aktivasyon veya gelişim yüzdesi değildir.
      </figcaption>
      <div className="actions" aria-label="Kas bölgesi seçimi">
        {Object.keys(muscles)
          .filter((k) => muscles[k] > 0)
          .map((key) => (
            <button
              type="button"
              className="secondary small"
              aria-pressed={selected === key}
              key={key}
              onClick={() => setSelected(key)}
            >
              {muscleLabels[key] || key}
            </button>
          ))}
      </div>
    </figure>
  );
}
export function MovementLibrary() {
  const [catalog, setCatalog] = useState<CatalogMovement[]>([]);
  const [selected, setSelected] = useState("");
  const [visualOnly, setVisualOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    void api("catalogs")
      .then((v) => {
        if (live) {
          setCatalog((v as { movements: CatalogMovement[] }).movements);
          setError("");
        }
      })
      .catch(() => live && setError("Hareket kataloğu yüklenemedi."));
    return () => {
      live = false;
    };
  }, [revision]);
  const normalize = (v: string) =>
    v.toLocaleLowerCase("tr-TR").replace(/ı/g, "i");
  const results = catalog.filter(
    (m) =>
      (!visualOnly || Boolean(catalogGuide(m))) &&
      (!filter || m.modality === filter) &&
      normalize(
        [m.name, m.displayNameTR, ...(m.aliases || [])].join(" "),
      ).includes(normalize(query)),
  );
  const movement = results.find((m) => m.id === selected) || results[0];
  const guide = movement && catalogGuide(movement);
  const muscleEntries = movement
    ? Object.entries(movement.muscles).sort((a, b) => b[1] - a[1])
    : [];
  return (
    <section className="card movement-library">
      <details>
        <summary>
          <BookOpen size={19} />
          <span>
            Hareket kütüphanesi
            <small>
              {catalog.length
                ? `${catalog.length} katalog hareketi · kas bölgeleri ve kayıt biçimleri`
                : "Bilim kataloğu yükleniyor"}
            </small>
          </span>
        </summary>
        {error && (
          <p role="alert">
            {error}{" "}
            <button onClick={() => setRevision((v) => v + 1)}>
              Yeniden dene
            </button>
          </p>
        )}
        <div className="form-grid">
          <label>
            Hareket kütüphanesinde ara
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Halkada L tutuş, koşu, yüzme…"
            />
          </label>
          <label>
            Çalışma türü
            <select
              aria-label="Kütüphane çalışma türü"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">Tüm türler</option>
              {Object.entries(modalities).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={visualOnly}
            onChange={(e) => setVisualOnly(e.target.checked)}
          />
          Yalnız form çizimi bulunanları göster (
          {catalog.filter((m) => catalogGuide(m)).length})
        </label>
        <label>
          İncelemek istediğin hareket
          <select
            aria-label="İncelemek istediğin hareket"
            value={movement?.id || ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            {results.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayNameTR || m.name}
              </option>
            ))}
          </select>
        </label>
        {!results.length && !error && <p>Eşleşen hareket yok.</p>}
        {movement && (
          <article>
            <h3>{movement.displayNameTR || movement.name}</h3>
            <p>
              {modalities[movement.modality] || movement.modality} ·{" "}
              {movement.modality === "strength" || movement.modality === "skill"
                ? "Tekrar kaydı"
                : "Süre kaydı"}{" "}
              · {movement.equipment.join(" · ") || "Ek ekipman belirtilmemiş"}
            </p>
            {guide ? (
              <MovementCard key={"form:" + movement.id} movement={guide} />
            ) : (
              <p className="caption">
                {movement.sport_id
                  ? "Bu kayıt branşa ait bir çalışma başlığıdır. Tek bir hareketin yapılışını tarif etmez; bu başlık için doğrulanmış teknik çizim bulunmuyor."
                  : "Bu özel varyasyona ait form çizimi henüz bulunmuyor."}{" "}
                Varsa aşağıdaki kaynak bağlantısından tekniği inceleyebilirsin.
              </p>
            )}
            {movement.note && <p>{movement.note}</p>}
            {movement.source_urls?.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                Branş kaynağı
              </a>
            ))}
            <h4>Katalogdaki kas bölgeleri</h4>
            {muscleEntries.length > 0 && (
              <CatalogMuscleMap key={"muscles:" + movement.id} muscles={movement.muscles} />
            )}
            {muscleEntries.length ? (
              <ul className="catalog-muscle-list">
                {muscleEntries.map(([id, weight]) => (
                  <li key={id}>
                    <span>{muscleLabels[id] || id}</span>{" "}
                    <meter
                      min={0}
                      max={1}
                      value={weight}
                      aria-label={
                        (muscleLabels[id] || id) + " göreli katalog katsayısı"
                      }
                    />
                    <small>{weight.toLocaleString("tr-TR")}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Bu hareket için doğrulanmış kas eşlemesi bulunmuyor. Süre/mesafe
                takip edilir; kas katkısı bilinmiyor.
              </p>
            )}
            <p className="caption">
              Katsayılar göreli model ağırlıklarıdır; kişisel kas aktivasyonu,
              hasarı veya gelişim yüzdesi değildir. Plan ve kayıtlar aynı
              hareket kimliğini kullanır.
            </p>
            <small>
              Kimlik: {movement.id} · {movement.catalog_version}
            </small>
          </article>
        )}
      </details>
    </section>
  );
}
