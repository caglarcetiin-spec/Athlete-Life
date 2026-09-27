# Birleşik revizyon V2 — çalışma durumu

Kaynak: `prompts/REVISION_V2.md`. Dal: `codex/unified-revision-v2`, başlangıç `0da7c5e`. Üretim yayını ve gerçek veri geçişi bu görevde otomatik yapılmaz. Mevcut STATUS.md/LIVE_NAVIGATION.json yerel yayın kanıtları korunur.

## Sıra
S0 yeniden üretim → S1 kimlik, kayıt doğrulama, eşitleme, kapalı sağlık politikası → S2 hızlı seans, plan uyarlama, kapsam ve görünüm → S3 aktarım/PDF/yedek/izolasyon → S4 pilot hazırlığı.

## Gereksinimler
| Kimlik | Başlık | Durum / kanıt |
|---|---|---|
| R01 | Hareket kimliği ve katalog | Uygulandı — P kanonik hareket/alias; B serbest ve planlı seçici, M kalıcılık |
| R02 | Gerçek set ve ölçüm sözleşmesi | Uygulandı — P gerçek miktar/null/0 ve RIR önceliği; B gerçek kayıt |
| R03 | Kas analizi ve rapor tutarlılığı | Uygulandı — P dağılım/kapsam, B GLB olmadan rapor; endeks ölçüm değildir |
| R04 | Birim doğrulama ve düzenlenebilir hata | Uygulandı — B 180 cm; P sunucu semantiği; C düzenlenebilir ret |
| R05 | Eşitleme ve idempotency | Uygulandı — C kayıp ACK/ret/çatışma; P/M idempotency ve sahiplik |
| R06 | Profil ve plan oluşturma | Uygulandı — P profil/ekipman snapshot, B manuel plan; genel şablonun içerik sınırı açık |
| R07 | Açıklanabilir ilerleme ve plan sürümü | Uygulandı — P iki karşılaştırılabilir tamamlanmış seans; sayısal ilerleme kapalı, manuel sürüm açık |
| R08 | Ağrı ve hastalık politikası | Uygulandı — P sağlık uyarısı; sayısal klinik doz kapalı, içerik onayı yok |
| R09 | Beslenme ve tarif | Uygulandı — P bilinen makro/eksik sayı ve tarif snapshot; PDF örneği |
| R10 | Su uyku ve vardiya | Uygulandı — P gerçek/plan uyku, DST, vardiya penceresi ve komşu çakışması |
| R11 | Performans testleri ve ölçümler | Uygulandı — P Back Squat kg, protokol serisi ve tahlil operatörü |
| R12 | Hedefler ve günlük karar | Uygulandı — P hedef yüzde50/aşma/gerileme/eşit ve eski karar |
| R13 | Kullanıcı arayüzü ve mobil görevler | Uygulandı — B mobil giriş/düzelt/tamamla/rapor ve erişim kontrolleri |
| R14 | Karar geçmişi PDF ve yedek | Uygulandı — P/M değişmez karar ve yedek; PDF görsel kontrol |
| R15 | Eski veri geçişi | Uygulandı — P kuru çalışma/tekrar/rollback; M eski belge; üretim göçü yapılmadı |
| R16 | Yetkilendirme ve mahremiyet | Uygulandı — P/M iki sentetik sahip ile kayıt/rapor/PDF/yedek sınırları |
| R17 | Bilimsel açıklama ve kalite gözlemi | Uygulandı — docs/model-card.md; sınırlı mevcut bütünlük gözlemi; klinik doğrulama iddiası yok |
| R18 | Yayın adayı ve kapsam sınırı | Uygulandı — Yerel yayın adayı; üretim ayrı karar; release-readiness.md |
| R19 | Aktif seans ve hızlı set kaydı | Uygulandı — C karşılaştırılabilir geçmiş, B öncekini kullan set oluşturmaz |
| R20 | Set türleri ve sıralama | Uygulandı — P/M set semantiği; P superset düzenleme ve timestamp sayacı |
| R21 | Ekipman profilleri | Uygulandı — P sürümlü ekipman, geçmiş seans bağlamı değişmez |
| R22 | Açıklanabilir hareket alternatifleri | Uygulandı — P gerekçeli örüntü/ekipman filtresi; UI eski yükü temizler; sağlık iddiası yok |
| R23 | Zaman bütçesi ve plan önizlemesi | Uygulandı — P süre önizlemesi ve takvim; B gün taslağını taşıma; otomatik doz yok |
| R24 | Haftalık değerlendirme | Uygulandı — P materyalize plan paydası/gerçek sayı/kapsam; B rapor |
| R25 | Kısa ve işe yarayan geri bildirim | Uygulandı — P isteğe bağlı not/efor/süre; B 180 AU |
| R26 | Beslenme verisi kaynağı ve tekrar kullanılabilir öğün | Uygulandı — Kullanıcı/etiket beyanı ayrımı; P eski porsiyon snapshot ve bilinen toplam |
| R27 | Güvenli içe aktarma ve taşınabilirlik | Uygulandı — P genel CSV/atomik aktarım/hash/dedup/formül kaçışı; marka bağlayıcısı yok |
| R28 | Antrenörle gözden geçirilebilir rapor | Uygulandı — P/M ortak önizleme/PDF ve sağlık opt-in; B görünür seçim |
| R29 | Bilgi mimarisi ve özgün görsel sistem | Uygulandı — Beş mevcut odak gerekçeyle korundu; B modül tercihi/iki tema/genişlikler |
| R30 | Marka yapılandırması ve kapsam koruması | Uygulandı — C marka Login/logo; P PDF adı ve veri kimliğinin bağımsızlığı |

