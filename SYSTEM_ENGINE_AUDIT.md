# Uygulama motorları ve entegrasyon denetimi

Tarih: 16 Eylül 2026.

## Sonuç

Sağlık kaydetme, geçmiş antrenman tarihi ve sunucu kayıt sıralaması düzeltildi.
Motorlar aynı `db` nesnesini `ALOSRuntime` üzerinden kullanıyor. Kaydetme sonrasında
`AthleteCoordinator` ölçüm kayıtları → fizyolojik yük → kişisel kalibrasyon → plan →
ortak antrenman reçetesi → Runner → analiz → ekranlar sırasıyla yeniliyor.
Bu sıralama ve veri değişikliklerinin tüketicilere ulaşması gerçek uygulama
JavaScript dosyaları birlikte yüklenerek test edildi.

Tam liste: [Motor ve parametre envanteri](SYSTEM_PARAMETER_INVENTORY.md).
Envanter 48 JavaScript modülünü, 212 form alanını, kaynakta erişilen kalıcı ayarları,
fonksiyonları ve JSON kural/katalog dosyalarını içerir.

10.1 güncellemesinin tarih, GLB, toparlanma ve manuel dönem işleyişi ile doğrulama
sonuçları: [V10_1_CHANGES.md](V10_1_CHANGES.md). `TrainingPeriods` ortak plan hattına
eklenmiştir. Güncel JavaScript regresyon paketi 41 dosyadan oluşur.

## Motor grupları ve ortak çalışma

| Grup | Motorlar / kaynaklar | Girdi ve ortak çıktı |
|---|---|---|
| Kalıcılık | ALOSPersistence, ALOSDurablePersistence, ALOSServerSync; Python repository / MongoStore / SQLite | Ortak durum → yerel doğrulanmış kopya → API → SHA-256 doğrulamalı sürümlü veritabanı kaydı |
| Veri koordinasyonu | EngineBus, AthleteEventStore, SchemaMigration, DataLineage, ALOSArchitecture, AthleteCoordinator | Kaydetme, olay düzeltme/silme, şema, hesaplama sırası ve veri kökeni |
| Sağlık ve ağrı | HealthStateEngine, PainIntelligence, PainIntelligenceCore | Günlük durum, belirtiler ve ağrı → readiness, hacim/yoğunluk, güvenlik kontrolü |
| Planlama | AthleteProgramEngine (app.js), SportsSciencePolicy, CanonicalSessionEngine, TrainingSessionService, AdaptiveCoachSolver | Takvim, vardiya, sağlık, yük → ortak reçete; alternatif solver senaryosu aktif reçetenin yerine geçmez |
| Antrenman yürütme | adaptive-intelligence.js, GuidedWorkout, GuidedWorkoutCore, AdHocSession, SubstitutionIntelligenceCore, RestInterval | Set, RIR, yük, tarih, dinlenme, ikame hareket → tarihli antrenman kayıtları ve sonuçlar |
| Hareket ve yük | EXERCISE_KNOWLEDGE, MovementIntelligence, LoadPrescriptionEngine, AthleteLoadMesh, TissueLoadEngine | Hareket sınıfı/ekipman/ölçü birimi, set ve yük → kas/eklem/fizyoloji ve yük önerisi |
| Beslenme | NutritionLedger, NutritionRecordEngine, NutritionImpact, AdaptiveNutrition, FOODS | Kimlikli besin kayıtları → toplamlar, hedefler ve antrenmanla ilişkili hesaplar |
| Su | WaterLedger, HydrationIntelligence | Su defteri, besin sıvısı, antrenman bağlamı → hidrasyon tahminleri |
| Trend ve kalibrasyon | PeriodicTrendEngine, PerformanceTrendV2, PersonalCalibration | Tarihli ölçümler → eğilim, belirsizlik ve kişisel yük/beslenme parametreleri |
| Profil ve devamlılık | AthleteProfile, capability-catalog, AdherenceGuardian, GapReconciliation | Ölçümler, kapasite testleri, uyum, eksik günler → profil ve geçmiş gün değerlendirmesi |
| Görünüm ve düzenleme | app.js, bodymap3d.js, training-mesh-dashboard.js, RecordManager | Ortak hesapların gösterimi ve tarihli kayıtların düzenlenmesi/silinmesi |
| Yedek ve kontrol | BackupVault, SystemIntegrity, ReleaseIntegrityV8; sync_portable_backups.py | Yedek bütünlüğü, kimliğe göre birleştirme, arşiv, geri yükleme |

## Düzeltmeler

1. Sağlık kartına **Sağlık Durumunu Kaydet** düğmesi ve erişilebilir kayıt mesajı eklendi.
   Yalnız sağlık alanları güncellenir; günlük adım, uyku ve diğer kayıtlar korunur.
   Mesaj, cihaza kaydı ve sunucunun başarılı yazma yanıtını ayrı değerlendirir.
