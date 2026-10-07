import { useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { api, ApiError } from "../api/contracts";
import type { SyncStore } from "../sync/store";

type Item = {
  kind: string;
  label: string;
  quote: string;
  warning: string;
  blocked: string;
};
type Review = {
  date: string;
  token: string;
  items: Item[];
  questions: string[];
  unrecorded: string[];
  portion_options?: { id: string; label: string; basis: string }[];
};
type Write = {
  operation_id: string;
  entity_id: string;
  expected_version: number;
  schema_version: 1;
  command_type: string;
  payload: { token: string; selected: number[] };
};
function MealPortion({ options, disabled, apply }: {
  options: NonNullable<Review["portion_options"]>; disabled: boolean;
  apply: (reference: string, size: string, count: number, oil: string) => void;
}) {
  const [reference, setReference] = useState("");
  const [size, setSize] = useState("unknown");
  const [count, setCount] = useState(1);
  const [oil, setOil] = useState("unknown");
  return <details><summary>Gram bilmeden yaklaşık hesapla</summary>
    <p>Bu satırdaki yiyeceğe uygun karşılığı seç. Birden fazla farklı yemek aynı satırdaysa önce mesajında ayrı yaz. Uygun karşılık yoksa tahmin uygulama.</p>
    <label>Yiyecek karşılığı<select aria-label="Yiyecek karşılığı" disabled={disabled} value={reference} onChange={e => setReference(e.target.value)}>
      <option value="">Seç…</option>{options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select></label>
    <p>{options.find(o => o.id === reference)?.basis}</p>
    <label>Porsiyon büyüklüğü<select aria-label="Porsiyon büyüklüğü" disabled={disabled} value={size} onChange={e => setSize(e.target.value)}>
      <option value="small">Küçük</option><option value="medium">Orta</option><option value="large">Büyük</option><option value="unknown">Bilmiyorum — orta varsay</option>
    </select></label>
    <label>Porsiyon adedi<select aria-label="Porsiyon adedi" disabled={disabled} value={count} onChange={e => setCount(Number(e.target.value))}>
      {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
    </select></label>
    <label>Referansa ek yağ<select aria-label="Referansa ek yağ" disabled={disabled} value={oil} onChange={e => setOil(e.target.value)}>
      <option value="unknown">Bilmiyorum — ek yağ hesaba katılmasın</option><option value="none">Ek yağ yok</option><option value="teaspoon">Yaklaşık 1 çay kaşığı (5 g)</option><option value="tablespoon">Yaklaşık 1 yemek kaşığı (15 g)</option>
    </select></label>
    <p>Süt, meyve, sos gibi eklemeleri mesajında ayrı belirt. Burger referansı kendi mayonezini içerir.</p>
    <button className="secondary small" disabled={disabled || !reference} onClick={() => apply(reference,size,count,oil)}>Tahmini özette göster</button>
    <button className="secondary small" disabled={disabled} onClick={() => apply(reference,"none",1,"none")}>Tahmini kaldır</button>
  </details>;
}

export function DailyNarrative({
  store,
  selected,
}: {
  store: SyncStore;
  selected: string;
}) {
  const key = "daily-narrative:" + selected;
  const [messages, setMessages] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [chosen, setChosen] = useState<number[]>([]);
  const [pending, setPending] = useState<Write | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let live = true;
    void store
      .loadDraft(key)
      .then((d) => {
        if (live) {
          setMessages(d?.messages || []);
          setText(d?.text || "");
          setReview(d?.review || null);
          setPending(d?.pending || null);
          setChosen(d?.chosen || []);
          setNotice(d?.notice || "");
          setReady(true);
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      live = false;
    };
  }, [store, key]);
  useEffect(() => {
    if (ready)
      void store
        .saveDraft(key, { messages, text, review, pending, chosen, notice })
        .catch((e) => setError(e.message));
  }, [store, key, ready, messages, text, review, pending, chosen, notice]);
  async function portion(index: number, reference: string, size: string, count: number, oil: string) {
    if (!review || busy || pending) return;
    setBusy(true); setError(""); setChosen([]);
    try {
      const result = await api("daily-log-portion", { method: "POST", headers: { "X-CSRF-Token": store.me.csrf },
        body: JSON.stringify({ token: review.token, index, reference, size, count, oil }) }) as Review;
      await store.saveDraft(key, { messages, text, review: result, pending: null, chosen: [], notice });
      setReview(result);
    } catch(e) { setError(e instanceof Error ? e.message : "Porsiyon hazırlanamadı."); }
    finally { setBusy(false); }
  }
  async function analyze() {
    if (busy || pending || !consent) return;
    const next = text.trim() ? [...messages, text.trim()] : messages;
    if (!next.length) return;
    setBusy(true);
    setError("");
    setNotice("");
    setReview(null);
    setChosen([]);
    try {
      // Persist before sending; a timeout never discards the user's description.
      await store.saveDraft(key, {
        messages: next,
        text: "",
        review: null,
        pending: null,
        chosen: [],
      });
      setMessages(next);
      setText("");
      const result = (await api("daily-log-preview", {
        method: "POST",
        headers: { "X-CSRF-Token": store.me.csrf },
        body: JSON.stringify({
          local_date: selected,
          messages: next,
          consent: "evren-daily-log-v1",
        }),
      })) as Review;
      setReview(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (busy || (!pending && (!review || !chosen.length))) return;
    setBusy(true);
    setError("");
    const command: Write = pending || {
      operation_id: crypto.randomUUID(),
      entity_id: crypto.randomUUID(),
      expected_version: 0,
      schema_version: 1,
      command_type: "daily_log.save",
      payload: { token: review!.token, selected: chosen },
    };
    try {
      await store.saveDraft(key, {
        messages,
        text,
        review,
        chosen,
        pending: command,
      });
      setPending(command);
      await api("commands", {
        method: "POST",
        headers: { "X-CSRF-Token": store.me.csrf },
        body: JSON.stringify(command),
      });
      const message =
        "Seçtiğin bilgiler sunucuya kaydedildi. Seçmediklerin ve eksikler bu taslakta korunuyor. Ayrıntıları ilgili bölümlerden düzenleyebilirsin.";
      await store.saveDraft(key, {
        messages,
        text,
        review: null,
        chosen: [],
        pending: null,
        notice: message,
      });
      setPending(null);
      setReview(null);
      setChosen([]);
      setNotice(message);
      void store.sync();
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      // Definitive domain rejection permits a fresh preview; transport failures retain the operation id.
      if (
        e instanceof ApiError &&
        [400, 401, 403, 404, 409, 413, 422].includes(e.status)
      ) {
        setPending(null);
        setReview(null);
        setChosen([]);
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="card daily-narrative">
      <summary>
        <MessageCircle size={20} aria-hidden="true" /> Günümü anlat · Hızlı
        kayıt
      </summary>
      <p>
        Uyku, su, öğün, iş ve antrenmanını tek mesajda anlat. EVREN eksikleri
        sorar; yalnız seçip onayladıkların kaydedilir. Kayıt tarihi:{" "}
        <strong>{selected}</strong>.
      </p>
      <p className="caption">
        Bilinmeyen miktarlar ve kalori tahmin edilmez. Desteklenmeyen bilgiler
        mesajında kalır. Önceden kaydettiğin aynı olayı yeniden seçme.
      </p>
      {!ready && <p>Günlük taslağın açılıyor…</p>}
      {ready && messages.length > 0 && !pending && (
        <button
          className="secondary small"
          disabled={busy}
          onClick={() => {
            if (
              !window.confirm(
                "Yeni bir mesaj dizisi başlatılsın mı? Bu ekrandaki taslak temizlenir; sunucuya kaydettiğin kayıtlar korunur. Kaydetmediğin ayrıntıları önce tamamlayabilirsin.",
              )
            )
              return;
            setMessages([]);
            setText("");
            setReview(null);
            setChosen([]);
            setError("");
            setNotice("");
            setConsent(false);
          }}
        >
          Yeni kayıt başlat
        </button>
      )}
      {messages.map((m, i) => (
        <blockquote key={i} style={{ whiteSpace: "pre-wrap" }}>
          {m}
        </blockquote>
      ))}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {review && (
        <section aria-label="Hızlı kayıt özeti">
          <h3>Hızlı kayıt özeti</h3>
          <p>
            Her satırı kontrol et ve kaydetmek istediklerini seç. Uyarılı
            kayıtları yalnız ayrı bir olay olduğundan eminsen seç.
          </p>
          {review.items.map((item, i) => (
            <article className="card" key={i}>
              <label>
                <input
                  type="checkbox"
                  disabled={!!item.blocked || busy || !!pending}
                  checked={chosen.includes(i)}
                  onChange={(e) =>
                    setChosen(
                      e.target.checked
                        ? [...chosen, i]
                        : chosen.filter((n) => n !== i),
                    )
                  }
                />
                {item.label}
              </label>
              <p className="caption">Mesajındaki dayanak: “{item.quote}”</p>
              {item.warning && <p>{item.warning}</p>}
              {item.kind === "meal" && !item.blocked && review.portion_options && <MealPortion
                options={review.portion_options} disabled={busy || !!pending}
                apply={(reference,size,count,oil) => void portion(i,reference,size,count,oil)} /> }
              {item.blocked && (
                <p>
                  <strong>Tamamlanmalı:</strong> {item.blocked}
                </p>
              )}
            </article>
          ))}
          {[...review.questions, ...review.unrecorded].length > 0 && (
            <>
              <h4>Tamamlanacak bilgiler</h4>
              <ul>
                {[...review.questions, ...review.unrecorded].map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
              <p>
                Aşağıdan cevap verebilir veya hazır satırları kaydedip eksikleri
                daha sonra tamamlayabilirsin.
              </p>
            </>
          )}
          {review.items.some(
            (item) => item.kind === "hydration" && item.blocked,
          ) && (
            <div className="actions" aria-label="Su için hızlı yanıtlar">
              <button
                className="secondary small"
                disabled={busy || !!pending}
                onClick={() =>
                  setText("Belirttiğim su miktarı seçili günün toplamı.")
                }
              >
                Günün toplamı
              </button>
              <button
                className="secondary small"
                disabled={busy || !!pending}
                onClick={() =>
                  setText(
                    "Belirttiğim su miktarı önceki kayıtlarıma ek içtiğim miktar.",
                  )
                }
              >
                Önceki kayda ek
              </button>
            </div>
          )}
          {!review.items.length && (
            <p>Henüz kayda hazır bilgi bulunamadı. Ayrıntıları aşağıya yaz.</p>
          )}
        </section>
      )}
      {(review || pending) && (
        <button
          disabled={busy || (!pending && !chosen.length)}
          onClick={() => void save()}
        >
          {busy
            ? "İşleniyor…"
            : pending
              ? "Kaydı doğrula / yeniden dene"
              : "Seçtiklerimi onayla ve kaydet"}
        </button>
      )}
      {pending && (
        <p>
          Gönderilen işlemin sonucu doğrulanmalı. Yeniden denemek aynı kayıtları
          çoğaltmaz.
        </p>
      )}
      <label>
        Gününü anlat veya eksik bilgileri tamamla
        <textarea
          aria-label="Gününü anlat veya eksik bilgileri tamamla"
          rows={5}
          maxLength={6000}
          disabled={busy || !!pending || !ready}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Bugün 02.00–07.00 uyudum. 10.00'da işe başladım, 8 saat çalıştım. Gün toplamı 2,5 litre su içtim. 30 dakika kalistenik çalıştım…"
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy || !!pending}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Bu günlük mesajlarının uyku, beslenme ve antrenman bilgileriyle birlikte
        EVREN’e gönderilmesini kabul ediyorum. Mevcut hesap kayıtlarım
        gönderilmez.
      </label>
      <button
        disabled={
          !ready ||
          busy ||
          !!pending ||
          !consent ||
          (!text.trim() && !messages.length)
        }
        onClick={() => void analyze()}
      >
        <Send size={16} />
        {busy
          ? "İşleniyor…"
          : text.trim()
            ? "Mesajı gönder ve özeti hazırla"
            : "Güncel kayıtlarla yeniden analiz et"}
      </button>
      <p className="caption">
        Bu işlem ölçüm veya tıbbi rapor üretmez; anlattıklarını kayda
        dönüştürür. İnternet bağlantısı gerekir. Kaydın tamamlandığı ayrıca
        gösterilir.
      </p>
    </details>
  );
}
