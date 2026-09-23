# Aşama 3 — tek reçete / tek actual kaynağı

17 Eylül 2026, PostgreSQL 18.6, Python 3.12.14, Chrome 153; sentetik DB/context; e92b4b7 + V2 çalışma ağacı.

- `.venv-v2/bin/pytest -q tests/v2`: **24 PASS**, exit 0. Program sürümleme/ana plana onay, immutable prescription, ilk gerçek execution kilidi, manuel/guided slot uzlaştırma, farklı seans/variant izolasyonu, skipped/extra, tarih koruyan edit/delete, timer ve legacy structured projection dedup/aktif Runner devamı.
- `npm --prefix apps/web test`: **5 PASS**, exit 0; ortak IDB regression'ları.
- `npm --prefix apps/web run build`: **PASS**, exit 0.
- `node tools/v2/workout_browser.mjs`: **PASS**, exit 0; 390×844 Chrome mobil viewport. Programı gerçek formdan oluştur → onayla → reçete → açılışta ready → iki manuel actual set → üçüncü set offline → sekme kapat → tekrar online → tam 3 actual set → timer restart/reload/reset → setler korunur.
- `browser-results.json`, `runner-mobile.png`, `api-tests.log`, `client-tests.log`, `build.log`; Python lint kalan hata yok.

Tarayıcı testi, düğme ile IDB transaction arasında eski synced metninin görünebildiği dar aralığı ortaya çıkardı. `writing` durumu senkron bildirilerek düzeltildi; golden journey yeniden geçti.

Sınır: gerçek iPhone değil mobil viewport. Legacy belirsiz/non-structured alanlar raw arşivde; bilinmeyen varyasyon ve tarih varsayılmaz. Kaynak programın süresi/manuel hedefleri korunur. Kişiselleştirilmiş doz/progresyon bilimi Aşama 5; bütün eski ekran paritesi Aşama 6 kapısıdır. Canlı MongoDB değişmedi.
