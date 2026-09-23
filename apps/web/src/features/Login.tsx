import { useEffect, useState } from "react";
import { Activity, ChevronRight } from "lucide-react";
import { api, meSchema, type Me } from "../api/contracts";
export function Login({ onLogin }: { onLogin: (m: Me) => void }) {
  const [mode, setMode] = useState("login"),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void api("auth/config")
      .then((v) =>
        setOpen(
          Boolean(
            (v as { registration_enabled: boolean }).registration_enabled,
          ),
        ),
      )
      .catch(() => {});
  }, []);
  return (
    <main className="login">
      <section className="login-story">
        <span className="brand">
          <Activity />
          ATHLETE LIFE
        </span>
        <div>
          <span className="eyebrow">Kendi ritminde, her gün.</span>
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
        <small>Yaşam ritmin · Athlete Life 2.0</small>
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
                await api("auth/signup", {
                  method: "POST",
                  body: JSON.stringify({
                    username: f.get("username"),
                    name: f.get("name"),
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
          <button disabled={busy}>
            {busy
              ? "Bağlanıyor…"
              : mode === "signup"
                ? "Hesap oluştur"
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
        <small>
          Çevrimdışı yeni giriş yapılamaz. Bekleyen kayıtlar aynı hesapla tekrar
          giriş yaptığında korunur.
        </small>
      </section>
    </main>
  );
}
