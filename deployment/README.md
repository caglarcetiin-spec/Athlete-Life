# Hesaplı sürümü yayımlama hazırlığı

Bu dosyalar dağıtım şablonudur. Bu çalışma bir internet adresi açmadı,
DNS değiştirmedi ve canlı kullanıcı verisi taşımadı. Sunucu/alan adı
seçilmeden yayın hedefi belli değildir.

## Tek sunucu mimarisi

Tarayıcı → HTTPS / Caddy → yalnız loopback Python hesap sunucusu.
Kimlikler ve fotoğraflar kalıcı özel dizindeki SQLite dosyalarındadır;
uygulama snapshot'ları SQLite veya MongoDB olabilir. Bu sürüm birden fazla
uygulama sunucusuna yatay ölçekleme için hazırlanmadı. Proxy arkasında giriş
limiti loopback adresini ortak sayar; küçük kapalı pilot için muhafazakâr
sınırdır, büyük dağıtım öncesi güvenilir proxy/IP ve dağıtık limit gerekir.

1. Alan adının DNS kaydını sunucuya yönlendir; 80/443 bağlantılarını Caddy'ye aç.
2. Uygulama dizininde bağımlılıkları yükle: `python -m pip install -r requirements.txt`.
3. Yalnız hizmet kullanıcısının okuyabildiği kalıcı veri dizini seç.
4. `python -B account_server.py --port 10001 --data-dir /srv/athlete-private --backend sqlite --public-origin https://KENDI-ALAN-ADIN --no-browser`.
5. `Caddyfile.example` içindeki örnek alan adını aynı gerçek alan adıyla değiştir.
6. Caddy yapılandırmasını doğrula, ardından kendi hizmet yöneticinle çalıştır.
   Python portunu internete açma. Host ve Origin denetimleri gerçek HTTPS
   alan adını bekler; ters vekil Host başlığını korumalıdır.
7. Dış tarayıcıdan kayıt/giriş, iki hesap ayrımı, mobil görünüm, fotoğraf,
   yedek indirme ve kurtarma kodu akışını pilot hesaplarla sınayın.

`--public-origin` yalnız HTTPS kök adresini kabul eder. Bu modda oturum
çerezi `Secure; HttpOnly; SameSite=Strict` ve yanıtlar HSTS taşır. TLS'yi
Caddy sonlandırır; Python'a gelen bağlantı aynı makinede kalır. Sertifika
başvurusu ve sunucu kurulumu bu şablonu yazmakla gerçekleşmez.

## İşletim ve yayın kapısı

- Kalıcı dizindeki `accounts.sqlite3`, `states.sqlite3` (SQLite seçildiyse)
  ve `photos.sqlite3` birlikte, SQLite online backup API'si veya hizmet
  durdurulmuşken yedeklenmelidir. Açık dosyaları sıradan kopyalama tutarlı
  yedek garantisi vermez. MongoDB kullanılıyorsa onun yedeği de gerekir.
- Kullanıcının uygulama yedeği şifre özetlerini/kurtarma kodlarını içermez.
  Tam uygulama yedeği bu cihaza indirilmiş fotoğrafları içerir; önce eşitle.
- E-posta ile kurtarma yoktur. Kullanıcı hesabındayken beş tek kullanımlık
  kurtarma kodu oluşturur. Kodları kaybeden ve şifresini unutan kullanıcı
  için otomatik kimlik doğrulama kestirmesi bulunmaz.
- Sunucu JSON/fotoğraf boyutlarını sınırlar, resim türlerini ve başlıklarını
  kontrol eder. Bu kontroller antivirüs veya kapsamlı görüntü doğrulaması değildir.
- Mevcut büyük uygulamada inline olay işleyicileri bulunduğu için CSP
  `unsafe-inline` kullanır. Yerel testler bir penetrasyon testi yerine geçmez.
  Geniş kullanıcı kitlesine açılmadan önce kalan eski ekranlarda HTML
  kaçışlarının sistematik denetimi, CSP sıkılaştırma, yük ve felaket kurtarma
  provası tamamlanmalıdır. Bu kapı henüz kapatılmış değildir.

Kaynaklar: [Caddy reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy),
[Caddy otomatik HTTPS](https://caddyserver.com/docs/automatic-https),
[OWASP hesap kurtarma](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