## Kabul testleri
| Kimlik | Senaryo | Sonuç / kanıt |
|---|---|---|
| AT01 | Kayıt ve yeniden giriş | Geçti — B: çıkış, cookie+IndexedDB temizleme, yeniden giriş; sunucu ID/profil korunur |
| AT02 | Serbest katalog hareketi | Geçti — P:3×10×60/RIR2,30 tekrar,1800 kg·tekrar; B kanonik seçim |
| AT03 | Türkçe ad ve varyasyon | Geçti — P Türkçe alias/kararsız varyasyon/null/0; B rapor kapsamı |
| AT04 | Plan üzerinden kayıt | Geçti — B plan→slot→gerçek barbell set; P manual_and_guided |
| AT05 | Bilinmeyen hareket | Geçti — P unmatched ve CSV özel hareket; gerekçe ve kayıt korunur |
| AT06 | Eksik plan | Geçti — B dokuz slot/tek gerçek set/tamamlama; sayı1 |
| AT07 | Tarih kararlılığı | Geçti — B seçili tarih değişse de seans2026-09-10 kalır |
| AT08 | Boy birimi | Geçti — B 180cm; P ölçüm birim doğrulaması |
| AT09 | Ondalık ve sınırlar | Geçti — P decimal_semantics/CSV_locale/lifestyle; istemci teknik sınırları |
| AT10 | Sunucu reddi | Geçti — C rejected draft, bağımsız kayıt, düzeltilmiş yeniden gönderim |
| AT11 | Tekrar gönderim | Geçti — C lost ACK tek operation; P/M idempotency/restart |
| AT12 | Sürüm çakışması | Geçti — C conflict resolve güncel sürümü kullanır; P/M stale-write reddi |
| AT13 | Profil aktarımı | Geçti — P profile_context/persisted health; B profil ve manuel plan; içerik sınırı açık |
| AT14 | İlerleme yeterliliği | Geçti (kapalı politika) — P complete/comparable ve eksik kayıt; sayısal artış açılmadı |
| AT15 | Öneri kabulü | Geçti (manuel sürüm yolu) — P program_version_retention; B taslak/aktivasyon; sayısal öneri kapalı |
| AT16 | Ağrı karşılaştırması | Geçti — P sağlık uyarısı ve before==after; otomatik azaltma kaldırıldı |
| AT17 | Sağlık belirsizliği | Geçti — P sağlık/döngü belirsizliği; klinik doz kapalı |
| AT18 | Besin hesabı | Geçti — P besin oranlama:150g→300kcal/15g protein |
| AT19 | Eksik makro | Geçti — P 400kcal/15g/bir eksik protein; PDF örneği |
| AT20 | Tarif sürümü | Geçti — P tarif/ingredient sürümü; sıfır pişmiş gram reddi |
| AT21 | Su | Geçti — P su toplamı; P/M idempotency |
| AT22 | Uyku | Geçti — P gece/future/overlap uyku ve DST yerel gün |
| AT23 | Vardiya | Geçti — P gece vardiyası, eksik pencere,15:00 ertesi gün ve komşu çakışması |
| AT24 | Seans RPE | Geçti — P ve B:1800sn×RPE6=180AU görünür |
| AT25 | Performans protokolü | Geçti — P Back Squat kg, ayrı protokol serisi ve eksik taraf |
| AT26 | Tahlil | Geçti — P tahlil operatörü/referansı; farklı birimler korunur |
| AT27 | Hedef | Geçti — P yüzde50/150/−50/null; eşit yeni hedef reddi |
| AT28 | Saklanan karar | Geçti — P/M historical_knowledge ve saved_model_provenance |
| AT29 | PDF | Geçti — PDF11 sayfa görsel inceleme; Türkçe/uzun tablo/sayısal değer; pdf-review.md |
| AT30 | Yedek dönüşü | Geçti (API/dosya ayrıştırma) — P/M tam yedek/ilişkili restore/tekrar; dosya seçici tarayıcı yolu ayrıca tekrarlanmadı |
| AT31 | Veri geçişi | Geçti — P dry-run/tekrar/lossless rollback; M eski belge; schema-check |
| AT32 | Mobil görev | Geçti (Chrome390×844) — B üç set/düzelt/tamamla/rapor; fiziksel telefon klavyesi saha kontrolü bekliyor |
| AT33 | Erişilebilirlik ve dayanıklılık | Geçti (otomatik kapsam) — B iki tema Axe/odak/GLB engelli rapor; ekran okuyucu pilotta |
| AT34 | Kullanıcı izolasyonu | Geçti — P/M iki sentetik sahibi ayıran kayıt/karar/PDF/yedek testleri |
| AT35 | Bütün akış | Geçti — B profil→plan→antrenman→ölçüm→rapor→çıkış/giriş; önbelleksiz kimlik kontrolü |
| AT36 | Önceki set | Geçti — C previousComparable; B60kg alan doldurma set sayısını artırmaz |
| AT37 | Set türleri | Geçti — P2ısınma+3çalışma, unknown korunur; B çalışma seti |
| AT38 | Superset | Geçti — P superset_edits:iki hareket/ayrı miktar/sıra düzenleme |
| AT39 | Dinlenme sayacı | Geçti (birim/API) — P timer_deadline ve edit/timer; arka plan tarayıcı saati ayrıca tekrarlanmadı |
| AT40 | Ekipman | Geçti — P ekipman uygunluğu ve frozen context; geçmiş sürüm değişmez |
| AT41 | Alternatif | Geçti (birim/kaynak) — P alternatif/boş aday; UI yük/yardım değerlerini temizler |
| AT42 | Ağrı ve tercih ayrımı | Geçti (birim/kaynak) — tercih filtresi ayrı, sağlık politikası kapalı; tedavi iddiası yok |
| AT43 | Süre önizlemesi | Geçti (hesap/sürüm API) — P3600→1764sn manuel taslak; özgün plan korunur |
| AT44 | Gün taşıma | Geçti — P takvim API/çakışma; B gün taşıma ve yazmadan geri çevirme |
| AT45 | Haftalık kapsam | Geçti — P5toplam/3kapsam/2gerekçeli dışlama; materyalize plan paydası açık |
| AT46 | Geri bildirim | Geçti — P isteğe bağlı not/feedback snapshot; B atlayarak bitirme ve sonra180AU |
| AT47 | Besin kaynağı | Geçti (hesap/kaynak) — kullanıcı/etiket beyanı, doğrulandı rozeti yok; eksik protein korunur |
| AT48 | Favori öğün | Geçti (API) — P kopya porsiyon/snapshot/tarif sürümü; ortak idempotency; favori pilotta gözlenecek |
| AT49 | CSV doğruluğu | Geçti — P CSV locale/kg/lb/boş/0/belirsiz tarih/hareket; genel eşleme |
| AT50 | CSV güvenliği | Geçti — P CSV atomic/dedup/owner/formula/oversize |
| AT51 | Marka bağlayıcısı iddiası | Geçti (kaynak incelemesi) — UI genel formatı açıklar; fixture olmadan marka desteği ilan edilmez |
| AT52 | Rapor kapsamı | Geçti — P/M owner+scope+digest; B sağlık opt-in; aynı bölüm üreticisi |
| AT53 | Modül tercihi | Geçti — P eksik-veri modül politikası; B gizleme ve kayıt ID korunması |
| AT54 | Duyarlı tasarım | Geçti (otomatik kapsam) — B360/390/768/1280,200% temel metin,iki tema Axe; fiziksel klavye pilotta |
| AT55 | Marka | Geçti (bileşen/API) — C marka adı/ifade/logo, P PDF adı/digest; üretim markası değişmedi |


