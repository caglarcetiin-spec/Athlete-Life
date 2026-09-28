# Tam hareket kataloğu, branş profili ve AI dönem analizi

Kaynak başlangıcı: `2083b9a`. 28 Eylül 2026.

## Kullanıcı akışı

1. Antrenman → Hareket kütüphanesi, `/api/v2/catalogs` kaynağındaki **92** hareketi gösterir. Arama, çalışma türü filtresi, kanonik kimlik, ekipman, kayıt birimi ve katsayılı kas listesi aynı katalogdan gelir. Altı mevcut teknik çizim korunur; diğer hareketlere yanlış teknik çizim atanmamıştır. Kas eşlemesi bulunan hareketlerde şematik bölge haritası gösterilir; bilinmeyen eşleme açıkça belirtilir.
2. Profil ve yönlendirilmiş plan aynı 199 branşı 15 kategoride gösterir. Plan sihirbazında kategori filtresi ve branş araması bulunur. Her seçili branş için bağımsız, isteğe bağlı seviye/yıl/mevcut sıklık/süre/bilinen teknikler girilir. Bir branştaki seviye diğerinde yeterlik sayılmaz. Bu alanlar AI bağlamına ve onaylanan programın guided_choices verisine katılır.
3. Gelişim → Durumum veya Raporlar → **AI ile dönem değerlendirmesi**. 1/2/4/8/12 hafta ve bitiş tarihi seçilir. Antrenman kayıtları temel kapsamdadır; vücut ölçüsü, performans testi, hedef, beslenme/su ve uyku kullanıcı tarafından ayrıca seçilir. Sunucudaki özeti görmeden ve sağlayıcıya özel onay verilmeden AI çağrısı yapılmaz.
4. AI, seçilen dönemle aynı uzunluktaki önceki dönemi yorumlar. Her bulgu gönderilen bir veya daha fazla fact kimliğine dayanmak zorundadır. Dayanaklar kullanıcıya açılır. Sonuç JSON olarak indirilebilir; bu ilk sürüm yorumu otomatik bulut arşivine kaydetmez, programı ve kayıtları değiştirmez.

## Doğruluk ve kapsam

- Hareket kimliği / varyasyon / ekipman / taraf / yük türü / yük / modalite / set türü eşitliği karşılaştırma gruplarını belirler. Serbest metinli varyasyon ve ekipman dış servise gönderilmez, eşitliği koruyan anonim grup anahtarı kullanılır.
- Günlük miktar özetleri gerçek setlerden gelir. Plan karşılaştırması yalnız materialize edilmiş tarihe bağlı reçeteleri sayar; kaydedilmemiş günün yapılmadığı varsayılmaz. Seansı bitirmiş olmak tüm hedef setlerin yapılmış olduğunu kanıtlamaz.
- Kas katsayılı yük, kas büyümesi/hasarı ölçümü değildir. Kilo, bel veya yağ ölçümü kas büyümesini tek başına kanıtlamaz. Bilinmeyen beslenme/uyku sıfıra çevrilmez. AI yorumudur; klinik veya biyolojik doğrulama iddiası yoktur.
- 199 branşın kategorize edilmiş olması, 199 branşa ait her teknik için doğrulanmış otomatik reçete veya kas eşlemesi bulunduğu anlamına gelmez. Planlayıcının uygun hareket/yetkinlik doğrulaması korunur; katalog dışındaki tekniklere uydurma katsayı verilmez.
- Katalogdaki her hareket artık görünür; her biri için tam teknik animasyon hazır olduğu iddia edilmez.

## API / veri / mahremiyet

- Yeni `sport_experience` alanı `guided_choices` içinde en fazla 20 kayıt: sport_id, nullable level/years/sessions_per_week/session_minutes, known_skills. Seçili branşlara bağlı, benzersiz olmalı. Alan yoksa [] olarak okunur.
- `sports.py::categorized_sports()` özgün branş kimliğini ve family alanını değiştirmeden category/category_label ekler. Profile yalnız eski sport_ids kimlikleri yazılır.
- Yeni salt okunur akış: GET `/api/v2/ai-progress-status`, POST `/api/v2/ai-progress-preview`, POST `/api/v2/ai-progress-review`.
- PeriodRequest: end_date, days (7/14/28/56/84), include_measurements/nutrition/sleep/capabilities/goals bool. Varsayılan ek kapsamların tümü false. ReviewRequest ek olarak preview_digest ve sağlayıcıya özel progress-evren-v1/progress-openai-v1 onayı ister.
- Hesap yalnız sunucu oturumundan belirlenir. CSRF zorunludur. İstemciden athlete_id veya yapay veri özeti kabul edilmez. Gerçek kayıtlar yeniden okunur; gönderilecek özet değişmişse 409 ile yeni önizleme/onay istenir. AI planlama ile ortak kullanıcı/genel kullanım sınırları korunur.
- Dış servise hesap kimliği, ad, ham kayıt ID'leri, serbest notlar, fotoğraf/GLB, tahlil, ağrı, regl verileri gönderilmez. Tam gönderim bağlamı UI'da gösterilir. Büyük özet sessiz kırpılmaz; daha kısa dönem istenir. Çıktının hayali dayanak kimliği içermesi reddedilir.
- EVREN/OpenAI adaptörü varsayılan plan şemasını koruyarak ayrı `ProgressReview` şeması ve talimatı kabul eder. Gizli anahtar yalnız sunucuda kalır. Testlerde sağlayıcı yanıtları sentetiktir; gerçek kullanıcı sağlık kayıtlarıyla veya canlı EVREN çağrısıyla test yapılmaz.

## Şema, yayın ve rollback

DB şeması / hesap / medya göçü yok. Kanonik setler, reçeteler ve programlar değiştirilmez. Kullanım sayacı dışında analiz komutu ana kayda yazmaz. Yerel 10005 önizlemesi ve release/v2 paketi güncellenir; bu görev Render üretim yayını yapmaz.

Geri dönüşte eski backend yeni sport_experience alanını yazarken reddedebilir. Yeni kayıtları silmeyin; alanı tanıyan okuyucuyu koruyun veya eski yazıcıya dönmeden önce uyumluluk ekleyin. İndirilen AI yorumları sürümlü (`ai-progress-1`) bağımsız JSON çıktılarıdır.

## Kabul kanıtları

`docs/evidence/stage-9/ai-progress-{api,mongo,web,build}` ve `catalog-progress-browser` komut/başlangıç commit/kaynak hash/ortam/çıktı/exit code kayıtlarını içerir. Tarayıcı görselleri `docs/evidence/catalog-progress/` altında. İlk tarayıcı koşusunda Axe, browser.newPage yerine açık browser.newContext istediği için hata verdi; yalnız test başlatıcısı düzeltildi, uygulama beklentileri gevşetilmedi. Önceki koşu runs/ altında tutulur.
