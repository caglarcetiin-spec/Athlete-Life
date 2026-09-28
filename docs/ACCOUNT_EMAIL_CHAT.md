# Hesap silme, e-posta koduyla kayıt ve EVREN sohbeti

2026-09-28. Kullanıcı yönetici adresini yalnız iletişim için seçti; gönderici servisi bulunmadığı için altyapının hazırlanmasını ve kurulum rehberini istedi.

## Kullanım

- Profilim'in üstündeki **Hesabı kalıcı olarak sil**, aynı sayfadaki silme formunu açar. Mevcut şifre ve açık silme onayı gerekir. Bekleyen eşitleme varken silme kapalıdır. Mevcut sahiplik kapsamlı silme hattı kullanılır; hesap, aktif kayıtlar, fotoğraflar ve oturumlar kaldırılır. İndirilmiş veya sağlayıcının süreli yedekleri bu işlemle uzaktan silinmez.
- Kayıt → e-posta → kod iste → altı haneli kod → hesap oluştur. Kod kabul edilmeden kullanıcı/atlet kaydı oluşmaz. Gönderim bağlı değilse yeni kayıt kapalı kalır; mevcut hesaplar etkilenmez.
- Araçlar → **AI ile sohbet et**. Metin ve tek görsel eklenebilir. Her gönderimde EVREN onayı gerekir. Sohbet yalnız sayfanın belleğinde tutulur; çıkış/yenilemede silinir. Önceki mesaj ve yanıtlar sınırlı bağlam olarak gider, önceki görseller yeniden gönderilmez. Uygulama sağlık kayıtları kendiliğinden okunmaz ve sohbet plan değiştirmez.

## E-posta bağlantısının tamamlanması

Resend HTTPS adaptörü hazırdır. Henüz bir hesap, ücretli kaynak veya alan adı oluşturulmadı; gerçek e-posta gönderilmedi.

1. Bir Resend hesabında sahip olduğun alan adını doğrula ve bu alanda bir gönderici tanımla. Yönetici Outlook adresi alan adı doğrulaması yerine geçmez.
2. Gönderme yetkili API anahtarı oluştur. Anahtarı sohbete veya GitHub'a yazma; yerel sunucu/Render gizli ortam ayarına koy.
3. Sunucuda şu değerleri tanımla:
   - `ALOS_V2_RESEND_API_KEY`: gizli gönderim anahtarı.
   - `ALOS_V2_EMAIL_FROM`: doğrulanmış gönderici, ör. `Athlete Life <noreply@kendi-alanin>`.
   - `ALOS_V2_EMAIL_CODE_SECRET`: bağımsız, rastgele en az 32 karakterlik sunucu sırrı. Kod HMAC korumasında kullanılır.
   - `ALOS_V2_SUPPORT_EMAIL`: kullanıcının seçtiği yönetici iletişim adresi; varsayılan kodda tanımlıdır. Gönderici kimliği olarak kullanılmaz; iletişim ve Reply-To içindir.
   - `ALOS_V2_REGISTRATION_ENABLED=true`: yeni kayıt açılması isteniyorsa.
4. Şema güncellemesini uygulayıp sunucuyu yeniden başlat. `/api/v2/auth/config` içinde `email_delivery=ready` olmalı. Bu yalnız yapılandırma kontrolüdür; gerçek teslimat garantisi değildir. Ardından kendi alıcı adresinle teslimatı doğrula.

