# Aşama 2 — taşıma / yedek kapısı

Sentetik kaynaklar; macOS arm64, Python 3.12.14, PostgreSQL 18.6; temel commit e92b4b7 + V2 çalışma ağacı.

- `.venv-v2/bin/pytest -q tests/v2`: **16 PASS**, exit 0; `api-tests.log`. Önceki 9 test + legacy/checksum/idempotency/unknown/duplicate/date-only/atomik rollback/medya/SQLite read-only/eşzamanlı export/bağımsız DB restore.
- `node tools/v2/restore_browser.mjs`: **PASS**, exit 0. Gerçek UI dosya seç → önizleme → onay → indir → ikinci boş PostgreSQL DB → yeniden login → dosya seç/onay → vardiya / Runner geçmişi / öğün / su / Capability / private fotoğraf aç.
- `restore-browser.json`: bu küçük sentetik fixture için yeni server başlangıcı + login + import + UI kontrolü **2.151 saniye**. Export anındaki canonical kayıt kaybı 0. Bu ölçüm cloud RTO/PITR garantisi değildir.
- Orijinal legacy fotoğraf payload'ı raw arşivde aynen; güvenli JPEG önizleme ayrıca private media tablosunda. Bilinmeyen alanlar ve audit geçmişi sahibi için indirilebilir yedekte korunur.
- TypeScript/Vite build PASS; Python lint kalan hata yok. Format sözleşmesi `docs/migration/BACKUP_FORMAT.md`.

Derinlik sınırı testinde ilk beklenti 422 idi; parser'ın boyut/karmaşıklık sözleşmesi 413 olduğu için test özel 413 assertion'ına ayrıldı. Gerçek davranış gevşetilmedi. Browser testinde arşiv select etiketi seçenek metinlerini içeriyordu; explicit label/id ile düzeltildi. Kapanmış BroadcastChannel'a geç ACK bildirimi de düzeltildi.

## Kapsam sınırı

Eski program/Runner/beslenme kayıtları şu anda kayıpsız arşivde açılır. Canonical domain adaptörleri Aşama 3/4'te eklenir ve ayrıca test edilir. Gerçek kişisel kaynak/production migration **NOT RUN**. Bu kapı mevcut verileri koruma ve bağımsız sentetik restore içindir; tüm ürün feature parity/release PASS değildir.