2. Haftalık gün seçimi, tarih alanı, özel tarih ve eski geçmiş-giriş bağlantıları
   manuel kaydın gerçek gününe bağlandı. Gelecek/geçersiz gün reddedilir.
   `recordedAt` giriş anını saklar; kesin yapılma saati bilinmiyorsa uydurulmaz.
   Toparlanma hesabı seçili günün mevcut varsayılan saatini kullanır.
3. Önceden planı bulunmayan geçmiş gün ekranındaki eksik reçete hatası giderildi.
   Plan üretme zorunluluğu olmadan manuel kayıt yapılabilir.
4. Sunucuya yazmalar sıraya alındı. Başarısız eski istek, yeni bekleyen veriyi ezmez.
   Normal kayıt isteğinden büyük snapshot'ları engelleyen `keepalive` kaldırıldı;
   sayfa kapanışındaki best-effort gönderim ve yerel kalıcılık korunur.
5. Eski testlerin belirli bir cache adına ve gerçek günün Salı olmasına bağımlılığı
   giderildi. Tarihli entegrasyon senaryosu sabit bir test saatinde çalışır.

## Yapılan doğrulamalar

- Tüm JavaScript test dosyaları: 39 dosya; motor birim testleri, bağlantı kontrolleri,
  gerçek-script entegrasyonu, sağlık/geçmiş tarih, sunucu kuyruğu ve özel yedek provası.
- Python: 6 depolama testi ve 2 başlatıcı testi.
- Yerel HTTP sunucusu: sağlık ve geçmiş antrenman yazma/okuma, revizyon geri yükleme,
  sunucu yeniden başlatıldığında verinin korunması, gizli dosyaların 404 vermesi.
- Kullanıcının birleştirilmiş yedeği üzerinde prova: **7 antrenman, 16 beslenme,
  7 su kaydı** koordinatör/olay defteri/fizyoloji hesapları ve yerel kayıt sonrasında korunuyor.
- Üç kaynağın SHA-256 bütünlüğü ve mükerrer kayıt kimliklerine göre birleşim kontrolü.

## Kapsam ve sınırlar

Motorlar arası otomatik testler geçtiği alanlarda ortak çalışma doğrulandı; bu,
uygulamanın her olası kullanıcı/veri kombinasyonunun hatasız olduğu anlamına gelmez.
JavaScript entegrasyon testleri DOM ve ağı taklit eder. Gerçek tarayıcı görsel düzeni,
cihaz kamera/fotoğraf, ses ve IndexedDB'nin tarayıcıya özgü davranışları bu denetimde
uçtan uca doğrulanmadı. VM testlerindeki IndexedDB yokluğu bilinçli test ortamı sınırıdır.
Model katsayılarının bilimsel/klinik geçerliliği bu yazılım denetiminin kapsamı değildir.

Uygulama tek kullanıcı/snapshot modelindedir. Birden çok tarayıcının eşzamanlı
düzenlemelerini alan bazında çatışmasız birleştirme garantisi yoktur.
Aktarım sırasında uygulamadan veri değiştirilmemesi gerekir; aktarım aracı yazmadan
önce sunucu revizyonunun değişmediğini kontrol eder ve orijinalleri arşivler.

## MongoDB aktarımı

16 Eylül son kontrolünde bağlantı ve aktarım tamamlandı. Aynı dış IP ve aynı
cluster adresiyle üç düğümde TLS 1.2 ve TLS 1.3 sertifika doğrulaması başarılı.
Önceki TLS reddinin kesin nedeni saptanamadı; eksik IP izni olduğu varsayımı
doğrulanmadı. Kullanıcının ekran görüntüsünde doğru IP izni Active durumundaydı.

Üç yedek SHA-256 ile doğrulandı ve boş MongoDB durumuna birleştirilerek yazıldı.
Oluşan uygulama revizyonu **254**. Geri okunan veri ve checksum yazılan snapshot
ile eşleşiyor: **7 antrenman, 16 beslenme, 7 su kaydı, 756 olay girdisi**.
Orijinal yedekler ayrıca `portable_backups` koleksiyonuna arşivlendi.

Mac başlatıcısı varsa doğrulanan `.venv-modern` ortamını kullanır.
Uygulama `file://` yerine Python HTTP sunucusu üzerinden açılmalıdır;
dosyayı doğrudan açmak MongoDB API'sini çalıştırmaz.

Hazır kaynaklar: 15 Eylül tarihli v9.2.6, v9.2.7 ve v10.0.0 tam yedekleri.
Birleşik olay arşivi: 756 girdi. Kaynaklar `portable_backups`, uygulama durumu
`state_revisions` koleksiyonunda saklanır.
