# Athlete Life OS 2.0 — Kabul ve regression matrisi

Bu sözleşme test tasarımıdır, başarı raporu değildir. Yeni ürün için bütün satırlar başlangıçta NOT RUN'dır. Her satıra test dosyası, CI/artefact yolu, commit, ortam, komut, exit code ve PASS/FAIL/BLOCKED/NOT RUN sonucu bağlanmalıdır. Kodda assertion bulunması veya test adının listelenmesi PASS değildir.

## A. Kalıcılık, eşitleme ve çatışma

| ID | Senaryo | Zorunlu sonuç |
|---|---|---|
| P-01 | Haftalık vardiyayı kaydet, server ACK al, tarayıcıyı kapat/aç. | Aynı tarih, vardiya değerleri ve entity version okunur. |
| P-02 | Optimize et, ACK al, process restart ve yeniden login. | Structured optimizasyon sonucu ve kullanıcı onayı korunur. |
| P-03 | İki cihaz aynı baseline'ı açar; A set ekler, B vardiya değiştirir. | İki değişiklik de kalır; B bütün eski state'i overwrite edemez. |
| P-04 | İki cihaz aynı vardiya saatini farklı düzenler. | Güvenli merge veya görünür 409/conflict; sessiz overwrite yok. |
| P-05 | Aynı set komutu yanıt kaybı nedeniyle on kez tekrar edilir. | Tek performed_set ve tek mantıksal domain etkisi oluşur. |
| P-06 | Aynı operation_id farklı payload ile gönderilir. | Açık uyuşmazlık hatası; eski işlem yanlış yeniden kullanılamaz. |
| P-07 | Yerel IndexedDB transaction sırasında quota/write hatası. | Sahte başarı yok; kullanıcı uyarılır ve girilmiş form verisi mümkün olduğunca korunur. |
| P-08 | Sunucu commit'ten hemen önce/sonra process öldürülür. | Önce: atomik rollback veya retry; sonra: kayıt okunur, tekrar duplicate yaratmaz. |
| P-09 | IndexedDB outbox'a yazıldıktan hemen sonra sekme kapanır. | Yeniden açıldığında pending işlem bulunur; ACK alınana dek silinmez. |
| P-10 | Eski request gecikir, yeni request başarır, eski response sonra gelir. | Ekran/sunucu yeni sürümü eskiyle değiştirmez; in-flight state doğru. |
| P-11 | Login süresi offline iken dolar. | Queue korunur, yeniden login sonrası aynı kullanıcıya uygulanır. |
| P-12 | Pending veri varken başka hesaba geçilir. | Önceki kullanıcı verisi görünmez/gönderilmez; veri koruma seçeneği açık. |
| P-13 | Bir kayıt silinir, eski offline cihaz bunu eski sürümle günceller. | Tombstone/conflict uygulanır; kayıt sessizce dirilmez. |
| P-14 | Yavaş ve ters commit sıralı iki transaction sırasında cursor pull. | Change log'da hiçbir committed değişiklik atlanmaz; snapshot/cursor tutarlı. |
| P-15 | API 500/401/timeout döner veya sunucuya erişilemez. | “Boş yeni hesap” kabul edilmez; default veri sunucuya yazılmaz; gerçek hata görünür. |

P-08 bir cihaz diskini fiziksel olarak kaybetme senaryosu değildir. Felaket kurtarma kapsamı B bölümündedir. Offline queue korunurken browser storage kullanıcının kendisi tarafından silinirse kurtarılamayabilecek kayıtlar ayrıca açıklanmalıdır.

## B. Zaman ve tarih

| ID | Senaryo | Zorunlu sonuç |
|---|---|---|
| T-01 | Europe/Istanbul'da 23:59 → 00:01, Bugün görünümü açık. | Yeni gün filtresi; eski antrenman/yemek/su DB'de kalır. |
| T-02 | Aynı sınırda geçmiş tarih bilinçli seçili. | Geçmiş bağlam korunur; “Bugüne dön” seçeneği görünür. |
| T-03 | Geçmişteki set bugün düzenlenir. | occurred_at eski, updated_at yeni; rapor doğru geçmişi günceller. |
| T-04 | 22:00–06:00 gece vardiyası. | Gerçek aralık doğru; süre negatif olmaz; gün gruplaması açık. |
| T-05 | Yaz/kış saati atlama/tekrarı olan test bölgesi. | Date-only plan ve UTC event dönüşümleri tutarlı; duplicate/gün kaybı yok. |
| T-06 | Cihaz saati 3 saat yanlış veya kullanıcı bölge değiştirir. | Server version authority korunur; geçmiş actual instant değişmez. |
| T-07 | Legacy yalnız gün içerir. | Import zamanı gerçek antrenman zamanı yapılmaz; time_precision işaretlenir. |
| T-08 | 23:45 başlayan seans 00:20 biter. | Tek session ID; set zamanları doğru; günlük rapor politikası tutarlı. |

