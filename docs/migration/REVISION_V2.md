# Birleşik V2 veri geçişi ve CSV sözleşmesi

## Mevcut kayıtlar

Bu revizyonda gerçek kullanıcı verisine toplu yazım veya aktarım yapılmadı. MongoDB korunur; yeni ücretli kaynak yok. Yerel PG/Mongo testleri yalnız sentetik veridir.

SQL sırası: `c47a9e110201` (set semantiği) → `c47a9e110202` (profil/planlama/seans bağlamı) → `c47a9e110203` (vardiya pencereleri). Eski alanlar silinmez. Mongo, yalnız bu yeni alanlar eksik olduğunda açık varsayılanla okur; okumak dokümanı yeniden yazmaz. Diğer beklenmeyen eksik alan hata kalır.

Yeni alanlar:
- Hedef ve gerçek set: `catalog_version`, `set_kind` (eski veri unknown), `superset_group`, `sequence`.
- Profil: `planning_preferences`; hedef, günler, dakika, ekipman profilleri/id/revision/available_kg/original_text, tercihler, favori öğün ID'leri, isteğe bağlı modüller.
- Plan: mevcut `decisions` içinde kullanılan profil/ekipman sürümü. Seans: `planning_context` anlık görüntü; `feedback` isteğe bağlı seans RPE/süre/uygulanabilirlik/not/AU/sürüm/zaman.
- Vardiya: `available_start_local/end_local`, `sleep_start_local/end_local`, `training_minutes`; boşsa saat önerilmez. Planlanan uyku, gerçek uyku kaydı değildir. Gece vardiyasında pencere iş bitişinin yerel gününe bağlıdır.
- Öğün: mevcut `nutrient_snapshot` içinde kopyanın source/version/factor/original_source zinciri. Besin `reference` alanında kullanıcı/etiket aktarımı ayrımı; doğrulanmış dış kaynak iddiası yok.
- Analiz: değişmez `report_records` (seçili set, ağrı, tahlil), coverage, effort_policy, catalog/calculation revision, period_summary. Eski kararların olmayan ayrıntıları güncel verilerle doldurulmaz.

## Hareket eşlemesi: çevrimdışı kuru çalışma

`tools/v2/movement_mapping.py` doğrudan veritabanına bağlanmaz. Girdi, `set`, `program_exercise`, `slot` listeleri olan kayıt nesnesidir. İmzalı tam yedeğin checksum alanlarını elle değiştirerek geri yükleme yapma.

```
PYTHONPATH=apps/api .venv-v2/bin/python tools/v2/movement_mapping.py /private/tmp/synthetic-records.json /private/tmp/mapping-preview.json
PYTHONPATH=apps/api .venv-v2/bin/python tools/v2/movement_mapping.py /private/tmp/synthetic-records.json /private/tmp/mapped.json --proposal /private/tmp/mapping-preview.json
PYTHONPATH=apps/api .venv-v2/bin/python tools/v2/movement_mapping.py /private/tmp/mapped.json /private/tmp/rolled-back.json --proposal /private/tmp/mapping-preview.json --rollback
```

Kesin eşleşme ID/sürüm değiştirir. Kararsız/özel hareket aynen kalır. Önceki değerler, başlangıçta olmayan alanlar ve kayıt sürümü proposal içinde korunur. Stale girdi reddedilir; ikinci uygulama ek değişiklik yapmaz; rollback bilinmeyen alanları da korur. Sentetik geri dönüş testi `tests/v2/test_revision.py::test_mapping_preview_repeat_and_lossless_rollback`.

## Genel gerçek set CSV'si

Format `alos-csv-1`; UTF-8, en fazla 2 MiB ve 1000 veri satırı, en fazla 50 benzersiz başlık. Virgül/noktalı virgül/sekme seçilebilir. Sütun eşlemesi arayüzden yapılır. Satır hatası varsa **hiçbir satır yazılmaz**. Kaynak dosya/hash ve bilinmeyen sütunlar private import kaydında korunur. İçe aktarma program şablonu oluşturmaz.

Zorunlu: `date` (tam YYYY-MM-DD), `name`, uygun gerçek miktar (`reps`, `seconds` veya `distance_m`). Önerilen `movement_id` kanonik katalog ID'sidir. Belirsiz Squat kimlik seçmeden reddedilir; eşleşmeyen özel hareket korunur ve kas eşlemesi bilinmiyor olur. `external_kg` doluysa `load_unit` kg/lb zorunlu; lb × 0.45359237 kg. Boş bilinmiyor, 0 gerçek sıfırdır. Türkçe ondalık virgül, virgül ayraçta tırnak içinde veya noktalı virgül ayraçla yazılır. Tarih tahmini yok.

Diğer sütunlar: `session`, `modality`, `variant`, `equipment`, `side`, `load_kind`, `rir`, `rpe`, `set_kind`, `superset_group`, `sequence`. Eksik yük türü/modalite eşleşen katalogdan alınır. Türsüz set unknown kalır. Saat taşınmadığından zaman hassasiyeti date_only; içe aktarım zamanı olay zamanı değildir.

Örnek (sentetik):

```csv
date;session;movement_id;name;reps;external_kg;load_unit;rir;set_kind
2026-09-15;Örnek;barbell-squat;Barbell Squat;10;60;kg;2;working
2026-09-15;Örnek;db-hammer-curl;DB Hammer Curl;8;4,5;kg;3;warmup
```

Aynı dosya aynı sahip için hash ile tek import olur; aynı operasyonun yeniden gönderimi tek yazım oluşturur. İşlem SQL transaction/Mongo transaction içinde atomiktir. Dosyadaki kullanıcı kimliği yetki sağlamaz. CSV export `= + - @` başlangıçlarını apostrofla etkisizleştirir; kayıpsız geri dönüş için tam JSON yedek tercih edilir. Marka formatı fixture'ı olmadığından Strong/Hevy uyumluluğu ilan edilmez.

## Üretim ve geri alma kapısı

Yayın için ayrı karar gerekir. Önce mevcut DB ve medya yedeğini al, izole geri yükleme sayımlarını doğrula, yazım penceresini planla. Yeni UI ve API birlikte yayımlanır; eski istemci ek alanları taşımayabilir. API schema_version=1 korunmuş olsa da yeni komutlar eski API'de yoktur.

Yeni alanlara yazım başladıktan sonra eski API'ye doğrudan dönüş yapma: eski Mongo tam doküman yazımı ek alanları kaybedebilir; SQL downgrade yeni sütunları düşürür. Önce yazımları durdur, yeni yedeği koru, uyumluluk düzeltmesiyle ileri düzeltmeyi tercih et. Zorunlu geri dönüşte önceki tam yedeği izole ortamda aç ve sonraki kayıt farkını kayıpsız arşivle; üretimde veri kaybını sessiz kabul etme. Şema downgrade komutlarını bu görevde gerçek veride çalıştırma.
