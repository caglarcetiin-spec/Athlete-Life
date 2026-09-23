# Aşama 4 — kayıt bütünlüğü

Ortam: macOS arm64, Node 24.19, Python 3.12, PostgreSQL 18.6, Chrome 153; yalnız geçici sentetik kullanıcılar. Çalışma ağacı `codex/alos-2-stage-0`, temel e92b4b7; V2 değişiklikleri henüz commit edilmedi.

- Backend: `pytest -q tests/v2`: bu aşama sonunda **31 PASS**, exit 0. Sonraki analysis testleriyle birleşik regression 37 PASS (`../stage-5/api-tests.log`).
- Build: `npm --prefix apps/web run build`, exit 0.
- Gerçek UI: `node tools/v2/lifestyle_browser.mjs`, exit 0. Besin oluşturma → 12,5 ondalık → öğünün tüketim snapshot'ı → su → check-in → gece uykusu → front lever → sayfa yenileme → ikinci oturumda aynı öğün/su.
- 390×844 mobil viewport, yatay taşma yok, pageerror yok. Sonuç ve gerçek ekranlar bu dizinde.
- Önceki denemeler katalog API eksik Path importunu ve alanın açıklamasının erişilebilir ada karışmasını ortaya çıkardı. Kaynak hataları düzeltildi; aynı yol yeniden sınandı.
- Tarif/besin güncellemesi geçmiş öğünü değiştirmiyor. Owner izolasyonu, bağımsız DB export/restore, su retry, değişim/silme sonrası PR, farklı varyasyon ve birim ayrımı test edildi.
- Legacy öğün gramajı bilinmiyorsa null; makrolar ve orijinal porsiyon etiketi korunur. Water ledger varsa toplam tekrar eklenmez. 1–5 eski enerji ölçeği otomatik 0–10'a çevrilmez. Bütün ham alanlar arşivde kalır.

Sınırlar: Sentetik transfer doğrulandı; gerçek kullanıcı migration'ı yapılmadı. iPhone donanım testi değil. Bilimsel model geçerliliği bu testin konusu değil. Capability kapsamı eski 8 alan ve 199 branş kataloğudur; katalogdaki ileri beceri kişiye otomatik önerilmez.
