import {
  ArrowRight,
  GraduationCap,
  Route,
  ChartNoAxesCombined,
  FlaskConical,
  Archive,
  BookOpen,
  ShieldCheck,
  CalendarPlus,
  Target,
} from "lucide-react";
import type { SyncStore } from "../sync/store";
const steps = [
  {
    route: "profile",
    title: "Önce seni tanıyalım",
    text: "Deneyimini ve tercihlerini profilinden gir. Sade ve profesyonel görünüm aynı kayıtları kullanır; istediğin zaman değiştirebilirsin.",
  },
  {
    route: "goals",
    title: "Nereye ulaşmak istiyorsun?",
    text: "Başlangıcını, hedef değerini ve tarihini yaz. Ölçümleri geldikçe Durumum’da ilerlemeni görebilirsin.",
  },
  {
    route: "week",
    title: "Hayatına alan aç",
    text: "Haftanı seç, çalışma ve dinlenme saatlerini kaydet. Optimize et bir öneri üretir; kabul etmeden uygulanmaz.",
  },
  {
    route: "program",
    title: "Kendi planını oluştur",
    text: "Hedefinden başlayan yardımcılı taslağı veya manuel düzenleyiciyi kullan. Önce incele, ardından ana planına al.",
  },
  {
    route: "workout",
    title: "Yaptığını kaydet",
    text: "Tarih ve seansı kontrol et. Hedef ayrı, gerçekten yaptığın set ayrı. Dinlenme sayacını sıfırlamak kayıtlarını silmez.",
  },
  {
    route: "status",
    title: "İlerleyişini anla",
    text: "Burada hedeflerini ve bildirdiğin durumu görürsün. Eksik veri varsa uygulama bunu söyler; sonuç uydurmaz.",
  },
];
export function Tour({
  step,
  onStep,
  onClose,
  onComplete,
}: {
  step: number;
  onStep: (s: number) => void;
  onClose: () => void;
  onComplete: () => void;
}) {
  const item = steps[step];
  return (
    <aside className="tour-card" aria-label="Uygulama turu">
      <span className="eyebrow">
        Birlikte tanıyalım · {step + 1}/{steps.length}
      </span>
      <h2>{item.title}</h2>
      <p>{item.text}</p>
      <div className="actions">
        <button className="secondary small" onClick={onClose}>
          Turu kapat
        </button>
        <button
          className="small"
          onClick={() => {
            if (step === steps.length - 1) onComplete();
            else {
              onStep(step + 1);
              location.hash = steps[step + 1].route;
            }
          }}
        >
          {step === steps.length - 1 ? "Turu tamamla" : "Sonraki adım"}
          <ArrowRight size={16} />
        </button>
      </div>
    </aside>
  );
}
export function Guide({
  store,
  onStart,
}: {
  store: SyncStore;
  onStart: () => void;
}) {
  const p = store.view("profile")[0];
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Her şey bir adımla başlar</span>
          <h1>Yol haritam</h1>
          <p>Önce gerekli olanı yap. Ayrıntılar ihtiyacın olduğunda burada.</p>
        </div>
        <GraduationCap className="heading-icon" />
      </div>
      <section className="hero-card">
        <span className="eyebrow">Yaklaşık 2 dakika</span>
        <h2>Birlikte tanıyalım.</h2>
        <p>
          Profilinden ilk antrenmanına ve gelişim takibine kadar, her bölümün ne
          işe yaradığını gör.
        </p>
        <button onClick={onStart}>
          {p?.tutorial_completed ? "Turu tekrar aç" : "Rehberli turu başlat"}
          <ArrowRight size={18} />
        </button>
      </section>
      <div className="roadmap">
        {steps.map((s, i) => (
          <a href={"#" + s.route} className="card roadmap-item" key={s.route}>
            <span className="step-number">{i + 1}</span>
            <div>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
            </div>
            <ArrowRight size={20} />
          </a>
        ))}
      </div>
      <section className="card">
        <h2>Kısa sözlük</h2>
        {[
          ["Set", "Bir hareketi ara vermeden yaptığın tekrar grubu."],
          ["Tekrar", "Hareketin bir kez tamamlanması."],
          [
            "RIR / yedekte tekrar",
            "Set bittiğinde doğru teknikle kaç tekrar daha yapabileceğine dair tahminin. Bilmiyorsan boş bırak.",
          ],
          [
            "RPE / algılanan efor",
            "Çalışmanın sana ne kadar zor geldiği; 0–10 ölçeği.",
          ],
          [
            "Interval / aralıklı çalışma",
            "Çalışma ve dinlenme bölümlerinin dönüşümlü tekrar edilmesi.",
          ],
          [
            "Teknik deneme",
            "Başarısını ve tekniğini izlemek için yapılan bir beceri denemesi. Süre veya tekrar kullanabilirsin.",
          ],
          [
            "Etap",
            "Uzun bir çalışmanın belirli bir bölümü; mesafe veya süreyle takip edilir.",
          ],
          [
            "Periyot / dönem",
            "Bir hedefi izlediğin birkaç haftalık plan. Süresi senin seçimin.",
          ],
        ].map(([title, text]) => (
          <details key={title}>
            <summary>{title}</summary>
            <p>{text}</p>
          </details>
        ))}
      </section>
    </>
  );
}
export function Tools() {
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Gerektiğinde daha fazlası</span>
          <h1>Araçlar</h1>
          <p>Gelişmiş özellikler sade görünümde de erişilebilir.</p>
        </div>
        <Route className="heading-icon" />
      </div>
      <div className="tools-grid">
        {[
          [
            "program",
            "Planım",
            "Dönem oluştur, incele ve ana plana al.",
            Route,
          ],
          ["goals", "Hedeflerim", "Başlangıç, hedef ve ölçümler.", Target],
          [
            "reports",
            "Raporlar",
            "Grafikler, kas haritası ve PDF raporu.",
            ChartNoAxesCombined,
          ],
          [
            "capability",
            "Capability Lab",
            "Beceri ve fiziksel kapasite testleri.",
            FlaskConical,
          ],
          [
            "events",
            "Sürpriz Plan",
            "Sosyal plan ve gerçekleşen ek aktiviteler.",
            CalendarPlus,
          ],
          [
            "backups",
            "Yedekler ve arşiv",
            "Tam yedek, aktarım ve eski kayıtlar.",
            Archive,
          ],
          [
            "science",
            "Bilim ve sınırlar",
            "Kaynaklar ve hesapların dayanağı.",
            BookOpen,
          ],
          [
            "system",
            "Sistem Durumu",
            "Eşitleme, çatışma ve bağlantı.",
            ShieldCheck,
          ],
          [
            "guide",
            "Yol haritam",
            "Rehberli tur ve anlaşılır sözlük.",
            GraduationCap,
          ],
        ].map(([route, title, text, Icon]) => {
          const I = Icon as typeof Route;
          return (
            <a
              href={"#" + route}
              className="card tool-card"
              key={String(route)}
            >
              <I size={25} />
              <h2>{String(title)}</h2>
              <p>{String(text)}</p>
              <ArrowRight size={18} />
            </a>
          );
        })}
      </div>
    </>
  );
}
