# 3B bölgesel toparlanma güncellemesi — 24 Eylül 2026

Birleşik 3B yük/endeks boyaması, kas seçimi, kaynak setler, 24/48 saat tahmini ve dakikalık yenileme uygulandı. Sentetik science 11, Mongo hedefli 4, istemci 12 test ve WebGL tarayıcı kontrolü PASS. Yayın/CI doğrulaması bekleniyor; bu bölüm henüz canlı başarı iddiası değildir. Yeni hesaplar biyolojik ölçüm değil açıklanmış varsayımlardır. Şema/hesap/medya göçü yok; MongoDB ve ücretsiz Render korunuyor. Ayrıntı `docs/evidence/stage-9/RECOVERY_REVIEW.md`.

# Son yayın doğrulaması — 24 Eylül 2026

96 MiB GLB ve altı hareketlik görsel rehber **yayında**: https://athlete-life.onrender.com/ . PR #3 merge `107967bc`, Render `dep-daqfvk0ae00c738dnnr0` LIVE. CI 35988524978 core/container/mongodb SUCCESS. Yedi herkese açık paket dosyasının SHA-256 değerleri eşleşti; ready/root 200, oturumsuz hesap 401, özel dosya yolu 404. MongoDB ve ücretsiz plan korundu; şema/hesap/medya göçü yok. Doğrulama: `docs/evidence/stage-9/LIVE_LARGE_MODEL.json`. GitHub PR #3 içinde yayın sonucu kaydedildi. Aşağıdaki bekleme ifadeleri geçmiş aşamaları anlatır.

# GLB güncellemesi — 24 Eylül 2026

96 MiB GLB yükleme ve ilerleme/onay arayüzü hazır. 80/95 MiB sentetik modellerin yükleme, indirme, tam tarayıcı yedeği ve geri yükleme SHA-256 eşleşmeleri geçti. Son 80 MiB testinde tepe sunucu belleği 466 MiB altında; fiziksel telefon veya kullanıcının gerçek modeli test edilmedi. 78 Mongo regresyonu, son komut yolu için 13 test, 3 boyut/serileştirme koruma testi ve 30 PostgreSQL ortak API testi PASS. Mobil boyutta sentetik WebGL/kamera/yükleme/yeniden açma PASS. Yayın dalının Linux CI ve Render doğrulaması henüz bekleniyor.

Şema/hesap göçü yok; MongoDB ve ücretsiz Render korunur. Önceki sürüm aynı BSON kayıtlarını okuyabilir, ancak geri dönüldüğünde küçük yükleme sınırları geri gelir. Ayrıntı: `docs/evidence/stage-9/LARGE_MODEL_REVIEW.md`.

# Canlı durum — 24 Eylül 2026

V2 mevcut ücretsiz Render servisinde **yayında**: https://athlete-life.onrender.com/ . MongoDB korundu; yeni ücretli kaynak açılmadı. Kullanıcının açık gerçek veri geçişi onayıyla üç hesap ve kaynak snapshotları, eşleşen önizlemenin 11 canonical kaydı ve cihazda bekleyen eksik taslağın arşivi taşındı. Eski koleksiyonlar değişmedi; özel kurtarma dosyaları Git dışında durur. Önizleme HTTP yazıcısı durduruldu; üretimde tek yazar vardır.

Yayın commit'i `acc15b6`, deploy `dep-daq4713ncjis73ajlu10`: live. `/health/ready` 200 ready, `/` 200, kayıt yapılandırması açık ve 8 karakter; oturumsuz hesap API'si 401, `.env` 404. Mevcut internet hesabının şifresi korunur; yeniden giriş gerekir. Gerçek hesapla test kaydı oluşturulmadı.

CI 35914984103: core/container/mongodb SUCCESS. Uzak aktarımda büyük hesabın storage_retry ile güvenli durması üzerine toplu insert iyileştirildi: 74 sentetik Mongo testi + gecikmeli 350 kayıt testi PASS. Aynı özel snapshotla gerçek aktarım tamamlandı ve kaynak fingerprintleri değişmedi. Son performans düzeltmesinin CI 35924396158 core/container/mongodb kontrolleri de SUCCESS; PR #2 ana dala birleştirildi (`bfdd772`). Render otomatik yayını aynı ücretsiz serviste gerçekleştirir. Kanıt: `docs/evidence/stage-9/LIVE_CUTOVER.json`.

