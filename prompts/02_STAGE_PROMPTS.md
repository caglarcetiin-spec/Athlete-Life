# Athlete Life OS 2.0 — Bütün aşama promptları

Her görevde yalnız bir aşama kullanılmalıdır. Ana şartname kalıcı repo bağlamıdır.


---

# Aşama 0 — Mevcut sistemi anla, çalıştır ve geçişi planla

Ana şartnameyi, kabul matrisini, mevcut AGENTS.md/PLANS.md/STATUS.md dosyalarını oku. Bu aşamada uygulamayı yeniden yazma; yalnız keşif, test tabanı ve mimari geçiş planını gerçekleştir. Branch/worktree durumunu kontrol et; kullanıcı değişikliklerini koru.

Gerçek dosya ağacını, giriş noktalarını, global state okuyucu/yazıcılarını, API endpoint'lerini, kayıt biçimlerini, zaman yardımcılarını, motor bağımlılıklarını, service worker davranışını ve tüm kullanıcı ekranlarını çıkar. Özellik açıklamalarının kodda gerçekten karşılığı olup olmadığını sınıflandır. `AthleteProgramEngine` gibi isimlerin dosyada değil app.js içinde bulunabileceğini dikkate al.

Mevcut test komutlarını keşfet ve uygun izolasyonda çalıştır. stdout/stderr/exit code'larını kişisel bilgi içermeyen artefact'lara kaydet. Çalışmayan bağımlılık veya cihazı NOT RUN/BLOCKED olarak göster. Eski dosyalardaki “35 test geçti” ifadesini yeni sonuç sanma. Görsel inceleme aracı varsa mevcut ekranların anonim referans görüntülerini çıkar; yoksa görsel pariteyi doğrulanmış sayma.

Eski snapshot overwrite riskini gerçek kullanıcı verisi olmadan yeniden üret. Kaydet toast'ının hangi persistence aşamasını temsil ettiğini izle. İki istemcinin eski/new state ilişkisini, startup sırasında cache/server kararını, boş API yanıtı ve cache fallback'ini incele. Aktif Runner/date ve vardiya optimizasyonunun nerede saklandığını belirle.

Üretilecek belgeler: `docs/architecture/CURRENT_SYSTEM_MAP.md`, `FEATURE_PARITY.md`, `LEGACY_DATA_MAP.md`, `RISK_REGISTER.md`, `TEST_BASELINE.md`, mimari ADR'ler, `PLANS.md`, `STATUS.md`, `REQUIREMENTS_TRACEABILITY.md`. Her bulgunun dosya/fonksiyon/satır dayanağı ve doğrulama türü olsun.

Mimari ADR'lerde modüler monolit, backend, frontend, PostgreSQL, auth, offline sync, job/outbox, same-origin dağıtım ve migration yöntemini gerekçelendir. Ana şartnamedeki varsayılan yığını sırf farklılık için değiştirme; gerçek teknik neden varsa karşılaştır. İlk dikey dilimi kullanıcı girişi → vardiya düzenleme → kalıcı transaction → yeniden açılış → ikinci cihaz olarak tasarla.

Kabul kapısı: kaynak/özellik/veri haritası tamam, büyük riskler sınıflı, baseline gerçek sonuçlu, kararlar açık ve Aşama 1'in dosya/test planı uygulanabilir. Bu aşamanın sonunda “2.0 tamamlandı” deme. Sonraki aşama için plan bırak; uygulama kodunu toptan değiştirme.


---

# Aşama 1 — Güvenilir çekirdek ve ilk çalışan vardiya akışı

Aşama 0 belgelerini ve ana şartname 4–12, 16, 25–28 bölümlerini oku. Amaç mimari iskelet değil, uçtan uca çalışan ilk dilimdir. Yeni sistem mevcut ürünün yanında branch/feature flag ile gelişsin; eski veriye production yazımı yapma.

Onaylı frontend/backend/PostgreSQL düzenini kur. Migration, test DB'si, config doğrulaması, güvenli auth/session ve resource sahipliği ilk günden çalışsın. Shared type/API sözleşmesini üret. Production'da credentials eksikse demo auth bypass olmasın. Sentetik iki kullanıcı oluşturulabilen test fixture'ları ekle.

