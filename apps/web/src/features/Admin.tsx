import { useEffect, useState } from "react";
import { ShieldCheck, LogOut, Users, RefreshCw } from "lucide-react";
import { api, type Me } from "../api/contracts";
type Account = {
  id: string;
  username: string;
  name: string;
  email: string | null;
  created_at: string;
  is_admin: boolean;
};
type Detail = { account: Account; records: Record<string, unknown> };
const names: Record<string, string> = {
  optimizations: "Haftalık plan önerileri",
  imports: "Veri aktarımları",
  prescriptions: "Günlük antrenman reçeteleri",
  slots: "Planlanan setler",
  analysiss: "Analizler",
  archives: "Arşivler",
  foods: "Besin kütüphanesi",
  recipes: "Tarifler",
  nutrition_days: "Günlük beslenme",
  pains: "Ağrı kayıtları",
  measurements: "Vücut ölçümleri",
  capabilitys: "Beceri ölçümleri",
  goal_measurements: "Hedef ölçümleri",
  events: "Etkinlikler",
  episodes: "Sağlık dönemleri",
  cycles: "Döngü kayıtları",
  profiles: "Spor profili",
  programs: "Antrenman planları",
  program_days: "Plan günleri",
  program_exercises: "Plan hareketleri",
  sessions: "Seanslar",
  sets: "Gerçek hareket kayıtları",
  medias: "Fotoğraflar ve modeller",
  labs: "Kan değerleri",
  hydrations: "Su kayıtları",
  meals: "Beslenme",
  sleeps: "Uyku",
  shifts: "Vardiyalar",
  goals: "Hedefler",
};
export function Admin({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const [users, setUsers] = useState<Account[]>([]),
    [page, setPage] = useState(0),
    [more, setMore] = useState(false),
    [detail, setDetail] = useState<Detail | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [audit, setAudit] = useState<{ event: string; created_at: string }[]>([]);
  async function load(p = page) {
    setError("");
    try {
      const r = (await api("admin/users?page=" + p)) as {
        users: Account[];
        has_more: boolean;
      };
      setUsers(r.users);
      setMore(r.has_more);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load(page);
  }, [page]); // Administrator API always rechecks the server-side role.
  async function select(user: Account) {
    setBusy(true);
    setError("");
    setDetail(null);
    try {
      setDetail((await api("admin/users/" + user.id)) as Detail);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function act(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || busy) return;
    const form = event.currentTarget,
      f = new FormData(form),
      operation = String(f.get("operation"));
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`admin/users/${detail.account.id}/${operation}`, {
        method: "POST",
        headers: { "X-CSRF-Token": me.csrf },
        body: JSON.stringify({
          password: f.get("password"),
          confirm_username: f.get("confirm_username"),
        }),
      });
      form.reset();
      setNotice(
        operation === "delete"
          ? "Kullanıcı ve aktif kayıtları kalıcı silindi."
          : "Kullanıcının tüm oturumları kapatıldı.",
      );
      setDetail(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="eyebrow">Athlete Life · Yönetim</span>
          <h1>
            <ShieldCheck /> Yönetici paneli
          </h1>
          <p>@{me.username}</p>
        </div>
        <button
          className="secondary"
          onClick={async () => {
            try {
              await api("auth/logout", {
                method: "POST",
                headers: { "X-CSRF-Token": me.csrf },
              });
              onLogout();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <LogOut size={18} />
          Çıkış
        </button>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <p>
        Kullanıcı şifreleri ve oturum anahtarları görüntülenmez. Hassas
        kayıtları görüntüleme ve yönetici işlemleri denetim kaydına alınır.
      </p>
      <div className="admin-grid">
        <section className="card">
          <div className="section-heading compact">
            <h2>
              <Users size={22} />
              Kullanıcılar
            </h2>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void load()}
              aria-label="Kullanıcıları yenile"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <ul className="admin-users">
            {users.map((u) => (
              <li key={u.id}>
                <button
                  className="secondary"
                  disabled={busy}
                  aria-pressed={detail?.account.id === u.id}
                  onClick={() => void select(u)}
                >
                  <strong>
                    {u.name} · @{u.username}
                  </strong>
                  <span>{u.email || "E-posta eklenmemiş"}</span>
                  <small>
                    {u.is_admin ? "Yönetici" : "Kullanıcı"} ·{" "}
                    {new Date(u.created_at).toLocaleDateString("tr-TR")}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          <div className="actions">
            <button
              className="secondary"
              disabled={page === 0 || busy}
              onClick={() => setPage(page - 1)}
            >
              Önceki
            </button>
            <span>Sayfa {page + 1}</span>
            <button
              className="secondary"
              disabled={!more || busy}
              onClick={() => setPage(page + 1)}
            >
              Sonraki
            </button>
          </div>
        </section>
        <section className="card">
          {detail ? (
            <>
              <h2>{detail.account.name}</h2>
              <p>
                @{detail.account.username} ·{" "}
                {detail.account.email || "E-posta yok"}
              </p>
              <h3>Kullanıcı kayıtları</h3>
              <p className="caption">
                Yalnız kayıt içeren başlıklar gösterilir. Kapalı başlıkları
                açarak ayrıntıları inceleyebilirsin.
              </p>
              {Object.entries(detail.records)
                .filter(([, v]) => Array.isArray(v) && v.length > 0)
                .map(([key, rows]) => (
                  <details key={key}>
                    <summary>
                      {names[key] || key} · {(rows as unknown[]).length} kayıt
                    </summary>
                    {key === "medias" &&
                      (
                        rows as { id: string; mime: string; name: string }[]
                      ).map((m) => (
                        <div key={m.id}>
                          {m.mime === "image/jpeg" ? (
                            <img
                              className="admin-photo"
                              loading="lazy"
                              src={`/api/v2/admin/users/${detail.account.id}/media/${m.id}`}
                              alt={m.name}
                            />
                          ) : (
                            <a
                              href={`/api/v2/admin/users/${detail.account.id}/media/${m.id}`}
                            >
                              {m.name} dosyasını indir
                            </a>
                          )}
                        </div>
                      ))}
                    <pre className="admin-records">
                      {JSON.stringify(rows, null, 2)}
                    </pre>
                  </details>
                ))}
              {!detail.account.is_admin && (
                <details className="account-danger">
                  <summary>Hesabı yönet</summary>
                  <p>
                    Kalıcı silme profil, antrenman, sağlık ve medya kayıtlarını
                    aktif veritabanından kaldırır. İndirilmiş veya sağlayıcı
                    yedekleri ayrıca saklanabilir.
                  </p>
                  <form key={detail.account.id} onSubmit={(e) => void act(e)}>
                    <label>
                      İşlem
                      <select name="operation" aria-label="İşlem">
                        <option value="revoke">Tüm oturumları kapat</option>
                        <option value="delete">Hesabı kalıcı sil</option>
                      </select>
                    </label>
                    <label>
                      Hedef kullanıcı adını yaz
                      <input
                        name="confirm_username"
                        autoComplete="off"
                        required
                        placeholder={detail.account.username}
                      />
                    </label>
                    <label>
                      Yönetici şifren
                      <input
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        required
                      />
                    </label>
                    <label className="check">
                      <input type="checkbox" required />
                      Seçtiğim işlemi bu kullanıcı için onaylıyorum.
                    </label>
                    <button disabled={busy}>
                      {busy ? "İşleniyor…" : "İşlemi uygula"}
                    </button>
                  </form>
                </details>
              )}
            </>
          ) : (
            <p>
              {busy
                ? "Kullanıcı bilgileri yükleniyor…"
                : "Ayrıntılarını görmek için soldan bir kullanıcı seç."}
            </p>
          )}
        </section>
      </div>
      <section className="card">
        <h2>Yönetici işlem geçmişi</h2>
        <button
          className="secondary"
          onClick={async () => {
            try {
              const r = (await api("admin/audit")) as { events: typeof audit };
              setAudit(r.events);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Son işlemleri göster
        </button>
        <ul>
          {audit.map((item, i) => (
            <li key={i}>
              {new Date(item.created_at).toLocaleString("tr-TR")} · {item.event}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