Şema: yalnız `alos_v2_*` ve cutover işaretleri. Geri dönüşte yeni V2 yazıları önce korunmalı; eski sürüme körlemesine dönülmez. Klinik doğrulama, fiziksel iPhone/VoiceOver ve yıllar süren yük testi yapılmış sayılmaz. Ücretsiz Render uyku/ilk açılış gecikmesi devam eder. Optional AI/cihaz bağlantıları kapalıdır.

Aşağıdaki bölümler kronolojik çalışma geçmişidir; NO-GO/henüz taşınmadı ifadeleri yukarıdaki canlı sonuçtan önceki durumu anlatır.

---

# Güncel durum — 23 Eylül 2026

## Güncel bütçe kısıtı — 23 Eylül 2026

Kullanıcı ücretli barındırmayı reddetti. Yeni ücretli Render/DB/disk/worker oluşturulmayacak; önceki aylık 20 USD bütçe sorusu artık geçerli değil. Mevcut `Athlete-Life` Render servisi API üzerinden doğrulandı: `plan=free`, Python runtime, `main` dalı, eski uygulama. Canlı ayarları ve verileri değiştirilmedi.

Kullanıcı mevcut MongoDB’yi korumayı seçti. ADR-0005 uyarınca V2 MongoDB backend'i eklendi: transaction/ACK, sürüm ve cursor, büyük yedek parçaları ve indexler. 10 çekirdek test, 52 domain/query kontrolü, 3 crash/schema/NULL testi ve beş tarayıcı akışı ayrı çalıştırmalarda geçti; nihai birleşik Mongo suite sonucu `docs/evidence/stage-9/mongo-suite.json` içinde izlenir. Ortak değişikliklerden sonra PostgreSQL regression 61 PASS. Yerel Mac Mongo sunucusu dosya sınırı nedeniyle iki çalıştırma hata verdi; başarısız kanıtlar saklandı, test sunucusunun idle file-handle ayarı düzeltildi. Dosya yönetimi düzeltmesinden sonra nihai birleşik suite **65 PASS**, 227,70 saniye; iki dependency deprecation uyarısı var.

Render tanımı mevcut Python/free servise ve MongoDB'ye uyarlandı; PostgreSQL kaynağı oluşturma bölümü kaldırıldı. Canlı Render/Atlas değişmedi, gerçek hesap veya medya göçü yapılmadı. Mongo CI job'ı eklendi fakat henüz GitHub'da çalıştırılmadı. Kontrollü hesap/medya aktarımı ve rollback provası yayın ön koşulu. İnceleme: `docs/evidence/stage-9/MONGODB_REVIEW.md`.

## Yayın hazırlığı devamı

`cb9c391` hesabı/şifre özeti aktarımı ve mevcut `start_render.py` üzerinden bakım/v2 seçimi eklendi. `release/v2` yalnız derlenmiş herkese açık UI içerir. Seçili Mongo hesap/domain regression: 65 PASS; gerçek giriş komutu smoke: 3 PASS. Önceki Mongo kaynak 24ca526 için GitHub CI core/container/mongodb SUCCESS (35891299000). Yeni kaynak CI ayrıca beklenir.

Gerçek kaynakta salt okunur 3 hesap/3 snapshot/0 fotoğraf kaydı doğrulandı; 0600 özel kurtarma kopyaları Git dışında alındı. Canlı yazım/yayın yapılmadı. Önizleme hesabıyla canlı hesap eşleştirmesi otomatik inceleme tarafından “gerçek veri testi” kapsamında reddedildi; gerçek aktarım için kullanıcıya açık soru iletildi. Kullanıcı daha sonra gerçek veri geçişini açıkça onayladı. Eşleşen tek önizleme hesabındaki 11 kayıt ve cihazda bekleyen eksik taslak korunarak aktarım hazırlanıyor. Ücretli kaynak oluşturulmadı.

Kullanıcının tüm aşamaları ara onay beklemeden tamamlama talimatıyla çalışmaya devam ediliyor.

