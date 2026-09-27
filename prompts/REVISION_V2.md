# Athlete Life birleşik revizyon ana promptu V2

Bu dosya önceki ana promptun yerini alan, bağımsız kullanılabilir birleşik V2 uygulama görevidir. Önceki promptu ayrıca yapıştırmak gerekmez. R01–R18 ve AT01–AT35 korunmuş; R19–R30 ve AT36–AT55 eklenmiştir. Rekabet kaynakları tasarım gerekçesidir, yeni klinik kural yetkisi değildir.

Bu dosyanın tamamı uygulama görevidir. GPT Astra kullanan, kod deposuna ve yerel geliştirme araçlarına erişebilen bir yazılım ajanına verilmek üzere hazırlanmıştır. Rol tanımı tıbbi uzmanlık veya gerçek mesleki yetki iddiası değildir.

## 1 Görev ve tamamlanma hedefi

Athlete Life uygulamasını aşağıdaki ürün ve kabul gereksinimlerine göre mevcut kod tabanı üzerinde kapsamlı biçimde revize et. Yalnız öneri, analiz, tasarım veya yapılacaklar listesi üretip bırakma. Kod erişimi varsa mevcut davranışı incele, gereken değişiklikleri uygula, çalıştır, ilgili doğrulamaları yap, hataları düzelt ve incelenebilir bir yayın adayı hazırla. Bu istek üretime otomatik dağıtım talebi değildir.

Kıdemli ürün odaklı full stack mühendis gibi çalış. Spor bilimi iddialarını kanıt ve belirsizlik düzeyine göre değerlendir; kendini klinik uzman yerine koyma. Ürün kararı, aritmetik hesap, koçluk varsayımı ve klinik yönlendirmeyi birbirinden ayır.

Hedef ürün: Yetişkin kullanıcının antrenmanını, seçtiği günlük kayıtlarını ve hedeflerini kolayca kaydettiği; planlanan ile gerçekleşeni ayıran; girdileri kaybetmeden saklayan; kayıtları doğru analize bağlayan; önerinin gerekçesini ve sınırını gösteren bir antrenman yönetimi uygulaması.

Birincil hedef kullanıcı başlangıç veya düzenli düzeyde kuvvet ve genel kondisyon çalışan yetişkindir. Ayrı antrenör portalı zorunlu değildir; antrenörle gözden geçirilebilir rapor yeterlidir. Klinik rehabilitasyon, çocuklara otomatik program, kişiye özgü kas hasarı, kesin toparlanma saati veya sakatlık olasılığı ürünün doğrulanmış yetenekleri gibi sunulamaz.

Başarı, aşağıdaki R01–R30 gereksinimlerinin kapsam içi davranışlarının uygulanması ve AT01–AT55 kabul senaryolarının sonuçlarının dürüstçe belgelenmesidir. Kod teslimi, uzman içerik onayı, üretime yayın ve saha etkinliği farklı tamamlanma durumlarıdır. Dış bağımlılığa takılan işin çevresindeki bağımsız işleri bitir; kapalı özellik için çalışıyor iddiasında bulunma.

## 2 Çalışma bağlamı ve erişim

Canlı ürün referansı: https://athlete-life.onrender.com/

Önceki denetim tarihi: 27 Eylül 2026. Denetimde arayüz Athlete Life 2.0 ve exposure-1 ifadelerini gösterdi. Değişmez bir commit kimliği doğrulanmadı. Raporu değişmez güncel gerçek olarak değil, yeniden üretilecek geçmiş kanıt olarak kullan.

Destekleyici dosyalar varsa konuma göre bul:
- Athlete_Life_Bilimsel_ve_Teknik_Inceleme.md: ilk denetim ve T01–T41 kayıtları.
- Athlete_Life_Nihai_Urun_Revizyon_Raporu.md: ürün gerekçesi ve W00–W10 paketleri.
- Athlete_Life_Muadil_Analizi_ve_Revizyon_V2.md: dokuz marka ve on ürün odağının karşılaştırması, V2 karar gerekçeleri.
- bagimsiz_hesaplar.json: önceki bağımsız aritmetik örnekleri.

Bu prompt ana gereksinimleri içerdiğinden ek raporların olmaması tek başına engel değildir. Ancak gerçek uygulama kaynak kodunun olmaması uygulama için engeldir. Açık projeyi, git durumunu, geçerli AGENTS.md talimatlarını ve mevcut çalıştırma bilgilerini kontrol et. Analiz belgelerini uygulama deposu sanma. Kaynak kod yoksa depo bağlantısı veya yerel yolunu tek ve net bir soruyla iste. Siteyi kopyalayarak yeni bir uygulama üretme ve kodu incelemiş gibi davranma.

Test hesaplarının şifrelerini, üretim anahtarlarını veya bağlantı dizelerini rapora, fixture dosyasına, loga ya da commit'e ekleme. Yerel sentetik hesaplar ve izole veri kullan. Önceki canlı hesap yalnız açıkça gerektiğinde ve mevcut izin kapsamında referans olabilir; tüm testleri üretim üzerinde çalıştırma.

## 3 Karar alanı ve çalışma disiplini

- Mevcut teknoloji yığınını, veri katmanını ve proje düzenini önce anla. Mimari değişiklik için gözlenen teknik ihtiyaç göster. Kanıtsız framework değişimi, mikroservisleştirme veya sıfırdan yeniden yazma yapma.
- Kullanıcının mevcut değişikliklerini koru. Uygun bir izole çalışma dalı veya çalışma alanı kullan; proje politikasına uy. Geçmişi yeniden yazma, ilgisiz dosyaları topluca biçimlendirme veya kullanıcı verisini sıfırlama.
- Rutin yerel uygulama, bağımlılıkların mevcut kilit dosyasına göre kurulması, sentetik test, hata düzeltme ve gerekli belge güncellemelerini ek onay beklemeden sürdür; araç izinleri ve ortam kısıtlarını aşma.
- Üretim dağıtımı, üretim veri geçişi, ücretli hizmet açma ve gerçek kullanıcıya ileti gönderme bu promptun otomatik yetkisi değildir. Önce uygulanabilir paketi ve doğrulamaları tamamla; yalnız bu somut dış işlemler için gerekli kararı iste.
- Belirsiz ama geri alınabilir tasarım kararında makul varsayım seç ve kaydet. Hesap doğruluğunu, veri kaybını veya klinik öneriyi etkileyen eksik bilgiyi tahminle kapatma.
- Kapsamlı görevi küçük, bağımlılıkları belli işlere böl. Her aşamada hangi R ve AT kimliklerinin kapanacağını göster. Tüm raporları her düzenlemeden önce yeniden okuma; ilgili kısmı gerektiğinde kullan.
- Değişikliğin riskine uygun birim, entegrasyon ve kullanıcı akışı testlerini seç. Aynı kontrolleri yeni gerekçe olmadan tekrar tekrar çalıştırma. İşlem başarılı mesajını gözlenen sonuç yerine koyma.
- Kısa Türkçe ilerleme notları ver: tamamlanan anlamlı sonuç, mevcut belirsizlik ve sıradaki doğrulama. Kullanıcıdan her küçük seçimde onay isteme.
- Uzun çalışmada docs/revision-status.md veya mevcut eşdeğerinde tamamlanan işler, test kanıtı, kararlar, açık engeller ve sonraki somut adımı güncel tut. Bağlam yenilenince buradan sürdür; tamamlanan araştırmayı yeniden başlatma.

## 4 Önceki denetimin yeniden üretilecek bulguları

F01: Üç Squat seti, her biri 10 tekrar, 60 kg harici yük, RIR 2 olarak kaydedildi. Kuvvet grafiği üç seti gösterdi; kas haritası üç kaydı eşleşmeyen veya miktarı eksik olarak gördü.

F02: Uygulama kütüphanesindeki Vücut ağırlığıyla squat ve başlangıç taslağındaki Vücut ağırlığıyla çömelme adlarıyla birer 10 tekrarlı, RIR 2 set kaydedildi. Haritada toplam beş serbest kayıt eşleşmedi. Planlı slot üzerinden başka tarihte girilen bir set de eşleşmedi. Bu gözlem yalnız serbest metin eş anlamı sorunu varsayımını yeterli kılmaz.

F03: Ölçümde Kilo seçiliyken Boy seçimine geçilince birim kg kaldı. 180 kg boy istemcide kabul edildi, sunucuda reddedildi, düzenleme kapandı ve kullanıcı Sistem Durumu kuyruğuna yöneldi. Kuyruktan kaldırdıktan sonra 180 cm kaydı başarılı oldu. Kök nedeni kod üzerinden doğrula.

F04: Düzenli deneyim ve barbell, dumbbell, squat rack, koşu bandı ekipman metni bulunan kuvvet hedefli profilde üç gün aynı vücut ağırlığı çömelme, yükseltilmiş şınav ve kalça köprüsü taslağı üretildi. Çekiş için ekipman gerekli açıklaması çıktı. Planlayıcı deneyimi profil yerine yeni başlayan varsayılanıyla açtı. Bu yoldaki veri aktarımını ve taslak seçimini incele.

F05: Sağ diz ağrısı 8/10 girilince günlük başlık ve tüm plan kartlarında daha hafif seçenek uyarısı değişti. Çömelmede set üçten ikiye indi; tekrar ve RIR aynı kaldı. Bu, uyarı mantığının çalıştığını gösterir; reçetenin klinik uygunluğunu göstermez.

