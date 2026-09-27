import { useState } from "react";
import { api } from "../api/contracts";
const names = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];
export function MoveDayPreview({
  start,
  weekday,
  onApply,
}: {
  start: string;
  weekday: number;
  onApply: (to: number) => void;
}) {
  const [to, setTo] = useState(weekday),
    [preview, setPreview] = useState<{
      reason: string;
      window: string | null;
      window_date?: string;
      local_date: string;
    } | null>(null),
    [error, setError] = useState("");
  const day = new Date(start + "T12:00:00Z");
  day.setUTCDate(
    day.getUTCDate() + ((to - ((day.getUTCDay() + 6) % 7) + 7) % 7),
  );
  const date = Number.isNaN(day.getTime())
    ? ""
    : day.toISOString().slice(0, 10);
  return (
    <details>
      <summary>Günü taşıma önizlemesi</summary>
      <label>
        Yeni gün
        <select
          aria-label="Yeni gün"
          value={to}
          onChange={(e) => {
            setTo(Number(e.target.value));
            setPreview(null);
          }}
        >
          {names.map((n, i) => (
            <option key={i} value={i}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <p>
        İlk uygulama tarihi: {date}. Bu gün ile hedef gün taslakta yer
        değiştirir; sonraki haftalarda aynı sıra korunur. Gerçek kayıtlar
        taşınmaz ve eksik yük eklenmez.
      </p>
      <button
        type="button"
        className="secondary"
        onClick={() =>
          void api("schedule-window?on=" + date)
            .then((v) => {
              setPreview(v as typeof preview);
              setError("");
            })
            .catch((e) => setError(e.message))
        }
      >
        Uygunluğu kontrol et
      </button>
      {preview && (
        <>
          <p role="status">
            {preview.reason}{" "}
            {preview.window && `${preview.window_date} · ${preview.window}`}
          </p>
          <p>
            Kontrol yalnız ilk uygulama tarihinin kaydedilmiş penceresidir.
            Diğer haftaların vardiyasını ayrıca kontrol et. Gün taşımak
            antrenman saati atamaz.
          </p>
          <button
            type="button"
            onClick={() => {
              onApply(to);
              setPreview(null);
            }}
          >
            Bu gün değişimini taslağa uygula
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
