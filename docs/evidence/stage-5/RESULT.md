# Aşama 5 — kaynakları görünen hesap ve raporlar

Temel commit: e92b4b736e9f4aa8bcd64103ec59b1aa6abf5297; dal codex/alos-2-stage-0; değişiklikler çalışma ağacındadır. Ortam macOS arm64, Python 3.12, PostgreSQL 18.6, Node 24.19, gerçek Chrome 153. Yalnız sentetik veriler.

## Ölçülen sonuç

- `PYTHON_DOTENV_DISABLED=1 STORAGE_BACKEND=sqlite ACCOUNT_STORAGE_BACKEND=sqlite .venv-v2/bin/python -m pytest tests/v2 -q`: aşama sonunda 40 PASS, exit 0 (`api-tests.log`). Sonraki hesap/arşiv regresyonu 44 PASS (`../stage-6/api-tests.log`). V2 fixture gerçek PostgreSQL üzerinde yalnız rastgele `alos_test_*` veritabanı oluşturur; bu legacy env değişkenleri V2'yi SQLite'a yönlendirmez.
- `node tools/v2/reports_browser.mjs`: PASS, exit 0; gerçek set → bölgesel yük → değişmez karar kaydı → set silme → yeni hesapta yükün kalkması ve eski kararın korunması. `browser-results.json`, `a11y.json`, `reports-mobile.png`.
- 390×844 Chrome görünümü: yatay taşma ve pageerror yok; axe ihlali yok. Fiziksel iPhone sonucu değildir.
- `PYTHONPATH=apps/api .venv-v2/bin/python tools/v2/report_sample.py`: exit 0. `synthetic-report.pdf` iki sayfa olarak pdftoppm ile yeniden çizildi ve görsel kontrol edildi (23 Eylül). Sıfır değer artık kayıp veri olarak gösterilmiyor. Son fixture çalışmasında yeni zorunlu `goal.metric` alanının eksikliği KeyError verdi; fixture'a `custom` eklendi, ürünün eksik alanı varsaymasını sağlayacak test gevşetmesi yapılmadı.

## Kapsam

Saf, as_of ile yeniden üretilebilir model; gelecekteki kayıtları dışlama; tarih hassasiyetinden belirsizlik aralığı; ayrı kuvvet/izometrik/teknik/kardiyo birimleri; tekilleştirilmiş aktivite ve uyku; UNKNOWN; semptom ve ağrıyı ayrı gösterme; geçmişte bilinen/güncel bilgi; değişmez analiz snapshot'ı; iki karşılaştırılabilir seansa dayalı onay bekleyen ilerleme önerisi. Integrity yalnız bellek içi sentetik girdiler kullanır.

Kaynaklar `apps/api/alos/evidence.py`, model kartı `docs/science/EXPOSURE_MODEL.md`. Yarı ömürler ürün varsayımıdır. Sonuç ölçülmüş kas hasarı, klinik iyileşme yüzdesi veya güvenli antrenman garantisi değildir. Otomatik kişisel model eğitimi kapalıdır; dış uzman klinik değerlendirmesi yapılmadı. Kaynakların erişim kapsamı ve eksik tam metinleri kayıtlıdır.

## Veri / yayın / geri dönüş

Yeni AnalysisRun tablosu ve sürümlü rapor endpoints yalnız ayrı V2 test ortamındadır. MongoDB ve canlı v10 değişmedi. Üretim hesap veya medya göçü yok. Geri dönüş V2 servisini durdurmak/özellik bayrağını kapatmaktır; canlı kayıtlar yeniden yazılmadı. Yeni kayıtlar oluştuğunda migration downgrade veri kaybettirebilir; geri dönüş için dump ve ayrı restore gerekir.

Aşama 5'in mevcut deterministik model/rapor kontrolleri PASS. Bu, tüm özellik paritesinin ya da sürümün yayın kabulünün tamamlandığı anlamına gelmez.
