# ATHLETE LIFE OS 2.0 — ANA ÜRÜN VE MÜHENDİSLİK PROMPTU

Hazırlanma tarihi: 16 Eylül 2026. Bu bir geliştirme şartnamesidir; uygulamanın yeni sürümünün yazıldığı veya testlerinin geçtiği iddiası değildir.

## 0. Görev, çalışma disiplini ve yetki sınırı

Mevcut Athlete Life OS deposunu, kişisel sporcu yaşamını yöneten güvenilir, açıklanabilir, mobil kullanımı güçlü bir Athlete Life OS 2.0 ürününe evrimsel olarak dönüştür. Başmimar, uygulama geliştiricisi, veri mühendisi, kullanıcı deneyimi tasarımcısı ve test mühendisi sorumluluklarını birlikte üstlen. Rol tanımları gerçek uzman denetiminin veya bilimsel doğrulamanın yerine geçmez.

Bu metin bütün ürünün hedefidir; tek oturumda bütün ürünü yeniden yazma talimatı değildir. İlk görevde yalnızca Aşama 0'ı tamamla. Sonraki görevlerde `prompts/` klasöründeki tek bir aşama promptunu uygula. Her aşama çalışan, incelenebilir bir teslimat ve doğrulama kanıtı üretsin. Araç veya süre sınırına geldiğinde çalışır durumu ve kalan işleri dosyalara kaydet; tamamlanmayan işi tamamlanmış sayma.

Mevcut kaynak kod, gözlemlenen davranış ve çalıştırılmış testler teknik gerçeği belirler. Eski sohbetlerdeki “düzeltildi”, “tek motor”, “tüm testler geçti” açıklamalarını kanıt sayma. Kullanıcının iş gereksinimlerini koru; eski hatalı hesaplama ve mimariyi koruma zorunluluğu yoktur. Gereksinimler çelişirse veri korunması, güvenlik ve açıkça belirtilen kullanıcı tercihleri önceliklidir. Güvenli ve geri alınabilir ayrıntılarda gerekçeli karar ver; gerçek kullanıcı verisinin silinmesi, ücretli kaynak oluşturulması, hesap bağlanması ve üretim yayını için ayrıca açık yetki gerekir.

Çalışma dalını ve mevcut değişiklikleri kontrol et. Kullanıcının değişikliklerini ezme; `git reset --hard`, toplu silme ve gerçek veritabanında deneme yapma. Paket içindeki kişisel fotoğraf, vücut modeli, yedek veya kimlik bilgilerini örnek veri diye halka açık depoya yükleme. Gerçek verileri test kayıtlarına, hata izleme servislerine veya model istemlerine gereksiz yere taşıma.

## 1. Ürünün amacı ve başarı tanımı

Ürün, calisthenics becerilerini, kuvveti, kas gelişimini, koşuyu, günlük toparlanmayı, beslenmeyi ve vardiyalı yaşamı aynı sporcunun kayıtları üzerinde buluşturacak. Kullanıcının dört temel sorusuna cevap versin: Bugün ne yapmalıyım? Bunu hangi veriye dayanarak öneriyorsun? Önceki performansıma göre gelişiyor muyum? Girdiğim verinin güvenle saklandığını nasıl anlayacağım?

Amaç “her gün yeni hareket bulan sohbet robotu” değildir. Ana programın sürekliliğini koruyan, gerçekleşen antrenmanı güvenilir kaydeden, gerekirse uygulanacak dozu gerekçeli değiştiren bir karar destek sistemidir. En önemli kalite sırası: kayıt bütünlüğü → tarih ve oturum tutarlılığı → kullanım kolaylığı → açıklanabilir hesaplar → gelişim analitiği → isteğe bağlı yapay zekâ. Güzel grafikler, doğru kaydetmeyen bir çekirdeğin telafisi değildir.

İlk kullanım bağlamı kişisel/tek sporcu, Türkçe, Europe/Istanbul zaman dilimi, hafta başlangıcı pazartesi ve gün sınırı 00:00'dır. Bunlar kullanıcı ayarı olmalı; kaynak kodda kişiye veya tarihe sabitlenmemelidir. Öncelikli istemciler iPhone Safari/PWA ve masaüstü tarayıcıdır. Apple Watch veya başka giyilebilir cihazın mevcut olduğunu varsayma. Cihaz entegrasyonu olmadan da ana işlevler çalışmalı.

Ürün adındaki “2.0”, eski teknik paket numarası “10.0.0” ile sayısal olarak karşılaştırılmayacak. `product_version`, `api_version`, `db_schema_version`, `backup_schema_version` ve `calculation_model_version` bağımsız tutulacak.

## 2. Korunacak kapsam ve geliştirme sınırı

Bugün, Haftam, Antrenman, Guided Workout Runner, Beslenme, Su, Raporlar, Capability Lab, ağrı/günlük check-in, sürpriz plan/ad hoc aktivite, hareket kütüphanesi, geçmiş kayıt düzenleme, tam yedek/geri yükleme ve System Integrity işlevlerini envantere al. Mevcut fotoğraf/3B kas haritası varsa veri ve erişim kaybolmayacak; ana kayıt deneyimini yavaşlatmayacak. Her eski özellik için `korundu`, `yenilendi`, `bilinçli kaldırma için onay bekliyor`, `henüz taşınmadı` durumlarından biri ve kanıt göster.

İlk sürümde sosyal ağ, abonelik/tahsilat, koç pazaryeri, yerel iOS/Android uygulaması, gerçek zamanlı kamera form analizi ve çok sayıda mikroservis kurma. İleride eklenebilecek sınırlar tasarla; çalışmayan özellikleri aktif butonlarla pazarlama. Bütün spor dallarını “öğrenmiş” gibi davranma. Desteklenen ilk kapsam calisthenics/rings, direnç antrenmanı, temel koşu/sprint, mobilite, denge ve work capacity olsun.

## 3. Kaynak incelemesi ve eski sistem riskleri

Depoda bulunuyorsa özellikle `launch.py`, `server-sync.js`, `durable-persistence.js`, `backup-vault.js`, `app.js`, `canonical-session-engine.js`, `training-session-service.js`, `athlete-coordinator.js`, `event-store-engine.js`, `service-worker.js`, kütüphaneler ve testleri incele. Bir modülün dosya adında bulunmaması işlevin bulunmadığı anlamına gelmez; `AthleteProgramEngine` mevcut pakette `app.js` içinde tanımlanıyor.

Referans v10 paketinde tek JSON durumunu `/api/state` üzerinden SQLite'a yazan bir düzen var. Bu pakette eski istemci yazımının yeni kayıtları canlı durumdan düşürebildiği yalıtılmış sentetik deneyle gösterildi. Bu, bütün kullanıcı sorunlarının tek nedeni olduğu anlamına gelmez. Çalışılan depoda aynı davranışın sürüp sürmediğini yeniden doğrula. `reference/CURRENT_CODE_AUDIT.md` sonuçlarını hipotez ve yeniden üretim girdisi olarak kullan.

Global JSON'u revizyon numarası veya “daha dolu” kaydı seçerek uzlaştıran yaklaşımı üretim sisteminin doğruluk temeli yapma. Dosya bozulmasını saptayan checksum, eski ama geçerli verinin yenisini ezmesini engellemez. Tarayıcıya yazılmış olmayı sunucuya kaydedilmiş olmakla karıştırma. Mevcut durumun birim testleri, gerçek iki istemcili çalışma, kapatıp açma ve geri yükleme sınamalarının yerine geçmez.

