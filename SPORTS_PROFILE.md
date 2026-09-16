# Spor profili ve çok branşlı kayıt

Bu modül `START_ACCOUNTS_MAC.command` ile açılan hesaplı sürümde çalışır.
Eski başlangıç dosyasının ekranları değişmez.

## Kullanım

1. Hesabına giriş yap. İlk kullanımda spor profili kendiliğinden açılır.
2. Branşlarını arayarak seç. Her biri için deneyimini ayrı belirt.
3. Hedeflerini, isteğe bağlı yöntem tercihlerini, her güne ayırabileceğin
   dakikayı ve eriştiğin ekipmanı seç. Bir günü 0 bırakmak o güne zaman
   ayırmadığını gösterir.
4. Özeti kontrol edip **Profili kaydet**. Mevcut antrenman dönemi ve vardiya
   kayıtları değişmez. **Profilim → Profili düzenle** ile geri dönebilirsin.

**Spor kütüphanesi** içinde ada, İngilizce bilinen ada veya spor ailesine
göre arama yapılır. Her branşın kayıt alanları görünür. Branşını bulamazsan
profil düzenleme ekranındaki **Branşımı bulamadım** bölümünden ad, aile ve
kayıt biçimi seçerek ekleyebilirsin. Bu tanım kendi hesabında saklanır.

**Branş seansı kaydet** bölümünde `10.09.2026` gibi bir geçmiş tarih
yazılabilir. Tarih, süre, isteğe bağlı zorluk, yöntem, not ve ilgili ölçümler
kaydedilir. Geçmişten **Düzenle** ile açılan kayıt, kaydedilene kadar değişmez.
Güncelleme kaydın kimliğini ve oluşturulma zamanını korur; önceki sürüm ayrıca
geçmişte tutulur. Profilinden bir branşı çıkarmak o branşın seanslarını silmez.

## Kapsam

Başlangıç kataloğu **199 branş/aktivite tanımı**, **15 aile** ve **18 yöntem**
içerir. Kuvvet, dayanıklılık/atletizm, su, takım, raket, dövüş, jimnastik,
doğa/tırmanış, kış/buz, hedef/hassasiyet, tekerlekli, binicilik, para/uyarlanmış,
zihin/elektronik ve geleneksel etkinlikler bulunur.

Bu liste bütün dünya sporlarının eksiksiz ansiklopedisi değildir. Alt
disiplinler ve varyasyonlar genişletilebilir; kişisel branş ekleme mevcut
liste dışında da kayıt tutulmasını sağlar. Her branşın mevcut desteği
**seans kaydı, açıklayıcı özet, ortak yük ve manuel plan takibi** olarak belirtilir.

Yedi kayıt biçimi:

| Biçim | Ek ölçümler |
| --- | --- |
| Genel | Süre, zorluk, yöntem ve not |
| Mesafe | km, aktif hareket dakikası, yükselti |
| Yüzme | metre, aktif yüzme dakikası, isteğe bağlı havuz uzunluğu |
| Deneme | deneme ve tamamlama sayısı |
| Hedef | deneme ve isabet sayısı |
| Raunt | çalışılan raunt sayısı |
| Maç / oyun | maç veya oyun sayısı |

Süre ve mesafe özetleri branş bazında gösterilir. Aktif süre girilmeden tempo
hesaplanmaz; toplam seans süresi dinlenme içerebilir. Yüzmede tempo dk/100 m,
diğer mesafe biçimlerinde dk/km gösterilir. İsabet ve tamamlama yüzdesi ancak
deneme sayısı da varsa hesaplanır. Bunlar girilen sayılardan yapılan aritmetik
özetlerdir; farklı parkur, rakip ve teknik koşullar otomatik eşitlenmez.

Kuvvet hareketlerinin set, yük ve RIR ayrıntıları mevcut **Antrenman →
Hareket ve set kaydı** bölümündedir. Branş seansları `sportSessions` içinde
saklanır; ortak seans motoru bunları hareket ve ek seanslarla birleştirir.
Aynı seansı iki yerde kaydettiğinde branş formundaki **Aynı seansın hareket
kaydı** alanından eşleştir. Eşleşme yalnız aynı tarihte ve tek kayıtla kurulur.
Eşleştirilmiş seans toplam süre/yükte bir kez sayılır.

Süre ve girilmiş 0–10 zorluk birlikte varsa AU = dakika × zorluk hesaplanır.
Eksik zorluk/süre tahmin edilmez. Zihin/e-spor ailesi fiziksel AU hesabına
katılmaz. Genel AU değeri kas hasarı, iyileşme oranı veya kaloriye çevrilmez.