F06: Besin porsiyonu, pişmiş tarif, su, uyku ve hedef yüzdesi kontrollü örneklerde doğru çıktı. Eksik makro sıfır sayılmadı; ancak bilinen protein toplamı da genel Bilgi yok durumunda kayboldu. Gün tamamlandı beyanı beslenme yeterliliği olarak yorumlanmamalıdır.

F07: Dokuz plan hedefinden bir gerçek set kaydedilip seans bitirildiğinde gerçek sayı bir kaldı. Seçili tarih değişince açık seans kendi tarihini korudu. İyi durumda saklanan karar, sonradan ağrı ve yeni kilo eklense de eski içeriği korudu. Bunlar korunacak davranışlardır.

F08: Back Squat testinde varsayılan birim seconds oldu. 100 kg sonuç kaydı ve en iyi değer çalıştı; taraf bilinmediğinde simetri uydurulmadı. legacy-catalog-1 ve comfortable-range gibi iç etiketler kullanıcı arayüzüne sızdı.

F09: 1800 saniye ve RPE 6 dayanıklılık kaydı alındı; beklenen 180 AU sonucu arayüzde görünür olarak doğrulanamadı. PDF istemci ortamında engellendi. Mobil boyut ayarı uygulanamadı; gerçek DOM 1280 kaldı. Yedek geri yükleme dosya üzerinden sınanmadı. Bunları kanıtlanmış ürün hatası sayma; doğrula.

F10: Tahlilde 5 sonucu 10–20 referansına göre alt sınırda gösterildi. <15 sonucu kesin 15’e çevrilmedi. Eksik veriye ve ölçüm belirsizliğine ilişkin bu davranışları koru.

## 5 Korunacak ürün ilkeleri

1. Bilinmeyen sıfır değildir. Girdi yok, geçersiz girdi, desteklenmeyen girdi ve doğrulanmış sıfır ayrı durumdur.
2. Planlanan set gerçekleşmiş set değildir. Kopyalama veya seansı bitirme kendi başına set üretmez.
3. Kaydın cihazda bulunması, sunucuda kalıcı olması ve rapora alınması ayrı durumlardır; kullanıcıya anlaşılır şekilde sunulur.
4. Geçmiş karar kendi veri, katalog ve kural sürümünü korur. Yeni verilerle yeniden hesaplama yeni sonuç üretir.
5. Hesaplanan yük temsili ölçülmüş fizyoloji değildir. Kural gerekçesi ve sınırı görünürdür.
6. Kullanıcı mevcut kayıtlarına ve manuel planına erişebilir. Modül sadeleştirmek veriyi silmek anlamına gelmez.
7. Her kullanıcıya aynı biçimde her gün bütün günlük alanlarını doldurma zorunluluğu getirilmez.

## 6 Gereksinimler

### R01 Hareket kimliği ve katalog

Serbest seans, plan şablonu, plan hedefi ve rapor aynı sabit hareket kimliğini taşısın. Görünen ad, dil, eş anlam, varyasyon, ekipman, ölçüm türü ve kas eşlemesini ayır. Mevcut hareket türlerini gereksizce tek şemaya sıkıştırma. Türkçe karakter, büyük küçük harf ve boşluk normalizasyonu kontrollü olsun; anlamlı farklı varyasyonları birleştirme.

Özel hareket kaydı mümkün kalsın. Eşleşmeyen veya birden çok adaya uyan ad için durum ve gerekçe göster; sessizce tahmin etme. Kullanıcı katalogdan seçim yapınca kimliği kayda geçir. Sonradan eşleme düzeltmesi geçmiş kayıtları değiştirecekse kapsamı ve sürümünü izlenebilir tut.

Önce isimden ID'ye, ID'den egzersiz ayrıntısına, ayrıntıdan kas dağılımına, olaydan analiz girdisine ve analizden rapora kadar hattı takip et. Denetimdeki arıza mevcut sürümde yeniden oluşmuyorsa kanıtı kaydet; gereksiz düzeltme yerine regresyon koruması ekle.

### R02 Gerçek set ve ölçüm sözleşmesi

Gerçek set kaydı seans, hareket kimliği, hedef slot bağlantısı varsa onun kimliği, gerçekleşme zamanı, uygun miktar, yük anlamı ve efor bilgisi taşısın. Sayısal alanlar açık birimle saklansın. Harici yük 0 geçerli, null bilinmiyor olsun. Vücut ağırlığı hareketinde harici yük yokluğu anatomik eşlemeyi kendiliğinden bozmasın; gerekli miktar yoksa hesap sınırlılığı ayrı işlensin.

Tekrarla ölçülen, süreyle ölçülen, mesafeli ve taraflı hareketlerin gereksinimleri farklı olabilsin. Set sayısı, tekrar sayısı ve tonaj farklı ölçütlerdir. Set başına RPE ile seans RPE aynı veri değildir; birinden diğerini açıklamasız üretme. RPE ve RIR birlikte çelişiyorsa çelişkiyi bildir; ikisini aynı formülde iki kez ağırlıklandırma. Kullanılan öncelik veya tek efor türü kararı açık olsun.

### R03 Kas analizi ve rapor tutarlılığı

Analiz edilen gerçek kayıtları ve dışarıda kalan kayıtları sayılabilir hale getir. Sonuç her dışlama için makinece ayırt edilebilir neden taşısın; kullanıcıya anlaşılır karşılık verilsin. Başarılı eşlemede hangi kas gruplarına neden atandığı katalog üzerinden denetlenebilsin. Aynı kaynak verisi, tarih aralığı ve sürüm için aynı sonucu üret.

Varsayılan görünüm gerçek çalışma dağılımı, kayıt kapsamı ve eksik veridir. Zamanla azalan endeks varsa bunu kayıt temsili olarak adlandır; gerçek yorgunluk veya onarım yüzdesi gibi sunma. Modelin katsayılarını kaynak doğrulaması olmadan anatomik gerçek diye yükseltme. 3B modelde farklı yüzeyler aynı grup endeksini kullanıyorsa bu görünür olsun. 3B yüklenmese de 2B veya tablo çalışsın.

### R04 Birim doğrulama ve düzenlenebilir hata

Boy için uygun uzunluk birimi, ağırlık için kütle birimi, performans testi için protokol birimi öner. Seçim değiştiğinde önceki uyumsuz birimi taşıma. Kullanıcı birim değiştirirse sayının dönüştürüldüğünü veya yeniden girilmesi gerektiğini açık göster; 180 değerini cm'den m'ye aynı sayı ile yorumlama.

İstemci ve sunucu doğrulama kuralları semantik olarak aynı olsun. Türkçe ondalık virgül, boş değer, sıfır, negatif, sayısal olmayan, sonsuz veya çok büyük değerleri alanın anlamına göre işle. Evrensel keyfî fizyolojik sınır yazma; teknik sınır ile kullanıcıya makullük uyarısını ayır. Alan hatası taslağı korusun. Sunucu 4xx reddi geçici ağ sorunu diye sonsuza kadar tekrar denenmesin.

### R05 Eşitleme ve idempotency

Taslak, bekleyen, eşitlenmiş, doğrulama reddi, sürüm çakışması ve geçici hata durumlarını mevcut mimariye uygun biçimde ayır. Reddedilen kayıtta düzenle ve yeniden gönder yolu bulunsun. Bir geçersiz işlem bağımsız kayıtları bloke etmesin. Bağımlı işlemler varsa sıraları korunsun.

Aynı mantıksal işlem yeniden gönderildiğinde tek kayıt oluşsun. Başarılı sunucu yazımı sonrası yanıt kaybolması senaryosunu sınayarak bunu kanıtla. Çakışma iki sürümün anlamlı karşılaştırmasını ve kullanıcı kararını desteklesin; sağlık veya plan değişikliklerini sessiz son yazan kazanır yöntemiyle kaybetme. Mevcut çevrimdışı destek neyse doğrula ve ürün beyanını ona göre sınırla.

### R06 Profil ve plan oluşturma

Hedef, deneyim, ekipman, kullanılabilir gün ve süre, tercih ve desteklenen kısıtlar planlayıcıya aynı profilden gelsin. Mevcut serbest ekipman metnini koru; yapılandırılmış seçime geçişte kullanıcı düzeltmesi ve belirsizlik mümkün olsun. Düzenli deneyimi yeni başlayan varsayımıyla ezme.

Plan taslağı seçilen kullanıcı profiline uygunluğunu, hangi bilgileri kullandığını ve neyi bilmediğini göstersin. Hareket örüntüsü dengesi hedefe göre incelensin. Programın desteklenmeyen kişiselleştirme düzeyi için dürüst sınır ve manuel düzenleme yolu sun. Kullanıcının verdiği plan adı gerekçesiz değiştirilmesin.

Şablonlar sürümlü olsun ve minimum gerekli ekipman, deneyim kapsamı, hedef, set/tekrar, efor ve dinlenme politikası taşısın. Yeni egzersiz reçetelerini bilimsel olarak onaylanmış gibi sunma. Klinik rehabilitasyon şablonu ekleme. Mevcut içerik yeterli değilse kod ve içerik eksiğini ayrı raporla.

### R07 Açıklanabilir ilerleme ve plan sürümü

