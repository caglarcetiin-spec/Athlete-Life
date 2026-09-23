import { useState } from "react";
import { HeartPulse } from "lucide-react";
import type { SyncStore } from "../sync/store";
import {
  RecordList,
  DayToolbar,
  day,
  decimalField,
  choice,
  textField,
  note,
  shown,
  type Field,
} from "./Records";
import { addDays } from "../time";
const scale = (key: string, label: string): Field => ({
  key,
  label: label + " (0–10)",
  type: "integer",
});
const sides: [string, string][] = [
  ["unknown", "Belirtilmedi"],
  ["left", "Sol"],
  ["right", "Sağ"],
  ["both", "Her iki taraf"],
];
export function Health({
  store,
  selected,
  onDate,
}: {
  store: SyncStore;
  selected: string;
  onDate: (s: string) => void;
}) {
  const [tab, setTab] = useState("daily");
  const profile = store.view("profile")[0];
  const rows = (kind: string) =>
    store.view(kind).filter((r) => r.local_date === selected);
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Önce iyi hissetmek</span>
          <h1>Sağlık</h1>
          <p>
            Uyku, günlük durum ve sağlık geçmişin. Bu alan kayıt ve eğilim
            takibi içindir.
          </p>
        </div>
        <HeartPulse className="heading-icon" />
      </div>
      <div className="tabs">
        {[
          ["daily", "Günlük durum"],
          ["recovery", "Rahatsızlık ve dönüş"],
          ["labs", "Kan tahlilleri"],
          ["measure", "Vücut ölçümleri"],
          ...(profile?.cycle_tracking ? [["cycle", "Döngü takibi"]] : []),
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "" : "secondary"}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <DayToolbar selected={selected} onDate={onDate} />
      {tab === "daily" && (
        <>
          <RecordList
            store={store}
            kind="checkin"
            title="Nasıl hissediyorum?"
            fields={[
              day(selected),
              scale("energy", "Enerji"),
              scale("fatigue", "Yorgunluk"),
              scale("stress", "Stres"),
              scale("sleep_quality", "Uyku kalitesi"),
              note,
            ]}
            rows={rows("checkin")}
            describe={(r) => (
              <>
                <strong>Enerji {shown(r.energy, "/ 10")}</strong>
                <p>
                  Yorgunluk {shown(r.fatigue)} · Stres {shown(r.stress)} ·{" "}
                  {String(r.note || "")}
                </p>
              </>
            )}
          >
            <p>
              Sayı yükseldikçe başlıktaki durum artar. Enerjide 10 çok iyi,
              yorgunlukta 10 çok yorgun anlamına gelir.
            </p>
          </RecordList>
          <RecordList
            store={store}
            kind="sleep"
            title="Uyku geceleri"
            fields={[
              {
                key: "start_date",
                label: "Uykuya başlama tarihi",
                type: "date",
                required: true,
                value: addDays(selected, -1),
              },
              {
                key: "start_time",
                label: "Uykuya başlama saati",
                type: "time",
                required: true,
                value: "23:00",
              },
              {
                key: "end_date",
                label: "Uyanma tarihi",
                type: "date",
                required: true,
                value: selected,
              },
              {
                key: "end_time",
                label: "Uyanma saati",
                type: "time",
                required: true,
                value: "07:00",
              },
              scale("quality", "Uyku kalitesi"),
              note,
            ]}
            getInitial={(r) => {
              const parts = (key: string) => {
                const d = new Date(String(r[key]));
                return Object.fromEntries(
                  new Intl.DateTimeFormat("sv-SE", {
                    timeZone: String(r.timezone),
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23",
                  })
                    .formatToParts(d)
                    .map((x) => [x.type, x.value]),
                );
              };
              const a = parts("start_at"),
                b = parts("end_at");
              return {
                ...r,
                start_date: `${a.year}-${a.month}-${a.day}`,
                start_time: `${a.hour}:${a.minute}`,
                end_date: `${b.year}-${b.month}-${b.day}`,
                end_time: `${b.hour}:${b.minute}`,
              };
            }}
            describe={(r) => (
              <>
                <strong>
                  {new Date(String(r.end_at)).toLocaleDateString("tr-TR")} ·{" "}
                  {shown(
                    (Date.parse(String(r.end_at)) -
                      Date.parse(String(r.start_at))) /
                      3600000,
                    "saat",
                  )}
                </strong>
                <p>Kalite {shown(r.quality, "/ 10")}</p>
              </>
            )}
          />
          <RecordList
            store={store}
            kind="pain"
            title="Ağrı günlüğü"
            rows={rows("pain")}
            fields={[
              day(selected),
              textField("area", "Bölge"),
              choice("side", "Taraf", sides, "unknown"),
              {
                key: "intensity",
                label: "Ağrı şiddeti (0–10)",
                type: "integer",
                required: true,
              },
              note,
            ]}
            describe={(r) => (
              <>
                <strong>
                  {String(r.area)} · {shown(r.intensity, "/ 10")}
                </strong>
                <p>
                  {sides.find((s) => s[0] === r.side)?.[1]} ·{" "}
                  {String(r.note || "")}
                </p>
              </>
            )}
          />
        </>
      )}
      {tab === "recovery" && (
        <RecordList
          store={store}
          kind="episode"
          title="Rahatsızlık geçmişim"
          fields={[
            choice(
              "kind",
              "Durum",
              [
                ["illness", "Hastalık"],
                ["injury", "Sakatlık"],
                ["fatigue", "Halsizlik"],
                ["other", "Diğer"],
              ],
              "illness",
            ),
            {
              key: "start_date",
              label: "Başlangıç tarihi",
              type: "date",
              required: true,
              value: selected,
            },
            { key: "resolved_date", label: "İyileştiğim tarih", type: "date" },
            {
              key: "return_until",
              label: "Kademeli dönüşü izlediğim son gün",
              type: "date",
            },
            choice(
              "severity",
              "Şiddet",
              [
                ["unspecified", "Belirtilmedi"],
                ["mild", "Hafif"],
                ["moderate", "Orta"],
                ["severe", "Şiddetli"],
              ],
              "unspecified",
            ),
            note,
          ]}
          describe={(r) => (
            <>
              <strong>
                {String(r.start_date)} →{" "}
                {String(r.resolved_date || "Devam ediyor")}
              </strong>
              <p>
                {String(r.note || "")}{" "}
                {r.return_until
                  ? "· Dönüş takibi: " + String(r.return_until)
                  : ""}
              </p>
            </>
          )}
        >
          <p>
            Bu bilgi antrenman karar desteğinde dikkate alınır. İyileşme tarihi
            antrenmana tıbbi onay yerine geçmez.
          </p>
        </RecordList>
      )}
      {tab === "labs" && (
        <RecordList
          store={store}
          kind="lab"
          title="Tahlil sonuçlarım"
          fields={[
            day(selected),
            textField("analyte", "Test / parametre adı"),
            choice(
              "comparator",
              "Sonuç işareti",
              [
                ["=", "Eşit (=)"],
                ["<", "Küçüktür (<)"],
                [">", "Büyüktür (>)"],
                ["≤", "Küçük veya eşit (≤)"],
                ["≥", "Büyük veya eşit (≥)"],
              ],
              "=",
            ),
            decimalField("value", "Sonuç", true),
            textField("unit", "Rapordaki birim"),
            decimalField("reference_low", "Rapordaki alt sınır"),
            decimalField("reference_high", "Rapordaki üst sınır"),
            textField("laboratory", "Laboratuvar", false),
            textField("method", "Ölçüm yöntemi", false),
            note,
          ]}
          describe={(r) => {
            const low =
                r.reference_low != null &&
                Number(r.value) < Number(r.reference_low),
              high =
                r.reference_high != null &&
                Number(r.value) > Number(r.reference_high);
            return (
              <>
                <strong>
                  {String(r.analyte)} · {String(r.comparator || "=")}{" "}
                  {shown(r.value, String(r.unit))}
                </strong>
                <p>
                  {String(r.local_date)} ·{" "}
                  {r.comparator && r.comparator !== "="
                    ? "Sınırlı ölçüm; kesin bir değere çevrilmedi"
                    : r.reference_low == null && r.reference_high == null
                      ? "Referans aralığı bilinmiyor"
                      : low
                        ? "Raporun alt sınırının altında"
                        : high
                          ? "Raporun üst sınırının üzerinde"
                          : "Girilen referans sınırları içinde"}
                </p>
                <small>
                  {String(r.laboratory)} · {String(r.method)}
                </small>
              </>
            );
          }}
        >
          <p>
            Referans aralıklarını kendi laboratuvar raporundan gir. Birim ve
            yöntemler farklı olabilir; uygulama tanı koymaz ve ilaç/takviye dozu
            önermez.
          </p>
        </RecordList>
      )}
      {tab === "measure" && (
        <RecordList
          store={store}
          kind="measurement"
          title="Vücut ölçümleri"
          fields={[
            day(selected),
            choice(
              "metric",
              "Ölçüm",
              [
                ["weight", "Kilo"],
                ["waist", "Bel çevresi"],
                ["height", "Boy"],
                ["bodyfat", "Yağ oranı"],
              ],
              "weight",
            ),
            decimalField("value", "Değer", true),
            choice(
              "unit",
              "Birim",
              [
                ["kg", "kg"],
                ["cm", "cm"],
                ["percent", "%"],
              ],
              "kg",
            ),
            textField("protocol", "Ölçüm yöntemi", true, "self-reported"),
          ]}
          describe={(r) => (
            <>
              <strong>
                {String(r.metric)} · {shown(r.value, String(r.unit))}
              </strong>
              <p>
                {String(r.local_date)} · {String(r.protocol)}
              </p>
            </>
          )}
        />
      )}
      {tab === "cycle" && profile?.cycle_tracking === true && (
        <RecordList
          store={store}
          kind="cycle"
          title="Döngü günlüğüm"
          fields={[
            day(selected),
            choice(
              "bleeding",
              "Kanama",
              [
                ["unknown", "Belirtilmedi"],
                ["none", "Yok"],
                ["light", "Hafif"],
                ["moderate", "Orta"],
                ["heavy", "Yoğun"],
              ],
              "unknown",
            ),
            scale("symptoms", "Belirti şiddeti"),
            {
              key: "cycle_day",
              label: "Döngü günü (biliyorsan)",
              type: "integer",
            },
            note,
          ]}
          describe={(r) => (
            <>
              <strong>{String(r.local_date)}</strong>
              <p>
                Belirtiler {shown(r.symptoms, "/ 10")} · {String(r.note || "")}
              </p>
            </>
          )}
        >
          <p>
            Döngü fazından otomatik kas gelişimi yüzdesi çıkarılmaz. Kendi
            belirtilerini ve eğilimlerini takip edebilirsin.
          </p>
        </RecordList>
      )}
    </>
  );
}
