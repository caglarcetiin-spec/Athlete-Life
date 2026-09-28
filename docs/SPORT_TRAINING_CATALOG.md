# Branşa özgü çalışma kataloğu — 28 Eylül 2026

## Değişiklik

Önceki planlayıcı 199 branşı bağlam olarak gönderiyor, fakat aday hareketleri çoğunlukla kuvvet/kalistenik kataloğundan seçiyordu. Artık branş tekniği, uygulama/raunt, taktik analiz ve patlayıcı güç ayrı yöntemlerdir. `sport_days` düzeni seçilen branş sırasını çalışma günlerine dağıtır. Her seçili branşa haftada en az bir gün ayrılır. Kuvvet ve dayanıklılık ayrıca destek çalışması olarak seçilebilir.

- 199 açık branş profili; 651 branşa bağlı temel teknik kaydı, 398 uygulama/taktik bloğu ve 3 patlayıcı güç hareketi eklendi. Ortak teknik başlıkları farklı branşlarda farklı kimlikle tutulur; bu sayılar benzersiz biyomekanik hareket veya tüm tekniklerin sayısı değildir.
- Eski 92 katalog hareketi korunur. Toplam 1.144 katalog kaydı hareket seçicisi, kütüphane, planlama, seans kaydı ve rapor çözümleyicisinde aynı kaynaktan okunur.
- AI yalnız seçili yöntem/branş, ekipman, bildirilen yetkinlik ve ortamla eşleşen adayları alır. Başka günün branşına ait hareket, yanlış birim, fazla süre/set ve karşılanmayan yöntem sunucuda reddedilir. Eksik ortam/teknik seçimleri sağlayıcı çağrısından önce bildirilir.
- Teknik çalışma tur × saniye + ayrı dinlenme olarak kaydolur. Patlayıcı güçte tekrar ve uzun dinlenme kullanılır. Teknik/taktik çalışmalara RIR, kilogram veya kas katsayısı uydurulmaz.
- Genel “ileri seviye” bir branşta ileri seviye sayılmaz. Branş deneyimi yoksa ihtiyatlı başlangıç sınırı uygulanır. Yeni başlayanlarda eğitmen eşliği, partner gerektiren çalışmalarda partner bilgisi aranır. Deneyimli kullanıcı bildiği solo teknikleri mevcut eğitmen eşliği olmadan seçebilir.
- Son düzenleme ekranı AI taslağıyla dolar; açık kullanıcı onayı olmadan ana program veya geçmiş kayıt değişmez.
- Rapor `branch_practice` alanında gerçek tur ve süreleri branş/yöntem bazında toplar. Süresi girilmeyen kayıt sıfır süre sayılmaz. AI gelişim analizine kanonik branş/yöntem ve fiziksel olup olmadığı bilgisi eklenir.

## Kapsam ve sınırlar

Bu **temel çalışma taksonomisidir; 199 branşın eksiksiz hareket müfredatı değildir**. Branş profillerindeki `coverage=foundation`, `exhaustive=false`, `terminology_status` ve kaynak listesi bunu açık tutar. Kaynak bağlantısı olmayan kayıtlar editoryal çalışma başlıklarıdır; federasyon onaylı veya bilimsel olarak doğrulanmış teknik reçete olarak sunulmaz. Bağlantılı kaynaklar da çalışma dozunu ya da uygulama güvenliğini doğrulamaz.

Kullanıcının kontrolünde çalışabildiğini belirtmediği branş tekniği otomatik eklenmez. Dalış, bazı yüksek riskli uzmanlık alanları ve bireysel uyarlama gerektiren para sporlarında otomatik fiziksel doz yoktur; taktik/teknik analiz seçilebilir, fiziksel plan eğitmenle manuel düzenlenir. Katalog dışında kullanıcı tarafından tanımlanan eski özel hareket yolu korunur.