Karşılaştırılabilir seans ölçütünü açık tanımla: aynı hareket/uygun varyasyon, protokol, taraf, yük anlamı ve yeterli kayıt. Eksik hedef setler veya eksik efor varken başarı uydurma. Kuralın kullandığı geçmiş seanslar, gözlenen sonuç, önerilen değişim, kural sürümü ve belirsizlik gösterilsin.

Mevcut iki uygun seans yaklaşımı varsa koruyup doğrula; bunun evrensel bilimsel eşik değil sürümlü koçluk politikası olduğunu yaz. Uygun olmayan seansın neden dışlandığı görülsün. Ekipmanın artış adımı bilinmiyorsa keyfî kilogram artışı üretme. Yeni yüzde ve RIR eşikleri için kanıt veya onaylı içerik yoksa bunları icat etme; sayısal otomatik kuralı kapalı tutup manuel plan ve gerekçeli durum ekranını tamamla.

Öneri kabul edildiğinde yeni plan sürümü oluşsun. Reddetme veya erteleme mevcut planı bozmasın. Eski gerçekleşen setler yeni hedeflerle yeniden yazılmasın. Yalnız başlangıç şablonu üretmek bu gereksinimin tamamlandığı anlamına gelmez.

### R08 Ağrı ve hastalık politikası

Sağlık kayıtlarını genel iyi oluş puanından ayrı değerlendir. Bölge, taraf, zaman ve kullanıcının bildirdiği bağlam korunsun. Sağlık uyarısını olumlu enerji veya uyku puanıyla iptal etme. Eksik sağlık kaydını sağlıklı onayı olarak yorumlama.

Onaylı bir klinik politika yokken ağrı/hastalık kaydından otomatik sayısal egzersiz değişikliği üretme. Özellikle denetimdeki 8/10 diz ağrısı örneğine üç yerine iki set önerisini güvenli çözüm gibi verme. Kayıt, açıklama, belirsizlik ve uygun değerlendirme gereksinimini sun; manuel günlük kullanımını engelleme. Her türlü egzersizi yasaklayan otomatik tıbbi karar da uydurma.

Klinik yönlendirme metinleri ve eşikleri uzman onayına bağımlı olsun. Kodda yapılandırılabilir ve sürümlü politika desteği kur; onaylanmamış politikaları etkinleştirme. Onay eksikliğini uygulamanın tamamını durduran bahane yapma: yerel davranış, kapalı durum, test, kullanıcı açıklaması ve içerik inceleme listesini tamamla. Uzman rolünü taklit ederek kendi çıktına klinik onay verme.

Hastalık başlangıcı, iyileşme beyanı ve kademeli dönüş ayrı kalsın. Menstrüel günlük isteğe bağlı olsun; sırf döngü fazından otomatik performans cezası türetme. Bu özelliklerin bulunması uygulamayı tıbbi cihaz veya rehabilitasyon hizmeti olarak tanımlamak için yeterli değildir.

### R09 Beslenme ve tarif

Enerji ile her makronun bilinen toplamını ve eksik kapsamını ayrı göster. Bir öğünde protein boşsa diğerindeki 15 g kaybolmasın: bilinen 15 g, bir öğünde bilgi eksik gibi ifade kullan. Eksik veriyi sıfıra çevirmeden hesap yap. Günü tamamladım ile beslenme yeterli ayrımını arayüzde koru.

Besin başına 100 g, porsiyon ve pişmiş tarif ölçeklemesini tek hesap sözleşmesinden yürüt. Son pişmiş ağırlık pozitif olmalı. Birim veya yoğunluk yoksa g ile ml dönüşümü uydurma. Besin ve tarif değerlerinin kayıt anındaki sürümü geçmiş öğüne bağlansın. Kütüphane düzenlemesi eski öğünü sessizce değiştirmesin. Geçmişi yeniden hesaplama seçeneği varsa ayrı, açık ve sürümlü olsun.

Son öğünü yeniden kullanma, favoriler ve hızlı porsiyon düzenleme sun. Kullanıcı kaynaklı ve doğrulanmış dış kaynaklı besin ayrımı olsun. Yeni ücretli besin API'si, barkod/OCR ve kişisel diyet motoru zorunlu kapsam değildir. Bunlar olmadan temel iş akışı tamamlanmalı.

### R10 Su uyku ve vardiya

Su kayıtları miktar ve birimle toplanmalı; tekrar gönderim çift sayılmamalı. Hedef varsa kullanıcı seçimi ile bilimsel yeterlilik yargısını ayır.

Uyku planı ve gerçekleşen uyku ayrılmalı. Henüz bitmeyen kayıt tamamlanmış uykuya dahil edilmemeli. Gece yarısını aşma, saat dilimi, tarih değişimi, yaz saati farkı, çakışan ve mükerrer aralıklar için deterministik politika belirle. Çakışmayı sessizce çift sayma; birleştirme veya düzeltme davranışını açıkla. Olay zamanı, yerel tarih ve rapor gruplaması tutarlı olsun.

Vardiya başlangıç/bitiş, ulaşım, hazırlık ve kullanıcı uyku penceresini kullanarak uygun antrenman zamanı adayları üret. Gece vardiyasında ertesi gün ilişkisini koru. Süre yetmiyorsa bunu açıkça söyle. Eksik saat verisinden takvim üretme; serbest sosyal notu otomatik saat sayma. Kullanıcı kabul etmeden plan zamanını değiştirme.

### R11 Performans testleri ve ölçümler

Test tanımı birim, ölçüm yönü, protokol sürümü, ekipman, taraf ve gerekli alanları belirlesin. Back Squat'ın birimi seçilen kuvvet protokolüne uygun olsun. Yarış süresinde küçük, uygun kuvvet testinde büyük sonucun iyi olabileceğini dikkate al. Farklı protokol veya tarafları aynı seri içinde kıyaslama. Ölçüm protokolü teknik katalog kodu yerine anlaşılır yönergeyle sunulsun.

Norm yüzdeliği ve simetri yalnız gerekli veri ve uygun kaynak varsa hesaplansın. Eksik taraftan simetri üretme. 100 kg kayıt girdisini hesaplanmış 1RM diye yeniden etiketleme. Yeni e1RM formülü eklemek zorunlu değildir; varsa denklemi ve kullanım sınırı ayrıca doğrulanmalı.

Tahlil kaydında sonuç operatörü, değer, birim, laboratuvar, tarih ve referans korunmalı. <15 ifadesini kesin 15'e dönüştürme. Farklı birim, laboratuvar veya protokolü otomatik birleştirme. Tanı veya takviye dozu üretme.

### R12 Hedefler ve günlük karar

Hedefin başlangıç, güncel ve amaç değerini; yönünü ve zamanını koru. Başlangıç=hedef, hedef aşılması, hedeften uzaklaşma ve eksik güncel değer senaryolarını açık politika ile işle. Negatif sıfır gösterme. Doğrusal hedef çizgisi biyolojik tahmin olarak adlandırılmasın.

Günlük karar kayıt kapsamını, kullanılan girdileri, nedeni ve yapılabilir sonraki adımı göstersin. Tek puanın arkasında belirsizlik gizleme. Her boş günlük alanını bütün analizi durduran zorunluluk yapma. Seçilen tarihin mevcut zamanla ilişkisini ve kararın hangi tarihe ait olduğunu açık göster.

### R13 Kullanıcı arayüzü ve mobil görevler

Ana akışı Bugün → Antrenman → Seans özeti → Gelişim olarak tamamla. Planım ve Günlük erişilebilir olsun; profil ve teknik yönetim ikincil düzeyde kalsın. Aynı sonucu daha iyi veren mevcut yapı varsa gerekçeyle koru. Sade ve profesyonel görünüm veri anlamını değiştirmesin.

Hızlı set kaydı, son seti kopyalama, önceki değer, otomatik olmayan tamamlanma, dinlenme sayacı ve düzeltme akışını kur. Kaydet düğmesi yinelenen gönderime dayanıklı olsun. Boş, yükleniyor, hata, çevrimdışı ve kısmi veri durumlarını tasarla. undefined, legacy-catalog-1, comfortable-range ve ham enum adları son kullanıcı metnine sızmasın.

390 × 844 ve masaüstü genişliklerinde gerçek render kontrolü yap; araç boyut değişimini uygulamadıysa test geçti deme. Klavye alanları örtmesin, yatay taşma olmasın, etiket ve odak sırası çalışsın. Grafiklerin metinsel özeti ve renk dışı durum işareti bulunsun. 3B atlası ana kaydı geciktirmeyecek biçimde yükle. Tam bir yeni tasarım sistemi kurmak yerine mevcut bileşenleri tutarlı kullan.

### R14 Karar geçmişi PDF ve yedek

Karar anlık görüntüsü kaynak kayıt sürümlerini, katalog/formül sürümünü ve karar zamanını korusun. Kullanıcı güncel yeniden hesaplama ile eski görüntüyü ayırt edebilsin. Grafik, ekran ve PDF aynı seçili aralık ve karar sürümünü kullansın. Türkçe karakter, uzun isim, çok sayfalı tablo ve eksik veri PDF'de sınansın; yalnız dosyanın oluşması yeterli değildir.

