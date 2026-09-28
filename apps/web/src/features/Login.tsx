import { BrandLogo } from "../BrandLogo";
import { brand } from "../brand";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { api, meSchema, type Me } from "../api/contracts";
export function Login({ onLogin }: { onLogin: (m: Me) => void }) {
  const [mode, setMode] = useState("login"),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
  const [emailReady, setEmailReady] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(true);
  const [support, setSupport] = useState("");
  async function sendCode() {
    const result = (await api("auth/email-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    })) as { challenge_id: string; message: string };
    setChallenge(result.challenge_id);
    setCode("");
    setNotice(result.message);
  }
  useEffect(() => {
    void api("auth/config")
      .then((v) => {
        const config = v as {
          registration_enabled: boolean;
          email_delivery: string;
          email_verification_required: boolean;
          support_email: string;
        };
        setOpen(config.registration_enabled);
        setEmailReady(config.email_delivery === "ready");
        setVerificationRequired(config.email_verification_required !== false);
        setSupport(config.support_email);
      })
      .catch(() => {});
  }, []);
  return (
    <main className="login">
      <section className="login-story">
        <span className="brand">
          <BrandLogo />
          {brand.name}
        </span>
        <div>
          <span className="eyebrow">{brand.tagline}</span>
          <h1>
            İyi bir yaşam.
            <br />
            <em>Adım adım.</em>
          </h1>
          <p>
            Antrenmanın, dinlenmen ve gündelik hayatın aynı yerde. Daha bilinçli
            ilerlemek için sakin bir alan.
          </p>
        </div>
        <small>
          {brand.tagline} · {brand.name}
        </small>
      </section>
      <section className="login-form">
        <span className="eyebrow">
          {mode === "signup" ? "İlk adımını at" : "Yeniden hoş geldin"}
        </span>
        <h2>
          {mode === "login"
            ? "Kaldığın yerden."
            : mode === "signup"
              ? "Sana ait bir alan."
              : "Hesabına yeniden ulaş."}
        </h2>
        <p>
          {mode === "recover"
            ? "Tek kullanımlık kurtarma kodunu kullan. E-posta ile sıfırlama yapılandırılmadı."
            : "Güvenli hesabınla devam et."}
        </p>
        <form
          key={mode}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            setNotice("");
            try {
              if (mode === "signup") {
                if (verificationRequired && !challenge) {
                  await sendCode();
                  return;
                }
                await api("auth/signup", {
                  method: "POST",
                  body: JSON.stringify({
                    username: f.get("username"),
                    name: f.get("name"),
                    ...(verificationRequired ? { email, challenge_id: challenge, code } : {}),
                    password: f.get("password"),
                  }),
                });
              } else if (mode === "recover") {
                await api("auth/recover", {
                  method: "POST",
                  body: JSON.stringify({
                    username: f.get("username"),
                    recovery_code: f.get("recovery_code"),
                    new_password: f.get("password"),
                  }),
                });
                setMode("login");
                setNotice("Şifren yenilendi. Yeni şifrenle giriş yap.");
                return;
              }
              await api("auth/login", {
                method: "POST",
                body: JSON.stringify({
                  username: f.get("username"),
                  password: f.get("password"),
                }),
              });
              onLogin(meSchema.parse(await api("auth/me")));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {mode === "signup" && (
            <label>
              Adın
              <input
                name="name"
                autoComplete="name"
                minLength={1}
                maxLength={100}
                required
              />
            </label>
          )}
          {mode === "signup" && verificationRequired && (
            <>
              <label>
                E-posta adresin
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setChallenge("");
                    setCode("");
                  }}
                />
              </label>
              {!emailReady && (
                <p role="status">
                  E-posta doğrulama bağlantısı hazırlanıyor; yeni kayıt henüz
                  açılamıyor. Mevcut hesabınla giriş yapabilirsin.
                </p>
              )}
              {challenge && (
                <>
                  <label>
                    E-postana gelen 6 haneli kod
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        await sendCode();
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Yeni kod gönder
                  </button>
                </>
              )}
            </>
          )}
          <label>
            Kullanıcı adı
            <input
              name="username"
              autoComplete="username"
              minLength={3}
              maxLength={40}
              required
            />
          </label>
          {mode === "recover" && (
            <label>
              Kurtarma kodu
              <input
                name="recovery_code"
                autoComplete="off"
                required
                minLength={15}
              />
            </label>
          )}
          <label>
            {mode === "recover" ? "Yeni şifre" : "Şifre"}
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={8}
              maxLength={128}
              required
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          <button disabled={busy || (mode === "signup" && verificationRequired && !emailReady)}>
            {busy
              ? "Bağlanıyor…"
              : mode === "signup"
                ? !verificationRequired
                  ? "Hesap oluştur"
                  : challenge
                  ? "Kodu doğrula ve hesap oluştur"
                  : "Doğrulama kodu gönder"
                : mode === "recover"
                  ? "Şifreyi yenile"
                  : "Giriş yap"}
            <ChevronRight size={18} />
          </button>
        </form>
        <div className="actions">
          {mode !== "login" && (
            <button className="text-button" onClick={() => setMode("login")}>
              Girişe dön
            </button>
          )}
          {mode === "login" && (
            <>
              <button
                className="text-button"
                onClick={() => setMode("recover")}
              >
                Şifremi unuttum
              </button>
              {open && (
                <button
                  className="text-button"
                  onClick={() => setMode("signup")}
                >
                  Hesap oluştur
                </button>
              )}
            </>
          )}
        </div>
        {support && (
          <p>
            <a href={"mailto:" + support}>Yöneticiyle iletişim</a>
          </p>
        )}
        <small>
          Çevrimdışı yeni giriş yapılamaz. Bekleyen kayıtlar aynı hesapla tekrar
          giriş yaptığında korunur.
        </small>
      </section>
    </main>
  );
}
