# AI taslağı doğrulama ve kullanım sınırı

2026-09-28. Kullanıcı ilk hatanın metnini hatırlamıyor; kişisel plan veya sağlayıcı yanıtı incelenmedi. Bu nedenle o yanıtın özel kök nedeni doğrulanmış değildir. Kodda kesin olarak bulunan sorunlar: başarısız taslaklar üç istek hakkını tüketiyordu; hazırlama yöntemi radio girdileri genel yüzde 100 genişlik/46px yüksekliğini alıyordu.

## Davranış

- Plan şeması veya doz/kapsam doğrulaması başarısızsa sağlayıcıya aynı onaylı form bağlamı ve sunucunun doğrulama nedeni ile en fazla bir düzeltme isteği gönderilir. Her yanıt aynı doğrulayıcıdan geçer. Güvenlik, ekipman, süre veya kapasite sınırları gevşetilmez; otomatik kayıt yapılmaz.
- Ağ, erişim, kota veya ret yanıtında otomatik yeniden çağrı yoktur. İki geçersiz yanıttan sonra neden gösterilir; standart taslağa sessizce geçilmez.
- Başarısız plan isteği kullanıcı kotasında ayırdığı yeri aynı pencere içinde iade eder. Başka pencerenin sayacı değişmez. İstek başına en fazla iki çağrı, kullanıcı başına 15 dakikada en az 6 / yapılandırılmış limitin iki katı deneme ve her sağlayıcı çağrısı için global limit devam eder. AI gelişim yorumu mevcut ortak kotayı kullanır.
- Kota hatası gerçek kalan saniyeyi döndürür. UI sayacı yalnız AI düğmesini bekletir; standart taslak kullanılabilir. Önceki sürümden kalan sayaçlar silinmez, kendi 15 dakikalık penceresinde sona erer.
- İki 150 saniyelik çağrı için plan isteği istemci zaman aşımı 330 saniyedir; gelişim 180 saniye, normal istekler 12 saniye kalır. Otomatik düzeltme ek sağlayıcı tüketimi doğurabilir; global sınır her çağrı için uygulanır.
- Yöntem seçenekleri 18px radio ve en az 44px dokunma alanıyla yan yana, dar ekranda tek sütunda gösterilir. Yazılar ana tema metin rengini kullanır.

## Veri ve yayın

DB şeması, hesap veya medya göçü yok. Yeni kişisel veri alanı yok; retry_after_seconds ve validation_feedback geçici istek/yanıt metadata alanlarıdır. Yeni hazırlama bağlamı yine aynı sağlayıcıya gider; yeni hesap/sağlık alanları eklenmedi. Mevcut planlar değiştirilmez. Yerel önizleme güncellendi; Render yayını/GitHub push bu teslimin kapsamında değil. Geri alma kod/paket geri dönüşüdür; kişisel kayıtların silinmesi veya veritabanı geri yüklemesi gerekmez.

## Kanıt

Sentetik yanıtlarla kalistenik hata → düzeltme → program.create akışı; iki başarısızlıkta kota iadesi; deneme sınırı; global çağrı sınırı; yeni pencereye eski iadenin etkisizliği; ağ/kota/erişim hatalarının tekrar edilmemesi test edildi. MongoDB testleri yalnız geçici sentetik veritabanı kullanır. Gerçek AI yanıt kalitesi veya biyolojik doğrulama iddiası yoktur.

Komut, kaynak hashleri, stdout/stderr ve exit kodu: docs/evidence/stage-9/ai_repair_*. İlk API koşusu sandbox localhost erişimi nedeniyle durdu; test beklentileri değiştirilmeden izinli sentetik ortamda geçti. İlk tarayıcı testi seçili radio etiketinde 4,33:1 kontrast buldu; ürünün yazı rengi düzeltildi, 4,5:1 test eşiği değiştirilmedi.

Son doğrulama: 42 API/Mongo/regresyon testi, 37 web testi, mobil/masaüstü tarayıcı akışı ve üretim derlemesi başarılı. Sentetik sağlayıcıyla doğrulandı; kullanıcının ilk EVREN hatasının tekrarı elde edilmedi.