Yedek dışa aktarımı şema sürümü, kapsam ve gerekli ilişkileri taşısın. Kimlik bilgileri ve sırlar yedeğe gereksiz konmasın. İçe aktarma ön izlemesi, şema doğrulama, mükerrer kayıt davranışı ve kısmi hata politikası olsun. İki kez içe aktarma veri çoğaltmasın. Hesap sahipliği aktarımda sunucuca doğrulansın; bir dosyadaki user_id başka hesabın verisine yazma yetkisi vermesin. İzole ortamda dışa aktar → geri yükle → anlamlı veri karşılaştırması yap.

### R15 Eski veri geçişi

Mevcut kayıtları silmeden eklemeli geçiş tasarla. Hareket eşlemesi için kuru çalıştırma, kesin/kararsız/eşleşmeyen sınıflaması, kayıt sayısı, orijinal alanın korunması ve değişiklik günlüğü olsun. Sadece görünen ada dayanarak belirsiz veriyi topluca dönüştürme.

Geçiş tekrar çalıştırılabilir ve kaldığı yerden sürdürülebilir olsun. Yeni sürüm eski kayıtları okuyabilsin; eski istemci veya API uyumluluğu için gereken sınırı açıkla. Geri alma yalnız kodu geri almak değil yeni veri biçiminin okunabilirliğini de kapsasın. Üretim geçişini çalıştırma; komut, ön koşul, deneme sonucu ve geri dönüş planını hazırla.

### R16 Yetkilendirme ve mahremiyet

Yerel veya izole testte iki sentetik hesapla kayıt okuma, değiştirme, silme, rapor ve yedek uçlarının sahiplik kontrolünü sınayarak kanıtla. Önceki denetimde açık gösterilmedi; burada mevcut güvenlik yapısını incele ve kapsam içi somut eksikleri düzelt. Mevcut oturum, parola saklama ve kurtarma akışını kaynak üzerinden gözden geçir; rastgele kimlik doğrulama sistemi değiştirme.

Sağlık veya serbest not içeriğini log, telemetri veya test çıktısına yayma. Sırlar uygulama çıktısına yazılmasın. Paylaşım ve dışa aktarım kullanıcı niyetiyle yapılsın. Hesap silme ve veri saklama davranışı mevcut politika ile tutarlı olsun; geri döndürülemez üretim silmesi yapma. Yasal uyumluluk sertifikası iddia etme.

### R17 Bilimsel açıklama ve kalite gözlemi

Her sayısal model için amaç, girdiler/birimler, formül, sürüm, eksik veri davranışı, parametre kaynağı, kapsam ve doğrulanmamış iddiaları kısa model kartına yaz. Önceki rapordaki literatürü uygun yerde kontrol et; yalnız kaynak adı bulunduğu için bireysel doğruluk iddiası yapma. Yeni bilimsel veya klinik parametre eklemeden önce birincil kaynak incele; kaynağın gerçekten desteklediği iddia ile ürün varsayımını ayır.

Ürünün bütünlük kontrolünü hangi örnekleri sınadığıyla adlandır. İki sentetik kontrolün geçmesini tüm güvenlik ve hesaplar doğrulandı diye sunma. Gerekli gözlem olayları ham sağlık verisi olmadan işlem türü, hata sınıfı ve süreyle sınırlı olsun. Yeni üçüncü taraf analitik hizmeti zorunlu değildir.

### R18 Yayın adayı ve kapsam sınırı

Gerekli testler, derleme ve yerel uçtan uca akışlar tamamlanmış olmalı. Bilinen engeller ve kapalı özellikler kullanıcıya ve ürün sahibine açıkça belirtilmeli. Üretime çıkış dosyası değişiklikleri, göç adımlarını, yedek ve geri alma yolunu, doğrulanmış testleri, uzman onayı bekleyen içerikleri ve yayın sonrası izlenecek hataları içersin.

Giyilebilir cihaz, HealthKit, yeni üretici yapay zekâ sağlayıcısı, otomatik diyet, yeni antrenör portalı ve ücretli entegrasyonlar mevcut kodda yoksa bu revizyonun zorunlu işi değildir. Mevcut olanları kırma. Bunları eklemek için temel gereksinimleri geciktirme.

### R19 Aktif seans ve hızlı set kaydı

R02 ve R13 üzerine kur. Hareket başlığının yanında veya hemen altında son karşılaştırılabilir geçmiş seti göster. Karşılaştırılabilirlik aynı hareket kimliği, varyasyon, yük anlamı ve birim sözleşmesini gerektirir; yalnız benzer ada göre geçmiş sayı taşıma. Geçmiş performans, plan hedefi ve gerçekleşen giriş üç ayrı semantik durumdur. “Öncekini kullan” alanları doldurabilir; seti tamamlamaz.

Varsayılan görünüm hareket, önceki değer, gerçek yük/tekrar ve belirgin kaydet eylemini öne çıkarsın. RIR/RPE, not ve set türü gerektiğinde kolay açılan ayrıntıda bulunsun; giriş kaybolmasın. Sayısal klavye açıkken alanlar ve kaydet erişilebilir olsun. Art arda kayıt, alan düzeltme, yanlış kaydı geri alma ve dinlenme sayacı birlikte çalışsın. Kayıt başarısını yerel/bekleyen/eşitlenmiş durumuyla doğru anlat. Her set için uzun form veya tam sayfa dolaşımı gerekmesin. Seans sırasında kas atlasını ve uzun tavsiye kartlarını ana girişin önüne koyma.

### R20 Set türleri ve sıralama

Çalışma seti ile ısınmayı açık ayır. Eski türsüz kaydı kayıpsız koru ve geçiş politikasını belgele; bütün geçmişi sessizce ısınma veya kesin çalışma seti ilan etme. Çalışma seti toplamı ile tüm set sayısı ayrı tanımlansın. Isınma seti hiçbir kayıttan silinmesin; analiz kapsamı görünür olsun. Superset, ayrı hareket kayıtları arasında grup/sıra ilişkisi taşısın; yük ve tekrarları tek hareket toplamı gibi birleştirme.

Bu sürümde temel çalışma/ısınma ve superset yeterlidir. Drop set, myorep, cluster ve kısmi tekrar için sırf rakipte var diye yeni kullanıcı arayüzü açma. Mevcut üründe varsa veriyi koru ve semantiğini belgeleyerek destekle. Dinlenme sayacı geçen zamanı gerçek zaman damgalarından hesaplasın; sekme arka plana gidince sayacı yanlış başlatmasın, sayacın bitmesi kendi başına set üretmesin. Sunucu saati, cihaz saati ve manuel düzenleme etkisini mevcut altyapıya uygun çöz.

### R21 Ekipman profilleri

Ev, salon ve seyahat gibi kullanıcı adlandırmalı ekipman profilleri oluşturulabilsin. Ekipman kimlikleri ve mevcut ağırlık seçenekleri yapılandırılmış olsun. Serbest metin varsa kayıpsız korunarak onaylanabilir eşlemeye dönüştürülsün. Bir seans veya plan seçilen ekipman profili sürümünü taşısın; profilin bugün değişmesi geçmiş seansın ekipmanını değiştirmesin.

Profil değiştirme öneri havuzuna gerçek etki etsin. Mevcut olmayan rack gerektiren hareket sessizce sunulmasın. Ekipman belirsizse soru veya uygunluk sınırı göster. İlk kullanıcıyı uzun envanter formuna zorlamadan basit ekipman seçimiyle başlat; bar/plaka ayrıntısı sonradan eklenebilsin. Rastgele yeni program yerine mevcut planın uygun kısımlarını koruyan değişiklik önerisi üret.

### R22 Açıklanabilir hareket alternatifleri

Alternatifler katalogdaki hareket örüntüsü, hedef, ekipman ve kullanıcı tercihleri üzerinden oluşturulsun. Öneri “aynı hareketle tamamen eşdeğer” iddiası taşımasın. Adayın seçilme nedeni ve önemli farkı kısa metinle gösterilsin. Uygun aday yoksa sonuç boş kalabilsin; sahte hareket oluşturma. Farklı makine veya varyasyona önceki yükü otomatik eşdeğer kabul ederek aktarma.

Kullanıcı bir hareketi tercih etmiyorum şeklinde işaretleyebilsin; bu tercih sağlık kısıtı gibi yorumlanmasın. Ağrı nedeniyle değişiklik talebi R08 yoluna girsin; “dize güvenli alternatif” gibi uzman incelemesi gerektiren iddia üretme. Kullanıcı seçiminden sonra yeni plan sürümü veya seans içi değişiklik kaydı oluşsun; geçmiş setler yeni hareketin kimliğine çevrilmesin.

### R23 Zaman bütçesi ve plan önizlemesi

Kullanıcı bugünkü süre bütçesini değiştirdiğinde özgün planın yanında önerilen değişikliği önizlesin. Süre tahmini set sayısı, tahmini uygulama süresi, dinlenme ve geçiş varsayımlarını taşısın. Eksik süre girdisi varsa tahminin sınırlılığı görülsün. 30 dakikaya sığar ifadesini kesin vaat yapma.

Kısaltma politikası mevcut onaylı program kuralları ve öncelikler varsa bunları kullansın. Yoksa seçilebilir düzenleme taslağı sun, güvenli olduğu iddia edilen sayısal reçete uydurma. Hangi hareketin veya setin neden değiştiği açık olsun. Kabul yeni plan/seans sürümü üretir; iptal hiçbir kalıcı plan değişikliği üretmez. İşlem tamamlanmış gerçek setleri azaltamaz veya silemez. Gün taşımada kaçırılan yükü ertesi güne otomatik yığma. Vardiya ve uyku pencere kuralları R10 ile aynı zaman modelini kullansın.

