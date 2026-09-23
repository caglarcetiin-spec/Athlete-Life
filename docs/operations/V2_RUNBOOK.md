# Athlete Life V2 — çalıştırma, yayın ve geri dönüş

## Bütçe sınırı (23 Eylül 2026)

Kullanıcı mevcut **MongoDB + ücretsiz Render** altyapısını korumayı seçti (ADR-0005). Yeni PostgreSQL/ücretli kaynak oluşturulmaz. `infra/v2/render.yaml` mevcut Python/free servisin hedef ayarlarını belgeler; ikinci servis oluşturmak için uygulanmaz. Canlı ayarlar henüz değiştirilmedi.

## Ayrı ürün sınırı

V2 MongoDB backend'i `ALOS_V2_DATABASE_URL` ve açık `ALOS_V2_MONGO_DATABASE` ile seçilir. V2 yalnız `alos_v2_*` koleksiyonlarına yazar; v10 koleksiyonlarını otomatik taşımaz veya değiştirmez. PostgreSQL backend'i eski kabul testleri için desteklenir, hedef yayın gereksinimi değildir. Yerel diske veya başka DB'ye otomatik fallback yoktur.

Mongo için transaction destekleyen replica set/Atlas gerekir. `python -m alos.cli migrate` açık operatör adımıdır; koleksiyon/indexleri oluşturur. Web başlangıcı sadece `schema-check` yapar. Hesap/medya geçişi ve rollback doğrulanmadan eski uygulamanın yerine geçirilmez. Mevcut Render Python runtime'ı ve ücretsiz plan korunur; ücretli pre-deploy/disk/worker kullanılmaz.

## Yerel kaynakla çalıştırma

Python 3.12+, Node 24 ve MongoDB replica set gerekir (PostgreSQL 18 yalnız alternatif test backend’i). Bağımlılıklar `apps/api/requirements.lock` ve `apps/web/package-lock.json` ile sabitlenir. API `.env` dosyasını kendiliğinden okumaz. `infra/v2/.env.example` değişkenleri kabuğa/servis yapılandırmasına açıkça verilmelidir.

```sh
python -m venv .venv-v2
.venv-v2/bin/pip install -r apps/api/requirements.lock
.venv-v2/bin/pip install --no-deps -e apps/api
npm ci --prefix apps/web
npm --prefix apps/web run build
.venv-v2/bin/python -m alos.cli migrate
.venv-v2/bin/python -m alos.cli schema-check
.venv-v2/bin/python -m alos.cli serve
```

`serve` 0.0.0.0:$PORT adresine bağlanır, migration çalıştırmaz. Kişisel veriyle yerel geliştirmede ağ/firewall sınırı ayrıca uygulanmalıdır. Docker compose web portunu yalnız 127.0.0.1'e yayınlar.

## Docker

```sh
docker compose -f infra/v2/compose.yaml up --build -d
```

Önce PostgreSQL health, sonra tek migration servisi, sonra web açılır. Frontend Node build aşamasında derlenir; runtime yalnız Python ve özel API/dist dosyalarıdır. Container root olarak çalışmaz. Docker context allowlist'i kişisel yedekleri, eski runtime'ı, `.env`, test artefact'larını ve `.git` içeriğini image'a almaz. Volume silen `down -v` yalnız sentetik denemelerde kullanılabilir; kişisel verili çalıştırmada kullanılmaz.

## Render

Hedef ayarlar `infra/v2/render.yaml` içindedir. Mevcut servisin build/start komutları kontrollü geçişte değiştirilir. Mongo bağlantısı ve DB adı Render gizli ortam ayarından alınır; repository'ye yazılmaz. Ücretsiz servisin uyku/yeniden başlama davranışı devam eder; kalıcı veri MongoDB'de kalır. PostgreSQL staging Blueprint'i kaldırılmıştır.

Rollback: eski commit ve `python3 start_render.py` komutuna dönmek v10 koleksiyonlarını kullanır. Yeni V2'de yazılmış verileri eski uygulama okuyamaz; bu nedenle V2 yazıları başladıktan sonra kayıtları dışa aktarmadan körlemesine rollback yapılmaz. Otomatik çift yazım yoktur.

## Health ve kuyruk

- `/health/live`: process canlılığı; kişisel veri/DSN yok.
- `/health/ready`: DB erişimi, migration head eşitliği ve worker yaşamı. Uyuşmazlık 503.
- V2 etkinleştirme veya PostgreSQL DSN yoksa başlangıç kapanır. SQLite/demo fallback yok.
- Aynı web instance içindeki consumer kalıcı outbox'ı işler. Çok instance aynı PG lease ile koordine olur. İşlem claim sonrasında ölürse 30 saniyelik lease yeniden alınabilir. Şimdiki iş yalnız türetilmiş durumun watermark bildirimi; dış para/e-posta etkisi yok. Yeni dış etki eklenirse ayrıca idempotency sözleşmesi gerekir.

## Kullanıcı yedeği ve büyük dosyalar

JSON import en fazla **64 MB**, normal komut en fazla 16 MB, GLB en fazla 8 MB, fotoğraf 2 MB giriş/512 KB normalleştirilmiş içerik. Yedek endpoint'i büyük gövdeyi okumadan hesap/CSRF doğrular ve deneme limiti uygular. Derinlik, düğüm sayısı, duplicate key, sonlu sayı, checksum ve medya türü doğrulanır. 64 MB üzerindeki arşiv için PostgreSQL operatör restore yolu kullanılır; sınırsız tarayıcı import vaat edilmez.