## 4. Değişmez ürün sözleşmeleri

INV-01: Sunucuya kaydedildi etiketi yalnız ilgili işlemin veritabanı transaction'ı tamamlandıktan ve yanıt alındıktan sonra gösterilir. Çevrimdışı yerel kayıt ayrı adlandırılır.

INV-02: Bir cihazın eski verisi başka cihazın yeni kayıtlarını sessizce silemez. Çatışma görünürdür ve çözüm yolu vardır.

INV-03: Aynı mantıksal işlem tekrar gönderildiğinde aynı set, öğün, su veya vardiya iki kez oluşmaz.

INV-04: Planlanan seans, gerçekleşen seans ve ekranda seçili tarih farklı kavramlardır. Aynı gün birden fazla seans mümkündür.

INV-05: Haftalık plan, hazır antrenman ve Runner aynı `session_prescription_id` ve sürümünü kullanır. Hareket adı eşitliği tek başına yeterli kontrol değildir.

INV-06: İlk gerçek set başladığında reçete kilitlenir. Optimizer açık antrenmanı sessizce yeniden yazamaz.

INV-07: Gün değişimi geçmiş kayıtları silmez. Bugün görünümü yeni tarih filtresine geçer; geçmiş tarih bilinçli seçiliyse kullanıcının bağlamı zorla değiştirilmez.

INV-08: Kaydedildikten sonra o günün kayıtları görünür kalır. Kullanıcı istemeden “kaydet ve ön yüzü boşalt” davranışı ekleme; temizlenme ertesi günün filtresiyle olur.

INV-09: Geçmiş bir kaydı düzenlemek onun gerçekleşme zamanını bugüne taşımaz; değişiklik ve gerçekleşme zamanları ayrı tutulur.

INV-10: Eksik veri sıfır değildir. Kaydedilmemiş protein, uyku veya HRV için sıfır değer üretme.

INV-11: Tahmini hazırlık skoru, ölçülmüş kas hasarı yüzdesi veya sakatlanma olasılığı değildir.

INV-12: Model ve kural güncellemesi ham geçmişi değiştirmez; eski kararlar sürüm ve girdileriyle açıklanabilir kalır.

INV-13: Testler, sıfırlama, içe aktarma ve yedek doğrulama gerçek kullanıcı verisinde sessiz değişiklik yapamaz.

INV-14: Ana işlevler dış LLM hizmeti olmadan çalışır. Model erişim sorunu kayıt veya Runner'ı engellemez.

INV-15: Kimlik ve kayıt sahipliği sunucuda doğrulanır. Kullanıcı A, kullanıcı B'nin tahmin edilebilir veya bilinen kayıt ID'siyle verisini okuyamaz/değiştiremez.

INV-16: Kaynak uygulama kodu, kullanıcının gerçek SQLite/IndexedDB verisi ve dış yedek birbirinin yerine geçmez. Kod paketinde geçmişin bulunacağını varsayma.

## 5. Mimari karar: sade, modüler ve gerçek işlem sınırları olan uygulama

Varsayılan öneri modüler monolit: React + TypeScript + Vite ön yüzü; FastAPI + Pydantic + SQLAlchemy + Alembic arka yüzü; PostgreSQL ana veri deposu. Sürümleri uygulama anındaki resmi dokümanlardan ve uyumluluktan doğrula, kilit dosyalarıyla sabitle. Denetlenmiş mevcut bir altyapı bu hedefleri daha az riskle sağlıyorsa Aşama 0'da ADR ile alternatif öner; sürekli teknoloji değiştirme.

Ön yüz production çıktısı aynı origin üzerinden servis edilebilir. TanStack Query gibi bir sunucu durumu önbelleği kullan; URL/route state seçili tarih ve filtreleri taşısın; küçük yerel store yalnız geçici arayüz durumunu yönetsin. React bileşenleri veritabanı veya spor bilimi kurallarını içermez. Browser cache kalıcı sunucu gerçeğinin yerine geçmez.

Sunucuda domain, application service, repository, HTTP ve integration katmanlarını ayır. Domain fonksiyonlarını mümkün olduğunca saf yap; saat ve dış bağımlılıkları enjekte et. Üretimde tek hesap otoritesi olsun: iş kuralları sunucuda. Çevrimdışı reçete görüntüleme, daha önce onaylanmış reçetenin cache'ini kullanır. İstemci önizlemesi varsa “geçici” işaretlenir ve aynı sürümlü sözleşmeyle test edilir; iki bağımsız biyoloji motoru yaratma.

PostgreSQL normalize edilmiş ham kayıtların yetkili deposudur. Aynı transaction içindeki audit ve outbox, değişiklikleri izler ve hesaplamaları tetikler. Timeline bu kayıtların bir okuma görünümüdür; her bilgiyi tek serbest JSON event tablosuna tıkıştırma. Tam event sourcing/CQRS veya Kafka, Kubernetes, Redis, mikroservis ağı varsayılan değildir. Gerçek gerekçe ve işletim maliyeti olmadan ekleme.

Örnek sınırlar: Identity, AthleteProfile, Scheduling, Programming, WorkoutExecution, NutritionHydration, RecoveryAnalytics, Capabilities, Evidence, Backups, Integrations. Tek transaction gerektiren işlevleri sırf “modüler” görünmek için farklı servisler arasında dağıtma.

## 6. Depo ve dokümantasyon düzeni

Depoya uygunlaştırılabilecek hedef düzen:

```text
apps/web/src/{features,components,api,sync,styles}
apps/api/app/{domain,services,repositories,api,workers,security}
apps/api/alembic/
contracts/{openapi,schemas}
packages/generated-client/
tests/{unit,integration,contract,e2e,migration,fixtures}
docs/{adr,architecture,migration,science,operations}
infra/{Dockerfile,render.yaml}
AGENTS.md
PLANS.md
STATUS.md
REQUIREMENTS_TRACEABILITY.md
```

Dizin oluşturmak teslimat değildir. Her modül gerçek çalışan kod, kayıt yolu, test ve hata davranışı içermeli. Üretilen istemci türleri OpenAPI ile tutarlı olmalı; manuel kopyalanmış iki sözleşme zamanla ayrışmasın. Erişilebilir eski programların lisans ve telif koşullarını koru; rakip uygulamaların görsellerini, metinlerini veya kapalı algoritmalarını kopyalama.

## 7. Veri modeli ve sahiplik

Modeli gerçek eski veri envanterine göre kesinleştir. Aşağıdaki kavramlar ayrı olmalı:

| Alan | Temel varlıklar ve önemli ayrım |
|---|---|
| Kimlik | users, auth_sessions, athlete_profiles, athlete_memberships; başlangıçta her kullanıcı yalnız kendi sporcusuna erişir. |
| Program | program_templates, program_versions, blocks, weekly_slots; şablon ve kişiye atanmış program ayrılır. |
| Reçete | session_prescriptions, prescription_items, prescription_set_slots; immutable sürüm ve kilitlenme bilgisi. |
| Gerçek antrenman | workout_sessions, performed_sets, cardio_intervals, session_feedback; planlanan ve gerçek değerler ayrı. |
| Vardiya | shifts, availability, schedule_exceptions; yinelenen şablon, gerçekleşmiş tarih ve istisna ayrımı. |
| Hafta optimizasyonu | optimization_runs, optimization_items; giriş sürümleri, öneriler, onay ve geçerlilik durumu. |
| Günlük durum | sleep_entries, daily_checkins, pain_entries, body_measurements; kayıt kaynağı ve ölçüm protokolü. |
| Beslenme | food_items, recipes, meal_entries, meal_items, nutrition_day_status, hydration_entries. |
| Yetkinlik | capability_definitions, capability_protocol_versions, capability_measurements, goals. |
| Analitik | calculation_runs, derived_metrics, recommendation_decisions, input_lineage; yeniden üretilebilir çıktılar. |
| İşlem güvenilirliği | idempotency_keys, change_log, transactional_outbox, audit_records, sync_conflicts. |
| Taşıma ve yedek | migration_runs, legacy_record_map, backup_manifests, restore_runs, media_objects. |

