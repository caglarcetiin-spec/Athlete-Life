# Gereksinim izlenebilirliği

**2.0 kabul matrisi başarı raporu değildir.** Aşama 0 çalışma kaynağı e92b4b7; mevcut testler ayrı baseline'dır. Aşağıdaki ilk tablo aşama 0 planıdır. Güncel yürütme kanıtları üstteki V2 tablosundadır; eski plan dosya adları çalışma kanıtı sayılmaz.

## 23 Eylül 2026 — güncel V2 kanıt eşlemesi

Ortam: macOS arm64, Python 3.12, gerçek izole PostgreSQL 18 (localhost:15432), Chrome 153; kişisel veri yok. Kaynak branch/base commit ve değiştirilmiş dosyaların SHA-256 manifesti her `docs/evidence/stage-6/<ad>.json` içinde, komut ve exit code ile birlikte. Kaynaklar henüz commit edilmediğinden yalnız base commit test edilen son kaynakla eşit değildir. Bu tablo yalnız açıkça yazılan kapsamı kapsar; tek unit testi tam uçtan uca kabul sayılmaz.

| Gereksinimler | Sonuç ve sınır | Gerçek kaynak / çalıştırma kanıtı |
|---|---|---|
| P-01/02/04/06/08/09/13/14/15 | PASS belirtilen API/Chrome senaryoları; fiziksel disk kaybı değil | test_core.py, store.test.ts; api-regression, shift-regression, client-tests |
| P-03/05/07/10/11/12 | Kısmi kanıt; matristeki bütün ağ/gerçek set/quota varyantları ayrı incelenecek | test_core.py, test_workouts.py, store.test.ts; api-regression, runner-regression, shift-regression |
| T-01/02/03/04/05/07 | PASS yazılım saat/dönüşüm/geçmiş bağlam senaryoları; native cihaz değil | test_core.py, test_workouts.py, navigation.test.ts; api-regression, client-tests, experience-browser |
| T-06/08 | Kısmi; yanlış cihaz saati ve gerçek gece yarısı Runner uzun oturumu NOT RUN | domain zaman testleri var; tam fiziksel akış yok |
| W-01/02/03/04/05/06/07/08/09/10/11/12 | API ve Runner senaryoları PASS; bütün cihaz kilidi/uzun oturum/sona eren dönem UI varyantları ayrı kontrol gerektirir | test_workouts.py, test_science.py; api-regression, runner-regression |
| N-01/02/03/04/05/06 | PASS sentetik API + Türkçe ondalık/mobil kayıt akışı | test_lifestyle.py; api-regression, lifestyle-regression |
| C-01/02/03/04/05/06 | Kısmi: protokol ayrımı, ölçüm, silme, özel test PASS; bütün legacy alias ve katalog satırı birebir inceleme bekliyor | test_lifestyle.py, legacy adapters, lifestyle-regression |
| R-01/02/03/04/05/06/07/08/09/10 | PASS belirtilen basitleştirilmiş model testleri; klinik/biyolojik doğrulama DEĞİL | test_science.py; api-regression, reports-regression; stage-5/RESULT.md |
| M-01/02/03/05/06/07 | Sentetik örneklerde PASS; bütün gerçek eski veri kümeleri denenmedi | test_backups.py, test_workouts.py, test_lifestyle.py; api-regression, restore-regression |
| M-04/08 | Kısmi: atomik hatalı restore ve tek yazıcı tasarımı var; production cutover/restore ortasında process kill NOT RUN | test_backups.py, ADR-0004 |
| B-01/02/03/04/05 | Bounded sentetik yedeklerde PASS; 16 MB üstü aktarım tamamlanmadı | test_backups.py, test_body_model.py; api-regression, restore-regression |
| B-06 | NOT RUN merkezi felaket tatbikatı/RPO/RTO | Aşama 8 bekliyor |
| S-01/02/03 | Kapsamlı sentetik sahiplik/CSRF/oturum/brute-force testleri PASS; tüm kaynak kombinasyonu release incelemesinde taranacak | test_core.py, test_lifecycle.py, test_body_model.py; api-regression |
| S-04/05/06 | Kısmi: parser limitleri, private medya, aktif DB hesap silme PASS; tüm log/retention/cloud alanı doğrulanmadı | test_backups.py, test_lifecycle.py; api-regression |
| U-01 | 17 route × 2 viewport × 2 tema Chrome taraması PASS son arayüz yapısı | all-routes-browser, routes-a11y.json |
| U-02 | Kısmi: axe, reduced motion ve çıkış klavye testi PASS; gerçek screen reader/büyük metin/iPhone NOT RUN | all-routes-browser, experience-browser |
| U-03/04 | PASS belirtilen pending/SW update/offline private-cache akışları; eski tüm sürümler değil | experience-browser, shift-regression |
| U-05 | PASS sentetik GLB/WebGL, bozuk model fallback, UI yükleme ve tekrar açma | model-browser, test_body_model.py |
| U-06 | DEVAM EDİYOR; tam parite kapısı geçmedi | FEATURE_PARITY.md |
| A-01..04 | AI/sağlayıcı kapalı ve yapılandırılmamış; bütün harici entegrasyon testleri NOT RUN | Optional aşama 7 bekliyor; core LLM olmadan çalıştırıldı |
| O-01..05 | NOT RUN tam operasyonel kabul; yerel build ve API lease testleri alt kanıt | build, test_core.py; staging/container/performance/DR kapıları bekliyor |