V2 restore tamamlandıktan sonra canonical veriler ikinci bir dev kopya olarak source pakette tutulmaz. Kaynak manifesti, checksum, eski/yeni kimlik haritası, audit geçmişi, envelope'ın bilinmeyen alanları, yerel taslaklar ve bekleyen işlemler korunur. Bekleyen işlem restore sırasında otomatik oynatılmaz. Eski legacy ham veri arşivi aynen korunur.

## Gerçek felaket kurtarma prosedürü

1. Yazma kesim saatini ve son başarılı yedeği belirle; kaynak üzerinde restore yapma.
2. Aynı major PostgreSQL sürümünde boş, ayrı hedef DB oluştur.
3. `pg_restore --exit-on-error --no-owner --no-acl` ile hedefe geri yükle; DSN/parola loga yazılmaz, güvenli bağlantı ortamı kullanılır.
4. Migration head, her tablonun sayı/hash'i, özel medya bytes/hash'i, iki hesap izolasyonu, giriş, aktif reçete/Runner ve pending reconnect akışını doğrula.
5. Salt okunur karşılaştırma ve bilinçli cutover tamamlanmadan canlı DSN'yi değiştirme. Başlangıç bitiş zamanlarını ve kayıp kayıt aralığını kaydet.
6. Onaylı bakım aralığında tek yazıcıyı hedefe çevir. Eski DB'yi belirlenen retention süresince erişim kontrollü tut.

Yerel sentetik `tools/v2/disaster_rehearsal.py` gerçek pg_dump/restore ve tüm tablo içerik özetlerini doğrular. Ölçtüğü süre cloud provisioning, DNS, trafik değişimi ve PITR değildir. Provider sürekli yedek yapılandırılmadan RPO ≤15 dakika veya RTO ≤60 dakika sözü verilmez. Aktif DB ile aynı diskte tek dump dosyası bağımsız felaket yedeği değildir; üretimde şifreli başka hata alanında kopya/retention gerekir.

## Rollback ve hesap geçişi

Önceki V2 image/source commit + ek alanları tutan genişletilmiş şema tercih edilir. Alan silen downgrade, yeni veriyi eski sürüme sığdırma yöntemi değildir. Gerekirse onaylı cutover ile restore edilmiş ayrı DB'ye dönülür. Yeni V2 kayıtlarını eski v10 MongoDB'ye otomatik geri yazan adapter yoktur.

Mevcut hesaplar/medya için üretim göçü **uygulanmadı**. Sentetik kullanıcı şifreleri test ortamına aittir; production seed yoktur. Kayıt başlangıçta kapalıdır. Yeni hesap/kayıt açılışı ve varsa eski hesabın kontrollü aktarımı production cutover planında açıkça ele alınmalıdır.

Resmi çalışma ortamı doğrulaması: [Render native tools](https://render.com/docs/native-runtimes) Python runtime içinde Node/npm bulunduğunu belgeliyor. [Free plan](https://render.com/docs/free) uyku, geçici disk ve aylık kullanım sınırlarını açıklar; ücretsiz plan sınırsız kaynak garantisi değildir.

## Mevcut Render komutlarıyla kontrollü yayın

`pip install -r requirements.txt` ve `python3 start_render.py` korunur. Derlenen herkese açık arayüz `release/v2` içinde sürümlenir; CI kaynaklardan yeniden üretip aynı dosyaları verdiğini doğrular. Bu dizinde hesap/sağlık verisi veya medya yoktur. `ALOS_EDITION` varsayılanı `v10`; `maintenance` hiçbir DB açmadan hesap isteklerine 503 verir; `v2` mevcut Mongo/HTTPS ayarlarını V2'ye aktarır ve şema/geçiş tamamlanmamışsa başlamaz. Başlangıçta hesap göçü yapılmaz.

Geçiş sırası: test edilmiş kaynak GitHub'a gönderilir; `maintenance` yayını ile eski yazıcı durdurulur; kaynakların 0600 özel snapshot'ı alınır; `tools/v2/mongo_cutover.py apply --directory <private-directory> --source-frozen` açık operatör işlemi yapılır. Kaynak fingerprint değişirse durur; var olan V2 kullanıcı adını ezmez. Kaynak koleksiyonlarına yazmaz. Ardından `ALOS_EDITION=v2` ile yayın açılır. V2'ye geçmeden rollback `ALOS_EDITION=v10`; V2 kayıt almaya başladıktan sonra otomatik rollback yoktur.

Eski scrypt şifre özetleri mevcut parametreleriyle doğrulanır; kullanıcının şifresi bilinmez/değiştirilmez. Yeni veya değiştirilmiş şifreler Argon2 kullanır. Yarım kalmış geçişte hesap girişi ve readiness engellenir. Kurtarma kodu özetleri taşınır, oturum tokenları taşınmaz.

### Local preview consolidation during cutover

Before the final private snapshot, download the preview device journal using the backup button and stop its HTTP writer. Add `--source-frozen --preview-database postgresql+psycopg://localhost:15432/<explicit-preview-name> --preview-journal <private-device-export>` to the snapshot command. A username must match exactly one existing account; unresolved identities stop the operation. The preview export is restored first, then the legacy import retains older plans as history when a newer active plan exists. Invalid pending commands remain in the immutable import archive and private download, never auto-replayed. The original PostgreSQL preview remains a recovery source, not a second production writer.