Kimlikler kararlı UUID olsun. İsim, görüntüleme sırası veya tarih tek başına ID değildir. Egzersiz adı değişince geçmiş kaybolmasın. Her uygun kayıt `athlete_id`, `version`, `created_at`, `updated_at`, `source`, gerekirse `deleted_at` taşısın. Tablo türüne özgü NOT NULL, CHECK, foreign key ve unique kısıtlarını veritabanında da uygula. Kiracı izolasyonunda composite foreign key veya eşdeğer doğrulamayla çapraz sporcu referanslarını engelle. JSONB yalnız gerekçeli değişken metadata, legacy raw alanları ve sürümlü snapshot için kullanılsın.

Yük, tekrar, süre, mesafe, açı, nabız, hız ve birim semantiğini tanımla. Ek ağırlık, vücut ağırlığı ve toplam yük farklı alanlardır. Assisted pull-up, vücut ağırlıklı pull-up ve weighted pull-up ölçümlerini aynı kilogram sütununa yanlış sıkıştırma. Negatif tekrar/süre, imkânsız tarih aralığı ve NaN sunucuda reddedilir; alışılmadık ama mümkün performansı keyfî sınırla silme.

## 8. Zaman, tarih ve geçmişin anlamı

`occurred_at` gerçek olay zamanı, `recorded_at` sisteme ilk giriş, `received_at` sunucu kabulü, `updated_at` düzeltme, `scheduled_for` planlanan tarih/saat, `athlete_local_date` günlük gruplama tarihi ve `timezone` IANA bölgesidir. Tarih-saatleri UTC sakla, orijinal timezone/offset ve gerekirse kullanıcının atadığı günlük gruplamayı koru. Date-only haftalık slotları UTC anı gibi ele alma.

Zamanı bilinmeyen legacy kayda import anını antrenman zamanı diye yazma. `time_precision=date_only`, `time_source=legacy_unknown` gibi provenance tut; hesap aralığını/eksikliği göster. Gece yarısını aşan vardiya ve antrenman için gerçek başlangıç/bitiş anları vardır; tüm setleri zorla yeni güne taşıma. Günlük raporların session-start günü mü olay günü mü kullandığını açıkça tanımla ve tutarlı uygula.

UI bağlamında `todayLocalDate`, `selectedDate`, `selectedSessionId`, `activeWorkoutSessionId`, `weekStart` ve rapor `asOf` ayrılır. Eski antrenmana bakarken açık Runner başka bir seansa aitse bunu görünür göster. Eski Runner yeni tarihin adıyla etiketlenemez. Aynı gün iki seans için tarih tekilliği koyma.

Antrenman saatlerini saat dilimi değişince yeniden yorumlama. Istanbul dışında yaz/kış saati olan bir bölgeyle de test yap. Saatin cihazda ileri/geri olması sunucu sürümünü belirlemez. Timer için aktifken monotonic clock, yeniden açılışta saklanan başlangıç/bitiş/deadline ve pause süreleri kullan; setInterval çağrı sayısını gerçek süre sayma.

## 9. Kayıt protokolü, idempotency ve çatışma

Her kullanıcı eylemi küçük bir domain komutudur; bütün `db` nesnesini tekrar yazmaz. Örnek: vardiya alanını değiştirmek, bir set eklemek, bir öğünü düzeltmek. İstemci `operation_id`, `entity_id`, `expected_version`, schema sürümü, komut türü ve payload gönderir. Aynı mantıksal işlem retry sırasında aynı `operation_id` kullanır.

Sunucudaki işlem: kimlik/sahiplik → schema doğrulaması → idempotency kontrolü → expected_version kontrolü → domain kuralı → ilgili satırların yazımı → audit/change log/outbox → commit → kalıcı kayıt yanıtı. Bu zincirde domain yazımı ve outbox aynı transaction'da olmalı. Yanıtta `operation_id`, güncel entity version, authoritative entity ve değişiklik cursor'u bulunmalı. İstemci sunucunun döndürdüğü gerçek sürümü benimser.

Aynı idempotency anahtarı aynı payload ile gelirse önceki sonucu döndür; farklı payload ile gelirse açık hata ver. Anahtar kapsamı kullanıcı/athlete ve işlem türüyle çakışmayacak şekilde tanımlansın. Saklama süresi desteklenen çevrimdışı kuyruğundan kısa olmasın; süresi dolmuş eski işlemler körlemesine yeniden uygulanmasın.

Farklı kayıtlar bağımsız birleşir. Aynı kaydın iki değişikliği için üç-yollu alan bazlı birleştirme güvenliyse yap; aynı alan çelişiyorsa 409 ve mevcut/base/requested değerlerle çözüm UI'ı sun. Sağlık/antrenman verisinde sessiz “son yazan kazanır” ve daha yeni client timestamp önceliği yok. Silme tombstone'u, eski offline istemcinin kaydı diriltmesini engeller. Bilinçli geri alma yeni sürüm ve audit üretir.

SQL transaction tek başına bütün iş çatışmalarını çözmüş sayılmaz. İzolasyon düzeyi, kilit kapsamı, retry edilebilir hatalar, deadlock ve version check birlikte tasarlanıp gerçek PostgreSQL ile test edilir. Teslimat semantiğini “en az bir kez gönderim + idempotent tek mantıksal etki” olarak tanımla; ağ üzerinde sihirli exactly-once garantisi verme.

## 10. Çevrimdışı çalışma ve çoklu cihaz

IndexedDB, kullanıcı ve API ortamına göre ayrılmış snapshot cache ve durable outbox tutar. Yerel görünüm güncellemesi ve outbox'a yazma tek IndexedDB transaction'ında yapılır. Yerel yazım başarısızsa başarı gösterilmez. Gönderilmekte olan kayıt, sunucu ACK'i gelmeden kuyruktan düşürülmez. Kuyruk `queued`, `in_flight`, `acknowledged`, `conflict`, `failed` durumlarını ve deneme bilgisini taşır; process/tab kapanmasından sonra yeniden alınabilen lease kullan.

UI açık durumları: “Bu cihazda kaydedildi — eşitleme bekliyor”, “Sunucuya kaydedildi”, “Çatışma çözülmeli”, “Kayıt başarısız”. Bekleyen işlem sayısı ve son başarılı eşitleme zamanı erişilebilir olsun. Çevrimdışı kayıt tarayıcı verileri tamamen silinirse kurtarılamayabilir; bunu gizleme. `navigator.storage.persist()` destekleniyorsa iste, sonucunu garanti sanma. Background Sync yalnız progressive enhancement; Safari'de veya kapalı uygulamada çalışacağı varsayılmasın. Açılış, yeniden görünür olma, ağın dönmesi ve elle tekrar deneme ana güvenilir tetikleyiciler olsun.