Vardiya ve hafta optimizasyonu için ayrı modeller/komutlar geliştir. Aynı haftanın her günü/custom vardiya saati/off/annual/social plan alanlarını destekle. Yalnız dirty alanlar gönderilsin; ekran açılması yazma yapmasın. Save butonu, autosave ve optimize eylemi birbirine karışmasın. Optimizer sonucu structured ve revision-tagged kaydedilsin; tekrar açılışta gerçek sonuç okunabilsin.

Kayıt işlemi version kontrolü, idempotency, audit/change log/outbox ve commit ACK'ini kapsasın. IndexedDB yerel cache+durable outbox ile offline kayıt çalışsın. UI local-only/synced/conflict/error durumlarını göstersin. Bekleyen request'i ACK olmadan silme; restart sonrası in-flight işlemi idempotent tekrar gönder. İki sekme/cihaz için stale-write ve cursor yakınsamasını sınayacak gerçek integration testleri kur.

İlk çalışan kullanıcı yolu: login → haftaya git → Salı 14–22 vardiyası gir → sunucu onayı → optimize et → kapat/yeniden aç → aynı vardiya/optimizasyon → ikinci context'te aynı veriyi gör. Ardından ağ kapalıyken değiştir → yerel durum görünür → online → sunucuya tek kez kaydet. Aynı alanın iki cihazda farklı değişimi sessizce kaybolmasın.

Kabul: P-01..P-15, T-01..T-04 ve S-01/S-02'nin bu dilime uygulanabilir bölümleri gerçek testte geçsin. Doğrudan server restart ve tarayıcı cache temizlendikten sonra yeniden login senaryosu olsun. Bunlar geçmeden yeni science veya grafik ekleme. Teslimat: çalışan dilim, schema/endpoint/test kanıtı, kalan sınırlar, feature flag ve rollback yöntemi.


---

# Aşama 2 — Eski veriyi taşı ve geri yüklemeyi kanıtla

LEGACY_DATA_MAP ve ana şartname 12/27'yi esas al. Kullanıcının gerçek verisine otomatik eriştiğini varsayma. Kod ZIP'i gerçek SQLite/IndexedDB içeriği değildir. Geliştirme sentetik anonim kaynaklarla çalışsın; production import ayrıca kullanıcı kontrollü olsun.

Legacy SQLite app_state, localStorage export, .alosbackup ve medya formatları için format algılama/doğrulama ve idempotent import oluştur. Her eski alanı yeni varlığa veya korunmuş legacy_extensions alanına eşleştir. Tarih-only ve bilinmeyen kaynak/ünite/egzersiz durumunu raporla; import zamanı gerçekleşme zamanı olmasın. Görünürde aynı iki antrenmanı kanıtsız birleştirme.

Dry-run kullanıcıya varlık sayıları, değişecek kayıtlar, duplicate adayları, medya eksiği ve belirsiz tarihleri göstersin. Kaynak değişmez kalsın; staging import ve semantic count/checksum kontrolleri sonrasında açık onaylı aktarma olsun. Aynı dosyayı ikinci import duplicate üretmesin. Kesintiye uğramış import ya transaction rollback ya görünür resume ile tutarlı kalsın.

Yeni kişisel tam export formatı: manifest, schema sürümü, filtrelenmiş athlete kayıtları, model/provenance, medya referansları ve checksum. Pending offline işlemler export'ta kaybolmasın; canonical ve pending veri ayrımı anlaşılır olsun. Yetkisiz kullanıcı başka kişinin backup'ını alamamalı. Büyük/kötücül/sıkıştırma bombası/path traversal dosyaları testle reddet.

Geri yüklemeyi sadece dosya üretimiyle doğrulama. Boş izole veritabanına import et, kullanıcı ekranlarından vardiya, Runner geçmişi, yemek, su, Capability ve fotoğrafın açıldığını doğrula. Değişiklik/silme geçmişinin audit retention politikasına uygun durumunu denetle. Farklı origin'den taşıma için old-app-export/new-app-import kılavuzu yaz.