### R24 Haftalık değerlendirme

Kullanıcıya seçili hafta için planlanan seanslar, gerçekleşen seanslar, gerçek setler ve analiz kapsamını göster. Kaydedilmedi ile yapılmadı ayrımı verinin izin verdiği ölçüde açık olsun; kayıtsız antrenman yapılmadı diye kesinleştirilmesin. Plan sürümü değişince gerçekleşen tarih geçmişinin yüzdesi anlamsız biçimde değişmesin; pay/payda ve kullanılan sürüm görülebilsin.

Karşılaştırmalar aynı hareket ve uygun protokol içinden yapılsın. Veri azsa grafik yerine eksik kapsam açıklaması sunulabilsin. Birkaç net eylem öner: eksik eşlemeyi düzelt, uygun günü değiştir, manuel planı koru gibi. Sağlık kararı veya otomatik yük artırımı R07/R08 onay koşullarını aşmasın. Beslenme, uyku ve antrenman arasında eşzamanlı değişimi nedensellik olarak anlatma. Haftalık rapor dönem, saat dilimi, kayıt kapsamı ve üretim sürümünü taşısın.

### R25 Kısa ve işe yarayan geri bildirim

Seans sonu isteğe bağlı kısa geri bildirimde seans eforu, programın uygulanabilirliği ve kullanıcının notu ayrı olsun. Set RIR/RPE ve seans RPE ayrımı korunsun. Kas hassasiyeti ve eklem ağrısı aynı soruya veya tek toparlanma puanına toplanmasın. Kullanılmayan soruyu sırf veri toplamak için ekleme. Eksik geri bildirim kaydı veya manuel planı bloke etmesin.

Bir yanıt öneriyi etkiliyorsa açıklamada bu bağlantı görülsün. Aynı yanıtın birden fazla kuralda iki kez ceza üretmesini engelle. Kullanıcının önceki geri bildirimini düzenlemesi geçmişte saklanmış karar metnini sessizce değiştirmesin. Yeni yorum gerekiyorsa yeni sürüm oluştur. Pump veya soreness ölçülmüş hipertrofi gibi sunulmasın.

### R26 Beslenme verisi kaynağı ve tekrar kullanılabilir öğün

R09'a veri kaynağı, kayıt türü ve alan bazında eksik kapsam ekle. Doğrulanmış kaynağı olmayan besin değeri doğrulandı rozeti taşımasın. Kullanıcı girişi, etiket girişi ve varsa lisanslı veri tabanı farklı gösterilsin. Bilinen toplam ile eksik alan sayısını birlikte sun. “Kaydedilen enerji” ile gerçek tüm günlük alımın aynı olduğunu varsayma.

Favori öğün veya tariften porsiyon ekleme mümkün olsun; kopyalama sırasında tarih, porsiyon ve sonuç önizlensin. Önceki kayıtlar tarifin güncel değişimine göre yeniden yazılmasın. İlk sürümde yeni ücretli besin veri sağlayıcısı, fotoğraftan kalori veya otomatik enerji hedefi motoru zorunlu değildir. Mevcut veri yeterli değilse dürüst kapsam sun; hayalî yerel yemek değerleri oluşturma. Yerel yemek içeriği üretilecekse veri kaynağı ve içerik inceleme işi ayrı kaydedilsin.

### R27 Güvenli içe aktarma ve taşınabilirlik

Önce R14 yedek sözleşmesini ve belgelenmiş Athlete Life CSV formatını tamamla. Kullanıcının yerel dosyası için önizleme, sütun eşleme, tarih/birim çözümleme, hareket kimliği eşleme ve satır bazında hata sun. İçe aktarım çalışması kimlik ve kaynak dosya özetini taşısın; aynı dosyayı yeniden işlemek mükerrer kayıt üretmesin. Kullanıcı bilinçli yeni kopya istiyorsa bunu ayrı ve açık eylem yap.

Belirsiz tarih, kg/lb, boş hücre/sıfır ve aynı adla farklı hareket durumları sessiz tahminle kapanmasın. Eşleşmeyenler saklanabilir veya kullanıcı düzeltmesine ayrılabilir; hangi kayıtların işleneceği görünür olsun. Dosya boyutu, satır sayısı ve biçim sınırlamaları belirle. CSV dışa aktarımında formül enjeksiyonunu önle. Hatalı dosya diğer kullanıcının verisine yazamamalı. Yarım kalan import için işlem/geri alma yaklaşımı mevcut veri katmanına uygun ve test edilmiş olsun.

Strong, Hevy veya başka marka için uyumluluk ancak kullanıcıca sağlanmış ya da resmen belgelenmiş gerçek format örneğiyle test edilirse ilan edilsin. Bu örnek yoksa genel eşleme aracı çalışsın; belirli marka bağlayıcısını tamamlandı sayma. Rakip hesabına erişim veya özel API kazıma bu görevin parçası değildir. Program şablonu ile gerçekleşmiş geçmiş kaydı aynı import türü yapma.

### R28 Antrenörle gözden geçirilebilir rapor

R14 raporuna tarih aralığı ve içerik seçimi ekle. Antrenman, beslenme ve hassas sağlık notları bağımsız seçilebilsin. Sağlık notları kendiliğinden her rapora eklenmesin. Önizleme ve indirilen PDF aynı seçimi uygulasın. Raporun veri kapsamı ve tahmin/ölçüm ayrımı görünür olsun; kişiye gönderilmeden önce kullanıcı dosyayı kendisi değerlendirebilsin.

İlk sürümde mesajlaşma, ödeme, danışan paneli, davet sistemi veya herkese açık paylaşım bağlantısı oluşturma. Bu sınırlama mevcut güvenli özellikleri silme talimatı değildir; varsa davranışı incele ve kullanıcı verisini koru. Ayrı antrenör ürününü sonraki fizibilite olarak belgele. Rapor kendi sahibi dışındaki kullanıcı tarafından API üzerinden erişilemesin.

### R29 Bilgi mimarisi ve özgün görsel sistem

Bugün, Antrenman, Plan, İlerleme, Profil şeklinde beş ana odak kur; mevcut yapıya eşdeğer, daha açık bir çözüm varsa kısa gerekçeyle uyarlayabilirsin. Beslenme/su/uyku isteğe bağlı günlük girişleri olsun. Ana eylem devam eden seansa dön veya seans başlat olsun. Kullanıcıdan her gün bütün modülleri tamamlamasını isteme. Eski sayfalar ve veriler erişilebilir kalsın.

Başlangıç token önerisi: metin #172B4D, açık zemin #F6F8FB, kart #FFFFFF, birincil eylem #006B63, uyarı #8A4B00, hata #B42318. Mevcut markayla uyumlu daha iyi alternatif varsa kullan ve kararını kaydet. Metin gövdesi için 16 px, en az 44 × 44 px dokunma alanı ve 4/8 px aralık başlangıç hedefleridir. Kontrastı gerçek renk çiftleriyle ölç; normal metinde en az 4.5:1 ürün hedefini doğrula. Yalnız renk ile anlam verme. Bu hedeflerin karşılanması tek başına bütün erişilebilirlik standardına uyum iddiası doğurmaz.

360, 390, 768 ve 1280 px genişliklerde kritik ekranları kontrol et. Yükleniyor, boş, kısmi veri, ağ hatası, doğrulama reddi ve çakışma tasarımlarını tamamla. Hareketli/3B içerik isteğe bağlı ve temel akıştan bağımsız olsun. Rakip ekranını piksel düzeyinde, markasını veya lisanslı içeriğini kopyalama. Ürün içinde kullanıcıya geliştirici sürüm etiketleri göstermeden anlaşılır açıklama sun.

### R30 Marka yapılandırması ve kapsam koruması

İlk yayın adayında adı Athlete Life olarak koru; önerilen alt ifade “Antrenmanını hayatına uydur”. SetRitim ve Antrenova araştırılabilecek adaylardır; müsait veya tescil edilebilir oldukları doğrulanmamıştır. TrainWeave başka projede kullanım görüldüğü için önerilen aday değildir. Kullanıcı yeni isim seçmedikçe kalıcı yeniden adlandırma yapma.

Ad, alt ifade, logo ve tema tek yapılandırmadan yönetilebilsin. Marka önizlemesi oturumları, kayıt kimliklerini, API yollarını, yedek sözleşmesini veya paket kimliğini bozmasın. Başlık, giriş ekranı ve rapor üstbilgisi tutarlı olsun. Otomatik marka tescili, domain satın alma veya mağaza yayını yapma. Görsel tasarım ve ad kararı veri modeli geçişine bağlanmasın.

## 6A Rekabet kanıtı ve seçilen sınır

27 Eylül 2026 resmî kaynak araştırması: Hevy ilerleme görünümü; Strong kayıt odaklı tasarım; Fitbod profil/ekipman temelli öneri; RP mesocycle geri bildirimi; MacroFactor Nutrition enerji dengesi modeli; MacroFactor Workouts ayrı program ve kayıt ürünü; Cronometer veri kaynakları; TrainingPeaks plan/gerçekleşen takvimi; WHOOP sensör temelli skorlar; Trainerize koç yönetimi. Bunlar bağımsız etkinlik kanıtı değildir. Kamuya açık dokümanlar gizli algoritma katsayılarının bilinmesini sağlamaz. Mevcut ürün davranışı hakkında yeni iddia gerekiyorsa ilgili resmî kaynağı yeniden kontrol et; bütün rakip araştırmasını her aşamada tekrarlama.

