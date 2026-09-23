# ADR-0002 — PostgreSQL transaction, komut ve cursor

Durum: kabul edilen hedef tasarım, henüz kodlanmadı. RSK-01/03/04/08/09; INV-01/02/03/15.

## Transaction sınırı

Her komut `operation_id`, `entity_id`, `expected_version`, `command_type`, `schema_version`, yalnız dirty alanlar taşır. Owner session'dan çıkarılır. Aynı transaction: ownership/schema → athlete sequence satır kilidi → idempotency lookup → version/domain check → satır değişikliği → audit + change_log + outbox → operation response → commit. ACK yalnız commit sonrası.

Unique `(athlete_id, operation_id)`; payload canonical digest'ine command/API sürümü dahil. Aynı anahtar/aynı digest önceki yanıtı döndürür, farklı digest 409 `idempotency_payload_mismatch`. Sağlık değeri response/loglara gereksiz yazılmaz. Komut metadata'sı supported offline süresinden kısa temizlenemez; ilk hedef 30 gün offline, replay koruması en az 90 gün. Nihai retention maliyet/mahremiyet kararı Aşama 1/8'de test ve ADR güncellemesi ister; süre aşımı açık revalidation'dır.

İlk dilimde per-athlete tek sequence row `SELECT FOR UPDATE`: aynı athlete command'ları sırayla commit eder; başka kullanıcı bağımsız. Bu sade kilit bilinçli throughput tercihi. Deterministik lock order; transient DB error retry sınırlı/jitter ve aynı op ID ile. Domain revision hatası retry değil conflict. FK/unique/CHECK + `(athlete_id,id)` compound referanslarla çapraz owner engeli. DB testleri gerçek PostgreSQL üzerinde yapılır; SQLite/mongomock bunların yerine geçmez.

## Cursor ve okuma

Sequence aynı transaction'da artırılır; değişiklik bu athlete için commit sırasına uygun cursor alır. Global BIGSERIAL'ın commit sırası olduğu varsayılmaz. Bootstrap state + cursor tek repeatable-read transaction'da; pull yalnız committed sequence > cursor, tombstone dahil. Cursor retention dışındaysa 410/rebootstrap; pending journal korunur. Minimum gerekli change delta döner, sağlık payload'ı public stream yok. İlk taşıma polling; SSE gerekirse hızlandırma, doğruluk kaynağı değil.

## Çatışma ve silme

Farklı entity değişiklikleri birleşir. Aynı entity expected_version değiştiyse base/current/requested dirty fields ile görünür conflict; ilk dilimde otomatik merge zorunlu değil. Kullanıcı çözümü yeni op + current expected_version; “local snapshot kazanır” yok. Tombstone version taşır; eski offline update diriltmez. Restore ayrı açık command ve audit.

## Job/outbox

DB-backed outbox aynı commit'te yazılır. Consumer kısa transaction'da lease alır, işlem idempotenttir; network çağrısı boyunca DB kilidi tutmaz. Lease timeout/attempt count/backoff/dead-letter görünür. Worker crash aynı işi yeniden alabilir; unique calculation input_revision/model_version ile tek mantıksal etki. İlk dilimde optimizer hızlı saf servis olabilir; uzun işler yalnız ihtiyaç oluşunca ayrı worker process. Redis/Kafka şart değil.

Resmi dayanak: [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html), erişim 16 Eylül 2026. Read Committed'da birden çok okuma farklı snapshot görebilir; sequence değişiklikleri rollback semantiğine sahip değildir. Bu yüzden açık satır kilidi ve tutarlı bootstrap sınırı seçildi. Kilit/rollback/deadlock/ters commit sırası P-08/P-14 testleriyle kanıtlanmadan PASS değil.
