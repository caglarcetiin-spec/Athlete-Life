# Exposure model 1 — ürün model kartı

## Anlam

Çıktı ölçülmüş kas hasarı veya iyileşme yüzdesi değildir. Yalnız gerçek kayıtların kaslara atanan maruziyetini, tanımlı mühendislik varsayımlarıyla zaman içinde söndürür. Ağrı, genel öz-bildirim ve kas yükü ayrı görünür. ETA ve klinik olasılık üretilmez.

`remaining = Σ recorded_amount × muscle_coefficient × 2^(-elapsed_hours / half_life_hours)`.

- Kuvvet: ağırlıklı gerçek set; ek kg, vücut ağırlığı ve yardım ayrı ham alanlardır. Tonajla izometrik eşleştirme yok.
- İzometrik: ağırlıklı tutuş saniyesi.
- Beceri: ağırlıklı kayıtlı teknik deneme.
- Kardiyo/sprint: ağırlıklı çalışma saniyesi; hipertrofi setine dönüşüm yok.
- Devre: ağırlıklı dakika. Ek aktivitede süre × bildirilen seans eforu ayrı AU alanıdır; kas dağılımı bilinmiyorsa uydurulmaz.

Hareket katsayıları eski kütüphaneden birebir korunmuş **ürün varsayımlarıdır**. Otomatik isim benzerliği değil, normalize edilmiş açık kimlik/ad eşleşmesi uygulanır. Eşleşmeyen hareket veya eksik miktar görünür bir eksik kayıttır.

`exposure-1`: strength/isometric 36, skill/cardio 24, circuit 30 saat. `exposure-1-conservative`: 48/48/36/36/42 saat. Bunlar bireysel fizyolojiyle doğrulanmadı. Klinik anlamlı biyolojik yarılanma süresi olarak sunulmaz. Eski model sürümü kodda korunur; ham veri değiştirilmez.

## Zaman ve bağlam

- Saat biliniyorsa UTC instant; yalnız gün biliniyorsa yerel gün sınırlarından bir aralık. İçinde bulunulan güne ait belirsiz saatte alt sınır 0 olabilir. Import saati antrenman saati yapılmaz.
- Clock dışarıdan `as_of` olarak girer. Server saati authority'dir. UI dakika başına ve kayıt sürümü değişince yeniden ister; uygulamanın iki gün kapalı kalması hesabı dondurmaz.
- Aynı günün gelecekteki gerçek event'i veya daha ileri tarih hesapta yoktur.
- Uyku, kendi gece aralığı ve son iki günlük bağlamda gösterilir; çakışan aralıklar çift sayılmaz. Doğrulanmamış evrensel uyku/besin çarpanı **uygulanmaz**. Geç uyku kaydı ilgili bağlamı değiştirir; bütün geçmişi bugünün çarpanıyla değiştirmez.
- `as_known`: o anda change log'a ulaşmış sürümler. `recomputed`: bugünkü düzeltilmiş kayıtlarla geçmiş hesap. Restore öncesi bilgi zamanı arşivde tutulur; eski taşıma logu yeni hesap loguna sahte işlem olarak yazılmaz.
- `analysis.capture` değişmez karar, input revision/digest, lineage, model, as_of saklar. GET ve System Integrity kullanıcı verisine yazmaz.

## Program önerisi

`progression-advice-1` ana planı değiştirmez. Aynı hareket/varyasyon/ekipman/taraf/yükte, iki benzer seansta set sayısı/tekrar/RIR yeterliyse +%2,5 ek yük veya +1 tekrar incelenebilir. Bu adımlar koçluk varsayımıdır, kaynaktan alınmış kişisel eşik değildir. Teknik becerilerde kalite/önkoşul eksikse kuvvet kuralı uygulanmaz. Rahatsızlık/ağrı/yorgunlukta bir set ve %10 yük azaltma seçeneği yine açık varsayımdır; tıbbi dönüş izni değildir. Kullanıcı yeni plan sürümü oluşturup onaylar.

## Kalibrasyon ve kanıt

Kişisel kalibrasyon **kapalı**. Açılma kapısı: yeterli benzer en az 30 farklı gün, önceden tanımlı hedef çıktı, eksik-veri analizi, zaman sıralı en son %25 holdout, başlangıç modeline karşı raporlu hata/kalibrasyon karşılaştırması, biyolojik uzman incelemesi ve model sürümüyle geri dönüş. Bu sayılar da veri yeterliği için mühendislik kapısıdır. Mevcut sürüm bu koşulları sağlamış gibi kişiye öğrenilmiş model sunmaz.

Kanıt kayıtları `alos/evidence.py`: kaynak başlığı/DOI/PMID/popülasyon/erişim kapsamı/parametre/insan inceleme durumu. Hiçbiri uzman incelemesi yapılmış anlamındaki `reviewed` olarak işaretlenmedi. ACSM/IOC tam metni erişim engeli nedeniyle tam incelenmiş sayılmadı. Telifli metin kopyalanmadı.

## Testlerin anlamı

Clock injection, 0/6/12/24/48 saat üst sınırının artmaması, iki gün sonra yeniden hesap, eski bilgi zamanı, geç uyku, sprint adapter, duplicate aktivite, silinen set, immutable karar ve isolated Integrity sınanır. **Bu özellik testleri biyolojik doğrulama değildir.**