Kaynaklar:
- https://www.hevyapp.com/features/gym-progress/
- https://www.strong.app/
- https://fitbod.me/blog/fitbod-algorithm/
- https://rpstrength.com/pages/hypertrophy-app
- https://help.macrofactorapp.com/dashboard/expenditure
- https://macrofactor.com/workouts/
- https://support.cronometer.com/hc/en-us/articles/360018239472-Data-Sources
- https://www.trainingpeaks.com/blog/best-trainingpeaks-premium-features/
- https://developer.whoop.com/docs/whoop-101/
- https://www.trainerize.com/features/

Ürün tezi: Hızlı gerçek kayıt + koşullara göre kullanıcı onaylı plan uyarlama + veri kapsamı açık analiz. Bunların rakiplerde hiç bulunmadığını iddia etme. Türkçe kullanılabilirlik, veri taşınabilirliği ve karar açıklığı test edilecek farklılaşma hipotezleridir.

Bu yayın adayının zorunlu kapsamı R01–R30'un burada tarif edilmiş davranışlarıdır. Yeni otomatik kalori reçetesi, toparlanma yüzdesi, sakatlık tahmini, cihaz bağlayıcıları, tam koç portalı, sosyal ağ, kamera ile form değerlendirme ve sağlık sohbet robotu araştırma kapsamındadır; bu görevde bunları geliştirmeye başlayıp çekirdek işi geciktirme. Mevcut kullanıcı verilerini ve güvenli manuel işlevleri bu sınırlama gerekçesiyle silme. Arka planda çalışan ücretli servis veya sahte demo entegrasyonu oluşturma.

Teknik ayrımlar: Ekipman profili sürümü, set türü, superset ilişkisi, plan değişiklik önizlemesi, içe aktarma işi ve rapor içerik seçimi mevcut veri modeline uyumlu kavramlar olarak ele alınsın. Yeni kavram için zorunlu olarak ayrı servis veya tablo kurma. İş kurallarını arayüz metni içine gömme. Aynı kararın gerekçesi ve girdi özeti erişilebilir olsun.

Her önemli öneri için docs/revision-decisions.md içinde problem, kaynak/kanıt türü, seçilen çözüm, yapılmayan alternatif ve kabul testi bağlantısını kısa tut. Kullanılabilirlik hipotezini kanıtlanmış kullanıcı ihtiyacı gibi yazma. Rakiplerden alınan tasarım desenini özgün bileşenle uygula; kaynak görselleri ürün varlığı olarak paketleme.


## 7 Kavramsal veri sözleşmesi

Aşağıdaki varlık adları hedef semantiği anlatır; mevcut modelin adını zorla değiştirme veya her biri için ayrı servis kurma:

- ExerciseDefinition: sabit kimlik, ad/alias, varyasyon, ölçüm türü, ekipman, kas eşlemesi, katalog sürümü.
- PlanVersion ve PlannedSlot: profil girdilerinin sürümü, hedefler, egzersiz kimliği, süre/tekrar/yük anlamı ve politika sürümü.
- Session ve PerformedSet: gerçekleşen kayıt, olay zamanı, seans tarihi, slot bağlantısı ve kullanılan ölçüm.
- Measurement ve DailyEntry: kaynak, değer/operatör, birim, zaman ve uygun bağlam.
- NutritionSnapshot: kayıt anındaki besin/tarif değerleri ve kapsam.
- AnalysisResult: dahil edilen/dışlanan kayıtlar, kapsam, formül ve kaynak sürümleri.
- DecisionSnapshot: saklanan çıktı, girdi sürümleri, gerekçe ve üretim zamanı.
- SyncOperation: idempotency kimliği, kayıt bağımlılığı, durum, hata ve sürüm bilgisi.

Hesapları arayüzden bağımsız test edilebilir yap. Aynı mantığın istemci ve sunucuda farklılaşmasını azalt. Kalıcılık ve kullanıcı yetkisi sunucuda doğrulansın. Mevcut veri tabanı türünü bilmeden SQL veya MongoDB seçimi dayatma.

## 8 Bağımsız sayısal referanslar

Bu değerler sentetik regresyon verisidir; gerçek kişiye beslenme veya antrenman reçetesi değildir.

Besin A'nın 100 g değeri: 200 kcal, 10 g protein, 30 g karbonhidrat, 4,5 g yağ, 2 g lif. 150 g porsiyonda beklenen 300 kcal, 15 g protein, 45 g karbonhidrat, 6,75 g yağ ve 3 g liftir. Enerjiyi makrolardan tekrar hesaplayıp etiketi zorla eşitleme; test oranlamayı sınar.

İkinci öğün: 100 kcal, makrolar bilinmiyor. İlk öğünle birlikte bilinen enerji 400 kcal, bilinen protein 15 g ve bir öğünde protein eksiktir. Makro toplamını tam gün alımı gibi sunma.

Tarif: 200 g Besin A, toplam 400 kcal ve 20 g protein; pişmiş son ağırlık 100 g. 50 g tarif payı 200 kcal ve 10 g proteindir. Yukarıdaki iki öğünle birlikte günlük bilinen enerji 600 kcal, bilinen protein 25 g ve bir öğünde protein eksiktir.

Su: 250 ml + 750 ml = 1000 ml. Uyku: sabit saat diliminde 25 Eylül 23.00 → 26 Eylül 07.00 = 8 saat. Ayrı gelecekte biten uyku testi sabitlenmiş test saatiyle çalıştırılmalı.

Hedef: başlangıç 80, hedef 76, güncel 78; (78−80)/(76−80) × 100 = yüzde 50. Bu yalnız hedef çizgisi aritmetiğidir.

Kuvvet: üç ayrı 10 tekrar, 60 kg harici yük, RIR 2 seti; gerçek set sayısı 3, toplam tekrar 30. Harici yük hacmi gösteriliyorsa anlamı açık olmak kaydıyla 1800 kg·tekrar; bu toplam vücut yükü veya fizyolojik etki değildir.

Seans yükü: 1800 saniye = 30 dakika; seans RPE 6 ile 30 × 6 = 180 AU. Uygulama bu ölçütü destekliyorsa kullanıcıya görünür karşılığı doğrula; kapsam dışıysa kaydın saklanması ile hesap çıktısını ayrı durumla raporla.

Tahlil: kesin 5, referans 10–20 → alt sınırın altında. <15, referans 10–20 → kesin değer bilinmiyor; 15'e eşitleme.

Yalnız mevcut endeks korunursa uygulanacak matematik örneği: kas katsayısı 1, zaman azalması yok, 10 tekrar ve RIR 2 için efor 0,76; üç set doz 2,28; 100 × (1−exp(−2,28/8)) yaklaşık 24,8. Bu örnek önceki denetimde canlı uygulama sonucu olarak doğrulanmadı ve yeni modele zorunlu reçete değildir. 36 saat yarılanmada 24 saat sonra yaklaşık yüzde 63, 48 saat sonra yüzde 39,7 yük temsili kalır; bu iyileşme yüzdesi değildir. Mevcut kod farklı formül kullanıyorsa sürüm farkını açıklayıp uygun test referansı seç.

## 9 Kabul senaryoları

AT01 Kayıt ve yeniden giriş: Sentetik kullanıcı oluştur, profil ve en az bir seans kaydet, çıkıp gir. Aynı kullanıcıya ait değerler ve kayıt kimlikleri korunsun. İstemci önbelleği ile sunucu kalıcılığını ayıran kontrol yap.

AT02 Serbest katalog hareketi: Katalogdan Squat varyasyonu seç, üç 10 tekrar 60 kg RIR 2 setini kaydet. Sayı üç, hareket kimliği mevcut, kas eşlemesi katalogla tutarlı olsun. Eşleşme için sahte kas değeri atama.

AT03 Türkçe ad ve varyasyon: Vücut ağırlığıyla squat/çömelme uygun katalog kimliğine bağlansın; farklı varyasyon yanlış birleştirilmesin. Harici yük 0 ile bilinmiyor ayrı kalsın. Miktar biliniyorsa desteklenen set analizi kaybolmasın.

AT04 Plan üzerinden kayıt: Oluşturulmuş plan slotundan gerçek set kaydet. Serbest kayıttaki aynı hareket ve miktarla aynı analiz semantiği oluşsun. Yalnız ad düzeltmesi bu kontrol olmadan yeterli değildir.

AT05 Bilinmeyen hareket: Özel hareket kaydı saklansın, eşleşmiyor durumu ve gerekçesi görünsün; toplam seans geçmişinden kaybolmasın, rastgele kas endeksi oluşmasın.

AT06 Eksik plan: Dokuz slotlu seansta bir set kaydedip bitir. Gerçek set bir kalsın; sekiz hedefin yapılmadığı anlaşılır olsun. Set kopyalamak kayıt sayısını artırmasın.

AT07 Tarih kararlılığı: Açık seans varken seçili günü değiştir. Seansın tarihi izinsiz değişmesin; görüntülenen gün ile seans günü anlaşılır biçimde ayrılsın.