Yayın kararı **NO-GO**. Bütün kabul kimliklerini PASS yapmadan önce senaryonun zorunlu sonucu ayrı ayrı incelenecek.

## Aşama 0 tarihsel kanıt metadata'sı

- Kaynak commit/branch/ortam/gerçek komut/exit code: `docs/evidence/stage-0/baseline/results.json`; her testin stdout/stderr kardeş dosyası.
- Problar: `TEST_BASELINE.md` komut/exit tablosu; storage/client JSON ve browser observations. Browser Chrome/local SQLite/synthetic; Mongo sadece mongomock.
- Hedef V2 her satır: commit yok, ortam henüz kurulmadı (plan: izole PostgreSQL + iki kullanıcı + browser contexts); komut **çalıştırılmadı**, exit code **—**, CI artefact **yok**. Yeni PASS için bu alanların her biri gerçek çalışmadan doldurulmalı.
- `FAIL` eski baseline testleri saklıdır. Aynı adla unit PASS olup source-only olması UI+DB kapısını geçirmez.

## Aşama 0 teslim kapısı

| Gereksinim | Durum | Kanıt |
|---|---|---|
| Gerçek entrypoint/file/engine/API haritası | PASS | CURRENT_SYSTEM_MAP + inventory JSON |
| Ekran ve feature envanteri | PASS | FEATURE_PARITY + 29 route reference PNG |
| Legacy overwrite riskini tekrar üret | PASS (keşif) | storage_probe; ürün davranışı eski yolda FAIL |
| Kalıcılık/ACK/bootstrap/fallback/current two-context | PASS (inceleme) | storage/client/browser probes; riskler açık |
| Gerçek baseline ve risk sınıflaması | PASS | 69/4/2 + RISK_REGISTER |
| Veri haritası ve ADR + Aşama 1 uygulanabilir plan | PASS | LEGACY_DATA_MAP + ADR-0001..4 + PLANS |

## Minimum kabul matrisi — her satır