Çoklu sekmede aynı kuyruğun birden çok tüketicisini kontrol et; BroadcastChannel veya destek durumuna göre leader/lease kullan. Ağ bildirimi gerçek sunucu erişimi demek değildir. Exponential backoff+jitter, sınırlı retry ve görünür hata olsun. Kimlik süresi dolarsa kullanıcı tekrar oturum açana kadar kuyruğu koru; başka hesaba ait kuyruğu yeni hesaba gönderme. Çıkışta pending veri için açık seçenek sun; hesap değişiminde önceki kişinin verisini gösterme.

Değişiklik çekme cursor'u tutarlı ve atlama yapmayan bir protokol kullanmalı. Sırf BIGSERIAL/created_at değerinin commit sırasını temsil ettiğini varsayma; per-athlete transactionally ordered sequence veya test edilmiş eşdeğer çözüm seç. Snapshot bootstrap + cursor başlangıcı aynı tutarlılık sınırını paylaşsın. SSE/WebSocket yalnız hızlandırma olabilir; kopunca cursor ile pull doğruluğu sağlamalı. Başlangıçta polling daha sade ise onu seç.

## 11. API sözleşmesi ve hata davranışı

Sürümlemeli API tanımla. Örnek kaynaklar `/api/v2/me`, `/shifts`, `/programs`, `/session-prescriptions`, `/workout-sessions`, `/performed-sets`, `/meals`, `/hydration`, `/capabilities`, `/recovery`, `/reports`, `/sync/push`, `/sync/pull`, `/backups`, `/imports` olabilir; kesin URI'lar ADR/OpenAPI'de belgelenir. `/api/state` tüm veritabanını overwrite eden production yazım yolu olarak devam etmez. Eski import adaptörü normal kayıt yolundan ayrı ve yalnız açık eylemle kullanılabilir.

Hataları makinece okunabilir, Türkçe anlaşılır açıklaması olan sözleşmeyle döndür. 401/403, 409, 422, 429 ve 503 davranışları test edilsin. HTTP 500, yetki hatası ve timeout “boş veri” olarak ele alınamaz. Sunucuya erişilemiyorsa eldeki cache ve pending durum gösterilir; otomatik örnek veri oluşturulup sunucuya yüklenmez. Büyük listeler filtrelenir/sayfalanır; ham günlük geçmiş her render'da komple taşınmaz.

## 12. Eski verilerin kayıpsız taşınması

Aşama 0'da SQLite `app_state`, localStorage, IndexedDB, `.alosbackup`, medya ve kütüphane formatlarını ayrı envanterle. Kullanıcının gerçek verisine erişilemiyorsa kaynak kod ve sentetik fixture ile adaptörü geliştir; gerçek migration yapıldığını söyleme. Farklı origin'deki yeni Render sitesi eski localStorage'ı kendiliğinden okuyamaz; eski uygulamada açık export ve yeni uygulamada kullanıcı kontrollü import yolu tasarla.

Taşıma: tutarlı kaynak kopyası → dosya/format doğrulama → dry-run → mapping preview → kullanıcı/athlete eşleştirme → staging import → kayıt sayısı/ID/birim/tarih doğrulama → kullanıcı onaylı devreye alma. Kaynak dosya değişmez kalır. Yeniden aynı yedeği import etmek duplicate üretmez; import identity ve legacy ID mapping kullan. Aynı hareket/aynı gün/aynı tekrar olmasını tek başına duplicate kanıtı sayma.

Bilinmeyen alanları sessizce atma. Güvenli, sınırlandırılmış `legacy_extensions` veya karantina raporunda sakla. `week`, `scheduleByDate`, `weekOptimizations`, `trainingLogs`, `foodLogs`, `waterLogs`, `painLogs`, `sessionFeedback`, `futurePlans`, `sessionPrescriptions`, `activeGuidedWorkout`, `guidedWorkoutHistory`, `capabilityRecords`, kullanıcı ayarları, fotoğraflar ve kod incelemesinde bulunan diğer alanların eşleşmesini belgele. Eski hafta-index verisinin gerçek tarihi belli değilse “gelecek haftanın vardiyası” diye tahmin edip yazma.

Yeni ve eski sistemin aynı veri üzerinde bağımsız çift-yazım yapmasına izin verme. İlk taşımada legacy read-only snapshot; sonraki aşamalarda modül başına tek yazıcı ve açık cutover. Üretim geçişinde eski yazımların dondurulması, bekleyen offline işlemlerin çözümü, son snapshot ve rollback prosedürü tanımlı olsun. Eski sürüme dönmek yeni formatta üretilmiş kayıtları silmek anlamına gelmesin; reverse adapter yoksa kontrollü read-only veya forward-fix tercih et.

## 13. Program motoru: program sabit, doz gerekçeli

Ana hiyerarşi hedef → program sürümü → block/faz → haftalık mikrocycle → günün reçetesi → gerçekleşen seans olsun. Kullanıcının kabul edilmiş programını migration sırasında varsayılan şablonla ezme. Hiç program yoksa örnek başlangıç şablonu: Pazartesi Pull + Front Lever; Salı kolay/aerobik koşu; Çarşamba Push + Planche; Perşembe toparlanma; Cuma Legs + Hybrid; Cumartesi kolay/uzun koşu; Pazar toparlanma. Mesafe, yük, set, faz uzunluğu ve günler kullanıcıya atanmış sürümde düzenlenebilir.

12 haftalık döngü eski programdan geliyorsa koru; 4./8. haftada azaltılmış yük vb. fazları yapılandırılmış veri olarak taşı. Bütün sporcuların 12 hafta veya sabit yüzde deload gerektirdiğini bilimsel gerçek diye sunma. Program bittiğinde sessizce başa sarıp antrenman geçmişini sıfırlama; değerlendirme ve yeni blok seçimi sun.

Plan motoru mevcut performans, ekipman, süre, hedefler, tamamlanan hacim, kullanıcı öz-bildirimi ve veri kalitesini değerlendirir. Olağan durumda ana hareket kimliği, sıra ve uzun vadeli beceri hedefi korunur. Değişebilenler set, tekrar aralığı, yük, RIR, dinlenme, varyasyonun açık alternatif önerisi ve seans süresidir. Faz değişimi ve büyük program değişikliği görünür öneri/sürüm gerektirir. Gün kaydırma uygulanmadan gerekçe ve etkilenen tarihler gösterilsin; kullanıcının elle sabitlediği günler optimizer tarafından ezilmesin.

Karar çıktısı yalnız sayı değil: rule_id, model_version, kullanılan kayıtlar, eksik girdiler, eski/yeni doz, gerekçe, alternatifler ve onay durumu içersin. Bir sınır aşıldığında kullanıcıya tıbbi teşhis koyma. Ağrı/rahatsızlık sinyalinde konservatif seçenek ve gerektiğinde profesyonel değerlendirme öner; uygulama skoru güvenlik garantisi değildir.

## 14. Progresyon ve hareket kütüphanesi

Hareket kimliği ile varyasyonunu ayır. Bar/ring, strict/kipping, assisted/weighted, tuck/advanced tuck/straddle/full, tempo, ROM, tutuş, unilateral taraf ve ekipman metadata'sı olsun. Weighted pull-up ve ring dip için ek yük ile vücut ağırlığı ayrı; front lever için süre+varyasyon+teknik kalite ayrı. Her şeyi toplam tonaja çevirme. Tekrarlı hareketin e1RM hesabını izometrik beceriye veya destekli harekete doğrudan uygulama.