Kabul: M-01..M-08 ve B-01..B-06 uygulanır; gerçek kullanıcı verisi yoksa sentetik roundtrip başarı, gerçek migration NOT RUN diye ayrılır. Sonuç: importer/exporter/restore araçları, format spec, migration mapping ve tekrar üretilebilir restore testi. Veri korunmadan sonraki modüllere geçme.


---

# Aşama 3 — Tek reçete, tek gerçek antrenman kaydı

Ana şartname 8/13/14/15'i ve mevcut program şablonlarını oku. Kullanıcının korunmuş programını varsayılan 12 haftalık şablonla ezme. Program, planlanan reçete, plan slotu, gerçek workout session ve performed set modellerini ayır. Aynı tarihte iki antrenman mümkün olsun.

Deterministik program motorunu saf domain servisleriyle kur. Günlük hazırlık program kimliğini rastgele değiştirmesin. Her doz önerisinde rule/model version, girdi lineage, önce/sonra, eksik veri ve karar açıklaması olsun. Program değişiklikleri sürümlensin; elle sabitlenmiş tarihler ve başlanmış seanslar korunur.

Runner'ı state machine ile uygula. Haftalık plan/hazır antrenman/Runner aynı prescription ID+version kullansın. Seans açılınca değil ilk gerçek execution'da reçete kilitlensin. Eski tamamlanmış Runner yeni günü ele geçiremesin. Başlanmış eski seans doğru tarihli devam seçeneği sunsun; kapatılınca setleri korunabilsin.

Manuel ve guided set aynı tabloya yazılsın, slot referansıyla uzlaştırılsın. İsim benzerliğiyle geçmiş setleri yanlış antrenmana bağlama. Planned, extra, skipped ve substituted durumları açık olsun. Bir set işlem ID'siyle iki kere kaydedilemesin. Past edit occurred_at'ı korusun, updated_at/audit yeni olsun.

Telefon kullanımı için hedef/önceki/yapılan değerler, bir dokunuş tamamla, uygun kg/tekrar/saniye girişleri, RIR/RPE, dinlenme, mola, skip, undo, not ve offline queue görünümü ekle. Timer deadline/pause bilgisinden geri kurulsun. Timer reset set deletion olmasın. Crash/reload/ekran kilidi sonrası aynı gerçek seans kaldığı yerden açılsın.

Kabul: W-01..W-12 ve tarih testleri geçsin. Golden journey: 4 setlik reçetede 2 manuel set → Runner üçüncü slottan → offline üçüncü set → kapat/aç → online → yalnız toplam 3 gerçek set. Aynı gün ikinci seans veya farklı varyasyon bu eşleşmeyi bozmamalı. Teslimat planlama/execution ayrımı ve tüm state transition kanıtlarını içersin.


---

# Aşama 4 — Beslenme, günlük yaşam ve Capability kayıt bütünlüğü

Ana şartname 16/19/20'yi uygula. Önceki migration'dan gelen tüm kayıt ve alanlar korunmalı. Bütün mutation'lar ortak authorization/idempotency/version/outbox sözleşmesini kullansın; hiçbir modül özel localStorage ana deposu yaratmasın.

Öğün, tarif, yiyecek, gramaj, makrolar, su ve günlük check-in CRUD akışlarını yap. Food recipe sürümü ile consumption snapshot ayrı; geçmiş tarif değeri sessizce değişmesin. Nutrition day complete/partial/not_logged ayrımı, sleep night interval, ağrı bölgesi, vücut ölçümü ve kaynak alanları olsun. Türkçe ondalık virgül ve birim doğrulaması backend'de de test edilsin. Gün değişimi veri silmesin.

Capability Lab'de calisthenics/rings, kuvvet, power/speed, balance/control, mobility, work capacity ve endurance alanları eksiksiz olsun. Her test protocol version, birim, varyasyon, taraf, ekipman, occurred_at, deneme seçimi ve not taşısın. Eksik alanı 0 skor diye doldurma. Önceki muscle-up ve rings kataloğunun feature parity eşleşmesini göster.

Türetilmiş ölçümü gereken girdiler eksikse üretme. Farklı varyasyon/protokol aynı PR grafiğinde birleştirilmesin. Silinen veya düzeltilmiş sonuç sonrası güncel PR yeniden hesaplanabilsin. Katalogda ileri ring hareketi olması otomatik egzersiz reçetesi oluşturmasın.

