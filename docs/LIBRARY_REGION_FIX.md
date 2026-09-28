# Hareket görselleri ve bölgesel plan düzeltmesi

## Sorun ve davranış

Kütüphanenin 1.151 kaydı ile altı çizimden oluşan eski rehber aynı kapsamda değildi. Kas dağılım şeması bir hareketin yapılışını göstermiyordu. Yeni `catalogVisuals.ts`, katalog kimliğine açıkça bağlı başlangıç/çalışma veya tutuş pozlarını içerir. Halka L tutuşu, lever çeşitleri, barfiks, itiş, çekiş, serbest ağırlık ve koşu örüntüleri aynı rehberde açılır. 91 katalog hareketi için çizim vardır; filtre ile yalnız çizimi olan kayıtlar görülebilir. Kayıt ekranındaki hareket yardımcısı da aynı kimlik eşlemesini kullanır.

Bu özgün SVG'ler sadeleştirilmiş örüntü çizimleridir; tüm varyasyonlar için ayrıntılı teknik veya eğitmen onayı değildir. Örneğin ağırlıklı çömelmede yükün yerleşimi, tek bacaklı harekette denge veya halka kavraması ayrı açıklanır. Çizimi bulunmayan özel varyasyonlar ve tek bir hareket olmayan branş çalışma başlıkları açıkça etiketlenir; onlara rastgele bir form atanmaz. Form çizimi ile kas katkısı haritası ayrı işlevlerdir.

Kas haritasındaki 18 anatomik başlık dokunma/klavye ile seçilir. Seçim, katalogdaki yüksek/yardımcı katkıyı gösterir; kişisel aktivasyon, kas hasarı veya gelişim yüzdesi değildir. Mobil kullanıcı için aynı seçimi yapan normal düğmeler de bulunur.

Görsel örüntülerin referans kütüphaneleri: [ACE](https://www.acefitness.org/resources/everyone/exercise-library/), [GMB halka rehberi](https://gmb.io/rings/), [GMB L-sit rehberi](https://gmb.io/l-sit/). Çizimler bu sitelerden kopyalanmış görseller değildir; teknik ayrıntılar için kaynak bağlantıları kullanıcı isteğiyle açılır.

## Bölge sözleşmesi

`GuidedChoices.region_mode`:

- `priority`: eski API/taslaklar için geriye uyumlu varsayılan. Seçilen tam vücut / üst-alt / itiş-çekiş-bacak düzeni korunur, pozitif `focus` puanları önceliktir.
- `selected`: yeni arayüz varsayılanı. Pozitif bölge seçimi varsa kuvvet, beceri ve izometrik adayların katalogdaki en yüksek ana kas katkılarından en az biri seçilmiş olmalıdır. Yardımcı kasları izole etme garantisi verilmez. Sıfır puanlı bölgeler istenmiş sayılmaz. Bölge seçilmemişse genel düzen korunur.

Seçili bölgelerde tam vücut hareket örüntüleri veya eski üst-alt bacak günü zorunluluğu uygulanmaz. Aday havuzu, gün kapsamı ve asgari set kontrolü aynı kısıttan türetilir. EVREN'e `region_mode`, bölge öncelikleri, izinli hareketler ve günün gerçek zorunlu örüntüleri aktarılır; dönüş de bunlara göre doğrulanır. Seçim dışı hareket içeren AI yanıtı reddedilmeye devam eder. Koşu, yüzme ve branş teknikleri kas bölgesi seçimiyle kuvvet hareketine dönüştürülmez.

Üst vücut, alt vücut ve seçimi temizle kısa yolları vardır. Yeni alanı taşımayan cihaz taslakları en geç bölge adımında gözden geçirilir. Kaydedilmiş veya aktif plan kendiliğinden değiştirilmez.

## Kanıtlar

`docs/evidence/stage-9/library_regions_*`: kaynak commit/dosya özetleri, komut/ortam, stdout/stderr ve exit code. Sentetik API testleri 237 kontrol; 199 branş, seçili üst bölge, genel plan, yalnız baldır, seçim dışı AI reddi ve plan kalıcılığı dahil. Mongo testi aynı yeni alanın geçici test veritabanındaki kalıcılığını doğrular. Ön yüz testleri 42 kontrol; MongoDB sentetik kalıcılık testi 1 kontrol. Mobil tarayıcı üst bölge → EVREN isteği → taslak → düzenleyici akışını ve beş farklı hareket çizimini geçti; açık/koyu temada kütüphane erişilebilirlik taraması sıfır ihlal bildirdi. 1.151 kaydın 91 tanesinde form çizimi bulundu; kalan başlıklar için form kapsamı açıkça belirtilir. Tarayıcıda EVREN yerine sentetik taşıma kullanılır; gerçek hesap, sağlayıcı kotası ve kişisel medya kullanılmaz.

İlk tarayıcı koşusunda iki kardeş bileşenin aynı React anahtarını kullanması önceki çizimin kalmasına neden oldu; form ve kas haritası anahtarları ayrıldı. İkinci koşulda mobil sabit üst başlık otomasyon tıklamasını engelledi; test hedefi görünür merkez alana kaydırarak aynı gerçek tıklama ve klavye kabul koşullarını sürdürür. Üçüncü koşuda iki taraflı SVG bölgesinin sınırlayıcı kutu merkezi kasın dışında kaldı; test artık `isPointInFill` ile gerçekten çizili ve görünür bir kas noktasına fare tıklaması yapar. Kabul koşulları gevşetilmedi. Başarısız koşular kanıt geçmişinde korunur.

## Şema, yayın ve geri dönüş

SQL şeması değişmez; `region_mode` var olan plan kararları JSON'unda ek alandır. Hesap/medya/veri göçü yoktur. Ücretsiz Render ve mevcut MongoDB mimarisi korunur. Bu değişiklik yerel önizleme paketidir; canlı Render yayını bu işlemde yapılmaz. Geri dönüşte yeni `region_mode` okuyucusunu koruyun; yeni alanı reddeden eski strict sözleşmeye doğrudan dönmeyin. Mevcut onaylı planlar yeniden yazılmadığından takvim geri taşıması gerekmez.
