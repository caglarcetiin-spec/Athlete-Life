# Athlete Life V2 — çalıştırma, yayın ve geri dönüş

## Ayrı ürün sınırı

V2 PostgreSQL kullanır. Eski v10/MongoDB uygulaması `start_render.py` ile ayrı kalır. İki uygulama aynı ana kayda yazmaz. Bu belgede verilen komutlar gerçek hesapları otomatik taşımıyor. V2 hazırlık dalı `codex/alos-2-stage-0`; ana dalda eski uygulamanın otomatik yayını sürüyor.

## Yerel kaynakla çalıştırma

Python 3.12+, Node 24 ve PostgreSQL 18 gerekir. Bağımlılıklar `apps/api/requirements.lock` ve `apps/web/package-lock.json` ile sabitlenir. API `.env` dosyasını kendiliğinden okumaz. `infra/v2/.env.example` değişkenleri kabuğa/servis yapılandırmasına açıkça verilmelidir.

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

`infra/v2/render.yaml` ayrı **staging** taslağıdır; eski servisi güncellemez. Resmi JSON şemasıyla doğrulandı. Uygulanması gerçek container/Render smoke testinin yerini tutmaz. Ücretsiz web planında ayrı pre-deploy adımı yoktur; staging migration'ı açık operatör adımıdır. Migration sırasında advisory transaction lock kullanılır. Her web worker schema değiştirmez.

Kalıcı üretim için ayrı, onaylanmış PostgreSQL kaynağı ve işletim planı gerekir. Free Postgres 30 gün sonunda sona erer; yönetilen PITR içermez. Ücretli web servisinde `preDeployCommand: python -m alos.cli migrate`, `dockerCommand: python -m alos.cli serve` kullanılır. Ücretsiz staging taslağı sessizce ücretli kaynağa çevrilmez.

Resmi kaynaklar (23 Eylül 2026): [Free plan](https://render.com/docs/free), [Deploy/pre-deploy](https://render.com/docs/deploys), [PostgreSQL backup/PITR](https://render.com/docs/postgresql-backups), [Blueprint](https://render.com/docs/blueprint-spec).

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