Sürpriz plan/sosyal aktivite ve gerçek ad hoc fiziksel aktivite ayrımını uygula. Planlandı ile yapıldı farklı; sadece planlanan aktivite gerçek enerji/egzersiz yükü oluşturmasın.

Kabul: N-01..N-06, C-01..C-06 ve tüm veri edit/delete senaryoları çalışsın. Her modül kapat/aç/ikinci cihaz/export roundtrip testine dahil olsun. Henüz hesaplanmayan recovery veya kişisel öğrenmeyi çalışıyor diye göstermeden sadece gerçek kayıt akışını teslim et.


---

# Aşama 5 — Açıklanabilir bilim, yük, toparlanma ve raporlar

Ana şartname 17/18/21'i oku. Bu aşama tıbbi cihaz, gerçek kas hasarı ölçer veya doğrulanmış dijital ikiz üretme değildir. Ham veriden açıklanabilir ve sürümlü karar desteği üretir. Yazılım doğruluğu ile biyolojik geçerliliği ayrı raporla.

Evidence registry'yi schema ve kaynak doğrulamasıyla kur. Reviewed/provisional/heuristic ayrımı olsun. Bilimsel kuralın kapsamı, popülasyonu, ölçülen sonucu, sınırlılığı ve product parameter eşlemesi bulunsun. Kaynağa erişilemiyorsa uydurma; doğrulanmadı işaretle. Product rakip dokümanını biyolojik kanıt sayma.

Strength, isometric skill, sprint/cardio ve ad hoc circuit yük adapter'larını oluştur. Ham modalite yükü ve kas exposure'ı ayrı; sprinti hipertrofi setine otomatik çevirmeme. Duplicate activity ilişkilerini çöz. Global readiness, muscle-local load/readiness ve pain sinyali ayrı görünsün. Sleep/food/water verisi absent/partial ise sıfır kabul etme.

Recovery'yi clock injection, as_of, input revision ve model version ile yeniden hesaplanabilir kur. Model varsayımları kullanıcı tarafından anlaşılır olsun. Uygulama kapalıyken tick biriktirmeye gerek kalmasın. 6/12/24/48 saat ve geç veri/düzeltme senaryoları aynı saf fonksiyonlarla sınansın. Hiç yeni maruziyet/bağlam değişikliği olmayan koşulda model residual yükü artmasın; bunu gerçek fizyoloji garantisi diye yorumlama.

Geçmiş karar snapshot'ı ile bugünkü bilgiye göre düzeltilmiş rapor ayrımı ve input lineage uygula. Güven düzeyi verinin kapsaması/model sınırlılığıdır; kalibre edilmemiş olasılık değildir. ETA desteklenmiyorsa kapalı tut. Kişisel kalibrasyon için yeterlilik kriteri, zaman sıralı validasyon, baseline karşılaştırması ve rollback oluştur; veri yetersizse base model devam etsin.

Raporlar günlük/haftalık/pencere bazlı gerçek kayıtları gösterebilsin; tıklanan metriğin kaynak kaydına gidilebilsin. Geçmiş set düzeltmesinin ilgili grafik ve PR'a yansımasını göster. Science policy ana programı sessizce yeniden sıralayamasın.

Kabul: R-01..R-10; deterministik model ve source-to-metric golden fixtures. System Integrity her fixture'ı ayrı immutable input olarak kullansın, test edilen canlı DB'yi değiştirmesin. Sonuçlar: çalışan hesaplar, model card, kaynak kayıtları, güven/eksiklik UI'ı ve hangi varsayımların henüz kişisel doğrulama almadığı.


---

# Aşama 6 — Bütün ürünün kullanım kolaylığı ve görsel devamlılığı

FEATURE_PARITY envanterini ve ana şartname 22'yi oku. Yeni arayüz bir landing page/mockup değil, daha önceki aşamalarda yazılmış gerçek API akışlarının bütünüdür. Kullanıcının eski bölüm isimleri ve alışılmış erişimlerini koru; eksik özellikleri gizleyerek parity tamamlandı deme.