Progresyon kuralları sürümlü konfigürasyon ve geçmiş performansla belirlenir. Örneğin tanımlı tekrar bandı gerekli sayıdaki benzer seansta, hedef efor/kaliteyle tamamlanmışsa küçük yük artışı önerilebilir; eksik veriyle rastgele artış yok. Başarısız tek set otomatik büyük deload üretmesin. Plateau, yetersiz tekrar örneği, ağrı ve teknik bozulma farklı durumlar olsun. Ağır kuvvet, hipertrofi, beceri ve koşu için aynı ilerleme algoritmasını kullanma.

Calisthenics ilerlemesi önkoşul grafiğiyle ifade edilsin. Zor ring becerileri yalnız genel skor yükseldi diye önerilemez. Iron Cross/Maltese gibi öğelerin katalogda bulunması kişinin hazır olduğu anlamına gelmez. Bilimsel dayanağı zayıf süre/kuvvet eşiklerini “koçluk sezgisi/heuristic” olarak işaretle; gelişmiş hareketlerde teknik gözetim gereksinimini gizleme.

## 15. Guided Runner ve manuel kayıtların birleştirilmesi

`draft → ready → active → paused → completed/abandoned` geçişlerini tanımla. Hareket/set seviyesinde planned, started, completed, skipped ve substituted durumları olsun. Geçersiz geçişler sunucuda reddedilir. Görüntülemek antrenmana başlamak değildir. İlk gerçek set ile reçete kilidi aynı transaction'da alınır.

Runner açılırken seçili reçete ID'sini alır; önceki haftanın active state'ini bugün diye başlatamaz. Eski tamamlanmış seans history'de kalır. Başlanmış eski seans varsa “bu seansa devam et” veya yeni seansa git seçenekleri ve gerçek tarih görünür; otomatik silinmez. Geçmiş günü seçmek otomatik geçmişe antrenman kaydı yazma yetkisi değildir, açık eylem gerekir.

Guided ve manuel setler tek `performed_sets` kaynağına yazılır. Plan katkısı `prescription_item_id`/`planned_set_slot_id` ile ilişkilendirilir. Belirsiz eski kayıtlar için isim benzerliğiyle otomatik completed set üretme; eşleme öner ve kullanıcıya doğrulat. Aynı gün iki Pull seansı veya ad hoc pull-up'lar birbirinin yerini alamaz. Fazladan yapılmış setler extra olarak kalır ve fizyolojik yükten düşmez.

Runner'da önceki benzer performans, hedef ve yapılan yan yana olsun. Tek dokunuşla set tamamlama, kg/tekrar/saniye düzeltme, RIR/RPE, dinlenme sayacı, mola, geri al, not ve set atlama bulunmalı. Completed seans düzeltmesi orijinal zamanı korur; rapor ve PR yeniden hesaplanır. Timer sıfırlama ile set silme aynı işlem değildir. Telefon kilitlenip geri açılınca countdown timestamp'ten hesaplanır; kapalı PWA'nın arka planda sürekli JavaScript çalıştırdığı varsayılmaz.

## 16. Haftam, vardiya ve sürpriz plan

Vardiyayı kaydetmek ile haftayı optimize etmek iki bağımsız işlemdir. Vardiya seçimi change/blur veya kısa debounce ile yerel kuyruğa ve sunucuya gider; ayrıca görünür Kaydet vardır. Bütün ekrandaki default alanları her kayıtta sunucuya yazma; yalnız dirty alanlar PATCH edilir. Başka haftaya gezinince o haftanın formları gösterilir; boş bir haftaya öncekinin vardiyasını sessizce kopyalama. “Önceki haftayı kopyala” açık bir komut olsun.

Özel saatler, izin/yıllık izin, gece vardiyası, ulaşım, hazırlık, uyku hedefi ve sosyal plan pencereleri desteklensin. Optimizer önerdiği zaman aralığını kaydeder; HTML değil yapılandırılmış sonuç üretir. Giriş verisi değiştiğinde önceki sonuç kaybolmaz; “güncelliği kontrol edilmeli” durumu alır. Yeniden optimize işlemi önceki onayı ve elle sabitlenmiş seçimleri dikkate alır.

Sürpriz plan bir sosyal etkinlik veya gerçek ek fiziksel aktivite olabilir. Sosyal etkinliğe otomatik egzersiz yükü yazma. Gerçek aktivite yapıldı olarak onaylanınca uygun modalite yüküne kat. Kaçırılmış planı yapılmış ya da fazladan aktiviteyi ana programın tamamlanmış seansı sayma.

## 17. Toparlanma: veri, tahmin ve biyolojik gerçek ayrımı

İki ayrı çıktı üret: genel hazırlık değerlendirmesi ve kas grubu bazında tahmini kalan antrenman yükü/hazırlık değerlendirmesi. Uyku/HRV verisi olmayan kişiye sensör ölçümü varmış gibi sayı gösterme. Skor 0–100 ise ölçüm değil uygulama model skoru diye etiketle; yüzde işareti gerçek doku hasarını çağrıştıracak biçimde kullanılmasın. Eklem/tendon ağrısı ayrı sinyaldir; kas haritasının yeşil olması güvenle ağır antrenman yapılacağına garanti değildir.

Ham girdiler gerçek set/interval kayıtları, efor, hareket varyasyonu, zaman, ilgili uyku-beslenme-hidrasyon ve öz-bildirimlerdir. Kas yük dağıtımı sürümlü bir exposure modeli olsun. Kas uyarımı, kalan yorgunluk, metabolik yük, sprint maruziyeti ve ağrı tek yüzdeye eritilmesin. Sprint saniyesini otomatik hipertrofi setine çevirme. Bir interval hem koşu kaydında hem ad hoc kayıtta varsa canonical activity ilişkisiyle çift sayımı engelle.

Önce şeffaf bir başlangıç modeli kur. Zamanla sönen yük fonksiyonu kullanılırsa katsayılar “mühendislik başlangıç varsayımı” olarak kaydedilsin; 24–60 saat yarılanma veya belirli uyku çarpanı bireysel olarak doğrulanmış gerçek diye sunulmasın. Basit örnek `remaining_load(t) = Σ exposure_i × decay(model, elapsed, context)` olabilir; seçilen fonksiyonun birimleri, parametreleri ve sınırlılıkları açık olsun. Readiness skoruna dönüşüm ayrı, sürümlü ve sınırlandırılmış olmalı.

Uyku/beslenme etkileri zaman aralığına uygun işlenir. Bugün kaydedilen iyi uyku, veri hangi geceye aitse o aralığı etkiler; bütün geçmişe yanlışlıkla aynı çarpan uygulanmaz. Eksik kayıt nötr/bilinmiyor olarak ele alınır ve veri güveni düşer. Sadece protein hedefini tutturdu diye ölçülmemiş kas hasarı sıfırlanmaz. Belirsizliği klinik güven aralığı gibi pazarlama; “veri kapsaması/model sınırlılığı” ayrı gösterilsin.

Hesap, uygulamanın açık kalmasına bağımlı değildir. İstek anındaki `as_of` ve kayıtlar kullanılarak yeniden üretilir; sayfa kapalıyken her dakikada bir yüzde azaltıp DB'ye yazmak gerekmez. Cache anahtarı input revision + model version + as_of bucket içersin; zaman geçince ve yeni/düzeltilmiş veri gelince geçersizleşsin. Yeni yük ve bağlam değişimi olmayan kontrol testinde tahmini kalan yük artmamalı. Bu test fizyolojinin gerçek hayatta daima monoton ilerlediği iddiası değildir.

