# Birleşik V2 yayın adayı

## Durum ve kapsam

Yerel incelenebilir aday: `codex/unified-revision-v2`, taban `0da7c5e8c632c55fed7d654931eab1ff6129ae02`. Son kaynak commit'i Git geçmişinden; koşu kaynak hashleri her kanıt JSON'undan doğrulanır. Üretime push/deploy ve gerçek veri aktarımı yapılmadı. Mevcut ücretsiz Render + MongoDB mimarisi korunur; yeni ücretli servis yok.

Kanonik hareket kimliği, gerçek/plan set ayrımı, bilinen beslenme kapsamı, birim ve ret düzeltmesi, kayıp ACK/idempotency, açık çatışma çözümü, set türü/superset, ekipman profilleri, manuel süre/gün önizlemesi, seans geri bildirimi, genel CSV ve kapsam seçmeli PDF uygulanmıştır. Marka merkezi yapılandırmada; karanlık tema geçiş kontrastı ve dokunma hedefleri düzeltildi. Üç boyutlu dosya kalıcılığı ve mevcut hesap/medya işlevleri korunur.

## Doğrulama

`docs/revision-status.md` R01–R30/AT01–AT55 matrisi ve test kapsamını içerir. Başlıca kanıtlar `docs/evidence/stage-9/revision-v2-*.json/.log`; loglar gerçek komut/exit/kaynak hashleri taşır.

- PostgreSQL tam çekirdek:82 geçti; son rapor kontrolleri29 ve son ek kabul paketi20 geçti (örtüşen kümeler).
- MongoDB sentetik replika:100 geçti; son rapor/karar2 ve eski belge1 odaklı kontrol geçti.
- İstemci:19 test/6 dosya geçti; TypeScript build, ESLint, Ruff ve şema/model drift kontrolü.
- Chrome:profil→plan→gerçek set→günlük ölçüm→rapor→önbelleksiz yeniden giriş. Dokuz hedef/tek set, üç set/düzeltme, 180AU, önceki set alan doldurma, modül tercihi ve gün taşıma.
- 360/390/768/1280 gerçek viewport; açık/koyu profil Axe, 200% temel yazı ve klavye odağı; GLB istekleri engelliyken temel rapor.
- 11 sayfalık sentetik PDF görsel incelendi. Detay: `docs/evidence/revision-v2/pdf-review.md`.

Testler sentetik veridir; gerçek hesaplar veya kişisel GLB/yedek kullanılmadı. Fiziksel telefon yazılım klavyesi ve ekran okuyucu saha kontrolü yapılmadı. Otomatik kontroller bütün WCAG standardına veya klinik doğruluğa uygunluk sertifikası değildir. Derleme ayrı Three.js chunk için boyut uyarısı verir; 3B temel akıştan ayrıdır. Test altyapısında iki mevcut Starlette/anyio deprecation uyarısı vardır.

## Kapalı özellikler / insan incelemesi

Sayısal klinik doz, otomatik kilogram artışı ve kişisel iyileşme/hasar yüzdesi doğrulaması **kapalıdır**. Devralınan başlangıç şablonu kişiselleştirilmiş uzman reçetesi değildir; eksik ekipman/örüntü ve süre sınırı açıkça gösterilir. Strong/Hevy marka bağlayıcısı, doğrulanmış besin veri sağlayıcısı ve uzman onayı ilan edilmez. Manuel kayıt/plan/rapor bu bağımlılıklarla engellenmez. Pilot ve içerik listesi: `docs/pilot-readiness.md`.

## Şema, veri, hesap ve medya etkisi

Üç eklemeli SQL migration; Mongo eski belgelerine yazmadan uyumluluk varsayılanları. Tam sözleşme: `docs/migration/REVISION_V2.md`. Profil ve seans bağlamları sürümlü JSON; eski set türü unknown. Hesap/parola modeli, oturum yolları ve medya kimlikleri değiştirilmedi. Kanonik hareket eşleme aracı çevrimdışı kopya/dry-run/rollback içindir; canlı Mongo otomatik dönüştürülmedi. Yeni alanlar tam JSON yedek kapsamındadır; CSV tam yedeğin yerine geçmez.

## Yayın ve geri alma

Yayın kararından önce mevcut veritabanı ve medya yedeği ile izole geri yükleme doğrulanmalı. UI ve API birlikte yayımlanmalı; yeni komutları eski API bilmez. `release/v2` yalnız derlenmiş kamuya açık varlıklardır; runtime dosyaları/şifreler buraya girmez. Mevcut Render kurulumu ve MongoDB ile devam edilir; ücretli disk/servis gerekmez.

Eski API'ye doğrudan dönüş yeni Mongo alanlarını tam doküman yazımında kaybedebilir; SQL downgrade yeni sütunları düşürür. Yeni yazımlardan sonra öncelik uyumlu ileri düzeltmedir. Geri dönüş gerekirse yazımı durdur, yeni yedeği ve işlem farkını koru, önceki yedeği izole doğrula; kayıp kayıtları sessizce kabul etme. Bu görevde üretim rollback komutu çalıştırılmadı.

Yayın sonrası bakılacaklar:401/409/422 oranları, kuyruğun kalıcı reddi, import dedup/transaction hatası, PDF digest409, eşleşmeyen hareket ve boş kapsam. Ham sağlık notu veya parola yeni telemetriye gönderilmez.

**Tek sonraki dış karar:** Bu adayın mevcut ücretsiz Render/MongoDB ortamına kontrollü olarak yayımlanması. Uzman/pilot sonuçları olmadan kapalı politikalar etkinleştirilmez.

## Paket ve kaynak taraması

`release/v2/build-manifest.json` yerel derleme varlıklarının SHA256 listesidir. `revision-v2-package` başarıyla yalnız kamuya açık varlıkları paketledi. `docs/evidence/revision-v2/source-safety.json` incelemesinde 182 kaynak/kanıt dosyasında tanımlı sır/dosya türü kalıpları bulunmadı (PASS). Bu tarama bütün kişisel veri türlerinin yokluğunu matematiksel olarak kanıtlamaz; kullanılan QA verileri sentetiktir.

## Son ek: soru tabanlı program akışı

27 Eylül 2026: MacroFactor Workouts resmî akış incelemesi sonrası sekiz adımlı, özgün Athlete Life sihirbazı ve `guided-strength-1` taslak üretimi eklendi. Eski hesap/programlar korunur; önizleme kalıcı kayıt yaratmaz. Soru yanıtları ancak açık program kaydında karar JSON'una eklenir. Yeni SQL migration/Mongo koleksiyonu yok; canlı hesap/medya göçü veya yayın yapılmadı. Dört ekipmana özgü yeni hareket kimliği eski sürümde UNKNOWN görülebilir; UI/API/katalog birlikte yayımlanmalı. İçerik varsayımları, native uygulamaya erişim sınırı ve güncel kanıtlar: `docs/MACROFACTOR_REVIEW.md`.