AT08 Boy birimi: Ağırlıktan boya geç; uygun birim açılsın. 180 kg boy gönderimi kullanıcıya alan hatası versin. API'ye doğrudan aynı hatalı veri gönderilince sunucu da reddetsin; taslak düzeltilebilsin.

AT09 Ondalık ve sınırlar: 4,5 ile 4.5 uygun yerel girişlerde eşdeğer hesaplansın. Boş, sıfır, negatif, belirsiz binlik ayracı ve NaN benzeri girdiler alan politikasına uygun sonuç versin. Sıfır harici yük ile sıfır tarif ağırlığı aynı muamele görmesin.

AT10 Sunucu reddi: İstemciden sonra sunucu doğrulama reddi simüle et. Kullanıcı aynı taslağı düzeltebilsin; hata bağımsız su veya başka kayıt gönderimini kilitlemesin.

AT11 Tekrar gönderim: Sunucu yazımından sonra yanıtı kaybet, aynı idempotency anahtarıyla gönder. Tek kayıt oluşsun. Yeniden yükleme ve bağlantı dönüşü mükerrer kayıt üretmesin.

AT12 Sürüm çakışması: İki istemci aynı kaydı değiştirsin. İkinci işlem eski sürüm üzerine sessizce yazmasın; uygulanabilir çözüm ve veri korunması doğrulansın.

AT13 Profil aktarımı: Aynı hedef için yeni başlayan/ekipmansız ile düzenli/barbell+dumbbell+rack profillerini karşılaştır. Girdilerin taslak seçimi veya açık uygunluk sınırına etkisi görülsün; iki profili hiçbir gerekçe olmadan aynı kişiselleştirilmiş plan diye sunma.

AT14 İlerleme yeterliliği: Eksik set/RIR ve karşılaştırılamayan varyasyonlarda otomatik artış olmasın. Onaylı mevcut kuralın yeterli iki seans koşulu varsa gerçek girişlerle artış dalını da çalıştır; yalnız koruma dalını test edip ilerleme bitti deme. Kural yoksa kapalı durumu ve içerik bağımlılığını kanıtla.

AT15 Öneri kabulü: Öneriyi kabul et, yeni plan sürümü oluşsun; reddet/ertele durumda plan değişmesin. Önceki plan ve gerçekleşen kayıt korunmuş olsun.

AT16 Ağrı karşılaştırması: İyi durumdan sonra sağ diz 8/10 ağrı ekle. Uyarı gerekçesi görünür olsun; onaylı politika yokken otomatik iki set veya yüzde azaltma reçetesi gösterilmesin. Günlük kaydı ve manuel plan erişimi kalsın.

AT17 Sağlık belirsizliği: Sağlık kaydı yokluğu güvenli antrenman onayı üretmesin. Hastalık kaydında tek iyileşme tarihi tüm dönüş kararını onaylamasın. Döngü fazı tek başına otomatik ceza üretmesin.

AT18 Besin hesabı: Bölüm 8'deki 150 g örneğini enerji, protein, karbonhidrat, yağ ve lif için bağımsız beklenen değerle karşılaştır. Arayüz ve sunucu sonucu tutarlı olsun.

AT19 Eksik makro: 300 kcal ve 15 g protein öğününe 100 kcal/makrosu boş öğün ekle. Bilinen enerji 400, bilinen protein 15, eksik kapsam bir öğün olsun. Gün tamamlandı işareti beslenme yeterli onayı olmasın.

AT20 Tarif sürümü: 200 g malzeme/100 g pişmiş tariften 50 g kaydet; 200 kcal/10 g protein gelsin. Malzemenin kütüphane değerini sonradan değiştir; eski öğün kayıt anındaki sonucu korusun. Sıfır pişmiş ağırlığı reddet.

AT21 Su: 250 ve 750 ml toplamı 1000 olsun. Birim dönüşümü ve aynı kaydın yeniden gönderimi toplamı bozmasın.

AT22 Uyku: Geceyi aşan sekiz saat, henüz bitmemiş uyku, çakışan aralık ve saat dilimi geçişi ayrı senaryolarla doğrulansın. Test saati sabitlensin; testlerin gece veya gündüz çalışmasına göre sonuç değişmesin.

AT23 Vardiya: 22.00–06.00 gece vardiyası, 30 dakika ulaşım ve 30 dakika hazırlık gir. Uyku penceresi yokken uygun saat uydurulmasın. Pencere eklendiğinde çakışmasız yeterli süreli aday veya gerekçeli yer yok sonucu üret; otomatik takvim değişikliği yapma.

AT24 Seans RPE: 1800 saniye ve seans RPE 6 örneğinde desteklenen hesap 180 AU olsun. Set eforundan yanlışlıkla ikinci kez hesaplama yapılmasın. Desteklenmiyorsa bu işlevin durumunu ayrı raporla.

AT25 Performans protokolü: Kuvvet testinde doğru birim, süre testinde doğru en iyi yönü, farklı protokolün ayrı seri olması, eksik tarafta simetri olmaması doğrulansın.

AT26 Tahlil: 5 ile 10–20 karşılaştırması doğru; <15 tam sayı gibi davranmasın. Birim ve laboratuvar değişimi klinik karşılaştırmayı sessizce üretmesin.

AT27 Hedef: 80→76 hedefinde 78 yüzde 50; başlangıç=hedef, hedef aşımı, uzaklaşma ve eksik ölçümde tanımlı durum olsun. Negatif sıfır ve bölme hatası görünmesin.

AT28 Saklanan karar: İyi durum/80 kg ile karar kaydet; ağrı ve 78 kg ekle. Eski karar eski girdi ve sonucu korusun. Güncel yeniden hesaplama ayrı sonuç olsun.

AT29 PDF: Seçili tarih ve sürümle rapor indir. Dosyayı aç ve sayfaları kontrol et; Türkçe karakter, uzun satır, tablo bölünmesi ve sayısal değerler düzgün olsun. Ortam engelini ürün arızası gibi yazma.

AT30 Yedek dönüşü: İlişkili sentetik veriyi dışa aktar, izole hesaba izinli biçimde geri yükle, tekrar içe aktar. Mükerrer kayıt, bozuk ilişki ve başka kullanıcıya yazma olmasın. Bekleyen yerel işlemlerin yedek kapsamı açık olsun.

AT31 Veri geçişi: Eski ad/kimlik biçimli fixture üzerinde kuru çalıştırma ve gerçek test geçişi yap. Kararsız kayıt değişmeden kalsın, orijinal değer korunsun, ikinci çalıştırma ek değişiklik üretmesin. Geri dönüş yaklaşımı denensin.

AT32 Mobil görev: Gerçek 390 × 844 görünümde planı aç → üç set gir → birini düzelt → seansı bitir → raporu oku. Klavye ve taşma kontrolü yap; viewport uygulanmadıysa doğrulanmadı kaydet. Masaüstünde aynı akış bozulmasın.

AT33 Erişilebilirlik ve dayanıklılık: Klavye, görünür odak, etiketler, hata metni ve grafik özeti çalışsın. 3B yüklenmesini boz veya kapat; temel kayıt ve analiz devam etsin.

AT34 Kullanıcı izolasyonu: İki sentetik kullanıcıyla diğerinin kayıt, karar, PDF ve yedeğine erişim ve değişiklik girişimleri sunucuda reddedilsin. Denemeler izole ortamda çalışsın; gerçek hesapları tarama.

AT35 Bütün akış: Yeni kullanıcı → profil → plan → bir gerçek antrenman → günlük kayıt → açıklanabilir rapor → çıkış/giriş akışını son sürümde çalıştır. Kanıt dosyalarında gerçek sır veya kişisel sağlık verisi olmasın.

Otomatik test beklenen değeri aynı üretim fonksiyonunu çağırarak üretmesin. Referans değer, bağımsız formül veya açık ürün sözleşmesi kullan. Katalog taraması, birim testi ve uçtan uca test farklı kusurları yakalar; tek düzeyin geçmesi diğerinin kanıtı değildir.

AT36 Önceki set: Aynı hareketin önceki 60 kg × 10 setini yeni seansta göster. Alanları geçmişten doldur; kaydetmeden gerçekleşen set sayısı artmasın. Farklı varyasyonun geçmişi yanlış eşleşmesin.

AT37 Set türleri: İki ısınma ve üç çalışma seti kaydet. Toplam beş; çalışma seti üç olsun. Türsüz legacy kayıtta kapsam politikası görünür olsun; geçmiş veri kaybolmasın.

AT38 Superset: İki farklı hareketi gruplandır, ayrı setleri kaydet, sıralarını değiştir. Hareket kimlikleri ve ayrı miktarlar korunsun; analiz iki hareketi tek harekete dönüştürmesin.

AT39 Dinlenme sayacı: Sayacı başlat, sayfayı arka plana al ve geri dön. Gerçek zamana uygun kalan/geçen süre oluşsun; bitiş kendi kendine set eklemesin. Testte saat denetlenebilsin.

AT40 Ekipman: Salon profilinde barbell/rack, ev profilinde yalnız dumbbell bulunsun. Seçim öneri uygunluğunu etkilesin. Profil düzenleme geçmiş seans ekipman sürümünü değiştirmesin.

