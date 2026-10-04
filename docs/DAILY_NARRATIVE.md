# Günümü anlat — günlük kayıt asistanı

2026-10-05. Başlangıç commit'i: `3582ac2`. Mevcut ücretsiz Render + MongoDB mimarisi korunur.

## Kullanım

Antrenman → Günümü anlat / Hızlı kayıt. Seçili tarihi kontrol et, günlük metnini yaz ve EVREN gönderim iznini ver. Bilgiler önce onay özetine dönüşür. Sorulara aynı alandan cevap ver; su için toplam/ek hızlı yanıtı bulunur. Kaydedilecek satırları kullanıcı seçer. Eksik satırlar hazır kayıtların seçilmesini engellemez. Mesajlar, yanıt beklerken ve sayfa yenilenince hesap ve tarih kapsamlı yerel taslakta korunur. “Yeni kayıt başlat” yerel taslağı açık kullanıcı onayıyla temizler; sunucu kayıtlarını silmez.

## Destek ve açık sınırlar

- Su: ml/l; günlük toplamdan mevcut miktar çıkarılır, ek miktar ayrı kaydedilir. Belirsiz toplam/ek veya birden fazla çelişen toplam kayda kapalıdır.
- Uyku: başlangıç/bitiş saatleri, gece yarısı geçişi; seçili tarih uyanış günüdür. Süre/saat çelişkisi sorulur. Kayıtlı uykuyla örtüşme işlemi reddeder.
- İş: başlangıç/bitiş veya başlangıç + süre. Ulaşım/hazırlık bilinmiyorsa sıfır uydurulmaz, sorulur. Aynı günün mevcut vardiyası üzerine yazılmaz; Haftam'dan düzenlenir.
- Öğün: adı, yalnız açık bildirilen gram/kalori/makrolar. Besin adı veya porsiyondan tahmini kalori üretilmez. Bilinmeyenler NULL; tam beslenme kaydı işareti otomatik atanmaz.
- Antrenman: tamamlanmış serbest seans özeti ve belirtilen toplam süre. Açık set/tekrar/tutuş/ek ağırlık değerleri birebir kanıt ve katalog eşleşmesiyle gerçek setlere dönüşür. Belirsiz hareket/varyant veya set sayısı için tamamlaması istenir. Bilinmeyen yük, RIR, RPE ve gerçek saat uydurulmaz. Plan reçetesi kendiliğinden tamamlanmış sayılmaz. Özet-only seans kas yükü kanıtı değildir.
- Desteklenmeyen ölçüm/ilaç/sağlık bilgileri sorularda veya engelli notlarda görünür; ilgili modüle yazılmış gibi sunulmaz. Orijinal mesaj kaybolmaz. Desteklenen kapsam tüm olası sağlık girdileri veya tüm spor teknikleri değildir.

## Akış ve güvenilirlik

`POST /api/v2/daily-log-preview` → kullanıcı oturumu + CSRF + sürümlü izin + limit → EVREN → sınırlı Pydantic çıktı → metin/numerik dayanak kontrolü → güncel bootstrap karşılaştırması → 30 dakikalık sahip-kapsamlı HMAC imzalı özet.

AI'ye sadece seçili tarih ve bu sohbetin kullanıcı mesajları gönderilir; hesap geçmişi veya veritabanı snapshot'ı gönderilmez. AI'ye SQL, araç çağrısı veya komut çalıştırma yetkisi verilmez. Yanıt tamamlanmamış, büyük veya şema dışıysa kayıt yapılmaz. Sayısal dayanağı bulunmayan satır yerine kullanıcıdan teyit istenir; bu kontrol genel dil anlama doğruluğunun garantisi değildir.

`daily_log.save` yalnız imzalı özetteki seçili satırları işler. Athlete kilidi + snapshot cursor değişmemiş kontrolü + mevcut Operation idempotency mekanizması kullanılır. Tek transaction içinde domain kayıtları, değişiklik akışı, audit ve outbox yazılır. Aynı kaynak için deterministik audit kimliği farklı operation id ile tekrarı da engeller. Gerçekleşmiş bir commit'in yanıtı kaybolursa istemci aynı operation id'yi tekrar kullanır. Belirsiz bağlantı hatasında yeni mesaj göndermeden önce mevcut işlem doğrulanır. Eşzamanlı değişiklikte eski özet hiçbir kaydı ezemez; yeniden analiz istenir.