## Kanıt anahtarı ve gerçek sonuçlar

- **P** PostgreSQL: `docs/evidence/stage-9/revision-v2-final-core.{json,log}` —82 geçti. Son rapor değişikliği `revision-v2-final-report` —29 geçti; son ek superset/CSV/süre kabulü `revision-v2-final-extras`. Kümeler örtüşür; benzersiz test sayısı diye toplanmaz.
- **M** MongoDB: `revision-v2-final-mongo` —100 geçti. Son rapor değişikliği `revision-v2-mongo-report` —2 geçti; eski belge `revision-v2-old-mongo` —1 geçti.
- **C** İstemci: `revision-v2-client` —19 test/6 dosya geçti. IndexedDB, ret, ACK, conflict, geçmiş set ve marka.
- **B** Chrome: `revision-v2-browser` komut logu ve `docs/evidence/revision-v2/browser.json`. Son koşunun gerçek ayrıntıları bu dosyalardadır. Kanıt JSON'ları kaynak hashleri, taban commit/dal, komut, ortam, süre ve exit code içerir.
- Derleme `revision-v2-build`; statik kontroller `revision-v2-lint`, `revision-v2-ruff`; şema `revision-v2-schema`. Ayrı 3B chunk boyutu uyarısı derleme hatası değildir.
- PDF: `revision-v2-pdf`, `docs/evidence/revision-v2/synthetic-report.pdf`, `pdf-check.json`, `pdf-review.md`.