[Resend gönderim API'si](https://resend.com/docs/api-reference/emails/send-email), [alan adı doğrulaması](https://resend.com/docs/dashboard/domains/introduction). Gönderici/alan adı hazır değilse bağlantı tamamlanamaz; uygulama doğrulamasız kayıt açarak bu şartı atlamaz.

## Güvenlik ve veri haritası

`EmailChallenge`: id (rastgele opak token), email, code_hash (sunucu sırrıyla HMAC-SHA256), attempts, expires_at. Parola ve ham kod bu tabloda tutulmaz. Kod 10 dakika/5 yanlış deneme sınırındadır; yanlış deneme sayısı hata yanıtına rağmen commit edilir. Son kod isteği öncekini iptal eder. Başarılı kod doğrulaması ve hesap oluşturma aynı işlemde gerçekleşir; challenge silinir. IP, adres ve global gönderim limitleri vardır. Resend hatasında challenge kaldırılır. POST origin denetimi korunur. Normal hesap e-posta düzenleme ekranı yeni adresi doğrulanmış saymaz.

Mongo'da expires_at TTL indeksi; PostgreSQL ve Mongo'da çalışan worker dakikalık süresi dolmuş kayıt temizliği. Uyuyan ücretsiz servislerde worker gecikebilir; süresi geçmiş kod doğrulaması yine reddedilir. Hesap silme aynı e-postaya bağlı bekleyen challenge'ı da kaldırır.

`/ai-chat`: kimlik + CSRF + ayrı kullanıcı limiti ve ortak global AI limiti. Sabit EVREN HTTPS adresi, yönlendirme yok. Mesaj sınırı 5000 karakter, toplam bağlam 24000 karakter ve en fazla 16 mesaj. Önceki tam mesaj çiftleri sığdığı kadar gönderilir. JPEG/PNG/WebP giriş 2 MB/12 MP; yeniden kodlama ile 960px, metadata çıkarımı. URL ile uzak görsel getirme yapılmaz. Yanıt metin olarak render edilir; HTML çalıştırılmaz. İçerik uygulama veritabanına yazılmaz; EVREN'in kendi saklama koşulları ayrıca geçerlidir.

`ALOS_V2_EVREN_CHAT_MODEL` boşsa mevcut EVREN modeli kullanılır. 28 Eylül katalog kanıtında vision=true olan qwen3.8-flash-next / qwen3-vl-30b görsel için tanınır; diğer modeller ancak `ALOS_V2_EVREN_CHAT_VISION=true` ile yönetici tarafından doğrulanarak açılır. Katalog kanıtı `evidence/evren/benchmark-20260928T034234Z/manifest.json`. Bu teslimde gerçek EVREN'e görsel test isteği yapılmadı; taşıma sentetik doğrulandı. Sağlayıcı model desteği değişirse yeniden kontrol edilmelidir.

## Şema, yayın ve geri alma

PostgreSQL yeni eklemeli revision `a829email001` (parent c47a9e110203); Mongo `alos_v2_email_challenges` ve email/TTL indeksleri. Mevcut hesap/sağlık/medya kayıtlarına göç yok. Yerel kişisel önizlemede yalnız boş koleksiyon/indeks eklendi; kayıt okunmadı veya test edilmedi. Render/GitHub yayını yapılmadı.

Kod geri alınırken ek koleksiyon bırakılabilir. Eski sürüm doğrulamasız kayıt açabildiğinden geri almadan önce `REGISTRATION_ENABLED=false` yapılmalıdır. Şema downgrade yalnız bekleyen kodları kaldırır; hesapları geri getirmez. Gerçek hesap silme geri alınamaz; bu teslimde yalnız sentetik test hesapları silindi.

## Test kanıtları

`docs/evidence/stage-9/account_chat_*`: komut, kaynak hashleri, ortam, stdout/stderr ve exit kodları. Sentetik e-posta gönderimi, yanlış/eski/süresi dolmuş/tek kullanımlık kod, PostgreSQL/Mongo paritesi; silmede sahiplik ve fotoğraf temizliği; chat CSRF/onay, görsel yeniden kodlama ve veri kaydetmeme; mobil/masaüstü browser/Axe kontrolleri.

İlk derleme sohbet bağlantısının yanlışlıkla sözlük dizisine eklenmesini yakaladı; bağlantı Araçlar listesine taşındı. İlk API testinde medya listesi `media` sanılmıştı; gerçek `medias` sözleşmesine düzeltildi. İlk browser koşusu Axe'ın açık newContext gereksiniminde durdu; fixture düzeltildi. Test beklentileri gevşetilmedi.

Son sonuç: 28 API/yaşam döngüsü/regresyon testi + 2 ek fotoğraf/sahiplik silme testi; 39 web testi; mobil/masaüstü uçtan uca kayıt-sohbet-silme ve Axe kontrolleri geçti. Son bağlam sınırı değişikliği birim testleri ve son üretim derlemesiyle doğrulandı. Yerel önizleme readiness=200, güncel JS varlığı eşleşiyor; email_delivery=unconfigured olduğu ayrıca doğrulandı.