## C. Program ve Runner

| ID | Senaryo | Zorunlu sonuç |
|---|---|---|
| W-01 | Haftalık kart, hazır antrenman ve Runner aynı günü açar. | Aynı prescription ID+version; sadece benzer metin yeterli değil. |
| W-02 | Önceki günün completed Runner'ı saklı, bugünün reçetesi seçili. | Eski seans bugünün yerine açılmaz; history korunur. |
| W-03 | Eski gerçek seans yarım kalmış, yeni tarih seçilir. | Doğru tarihli devam/başka seans seçenekleri; otomatik veri silme yok. |
| W-04 | Runner görüntülenir ama set başlamaz. | Timer/locked execution sahte başlamaz. |
| W-05 | İlk set başlarken optimizer reçete değiştirmeye çalışır. | Reçete kilidi atomik; gerçek seans sessiz değişmez. |
| W-06 | 4 set reçetenin ilk 2 seti manuel slot referansıyla kayıtlı. | Runner ilk eksik slottan başlar; toplam set duplicate olmaz. |
| W-07 | Aynı gün iki Pull seansı veya aynı adlı ring/bar varyasyonu. | Setler yanlış seans/varyasyonla eşlenmez. |
| W-08 | Ad hoc/extra set eklenir veya plan seti atlanır. | Extra yük dahil; skipped performed sayılmaz; plan katkısı açık. |
| W-09 | Timer sıfırlanır, pause/resume yapılır, telefon kilitlenir. | Gerçek setler korunur; süre timestamp/deadline ile geri kurulur. |
| W-10 | Geçmiş PR kaydı düzeltilir veya silinir. | PR/hacim/rapor dependency'leri yeniden hesaplanır; ham audit korunur. |
| W-11 | Readiness biraz değişir veya aynı girdiyle sayfa yenilenir. | Program kimliği/sırası rastgele değişmez; karar deterministik. |
| W-12 | Program block'u biter veya hareket varyasyonu ilerletilir. | Yeni sürüm/açıklama vardır; geçmiş progression silinmez. |

## D. Beslenme ve günlük veri

| ID | Senaryo | Zorunlu sonuç |
|---|---|---|
| N-01 | Gün hiç kaydedilmemiş, yalnız kahvaltı var veya tam gün onaylanmış. | not_logged/partial/complete birbirinden farklıdır. |
| N-02 | Protein/uyku/HRV yok. | UNKNOWN; sıfır ve kesin biyolojik ceza üretmez. |
| N-03 | Aynı su veya öğün retry ile iki kez gönderilir. | Tek kayıt; idempotency. |
| N-04 | Bir tarifin makroları sonradan değiştirilir. | Önceki consumption snapshot'ı sessiz değişmez. |
| N-05 | Türkçe `1,5`, gram/ml/kg girişi veya belirsiz format. | Güvenli normalize/validasyon; sessiz binlik/ondalık hatası yok. |
| N-06 | Vardiya kaydedilirken check-in kaydı eşzamanlı güncellenir. | Uyku/enerji/ağrı alanları vardiya komutuyla ezilmez. |

## E. Capability

| ID | Senaryo | Zorunlu sonuç |
|---|---|---|
| C-01 | Eski muscle-up ve ring kataloğu import edilir. | Tanımlar, aliases, ölçümler ve geçmiş erişilebilir. |
| C-02 | Balance, mobility, endurance ve work capacity kaydedilir. | Uygun protocol/unit/tarih/not ile gerçek API'ye yazılır. |
| C-03 | Tuck/full lever veya göz açık/kapalı denge kıyaslanır. | Farklı protokoller aynı PR serisine karışmaz. |
| C-04 | Test için bir taraf/deneme bilgisi eksik. | Türetilmiş simetri/score uydurulmaz; eksik gösterilir. |
| C-05 | Test sonucu silinir veya ölçüm birimi çevrilir. | Geçmiş, PR ve rapor dönüşümü semantik olarak doğru. |
| C-06 | Katalogda advanced rings var ama yeterlik verisi yok. | Sistem otomatik yüksek riskli beceri reçetesi üretmez. |

