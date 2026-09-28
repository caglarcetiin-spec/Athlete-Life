import { api } from "../api/contracts";
import { useEffect, useId, useState } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import { findMovement, type Movement } from "./movementLibrary";

function Pose({ pose, label }: { pose: string; label: string }) {
  const id = useId();
  const [head, ...lines] = pose.split("|");
  const [cx, cy] = head.split(",");
  return (
    <svg viewBox="0 0 180 170" role="img" aria-labelledby={id}>
      <title id={id}>{label}</title>
      <path d="M15 151H165" className="pose-floor" />
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
      <div className="movement-poses">
        {movement.poses.map((pose, i) => (
          <figure key={i}>
            <Pose
              pose={pose}
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
            ACE hareket kütüphanesi <ChevronRight size={13} />
          </a>
        </div>
        <div className="movement-muscles">
          <Anatomy movement={movement} />
          <strong>{movement.muscles}</strong>
        </div>
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
  const movement = findMovement(name, variant);
  if (!name.trim()) return null;
  return (
    <details className="movement-help">
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
type CatalogMovement = {
  id: string;
  name: string;
  displayNameTR?: string;
  aliases?: string[];
  modality: string;
  equipment: string[];
  muscles: Record<string, number>;
  pattern?: string;
  contraction?: string;
  catalog_version: string;
  note?: string;
};
const muscleLabels: Record<string, string> = {
  chest: "Göğüs",
  lats: "Geniş sırt",
  upperBack: "Üst sırt",
  lowerBack: "Bel",
  frontDelts: "Ön omuz",
  sideDelts: "Yan omuz",
  rearDelts: "Arka omuz",
  biceps: "Ön kol kası",
  triceps: "Arka kol kası",
  forearms: "Önkol",
  abs: "Karın",
  obliques: "Yan karın",
  glutes: "Kalça",
  quads: "Ön bacak",
  hamstrings: "Arka bacak",
  calves: "Baldır",
  scapular: "Kürek kemiği çevresi",
  hipFlexors: "Kalça fleksörleri",
};
const modalities: Record<string, string> = {
  strength: "Kuvvet",
  isometric: "Sabit tutuş",
  skill: "Beceri",
  cardio: "Dayanıklılık",
  circuit: "Devre çalışması",
};
function CatalogMuscleMap({ muscles }: { muscles: Record<string, number> }) {
  const id = useId();
  const locations: [string, number, number][] = [
    ["chest", 50, 51],
    ["abs", 50, 78],
    ["obliques", 64, 85],
    ["frontDelts", 30, 43],
    ["sideDelts", 73, 43],
    ["biceps", 28, 63],
    ["forearms", 23, 85],
    ["quads", 41, 118],
    ["hipFlexors", 57, 100],
    ["lats", 150, 69],
    ["upperBack", 150, 48],
    ["lowerBack", 150, 87],
    ["rearDelts", 175, 44],
    ["scapular", 140, 56],
    ["triceps", 174, 65],
    ["glutes", 150, 102],
    ["hamstrings", 140, 125],
    ["calves", 140, 148],
  ];
  return (
    <figure>
      <svg
        viewBox="0 0 200 185"
        role="img"
        aria-labelledby={id}
        className="muscle-map"
      >
        <title id={id}>
          Katalog kas bölgeleri:{" "}
          {Object.keys(muscles)
            .map((k) => muscleLabels[k] || k)
            .join(", ")}
        </title>
        {[0, 100].map((x) => (
          <g
            key={x}
            transform={`translate(${x} 0)`}
            fill="none"
            stroke="currentColor"
            opacity="0.3"
          >
            <circle cx="50" cy="16" r="10" />
            <path d="M30 34Q50 25 70 34L62 77L67 102L68 164H56L50 118L44 164H32L33 102L38 77Z" />
            <path
              d="M30 37L20 91M70 37L80 91"
              strokeWidth="9"
              strokeLinecap="round"
            />
          </g>
        ))}
        {locations
          .filter(([key]) => muscles[key] > 0)
          .map(([key, x, y]) => (
            <circle
              key={key}
              cx={x}
              cy={y}
              r={5 + muscles[key] * 4}
              fill="currentColor"
              opacity={0.45 + muscles[key] * 0.55}
            >
              <title>
                {muscleLabels[key] || key} · {muscles[key]}
              </title>
            </circle>
          ))}
        <text x="50" y="181" textAnchor="middle">
          Ön
        </text>
        <text x="150" y="181" textAnchor="middle">
          Arka
        </text>
      </svg>
      <figcaption>
        Şematik bölge gösterimi · ayrıntılar aşağıdaki listede
      </figcaption>
    </figure>
  );
}
export function MovementLibrary() {
  const [catalog, setCatalog] = useState<CatalogMovement[]>([]);
  const [selected, setSelected] = useState("");
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
      (!filter || m.modality === filter) &&
      normalize(
        [m.name, m.displayNameTR, ...(m.aliases || [])].join(" "),
      ).includes(normalize(query)),
  );
  const movement = results.find((m) => m.id === selected) || results[0];
  const guide = movement && findMovement(movement.name);
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
              <MovementCard movement={guide} />
            ) : (
              <p className="caption">
                Bu harekete ait teknik çizim henüz yok. Kas eşlemesi ve kayıt
                biçimi aşağıda; başka hareketin görseli yerine kullanılmaz.
              </p>
            )}
            <h4>Katalogdaki kas bölgeleri</h4>
            {muscleEntries.length > 0 && (
              <CatalogMuscleMap muscles={movement.muscles} />
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