Alt disiplin ve koşullar (zemin, parkur, havuz, ekipman vb.) formda ayrıca
saklanır. Aynı branş, alt disiplin ve koşullarla en az iki ölçüm varsa ortak
analizde ilk/son ölçüm farkı gösterilir. Tempo için mesafe de eşleşmelidir.
Kullanıcının yazdığı koşulların eşleşmesi bilimsel deney kontrolü değildir;
fark otomatik olarak antrenmanın başarısı sayılmaz.

**Plan → Yeni dönem oluştur** bütün katalog branşlarını haftalık plana
alabilir. Tarif ve ilerleme kuralı kullanıcı tarafından yazılır. Sistem
süre bütçesini, eksik tarif/ilerleme kurallarını ve dönem tarihini kontrol
eder. Önizleme planı değiştirmez; **İnceledim, ana plana al** gerekir.
Plan bağlantısı ile kaydedilen gerçekleşmeler dönem bazında izlenir.
Kayıt yokluğu başarısızlık/kaçırılmış seans diye yorumlanmaz. Son hafta
bir değerlendirme hatırlatması görünür; sonraki modeli kullanıcı seçer.

## Ortak veri ve koruma

- `athleteProfile`: branş deneyimleri, hedefler, yöntemler, ekipman ve
  Pazartesi–Pazar sıralı yedi günlük dakika tercihi.
- `customSports`: hesabın kişisel branş tanımları.
- `sportSessions`: tarihli branş kayıtları, ölçüm birimleri ve kullanıcı
  beyanı kaynak etiketi.
- `athleteProfileHistory` / `sportSessionHistory`: değişiklikten önceki
  sürümler.

Bu alanlar aynı hesap snapshot'ında SQLite veya MongoDB'ye gider; yeni ayrı
bir kullanıcı/veritabanı yetkisi açılmaz. Sunucu geçmiş sürüm denetimi ve
çakışma koruması geçerlidir. Taşınabilir yedek bunları içerir. Yedek
birleştirme seansları/tanımları kimlikle birleştirir ve değiştirilen eski
profili geçmişte saklar. Yalnız profil veya branş seansı içeren bir kayıt da
boş veritabanı sayılmaz.

`AthleteWorkspaceCore.snapshot(db,date)` ortak okuma sözleşmesidir:
günlük/haftalık seans, AU kapsamı, profil zamanı, manuel dönem, açıklamalı
kontroller ve koşulları eşleşen ölçümler. `AthleteCoordinator` bunu değişen
veriyle yeniler. Antrenman servis özeti, alternatif koç bağlamı ve beslenme
motoru aynı bağlamı okuyabilir. Beslenme motoru AU'dan kalori uydurmaz;
kas haritası yalnız mevcut hareket modelini kullanır.

`multisportPeriods` haftalık tarifleri, süre/RIR/dinlenme ve ilerleme
notlarını tutar. Eski `trainingPeriods` kuvvet reçeteleri ve kilitlenmiş
set oturumları değiştirilmez; onların ekranları ayrıntılı araçlarda kalır.
Bu iki kayıt türünün fizyolojik açıdan tek bir otomatik reçete motoruna
birleştirilmiş olduğu iddia edilmez.

## Kaynak ve doğrulama

Branş kapsamı için [IPC spor dizini](https://www.paralympic.org/sports),
[ARISF](https://arisf.sport/) ve
[IOC kış disiplinleri](https://support.olympics.com/hc/en-gb/articles/43002667811219-What-sports-are-in-the-Olympic-Winter-Games-Milano-Cortina-2026)
incelendi. Aileler ve kayıt biçimleri bu uygulamaya ait sınıflandırmalardır;
federasyon onayı veya fizyolojik model doğrulaması iddiası yoktur.

16 Eylül 2026 doğrulaması:

- Saf hesaplama testleri: katalog bütünlüğü, Türkçe arama, profil/doğrulama,
  geçmiş tarih, birimler, eksik aktif süre, geçersiz sayılar, düzenleme
  çakışması, profil geçmişi ve mevcut planın korunması.
- Gerçek Chrome: ilk kurulum, iptal, geçmiş yüzme kaydı, aynı kaydı
  güncelleme, kişisel branş, yeniden yükleme, mobil görünüm ve tam yedek.
- Hesap testleri: yeni alanların SQLite ve MongoDB sürücü taklidinde
  geri okunması ve kullanıcı ayrımının korunması.
- Mevcut kalıcı kayıt, sağlık/tarih, dönem ve yedek testleri.

Testler geçici hesap ve veritabanları kullanır; canlı Atlas verilerini taşımaz.

AU yöntemi için [seans RPE derlemesi](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2017.00612/full) incelendi. Bu kaynak tüm katalog branşlarına ayrı ayrı model doğrulaması sağlamaz.