AT41 Alternatif: Uygun ekipman alternatifinin gerekçesini göster. Aynı hedefe yönelik farklı varyasyona eski kg değeri otomatik eşdeğer sayılmasın. Aday yokken sahte öneri oluşmasın.

AT42 Ağrı ve tercih ayrımı: Tercih etmiyorum girdisi hareket tercihini değiştirsin; diz ağrısı girdisi R08 sınırına girsin. Tercih filtresi ağrı tedavisi gibi davranmasın.

AT43 Süre önizlemesi: 60 dakikalık taslağı 30 dakika bütçeyle önizle. Varsayımlar ve değişiklikler görünsün. İptalde plan ve gerçek setler değişmesin; kabulde yeni sürüm oluşsun. Onaylı otomatik kural yoksa manuel düzenleme taslağı açıkça ayrı olsun.

AT44 Gün taşıma: Gelecek planı farklı güne taşıma önizlemesi mevcut uygunlukla çakışmayı göstersin. Geçmiş gerçek seansın zamanı değişmesin; kaçırılan gün otomatik ek yük üretmesin.

AT45 Haftalık kapsam: Beş gerçek kayıttan üçünü kas analizine uygun yap. Rapor beşi toplamda, üçü kapsamda ve iki dışlamayı gerekçeleriyle göstersin. Kayıtsız günü kesin başarısız antrenman saymasın.

AT46 Geri bildirim: Seans geri bildirimini atla; kayıt bitirilebilsin. Sonradan girilen ve düzenlenen yanıtın güncel yorumu ile önceki saklanmış karar ayrışsın. Aynı veri iki kez yük azaltma etkisi yaratmasın.

AT47 Besin kaynağı: Aynı besin için kullanıcı etiketi ve doğrulanmış kaynaklı örnek varsa bunları ayır. Kaynağı olmayan kayıt doğrulandı etiketi almasın. Eksik protein sıfır olmasın; bilinen toplam görünür kalsın.

AT48 Favori öğün: Kaynak tariften iki farklı porsiyon ekle. Tarih ve miktar önizlensin; tarif güncellendiğinde eski kayıt hesapları korunsun. Yeniden deneme mükerrer öğün üretmesin.

AT49 CSV doğruluğu: Türkçe ondalık, kg/lb, boş/sıfır, belirsiz tarih ve eşleşmeyen hareket içeren dosyayı önizle. Belirsizlikler kullanıcıya düzeltilebilir gösterilsin. Program hedefleri gerçek sete dönüşmesin.

AT50 CSV güvenliği: Aynı dosyayı iki kez içe aktar; kayıtlar çoğalmasın. Bozuk/çok büyük dosya ve formül başlatan hücreleri işle; başka kullanıcının verisine yazma olmasın. Yarım iş ve geri alma politikası doğrulansın.

AT51 Marka bağlayıcısı iddiası: Gerçek format fixture'ı olmayan markanın import desteği arayüzde varmış gibi görünmesin. Genel CSV eşlemesi kendi belgelenmiş formatıyla çalışsın; bu ayrım yardım metninde açık olsun.

AT52 Rapor kapsamı: Yalnız antrenmanı seçip PDF oluştur. Sağlık ve beslenme notları dışarıda kalsın; önizleme ile PDF aynı içeriği göstersin. Farklı kullanıcı rapor kimliğiyle erişim sunucuda reddedilsin.

AT53 Modül tercihi: Beslenme ve uyku modüllerini gizle; kayıtları silinmesin. Bugün ekranı eksik modüller nedeniyle başarısızlık veya sağlık onayı göstermesin. Geri açınca geçmişe erişilebilsin.

AT54 Duyarlı tasarım: 360/390/768/1280 px gerçek genişliklerde Bugün, aktif seans, Plan ve İlerleme'yi kontrol et. Klavye, metin büyütme, odak ve kontrast hedefini doğrula. Taşma, görünmeyen kaydet ve yalnız renkle hata durumu olmasın.

AT55 Marka: Yapılandırmada görünen adı test ortamında değiştir. Giriş, başlık ve rapor tutarlı olsun; kayıt kimlikleri, oturum, API ve yedek davranışı değişmesin. Üretim adı kullanıcı kararı olmadan kalıcı değiştirilmesin.


## 10 Uygulama aşamaları

S0 Keşif ve yeniden üretim: Depoyu doğrula, uygulamayı izole ortamda başlat, mevcut testleri ve mimariyi ihtiyaca göre incele. F01–F10'un mevcut karşılığını bul. Gereksinim → kod alanı → test → durum matrisi hazırla. Sadece kapsamlı bir depo özeti yazarak burada durma.

S1 Güvenilir kayıt: R01–R05 ve R08'in güvenli teknik davranışını uygula; R15 geçiş temelini kur. Önce gerçek kayıtların analize ulaşmasını, alan hatasından kurtarmayı ve geçmişin korunmasını doğrula.

S2 Kullanışlı planlama: R06–R13 ile R19–R26 ve R29–R30'u mevcut modüllerle bütünleştir. Önce R19–R20 seans akışı, ardından R21–R23 plan uyarlama, ardından R24–R26 haftalık değerlendirme ve veri kaynağı; R29–R30 görsel sistemini bu ekranlarla birlikte tamamla. Hızlı set kaydı, profil aktarımı, açıklanabilir öneri, beslenme kapsamı, uyku ve test protokollerini uçtan uca tamamla. Onay gerektiren kuralı teknik olarak kapalı ve belgeli bırakmak ile işlevi yarım bırakmayı ayır.

S3 Yayın adayı: R14–R18 ve R27–R28'i tamamla. AT01–AT55 için geçti/başarısız/çalıştırılmadı/dış bağımlılık durumlarını kanıtıyla kaydet; gerekçesiz kapsam dışı ilan etme. Veri geçişini izole veride dene, raporu ve yedeği açıp doğrula, mobil ve erişim kontrollerini çalıştır. İlgili test ve derleme başarısızlıklarını gider; ilk çalışan prototipte durma.

S4 Saha hazırlığı: Yazılımın içine yeni araştırma platformu kurmadan pilot görev listesini, ölçülecek sonuçları ve uzman inceleme listesini hazırla. Gerçek kullanıcı araştırması yürütülmediyse yürütülmüş gibi sonuç üretme. Bu aşama için 8–12 kullanıcıyla kullanılabilirlik ve sonrasında 8–12 haftalık pilot önerilebilir; örneklem yeterliliği ve klinik etkinlik iddiası ayrıca tasarlanmalıdır.

## 11 Çıktılar ve izlenebilirlik

Mevcut proje dokümantasyon düzenine uy; aşağıdaki içeriklerin eşdeğerlerini üret:

1. Çalışan kod değişiklikleri ve gerektiğinde geriye uyumlu veri geçişi.
2. docs/revision-status.md: R/AT matrisi, aşama, kanıt yolu, engel ve sonraki adım.
3. docs/revision-decisions.md: yalnız önemli ürün/mimari kararlar, alternatif ve kısa gerekçe.
4. docs/model-card.md veya mevcut eşdeğeri: hesap ve öneri sınırları, sürümler, kanıt durumu.
5. docs/release-readiness.md: yayın adayı özeti, testler, geçiş/geri alma, kapalı özellikler ve dış onaylar.
6. Gerçekten çalıştırılmış gerekli testler ve sentetik fixture'lar. Kapsam içi riskleri karşılayan sayıda test kullan; sırf dosya sayısını artırma.

Her önemli bulguyu mümkünse dosya ve satırla ilişkilendir. Ekran görüntüsü alındıysa yalnız sentetik veri kullan ve anlamını belirt. Gerçekte oluşturulmamış test logu, commit, PR veya ekran görüntüsü bağlantısı uydurma.

## 12 Bitiş ve engel protokolü

Bitmiş saymak için: kapsam içi yazılım davranışları uygulanmış, ilgili kontroller çalıştırılmış, kritik regresyonlar giderilmiş, değişiklikler incelenebilir, veriler korunmuş ve AT matrisi güncel olmalı. Çalıştırılmayan testleri geçti sayma. Üretimde olmadığı halde canlıya alındı deme. Onayı olmayan sağlık veya ilerleme politikası etkinse yayın adayı hazır deme; güvenli kapalı durum ve açık bağımlılığı raporla.

Tek bir dış bağımlılık varsa bağımsız işleri sürdür. Gerçek engel kaynak kod, gerekli erişim, ortam izni veya ürün sonucunu belirleyen bilgi ise gereken en küçük kullanıcı girdisini iste. Eksik bilgiyi sahte servis, sahte API, sahte klinik kural veya kalıcı TODO ile kapatma. Dış bağımlılıktan kaynaklanan kapalı özelliğin kullanıcı deneyimi ve testi yine tamamlanmalı.

Son yanıtı Türkçe yaz. Önce ne değiştiğini ve yayın adayı durumunu belirt. Ardından kritik düzeltmeler, doğrulama özeti, kalan dış bağımlılıklar, veri geçişi/geri alma durumu ve kullanıcıdan gereken tek sonraki kararı ver. Ham düşünce süreci yerine kısa gerekçeler ve kanıtlar sun. Önceki raporu uzun uzun tekrar etme.

Şimdi gerçek kod deposunu doğrula, kısa uygulama sırasını oluştur ve kapsam içi revizyonu başlat. Kod mevcutsa yalnız plan sunup durma.
