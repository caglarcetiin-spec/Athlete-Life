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

## Koşul onayından sonra yeniden doğrulama — güncel sonuç

**Canlı sentetik üretim PASS.** `live-20260928T032348362334Z.json` / `live-connection.json`: terms accepted, `mimo-v2.6-pro`, reasoning `low`, 61.83 saniye, dört gün / 26 hareket girdisi, validatör sonucu `draft`. Gerçek kullanıcı verisi okunmadı; program/seans/actual set yazılmadı. Önceki BLOCKED_TERMS, iki timeout ve reddedilen planlar tarihli dosyalarda korunur. Aradaki AttributeError, uzun yaşayan yerel tanı sürecinin yeni Settings alanını henüz yüklememesi nedeniyle oluştu; üretim isteğine ulaşmadı. Bu kayıtta generation_attempts=1 çağrıya giriş sayısıdır, sağlayıcının tamamladığı istek sayısı değildir.

Başarılı canlı deneme sırasında aynı son istem metni çalıştı; yalnız prompt sürüm etiketi daha sonra `ai-planner-2` olarak kayda eklendi. İlk regression bu yeni etiketin ProgramInput literal listesine eklenmemiş olmasını yakaladı (5 fail); validator eski+yeniyi kabul edecek şekilde düzeltildi, test beklentileri gevşetilmedi. Başarısız test kanıtı stage-9/runs altında korunur.

Son durum: `evren-final-api`: **55 PASS**, `evren-final-mongo`: **2 PASS**. Yeni reasoning ayarı, açık aday kuralları ve eski/yeni metadata kayıt akışı doğrulandı. Önceki browser kabulü frontend değişmediği için geçerli kapsamda; bu tur frontend değişmedi, tekrar paketlenmedi.

Yerel 10005 önizlemesi aynı veri deposuyla `mimo-v2.6-pro` / `low` kullanacak şekilde yeniden başlatıldı; anahtar süreç belleğinde. Kullanıcı sayfayı yenileyip EVREN onayını işaretleyerek plan üretebilir. Bu sonuç belirli sentetik örneğe aittir; biyolojik doğruluk/evrensel model kalitesi veya her isteğin 62 saniyede biteceği garantisi değildir. Render yayını/şema/hesap/medya göçü yok.

## Güncel model: kullanıcı talebiyle GLM‑5.3

`live-20260928T033539429179Z.json` / `live-connection.json`: **PASS**, model `glm-5.3`, reasoning `low`, dört gün / 22 hareket girdisi, 43.21 saniye; kişisel veri okunmadı, veritabanına test yazımı yok. Önceki GLM denemelerinde hareket kapsamı ve yanıt biçimi hataları reddedildi, sonuçlar tarihli artefact'larda korunur. Reddedilen cevaplar gerçek kullanıcı kaydı olmadı. `ai-planner-3` günlük required_patterns/minimum_strength_sets bilgisini açık verir; validatörün kısıtları değişmedi. Son başarılı çağrıda completion stop, 4359 prompt / 2097 completion (402 reasoning) tokenı; ham sentetik yanıt sadece geçici yerel tanı dosyasında, repo'ya alınmadı.

`stage-9/glm-api`: 55 PASS; `glm-mongo`: 2 PASS; `glm-lint`: PASS. Komutlar/kaynak hashleri/exit kodları yanlarındaki JSON/log dosyalarında. Modelin her girdide başarılı olacağı veya klinik uygunluk garantisi değildir.

Yerel 10005 aynı veri deposuyla GLM‑5.3'e geçirildi. Yeni hesap/medya/şema göçü, kullanıcı kayıt değişimi veya Render/GitHub yayını yok. Rollback eski kayıtları silmeden sunucu model ayarı ve uyumlu prompt_version kabulüyle yapılır; otomatik başka modele yönlendirme yok.