| ID | Beklenen senaryo | V2 durum | Aşama | Planlanan test dosyası (henüz yok) | Mevcut dar kanıt / sınır |
|---|---|---|---|---|---|
| P-01 | Haftalık vardiyayı kaydet, server ACK al, tarayıcıyı kapat/aç. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | Browser probe: vardiya ACK/reopen eşit; mesaj ACK öncesi çıkıyor (RSK-02). |
| P-02 | Optimize et, ACK al, process restart ve yeniden login. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | Browser probe: structured optimizer restart/fresh context eşit (legacy scope). |
| P-03 | İki cihaz aynı baseline'ı açar; A set ekler, B vardiya değiştirir. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | Store probe: legacy overwrite FAIL; account CAS reddi var, farklı alan merge yok. |
| P-04 | İki cihaz aynı vardiya saatini farklı düzenler. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | Store + accounts.test.py: account stale revision conflict; V2 alan çözümü yok. |
| P-05 | Aynı set komutu yanıt kaybı nedeniyle on kez tekrar edilir. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | Client/store probe: kayıp ACK retry 409; operation idempotency yok (RSK-03). |
| P-06 | Aynı operation_id farklı payload ile gönderilir. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | operation_id sözleşmesi current snapshot API'de yok (statik). |
| P-07 | Yerel IndexedDB transaction sırasında quota/write hatası. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | VM outbox quota hata fırlattı; actual IDB atomic fault NOT RUN. |
| P-08 | Sunucu commit'ten hemen önce/sonra process öldürülür. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| P-09 | IndexedDB outbox'a yazıldıktan hemen sonra sekme kapanır. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | account-sync.test.js: localStorage pending reload, IDB transaction değil. |
| P-10 | Eski request gecikir, yeni request başarır, eski response sonra gelir. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | account-sync.test.js: in-flight ikinci snapshot korunuyor; çok-context network race NOT RUN. |
| P-11 | Login süresi offline iken dolar. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | account-sync.test.js 401 lock/pending; tam expiry/relogin offline yol NOT RUN. |
| P-12 | Pending veri varken başka hesaba geçilir. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | account-context.test.js namespace; eski UI account test FAIL setup aşamasında. |
| P-13 | Bir kayıt silinir, eski offline cihaz bunu eski sürümle günceller. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| P-14 | Yavaş ve ters commit sıralı iki transaction sırasında cursor pull. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| P-15 | API 500/401/timeout döner veya sunucuya erişilemez. | NOT RUN | 1 | `tests/integration/test_shift_transactions.py; tests/e2e/offline-queue.spec.ts` | VM 500/503 cache,401 lock PASS alt koşul; malformed200 profille değişti (RSK-05). |
| T-01 | Europe/Istanbul'da 23:59 → 00:01, Bugün görünümü açık. | NOT RUN | 1/3 | `tests/unit/test_scheduling_time.py; tests/e2e/date-context.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| T-02 | Aynı sınırda geçmiş tarih bilinçli seçili. | NOT RUN | 1/3 | `tests/unit/test_scheduling_time.py; tests/e2e/date-context.spec.ts` | Actual midnight callback probe geçmiş 10 Eylül'ü 17 Eylül yaptı: FAIL. |
| T-03 | Geçmişteki set bugün düzenlenir. | NOT RUN | 1/3 | `tests/unit/test_scheduling_time.py; tests/e2e/date-context.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| T-04 | 22:00–06:00 gece vardiyası. | NOT RUN | 1/3 | `tests/unit/test_scheduling_time.py; tests/e2e/date-context.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| T-05 | Yaz/kış saati atlama/tekrarı olan test bölgesi. | NOT RUN | 1/3 | `tests/unit/test_scheduling_time.py; tests/e2e/date-context.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| T-06 | Cihaz saati 3 saat yanlış veya kullanıcı bölge değiştirir. | NOT RUN | 1/3 | `tests/unit/test_scheduling_time.py; tests/e2e/date-context.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| T-07 | Legacy yalnız gün içerir. | NOT RUN | 1/3 | `tests/unit/test_scheduling_time.py; tests/e2e/date-context.spec.ts` | Kaynak date-only midnight/18:00 fallback; importer precision tasarımda. |
| T-08 | 23:45 başlayan seans 00:20 biter. | NOT RUN | 1/3 | `tests/unit/test_scheduling_time.py; tests/e2e/date-context.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| W-01 | Haftalık kart, hazır antrenman ve Runner aynı günü açar. | NOT RUN | 3 | `tests/e2e/workout-golden-journey.spec.ts` | integration-v9.test.js legacy canonical/Runner uyumu; yeni Runner ayrı (RSK-08). |
| W-02 | Önceki günün completed Runner'ı saklı, bugünün reçetesi seçili. | NOT RUN | 3 | `tests/e2e/workout-golden-journey.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| W-03 | Eski gerçek seans yarım kalmış, yeni tarih seçilir. | NOT RUN | 3 | `tests/e2e/workout-golden-journey.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| W-04 | Runner görüntülenir ama set başlamaz. | NOT RUN | 3 | `tests/e2e/workout-golden-journey.spec.ts` | Legacy ready timer testleri PASS; TrainingPlanner.startRun hemen running yapar. |
| W-05 | İlk set başlarken optimizer reçete değiştirmeye çalışır. | NOT RUN | 3 | `tests/e2e/workout-golden-journey.spec.ts` | Legacy client lock testi PASS; server atomik lock yok. |
| W-06 | 4 set reçetenin ilk 2 seti manuel slot referansıyla kayıtlı. | NOT RUN | 3 | `tests/e2e/workout-golden-journey.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| W-07 | Aynı gün iki Pull seansı veya aynı adlı ring/bar varyasyonu. | NOT RUN | 3 | `tests/e2e/workout-golden-journey.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| W-08 | Ad hoc/extra set eklenir veya plan seti atlanır. | NOT RUN | 3 | `tests/e2e/workout-golden-journey.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| W-09 | Timer sıfırlanır, pause/resume yapılır, telefon kilitlenir. | NOT RUN | 3 | `tests/e2e/workout-golden-journey.spec.ts` | guided-workout-timing.test.js PASS; gerçek telefon ekran kilidi NOT RUN. |
| W-10 | Geçmiş PR kaydı düzeltilir veya silinir. | NOT RUN | 3 | `tests/e2e/workout-golden-journey.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| W-11 | Readiness biraz değişir veya aynı girdiyle sayfa yenilenir. | NOT RUN | 3 | `tests/e2e/workout-golden-journey.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| W-12 | Program block'u biter veya hareket varyasyonu ilerletilir. | NOT RUN | 3 | `tests/e2e/workout-golden-journey.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| N-01 | Gün hiç kaydedilmemiş, yalnız kahvaltı var veya tam gün onaylanmış. | NOT RUN | 4 | `tests/integration/test_nutrition_hydration.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| N-02 | Protein/uyku/HRV yok. | NOT RUN | 4 | `tests/integration/test_nutrition_hydration.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| N-03 | Aynı su veya öğün retry ile iki kez gönderilir. | NOT RUN | 4 | `tests/integration/test_nutrition_hydration.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| N-04 | Bir tarifin makroları sonradan değiştirilir. | NOT RUN | 4 | `tests/integration/test_nutrition_hydration.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| N-05 | Türkçe `1,5`, gram/ml/kg girişi veya belirsiz format. | NOT RUN | 4 | `tests/integration/test_nutrition_hydration.py` | entry-fields.test.js / health-core.test.js lokal parse PASS; tüm server domain doğrulaması yok. |
| N-06 | Vardiya kaydedilirken check-in kaydı eşzamanlı güncellenir. | NOT RUN | 4 | `tests/integration/test_nutrition_hydration.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| C-01 | Eski muscle-up ve ring kataloğu import edilir. | NOT RUN | 4 | `tests/integration/test_capability_protocols.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| C-02 | Balance, mobility, endurance ve work capacity kaydedilir. | NOT RUN | 4 | `tests/integration/test_capability_protocols.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| C-03 | Tuck/full lever veya göz açık/kapalı denge kıyaslanır. | NOT RUN | 4 | `tests/integration/test_capability_protocols.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| C-04 | Test için bir taraf/deneme bilgisi eksik. | NOT RUN | 4 | `tests/integration/test_capability_protocols.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| C-05 | Test sonucu silinir veya ölçüm birimi çevrilir. | NOT RUN | 4 | `tests/integration/test_capability_protocols.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| C-06 | Katalogda advanced rings var ama yeterlik verisi yok. | NOT RUN | 4 | `tests/integration/test_capability_protocols.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| R-01 | Aynı ham veri+as_of+model version ile yeniden hesap. | NOT RUN | 5 | `tests/unit/test_recovery_lineage.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| R-02 | Yeni yük/bağlam yokken 0/6/12/24/48 saat ilerlemesi. | NOT RUN | 5 | `tests/unit/test_recovery_lineage.py` | recovery-elapsed.test.js ve recovery-clock-v928.test.js PASS alt kapsam; V2 model değil. |
| R-03 | Uygulama iki gün kapalı, sonra açılır. | NOT RUN | 5 | `tests/unit/test_recovery_lineage.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| R-04 | Sonradan eski geceye uyku kaydı eklenir. | NOT RUN | 5 | `tests/unit/test_recovery_lineage.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| R-05 | Yarın bilinen bilgiyle dünün karar ekranı açılır. | NOT RUN | 5 | `tests/unit/test_recovery_lineage.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| R-06 | Science model sürümü değiştirilir. | NOT RUN | 5 | `tests/unit/test_recovery_lineage.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| R-07 | Sprint fixture'ı muscle/science/nutrition zincirinden geçer. | NOT RUN | 5 | `tests/unit/test_recovery_lineage.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| R-08 | Aynı aktivite iki entegrasyon veya ad hoc'ta bulunur. | NOT RUN | 5 | `tests/unit/test_recovery_lineage.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| R-09 | Veri yetersiz veya model başarısız. | NOT RUN | 5 | `tests/unit/test_recovery_lineage.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| R-10 | System Integrity butonuna basılır. | NOT RUN | 5 | `tests/unit/test_recovery_lineage.py` | Browser SystemIntegrity transport spy: 4 sandbox save girişimi (RSK-06). |
| M-01 | Legacy örnek bütün domain ve bilinmeyen alanlar içerir. | NOT RUN | 2 | `tests/migration/test_legacy_import.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| M-02 | Aynı backup tekrar import edilir. | NOT RUN | 2 | `tests/migration/test_legacy_import.py` | synthetic portable merge unit PASS; yeni importer/DB roundtrip henüz yok. |
| M-03 | Geçerli görünen iki aynı hareket/aynı gün kaydı. | NOT RUN | 2 | `tests/migration/test_legacy_import.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| M-04 | Import ortasında process/DB kesilir. | NOT RUN | 2 | `tests/migration/test_legacy_import.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| M-05 | Eski week index var, kesin takvim tarihi yok. | NOT RUN | 2 | `tests/migration/test_legacy_import.py` | app.js initWeek tarih yoksa current week'e bağlayabiliyor; migration bunu yapmayacak. |
| M-06 | Fotoğraf/reçete/set ilişkileri ve unknown alanlar roundtrip yapar. | NOT RUN | 2 | `tests/migration/test_legacy_import.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| M-07 | Yeni origin eski browser kayıtlarına erişmek ister. | NOT RUN | 2 | `tests/migration/test_legacy_import.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| M-08 | Legacy ve yeni sistem aynı anda yazmaya çalışır. | NOT RUN | 2 | `tests/migration/test_legacy_import.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| B-01 | Kayıtlar değişirken tam export alınır. | NOT RUN | 2/8 | `tests/migration/test_isolated_restore.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| B-02 | Pending offline mutasyon veya medya yüklemesi vardır. | NOT RUN | 2/8 | `tests/migration/test_isolated_restore.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| B-03 | Yedek boş izole DB'ye restore edilir. | NOT RUN | 2/8 | `tests/migration/test_isolated_restore.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| B-04 | Bozuk checksum, desteklenmeyen schema veya eksik medya. | NOT RUN | 2/8 | `tests/migration/test_isolated_restore.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| B-05 | Sahip olmadığı sporcunun export/restore isteği. | NOT RUN | 2/8 | `tests/migration/test_isolated_restore.py` | accounts.test.py kendi revizyonu/fotoğraf/rapor owner testi; full V2 export yok. |
| B-06 | Felaket kurtarma tatbikatı yapılır. | NOT RUN | 2/8 | `tests/migration/test_isolated_restore.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| S-01 | Anonymous veya başka kullanıcının kayıt ID'siyle tüm kaynaklara erişim. | NOT RUN | 1/8 | `tests/integration/test_identity_isolation.py` | accounts/cloud HTTP synthetic isolation PASS alt kapsam; tüm yeni resources NOT RUN. |
| S-02 | İstemci athlete_id değiştirir veya çapraz referans gönderir. | NOT RUN | 1/8 | `tests/integration/test_identity_isolation.py` | account server owner session'dan; normalize DB cross-FK henüz yok. |
| S-03 | CSRF, oturum sabitleme, iptal edilmiş session ve login brute force. | NOT RUN | 1/8 | `tests/integration/test_identity_isolation.py` | accounts.test.py scrypt/session/CSRF/throttle PASS alt kapsam; V2 auth henüz yok. |
| S-04 | XSS içeren not/food name veya path traversal/zip bomb import. | NOT RUN | 1/8 | `tests/integration/test_identity_isolation.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| S-05 | Log/health/export/media/CI artefact'ları incelenir. | NOT RUN | 1/8 | `tests/integration/test_identity_isolation.py` | HTTP allowlist test PASS; public GLB owner incelemesi gerekli (statik RSK-13). |
| S-06 | Account silme ve retention uygulanır. | NOT RUN | 1/8 | `tests/integration/test_identity_isolation.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| U-01 | Bütün route'lara mobil/desktop geçiş. | NOT RUN | 6 | `tests/e2e/feature-parity.spec.ts` | 29 desktop route/1 mobile screenshot; bütün state varyantları NOT RUN. |
| U-02 | Keyboard/screen reader/reduced motion/büyük yazı. | NOT RUN | 6 | `tests/e2e/feature-parity.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| U-03 | Pending işlemler varken service worker/app update. | NOT RUN | 6 | `tests/e2e/feature-parity.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| U-04 | PWA offline ve başka kullanıcıyla tekrar login. | NOT RUN | 6 | `tests/e2e/feature-parity.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| U-05 | 3B yüklenemez veya grafik hesap hatası oluşur. | NOT RUN | 6 | `tests/e2e/feature-parity.spec.ts` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| U-06 | Tüm legacy özellik envanteri karşılaştırılır. | NOT RUN | 6 | `tests/e2e/feature-parity.spec.ts` | FEATURE_PARITY mevcut envanter tamam; bütün V2 satırları henüz taşınmadı. |
| A-01 | LLM timeout/kapalı/limit aşımı. | NOT RUN | 7 | `tests/integration/test_optional_ai_boundaries.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| A-02 | Not veya dış belge, “veriyi gönder/sil” talimatı içerir. | NOT RUN | 7 | `tests/integration/test_optional_ai_boundaries.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| A-03 | Model kullanıcı onayı olmadan plan değiştirmeye çalışır. | NOT RUN | 7 | `tests/integration/test_optional_ai_boundaries.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| A-04 | Sağlayıcı token/HealthKit native izin yolu yok. | NOT RUN | 7 | `tests/integration/test_optional_ai_boundaries.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| O-01 | Build, container start ve 0.0.0.0:PORT sağlık kontrolü. | NOT RUN | 8 | `tests/integration/test_deploy_and_disaster.py` | render-start.test.py legacy arg guard PASS; gerçek V2 build/container yok. |
| O-02 | Production DATABASE_URL eksik veya DB erişilemez. | NOT RUN | 8 | `tests/integration/test_deploy_and_disaster.py` | Legacy Render Mongo fail-closed unit PASS; hedef PG readiness NOT RUN. |
| O-03 | N/N-1 client ve schema migration/deploy overlap. | NOT RUN | 8 | `tests/integration/test_deploy_and_disaster.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| O-04 | Worker outbox işlerken process ölür/aynı job tekrar alınır. | NOT RUN | 8 | `tests/integration/test_deploy_and_disaster.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |
| O-05 | Referans veri setiyle performans ve uzun oturum testi. | NOT RUN | 8 | `tests/integration/test_deploy_and_disaster.py` | Yeni ürün senaryosu çalıştırılmadı; eski unit raporundan başarı türetilmedi. |