| Aşama | Gerçek durum |
|---|---|
| 0–4 | Kapsamı belirtilen kabul kapıları geçti; aşama raporları docs/evidence altında. |
| 5 | Deterministik model, kaynak takibi, rapor/PDF testleri geçti; klinik doğrulama yapılmadı. |
| 6 | Ana UX/PWA yolları ve 29 eski route karşılığı uygulandı. 61 backend/8 client, 68 route/tema/viewport, büyük yedek ve GLB kontrolleri geçti. Fiziksel iPhone/VoiceOver NOT RUN; alt işlev eşlemesi stage-9/FEATURE_REVIEW.md içinde incelendi. |
| 7 | Optional AI ve cihaz bağlantıları kapalı/yapılandırılmamış. Çekirdek LLM olmadan çalışır; harici AI testi yapılmış sayılmaz. |
| 8 | DEVAM EDİYOR: Render Blueprint resmi şemayla doğrulandı; native server smoke, gerçek yerel PG dump/restore ve 1000 kayıt/4 okuyucu performansı ölçüldü. Docker ve Linux CI (911e889, run 35806086944) geçti. Render staging/kalıcı hosting ve cutover bekliyor. |
| 9 | Yerel/CI kanıt incelemesi yapıldı; sonuç docs/evidence/stage-9/REVIEW.md. Önizleme çalışıyor; tam üretim geçişi NO-GO. Dış bağımsız reviewer kullanılmış sayılmaz. |

Canlı v10/Render/MongoDB değişmedi. Gerçek hesap, sağlık verisi veya medya göçü yapılmadı. V2 halen ayrı, varsayılan kapalı. **Üretim geçişi NO-GO**: tüm kabul kapıları kapanmadı. Yeni hesap kurtarma ve dönem arşiv şemaları sentetik backend testlerinde doğrulanıyor; yayınlanmadı.

Aşağıdaki eski tarihli bölümler çalışma geçmişidir; yukarıdaki tablo güncel durumu belirtir.

---

# Athlete Life OS 2.0 — güncel durum

## Aşama 0: tamamlandı

Çalışma dalı: `codex/alos-2-stage-0`. İncelenen runtime commit: `e92b4b736e9f4aa8bcd64103ec59b1aa6abf5297`.

Kullanıcının dört belgesi `prompts/` ve `reference/` içine değişmeden alındı. Ana şartnamenin ilk-görev sınırı uygulandı: keşif, gerçek test tabanı ve mimari geçiş planı. Uygulama kaynakları/DB şeması/gerçek kullanıcı verileri değişmedi; GitHub push, Render deploy, Atlas aktarımı yapılmadı.

### Kanıtlı teslimatlar

- [Mevcut sistem haritası](docs/architecture/CURRENT_SYSTEM_MAP.md): iki giriş yolu, API, persistence, motor bağımlılıkları, source index.
- [Özellik paritesi](FEATURE_PARITY.md): 29 route ve ek modal/alt işlev envanteri; current kanıt ile hedef durum ayrı.
- [Eski veri haritası](LEGACY_DATA_MAP.md): SQLite/Mongo/browser/backup/medya + domain alanları, unknown/date/duplicate politikası.
- [Riskler](RISK_REGISTER.md): stale overwrite, yanlış ACK hissi, kayıp yanıt retry, midnight ve test izolasyonu.
- [Test tabanı](TEST_BASELINE.md): **69 PASS / 4 FAIL / 2 NOT RUN** test giriş dosyası; yeni sentetik risk probları ve 29 anonim ekran.
- [ADR-0001](docs/adr/0001-modular-monolith.md), [0002](docs/adr/0002-storage-transactions-and-sync.md), [0003](docs/adr/0003-auth-and-offline-client.md), [0004](docs/adr/0004-deployment-and-migration.md).
- [Aşama 1 planı](PLANS.md), [kabul izlenebilirliği](REQUIREMENTS_TRACEABILITY.md), yeniden üretim araçları `tools/stage0/`.

### En önemli bulgular

1. Güncel hesaplı store eski revizyonu reddediyor; eski tek-kullanıcı store'da yeni seti düşüren overwrite tekrar üretildi. İki yol karıştırılmadı.
2. Güncel UI vardiya mesajı ACK beklemiyor. Kayıp ACK tekrarında idempotency yerine 409 var; farklı kayıtların eşzamanlı değişimi global snapshot çatışması yaratıyor.
3. Midnight bilinçli geçmiş tarih seçimini değiştiriyor. System Integrity sandbox'ı transport save yoluna ulaşabiliyor; bu düğme gerçek kayıtları koruyan izole test gibi kabul edilemez.
4. Güncel ayrı browser probunda vardiya + structured optimizer ikinci context'te ve server restart/fresh login sonrasında eşit kaldı.
5. Eski dört browser testinin onboarding selector'ları güncel akışa uymuyor; başarısızlıklar saklandı, PASS sayılmadı.

## Kabul kapısı

