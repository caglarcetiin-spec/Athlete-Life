# ADR-0005 — mevcut MongoDB ve ücretsiz Render

Durum: kullanıcı kararı, 23 Eylül 2026. ADR-0002'nin PostgreSQL zorunluluğunu hedef yayın açısından değiştirir. Kullanıcı mevcut MongoDB'yi korumayı açıkça seçti; yeni ücretli kaynak yok.

V2 arayüz ve alan modelleri korunur. MongoDB authoritative backend eklenir; PostgreSQL'e veya yerel diske sessiz fallback yapılmaz. Mevcut v10 koleksiyonları üzerinde doğrudan yazılmaz; V2 koleksiyonları ayrı ad alanında tutulur. Gerçek hesap/veri geçişi kontrollü ve tek yazıcılı olacak; testler yalnız ayrı localhost replica set üzerinde sentetik kayıtlarla yapılır.

Gereken eşdeğerler: majority transaction commit ardından ACK; operasyon kimliği/digest tekilleştirme; kayıt version kontrolü; athlete bazlı cursor sırası; tutarlı snapshot; owner ve referans doğrulaması; Mongo unique/partial indexleri; transaction rollback; lease/outbox; 16 MB BSON sınırını aşan yedek/arşiv için transaction içi parçalı özel içerik. Bilinmeyen veri alanı sessizce atılmaz.

Mevcut domain kodundaki sınırlı sorgu sözleşmesi backend sınırına taşınır. Desteklenmeyen sorgu fail-closed hata verir; SQL'i rastgele metin olarak yorumlama veya Python eval yok. PostgreSQL test sonucu MongoDB doğrulaması sayılmaz. Aynı kabul fixture'ları, concurrency, restart ve iki cihaz yolları gerçek MongoDB üzerinde yeniden çalıştırılır.

Yayın: önce ayrı sentetik MongoDB kabulü, sonra ücretsiz Render konfigürasyonu, ardından kontrollü gerçek hesap/veri geçişi. Şu an canlı Render/MongoDB değişmedi. Yeni ücretli servis, disk, worker veya geçici Render Postgres oluşturulmaz. Rollback eski runtime/kolleksiyonları koruyacak; yeni V2 verisinin sessizce eski snapshot'a dönüşü yok.

## Uygulamanın ölçülmüş sınırları

MongoDB'de foreign key ve CHECK SQL veritabanındaki gibi yerleşik değildir. Kapalı repository, model kontrollerini ve referansları transaction içinde uygular; unique indexler MongoDB tarafından uygulanır. Tüm yazan transaction'lar ortak fence kullanır. Bu düşük trafikli tek servis için doğruluk tercihi yazma paralelliğini sınırlar. Sunucu dışında koleksiyonlara doğrudan yazmak desteklenmez.

Gerçek subprocess SIGKILL testinde commit sonrası kayıp yanıt aynı operation kimliğiyle 0,06 saniyede tekrar alındı; commit öncesinde öldürülen transaction'ın kilidi MongoDB tarafından bırakılınca tekrar kayıt 66,67 saniyede tamamlandı. Bu sürede uygulama başarı ACK'i üretmez, geçici 503 verir; istemci bekleyen operation'ı korur. Bu sonuç kesintisiz/ani kurtarma iddiası değildir. Üretim kapasite testi ayrıca gereklidir.

Kaynak: `docs/evidence/stage-9/mongo-durability.{json,log}`. Yerel MongoDB 8.0.17, varsayılan transaction ömrü, sentetik veriler. Canlı Atlas davranışı diye sunulmaz.