Yeni tekniklerin kas katsayıları boş bırakılır: süre ve tur bilinir, kas hasarı/büyümesi UNKNOWN kalır. Mevcut kuvvet hareketlerinin katsayıları değiştirilmedi. Test başarısı biyolojik, klinik veya antrenörlük doğrulaması değildir. Genel branş ortamı beyanı, tek tek cihaz veya güvenlik sertifikasının doğrulanması anlamına gelmez.

## İncelenen birincil kaynaklar

Teknik sınıflandırma ve terminoloji kontrolü; tam metin kopyalanmadı. Dozlar bu kaynakların birebir reçetesi değildir.

- [England Boxing — koçluk el kitapları](https://www.englandboxing.org/news_articles/level-1-and-level-2-coaching-course-handbooks-now-available-online/)
- [JKA — kihon, kata, kumite](https://www.jka.or.jp/en/about-jka/techniques/)
- [Kukkiwon — tekme sınıfları](https://www.kukkiwon.or.kr/eng/board/read?boardManagementNo=56&boardNo=1368&menuLevel=3&menuNo=73&page=1)
- [British Judo — aşamalı teknik müfredat](https://www.britishjudo.org.uk/get-started/grading/kyu-grade-scheme/)
- [USA Wrestling — serbest güreş müfredatı](https://content.themat.com/usawrestling/free_level2.php)
- [JJAU — jiu-jitsu pozisyonları](https://events.uaejjf.org/en/files/qbnf/191)
- [FEI — geçiş çalışmaları](https://www.fei.org/stories/sport/dressage/dressage-tips-value-transitions)
- [FIFA — pas ve hareket teknik çalışmaları](https://www.fifatrainingcentre.com/en/practice/technical-activation/technical-activation-circuit-1.php)
- [NSCA — kas aktivasyonu ve güç talebi](https://www.nsca.com/education/articles/kinetic-select/muscle-activation-and-strength-training/)

## Veri / şema / geçiş / geri alma

Yeni tablo veya DB şema göçü yok. `GuidedChoices.sport_readiness` isteğe bağlı, boş varsayılanlıdır. Yeni yöntemler, `objective=power`, `split=sport_days` ve `ai-planner-7` eski değerlerle birlikte kabul edilir. Bilgiler mevcut `program.decisions.guided_choices` alanında tek kez saklanır. Teknik kimlikleri `sport-{sport_id}-{stable_key}` biçimindedir; görünen ad değişirse `key` yeniden üretilmemeli. Gerçek çalışma mevcut `slot` → `set` hattındadır.

Hesap, medya, sağlık kaydı veya gerçek MongoDB veri göçü yapılmadı. Ücretli kaynak açılmadı, gerçek AI istekleri testte kullanılmadı. Bu teslim yerel önizleme ve yayın paketidir; Render/GitHub üretim yayını değildir.

Geri almada sadece eski kaynağa dönmek yeni yöntem değerlerini eski editörde okunamaz yapabilir. Yeni planları kaybetmeden geri dönmek için yeni katalog kimlikleri, ilave şema değerleri ve okuma uyumluluğu korunmalıdır. Veritabanı silme veya eski yedekle kişisel kayıtların üstüne yazma gerekmez.

## Kabul kanıtı

`docs/evidence/stage-9/sport_training_*.json` komut, kaynak commit/hash manifesti, ortam, stdout/stderr log yolu ve exit code kaydeder. İlk başarısız kontroller ve nedenleri `docs/evidence/sport-training/TEST_NOTES.md` içindedir; eski loglar silinmedi. Sentetik PostgreSQL/MongoDB kayıtları ve 10011 portunda izole tarayıcı kullanılır. Gerçek 10005 önizlemesindeki hesaplarla test yapılmaz.

Tarayıcı: 390/1280 px, taşma kontrolü, ciddi/kritik Axe ihlali kontrolü, seçimlerin yeniden yüklemede korunması, gerçek doğrulama uç noktasından sentetik EVREN yanıtı, dolu son editör ve rapor süre özeti. Ekran görüntüleri `docs/evidence/sport-training/` altında.