| Kapı | Durum |
|---|---|
| Gerçek dosya/özellik/veri haritası | PASS (kaynak ve anonim browser scope belirtilerek) |
| Riskler sınıflı ve önemli overwrite tekrar üretimi | PASS (riski bulma görevi; ürün riski çözülmüş değil) |
| Yeni ölçülmüş baseline + ham stdout/stderr/exit | PASS (başarısız testler dahil dürüst rapor) |
| Mimari kararlar ve Aşama 1 dosya/test planı | PASS |
| 2.0 uygulama / bütün acceptance matrix | NOT RUN |
| 2.0 release uygunluğu | NO-GO; henüz yeni çekirdek yok ve kritik açıklıklar var |

## Sonraki tek aşama

**Aşama 1 — giriş + vardiya + transaction ACK + yeniden açılış + ikinci cihaz.** React/TypeScript + FastAPI + PostgreSQL ayrı sentetik ortamda. İlk iş bağımlılıklar/gerçek PG test ortamı; sonra ADR-0002/3 kayıt protokolü. MongoDB üretim verisi mevcut kalır. Yeni science/grafik/AI Aşama 1 kapısını geçmeden eklenmeyecek.

## Geri dönüş

Bu görev yalnız belgeler ve audit araçları ekler; çalışma dalından ayrılmak uygulama davranışını eski haline döndürme gerektirmez, çünkü runtime değiştirilmedi. Yeni DB/veri migrasyonu yok. Sonraki aşamalarda rollback farklıdır ve PLANS/ADR-0004'te açıkça tanımlıdır.

# 16 Eylül 2026 — tüm aşamalar için devam talimatı

Kullanıcı bütün aşamaları ara onay beklemeden tamamlama yetkisi verdi. Yukarıdaki Aşama 0 görev sınırı artık güncel çalışma kapsamı değildir.

- Aşama 1: çalışan auth + PostgreSQL + küçük komutlar + idempotency + audit/change/outbox + IndexedDB pending + vardiya/hafta önerisi. İlgili kapı PASS; [kanıt](docs/evidence/stage-1/RESULT.md).
- Aşama 2: DEVAM EDİYOR — legacy staging/dry-run/import, tam export, izole restore.
- Aşama 3–9: sırayla yürütülecek; henüz tamamlanmadı.
- Canlı v10/MongoDB değişmedi; V2 geçiş kapıları kapanana kadar NO-GO.

## Aşama 2 sonucu

Kayıpsız arşivleme, staging/önizleme/onay, kişisel export, private fotoğraf, read-only SQLite çıkarımı ve bağımsız PostgreSQL restore tamamlandı. **16 backend testi PASS**, gerçek browser restore PASS. [Kanıt ve kapsam](docs/evidence/stage-2/RESULT.md). Legacy domain kayıtları arşivden erişiliyor; native adapter'lar sonraki domain aşamalarında tamamlanacak.

Aşama 3 DEVAM EDİYOR: program → değişmez reçete → tek gerçek set kaynağı → yeniden açılabilen Runner.

## Aşama 3 sonucu

Tek reçete ve actual set kaynağı, program sürümleme/onay, geçmiş seanslar, mobil Runner, timer, manuel/offline slot uzlaştırma ve structured legacy adaptörü çalışıyor. **24 backend + 5 client testi PASS**, gerçek mobil viewport golden journey PASS. [Kanıt](docs/evidence/stage-3/RESULT.md).

Aşama 4 DEVAM EDİYOR: beslenme, su, günlük sağlık, Capability, hedef ve sosyal/gerçek aktivite kayıt bütünlüğü.

## Aşama 4 sonucu

Beslenme/yiyecek/tarif, su, check-in/uyku/ağrı/sağlık kayıtları, Capability, hedef ve sosyal/gerçek aktivite modelleri ortak transaction ve offline protokolüne bağlı. 31 backend testi ve gerçek mobil/ikinci oturum akışı PASS. [Kanıt](docs/evidence/stage-4/RESULT.md).

Aşama 5 DEVAM EDİYOR: açıklanabilir, sürümlü hesaplar; 37 backend regression PASS. Rapor arayüzü ve PDF kontrolleri sürüyor.

## Görsel katman — 24 Eylül 2026

Hareket kütüphanesi (6 temel hareket, iki pozisyon, şematik kas haritası ve kaynak bağlantıları), program/set bağlamında yardım ve azaltılabilir kısa geçişler tamamlandı. Sentetik mobil/açık-koyu/WCAG AA kontrolü, 10 client testi, lint/build PASS. GLB ve görsel katman aynı yayın dalında; nihai CI/yayın sonucu ayrıca kaydedilir.
