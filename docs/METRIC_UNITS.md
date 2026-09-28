# Süre ve mesafe birimleri

2026-09-28. Planlama kapasitesi, hareket editörü, hedef aralıkları, gerçekleşen set, seans özeti ve süre tahmini artık süreyi saniye/dakika/saat; mesafeyi metre/kilometre olarak alır. Rapor ve plan özetleri okunabilir birimleri gösterir. Ölçüm kütüphanesinde saat desteklenir.

`QuantityInput` görüntü değerini tek kez kanonik değere çevirir: 30 dakika = 1800 saniye, 1,5 saat = 5400 saniye, 5 km = 5000 metre. Birim değiştirmek miktarı değiştirmez. Virgüllü ondalık kabul edilir; boş değer UNKNOWN/null kalır, hatalı metin sıfıra çevrilmez. Tekrar, kg ve RIR/RPE bu dönüşümden bağımsızdır. Mevcut kanonik alt/üst sınırlar korunur.

## Denetim ve kapsam

199 branş ve 1151 hareket statik katalog üzerinden sayıldı. Süreli mobilite ve tekrar içermeyen süreli teknik kayıtlarda ana giriş süreye yönlendirildi. Branş kapasite girişinin üst sınırı sunucuyla eşitlendi; bu, önerilen antrenman dozunun sınırlarını değiştirmez.

Bazı eski katalogların tercih edilen ölçüm metadata değeri minutes/km'dir. Antrenman Targets alanları yine seconds/distance_m'dir; eski kayıtların değerleri topluca yeniden yorumlanmaz. Bu çalışma bütün branşların watt, kadans, tur ve diğer özel protokollerinin eksiksiz olduğu veya fizyolojik modelin doğrulandığı anlamına gelmez.

## Veri, yayın ve geri alma

- Antrenman kayıt alanları ve DB şeması değişmez. Hesap/medya/veri göçü yoktur; kişisel verilerle test yapılmadı.
- Kapasite ölçümü `unit=h` kabul eder ve karşılaştırmalı seride 3600 ile saniyeye normalize eder. Özgün değer/birim korunur. Bu ayrı ölçüm formunda birim değişince değer eski davranış gereği temizlenir ve yeniden giriş istenir.
- Yerel önizleme paketi güncellendi; bu teslim Render yayını veya GitHub push içermez. Gerçek AI isteği yapılmadı.
- Geri almada saniye/metre antrenman verisi uyumludur. Yeni saat ölçümlerini okuyacak backend'in h desteği korunmalıdır; kişisel kayıt silme/geri yükleme yapılmamalıdır.

## Doğrulama

36 web birim testi; 259 API/PostgreSQL ve sentetik Mongo parite kontrolünü içeren regresyon testi geçti. Test ortamları kişisel veriden ayrıdır. Üretim derlemesi başarılıdır.

Sentetik tarayıcı akışında 30 dakika kapasite AI isteğinde 1800 saniye; 30 dakika/5 km/1,5 dakika dinlenme planında 1800/5000/90 olarak doğrulandı. Gerçekleşen kayıt ve sayfa yenileme aynı değerleri korudu. 0,5 saatlik seans ve RPE 4 için seans yükü 120 oldu. Mobil/masaüstü erişilebilirlik ve taşma kontrolleri geçti. Son süreli teknik alan değişikliği ayrıca web birim testleriyle doğrulandı.

Komut, kaynak hashleri, ortam, stdout/stderr ve çıkış kodları `evidence/stage-9/metrics_*` kayıtlarında; ilk test koşularındaki düzeltmeler `evidence/metrics/NOTES.md` içindedir. Bunlar yazılım doğrulamasıdır, klinik doğrulama değildir.