Mobil-first design system kur. Bugün, Haftam, Antrenman, Beslenme, Raporlar, Capability Lab ve Sistem Durumu tüm kayıt/boş/yükleniyor/offline/conflict/error varyantlarıyla tutarlı olsun. Toplu teknik motor loglarını ana ekranlardan ayır. Sürpriz Plan, Tüm Verileri Yedekle ve sync durumu tüm route'larda erişilebilir olsun.

Runner tek elle kullanılabilir, minimal dikkat gerektiren ve erişilebilir input'larla çalışsın. Tarih ve seçili seans görünür; geçmiş edit ile bugünkü başlangıç karışmasın. Form üzerindeki bilgi server state ile aynı olmadığı sırada save status açık olsun. Chart ve kas haritasında sadece renk değil metin/legend/tablo olsun. 3B içeriği gerektiğinde yükle, işlevsel fallback sağla.

PWA app-shell, offline izin sınırı, service worker update, eski client compatibility ve cache ownership'i uygula. API/private responses generic ortak cache'e girmesin. Pending mutation varken güncelleme veya logout veri silmesin. Offline yeni login mümkün değilse erişim sınırını açık göster; daha önce yetkili local cache politikası belgeli olsun.

Otomatik Playwright Chromium/WebKit/Firefox uygunsa çalıştır; keyboard/focus/contrast/screenreader/a11y kontrolleri ekle. Gerçek iPhone testini ayrı kontrol listesi olarak gerçekleştir veya NOT RUN bırak. Kendi tarayıcı görüntülerini ve network/database doğrulamasını kullan; mock screenshot'ı gerçek akış kanıtı sayma.

Kabul: U-01..U-06 ve bütün feature parity satırlarının gerçek durumları. Henüz taşınmayan kritik özellik varken release kapısı geçmez. Test edilen viewport, cihaz/tarayıcı ve performans sonuçları raporlanır.


---

# Aşama 7 — İsteğe bağlı AI koçu ve entegrasyon sınırları

Yalnız önceki çekirdek kabul kapıları geçmişse ve bu aşama açıkça seçilmişse uygula. Ana ürün dış LLM bağlantısı olmadan tamamen çalışmaya devam etmelidir. Ana şartname 23/24'ü esas al. Henüz erişilemeyen sağlayıcı/cihazı çalışan özellik gibi gösterme.

İlk AI kapsamı read-only özet ve açık onay isteyen plan önerileridir. Tipli, athlete-scoped araçlar kullan; serbest SQL, arbitrary URL fetch veya doğrudan veri silme yok. Hesapları domain servisleri yapsın. Gönderilen bağlam minimum, consent ve model/provider yapılandırması açık olsun. Maliyet/rate limit/timeout/kapalı hizmet fallback'i çalışsın.

Karar önerisi rule/input/model version bilgisiyle saklansın. LLM anlatımı eksik veriyi tamamlamasın, korelasyonu nedensellik saymasın, tıbbi teşhis veya kas hasarı yüzdesi uydurmasın. Harici metin ve kullanıcı notu prompt-injection test fixture'ı olarak sınansın; araç yetkileri bu metinlerle genişleyemesin.

Önce import/export adapter arayüzünü uygula. Apple Health gerekiyorsa native HealthKit izin ve uygulama gereksinimini açık tasarla; web uygulamasından doğrudan veriyi okuyormuş gibi yapma. Diğer platformlarda resmi API/partner erişimi ve gerçek token yoksa connector unconfigured olsun. Erişim/ücretli kaynak oluşturma için ayrıca onay gerektir.

Kabul: A-01..A-04. LLM kapalıyken login, vardiya, program, Runner, geçmiş, rapor ve backup yolları geçsin. Başka kullanıcının verisine yönelik adversarial istekte izolasyon korunsun. Bu aşama tamamlanmamışsa AI özelliği kapalı olarak çekirdek release devam edebilir; kullanıcıya durum dürüstçe gösterilir.


---

# Aşama 8 — Render staging, güvenlik ve felaket kurtarma

Ana şartname 25–28'i ve ADR'leri oku. Bu prompt kod/konfigürasyon/test hazırlığına yetkilidir; ücretli kaynak yaratma, production verisini taşıma ve canlı deploy ayrıca açık kullanıcı yetkisi gerektirir. Credential yoksa kurulum artefact'larını üret, gerçek deploy durumunu NOT RUN olarak göster.