## F. Bilim, recovery ve raporlar

| ID | Senaryo | Zorunlu sonuç |
|---|---|---|
| R-01 | Aynı ham veri+as_of+model version ile yeniden hesap. | Deterministik aynı çıktı. |
| R-02 | Yeni yük/bağlam yokken 0/6/12/24/48 saat ilerlemesi. | Tasarlanan residual-load fonksiyonu artmaz; uygulama açık kalmasına bağlı değildir. |
| R-03 | Uygulama iki gün kapalı, sonra açılır. | Geçen gerçek zaman dikkate alınır; eski sabit kırmızı cache kullanılmaz. |
| R-04 | Sonradan eski geceye uyku kaydı eklenir. | İlgili aralık/derived metrics güncellenir; tüm tarihlere bugünkü çarpan uygulanmaz. |
| R-05 | Yarın bilinen bilgiyle dünün karar ekranı açılır. | “O zaman bilinen” ile “düzeltilmiş yeniden hesap” ayrıdır. |
| R-06 | Science model sürümü değiştirilir. | Ham kayıtlar değişmez; eski karar provenance'ı korunur. |
| R-07 | Sprint fixture'ı muscle/science/nutrition zincirinden geçer. | Doğru modalite alanları taşınır; başka test fixture'ı onu ezmez. |
| R-08 | Aynı aktivite iki entegrasyon veya ad hoc'ta bulunur. | Canonical eşleme/uyarıyla çift yük sayımı engellenir. |
| R-09 | Veri yetersiz veya model başarısız. | Sahte kesin skor/ETA yok; missing/confidence/error state. |
| R-10 | System Integrity butonuna basılır. | Sentetik/izole girdilerle çalışır; gerçek kullanıcı kayıtları değişmez. |

R-02 yalnız tanımlı basitleştirilmiş yazılım modelinin özelliğidir; gerçek biyolojik toparlanmanın doğrulandığı sonucu çıkarılamaz. Model geçerliliği için ayrıca spor bilimi incelemesi gerekir.

## G. Taşıma

| ID | Senaryo | Zorunlu sonuç |
|---|---|---|
| M-01 | Legacy örnek bütün domain ve bilinmeyen alanlar içerir. | Her alan mapped veya korunmuş/raporlanmış; sessiz discard yok. |
| M-02 | Aynı backup tekrar import edilir. | Duplicate yok; idempotent import. |
| M-03 | Geçerli görünen iki aynı hareket/aynı gün kaydı. | Stable identity yoksa kör duplicate silme yok. |
| M-04 | Import ortasında process/DB kesilir. | Atomik rollback veya tutarlı resumable staging; yarım aktif geçmiş yok. |
| M-05 | Eski week index var, kesin takvim tarihi yok. | Yanlış haftaya kendiliğinden atanmaz; belirsizlik ve çözüm yolu. |
| M-06 | Fotoğraf/reçete/set ilişkileri ve unknown alanlar roundtrip yapar. | Semantik eşitlik, count ve medya hash'leri doğrulanır. |
| M-07 | Yeni origin eski browser kayıtlarına erişmek ister. | Sahte otomatik erişim yok; açık export/import yolu. |
| M-08 | Legacy ve yeni sistem aynı anda yazmaya çalışır. | Tek yazıcı/cutover politikası korunur; split brain yok. |

## H. Yedek ve kurtarma

| ID | Senaryo | Zorunlu sonuç |
|---|---|---|
| B-01 | Kayıtlar değişirken tam export alınır. | Tutarlı snapshot ve manifest; yarım transaction yok. |
| B-02 | Pending offline mutasyon veya medya yüklemesi vardır. | Bunlar görünür ayrılır; eksik backup “tam ve sunucu onaylı” sayılmaz. |
| B-03 | Yedek boş izole DB'ye restore edilir. | Vardiya/antrenman/öğün/su/capability/medya UI'dan açılır. |
| B-04 | Bozuk checksum, desteklenmeyen schema veya eksik medya. | Kontrollü hata/karantina; mevcut DB ezilmez. |
| B-05 | Sahip olmadığı sporcunun export/restore isteği. | Yetki reddi ve veri izolasyonu. |
| B-06 | Felaket kurtarma tatbikatı yapılır. | Ölçülen RPO/RTO ve geri dönen kayıt sınırı belgeli; varsayım başarı sayılmaz. |

