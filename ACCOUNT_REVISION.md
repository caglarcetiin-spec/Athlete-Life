# Athlete Life — hesaplı sürüm revizyon raporu

16 Eylül 2026. Bu rapor hesaplı yerel sürümde yapılan işi ve kalan sınırları
ayırır. Mevcut ana uygulama üzerinde çalışmaya devam eden diğer işlerden
bağımsız açılış: `START_ACCOUNTS_MAC.command`.

## Ürün kararı

Önce kullanıcıya **bugün ne yapacağını, nasıl kaydedeceğini ve neyin değiştiğini**
göster. Ayrıntıları ilgili bölümün altında aç. Aynı veri için ayrı ana
menüler ve bağımsız başarı puanları üretme. Kayıt, hesap ve öneriyi ayır.
Programı kullanıcı oluşturur ve açıkça etkinleştirir; analiz programı
sessizce değiştirmez.

Ana gezinme **Bugün / Plan / Antrenman / Beslenme / Gelişim** oldu.
Eski yinelenen alt gezinme kaldırıldı. On bir eski ekran aynı tasarım diline
taşındı; görev başlıkları, öncelikli formlar ve açılır ayrıntılar kullanılır.
Yinelenen rapor sekmeleri gizlendi. Araçlar araması tüm kayıt araçlarına erişir.
Mevcut hesap motorları korunur; sunum katmanı yenilenmiştir.

## Motorlar: işlev, verimlilik ve karar

| Motor grubu | İşlev ve şu anki kanıt | Karar / sınır |
| --- | --- | --- |
| Kimlik ve oturum | scrypt, tek kullanımlık kurtarma kodları, hesapla bağlı API/CSRF; iki hesap gerçek tarayıcı testi | Kullanıcı verisini sunucuda da ayır. Kimlikler tek sunucuda SQLite; ortak kimlik sağlayıcısı değil |
| Veri kalıcılığı | Kalıcı yerel kuyruk, sunucu sürümü, çakışma koruması, yedek; SQLite ve Mongo sürücü taklidi testleri | Sunucu revizyonu ile yerel ekran önbelleği revizyonunu karşılaştırma; boşta cihazlar gereksiz yazmasın |
| Profil ve kütüphane | 199 başlangıç branş/aktivite, 15 aile, 18 yöntem, kişisel branş; arama ve kurulum testi | Genişleme tanımlarla yapılır. Bir katalog girdisi, o sporun antrenörlük bilgisine tamamen hâkim bir model değildir |
| Ortak seans defteri | Branş + hareket + ek seans; açık kimlik eşleştirmesiyle tek sayım | Aynı gün iki kayıt olması otomatik eşitlik değildir. Kullanıcı eşleştirir; olası çakışma görünür |
| Yük özeti | Girilen süre × RPE; sıfır RPE ile eksik değer ayrılır | Yalnız açıklayıcı iç yük göstergesi. Kas hasarı, kalori veya sakatlık riski türetilmez. Zihin/e-spor fiziksel AU'ya katılmaz |
| Manuel dönem | Her katalog branşı, haftalık süre/tarif, yöntem, RIR, dinlenme ve ilerleme notu; önizleme/etkinleştirme testi | Tarih aralıkları çakışmaz. Etkinleşen dönem kütüphanede kalır. Yeni dönem kopyalanır; eskiler silinmez |
| Dönem takibi | Gerçek seans → dönem + çalışma + tarih bağlantısı | Kayıt yoksa doğrulanmamış sayılır. Seans kaydı tek başına bütün reçetenin eksiksiz uygulandığını göstermez |
| Branş gelişimi | Aynı branş/alt disiplin/koşul ve tempo için aynı mesafede ilk-son ölçüm karşılaştırması | Koşullar kullanıcı beyanıdır. Dönemler arasında biriken veri korunur; nedensel etkililik veya genel atlet puanı çıkarılmaz |
| Sağlık / toparlanma | Mevcut sağlık motoru ortak yorumlara katılır; eski hareket toparlanması geçen zamanı kullanır | Bunlar özbildirim ve model tahmini. Genel branş kayıtlarından kas bazında biyolojik iyileşme hesaplanmaz |
| Kuvvet reçetesi / set motoru | Yapılandırılmış dönem adımları, gerçek set kaydı ve mevcut hareket/toparlanma motorları bağlandı | Hedef değerler yapılmış set sayılmaz. Gerçek setler tek sayılır; kullanıcı ilerleme kuralı kendiliğinden uygulanmaz |
| Beslenme | Enerjiyle tutarlı kişisel makro hedefi ve kayıt defteri | Örnek kişinin hedefleri devralınmaz. Kullanıcı hedefleri açıkça belirler; AU'dan ek kalori uydurulmaz |
| Fotoğraf | Kullanıcıya bağlı sunucu/IndexedDB, ekleme/silme/geri alma, çevrimdışı tekrar; ikinci cihaz testi | Görsel karşılaştırma, vücut kompozisyonu ölçümü değil. Çakışmada kullanıcı seçimiyle iki kopya korunur |
| Koordinatör | Gerçek veri değişiminde ortak bağlam + eski motor yenilemesi | Özet, set servisinin bağlamı, alternatif solver ve beslenme aynı seans bağlamını okuyabilir. Tüm motorlar aynı fizyolojik kurala dönüştürülmedi |