Onaylı stack için gerçekten çalışan Docker build/local compose/Render Blueprint oluştur. Backend 0.0.0.0:$PORT; frontend statik dist sınırında; PostgreSQL authoritative; production'da eksik DB ayarında SQLite/demo fallback yok. Node frontend build, Python runtime, migration ve health/readiness komutları gerçek dosya yollarına uygun olsun. Final Build/Start Command'larını yalnız test edilmiş yapı üzerinden yaz.

Secrets, auth, CSRF/CORS, rate limit, ownership, import dosya kısıtları, media privacy, security headers ve audit/log redaction kontrolü yap. Hata izleme kullanıcı verisini sızdırmasın. Health endpoint public DB yolu veya kişisel durum göstermesin. DB/worker lease/outbox crash recovery testi yap.

Migration'ı kontrollü tek adımda çalıştır; N ve N-1 client API uyumluluğunu kontrol et. Deploy sırasında aktif antrenman ve pending offline kuyruk korunmalı. Eski client'ten gelen incompatible yazı güvenli reddedilmeli; data wipe ile düzeltilmemeli. Basit tek-instance yapı yeterliyse gereksiz service ağı ekleme.

Backup/PITR koşullarını seçilen Render planının resmi dokümanlarıyla doğrula. Restore için isolated database, medya kontrolü ve bilinçli cutover prosedürü oluştur. Sentetik gerçek DB yedeğini geri yükle; ölçülen RPO/RTO'yu, veri sayısı ve hash kontrolünü raporla. Sadece provider snapshot var diye kurtarma doğrulandı deme.

Kabul: B-01..B-06, S-01..S-06, O-01..O-05 ve açık core regression'ların tamamı. Üretim verisine geçmeden feature parity, migration, bağımsız restore, yetki izolasyonu ve rollback kapıları kapanmış olsun. Yetki varsa staging smoke test sonuçlarını ver; yoksa yapılması gereken manuel adımları ve gerekçeli BLOCKED alanları bırak.


---

# Aşama 9 — Bağımsız release incelemesi

Uygulamayı ilk kez gören bağımsız reviewer olarak davran. Önceki geliştiricinin özetini başarı kanıtı sayma. Ana şartname, acceptance matrix, feature parity, diff, migration ve gerçek test artefact'larını oku. Başlangıçta geniş yeniden yazım yapma; önce bulguları yeniden üret.

Öncelik sırası: veri kaybı/sessiz overwrite; kullanıcılar arası erişim; hatalı offline ACK/dedup; tarih/Runner bağlam hatası; migration/restore kaybı; ölçülmemiş biyolojik kesinlik; mevcut özelliğin kaybolması; UI erişilebilirliği/performans. Her bulgu dosya/konum, tekrar adımları, beklenen/gerçek, etkisi, kanıtı ve minimal düzeltme önerisi içersin.

Özellikle iki cihazda aynı veri sürümünü aç → farklı kayıt ekle → gecikmeli response/retry üret → yeniden aç → her kayıt korunuyor mu kontrol et. ACK sonrası server restart ve cache wipe sınansın. Geçmiş workout edit occurred_at'ı değiştiriyor mu, recover model future data sızdırıyor mu, boş nutrition sıfır sayılıyor mu, screenshot'lar gerçek API'den mi doğrula.

Test dosyası sayısına veya coverage yüzdesine tek başına güvenme. Assertions iş kuralını gerçekten koruyor mu ve fixture isolation var mı incele. Paketlenen seed/test verisi kişisel veri içeriyor mu kontrol et. Ücretli cloud/production işlem yapma yetkin yoksa o kanıtı eksik işaretle.

Sonuç `GO`, `CONDITIONAL`, `NO-GO` biçiminde release mühendisliği kararı olsun; kritik veri/güvenlik eksiği varsa NO-GO. PASS/FAIL/BLOCKED/NOT RUN ayrımı, en önemli açık sorunlar ve kapatılması gereken kabul ID'lerini yaz. Varsayımsal riski doğrulanmış güvenlik açığı, otomatik test başarısını biyolojik doğruluk veya gerçek iPhone testi olarak sunma.

