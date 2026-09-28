import { chatHistory } from "./chatHistory";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { api } from "../api/contracts";

type Message = { role: "user" | "assistant"; text: string; image?: string };
type Configuration = {
  available: boolean;
  vision: boolean;
  model: string;
  consent_version: string;
};
export function AIChat({ csrf }: { csrf: string }) {
  const [config, setConfig] = useState<Configuration | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void api("ai-chat-status")
      .then((v) => setConfig(v as Configuration))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);
  async function attach(file: File) {
    setError("");
    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 2000000
      )
        throw Error("En fazla 2 MB JPEG, PNG veya WebP görsel seç.");
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(Error("Görsel okunamadı."));
        reader.readAsDataURL(file);
      });
      setImage(content);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function send() {
    if (busy || !consent || !text.trim() || !config?.available) return;
    setBusy(true);
    setError("");
    const message: Message = { role: "user", text: text.trim(), image };
    try {
      const history = chatHistory(messages, message.text);
      const result = (await api("ai-chat", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf },
        body: JSON.stringify({
          messages: history,
          image,
          consent: config.consent_version,
        }),
      })) as { text: string };
      setMessages([
        ...messages,
        message,
        { role: "assistant", text: result.text },
      ]);
      setText("");
      setImage(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card ai-chat">
      <div className="section-heading">
        <div>
          <h1>
            <MessageCircle size={25} /> AI ile sohbet et
          </h1>
          <p>Spor, antrenman ve teknik hakkında EVREN’e sor.</p>
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => {
            setMessages([]);
            setImage(undefined);
            setText("");
            setError("");
          }}
        >
          <Trash2 size={16} />
          Yeni sohbet
        </button>
      </div>
      <p className="caption">
        Bu sohbet uygulama kayıtlarını okumaz veya planını değiştirmez. Konuşma
        bu sayfada tutulur; sayfadan çıkınca silinir. Önceki görseller sonraki
        mesajlarda tekrar gönderilmez; son mesajlar ve yanıtlar sohbet bağlamını
        sağlar.
      </p>
      {config && !config.available && (
        <p role="status">EVREN sohbet bağlantısı henüz hazır değil.</p>
      )}
      <div
        className="chat-log"
        role="log"
        aria-label="Sohbet mesajları"
        aria-live="polite"
      >
        {!messages.length && (
          <p>Örneğin: “Barfiks tekniğimde nelere dikkat etmeliyim?”</p>
        )}
        {messages.map((m, i) => (
          <article className={"chat-message " + m.role} key={i}>
            <strong>{m.role === "user" ? "Sen" : "EVREN"}</strong>
            {m.image && <img src={m.image} alt="Sohbete eklediğin görsel" />}
            <p>{m.text}</p>
          </article>
        ))}
        {busy && <p role="status">EVREN yanıt hazırlıyor…</p>}
        <div ref={bottom} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label>
          Mesajın
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={5000}
            rows={4}
            required
            disabled={busy}
          />
        </label>
        <label>
          Görsel ekle (isteğe bağlı)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || !config?.vision}
            onChange={(e) => {
              if (e.target.files?.[0]) void attach(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </label>
        {config && !config.vision && (
          <p>Bu modelde görsel desteği yapılandırılmadı.</p>
        )}
        {image && (
          <div className="chat-attachment">
            <img src={image} alt="Gönderilecek görsel" />
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => setImage(undefined)}
            >
              Görseli kaldır
            </button>
          </div>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            disabled={busy}
          />
          Mesajlarımın ve seçtiğim görselin EVREN’e gönderilmesini kabul
          ediyorum.
        </label>
        <p className="caption">
          Görsel sunucuda küçültülür ve konum bilgileri çıkarılır. Fotoğraftan
          kas hasarı veya kesin gelişim yüzdesi ölçülmez.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button
          disabled={busy || !config?.available || !consent || !text.trim()}
        >
          <Send size={17} />
          {busy ? "Yanıt bekleniyor…" : "Gönder"}
        </button>
      </form>
    </section>
  );
}
