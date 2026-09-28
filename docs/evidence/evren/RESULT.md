# EVREN bağlantısı — 28 Eylül 2026

## Tamamlanan kapsam

- Sabit EVREN HTTPS Chat Completions adaptörü; ayrı secret/model/provider ayarı.
- Sağlayıcıya özel onay; OpenAI onayı EVREN'e gönderim açmaz. Eski OpenAI entegrasyonu ve standard planner korunur; hata durumunda otomatik sağlayıcı değişimi yok.
- Yanıt şeması + ortak süre/ekipman/hareket/yetkinlik kontrolleri. Model üretimi yalnız taslak; kullanıcı kaydetmeden ana kayda yazım yok.
- Provider metadata EVREN kabul eder, eski OpenAI programları geçerli kalır.

## Çalıştırılan kabul kapıları

`docs/evidence/stage-9/evren-*.json` komut, kaynak hashleri, base commit, ortam ve exit code; `.log` stdout/stderr:

- `evren-api`: 54 test PASS — OpenAI regression, EVREN transport, eski/yanlış sağlayıcı onayı, red/yarım cevap, anahtar izolasyonu, hata sanitizasyonu, plan validasyonu ve gerçek geçici PG kaydı.
- `evren-mongo`: 2 test PASS — aynı consent + taslak kalıcılığı sözleşmesi geçici yerel replica set.
- `evren-browser`: PASS — sentetik kullanıcı, ayrı 10008 sunucu, mock AI; sağlayıcı değişince onay sıfırlanır, EVREN onayından önce istek çıkmaz, plan önizlemesi yazmaz, açık kabul sonrası ana plan. 360/390/768/1280 taşma yok; Axe ihlali 0. Gerçek model kalitesi testi değildir.
- `evren-build`, `evren-lint`, `evren-ruff`: PASS. Build'de önceki büyük chunk uyarısı sürer.

## Canlı bağlantının sınırı

Kullanıcı tarafından sağlanan EVREN anahtarı yalnız geçici yerel sunucu süreci belleğine getpass ile verildi. Anahtar kaynak/GitHub/Render/.env dosyasına yazılmadı. Resmî GET `/v1/terms/status` yanıtı `accepted:false`; GET `/v1/models` HTTP 403. Kullanım koşulları kullanıcı adına kabul edilmedi. `live-connection.json`: BLOCKED_TERMS, model üretim isteği 0, gerçek kişi kaydı okunmadı. Kullanıcı koşulları kabul ettikten sonra gerçek sentetik üretim ayrıca doğrulanmalı; çalışan model üretimi iddia edilmez.

Önizleme `http://127.0.0.1:10005/#program`, EVREN `glm-5.3` (resmî katalogda yayımlanan kimlik; hesap erişimi henüz doğrulanmadı). Mevcut yerel veri deposu değiştirilmeden sunucu yeniden başlatıldı; anahtar sadece süreç belleğinde, restart sonrasında yeniden güvenli yapılandırma gerekir.

## Veri, yayın ve geri dönüş

SQL/Mongo şema göçü, gerçek hesap/medya geçişi veya veri testi yok. Yeni kaynaklar ve public release frontend yerelde; Render/GitHub yayını yapılmadı. Yeni EVREN provider metadata'sıyla oluşturulmuş planları eski kod düzenlerken reddedebilir; rollback provider kabulünü korumalı. Onay yenilemeden OpenAI'ye geri yönlendirme yok.