Geçmiş raporda “o gün bilinen verilerle verilmiş karar” ile “bugün düzeltilmiş kayıtlarla o günün yeniden hesabı” ayrılabilmeli. Yarın öğrenilen veriyi dünün canlı kararına sızdırma. Güvenilir dayanak yoksa kesin toparlanma saati verme; geniş, açıkça tahmini aralık veya yalnız yük trendi göster. Kişisel kalibrasyon ancak yeterli benzer gözlemle, zaman sıralı holdout değerlendirmesi ve konservatif fallback ile açılır; tek korelasyona nedensellik atfetme.

## 18. Bilimsel kütüphane ve kanıt politikası

Kütüphane bir arama sonucu deposu değil, denetlenebilir karar kayıtları kümesi olsun. Her kural: kimlik/sürüm, hedef/uygulama koşulu, kaynak başlığı, yazar-yıl, DOI/PMID/URL, erişim tarihi, popülasyon, antrenman deneyimi, ölçülen sonuç, kanıt tipi, sınırlılık, uygulama parametresi ve insan inceleme durumunu içersin. `reviewed`, `provisional`, `heuristic`, `deprecated` durumlarını ayır.

Kaynaklar için resmi meslek kuruluşu yayınları ve asıl araştırmalar/review'lar tercih edilsin; sosyal medya ve rakip pazarlama sayfası fizyolojik doğruluk kanıtı değildir. 2026 ACSM direnç antrenmanı bildirisi doğrulanmış başlangıç kaynaklarından biridir; genel sağlıklı yetişkin bulgularını ileri ring sporcularına koşulsuz taşımama. Kuvvet, hipertrofi, motor beceri, dayanıklılık, mobilite ve toparlanma için ayrı uygulanabilirlik değerlendirmesi yap. Hacim, frekans, efor, dinlenme, progresyon, hareket özgüllüğü ve concurrent training konularında kaynakların nerede anlaşamadığını da kaydet.

Bir kaynağın tamamı incelenmediyse “tam metin doğrulandı” deme. Referans uydurma, DOI/PMID ile başlık eşleşmesini kontrol et. Telifli tam metinleri izinsiz kütüphaneye gömme. Sayısal parametrenin bilimsel bulgu mu ürün varsayımı mı olduğunu test fixture'ında bile ayır. Kural güncellemesi doğrudan canlı plana uygulanmaz; sürüm, regression test, etkilenen karar diff'i ve geri dönüş yolu gerekir.

## 19. Capability Lab ve gelişim ölçümü

Calisthenics/rings, relative strength, absolute strength, power, speed, balance/control, work capacity, mobility ve endurance alanlarını koru. Her test kendi tanımı, ölçüm protokolü, birimi, yönü (yüksek/düşük daha iyi), tarafı, ekipmanı, varyasyonu, deneme sayısı, sonuç seçme kuralı, ölçüm zamanı ve notuyla kaydedilsin. “Front lever 19 sn” ile “tuck front lever 19 sn”, açık/kapalı göz tek ayak dengesi ve ring/bar muscle-up aynı seri değildir.

Muscle-up varyasyonları, false grip, ring support/RTO, ring pull-up/dip, weighted ring dip, ring L-sit, skin-the-cat, German hang, ring lever ve katalogdaki ileri beceriler korunmalı. Balance/control, ankle knee-to-wall, shoulder/wrist mobility, pull-up veya ring dip density, Cooper/koşu ve dayanıklılık testlerinde uygun input bileşeni ve birim kullanılmalı. Hareket adı serbest metin alias olarak desteklenebilir ama analiz canonical definition ID üzerinden yapılır.

Son değer, en iyi karşılaştırılabilir değer, protokol sürümü ve trend sun. Normatif veri yoksa dünya yüzdelik dilimi uydurma. Bir domain eksikse radar grafiğinde sıfır başarısızlık gibi gösterme. Y-Balance gibi türetilmiş ölçümlerin gereken girdileri yoksa eksikliği belirt. Kişisel rekor silme/düzeltmeden sonra yeniden hesaplanır. Test eklemek sıradan antrenmanın yerine sessizce maksimum deneme planlamaz.

## 20. Beslenme, hidrasyon ve günlük check-in

Öğün/yiyecek/gramaj/birim/kalori/makro kaydını düzenlenebilir ve idempotent yap. Tarif sürümü değişince geçmişte yenmiş öğünün besin değeri kendiliğinden değişmesin; kayıt anındaki besin snapshot'ı korunsun. Veri tabanı kaynağı, kullanıcı girişi ve tahmini değer ayrılır. Türkçe ondalık virgülü güvenli parse et; belirsiz birimleri kullanıcıya göster.

Günlük kaydın complete/partial/not_logged durumları olsun. Hiç yemek girilmemesi açlık veya sıfır protein kabul edilmez. Adaptif enerji tahmini yetersiz tartı/kayıt döneminde sınırlanır; tam olmayan kalori kayıtlarıyla aşırı hedef düşürme yok. Kilo trendi ile tek tartım ayrılır; su/glikojen değişimini kas kazanımı diye ilan etme. Giyilebilir kalorilerini otomatik ve eksiksiz geri-yeme önerisine çevirme.

Su kayıtları ayrı bir ledger olsun; öğünden gelen sıvı varsa açık politikayla işlenir, toplamda iki kez sayılmaz. Egzersiz süresi/çevre/öz-bildirim desteği varsa öneriyi bağlama uyarla; doğrulanmamış aşırı su hedefleri verme. Günlük uyku, stres, enerji, yorgunluk ve ağrı birim/kaynak/zamanıyla saklanır. Klinik belirtiyi uygulama hazırlık skoru açıklamaz.

## 21. Raporlar ve karar açıklamaları

Raporların temeli ham kayıtlar ve tanımlı hesap sürümleridir. Planlanan-gerçekleşen, kas bazlı haftalık exposure, set/tekrar/yük eğrileri, skill süreleri, koşu mesafe/tempo/interval yükü, uyku trendi, beslenme kayıt kapsaması, Capability gelişimi ve program uyumu ayrı okunabilmeli. Etkin set tahmininin varsayımları açıklansın. Tüm branşları tek toplam puana çevirme.

Her kartta zaman aralığı, birim, veri kapsaması ve gerekiyorsa son hesap zamanı göster. Tıklayınca dayanak kayıtlar açılsın; kullanıcı yanlış kaydı buradan düzeltebilsin. Trend, nedensellik veya kesin performans artış garantisi değildir. “Neden bu öneri?” açıklaması yapılan değişiklik, kullanılan veriler ve eksik girdilere bağlı olmalı; süslü ama kaynaksız LLM metni olmamalı.

Hesap başarısızsa grafik sıfıra düşmesin; son güvenilir sonucu eski olduğu etiketiyle veya hata durumunu göster. Geçmiş düzeltme, etkilediği türetilmiş verileri idempotent yeniden hesaplatır; bütün geçmişi her tuşta kontrolsüz rebuild etme. Filtre ve tarih değiştirmek veri mutasyonu değildir.

## 22. Kullanıcı deneyimi ve görsel devamlılık

Mevcut ürünün bölüm isimleri ve alışılmış temel yolunu korurken daha sade, tutarlı ve modern bir arayüz oluştur. İlk aşamada görsel yeniden tasarım için işlevleri feda etme. Tasarım token'ları, tutarlı tipografi/boşluk, açık-koyu tema, iyi dokunma hedefleri ve düşük dikkat yükü kullan. Gösterişli dashboard yerine hızlı kayıt öncelikli olsun.

