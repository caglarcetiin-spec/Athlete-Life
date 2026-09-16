# Render üzerinde hesaplı uygulama

Mevcut servis: https://athlete-life.onrender.com

- Build Command: `pip install -r requirements.txt`
- Start Command: `python3 start_render.py`
- `STORAGE_BACKEND=mongodb`
- `ACCOUNT_STORAGE_BACKEND=mongodb`
- `MONGODB_URI`: yalnız Render gizli ortam ayarında saklanır.
- `MONGODB_DATABASE=athlete_life`
- `ALOS_PUBLIC_ORIGIN=https://athlete-life.onrender.com`

Başlatıcı Render'ın PORT değerini kullanır. HTTPS adresi veya MongoDB
ayarları eksikse açılmaz. Varsayılan TCP sağlık kontrolü kullanılabilir.
Render dışındaki yerel başlatıcı loopback adresinde çalışmaya devam eder.

## Kalıcı kayıtlar ve aktarım

Uygulama kayıtları `account_state_revisions`; kimlikler, oturumlar, giriş
denemeleri ve fotoğraflar ayrı `account_*` koleksiyonlarında tutulur.
Ücretsiz Render dosya sistemi kalıcı veri deposu olarak kullanılmaz.
Eski `state_revisions` koleksiyonu korunur.

Mevcut yerel hesapları taşımadan önce SQLite dosyalarının tutarlı yedeğini al.
`python3 migrate_cloud_accounts.py --data-dir <özel-veri-klasörü>` ön kontrol
yapar. `--apply` kullanıcı kimliğini ve parola özetini koruyarak aktarır;
farklı uzak kayıtları ezmez. Uygulama snapshot'larını değiştirmez. Aktarımdan
sonra yerel ortamda da ACCOUNT_STORAGE_BACKEND=mongodb kullan. Önceden açık
yerel süreç yeniden başlatılana kadar eski kimlik deposunu kullanır.
Oturumlar taşınmaz; aynı kullanıcı adı ve şifreyle yeniden giriş yapılır.

Atlas erişim listesine yalnız Render Connect panelinde gösterilen çıkış
ağları eklenir. Bu serviste doğrulanan ağlar 74.220.51.0/24 ve
74.220.59.0/24'tür; diğer Render servisleriyle ortaktır.

Eski tek kullanıcılı sunucuya MongoDB bağlantısı eklemeden önce başlangıç
komutunu hesaplı start_render.py olarak değiştir. Kaynaklar yayımlandıktan
sonra başarılı deploy'u ve girişsiz /api/state isteğinin 401 döndüğünü doğrula.

Telefon ve bilgisayar aynı HTTPS adresini ve hesabı kullanır. Bilgisayarın
açık olması gerekmez. Ücretsiz Render servisi uyuduğunda ilk açılış 50 saniye
veya daha uzun sürebilir. MongoDB yedekleme politikası ayrıca yönetilmelidir.
