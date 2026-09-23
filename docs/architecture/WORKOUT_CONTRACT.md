# Program ve execution sınırı

- `program_versions` + `weekly_slots` + `program_exercises`: kullanıcı taslağı; açık aktivasyon. Yeni sürüm `parent_id/family_id` ile önceki döneme bağlanır; eski sürüm ve actual kayıtlar silinmez.
- `session_prescriptions` + `prescription_set_slots`: tarih + kabul edilmiş programın kararlı UUID reçetesi. Haftalık plan / hazır çalışma / Runner aynı ID'yi okur. GET hiç materialize etmez; açık komut gerekir.
- `workout_sessions`: aynı gün birden fazla UUID. Açmak `ready`; gerçek başlatma/ilk yapılan set reçeteyi transaction içinde kilitler. Başlamış/tamamlanmış eski seans seçili yeni günle yeniden etiketlenmez.
- `performed_sets`: manuel ve yönlendirmeli giriş aynı tablo. `(athlete, session, slot)` yaşayan kayıt için unique. Extra/substituted/skipped ayrı; skipped yük değildir. İsim benzerliği slot eşleştirme değildir.
- Timer: UTC deadline / paused remaining. Reset gerçek setleri silmez. Client saat farkı HTTP server Date üzerinden düzeltilir; bu sürüm oturum anında server zamanı kullanır.
- Düzeltmede orijinal `occurred_at`, günlük gruplama ve session/slot kimliği korunur; audit ve updated_at yenilenir.
- Yerel form taslakları owner-scoped IndexedDB'de; actual komut outbox'a atomik kaydolur. Hedefi gerçekleşmiş saymak için açık "Hedefi aynen tamamladım" eylemi gerekir.

## Legacy

Structured multisport dönemleri ve explicit actual step/index değerleri taşınır. `sport_program` projection yalnız gerçek `sportSessionId` ilişkisi varsa tekrar sayılmaz. Eski açık structured Runner slotları ve gerçek setleri aynı ilişkiyle taşınır. Guided Runner `guidedSessionId/guidedExerciseIndex` açık referansıyla eşlenir; salt ad benzerliği kullanılmaz. Sayısal hedef belirsizse arşiv/provenance korunur ve değer uydurulmaz. Date-only actual, import anına çevrilmez.

## Başlangıç önerisi

`starter-heuristic-1` sağlıklı yetişkin beyanı ve sınırlı branş kapsamında değiştirilebilir başlangıç iskeletidir. Kilogram/performans uydurmaz; uzman onaylı kişisel reçete değildir. Genel dayanak olarak [ACSM 2026 bildirisi bibliyografisi](https://pubmed.ncbi.nlm.nih.gov/41843416/) doğrulandı. Üründeki belirli set/tekrar değerleri ürün başlangıç varsayımıdır; kaynağın bütün kişilere bu sayıları zorunlu tuttuğu iddia edilmez. Bilimsel kaynak/model card ve geniş kapsam incelemesi Aşama 5'te ayrı yapılır.