Her sayfada üst alanda senkronizasyon durumu, Sürpriz Plan ve Tüm Verileri Yedekle erişimi korunsun. Mobilde aynı erişim kompakt menüye taşınabilir ancak gizlenip kaybolmasın. Bugün ekranı tek bakışta seçili/güncel tarih, günün planı, vardiya, özet hazırlık, veri eksiği ve birincil eylemi sunsun. Teknik engine sürümleri kullanıcı başlığını doldurmasın; ayrıntılar Sistem Durumu altında olsun.

Antrenmanda büyük kayıt kontrolleri, klavye dostu giriş, son performans ve geri alma bulunmalı. Optimize hafta restore edildiğinde gerçek veriyle çizilmeli, success toast'ın kaybolması veri kaybı gibi algılanmamalı. Her formda dirty/saving/local-only/synced/error state tasarla; route değiştirme ve tarayıcı kapatma kayıt protokolünün yerine geçmez.

WCAG 2.2 AA hedefiyle keyboard, focus, screen reader, contrast ve hata mesajlarını test et. Kırmızı/yeşil tek bilgi taşıyıcısı olmasın; sayı, metin ve legend olsun. 3B harita isteğe bağlı/lazy yüklensin; erişilebilir tablo ve 2B fallback bulunmalı. Mobile safe area, reduced motion, büyük yazı ve ağ hatası görünümü değerlendirilsin. Kullanıcının kişisel vücut görselleri varsayılan demo materyali değildir.

## 23. Yapay zekâ koçu: çekirdekten ayrı ve sınırlı

LLM ilk üretim çekirdeğinin zorunlu bağımlılığı değildir. İlk görevler açıklama, veriyle sınırlı özet ve kullanıcının onaylayacağı öneridir. Spor kararlarını ve hesapları deterministik domain servisleri üretir; LLM izinli, tipli araçlar üzerinden bunları açıklar. SQL, serbest ağ isteği, yedek silme veya sınırsız yazma yetkisi verme.

Planı değiştiren bir model önerisi proposed → reviewed/confirmed → applied yaşam döngüsünü izler. İstek anındaki athlete context ve model sürümü kaydedilsin; değişiklik sunucu kurallarından geçsin. İçe aktarılan notlar, web metinleri ve dokümanlar güvenilmeyen içeriktir; içlerindeki “talimatlar” yetki kazanamaz. Başka kullanıcı verisi veya sistem sırlarının çıkarılması red-team testine dahil olsun.

Harici modele veri paylaşımı açık izin, minimum bağlam ve sağlayıcı ayarlarıyla yapılır. Model adı veya fiyatı kodda varsayılmaz; yapılandırılır ve erişim doğrulanır. Rate limit, token/maliyet bütçesi, timeout ve deterministik fallback olsun. Uygulamanın kullanıcının biyolojisini kendiliğinden öğrendiğini söyleme; bunun için ayrı değerlendirilmiş kişisel model gerekir. “Bilimsel kütüphane arama” ile “model eğitimi” farklı özelliklerdir.

## 24. Entegrasyonlar ve gerçekçi platform sınırları

Önce manuel veri ve dosya import'u sağlamlaştır. Apple Health/HealthKit için gerçekten desteklenen native/iOS izin yolunu tasarla; sırf tarayıcıda oturum açmakla HealthKit verisi okunur gibi göstermeme. Garmin/WHOOP/Strava vb. için resmi API, erişim/partner şartları, rate limit ve kullanım lisansını doğrulamadan çalışan entegrasyon iddiasında bulunma.

Integration adapter kaynak kayıt ID'si, provider version, ingestion time, original time, birim, consent ve silme/geri çekme durumunu korusun. Aynı antrenmanın saat, manuel ve başka platform kopyaları körlemesine toplanmasın. Eşleme güveni düşükse kullanıcıya öneri sun. Bu entegrasyonlar 2.0 çekirdeğini bloke etmeyen sonraki kapsam olabilir; disabled durumları dürüstçe gösterilsin.

## 25. Kimlik, gizlilik ve güvenlik

İnternete açılan sürümde login, güvenli session yönetimi ve her kayda sahiplik kontrolü zorunlu. Tek kullanıcı kullanacak diye bütün sağlık verisini anonymous API'ye açma. Olgun, bakımlı kimlik araçları kullan; özel kriptografi icat etme. Cookie tabanlı session seçilirse HttpOnly/Secure/SameSite, CSRF koruması, session rotation/revocation ve uygun timeout uygula. Parolalar güncel güvenli hash yaklaşımıyla; sırlar environment/secret store'da; hiçbir anahtar frontend bundle'da olmayacak.

Public registration varsayılan kapalı veya davetli olsun. Aynı anda en az iki sentetik hesapla tüm endpoint, dosya URL'si, SSE/cursor ve export izolasyonu test edilsin. API kaynak IDsini değiştirmek yetki kazandırmaz. İçe aktarma dosyalarında boyut, schema, sıkıştırma oranı, path traversal, MIME ve script içeriklerini kontrol et; pickle veya çalıştırılabilir backup kullanma. SQL parametreli, UI output escaped/sanitized olsun.

Sağlık ve beden verisi loglarda açıkça bulunmasın. Loglar trace/operation/entity ID gibi teşhis için gerekli minimum bilgiyi taşısın. Medya private object storage ve süreli erişimle sunulsun. İndirme/yedek dosyalarının hassas olduğunu kullanıcı bilsin. Silme ve veri dışa aktarma mekanizmaları ile yedek/audit retention politikasını birlikte tasarla; “append-only” etiketi altında kişisel veriyi sonsuza kadar saklama. Hukuki uygunluk iddiası için ayrı inceleme gerektiğini belgele; kontrol listesi tek başına sertifika değildir.

## 26. Render dağıtımı ve işletim

Hedef: production'da Render Web Service, yönetilen PostgreSQL ve ihtiyaç varsa özel medya için object storage. Statik site tek başına API/backend çalıştırma çözümü değildir. HTTP process `0.0.0.0` ve ortamın `PORT` değerini kullanmalı. Local browser açan launcher production başlangıcı olmayacak. API ve frontend aynı container/origin'de sunulabilir; Node yalnız build aşamasında gerekebilir.

`Dockerfile`, lockfiles, `.env.example`, local compose, `render.yaml`, migration ve sağlık endpoint'lerini gerçek depo yollarıyla üret. Final Build/Start Command'ları çalıştırılmış yapıya göre ver; var olmayan requirements dosyasına komut uydurma. Production'da DATABASE_URL eksikken sessiz SQLite/demo fallback yapma; servis anlaşılır biçimde fail closed olsun. Statik dosya sunumu allowlist/dist sınırında kalsın; kaynak, yedek, .env veya DB dosyalarını servis etme.

Liveness ile readiness farklı olsun. DB bağlı değilse readiness başarısız; health endpoint'i kişisel durum/DB yolu açıklamaz. Migration'lar tek kontrollü job/pre-deploy aşamasında, kilitleme ve transaction politikasına uygun çalışır; her web worker schema değiştirmeye kalkmasın. Expand/contract yaklaşımı, eski istemci uyumluluk penceresi ve minimum client version tanımlansın. Eski PWA yeni API'ye uyumsuz yazmaya çalışırsa veriyi ezmek yerine açık güncelleme/queue koruma yolu göster.