HMAC anahtarı yalnız süreç belleğindedir. Sunucu yeniden başladığında gönderilmemiş özet yeniden analiz edilmelidir; mesaj korunur. Kaydedilmiş işlemin tekrar yanıtı Operation üzerinden alınır. Bu tasarım mevcut tek Render instance içindir; yatay ölçekleme için paylaşılan imza anahtarı gerekir.

## Veri haritası / şema / rollback

SQL şeması ve MongoDB koleksiyonu değişmez; hesap/medya göçü yok. `hydration`, `meal`, `sleep`, `shift`, `session`, `set` mevcut sahiplik kontrollü modelleridir. Yeni komutun Audit.before içindeki `daily_log_provenance` nesnesi orijinal mesajları, tarihi, seçilen satırları ve işlenmeyen açıklamaları saklar. Bu kişisel içerik test raporlarına veya kaynak depoya taşınmaz. Yerel taslak anahtarı `daily-narrative:YYYY-MM-DD` olup mevcut hesap kapsamlı IndexedDB içinde tutulur.

Rollback kaynak sürümünü geri alarak yapılabilir; mevcut domain kayıtları eski okuyucularla uyumludur. Bekleyen `daily_log.save` eski sürümde desteklenmez; silmek yerine yeniden yeni sürümde doğrulanmalıdır. Hiçbir veri geri alma/sıfırlama komutu çalıştırılmaz.

## Kanıt

`docs/evidence/stage-9/daily_log_*` komutları, kaynak hashleri, ortamları ve exit kodlarını içerir. PostgreSQL ve MongoDB sentetik testleri, tam v2 regresyonu, istemci testleri, lint/build ve mobil tarayıcı senaryosu yürütülür. Tarayıcıda gerçek commit sonrası yanıt kaybı taklit edilir ve yeniden gönderimde kopya kayıt oluşmadığı kontrol edilir. `docs/evidence/daily-log/BROWSER.json` ve ekran görüntüsü bu yeni özelliğe aittir.

İlk test ortamı kapalıydı; yeni /private/tmp PostgreSQL ve MongoDB ortamları açıldı. İlk PostgreSQL başlatmasında ASCII kodlama sürücüyle uyumsuzdu; yeni UTF-8 geçici cluster kullanıldı. İlk Mongo test dosyasındaki dinamik __all__ nedeniyle lint ithalatları kaldırmıştı; açık test adlarıyla test keşfi düzeltildi. Başarısız çıktılar runs dizininde korunur. Canlı EVREN'e yalnız uydurma test günü gönderildi; gerçek kişi kayıtları test edilmedi. Başarı klinik/biyolojik doğrulama veya gelecekte tüm AI yanıtlarının hatasız olacağı garantisi değildir.

Tam MongoDB regresyonunun ilk denemesinde geçici mongod açık dosya sınırına ulaştı (WiredTiger error 24). Testler kesildi; sadece geçici MongoDB, idle file handle close 10s / minimum 128 / scan 5s parametreleriyle yeniden başlatıldı. Test beklentileri değiştirilmedi. Toplam 100 set ve imzalı özet boyut sınırı aşılırsa günlük daha küçük parçalara bölünmesi istenir.

Son kontroller: açıkça bildirilen RIR/RPE korunur ve katalogdaki hareket türü kullanılır. Nihai günlük kayıt birim senaryoları 16 testtir. Geniş v2 paketi 1098 test geçti; son eklenen dar kapsamlı doğrulamalar ayrıca günlük kayıt testleriyle tekrar yürütüldü. Ön yüz 45 birim testi, lint, TypeScript üretim derlemesi ve mobil tarayıcı testi geçti. Tam MongoDB sonucu kendi evidence kaydında izlenir.

Tam MongoDB regresyonu düzeltilmiş sentetik ortamda **139 passed** ile tamamlandı (exit 0). Son mobil senaryo, 422 alan reddinin düzeltmeye izin vermesini ve commit sonrası kayıp yanıtın aynı işlem kimliğiyle tekrarını da doğrular.
