# Athlete Life — yerel uygulama

Paket tarihi: 16 Eylül 2026. Hesaplı yerel sürüm, kaynak kod ve hazır 3D
beden modeli birlikte gelir. Alan adı ve internet yayını gerekmez.

## Açılış

1. ZIP'i tamamen çıkar. Klasörü saklamak istediğin yere taşı.
2. Mac'te **START_MAC.command** veya **START_LOCAL_MAC.command** dosyasını çift tıkla.
3. Tarayıcıda açılan karşılama ekranında **Profil oluştur** seçeneğini kullan.
   Kullanıcı adını ve en az 15 karakterlik şifreni belirle.
4. Branşlarını, hedeflerini ve haftalık zamanını seç. **Hesabım** bölümünden
   kurtarma kodlarını oluşturup ayrı bir yerde sakla.

**Gereksinim:** Python 3.10 veya üzeri, scrypt desteği ve güncel tarayıcı.
Başlatıcı bilgisayardaki uygun Python'u arar; Python pakete dahil değildir.
Eksikse [Python'un resmi sitesinden](https://www.python.org/downloads/macos/)
macOS sürümünü yükle. Temiz yerel kurulumda başka Python paketi gerekmez.

Başlatıcı açılamazsa Terminal'de bu klasöre girip `python3 -B start_local.py`
çalıştır. Temiz kurulumun adresi **http://127.0.0.1:10002**. Kişisel yedek bulunan
kurulumda MongoDB adresi **http://127.0.0.1:10004**, SQLite adresi
**http://127.0.0.1:10003** olur. Terminal açık kalmalı;
kapatmak için Control+C kullan. Aynı adres zaten kullanımdaysa ikinci kopyayı
başlatma. `index.html` dosyasını doğrudan açmak hesaplı uygulamayı başlatmaz.

## Beş bölüm

- **Bugün:** planlanan çalışma, kayıt ve güncel özet.
- **Plan:** manuel dönem oluştur, analizini incele, onaylayarak plana al.
  Sonraki dönemi kopyalayabilir; geçmiş dönemleri koruyabilirsin.
- **Antrenman:** geçmiş tarih dahil seans kaydı, hareket/set araçları ve geçmiş.
- **Beslenme:** besin, su ve mevcut beslenme araçları.
- **Gelişim:** yük ve süre eğilimleri, veri eksikleri, ölçümler ve ayrıntılı raporlar.

199 başlangıç branşı/aktivitesi, 26 ölçüm modeli, 18 yöntem tanımı ve özel branş ekleme bulunur.
3D beden dosyası `assets` içindedir; her açılışta yeniden yüklemen gerekmez.

## Kayıtlar ve yedek

GitHub ve dağıtılabilir boş paket kişisel kayıt veya MongoDB şifresi içermez.
Yerel `private-data/first-profile.alosbackup` dosyası varsa bütünlüğü doğrulanır
ve ilk oluşturulan hesaba bir kez aktarılır. Sonraki hesaplar boş başlar;
mevcut dolu profilin üzerine paket yedeği yazılmaz.

Hesaplar, kayıtlar ve fotoğraflar Mac'te şu klasörde tutulur:
`~/.athlete-life-os/local-edition/`; kişisel yedekli kurulumda
`~/.athlete-life-os/private-edition/`. Uygulama klasörünü taşımak bunları silmez.
Tam yerel yedek için **uygulamayı durdurup bu veri klasörünün tamamını** kopyala.
Geri yükleme için yine kapalıyken, mevcut klasörün yedeğini alıp sakladığın
kopyayı aynı konuma yerleştir. İçerik şifrelenmiş bir arşiv değildir; özel tut.
Uygulama içindeki dışa aktarma hesap şifrelerinin ve oturumların yedeği değildir.

Arkadaşların ZIP ile kendi bilgisayarlarında ayrı hesaplar oluşturabilir.
Ortak sunucu kurulana kadar bu kurulumlar birbirleriyle eşitlenmez.

## İsteğe bağlı MongoDB

Yapılandırma yoksa uygulama SQLite kullanır. `.env` içinde MongoDB seçiliyse
kişisel yedekli kurulum dahil doğrudan MongoDB kullanılır. MongoDB erişim bilgileri kodda
ve tarayıcıda tutulmaz. Bağlantı için `.env.example` dosyasını `.env` adıyla
kopyala; kendi bağlantını ve veritabanını yaz, `STORAGE_BACKEND=mongodb` yap.
Uygun Python ortamında `python3 -m pip install -r requirements.txt` gerekir.
Atlas ağ erişimi ve kullanıcı yetkileri ayrıca yapılandırılmış olmalıdır.

MongoDB seçimi mevcut yerel kayıtları kendiliğinden taşımaz. Önce yedek ve
ayrı veri aktarımı gerekir. Hesaplı kayıtlar `account_state_revisions`
koleksiyonuna gider; eski tek kullanıcılı `state_revisions` ile aynı değildir.
Kimlik ve fotoğraf deposu varsayılan olarak yerel SQLite dosyalarıdır.
Hesap aktarımı sonrasında `ACCOUNT_STORAGE_BACKEND=mongodb` seçilirse
kimlikler, oturumlar ve fotoğraflar da MongoDB'de saklanır.
İnternet üzerinden kullanım için [Render kılavuzuna](deployment/RENDER.md) bak.
İlk profil yedeği, o açılışta seçili depoya aktarılır. MongoDB bağlantı hatasında
SQLite'a sessizce geçilmez. Eski `state_revisions` kayıtları korunur.

## Teslim kapsamı

Bu, çalıştırılabilir **yerel hesaplı sürümdür**. On bir eski ekran ortak
tasarıma taşındı; manuel dönemler yapılandırılmış hareket/set, interval ve
etap kaydıyla birleştirildi. Branşa uygun ölçümler kaynakları ve hesaplarıyla
gösterilir. Beslenme hedefleri kullanıcı tarafından belirlenir; kişisel
ölçüm/geçmiş yoksa başlangıç kuvvet yükü uydurulmaz.

Model kapsamı SCIENCE_MODELS.md, değişiklikler REVISION_V2.md içindedir.
Kütüphane girdileri her branş için klinik olarak doğrulanmış bir antrenör modeli değildir.
Kas toparlanması ekrandaki model tahminidir. Yük hesabının dayanağı ve eksik
veriler analizde gösterilir. Alan adı, barındırma ve internet yayını bu paketin
dışındadır. Arşivdeki `DOSYA_LISTESI.json` dosya bütünlüğü için SHA-256 içerir.