## Aşamalar ve dış bağımlılıklar

S0 yeniden üretim ve S1–S3 uygulama/doğrulama tamamlandı. S4 hazırlığı `docs/pilot-readiness.md`; gerçek kullanıcı pilotu yapılmadı. Klinik/sayısal ilerleme içerik onayı yok, özellikler kapalı. Yeni kişiselleştirilmiş antrenör motoru iddiası yok: profil ve ekipman uygunluğu + sürümlü manuel düzenleme vardır. Otomatik tarayıcı kontrolleri fiziksel telefon klavyesi ve ekran okuyucu saha kontrolünün yerine geçmez.

Başarısız koşular `runs/` altında korunur. İlk çekirdek koşudaki eski tüm-makro ve otomatik %2,5 beklentileri şartnameye göre değişti. Eski vardiya testi önceki gerekçe metnine bağlıydı; eksik pencereyle saat üretmeme kontrolü korundu. Mongo fixture'ına date_only, superset testine tam ActualInput eklemek test kurulum düzeltmesidir. Gerçek koyu tema kontrast sorununun nedeni zemin geçişinin yazı renginden gecikmesiydi; secondary zemin renk gecikmesi kaldırıldı.

Üretim yayını ve gerçek veri göçü yapılmadı. Yayın/geri alma koşulları `docs/release-readiness.md`. Önceden mevcut STATUS.md/LIVE_NAVIGATION.json değişiklikleri korunur ve revizyon commit'ine alınmaz.