Mevcut büyük uygulamanın fonksiyon/form/kural envanteri:
[SYSTEM_PARAMETER_INVENTORY.md](SYSTEM_PARAMETER_INVENTORY.md).
Bu tablo o envanterin üzerine eklenen ürün ve veri kararlarını açıklar.

## Kullanım hikâyesi

1. Hesap aç, branşlarını/hedeflerini/zamanını seç.
2. Plan'da yeni dönem aç. Haftaya branşlarını, çalışma tarifini, hedef RIR ve
   dinlenmeyi (uygunsa), ilerleme/hafifletme kuralını yaz.
3. İncele: süre bütçesi, boş tarif ve ilerleme kuralı, takvim çakışması.
   **İnceledim, ana plana al** ile etkinleştir.
4. Bugün'deki **Gerçekleşeni kaydet** çalışma bağlantısını hazır getirir.
   Geçmiş seans da girilebilir. Aynı seansın hareket kaydı varsa eşleştir.
5. Gelişim'de haftalık süre/yük, eksikler, yorumların dayanağı ve koşulları
   eşleşen ölçümleri gör. Sayısal “güven %” yerine hangi verinin bulunduğunu gör.
6. Dönemin son haftasında değerlendirme hatırlatması al. Yeni döneme kopyala
   veya baştan oluştur; geçmiş ve ölçümler kalır.
7. Hesabım'dan kurtarma kodlarını sakla. Fotoğraflar ikinci cihazda eşitlenir.

## Test yaklaşımı

- Saf hesaplama: kimlikle tek sayım, eksik/sıfır değer, tarihler, geçersiz
  bağlantı, dönem çakışması, önizleme, etkinleştirme, sonuç takibi, aynı
  koşulları eşleştirme, geçmişin korunması.
- HTTP / depolama: kullanıcı ve CSRF ayrımı, eski revizyon reddi, fotoğraf
  türü/boyut sınırı, silme işareti, tek kullanımlık kod, oturum iptali,
  HTTPS modunda Secure çerez/HSTS, özel dosyalara erişim reddi.
- Gerçek Chrome: profil oluşturma, iki hesap, eski sekme, manuel dönem,
  plan bağlantılı seans, sonraki dönem, yedek, yeniden yükleme, 390 px mobil,
  iki cihaz fotoğraf/silme/geri alma/çevrimdışı/çakışma, şifre kurtarma.
- Regresyon: mevcut motor, sağlık, tarih, toparlanma, kayıt ve yedek testleri.

Motor ve tarayıcı testleri örnek hesap ve geçici depolar kullanır. Özel teslim
ayrıca doğrulanmış canlı MongoDB kopyasını ilk yerel profile aktarır; canlı
veritabanı üzerinde yazma veya internet yayını yapılmadı.

## Kalan kapsam

**Yerel işlevsel sürüm**, bütün sporları bilimsel olarak doğrulanmış biçimde
çalıştıran evrensel antrenör modeli değildir. Her branşın teknik öğretimi,
federasyon kural güncelliği, kişiselleştirilmiş doz/progresyon ve sakatlık
sonrası dönüş kuralları için branş bazında kaynak ve uzman değerlendirmesi
gerekir. Kütüphane bunu genişletmeye uygundur, bugün tamamı mevcut değildir.

Ekranların ortak tasarımı, yapılandırılmış çalışma adımları ve yeni hesapların
kişisel hedef ayrımı tamamlandı. Katalogdaki 199 branş, 26 ölçüm modeliyle
işlenir. Tam kapsam ve kaynaklar [SCIENCE_MODELS.md](SCIENCE_MODELS.md),
son revizyon [REVISION_V2.md](REVISION_V2.md) içindedir. Eski motorlardaki
“güven” değerleri kalibre edilmiş olasılık veya klinik onay anlamına gelmez.

İnternet dağıtımı alan adı/sunucu bilgisi bekler. Hazırlanan HTTPS seçeneği ve
Caddy şablonu yayın yapılmış olduğu anlamına gelmez. Eski ekranların HTML/CSP
incelemesi, yük testi ve işletim/yedek geri dönüş provası geniş dağıtım öncesi
kalan yayın kapılarıdır: [deployment/README.md](deployment/README.md).

Kaynak: [Seans RPE yük izleme derlemesi](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2017.00612/full).
Bu derleme açıklayıcı yük hesabına dayanak sağlar; uygulamanın tüm branşlar
ve kullanıcılar için doğrulandığı sonucunu vermez.