## I. Güvenlik

| ID | Senaryo | Zorunlu sonuç |
|---|---|---|
| S-01 | Anonymous veya başka kullanıcının kayıt ID'siyle tüm kaynaklara erişim. | API ve medya erişimi reddedilir; list/count/cursor sızıntısı yok. |
| S-02 | İstemci athlete_id değiştirir veya çapraz referans gönderir. | Server ownership ve DB referans kısıtları engeller. |
| S-03 | CSRF, oturum sabitleme, iptal edilmiş session ve login brute force. | Seçilen auth tasarımının korumaları testle doğrulanır. |
| S-04 | XSS içeren not/food name veya path traversal/zip bomb import. | Güvenli render ve sınırlandırılmış parser; kod çalışmaz. |
| S-05 | Log/health/export/media/CI artefact'ları incelenir. | Sırlar ve gereksiz kişisel bilgi sızmaz; export erişimi kontrollü. |
| S-06 | Account silme ve retention uygulanır. | Tombstone/audit/backup politikası tutarlı; kullanıcıya kalıcılık sınırları açıklanır. |

## J. UX ve PWA

| ID | Senaryo | Zorunlu sonuç |
|---|---|---|
| U-01 | Bütün route'lara mobil/desktop geçiş. | Yedek, sürpriz plan ve sync erişimi korunur; layout taşmaz. |
| U-02 | Keyboard/screen reader/reduced motion/büyük yazı. | Kritik kayıt yolları erişilebilir; renk tek anlam taşıyıcısı değil. |
| U-03 | Pending işlemler varken service worker/app update. | Veri/queue/active Runner kaybolmaz; uygun güncelleme akışı. |
| U-04 | PWA offline ve başka kullanıcıyla tekrar login. | Cache sahipliği ve private response politikası güvenli. |
| U-05 | 3B yüklenemez veya grafik hesap hatası oluşur. | Kayıt işlevi açık kalır, erişilebilir fallback/hata durumu vardır. |
| U-06 | Tüm legacy özellik envanteri karşılaştırılır. | Her özellik kanıtlı; kritik eksik varsa release engellenir. |

## K. Optional AI ve entegrasyon

| ID | Senaryo | Zorunlu sonuç |
|---|---|---|
| A-01 | LLM timeout/kapalı/limit aşımı. | Tüm çekirdek kayıt/Runner/rapor/backup yolları çalışır. |
| A-02 | Not veya dış belge, “veriyi gönder/sil” talimatı içerir. | Prompt injection araç yetkisini genişletemez. |
| A-03 | Model kullanıcı onayı olmadan plan değiştirmeye çalışır. | Proposed durumundan confirmed/apply'a geçemez. |
| A-04 | Sağlayıcı token/HealthKit native izin yolu yok. | Feature unconfigured; sahte başarılı entegrasyon gösterilmez. |

## L. Operasyon ve release

| ID | Senaryo | Zorunlu sonuç |
|---|---|---|
| O-01 | Build, container start ve 0.0.0.0:PORT sağlık kontrolü. | Gerçek artefact çalışır; README komutları bu yapıyla aynı. |
| O-02 | Production DATABASE_URL eksik veya DB erişilemez. | Güvenli fail-closed/readiness; SQLite/demo DB yaratılmaz. |
| O-03 | N/N-1 client ve schema migration/deploy overlap. | Uyumluluk veya açık güvenli red; eski istemci veri ezemez. |
| O-04 | Worker outbox işlerken process ölür/aynı job tekrar alınır. | Lease/idempotency ile tek mantıksal sonuç; kayıp job yok. |
| O-05 | Referans veri setiyle performans ve uzun oturum testi. | Donanım/yük belgeli; memory leak, UI blokajı, query patlaması araştırılır. |

## Test raporu şablonu

```text
Requirement ID:
Commit ve branch:
Fixture kaynağı (sentetik/anonim):
Ortam (DB/browser/cihaz):
Komut:
Exit code:
Beklenen:
Gözlenen:
Kanıt dosyası:
Sonuç: PASS | FAIL | BLOCKED | NOT RUN
Sınır / gerçek cihaz notu:
```

Kritik kapılar: kalıcılık ve güvenlik FAIL ise release NO-GO. Gerçek veri migration/restore denenmemişse bunun kapsam sınırı kullanıcıya bildirilmeden “veri kayıpsız taşındı” denmez. Kullanım testi ve bilimsel inceleme yazılım unit testinden ayrı sonuç verir.
