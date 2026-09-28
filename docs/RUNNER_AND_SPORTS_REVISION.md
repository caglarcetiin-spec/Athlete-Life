# Seans ilerlemesi ve branş bağlamı — 28 Eylül 2026

## Bulgular ve değişiklikler

- Kullanıcının önizlemesinde salt okunur incelemede 14 slotlu bir reçetenin 1 kayıtla tamamlanmış olduğu görüldü. Bu, erken bitirmenin mümkün olduğunu gösterir; otomatik geçişin her koşulda bozuk olduğunu kanıtlamaz. Sentetik tarayıcı yolculuğu sıradaki slotun kayıttan sonra seçildiğini doğrular.
- Runner artık hareket içindeki set numarasını, tüm antrenmandaki konumu ve geçiş açıklamasını gösterir. Eksik slot varken bitirme ayrı bir açık seçim gerektirir. Yanlışlıkla tamamlanmış seansa kayıtları koruyarak devam edilebilir. Serbest seansın plan sırası taşımadığı açıkça yazılır.
- Günün mevcut açık seansına devam edilir; aynı düğme gereksiz ikinci seans oluşturmaz. Aynı slotun farklı işlem kimliğiyle yeniden kaydedilmesi sunucuda engellenir; düzenleme, silme sonrası yeniden kayıt ve idempotent retry korunur.
- Dinamik becerilerde tekrar alanı gösterilir (yalnız strength kontrolü daha önce skill hareketini süre formuna yönlendiriyordu). Dinlenme düğmesi son yapılan slotun süresini kullanır.
- Haftam, aktif programın tarih ve dönem haftası sınırlarına göre antrenmanları ve seans durumlarını gösterir. Aynı tarih seçici hem Runner hem hafta görünümünde paylaşılır. Dönem haftası başlangıç tarihinden itibaren yedi gün sayılır; takvim hafta numarası değildir.
- Türkçe hareket adları exact-normalized alias çözümlemeye ve katalog aramasına katılır. `ring-l-sit` kimliği zaten vardı; izometrik saniye analizi korunur. Altı görsellik rehberin tüm analiz kataloğu olmadığı belirtilir.
- Yönlendirmede 199 branş seçimi ve isteğe bağlı spor geçmişi bulunur. Formdaki branş kimlikleri/isimleri ve kullanıcı tarafından yazılan geçmiş, onaylı AI bağlamına eklenir. Hesabın sağlık kayıtları veya antrenman geçmişi otomatik gönderilmez.
- Koşu ve yüzme yöntemleri, dayanıklılık/teknik hedefleri, havuz ekipmanı ve dört yüzme stili eklenir. Yüzme için havuz ve bildirilen stil yetkinliği gerekir. Diğer branşların seçilebilmesi, tamamının uzman teknik kataloğunun hazır olduğu anlamına gelmez; destekleyici hareket kapsamı formda açıklanır.
- Yüzme stillerinin kas katsayıları bilinmiyor; kas yüzdesi uydurulmaz. Süre/mesafe kayıtları saklanır. Kas yükü, iyileşme ve AI doz testleri klinik doğrulama değildir.

## Veri / yayın / geri dönüş

DB şema veya hesap/medya göçü yok. `guided_choices.sport_ids` (en fazla 20 katalog kimliği) ve `training_history` (en fazla 1000 karakter) eklenir; eski kayıtlarda varsayılanlar boş. `methods` running/swimming ve `objective` endurance/technique kabul eder. Model sürümleri `guided-hybrid-3`, `ai-planner-6`; eski AI origin sürümleri okunmaya devam eder. Yeni yüzme kimlikleri `swim-freestyle`, `swim-backstroke`, `swim-breaststroke`, `swim-butterfly`.

Yalnız yerel 10005 önizlemesi güncellenir; bu görev Render yayını veya MongoDB üretim aktarımı yapmaz. Kullanıcı kayıtları test verisi olarak kullanılmaz. Eski backend'e rollback yeni guided_choices değerlerini yeniden yazarken doğrulama hatası verebilir; yeni kayıtları silmeden bu alanları destekleyen okuyucu korunmalı. Testler geçici UUID/zaman damgalı veritabanlarında çalışır.

## Kanıtlar

`docs/evidence/stage-9/` altında `sports-runner-api`, `runner-sports-web`, `runner-sports-build`, `runner-sports-mongo`, `runner-progress-browser` komut/commit/kaynak hash/ortam/çıktı/exit code kayıtları. Önceki başarısız koşular `runs/` altında tutulur; beklenti değişiklikleri `runner-sports-test-notes.json` içinde açıklanır. Tarayıcı sentetik verilerle 10009 portunda çalışır. Gerçek EVREN isteği bu testlerde gönderilmez; sağlayıcı transportu değil uygulama sözleşmesi sınanır.