Arka plan işlerinde kalıcı, idempotent job/outbox ve lease/backoff kullan; web process içindeki bellek kuyruğu tek güvence olmasın. Cache/state web process yeniden başlatılınca doğru kaynaktan okunabilmeli. Service worker kişisel API cevaplarını kontrolsüz ortak cache'e yazmasın; app-shell güncellemesi pending seti veya aktif Runner'ı yok etmesin. Maliyet, plan, backup retention ve uykuya geçen servis davranışını güncel resmi Render dokümanından doğrula; ücretli kaynak oluşturmak ayrıca yetki gerektirir.

## 27. Yedek, geri yükleme ve veri kaybı sınırları

Senkronizasyon yedek değildir. Revision history bağımsız felaket yedeği değildir. Sunucuya kaydetme, istemci offline kuyruğu, point-in-time recovery ve kullanıcı export'u farklı garantiler taşır. “Hiç veri kaybolmaz” deme; hangi arıza durumunun kapsandığını ve hangisinin kapsanmadığını açıkça tanımla.

Tüm Verileri Yedekle önce pending işlemleri durumlarıyla gösterir. Online canonical backup transactionally consistent veri snapshot'ı, manifest, schema/model sürümleri, medya listesi, record counts ve checksum'lar içerir. Pending offline komutlar varsa ya önce senkronize edilir ya ayrı journal ve belirgin uyarıyla export'a eklenir; tamamı sunucudaymış gibi etiketlenmez. Private medya yüklemesi henüz bitmediyse backup “tam” sayılmaz. Yedek alındıktan sonra başarı zamanı/konumu göster; aynı anda iki export'u sınırlamak kayıtları engellememeli.

Otomatik veritabanı yedekleri ve mümkünse PITR seçilen sağlayıcı planıyla doğrulansın. Bağımsız/başka hata alanında şifreli kopya ve retention politikası tanımla. Kaynak DB'nin kendisiyle aynı tek diskteki ek dosya yeterli strateji değildir. Restore üretim DB'sine direkt overwrite yapmaz: isolated restore → schema/integrity/media kontrolü → dry-run farkı → kullanıcı onayı → kontrollü cutover. Başka kullanıcının verisini içeren tam DB yedeği kişisel export yerine sunulamaz.

RPO/RTO ölçülebilir hedef olsun: örneğin seçilen altyapı gerçekten destekliyorsa merkezi felaket için RPO ≤15 dakika, RTO ≤60 dakika hedeflenebilir; test edilmeden vaat edilmez. ACK almış işlemler normal restart/deploy/crash senaryosunda korunmalı. ACK almamış offline işlemlerin cihaz storage'ı silinirse geri getirilemeyebileceği belirtilmeli. Restore tatbikatını otomatik test/staging süreçlerine dahil et ve ölçülen sonucu yaz.

## 28. Test stratejisi ve kabul kapıları

`03_ACCEPTANCE_MATRIX.md` minimum regression sözleşmesidir. Sadece unit veya dosyada metin arama testleri yeterli değildir. PostgreSQL üzerinde gerçek transaction/concurrency testleri; HTTP entegrasyon; UI+API+DB e2e; migration roundtrip; offline/reconnect; iki tarayıcı context'i ve restore senaryoları olmalı. Browser WebKit testini gerçek iPhone Safari testi yapılmış gibi adlandırma; gerçek cihaz kontrolünü ayrı raporla.

Test fixture'ları izole, deterministik ve clock enjekte edilmiş olsun. System Integrity canlı kullanıcı DB'sini değiştirmez. Arayüz butonları gerçek API'ye bağlı sınanır; placeholder/mock sonuçla production davranışı doğrulanmış sayılmaz. Property testleriyle aynı op tekrarında tek etki, deterministik model, birim dönüşümü ve kayıtların korunması kontrol edilsin.

Her aşamada typecheck, lint, ilgili unit/integration ve e2e testlerinin komutları/exit code'ları kaydedilir. Test geçsin diye assertion gevşetme, fixture'ı üretim hatasını gizleyecek şekilde değiştirme veya failing testi sessiz atlama. Ortam bağımlılığı yoksa sonucu BLOCKED/NOT RUN göster. Önceden mevcut başarısızlık ile yeni regression'ı ayır. Güvenlik ve veri kaybı kapısı başarısızken özellik veya animasyon ekleme.

Başlangıç performans bütçeleri ölçülecek hedeflerdir: belirlenmiş referans cihazda set işlemi yerel görsel yanıt p95 <100 ms; belgelenmiş sıcak staging yükünde olağan okuma p95 <500 ms/yazma p95 <800 ms; açık uygulamada normal ağda yeniden bağlantı sonrası küçük kuyruğun yakınsaması <15 sn. Veri seti, eşzamanlılık, donanım ve test süresi belirtilmeden bu sayıları başarı diye verme. Ağ/LLM kesintisi kullanıcı girişini kilitlemesin; uzun rapor jobs/recompute görünür durumla çalışsın.

## 29. Aşamalar ve teslim biçimi

Aşama 0: gerçek repo keşfi, riskler, mevcut davranış/test tabanı, veri/özellik haritası, ADR, plan. Aşama 1: auth+DB+API+sync temelinde vardiya kaydet/yeniden aç/iki cihaz ilk dikey dilimi. Aşama 2: legacy migration ve gerçek yedek/restore. Aşama 3: program/reçete/Runner/manuel kayıt. Aşama 4: nutrition, su, check-in, Capability. Aşama 5: bilim kütüphanesi, yük/recovery, raporlar. Aşama 6: bütün ekranların UX/PWA/erişilebilirlik ve feature parity tamamlanması. Aşama 7: optional AI/adapters, yalnız önceki çekirdek kapıları geçtiyse. Aşama 8: production hardening, Render staging, felaket kurtarma, kontrollü yayın. Aşama 9: bağımsız red-team/regression/release incelemesi.

Her teslimatta ne değiştiğini, test edilen kullanıcı yolunu, schema/migration etkisini, gerçek test komutlarını, kalan riskleri, feature flag/rollback yolunu ve sonraki tek önerilen aşamayı yaz. Güncel `STATUS.md`, `PLANS.md`, `REQUIREMENTS_TRACEABILITY.md` ve ADR'leri bırak. Çalışma ortamında production deploy yetkisi yoksa deploy edilmediğini açıkça söyle; bir dosya hazırlamış olmak canlı hizmeti değiştirmiş olmak değildir.

## 30. Nihai kabul ve şimdi başlayacağın iş

Yeni ürün ancak kullanıcının gerçek verisine uygun migration yolu, korunmuş özellikler, açık senkronizasyon durumu, iki cihazda yakınsama, anlaşılır Runner, yeniden hesaplanabilir raporlar, yetki izolasyonu ve restore kanıtı birlikte bulunduğunda 2.0 release adayıdır. Bilimsel model kalite denetimi, yazılım testlerinin geçmesinden ayrı bir kapıdır.

Şimdi Aşama 0'ı uygula. Önce mevcut dosyaları/ortamı incele, raporları iddia olarak ele al, riskleri yeniden üret, gerçek test durumunu raporla ve uygulanabilir küçük aşamalara böl. Eski uygulamayı silme, yeni boş demo oluşturup bütün ürünün yerine sunma, production verisine dokunma. İlk aşamanın sonunda bir sonraki dikey dilimin açık dosya ve kabul planı hazır olsun.
