# Hesaplı sürüm — yerel ön sürüm

## Açılış

`START_ACCOUNTS_MAC.command` dosyasını çalıştır. Karşılama ekranı
`http://127.0.0.1:10001` adresinde açılır. **Profil oluştur** bölümünde görünen
adını, kullanıcı adını ve en az 15 karakterlik şifreni belirle.

Girişten sonra sağ üstte kendi adın görünür. Buradan çıkış yapabilir veya
mevcut şifrenle yeni bir şifre belirleyebilirsin. Şifre değişikliği bütün
oturumları kapatır. Hesabım → Kurtarma kodlarım bölümünde mevcut şifrenle beş tek kullanımlık
kod oluşturabilirsin. Kodlar yalnız bir kez gösterilir; güvenli bir yerde
sakla. Girişte Şifremi unuttum bu kodlardan birini kullanır ve bütün
oturumları kapatır. E-posta kurtarma yoktur; kullanıcı adları e-posta değildir.

Bu başlangıç dosyası mevcut `START_MAC.command` / `launch.py` sürümünden
ayrıdır. Çalışan eski sunucuyu kapatmaz ve onun hesap korumasını değiştirmez.

## Verilerin ayrılması

- Yeni hesap boş kişisel kayıtlarla başlar. Eski ortak veritabanı veya
  tarayıcı kayıtları kendiliğinden ilk kaydolan kişiye verilmez.
- Antrenman, beslenme, sağlık, dönem ve ayarlar, giriş yapan hesabın
  kimliğiyle sunucuda saklanır. İstek gövdesindeki başka bir kullanıcı
  kimliği veri sahibini değiştiremez.
- Tarayıcı kayıtları, geri alma geçmişi, fotoğraflar, yerel yedekler ve
  IndexedDB kayıt geçmişi kullanıcı kimliğine göre ayrı adlarda tutulur.
- Mevcut taşınabilir yedeğini ilgili hesaba giriş yaptıktan sonra
  **Ayarlar → Yedek** akışından inceleyerek aktarabilirsin. Hesap oluşturma
  eski dosyalarını silmez veya taşımaz. Otomatik eski hesap sahipliği geçişi
  henüz uygulanmadı.
- Fotoğraflar kullanıcıya ayrılmış IndexedDB ve sunucunun `photos.sqlite3`
  dosyası arasında eşitlenir. Gelişim → Ayrıntılar → Vücut Ölçümleri
  bölümünde durum ve Eşitle düğmesi bulunur. Yeni kayıt, silme ve geri alma
  diğer cihazlara geçer. Çevrimdışı değişiklikler sonraki eşitlemeyi bekler.
  İki cihaz aynı fotoğrafı değiştirirse üzerine yazılmaz; paneldeki
  **Çakışan fotoğraf kopyalarını koru** işlemi iki kopyayı da saklar.
  Tam taşınabilir yedek bu cihaza indirilmiş fotoğrafları içerir.

## Spor profilin ve kütüphane

İlk girişte dört adımlı spor profili açılır: branşlar, deneyim/hedefler,
haftalık zaman/ekipman ve özet. İstersen **Daha sonra** ile kapatıp
**Profilim → Profilimi oluştur** üzerinden tamamlayabilirsin.

**Profilim** içinde 15 ailede 199 başlangıç branş/aktivite tanımı ve 18
çalışma yöntemini içeren kütüphane, kişisel branş ekleme ve geçmiş tarihli
branş seansı kaydı bulunur. Yeni profil ve seanslar aynı kullanıcıya ait
sunucu kayıtlarına ve taşınabilir yedeğe katılır. Ayrıntılar:
[Spor profili ve kütüphane](SPORTS_PROFILE.md).

## Depolama

Kimlikler, scrypt şifre özetleri ve oturum özetleri:
`~/.athlete-life-os/accounts/accounts.sqlite3`.

Antrenman ve uygulama verileri mevcut `.env` içindeki `STORAGE_BACKEND`
ayarını izler:

- `mongodb`: `MONGODB_DATABASE` altında ayrı `account_state_revisions`
  koleksiyonu. Birleşik benzersiz anahtar: `user_id + revision`. Eski
  `state_revisions` koleksiyonu okunmaz veya değiştirilmez.
- `sqlite`: `~/.athlete-life-os/accounts/states.sqlite3` dosyasında
  kullanıcıya göre ayrılmış kayıtlar.

MongoDB bağlantısı başarısızsa SQLite'a sessiz geçiş yapılmaz. Hesap
veritabanı bu ön sürümde tek sunucuda yerel SQLite kullanır; MongoDB'de
uygulama verisi tutulması hesap kimliklerini başka kurulumlara taşımaz.
Sunucu taşınırken kimlik veritabanının da güvenli biçimde taşınması gerekir.

