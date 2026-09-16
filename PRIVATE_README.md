# Çağlar'ın Athlete Life paketi

Bu **kişisel teslim**, MongoDB bağlantı şifresini ve kişisel yedeklerini içerir.
Arkadaşlarına dağıtılacak boş uygulama paketi değildir.

## Açılış · Mac

1. ZIP'i tamamen çıkar.
2. **START_LOCAL_MAC.command** dosyasını çift tıkla.
3. **Profil oluştur** ile kendi kullanıcı adını ve uygulama şifreni belirle.
4. İlk hesaba MongoDB'den alınan doğrulanmış yedek aktarılır. Branş profilini
   tamamla ve Hesabım bölümünden kurtarma kodlarını sakla.

Python ve gereken sunucu kütüphaneleri pakettedir. Apple Silicon Mac için
hazırlanmıştır. Güncel Chrome veya Safari gerekir. Adres:
**http://127.0.0.1:10003**. Terminal açık kalmalı; Control+C ile kapatabilirsin.

Sonraki hesaplar boş başlar. İlk hesap yeniden giriş yaptığında paket yedeği
yeniden uygulanmaz; sonraki kayıtların korunur. Paket ilk kez mevcut dolu bir
profile açılırsa o profilin üzerine yazılmaz.

## Neler var?

- Hesap, profil, kurtarma kodları ve kullanıcı ayrımı.
- 199 branş / 26 ölçüm modeli; kaynaklarıyla branşa uygun analiz.
- Manuel dönem, yapılandırılmış set/interval/etap, gerçekleşen kayıt ve ilerleme incelemesi.
- Ortak tasarımla yenilenen ekranlar, beş ana bölüm ve aranabilir Araçlar paneli.
- Geçmiş tarihli kayıt, tarihle vardiya seçimi, hazır GLB beden modeli ve
  mevcut hareketlerden geçen zamana göre toparlanma tahminleri.
- Besin/su günlüğü, kişisel hedefler, ölçümler, fotoğraflar ve yedek araçları.
- Kaynak kod, otomatik testler, Python ve Node geliştirme çalışma ortamları.

Hesapların bilimsel kapsamı **SCIENCE_MODELS.md**, değişiklikler **REVISION_V2.md**,
geliştirme komutları **DEVELOPMENT.md** içindedir. Katalog kapsamı, bütün
dünya sporlarının her varyasyonunda klinik doğrulama anlamına gelmez.

## Kişisel veriler

`private-data/first-profile.alosbackup`: canlı MongoDB'deki doğrulanmış anlık kopya.
`private-data/original-backups/`: önceki yedeklerin, değiştirilmeden.
`.env` ve `private-data/original-server.env`: bağlantı ayarların.

Yeni kayıtların uygulama klasöründen ayrı olarak
`~/.athlete-life-os/private-edition/` içinde tutulur. Tam yedek almak için
uygulamayı durdurup bu klasörün tamamını kopyala. Uygulama içindeki tam yedek
görselleri de kapsar; hesap şifreleri ve oturumlar için veri klasörünü sakla.

## MongoDB

İlk açılış yerel SQLite kullanır; ağ bağlantısı uygulamayı açmanı engellemez.
Bu, bağlantı şifrenin veya MongoDB desteğinin kaldırıldığı anlamına gelmez.
Mevcut canlı `state_revisions` verileri bu teslim sırasında değiştirilmedi.

Hesaplı kayıtlarını MongoDB'ye geçirmek istediğinde uygulamayı kapat ve bu
klasörde Terminal aç. Önce kontrol et:

```
runtime/python/bin/python3 -B migrate_account_storage.py
```

Gösterilen hesapların uzak depoları boşsa aynı komutu `--apply` ile çalıştır.
Sonra `./START_LOCAL_MAC.command --backend mongodb` ile başlat. Bu kip
**http://127.0.0.1:10004** adresini kullanır; tarayıcıdaki yerel kayıt kuyruğu
ile bulut kayıt kuyruğu birbirine karışmaz. Geçiş aracı
mevcut farklı uzak verileri ezmez. Kimlikler ve fotoğraflar yerel sunucunun
veri klasöründe kalır; web barındırma bu paketin kapsamında değildir.

## Dosya bütünlüğü

`DOSYA_LISTESI.json` her dosyanın SHA-256 özetini taşır. ZIP yanında ayrıca
arşivin SHA-256 dosyası bulunur. Paket yedeği ilk aktarımda doğrulanır.
