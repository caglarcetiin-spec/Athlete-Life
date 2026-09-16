# Açık / koyu görünüm · 16 Eylül 2026

## Değişiklik

- Tema renkleri `appearance.css` içinde ortak değişkenlerden gelir.
- Profilin gün ve ekipman seçimlerinde zemin/yazı çakışması giderildi.
- Üst çubuk, profil penceresi ve ayarlardan tema değiştirilebilir.
- `settings.theme`, mevcut hesap eşitlemesi ve yedekleriyle saklanır.
- Gezinmede cam yüzey, içerikte opak kart; azaltılmış hareket ve
  desteklenmeyen blur için alternatif görünüm bulunur.
- Gelişim menüsü mevcut Grafikler ve Ayrıntılar ekranlarına erişir.

## Doğrulama

Gerçek tarayıcıda geçici, boş bir SQLite hesabı kullanıldı; kişisel kayıtlar
test amacıyla değiştirilmedi. Açık/koyu profil adımları, gün ve ekipmanlar,
seçilmiş/seçilmemiş seçenekler, profil kaydetme, ayarlar ve yenileme denendi.
Tema değiştirirken 45 dakikalık Pazartesi ve seçilmiş ekipman taslağı korundu.

Hesaplanmış DOM renkleriyle profil gün/ekipman ekranında en düşük metin
kontrastı açık temada 6.29:1, koyu temada 9.12:1 ölçüldü. Ana beş bölüm,
grafikler, analiz alt ekranları, raporlar ve ayarların denetlenen görünür
metinlerinde eşik altı sonuç bulunmadı. Bu ölçüm bir tam WCAG sertifikasyonu
değildir; canvas içindeki pikseller otomatik DOM denetimine dahil değildir.

390 px mobil görünümde profil ve ana ekranlar, 320 px'te özet ekranı yatay
taşma olmadan açıldı. Profil masaüstünde görsel olarak da incelendi.
Tarayıcı hata günlüğünde hata görülmedi.

- `accounts.test.py`: 8 test başarılı.
- `cloud-http.test.py`: MongoDB test deposuyla 4 HTTP sözleşmesi başarılı.
- `private-delivery.test.py`: 3 test başarılı.
- Yeni sözleşme: iki oturum arasında tema saklama, diğer hesabın ayrılığı,
  tema değişiminde antrenman ve diğer ayarların korunması, tema dosyalarının
  sunulması ve hesap kapsamından sonra yüklenmesi.
- JavaScript sözdizimi ve git diff boşluk kontrolü başarılı.

Üretim için veri göçü gerekmez. Tema seçimi ilk kullanıcı değişikliğinde
normal snapshot olarak MongoDB'ye yazılır; eski kayıtlar yeniden aktarılmaz.