Geliştirme için açık seçenekler:

```sh
.venv-modern/bin/python -B account_server.py --backend sqlite --port 10001
```

`--data-dir` hem kimlik hem yerel veri dosyalarının dizinini değiştirir.
Normal uygulama yedeği şifreleri veya oturumları içermez.

## Kayıt güvenliği ve çakışmalar

Her veri isteği oturum ve hesap kimliğiyle doğrulanır. Yazma isteklerinde
ayrıca istek kaynağı ve CSRF değeri kontrol edilir. Başka hesapla giriş
yapıldığında eski sekme kilitlenir; eski sekmeden gönderilen istek sunucuda
da reddedilir.

Sunucu kayıt sürümünü kontrol eder. İki cihaz aynı sürümü değiştirirse ilk
kayıt kabul edilir; ikinci kayıt eski verinin üzerine yazmaz. Yerel taslak
korunur. Çakışma panelinden taslağı indirip **Sunucudakini aç** seçilebilir.
İndirilen taslak fotoğrafları içermez; fotoğraflar için tam yedek gerekir.
Bağlantı kesildiğinde bekleyen kayıt hesabın kendi yerel kuyruğunda kalır.

Şifreler scrypt (`N=131072`, `r=8`, `p=1`) ile rastgele tuz kullanılarak
özetlenir. Oturum çerezi `HttpOnly`, `SameSite=Strict` ve 12 saat sürelidir;
sunucuda çerezin kendisi yerine özeti saklanır. Giriş denemeleri sınırlanır.
Dayanak: [OWASP şifre saklama](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
ve [oturum yönetimi](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## Ortak çalışma alanı

**Bugün / Plan / Antrenman / Beslenme / Gelişim** beş ana başlıktır.
Plan → Yeni dönem oluştur ile haftalık branş, süre, çalışma tarifi,
RIR/dinlenme ve ilerleme kuralını gir; incele ve açıkça ana plana al.
Geçmiş dönemler korunur; yeni döneme kopyalama yapılabilir.
Antrenman → Seanslarım bütün tarihli branş ve hareket seanslarını gösterir.
Branş kaydını aynı günün hareket kaydıyla eşleştirerek çift sayımı önlersin.
Gelişim → Ortak analiz eksik veriyi, kayıtlı süre/yükü ve aynı koşullardaki
branş ölçümlerini gösterir. Ayrıntılar: [Revizyon raporu](ACCOUNT_REVISION.md).

## Yayın sınırı

Varsayılan sunucu yalnız `127.0.0.1` üzerinde çalışır. İnternet hizmeti
henüz yayımlanmadı. `--public-origin https://alan-adin` seçeneği, aynı
makinedeki HTTPS ters vekili için Secure çerez ve HSTS açar. Alan adı,
sunucu, sertifika, pilot ve kalan eski ekran güvenlik incelemesi henüz
tamamlanmadı. [Yayın hazırlığı](deployment/README.md) bu sınırları açıklar.
Kullanıcı alanlarını ayırmak cihazın dosyalarını şifrelemez.

## Doğrulama

16 Eylül 2026'da örnek verilerle:

- `accounts.test.py`: şifre/oturum yaşam döngüsü, giriş sınırı, SQLite ve
  MongoDB sürücü taklidiyle kullanıcı ayrımı, sürüm çakışması, saklama süresi,
  HTTP üzerinden giriş/çıkış, kaynak/CSRF/hesap denetimi ve özel dosyalara
  erişimin reddi.
- `account-context.test.js`: kayıt, fotoğraf, yedek, geri alma ve yerel
  geçmiş alanlarının ayrılması; eski ortak verilerin otomatik alınmaması.
- `account-sync.test.js`: bağlantı kesintisi, kalıcı kuyruk, yeniden yükleme,
  ardışık kayıt, çakışma ve süresi biten/değişen oturum.
- `accounts-browser.test.js`: gerçek Chrome'da iki hesap oluşturma,
  giriş/çıkış, eski sekmenin kilitlenmesi, fotoğraf ayrımı, tekrar girişte
  kayıtların geri gelmesi ve 390 px mobil görünüm.

Canlı Atlas'a aktarım veya gerçek kullanıcı hesabı oluşturma bu testlerde
yapılmaz. MongoDB testi `mongomock` kullanır.

## Son doğrulama ve kalan işler

Yeni yerel paketler: ortak seans/dönem analizi, beş ana başlık, tek kullanımlık
kurtarma kodları, fotoğraf eşitleme ve HTTPS yapılandırması. Durum ve testler:
[Revizyon ilerlemesi](REVISION_PROGRESS.md). İnternet yayını ve her branş
üzerinde doğrulanmış otomatik spor reçetesi tamamlanmış değildir.