## INV değişmezleri

| INV | Kabul izleri / tasarım | V2 durum |
|---|---|---|
| INV-01 | P-01/02/15 · ACK/local durum, ADR-0002/3 | NOT RUN |
| INV-02 | P-03/04/13 · version/tombstone | NOT RUN |
| INV-03 | P-05/06 · aynı işlem tek etki | NOT RUN |
| INV-04 | W-02/03/07, T-08 · plan/seans/tarih ayrımı | NOT RUN |
| INV-05 | W-01 · prescription id+version | NOT RUN |
| INV-06 | W-04/05 · ilk gerçek sette transaction kilidi | NOT RUN |
| INV-07 | T-01/02 · midnight tarih bağlamı | NOT RUN |
| INV-08 | P-01, U-01 · kayıt sonrası form görünürlüğü | NOT RUN |
| INV-09 | T-03/07 · occurred_at/updated_at | NOT RUN |
| INV-10 | N-01/02, R-09 · UNKNOWN | NOT RUN |
| INV-11 | R-09 · model card/ölçüm ayrımı | NOT RUN |
| INV-12 | R-05/06 · raw history/model lineage | NOT RUN |
| INV-13 | R-10,M-04,B-03 · isolated fixture/import/reset | NOT RUN |
| INV-14 | A-01 · LLM kapalı core | NOT RUN |
| INV-15 | S-01/02/03 · server ownership | NOT RUN |
| INV-16 | M-01/06/07,B-03 · kaynak ZIP/real DB/backup ayrımı | NOT RUN |

Gereksinimlerin tam zorunlu çıktıları [değiştirilmeden saklanan kabul sözleşmesinde](prompts/03_ACCEPTANCE_MATRIX.md). Bu tablo onları daraltmaz. Release: NO-GO; sonraki adım Aşama 1.
