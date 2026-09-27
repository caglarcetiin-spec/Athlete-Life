# Birleşik V2 model kartı

## Amaç ve sürümler

Kayıt yönetimi ve açıklanabilir betimleyici analiz. Yetişkin kuvvet/genel kondisyon ana kapsamdır. Çocuk, klinik rehabilitasyon, kesin onarım zamanı veya sakatlık olasılığı modeli değildir.

- Kimlik: `movement-catalog-2`, hesap revizyonu `unified-revision-2`.
- Zaman dağılımı: `exposure-1` / `exposure-1-conservative`.
- İkincil görselleştirme: `load-reserve-1`; eski API alan adları uyumluluk için korunur, arayüz bunları kayıt endeksi diye açıklar.
- Plan başlangıcı: `starter-heuristic-2`, devralınan genel şablon. Şablon metadata içerik onayı `null`.
- İlerleme: `progression-review-2`; klinik doz: `clinical-dose-disabled-1`. İkisi de sayısal değişiklik üretmeye kapalı.
- Takvim: `explicit-window-2`.

## Hesaplar ve eksik veri

| Hesap | Girdi / formül | Sınır |
|---|---|---|
| Gerçek dağılım | Gerçek set miktarı × katalog kas katsayısı; kuvvet set, izometri saniye, kardiyo saniye, beceri deneme, devre dakika | Modaliteler aynı birimde toplanmaz. Isınma dahildir ama ayrı sayılır. Bilinmeyen/kararsız hareket ve eksik miktar dışlama nedeni taşır. |
| Yük hacmi | Gerçek tekrar × harici kg | Toplam vücut yükü veya biyolojik etki değildir; null ile 0 ayrıdır. |
| Zaman temsili | Σ miktar × kas katsayısı × 2^(−saat/yarılanma) | Yarılanmalar 36/36/24/24/30 saat; konservatif 48/48/36/36/42. Devralınan mühendislik varsayımları. |
| Kuvvet kayıt endeksi | `100 × (1 − exp(−doz/8))`; doz=kas katkısı × clamp(sqrt(tekrar/10),.5,2) × efor × zaman faktörü | Efor RIR varsa clamp(1−.12×RIR,.35,1), yoksa RPE/10 aynı sınırda. İkisi birlikteyse RIR öncelikli ve uyarı. Eksik efor .35–1 aralığı. 8 ölçeği klinik eşik değil. |
| Seans yükü | saniye / 60 × kullanıcının seans RPE'si = AU | Set RIR/RPE'sinden türetilmez. Eksik süre/efor => null. 1800 sn × RPE6 =>180AU. |
| Beslenme | 100 g verisi × gram/100; tarif toplamı / son pişmiş gram × porsiyon | Alan bazında bilinen toplam + eksik öğün sayısı. Gün tamamlandı beyanı yeterlilik değildir. g↔ml varsayılmaz. |
| Hedef çizgisi | (güncel−başlangıç)/(hedef−başlangıç)×100 | Yüzde sınırlandırılmaz; gerileme negatif, aşma >100. Yeni başlangıç=hedef reddedilir; eski eşit veri yüzde null. Ölçüm yoksa null. Doğrusal çizgi biyolojik tahmin değil. |
| Uyku | Tamamlanmış gerçek UTC aralıklarının birleşimi | Gelecekte biten dışarıda; çakışmalar çift sayılmaz. Planlanan uyku ayrı. |
| Takvim | Kullanıcı uygunluğu ∩ vardiya/ulaşım/hazırlık dışında ∩ planlanan uyku dışında; seçili süre sığmalı | Eksik pencere => saat yok. Yerel gün/DST geçersizse açıklama. Otomatik kısaltma ve takvim değişikliği yok. |
| Süre önizlemesi | set uygulaması + setler arası dinlenme + hareket geçişi | Tekrar süresi/geçiş kullanıcı varsayımı; eksikse toplam null. Plan değişikliği manuel, onay yeni sürüm. |
| Performans | Aynı protokol, taraf, varyasyon, birim içinde seri | Eksik taraf simetri oluşturmaz; 100 kg ölçümü e1RM değildir. |
| Tahlil | Kaydedilmiş değer, operatör ve laboratuvar referansı | <15 kesin15 değil; farklı birim/laboratuvar otomatik klinik karşılaştırılmaz; tanı/doz yok. |

## Kaynak ve iddia ayrımı

Kas katsayıları devralınan katalog/app.js eşlemeleridir; ölçülmüş anatomik aktivasyon, hasar veya hipertrofi katsayısı değildir. Yeni kas katsayısı literatürden türetildi iddiası yoktur. Canonical Barbell Squat harici yük anlamı taşır; belirsiz “Squat” otomatik BW yapılmaz.

[Foster ve arkadaşları, 2001](https://pubmed.ncbi.nlm.nih.gov/11708692/) seans RPE temelli yük izlemesini inceler. Erişim kapsamı PubMed özeti; kişisel doku hasarı veya bu uygulamanın etkinliğini doğrulamaz. AU çarpımı regresyonla sınanır. Diğer devralınan kaynakların erişim ve inceleme kapsamı `apps/api/alos/evidence.py` içinde; kaynak adı uzman onayı değildir.

## Karar ve belirsizlik

İki karşılaştırılabilir tamamlanmış seansta tüm çalışma setleri/tekrar/RIR yeterli olduğunda yalnız inceleme bildirimi. Kullanılan/dışlanan kayıtlar ve nedenleri sunulur. Ekipman artış adımı ve içerik onayı olmadığından otomatik kilogram artışı yok. Ağrı, hastalık, kullanıcı toparlanma beyanı ve döngü günlüğü ayrı kayıtlardır; döngü fazı tek başına doz cezası yaratmaz. Sağlık verisi yokluğu güvenli antrenman izni değildir.

Aynı kas grubuna atanan 3B yüzeyler aynı grup endeksini gösterir; bağımsız anatomik ölçüm değildir. 3B yüklenmezse tablo/2B çalışır. Analiz `as_of`, tarih aralığı, kaynak sürümleri ve digest taşır. Kaydedilmiş karar değişmez; güncel hesap ayrı sonuçtur. Kişisel model kalibrasyonu kapalıdır.

## Gözlem ve doğrulama

Mevcut işlem bütünlüğü/health uçları ve sentetik kabul testleri kullanılır. Yeni üçüncü taraf analitik yoktur. Ham sağlık notu/parola/bağlantı dizeleri telemetriye eklenmez. Sentetik birim/entegrasyon/tarayıcı testleri yazılım sözleşmesini doğrular; saha faydası veya klinik doğruluk onayı sağlamaz. İnsan içerik incelemesi ve pilot: `pilot-readiness.md`.
