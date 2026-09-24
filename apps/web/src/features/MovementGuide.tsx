import { useId, useState } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import { movements, findMovement, type Movement } from "./movementLibrary";

function Pose({ pose, label }: { pose: string; label: string }) {
  const id = useId();
  const [head, ...lines] = pose.split("|");
  const [cx, cy] = head.split(",");
  return <svg viewBox="0 0 180 170" role="img" aria-labelledby={id}>
    <title id={id}>{label}</title>
    <path d="M15 151H165" className="pose-floor" />
    <g fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
      {lines.map((d, i) => <path d={d} key={i} />)}
    </g>
    <circle cx={cx} cy={cy} r="10" fill="currentColor" />
  </svg>;
}
function Anatomy({ movement }: { movement: Movement }) {
  const id = useId();
  const regions = [
    ["chest", "M33 38Q43 32 49 39L49 51L35 50Z M51 39Q58 32 67 38L65 50L51 51Z"],
    ["core", "M38 54H62L60 82H40Z"],
    ["quads", "M34 88L48 91L45 121H32Z M52 91L66 88L68 121H55Z"],
    ["shoulders", "M29 34L35 37L33 50L23 47Z M65 37L71 34L77 47L67 50Z"],
    ["triceps", "M123 51L131 53L127 69L120 66Z M169 53L177 51L180 66L173 69Z"],
    ["glutes", "M136 78Q145 73 149 80L149 92L134 92Z M151 80Q159 73 164 78L166 92H151Z"],
    ["back", "M144 42H149V76L144 73Z M151 42H156V73L151 76Z"],
  ];
  return <svg viewBox="0 0 200 160" role="img" aria-labelledby={id} className="muscle-map">
    <title id={id}>Şematik kas haritası: {movement.muscles}</title>
    {[0, 100].map(x => <g key={x} transform={`translate(${x} 0)`} className="anatomy-base">
      <circle cx="50" cy="19" r="10" /><path d="M34 35Q50 28 66 35L62 66L67 90L70 141H56L50 102L44 141H30L33 90L38 66Z" />
      <path d="M30 40L22 76M70 40L78 76" fill="none" strokeWidth="12" strokeLinecap="round" />
    </g>)}
    {regions.filter(([key]) => movement.regions.includes(key)).map(([key, d]) => <path key={key} d={d} className="muscle-active" />)}
    <text x="50" y="157" textAnchor="middle">Ön</text><text x="150" y="157" textAnchor="middle">Arka</text>
  </svg>;
}
export function MovementCard({ movement }: { movement: Movement }) {
  return <article className="movement-card">
    <div className="movement-poses">
      {movement.poses.map((pose, i) => <figure key={i}>
        <Pose pose={pose} label={`${movement.name} — ${movement.phases[i]}`} />
        <figcaption><span>{i + 1}</span>{movement.phases[i]}</figcaption>
      </figure>)}
    </div>
    <div className="movement-notes">
      <div><span className="eyebrow">Hareketi tanı</span><h3>{movement.name}</h3>
        <p>{movement.cue}</p><p className="caption">{movement.detail}</p>
        <a href={movement.source} target="_blank" rel="noreferrer">ACE hareket kütüphanesi <ChevronRight size={13} /></a>
      </div>
      <div className="movement-muscles"><Anatomy movement={movement} /><strong>{movement.muscles}</strong></div>
    </div>
    <p className="caption">Şematik anlatım · Renkler hedef kas bölgelerini gösterir; ölçülmüş kas aktivasyonu veya kişisel teknik değerlendirmesi değildir.</p>
  </article>;
}
export function MovementHelp({ name, variant = "standard" }: { name: string; variant?: string }) {
  const movement = findMovement(name, variant);
  if (!name.trim()) return null;
  return <details className="movement-help">
    <summary><BookOpen size={17} /> Hareket görseli ve uygulama rehberi</summary>
    {movement ? <MovementCard movement={movement} /> : <p className="caption">“{name}” için bu varyasyona ait görsel henüz yok. Genel bir hareketi bu kaydın tekniği gibi göstermiyoruz. Aşağıdaki kütüphaneden temel hareketleri inceleyebilirsin.</p>}
  </details>;
}
export function MovementLibrary() {
  const [selected, setSelected] = useState(movements[0].id);
  const id = useId();
  const movement = movements.find(item => item.id === selected)!;
  return <section className="card movement-library">
    <details>
      <summary><BookOpen size={19} /><span>Hareket kütüphanesi<small>6 temel hareket · görsel anlatım ve kas bölgeleri</small></span></summary>
      <label htmlFor={id}>İncelemek istediğin hareket</label>
      <select id={id} value={selected} onChange={e => setSelected(e.target.value)}>
        {movements.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <MovementCard movement={movement} />
    </details>
  </section>;
}
