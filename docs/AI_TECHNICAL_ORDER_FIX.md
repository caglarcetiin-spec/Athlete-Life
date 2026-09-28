# Teknik çalışma sırası — 28 Eylül 2026

## Sorun ve düzeltme

AI teknik hareketi kuvvet/aksesuar/kondisyon hareketinden sonra yazdığında `validate_plan` tüm taslağı reddediyordu. Artık `ai-planner-5`, gün listesini doğruladıktan sonra katalogdaki `block=skill` hareketlerini stabil sıralamayla günün başına alır. Teknik hareketlerin kendi aralarındaki sırası ve diğer hareketlerin kendi aralarındaki sırası korunur. Hareket ekleme/silme, doz değişikliği veya yeni bir AI çağrısı yapılmaz; gelen nesne değiştirilmez.

Sıralama sonrasında mevcut ekipman/yetkinlik, kimlik, tekrar, süre, hacim, gün dağılımı ve teknik öncelik denetimleri aynen çalışır. Bilinmeyen hareket veya aşırı doz sıralama ile kabul edilebilir hale gelmez. `review.ordering_adjustments` ve `notes` hangi günde sıralama değiştiğini bildirir; önizleme bu notu kayıttan önce gösterir. Kullanıcı düzenleyip açıkça kaydetmeden plan yazılmaz veya aktifleştirilmez.

## Test beklentisi değişikliği

Eski `skill_order` negatif senaryosu yalnız sıranın hatalı olması halinde ret bekliyordu. Yeni davranış gereği bu beklenti, aynı bozuk sıra üzerinde hareket/doz bütünlüğünü, stabil sıralamayı, kaynak nesnenin değişmemesini, ikinci normalizasyonun etkisizliğini ve açıklama notunu doğrulayan pozitif testle değiştirildi. Doz/kimlik/yinelenen hareket hataları negatif testlerde ayrıca korunur. Test eşiği gevşetilmedi; nihai taslağın teknik öncelik şartı devam eder.

API testleri sentetik veriler kullanır; PostgreSQL ve MongoDB geçici veritabanlarında düzeltilmiş sıra taslak olarak kaydedilip geri okunur. Tarayıcı testi notun görünmesini, tüm programın otomatik dolmasını, isteğe bağlı rötuşun korunmasını ve açık kaydı denetler. Bu düzeltmede dış EVREN çağrısı ve kişisel kayıtlarla test yapılmadı. Komut, kaynak commit/hash, stdout/stderr ve çıkış kodları `docs/evidence/stage-9/ai-order-*` altındadır.

Sonuç: 80 API/planlayıcı testi, 4 MongoDB testi, tarayıcı akışı, build ve Python lint PASS. İlk tarayıcı koşusunda aynı notun görünür özet ve kapalı ayrıntılarda bulunması seçiciyi belirsiz yaptı; yalnız görünür notu hedefleyerek düzeltildi. İlk hata çıktısı `runs/` altında korundu.

## Veri, yayın, geri dönüş

Yeni DB alanı/şeması veya hesap/medya göçü yok. `ordering_adjustments` türetilmiş önizleme bilgisidir; mevcut kanonik plan gün/hareket listesine düzeltilmiş sıra yazılır. Mevcut planlar yeniden sıralanmaz. AI kökeninde v5 sürümü kabul edilir; eski sürümler de desteklenir. Yerel 10005 önizlemesi ve `release/v2` paketi güncellenir; GitHub push/Render yayını yok. Geri dönüş önceki kod/paketle mümkündür; v5 taslaklarını düzenleyebilmek için v5 köken kabulünü korumak gerekir. Veri temizliği gerekmez.
