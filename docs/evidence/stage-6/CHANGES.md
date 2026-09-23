# 23 Eylül 2026 — devam çalışması

## Doğrulanan düzeltmeler

- Sunucu JSON sayıları ile tarayıcı yeniden serileştirmesi arasında `500.0`/`500` checksum farkı gerçek iki DB browser restore testinde bulundu. RFC8785 normal sayılar için kullanılır; JS güvenli tam sayı sınırı dışındaki bilinmeyen kaynak değerleri için özgün sunucu metni `alos-v2-transfer-text.canonical_text` içinde aynen saklanır. Eski checksum biçimi okunmaya devam eder.
- Sunucu erişilemezse indirilen yerel yedeğin tam sunucu yedeği olmadığı görünür bildirime dönüştürüldü.
- Özel Capability testi kullanıcı adlandırması, yöntem/birim/koşul ve gerçek sonuçla kaydedilip yeniden açılıyor. Toplum normu uydurulmuyor.
- Çıkış penceresi ilk odağı, Tab/Shift+Tab döngüsünü, Escape ve önceki odağa dönüşü yönetiyor.
- 8 MB'a kadar bağımsız GLB kullanıcıya özel medya komutuyla saklanıyor. Son yüklenen model görüntüleniyor, önceki dosyalar ve yedek içeriği korunuyor. GLB dış dosya bağlantıları sunucuda reddediliyor. Fotoğraf seçicisi modelleri avatar olarak göstermiyor; API de reddediyor.
- Fotoğraf çekim tarihi ve kullanıcının girdiği ağırlık/bel ölçüsü ayrı metadata olarak saklanıyor. Bilinmeyen tarih tahmin edilmiyor; eski kaynak bilgisi korunuyor.

## Başarısız denemeler ve düzeltme nedeni

- Yeni büyük sayı testi ilk denemede tanınan eski yedek zarfı olmadan gönderildiği için import aşamasında durdu. Veri `data` zarfına alındı; büyük tam sayı eşitliği ve ikinci hesap restore kontrolleri korunarak geçti.
- Yeni model/avatar testi ilk denemede boş hesapta var olmayan spor profilini okumaya çalıştı. Test içinde sentetik profil oluşturuldu; başka hesaba erişim ve geçersiz avatar reddi assertions korunarak geçti.
- Genişletilmiş Python lint eski migration dosyalarının import düzenini ve nested context biçimini bildirdi. Ruff güvenli düzeltmeleri uygulandı; iş kuralları gevşetilmedi.
- Kanıt çalıştırıcısı artık önceki aynı adlı log/metadata dosyalarını `runs/` altında koruyor. Bu iyileştirmeden önce üzerine yazılmış ilk hata çıktıları için ham log varmış gibi iddia edilmiyor; nedenler burada kayıtlı.

## Şema, yayın, göç, rollback

`e912ac740de1`: media_objects.captured_date (nullable), details (JSONB, varsayılan boş). Önceki dönem/karşılaştırıcı/aralık migration'larının üzerine eklenir. Yalnız yeni V2 ve sentetik PG testleri; eski v10, gerçek MongoDB, hesaplar ve dosyalar değiştirilmedi. Yayın yapılmadı. Yeni metadata içeren yedekler eski uygulama sürümüne otomatik yüklenmez. Geri dönüşte eski V2 sürümüne alan silen downgrade yerine bu genişletilmiş şemayı bırakıp kod rollback uygulanmalı; production cutover ayrı kapıdır.

## Hâlâ açık

Tam U-06 alt işlev incelemesi, fiziksel iPhone/VoiceOver, uzun veri geçmişi ve performans, 16 MB üstü kullanıcı yedeği için kontrollü çok parçalı aktarım, staging/container ve felaket kurtarma kapıları kapanmadı. Fotoğraf metadata modeli kişisel capability/goal ölçümünü otomatik çoğaltmaz. Büyük GLB dosyaları için ayrı yönetici kütüphanesi yolu var; yükleme sınırı gizlenmiyor. Klinik/biyolojik doğrulama yapılmadı.

## Güvenlik incelemesi — yeniden üretilen bulgu

`restore-media-reproduction` exit 1: geçerli checksum yeniden hesaplandığında HTML mime/content medya kaydı olarak import edilebiliyordu (normal fotoğraf yüklemesi buna izin vermiyor). Sentetik örnek zararsız form metnidir; dış istek veya gerçek hesap kullanılmadı. `validate_restored_media` JPEG içerik/boyut kontrolü ve bağımsız GLB doğrulaması ekler; desteklenmeyen tür HTTP sunumunda da reddedilir. Aynı assertion değiştirilmeden son `api-regression` içinde PASS; yarım medya kaydı yok. Orijinal yeniden üretim log/metadata korunmuştur. JavaScript çalıştırma veya başka hesaba erişim gerçekleşmiş gibi iddia edilmez.

Son tam backend regresyonu: 56 PASS. Client: 8 PASS. Migration/model drift kontrolü `schema-check` exit 0; beklenmedik şema farkı yok.

## Son devam: büyük yedek ve restore alanları

Yedek import 64 MB'a ayrıldı; genel komut 16 MB sınırı korundu. >32 MB sentetik roundtrip geçti. V2 restore sonrası arşiv canonical kayıtları ikinci kez içermiyor; source_manifest, record_id_map ve bilinmeyen envelope/yerel kuyruk korunuyor. Legacy ham içerik değişmiyor. Negatif commute_min testi daha önce DB constraint 409 bekliyordu; yeni erken domain kontrolü 422/restore_domain döndürdüğünden beklenen sözleşme değiştirildi. Boş hedef/0 cursor/staged durum assertions korundu. Geçersiz timezone, RIR ve başka seansa bağlı slot ayrıca 422 ile atomik reddediliyor. Son tam regresyon 61 PASS.

## Linux CI first-sync and archive selector correction (23 September)

GitHub run 35805444032 at b35f08f passed Python, client, schema and container jobs but restore browser failed. The preview request finished before first bootstrap; apply was enabled and enqueue rejected with first-sync-required. Apply now stays disabled until canonical snapshot exists. The independent DB browser fixture delays bootstrap by two seconds to cover this race.

Local rerun then reproduced a stale test selector: `details.first()` now selected the photo metadata form added in Stage 6. The assertion targets the summary for the requested archive domain instead; domain content, expansion, photo dimensions and restored shift assertions remain unchanged. Original failed runs are retained.
