## MongoDB desteği

Veri deposu artık yapılandırılabilir. Bağlantı ve mevcut veri aktarımı için [MongoDB kurulum kılavuzuna](MONGODB_SETUP.md) bakın. Bağlantı kurulana kadar SQLite varsayılan olarak çalışır.

# Athlete Life OS v9.0 — Ortak Plan ve Veri Koordinasyonu

Güncel mimari, doğrulama kapsamı ve geçiş adımları: [V9_ARCHITECTURE_REVIEW.md](V9_ARCHITECTURE_REVIEW.md).

Önce eski sürümden yedek al. Eski Terminal sunucusunu kapatıp bu klasörün başlatıcısını çalıştır. Aynı tarayıcıda `http://127.0.0.1:8765` adresini kullan; tarayıcı verilerini temizleme. Üstte v9.0 görünmelidir.

Bugünün planı ve Runner önizlemesi aynı reçeteyi gösterir. Telafi ayrı bir akıştır. Baştan başlatma artık gerçekleşmiş setleri silmez. Veriler değişince fizyoloji, plan, Runner ve raporlar ortak koordinatörle güncellenir.

Doğrulama: 24 JavaScript test dosyası, gerçek scriptlerle Node VM entegrasyon testi ve 2 Python başlatıcı testi. Gerçek tarayıcı görsel doğrulaması bu ortamda yapılamadı. Hesaplama modelleri klinik olarak doğrulanmış değildir; ayrıntılı sınırlar mimari rapordadır.

## Önceki sürümlerin tarihsel notları

Aşağıdaki v5–v8.2 notları tarihsel kayıttır; v9.0 raporuyla çelişen eski davranış açıklamaları güncel sürüm için geçerli değildir.

## Athlete Life OS v5 — Final Integrated Build

v5 unifies life scheduling, training planning, future forecasting, execution logging, progression, recovery, Character testing and muscle-stimulus reporting.

## Core loop
Plan → Adjust → Perform → Measure → Learn → Re-plan.

## Included
- Athlete Day lifecycle with configurable 00:00/02:00/04:00/05:00 boundary.
- Reconciliation of elapsed/missed days on next app open; while open, lifecycle checks every minute.
- Persistent 14-day future plan and explicit Tomorrow Coach.
- Date-based weekly shift schedule.
- Real 12-week cycle using Program Start Date.
- Plan version history (planned / adjusted / performed).
- Session completion feedback (session RPE, duration, notes).
- Set-level autoregulation suggestions.
- Muscle-specific recovery ledger and running/leg interference penalties.
- Joint/pain map used for training compatibility decisions.
- Goal engine for target bodyweight and adaptive calorie direction.
- Character manual tests + manual overrides + confidence levels + missing-test engine.
- Interactive front/back anatomy map with Daily / Weekly / Monthly training stimulus.
- Major muscle-region effective-set accounting using exercise-specific coefficients.
- Measured circumference change displayed separately from estimated training stimulus.
- PWA manifest/service worker for hosted use.

## Important interpretation
Muscle Stimulus % is a coaching/training-load index. It is **not** a direct measurement of muscle growth. Measured Growth uses entered circumference measurements and is also influenced by factors other than muscle tissue.

## Background behavior
A static browser app cannot reliably execute JavaScript at midnight while fully closed. v5 solves this by:
1. detecting day changes while the app is open, and
2. reconciling every elapsed day and rebuilding the future plan immediately when reopened.
If served over HTTP/HTTPS, the included PWA layer improves offline app behavior, but OS/browser background scheduling is still not guaranteed.


## v5.1 — Body Map Pro / 3D Anatomy Upgrade
- Reports > Muscle Growth / Stimulus Map bölümü tamamen yenilendi.
- Basit SVG insan görseli kaldırıldı.
- Yerine kullanıcı fotoğraflarına göre üretilmiş:
  - kişisel 3D referans model
  - detaylı 3D kas anatomisi görseli
  uygulamaya gömüldü.
- Tüm kas bölgeleri için anatomik seçim kartları eklendi.
- Kas kartları stimulus yoğunluğuna göre renklendirilir.
- Seçilen kas için stimulus, efektif set, recovery yükü, ölçülen değişim ve ana kaynak egzersizler detaylı gösterilir.


## v5.2 — Interactive 3D Heatmap / Hotspots
- 3D anatomik görsel üstüne doğrudan tıklanabilen hotspotlar eklendi.
- Hover tooltip ile kas adı, stimulus % ve efektif set gösterilir.
- Ön / Arka görünüm geçişi eklendi.
- Günlük / Haftalık / Aylık filtre artık doğrudan görsel üstündeki renklendirmeyi de değiştirir.
- Kas seçimi hem hotspotlardan hem sağ paneldeki kas kartlarından yapılabilir.

## v5.3 — Body Map Analytics
- Heatmap artık 4 moda sahiptir: Stimulus / Measured Growth / Recovery / Pain.
- Ön ve arka anatomik atlas ayrı crop görsellerle daha doğru hizalanmıştır.
- Her kas için birden fazla hotspot kullanılabilir; bilateral kas bölgeleri daha detaylı işaretlenir.
- Measured Growth yalnızca çevre ölçümü bulunan bölgelerde çalışır; doğrudan ve proxy ölçümler ayrılır.
- Recovery overlay kas bazlı 4 günlük yük ledger'ından toparlanma readiness'i üretir.
- Pain overlay günlük omuz/dirsek/bilek/bel/kalça/diz/ayak bileği girişlerini ilgili kas zincirlerine yansıtır.
- Seçili kas için zaman serisi grafiği eklendi. Grafik aktif heatmap moduna göre Stimulus, Growth, Recovery veya Pain trendini gösterir.

## v5.4 — Anatomically matched SVG body map
- Rectangular hotspot sistemi kaldırıldı.
- Kas bölgeleri artık atlas üstündeki renkli kas alanlarına daha yakın, çokgen SVG şekilleri ile çizilir.
- Ön ve arka görünüm için ayrı kas geometrileri eklendi.
- Overlay boyaması doğrudan bu anatomik SVG şekillerin içine uygulanır.
- Tıklama/hover davranışı korunur fakat geometri daha doğrudur.

## v5.4.1 Hotfix
- Etkileşimli 3D Anatomik Heatmap bölümünü durduran `overlayMetric` ve ilgili overlay yardımcı fonksiyonları geri eklendi.
- Stimulus / Measured Growth / Recovery / Pain katmanları tekrar çalışır hale getirildi.
- Service Worker cache anahtarı yenilendi.
- Eski cache'ler activate aşamasında otomatik temizlenir.
- Anatomik görseller offline cache listesine eklendi.

## v6 — Real GLB 3D Body Map
- Kullanıcının yüklediği gerçek `.glb` modeli doğrudan uygulamaya entegre edildi.
- Harici Three.js bağımlılığı yok; viewer saf WebGL2 ile çalışır.
- Model mouse/touch ile döndürülebilir ve zoom yapılabilir.
- Ön / Arka / Sol / Sağ kamera presetleri vardır.
- Kas bölgesi seçimi GPU picking ile gerçek 3D model yüzeyinden yapılır.
- Kas renklendirmesi fragment shader içinde gerçek model koordinatlarından hesaplanır; 2D görsel hotspot kullanılmaz.
- Stimulus / Measured Growth / Recovery / Pain overlay modları mevcut rapor motoruna bağlıdır.
- Seçilen kas sağdaki detay kartı ve trend grafiğiyle senkronize olur.
- GLB büyük olduğu için `START_MAC.command` veya `START_WINDOWS.bat` ile yerel sunucu üzerinden açılması önerilir.
- `file://` ile açılırsa kullanıcıya manuel GLB seçme fallback'i gösterilir.

## v6.1 — Precision 3D Selection
- Seçilen kas artık parlak cobalt/mavi yüzey olarak vurgulanır.
- Tıklanan noktada mavi pulse marker görünür.
- Kas sınırları bu GLB'nin gerçek koordinat aralığına göre yeniden kalibre edildi.
- Front/back ayrımı yalnızca derinliğe değil yüzey normaline de bakar.
- Bacak, pelvis, kol, omuz, göğüs, core ve sırt yükseklik sınırları modelin gerçek anatomik oranlarına göre değiştirildi.
- Belirsiz yan yüzeylerde yanlış kas seçmek yerine bazı noktalar bilinçli olarak unclassified bırakılır.

## v6.2 — Evidence-Weighted Science Trend Engine
- `science-library.json` eklendi: ACSM 2026 ve seçilmiş meta-analiz/sistematik derlemeler için dahili kanıt havuzu.
- Kas büyümesi iki ayrı kavrama ayrıldı:
  1. Expected Adaptation Trend: training stimulus + RIR/effective sets + protein + sleep + body-mass trend + recovery + pain + performance + concurrent-running context.
  2. Measured Growth: çevre ölçümlerinden gelen gerçek ölçüm değişimi.
- Model antrenman verisini doğrudan biyolojik büyüme yüzdesine çevirmiyor.
- Günlük veri stimulus/recovery için; anlamlı hipertrofi yorumu 4–8+ haftalık trendde yapılır.
- Bilimsel kanıtın vermediği birleşik ağırlıklar açıkça engineering heuristic olarak etiketlenir.

## v6.3 — Adaptive Intelligence + Late Session Router
- Gece yarısından sonra antrenman artık engellenmez. Gerçek timestamp, fizyolojik Athlete Day ve bağlı program günü ayrı tutulur.
- Varsayılan 00:00–04:00 seansı önceki takvim gününün planına bağlanır; cutoff 02/04/06 seçilebilir.
- Kaçırılan planlar sonradan “Telafi” olarak seçilebilir. Recovery yükü gerçek yapıldığı gün üzerinden, plan uyumu ise planlanan gün üzerinden izlenir.
- Personal Response Model, Stimulus/Fatigue Ratio, Plateau Detector, Deload Probability, Goal Conflict Engine, Testing Calendar eklendi.
- Sağ/sol kol-uyluk-baldır asimetri raporu eklendi.
- Measurement Scheduler ve kullanıcı ayarlı ölçüm gürültü/MDC eşiği eklendi.
- Science trend skoruna görünür belirsizlik bandı eklendi.
- Coach “Neden?” açıklaması eklendi.
- Photo Progress Check-in IndexedDB içinde sıkıştırılmış görsellerle saklanır.
- Evidence versioning mevcut science-library sürümüyle görünür.

## v6.4 — Record Manager / Edit / Delete / Undo
- Yeni `Kayıtlar` merkezi eklendi.
- Tarih seçerek geçmiş kayıtları düzenleme veya silme.
- Check-in/uyku/readiness/pain, antrenman, beslenme, su, vücut ölçümleri, session feedback, sosyal plan ve Character Test Lab desteklenir.
- Antrenman kaydında gerçek Athlete Day ve bağlı plan tarihi ayrı ayrı düzenlenebilir.
- Besin porsiyonu değişince kütüphane makroları yeniden hesaplar.
- Son 5 mutasyon için session bazlı Undo snapshot tutulur.
- Antrenman ve beslenme günlük listelerine doğrudan Düzenle / Sil butonları eklendi.
- Photo Progress kayıtlarına Sil eklendi.
- Düzeltme/silme sonrası Coach, future plans, reports, Body Map, Science Trend ve Adaptive Intelligence yeniden hesaplanır.

## v6.5 — Expanded Nutrition Library
- Dahili gıda kütüphanesi 99 standart besine genişletildi.
- Arama + kategori filtreleme eklendi.
- Her besinde enerji, protein, karbonhidrat, yağ, lif, şeker, sodyum, potasyum, kalsiyum, demir, magnezyum, çinko, C/D/B12 vitamini, folat, kafein ve su alanları tutulur.
- Besin eklendiğinde nutrient snapshot kayıt içine yazılır; böylece gelecekte kütüphane değişse bile geçmiş kayıt korunur.
- Eski kayıtların eksik makro/mikroları isim eşleşmesi varsa mevcut kütüphaneden geriye dönük tamamlanır.
- Günlük ekranda karbonhidrat, yağ, lif ve mikro besin özeti gösterilir.
- Mikro panel yetişkin genel referans değerlerle karşılaştırma sunar; tıbbi tanı veya eksiklik teşhisi değildir.
- Değerler generic/reference composition'dır; marka, tarif ve pişirme yöntemi sonucu değiştirebilir.
- Veri mimarisi USDA FoodData Central nutrient alanlarına paralel tutulmuştur; bundled library canlı API değildir.

## v6.6 — Adherence Guardian + Quick Navigation Fix
- Alt hızlı gezinme menüsünün çalışmama nedeni düzeltildi: menü artık app init'ten önce DOM'da ve ek olarak delegated click fallback kullanıyor.
- Yeni Adherence Guardian planlanan ve gerçekleşen uyku/uyanış, antrenman tamamlama, antrenman saati ve beslenme uyumunu ayrı değerlendirir.
- Program Adherence ile Adaptation Success ayrı tutulur.
- Geç uyanma ciddi önceki uyku borcunu kapatıyorsa "recovery-protective deviation" olarak işaretlenebilir: plan uyumu düşer fakat adaptasyon skoru gereksiz cezalandırılmaz.
- Büyük uyanış sapmasından sonra gelecek plan otomatik yeniden optimize edilir.
- Antrenman penceresi geçmesi, eksik session ve geç session için Guardian uyarıları vardır.
- Analytics ekranına 7/14/30 günlük Program Uyumu + Adaptasyon Başarısı trend grafiği eklendi.
- 7 günlük ve 30 günlük adherence ortalamaları ile akıllı sapma sayısı gösterilir.
- Kullanıcı sapma nedenini isteğe bağlı olarak Uyku Borcu / İş / Sosyal / Ağrı / Zaman / Enerji / Diğer şeklinde etiketleyebilir.
- Adherence skoru davranışsal operasyon skorudur; biyolojik adaptasyon veya sağlık tanısı değildir.

## v6.7 — Data Vault / Portable Backup
- Eski basit v5 JSON yedeği yerine versioned Data Vault eklendi.
- Full Backup: local app data + IndexedDB Photo Progress records.
- Data-only Backup: tüm yapılandırılmış kişisel data, fotoğraf hariç.
- Backup manifest: appVersion, schemaVersion, exportedAt, counts, timezone/device metadata.
- SHA-256 integrity hash destekleniyorsa export sırasında yazılır ve import sırasında doğrulanır.
- Legacy Athlete Life OS `{data: ...}` JSON ve raw database JSON dosyaları geriye dönük desteklenir.
- Import preview dosyayı değiştirmeden önce veri sayımlarını ve bütünlük durumunu gösterir.
- Merge mode ve Replace mode bulunur.
- Her import/restore işleminden önce otomatik local checkpoint oluşturulur.
- IndexedDB içinde en yeni 6 checkpoint tutulur.
- Kullanıcı manual checkpoint oluşturabilir, eski checkpoint'i restore veya silebilir.
- Normal `save()` çağrılarından sonra en fazla günde bir otomatik checkpoint planlanır.
- v6.7 ilk açılışında baseline checkpoint oluşturulur.
- Dış backup browser storage silinmesine karşı asıl taşınabilir güvence; local checkpoint yalnızca aynı origin/browser için ek güvenliktir.

## v6.8 — Gap Reconciliation / Offline-from-PC Training Recovery
- Mobil / internet senkronizasyonu bu sürümün kapsamına alınmadı.
- `kayıt yok = missed` mantığı kaldırıldı. Planlı geçmiş gün, kayıt yoksa `unverified` olur.
- Uygulama tekrar açıldığında Today ekranında `Eksik Günleri Tamamla` kartı görünür.
- Kullanıcı geçmiş planlı gün için:
  - Planı yaptım → Quick Backfill (orta veri güveni)
  - Değiştirerek yaptım / detay gir → Training ekranında gerçek set/reps/load ile historical entry
  - Dinlendim
  - Yapmadım → ancak bu seçimden sonra gerçek `missed`
  - Sonra → doğrulanmamış kalır
- Quick Backfill geçmiş güne approximate exercise rows yazar; plan completion yüzdesi, yaklaşık saat, süre ve session RPE alınabilir.
- Approximate backfill `dataConfidence=medium` taşır.
- Kas stimulus/recovery motorunda approximate veri %65 güven katsayısıyla kullanılır.
- Approximate backfill PR, exercise progression ve Character best performans hesaplarından dışlanır.
- Ayrıntılı historical entry `dataConfidence=high` olarak reconciliation kaydını kapatır.
- Legacy v6.7 `missed / kayıt yok` kayıtları, kullanıcı tarafından açıkça doğrulanmadıysa v6.8 ilk açılışında `unverified` durumuna migrate edilir.
- Weekly Plan görünümü `Doğrulanmamış`, `Kaçırıldı`, `Dinlenme seçildi`, `Tamamlandı · Backfill` durumlarını ayırır.
- Adherence Guardian doğrulanmamış geçmiş günü 0 puanla cezalandırmaz; explicit missed/rest kararı sonrası puanlar.
- Data Vault schema artık `gapReconciliation` kayıtlarını da taşır.

## v6.9 — Athlete Identity / Capability Engine
- Character ekranının üstüne Athlete Identity Engine eklendi.
- Capability Lab 4 veri grubu içerir: Calisthenics, Strength, Running, Power/Tests.
- Calisthenics kataloğu strict pull-up'tan full planche, front lever, one-arm pull-up, iron cross ve maltese'e kadar çok sayıda skill içerir.
- Statik hareketlerde saniye; dinamiklerde tekrar; weighted hareketlerde tekrar + ek yük kaydedilir.
- Strength bölümünde load + reps + bodyweight ile Epley estimated 1RM ve BW-normalized relative strength hesaplanır.
- Running bölümünde 1K/3K/5K/10K/HM/Marathon/custom mesafe + süre + pace kaydedilir.
- Power/Tests: vertical/CMJ, broad jump, 10m/30m sprint, Cooper, max pull-up/push-up, 5-min burpee.
- Her alan ayrı seviye üretir: Foundation, Developing, Intermediate, Advanced, Elite Skill Tier.
- "Elite Skill Tier" resmi elite athlete statüsü değildir; alan/hareket performans katmanıdır.
- Sporcu arketipi domain dağılımına göre hesaplanır: Balanced Hybrid, Skill-Dominant Calisthenics Hybrid, Relative Strength Specialist, Strength-Dominant, Endurance-Dominant Hybrid, Power-Speed vb.
- Denge İndeksi, Uzmanlaşma farkı, veri kapsamı ve confidence gösterilir.
- Legacy Character Test Lab verileri otomatik olarak Athlete Identity Engine'e kanıt olarak okunur; eski veriler kaybolmaz.
- Capability records geçmişi tutulur, düzenlenir/silinir ve Record Manager'a bağlanır.
- Data Vault capabilityRecords'ı merge/restore eder.
- `athlete-profile-library.json` bilimsel kaynak metadatasını ve şeffaf heuristic benchmark bantlarını taşır.
- Running/strength seviye bantları Athlete OS heuristics'tir; population percentile değildir.

## v7.0 — Nutrition Impact Engine
- Beslenme sayacı, performans/adaptasyon karar motoruna genişletildi.
- 14 günlük gerçek food-log ortalaması, 42 günlük kilo trendi, 56 günlük bel trendi ve son dönem antrenman performans trendini birlikte kullanır.
- Observed Nutrition State: Deficit/Cut, Maintenance/Recomp, Mild Surplus/Lean Gain, Rapid Gain/High Surplus.
- Hypertrophy Environment, Muscle Retention, Performance Fueling, Hydration, Micronutrient Coverage, Protein Adequacy, Under-fuelling Risk ve Phase Quality ayrı skorlanır.
- Cut / Gain / Recomp quality yalnızca tartıya değil bel ve performans trendine de bakar.
- Karbonhidrat hedefi mevcut koşu ve direnç antrenmanı yüküne göre 3–5 g/kg arasında context-dependent fueling reference olarak ölçeklenir; universal prescription değildir.
- Low-energy state, RED-S tanısı olarak sunulmaz. Gerçek energy availability için FFM ve exercise energy expenditure gerekir.
- Hydration skoru su kaydından gelir fakat sweat-rate olmadığı sürece gerçek dehydration yüzdesi olarak gösterilmez.
- Food-log micronutrients laboratuvar eksikliği teşhisi değildir.
- Kafein saatleri kayıtlıysa yatıştan 6 saat içindeki tüketimler uyku-risk sinyali olarak izlenir.
- Nutrition → Adaptation causal map eklendi.
- Primary Limiter sistemi en zayıf beslenme/adaptasyon alanını öne çıkarır.
- `nutrition-impact-evidence.json` bilimsel kaynak metadata + engine sınırlarını taşır.
- Kaynaklar: Morton 2018 protein meta-analysis, IOC RED-S 2023, Henselmans/King 2022 carbohydrate reviews, Helms 2023 energy-surplus trial, ACSM hydration position stand.
- Composite skorlar validated clinical equations değildir; transparent decision-support heuristics'tir.

## v7.1 — Rest Interval Engine
- Antrenman planı artık her hareket için önerilen set arası dinlenme hedefi ve kabul edilebilir bandı gösterir.
- Heavy strength (Weighted Pull-Up, Weighted Ring Dip, OHP, RDL) tipik olarak 150–300 sn bandı ve 180 sn hedef ile başlar.
- Advanced static skill (Full Planche, Front Lever) 150–240 sn; Back Lever 120–210 sn.
- Hypertrophy compound hareketler çoğunlukla 90–180 sn; accessory hareketler çoğunlukla 60–120 sn.
- Bunlar zorunlu sabit reçete değil, evidence-informed başlangıç heuristics'idir.
- Antrenman formuna planned rest + 1→2 / 2→3 / 3→4 / 4→5 gerçek dinlenme girişleri eklendi.
- Her training row `plannedRestSec` ve `restBetweenSets[]` saklar; Data Vault bunları trainingLogs içinde otomatik taşır.
- Training log gerçek ortalama rest ve planlanan rest'i gösterir.
- Record Manager geçmiş antrenmandaki rest sürelerini düzenleyebilir.
- Set arası countdown timer eklendi: Start/Pause, +30 sn, Reset.
- Session Rest Summary: rest verisi kapsamı, gerçek ortalama rest, önerilen alt bandın altında interval sayısı, toplam rest süresi.
- Live Autoregulation artık set performans düşüşü + kısa rest kombinasyonunda dinlenmeyi uzatma önerisi verir.
- Uzun rest otomatik olarak kötü sayılmaz; kaliteyi koruyorsa yalnızca seans süresi maliyeti olarak değerlendirilir.
- `rest-interval-evidence.json`: Grgic 2018 strength systematic review (PMID 28933024), Schoenfeld 2016 trial (PMID 26605807), Grgic 2017 hypertrophy review (PMID 28641044), Longo 2022 volume/rest study (PMID 35622106).

## v7.2 — Movement Intelligence + Gymnastics Rings
- Training entry is now movement-aware rather than name-only.
- Internal curated Movement Intelligence library: 40 high-priority movements plus automatic legacy fallback profiles.
- Extensive ring library added: Ring Support/RTO Support, Ring Dip, Ring Muscle-Up, Ring Pull/Chin-Up, Archer Pull-Up, Ring Row variants, Face Pull, Rear-Delt Row, Archer/RTO Push-Up, Chest Fly, Biceps Curl, Triceps Extension, Rollout, Body Saw, Ring L-Sit, Ring Front/Back Lever, Ring Handstand, Skin the Cat, German Hang, Ring Hamstring Curl, Ring Pike Compression.
- Equipment filter added to Training Entry; Rings can be isolated directly.
- Static movement input becomes `Hold 1 (sn)` etc. rather than generic repetition language.
- Training log stores `metricUnit`, `movementClass` and `knowledgeVersion` snapshots.
- Static dose no longer equals simple set count. Hold seconds are converted into bounded stimulus-equivalent units; very long holds are not allowed to inflate muscle stimulus linearly.
- Muscle-Up / Ring Muscle-Up are explicitly modeled as explosive mixed skill-strength-power movements.
- Movement preview shows contraction type, movement pattern, equipment, muscle stimulus weights, seven adaptation qualities and evidence confidence.
- Immediate Session Muscle Impact shows which muscles received the most weighted stimulus after each entry.
- Session Effect Signature shows Strength / Hypertrophy / Power / Skill / Stability / Core / Endurance character.
- Session Static Summary shows total isometric seconds, static holds, explosive sets and ring movements.
- Existing Body Map / Muscle Stimulus / Science Trend calculations now use the new static-duration-aware dose when the engine is loaded.
- Muscle weights are NOT EMG percentages and are NOT muscle-growth percentages; they are transparent internal stimulus contribution weights.
- Scientific metadata file `movement-science-evidence.json` includes:
  - Isometric systematic review PMID 30580468
  - Isometric vs dynamic meta-analysis PMID 40817007
  - Ring dip EMG PMID 36293792
  - Ring vs bar muscle-up EMG PMID 38288256
  - Unstable push-up muscle activation PMID 29541105
  - Static ring strength EMG/fatigue PMID 35323611
- Direct evidence and biomechanical inference are explicitly distinguished.

## v7.3 — Guided Workout Runner / Set Automation
- Session Router'da seçilen bugünkü, gece/telafi veya geçmiş plan doğrudan `Seçili Antrenmanı Başlat` ile çalıştırılabilir.
- `resolvedTemplate()` kullanılır; yani Coach'un readiness, pain ve volume modifier sonrası gerçek reçetesi runner'a aktarılır.
- Plan sırası, hareket sayısı, set sayısı, rep/hold aralığı, progression note ve hareket-bazlı Rest Interval Engine hedefleri otomatik yüklenir.
- Guided phase state machine: ready → work → result → rest → next set → exercise done → next exercise → complete.
- Active workout state `db.activeGuidedWorkout` içinde saklanır; sayfa yenilenirse çalışan work/rest timestamp'larından süre yeniden hesaplanır.
- Static movements: Start/Stop stopwatch hold saniyesini doğrudan sonuç olarak kaydeder ve rest fazını otomatik başlatır.
- Dynamic movements: Start/Stop aktif set süresini ölçer; kullanıcı actual reps/load/RIR girer, Enter veya `Seti Kaydet ve Dinlen` ile set kaydedilir ve rest otomatik başlar.
- Her exercise row artık guided session'da `setDurationsSec[]` ve `guidedTiming[]` metadata'sı taşıyabilir.
- Rest interval gerçek süresi, sıradaki sete basıldığı anda timestamp farkından otomatik kaydedilir. Kullanıcı target rest'e +30 sn ekleyebilir veya erken başlayabilir.
- Work-duration guidance movement-specific'tir: static hold plan aralığı, explosive/power, heavy strength ve hypertrophy setleri farklı quality windows kullanır.
- Work-duration quality window `optimal hypertrophy time-under-tension` gibi sunulmaz; planlanan rep/hold + movement identity tabanlı engineering guardrail'dir.
- Çok uzun set otomatik kötü sayılmaz; runner bunu cluster/rest-pause, yavaşlama veya timer geç durdurma olasılığı olarak işaretler ve not girişi ister.
- Rest süreleri önceki evidence-based Rest Interval Engine aralıklarından alınır; uzun rest kaliteyi koruyorsa ceza minimumdur, kısa rest performans düşüşüyle birlikte daha güçlü uyarı üretir.
- Set Timing Chart: her guided set için work/rest birleşik timing quality 0–100 görselleştirilir.
- Analytics: 28 günlük Set Timing Consistency trendi eklendi.
- Guided workout bitince kaydedilmiş setler korunur; duration otomatik doldurulur ve `Seansı Koça Gönder` mevcut Adaptive Coach completion/reoptimization akışını tetikler.
- Mevcut manuel `Hareket Ekle` sistemi korunur; Guided Runner ek bir çalışma modu olarak çalışır.

## v7.4 — Movement Variant Resolver / Equipment Categorization Fix
- Movement family and equipment variant are now separate concepts.
- `Front Lever` is the canonical Pull-Up Bar variant; `Ring Front Lever` is the Rings variant.
- The same exact split now applies to Tuck Front Lever, Straddle Front Lever, Back Lever, Muscle-Up, Pull-Up and Chin-Up families.
- Added missing `Ring Straddle Front Lever`.
- Equipment filters are exclusive for variant families: selecting Bar cannot show Ring Front Lever; selecting Jimnastik Halkaları cannot show bar Front Lever.
- In `Tüm ekipmanlar`, both variants remain available but are labeled explicitly, e.g. `Front Lever · Bar` and `Front Lever · Jimnastik Halkaları`.
- Training records now snapshot `executionEquipment`, so future analytics know which equipment was actually used.
- Old Front Lever records without `executionEquipment` remain valid; v7.4 infers their equipment from the movement name/knowledge library rather than rewriting history.
- Guided Workout Runner now displays the resolved equipment in the active movement header.
- Fixed old static-movement metadata where some hold bands had accidentally landed in the note field.

## v7.5 — Guided Workout Runner Rebuild
- Guided Runner state machine rebuilt instead of patched.
- `setIndex` is no longer trusted as the source of truth; the next set is derived from the number of actually persisted sets in `trainingLogs`.
- Fixes the first-set-only bug: Set 1 save -> rest -> Set 2 start -> Set 2 save -> rest -> Set 3, etc.
- Fixes invalid `NaN/NaN`/undefined progress by normalizing every prescription to a finite `setCount >= 1`.
- Added pure `guided-workout-core.js` with testable prescription parsing and row/state operations.
- Prescription parser accepts × / x, en/em dash, seconds/minutes/km units, e.g. `3×2–4`, `4×5–10 sn`.
- Existing v7.3/v7.4 active sessions are repaired on load from actual stored guided set rows.
- Each saved set is written atomically to `trainingLogs`, then the state advances from the stored row count.
- During REST the duplicate main `Seti Başlat` control is hidden. One action remains: `Set N'i Başlat`.
- Static holds auto-save stopwatch seconds when the set is stopped.
- Dynamic movements: stop timer -> enter reps/load/RIR -> Enter or Save -> row persisted -> rest starts.
- Real rest is written to the previous saved set when the next set begins.
- Queue now shows per-exercise `saved/total set` counts.
- Automation Summary shows total saved sets / total planned sets.
- Old incomplete active session data is migrated without discarding already recorded guided sets.

## v7.6 — Cross-Entry Reconciliation / Manual Log Auto-Sync
- Guided Runner no longer sees only rows carrying its own `guidedSessionId`.
- For the selected plan date it scans all `trainingLogs`: manual entries, adaptive historical entries, current guided rows and previous guided rows.
- Matching requires the same movement or the same Movement Variant family with compatible equipment.
- Example: `Front Lever · Bar` manual data completes the Bar Front Lever prescription; `Ring Front Lever` does not.
- The next set/exercise is derived from the total persisted performed sets across all matching rows.
- If Muscle-Up plan is 3 sets and 3 sets were manually logged before Runner starts, Muscle-Up is marked complete and Runner opens the next incomplete movement.
- If 2/4 Front Lever holds were entered manually, Runner resumes at Hold 3/4.
- Manual additions made while the Runner is open trigger `GuidedWorkout.syncFromLogs()` immediately; Record Manager edit/delete does the same.
- Queue displays source-aware progress: manual, previous runner and current runner set counts.
- Automation Summary displays `Elle algılanan`, `Önceki runner`, `Bu runner`.
- Guided saves use a local row index while preserving the global plan-set number, preventing sparse arrays when manual sets existed first.
- Rest is attached to the actual last set saved by the current Runner, even when earlier sets came from manual logs.
- Existing Data Vault backup already contains the source rows and active Runner state; no separate storage format is required.

## v7.7 — Pain / Joint Intelligence + Side-Specific 3D Hotspots
- Replaced the old one-number-per-joint pain grid with structured pain logs.
- Pain entry fields: date, joint/body region, left/right/bilateral/midline, severity 1–10, context, onset, sensation, days, trigger exercise, note and red-flag checkboxes.
- New regions: shoulder, elbow, wrist, hand, neck, upper back, low back, hip, knee, ankle and foot.
- `db.painLogs` is now actively used; Data Vault already backs it up and merges it by date.
- Active unresolved logs persist across days until marked `Düzeldi`, allowing Coach to remember an ongoing left-wrist or right-knee issue.
- Legacy daily pain fields remain readable for backwards compatibility but the v7.7 UI uses structured logs.
- 3D Pain overlay now includes side-specific joint hotspots projected onto the personalized GLB model.
- Example: `Sol El bileği 6/10` appears at the anatomical left wrist; bilateral entries create two hotspots.
- `3D'de Göster` navigates to Reports, switches to Pain overlay and focuses the selected hotspot.
- Hotspots move with 3D rotation/zoom because they are projected from model-space anchors on every draw.
- Muscle-chain Pain overlay still works; structured joint logs feed the existing muscle pain/recovery/science trend system.
- Movement-specific Joint Load Engine estimates joint demand from Movement Intelligence metadata and movement pattern.
- Coach recommendations distinguish low, moderate and high pain/load matches:
  - low: monitor; do not force progression if symptoms rise
  - moderate: reduce/modify volume/intensity and use pain-free range/variation
  - high or red-flag: do not force the joint-loading movement; assessment may be appropriate
- Red flags tracked: trauma onset, marked swelling, numbness/tingling, new weakness, instability, inability to bear weight/use the limb, and significant night/rest pain.
- These thresholds and joint-load scores are explicit safety/engineering guardrails, not diagnoses or validated personal injury equations.
- Record Manager now includes Pain / Joint records with edit, resolve and delete controls.

## v7.8 — Runner Integrity + Ad Hoc / Free Session Intelligence

### Guided Runner integrity
- Concrete UI corruption fixed: v7.7 index contained 105 literal `\n` escape sequences inside Guided Runner/History markup. v7.8 converts them to real line breaks.
- Guided scripts use `?v=7.8` cache-busting plus service-worker cache v7.8.
- `DATA OK / DATA N UYARI` badge exposes prescription/data integrity.
- Visible progress uses `safeProgress()`; invalid values display `—`, never `NaN/NaN`.
- Active exercise/set indexes are forced to finite integers during repair.
- Parser supports `3 set`, `4 hold`, `3 tur/round` in addition to `3×5`, `4×5–10 sn`.
- Ad hoc rows are never consumed as planned-set completion.

### Ad Hoc / Free Session Intelligence
- Program-outside sessions can be logged as Circuit, Continuous Circuit, Superset/Giant Set, Straight Sets, EMOM, AMRAP or For Time.
- Each session stores movement sequence, rounds, duration, session RPE, between-exercise rest and between-round rest.
- Example: Pull-Up → Push-Up → Squat, 5 rounds, zero exercise rest, 45 s round rest.
- Generates normal training rows so Muscle Map, Movement Intelligence, recovery ledger and future Coach planning see the work.
- Rows use `source:"ad_hoc"` and `planContribution:false`; therefore they do not falsely mark the scheduled workout complete or inflate Program Adherence.
- Analysis shows muscle stimulus, movement-quality signature, Work Capacity demand, Conditioning Demand, Recovery Cost and `duration × RPE` session-load AU.
- Density / conditioning / recovery scores are engineering decision-support heuristics, not VO2max, lactate, EPOC or calorie measurements.
- Saving an extra hard session rebuilds the future plan so the Coach can account for it on subsequent days.
- Data Vault backs up and merges `adHocSessions`.

## v7.9 — Coach ↔ Movement Catalog Integrity

- Fixed the concrete `Front Lever Pull / Raise` mismatch:
  - Coach prescription remains dynamic `3×4–8`
  - manual entry metric is now **repetitions**, never seconds
  - `Pull-Up Bar` variant is `Front Lever Pull / Raise`
  - `Rings` variant is `Ring Front Lever Pull / Raise`
  - both share one movement family but remain equipment-specific.
- Weighted Pull-Up explicitly remains `load + reps`; manual entry shows external load and repetition fields.
- Added a runtime Coach ↔ Manual Catalog audit badge to the Training Entry card.
- Every real exercise in the current Pull / Push / Legs / Run / Recovery templates now has explicit Movement Intelligence metadata (except `Hydration + Sleep`, which is intentionally a recovery action, not an exercise).
- Fixed several Coach movements that previously existed only in legacy muscle maps but lacked equipment/metric metadata, including:
  EZ-Bar Curl, DB Hammer Curl, OHP, DB Lateral Raise, Triceps Extension, Bulgarian Split Squat, RDL,
  Backpack/Goblet Squat, Single-Leg RDL, Calf Raise, Dragon Flag, Zone 2 Run, Mobility and Walk.
- Manual input now understands four primary result metrics:
  - static skill → seconds
  - dynamic/strength → repetitions
  - running distance → kilometres
  - mobility/walking duration → minutes
- Split the ambiguous `Planche Push-Up / Lean` concept:
  - Coach now prescribes `Planche Push-Up` as repetitions
  - `Planche Lean` is a separate seconds-based static movement
  - legacy combined records remain readable but are hidden from new manual selection.
- Added `Bodyweight Squat` so a bodyweight circuit is not misclassified as loaded/barbell `Squat`.
- Equipment filtering now has explicit metadata for Coach exercises instead of silently dropping movements whose equipment was undefined.

## v7.10 — System Integrity / Engine Mesh Validation
- Added a non-destructive **System Integrity / Engine Mesh Test** card under Settings.
- The in-app test temporarily swaps to a sandbox DB, runs cross-engine contracts, restores the real in-memory DB and restores the portable localStorage snapshot.
- Final build result: **65/65 built-in engine tests PASS** plus **18/18 headless browser E2E flows PASS**, **0 runtime exceptions** in the tested flows.
- Fixed ad-hoc-only sessions falsely marking planned days complete; lifecycle now distinguishes `hadTraining` from `hadPlanTraining` and uses `extra_training`.
- Fixed a real Movement Intelligence runtime crash (`const den` accumulator) discovered by E2E Guided/Ad-Hoc rendering.
- Expanded Data Vault merge/normalize coverage for lifecycle, guided history, adaptive model, runs, photo progress and generated week plan.
- Added diagnostic exports for Backup Vault, Adherence Guardian, Ad Hoc Session and BodyMap3D to support future regression testing.
- Full details are in `SYSTEM_INTEGRITY_REPORT.md`.


## v7.11 — Partial Autoregulation / Early Session Closure
- A planned exercise no longer has to reach every prescribed set before the Runner can advance.
- After at least one set is saved and the movement is still below the planned set count, a new `Hareketi Burada Bitir → Sonraki Harekete Geç` action appears.
- The user selects a reason: fatigue/readiness, performance drop, technique/form, pain, time constraint, or other.
- Per-exercise closure is stored in `exerciseClosures` with planned sets, performed sets, completion %, reason and timestamp.
- The Runner's next-progress algorithm treats explicit partial/skipped movements as resolved for navigation while keeping them incomplete for adherence/load analysis.
- `Bu Hareketi Atla` was also repaired to actually advance instead of being rediscovered as the first incomplete exercise.
- `Antrenmanı Bitir` is valid at any completion level. Saved sets remain in `trainingLogs`; remaining work is recorded as unperformed rather than lost.
- Session closure stores planned set count, performed set count and set-level completion percentage.
- Adaptive session feedback now stores `completionPct`, `completionStatus`, planned/performed set counts, partial exercises, skipped exercises and closure reason.
- A partial same-day session closes Lifecycle as `modified`, not falsely `completed` and not `unverified`.
- Adherence now prefers set-level completion percentage. Example: 2 of 5 sets is partial load, not 100% completion merely because the movement name exists.
- Future-plan rebuilding is explicitly triggered with `partial session autoregulation` after a partial session is sent to Coach.
- System Integrity adds tests for `2/5 -> close movement -> next exercise`, set-level completion math, and partial Lifecycle closure.


## v7.12 — Movement Substitution Intelligence
- A different manual movement is no longer silently treated as the planned movement.
- If Guided Runner expects one movement but finds an unmatched manual movement for the same plan day, it opens a substitution decision card.
- Choices:
  - `Yerine Say → Sonraki Harekete Geç`: closes the planned slot as `substituted` and advances.
  - `Ekstra Olarak Tut · Planı Değiştirme`: preserves the movement as real training load but does not complete/replace the planned slot.
- Movement substitution similarity uses three transparent dimensions: weighted muscle-map overlap (50%), movement-pattern similarity (35%), and Strength/Hypertrophy/Power/Skill/Stability/Core/Endurance profile similarity (15%).
- Push-vs-pull replacements are explicitly treated as low fit. Example: Ring Row (horizontal pull) → Ring Dip (vertical push) is not physiologically equivalent even though both use rings.
- Accepted substitutions still advance the Runner because the athlete intentionally modified the plan, but Program Adherence receives similarity-weighted `planFidelityPct` rather than fake 100% credit.
- Actual training analysis always uses the movement actually performed. A Ring Dip replacement adds Ring Dip chest/triceps/front-delt/stability stimulus and recovery cost; it does not fabricate Ring Row lat/upper-back stimulus.
- Session completion now distinguishes `execution coverage`, `exact completion`, and `plan fidelity`.
- Adaptive session feedback stores substitution details and future Coach optimization uses actual logged training load.

## v7.13 — Unified Physiological Impact Mesh
- Ad Hoc sessions now produce movement-specific physiological demand snapshots, not only generic density/work-capacity scores.
- Sprint and Hill Sprint are explicit seconds-based work bouts; duration × rounds × rest × session RPE are analyzed together.
- Optional metres per sprint improves speed-exposure confidence and allows total sprint distance / average bout speed context.
- Sprint outputs: phosphagen demand, glycolytic demand, aerobic demand, neuromuscular/power demand, speed exposure, repeated-sprint demand, metabolic demand, lower-body mechanical demand, high-speed exposure seconds, recovery cost and confidence.
- These are 0–100 decision-support indices, not measured ATP-PCr percentages, lactate, VO2, calories or injury probability.
- Shared `AthleteLoadMesh` is consumed by Ad Hoc analysis, future Coach day scoring, Science interference, Nutrition fueling/hydration context, Adaptive goal-conflict warnings, Muscle Map/Recovery via trainingLogs, and Athlete Identity as non-scoring training-exposure context.
- Capability/Identity scores remain test-based; a hard sprint session does not falsely become a sprint PR.
- Sprint/interval seconds no longer use the static-hold dose model.
- System Integrity now includes Sprint → Ad Hoc → Load Mesh → Muscle Map → Science → Nutrition contracts.


## v7.14 — Universal Training Intelligence + Load Prescription



All performed training must enter one shared physiological analysis mesh regardless of how it was logged:

- planned Coach session
- Guided Workout Runner
- manual training entry
- substituted movement
- partial session
- Ad Hoc / free session

The exact movement performed remains the source of truth. A substituted Ring Dip never creates fake Ring Row stimulus.

## Movement-specific routing

Every curated movement is automatically routed to one of these models:

1. `static_isometric`
   - Front Lever, Planche, Back Lever and other static holds.
   - Uses hold seconds, hold distribution, rest, RIR and movement strength/skill/stability profile.

2. `loaded_dynamic`
   - Weighted Pull-Up, DB Hammer Curl, RDL, OHP, weighted lower-body/accessory work.
   - Uses load, repetitions, set count, RIR, rest, relative external load and movement profile.

3. `explosive_skill`
   - Muscle-Up and other high-power/high-skill dynamic movements.
   - Uses repetitions, rest quality, RIR/RPE, power and skill profile.

4. `bodyweight_dynamic`
   - Ring Row, Push-Up, Bodyweight Squat and similar dynamic bodyweight work.
   - Uses reps, RIR, rest/density and movement profile.

5. `sprint`
   - Sprint / Hill Sprint.
   - Uses bout seconds, rounds, rest, session RPE and optional distance.

6. `interval`
   - Intervals / VO2 intervals.
   - Uses work seconds, work:rest, accumulated duration and RPE.

7. `continuous_aerobic`
   - Zone 2 / Tempo / Threshold / Long Run.
   - Uses time or distance, RPE and running mode.

8. `mobility_recovery`
   - Mobility / low-cost recovery work.

## Common output contract

Every model returns the same common fields so all downstream engines can read it:

- muscle stimulus
- mechanical demand
- metabolic demand
- neural demand
- skill demand
- cardiovascular demand
- stability demand
- joint-load profile
- local muscle recovery cost
- global recovery cost
- ATP-PCr / glycolytic / aerobic demand indices
- strength / hypertrophy / power / skill / work-capacity adaptation indices
- confidence

These are decision-support indices, not measured biological percentages.

## Cross-engine data flow

`trainingLogs`
→ `AthleteLoadMesh`
→ Muscle Stimulus / 3D Body Map
→ Recovery
→ Science Trend
→ Coach systemic penalty
→ Nutrition load context
→ Adaptive goal-conflict engine
→ Athlete Identity training-exposure context
→ Analytics Universal Training Mesh

`AthleteLoadMesh.rolling()` now reads ALL real training rows, not only Ad Hoc sessions.

## Load Prescription Engine

Coach prescriptions now include load when the movement requires an external load.

Priority:

1. same-movement personal history
2. capability/character anchor
3. explicit template anchor
4. conservative bodyweight/profile baseline

Examples at a 72 kg bodyweight with no same-movement history:

- DB Hammer Curl 2×10–15 → approximately **8 kg / dumbbell** starting recommendation.
- If 8 kg is completed at 15/15 with RIR 2, next recommendation → **10 kg / dumbbell**.
- Weighted Pull-Up template anchor `+35 kg` remains a higher-priority personalized program anchor.

Readiness can reduce the recommendation, and Pain Intelligence can suppress it.

## Persistence

Manual, Adaptive and Guided set writes receive a `physiologySnapshot`.
Session completion re-stamps the day after final duration and session-RPE are known.
Record Manager mutations re-stamp affected training data.

## Verification

Automated validation in v7.14 includes:

- all 70 curated movement records produce a valid physiological model and finite common demand outputs
- every weighted movement currently present in the Coach templates has a load-prescription profile
- DB Hammer Curl baseline and history-based progression tests
- Front Lever / Weighted Pull-Up / Muscle-Up / Ring Row / Sprint / Zone 2 / Mobility model routing tests
- all-session rolling mesh test
- physiology snapshot test
- JavaScript syntax validation across all affected engines

## Limits

The system does not claim exact:
- lactate
- VO2
- calories
- ATP-PCr percentage
- tendon force
- joint force
- injury probability
- 1RM without an appropriate performance test

The mesh is a transparent coaching and load-management system built from the athlete's recorded training plus movement-specific heuristics.


### v7.14 validation summary
- 31/31 JavaScript files passed syntax validation.
- 5/5 Node test files passed.
- 70/70 curated movement records produced valid universal physiology outputs.
- 12/12 externally loaded Coach movements have load-prescription profiles.
- DB Hammer Curl baseline/progression test: 8 kg/dumbbell → 10 kg/dumbbell after 15/15 @ RIR 2.
- Package structural checks: 0 duplicate HTML ids, 0 missing script files, 0 missing Service Worker core files, 0 literal `\n` UI corruption sequences.
- Full fresh browser click-through/WebGL/offline-PWA smoke testing was not executed in this environment.


## v7.15 — Health State + Periodic Trend + Nutrition Ledger



Daily check-in now stores:
- health status: normal / fatigued / mild illness / sick / recovering
- fatigue 0–10
- illness severity 0–10
- fever, cough, sore throat, headache, GI symptoms, dizziness, chest/breathing flag
- health note

`HealthStateEngine` feeds:
- Readiness
- Coach session type
- training volume/intensity modifier
- deload probability
- Coach explanation

High illness or red-flag entries suppress hard-training recommendations rather than diagnosing a condition.

## Periodic performance analysis

`PeriodicTrendEngine` provides:
- weekly comparison: recent 7 days vs previous 7
- monthly comparison: recent 28 days vs previous 28
- 12-week view: recent 6 weeks vs previous 6 weeks

States:
- Rising
- Plateau candidate
- Declining
- Stable
- Insufficient data

The engine compares same-movement performance. High-density Ad Hoc circuit rows are not used as primary plateau benchmarks because they are not directly comparable to quality strength/skill sessions.

Illness/fatigue days and readiness change are added to the interpretation, so a temporary illness-related performance drop is not automatically treated as true long-term capacity loss.

## Nutrition ledger bug fix

Food entry no longer mutates the existing day array in place. `NutritionLedger.append()` creates an additive day ledger.

Verified scenario:
1. Add Maden suyu
2. Add Köfte
3. Day ledger contains **both records**
4. JSON persistence preserves both records
5. Nutrient totals retain water/calcium from mineral water and calories/protein/iron from meatballs

Every new food log stores a full nutrient snapshot with:
- unique log id
- food id/name/category/serving
- serving multiplier
- kcal/protein/carbohydrate/fat
- fiber/sugar
- sodium/potassium/calcium/iron/magnesium/zinc
- vitamin C/D/B12/folate
- caffeine/water
- source / precision / timestamp

Historical rows are repaired by backfilling missing nutrient fields without deleting existing entries.

## Expanded food library

Nutrition library now contains **149 foods and drinks**.

Added examples include:
- Şeftali, nectarine, pear, cherries, sour cherry, fresh apricot, plum, melon, pomegranate, pineapple, mango, grapefruit, raspberry, blackberry, fresh fig, persimmon
- additional watermelon serving
- kefir, strained yogurt, labneh, cottage/çökelek
- lean beef variants, chicken/turkey meatballs, chicken skewers
- bulgur pilaf, couscous, erişte, lavaş, simit, bazlama, rice cakes, baked potato
- mercimek köftesi, lahmacun, pide, döner, gözleme, içli köfte, et sote
- tea, green tea, şalgam, juices, coconut water, isotonic drink, lemonade, 330 ml mineral water
- granola, oat bar, crackers, yogurt-fruit bowl

`nutrition-library.js?v=7.15` is cache-busted and Service Worker v7.15 ignores query strings during offline fallback, preventing an old cached food list from hiding newer foods.

## Validation

- JavaScript syntax: **37/37 PASS**
- Node test files: **9/9 PASS**
- Nutrition library records: **149**
- Nutrition records missing required nutrient fields: **0**
- Duplicate HTML IDs: **0**
- Missing script files: **0**
- Missing Service Worker core assets: **0**
- Literal `\n` UI corruption sequences: **0**

### Executed tests
- **catalog-universal-physiology.test.js** — PASS
- **guided-workout-core.test.js** — PASS
- **health-state-engine.test.js** — PASS
- **load-prescription-engine.test.js** — PASS
- **nutrition-ledger-engine.test.js** — PASS
- **pain-intelligence-core.test.js** — PASS
- **periodic-trend-engine.test.js** — PASS
- **physiological-impact-engine.test.js** — PASS
- **substitution-intelligence-core.test.js** — PASS

## Limits

Health-state logic is training-load decision support, not medical diagnosis.
Periodic plateau classification is a coaching heuristic and requires enough comparable sessions.
Food values are generic curated reference servings; brand/recipe-specific values can differ.


## v7.16 — Nutrition Record Editor

# Athlete Life OS v7.16 — Nutrition Record Editor

## Fixed

Food records can now be corrected or removed directly from the Nutrition page.

Each daily food row now exposes:
- **Düzenle**
- **Kopyala**
- **Sil**

The Nutrition page no longer depends on Record Manager for these actions.

## Stable record IDs

All food operations use the record's `logId`, not its visible array index.

This prevents editing/deleting the wrong food after:
- another food is inserted
- a row is normalized/repaired
- the list is re-rendered

## Edit behavior

The dedicated Nutrition editor can change:
- food item
- meal
- serving amount
- time

Saving an edit rebuilds the nutrient snapshot from the selected food and new serving amount while preserving the same `logId`.

Therefore changing:
- Köfte `1.0` serving → `1.5` serving

also recalculates:
- calories
- protein
- carbohydrates
- fat
- fiber
- minerals/vitamins

rather than only changing the displayed serving label.

## Delete behavior

Deleting one food removes only that `logId`.
Daily macro/micro totals and Nutrition Impact are re-rendered immediately.

## Regression test

Executed sequence:
1. Add mineral water
2. Add meatballs
3. Edit meatballs from 1.0 → 1.5 serving
4. Confirm mineral water remains unchanged
5. Confirm meatball kcal changes from 330 → 495
6. Delete mineral water
7. Confirm meatballs remain
8. Confirm totals recalculate
9. JSON persistence round-trip

Result: **PASS**

Record Manager food edit/delete remains available and now also uses the stable-ID Nutrition Ledger operations internally.


## v7.17 — Daily Nutrition UI Runtime Fix

# Athlete Life OS v7.17 — Daily Nutrition UI Runtime Fix

## Exact root cause

The daily Nutrition page buttons were rendered correctly, but `nutrition-record-engine.js`
looked for:

- `window.db`
- `window.FOODS`

The main app defines those as:

- `let db = ...`
- `const FOODS = ...`

Top-level `let` / `const` bindings in classic browser scripts are shared global lexical
bindings, but they are **not properties on `window`**.

Therefore:
- adding food worked because `app.js` directly used lexical `db`
- delete/edit buttons called a separate engine that saw `window.db === undefined`
- the UI action silently returned without changing the daily ledger

## Fix

v7.17 adds `window.ALOSRuntime`, a controlled bridge with getters:

- `getDb()`
- `getFoods()`
- `save()`
- `renderNutrition()`
- `renderAnalytics()`
- `renderReports()`

The Nutrition Record Editor now exclusively uses the bridge.

A getter is used instead of copying `db` onto `window`, so if another engine temporarily
reassigns the lexical database reference (for example System Integrity sandbox tests),
the editor still receives the current database.

## Regression test

The automated test intentionally leaves BOTH of these undefined:

- `window.db`
- `window.FOODS`

It supplies the real data only through `ALOSRuntime`, reproducing the exact previous bug.

Scenario:
1. Add Maden suyu
2. Add Köfte
3. Delete Maden suyu from the Nutrition UI action
4. Verify Köfte remains
5. Verify save is called
6. Verify Nutrition re-renders
7. Duplicate Köfte
8. Verify the original remains and a second row is appended

Result:

**v7.17 nutrition UI runtime bridge tests: PASS**

The earlier ledger edit/delete regression test also still passes.


## v7.18 — Water Ledger

# Athlete Life OS v7.18 — Water Ledger

Kök neden: su kayıtları `db.water[date] = toplam ml` olarak tek sayı tutuluyordu. Bu nedenle
+250/+500 ml eklenebiliyor ama her eklemenin ayrı kimliği olmadığı için tek tek silinemiyordu.

v7.18 ile her su eklemesi `waterLogs` içinde ayrı ID'li satırdır. Beslenme ekranında her su
satırının yanında **Sil** bulunur. 250 ml + 500 ml varsa 250 ml'yi silmek yalnız onu kaldırır
ve toplam 500 ml olur.

Eski `db.water[date]` toplamı uyumluluk için yeni ledger ile senkron tutulur; Hydration,
Nutrition Impact ve raporlar çalışmaya devam eder. Eski 1500 ml gibi scalar kayıtlar da
`1500 ml · eski toplam` olarak migrate edilip silinebilir.

Data Vault artık `waterLogs` alanını da merge/normalize eder.

Regression testleri: su ekleme, tek kayıt silme, kalan kaydı koruma, legacy migration,
legacy silme ve Nutrition UI wiring — PASS.


## v7.19 — Hydration Intelligence + Leblebi

# Athlete Life OS v7.19 — Hydration Intelligence + Leblebi

The old Nutrition Advice treated `targetWater` as an exact physiological requirement and
converted the difference directly into “drink X liters/ml more”. That was too confident.

v7.19 uses one shared Hydration Intelligence model in Daily Nutrition Advice and Nutrition
Impact. It reads direct Water Ledger entries, water from foods/beverages, body weight,
training duration and RPE. Without a measured sweat rate it returns a broad range and
explicitly refuses to calculate exact missing liters or dehydration percentage.

For a 72 kg rest-day fixture the app coaching range is roughly 2.2–2.9 L of total recorded
water. Hard exercise raises/widens the range. A personal sweat-rate measurement would
increase model confidence.

The manual water target remains a user reference but is not treated as a biological
requirement if it conflicts with the dynamic range.

Added food:
**Leblebi, sarı (kavrulmuş, tuzsuz)** — Kuruyemiş & Tohum — 30 g
- 111 kcal
- 5.7 g protein
- 18.2 g carbohydrate
- 1.8 g fat
- 5.0 g fiber

Values are generic roasted-chickpea references and can vary by brand/roasting.

Tests PASS:
- Hydration Intelligence
- old exact-liter advice removed
- Nutrition Impact low/high hydration range
- Leblebi library/schema
- Water Ledger
- Nutrition Ledger
- Nutrition UI runtime


## v7.20 — Nutrition Impact ↔ Water Ledger Sync

# Athlete Life OS v7.20 — Nutrition Impact ↔ Water Ledger Sync

## Exact bug

The Water Ledger correctly stored today's added water, but Nutrition Impact's Hydration card
used `rollingNutrition(14).water`.

That created two problems:

1. Today's added water was not the primary Hydration source.
2. Days with food logs but no water log could enter the nutrition average with `water = 0`,
   diluting the displayed hydration value.

Example:
- several prior food-log days with no tracked water
- today +1500 ml Water Ledger

The Hydration card could show a much smaller rolling value instead of today's 1.5 L.

## Fix

The Hydration card now reads:

**today's Water Ledger + today's food/beverage water**

directly from `nutritionMetricsForDate(today)`.

It exposes:
- today's total liters
- direct Water Ledger liters
- food/beverage water liters
- dynamic model range
- whether a real Water Ledger entry exists

The 14-day hydration value is now a separate secondary trend and includes only days that
actually contain a water record. A missing water log is not interpreted as “0 L consumed”.

## Live synchronization

Water add and water delete now explicitly trigger `NutritionImpact.render()` in addition to
the normal Nutrition render path.

Therefore:
- 1.5 L Water Ledger → Hydration shows 1.5 L
- add 500 ml → Hydration shows 2.0 L immediately
- delete that 500 ml → Hydration returns to 1.5 L immediately

## UI wording

Hydration now displays, for example:

`Bugün 2.0 L · su 1.7 L + besin/içecek 0.3 L · model 2.2–2.9 L`

If there is no direct Water Ledger entry, it says:

`Bugün doğrudan su kaydı yok`

instead of pretending the athlete drank 0 L.

## Regression tests

- Nutrition Impact ↔ Water Ledger 1.5 L sync: PASS
- +500 ml live data change → 2.0 L: PASS
- delete 500 ml → 1.5 L: PASS
- rolling hydration excludes no-water days: PASS
- existing Hydration Intelligence tests: PASS
- Water Ledger tests: PASS
- Nutrition Ledger tests: PASS


## v8.0 — Core Architecture Rebuild

# Athlete Life OS v8.0 — Core Architecture Rebuild

## Purpose

v8.0 implements the ten highest-priority architectural changes identified for the Athlete OS.
This release is not primarily a UI feature release. It restructures how data, models and
recommendations communicate.

## 1. Central Event Store / Single Source of Truth migration

Added `event-store-engine.js`.

Measured events are now represented as immutable records with:
- event id
- event type
- athlete day
- domain
- source
- actor
- payload
- provenance metadata

The current application still keeps its legacy `db` object as a compatibility/materialized
projection while v8 migrates the system. Food, water, daily check-in and common training
writes are dual-written to the Event Store. Existing historical records are bootstrapped
idempotently with stable event IDs.

Food/water deletion is represented as explicit events instead of silently erasing history.

Portable backups and local checkpoints now include the Event Store.

## 2. Engine Communication Bus

Added `engine-bus.js`.

Engines register their:
- name
- version
- inputs
- outputs
- health callback

`event.appended` is routed into domain topics such as:
- `nutrition.changed`
- `training.changed`
- `recovery.changed`

Consumers can update Nutrition Impact, architecture state and model snapshots without each
engine directly reaching into every other engine.

## 3. Measured / Derived / Estimated / Recommended data separation

Added `data-lineage-engine.js`.

Every model output can carry:
- `kind`
- `confidence`
- model name
- model version
- input lineage
- units
- explanatory note

The v8 daily model snapshot stores readiness, hydration, Coach recommendation and adaptive
nutrition with explicit lineage.

## 4. Model confidence / provenance / version

Lineage objects and Event Store events contain confidence and version metadata.

This is the foundation for preventing a heuristic 0–100 index from being displayed as if it
were a directly measured physiological variable.

## 5. Adaptive Coach Constraint Solver

Added `adaptive-coach-solver.js`.

The solver separates hard constraints from soft objectives.

Hard constraints include:
- illness / health guard
- high pain + high joint-risk movement
- available session time

Soft objectives include:
- muscle gain
- Planche
- Front Lever
- running
- recent neural/mechanical load
- performance trend
- recovery cost

The existing weekly planning engine can now consume the Solver when available. Planned-session
continuity gets a strong bonus, so the solver is designed to preserve the program unless
constraints justify a change.

## 6. Personal Calibration

Added `personal-calibration-engine.js`.

The engine learns per-movement:
- average load
- average repetitions
- average RIR
- number of sessions
- calibration confidence

It also contains an observed bodyweight/intake maintenance-calibration model. It requires
enough real weight and calorie records before producing a maintenance estimate.

## 7. Performance Trend V2

Added `performance-trend-v2.js`.

Trend V2 no longer treats performance as only load or best hold.

Weighted movements can include:
- system/external load
- repetitions
- RIR
- rest context
- bodyweight

Static movements can include:
- best hold
- total quality seconds
- set decay
- RIR

It outputs rising / declining / plateau / stable with confidence.

## 8. Tissue Load Engine

Added `tissue-load-engine.js`.

This is intentionally an exposure model, not an injury probability model.

Current mapped examples include:
- wrist
- elbow
- anterior shoulder
- biceps tendon
- grip
- hamstring
- Achilles
- patellar tendon
- hip
- low back

It consumes actual training rows and the physiological recovery-cost model.

## 9. Adaptive Nutrition

Added `adaptive-nutrition-engine.js`.

Targets can now depend on:
- current bodyweight
- calibrated maintenance estimate
- weight-gain target
- planned training type
- recent metabolic load

Carbohydrate targets are periodized by training demand rather than being permanently fixed.

The daily Nutrition Advice can display the adaptive target when the engine is available.

## 10. Schema Migration + Release Integrity

Added:
- `schema-migration-engine.js`
- `release-integrity-v8.js`
- v8 Golden Journey contract test

Current app schema target: **8**

The migration pipeline creates/normalizes:
- `waterLogs`
- `modelSnapshots`
- `calibration`
- `tissueLoad`
- v8 architecture metadata

Release Integrity checks architecture availability and critical engine outputs.

## Architecture Dashboard

Analytics now contains an **Athlete OS Architecture v8.0** card showing:
- Event count
- registered engine count
- schema health
- release-integrity pass count
- Trend V2 state
- personal calibration confidence
- current Constraint Solver recommendation
- highest modeled tissue exposure

## Backup / recovery

Portable `.alosbackup` payloads and local checkpoints now include Event Store data.
On merge import, events are merged by stable event ID.
On replace import/checkpoint restore, the corresponding Event Store is restored.

## Validation

- JavaScript syntax: **62/62 PASS**
- Node test files: **20/20 PASS**
- Missing HTML script assets: **0**
- Duplicate HTML IDs: **0**
- Ten architecture priority contracts: **10/10 present**

Executed v8-specific tests include:
- Event Store idempotent legacy bootstrap
- Event deletion projector
- Engine Bus publish/subscribe
- schema 5 → 8 migration
- lineage kind/confidence
- weighted performance Trend V2
- personal load calibration
- Tissue Load projection
- Adaptive Nutrition finite targets
- Constraint Solver finite decision
- Golden Journey cross-module wiring

Existing regression tests for Nutrition, Water Ledger, Hydration, universal physiology,
load prescription, pain, substitution and Guided Workout also continue to pass.

## Important architecture boundary

v8.0 is a **migration architecture**, not a claim that every legacy read in the application
has already been removed.

The legacy `db` remains the current materialized compatibility projection while the Event
Store becomes the audit/canonical event layer. This avoids breaking the mature v7 feature
set in one destructive rewrite.

The next architectural step is to progressively replace direct legacy reads with formal
projectors/selectors from Athlete State until no engine needs to know the raw DB layout.

## Browser E2E boundary

The automated test suite validates JavaScript execution, engine contracts, data migrations,
cross-module scenarios and package structure. A fresh real-browser full click-through,
WebGL and PWA/offline-install test is not claimed in this environment.


## v8.2 — Guided Plan Live Sync and Timer Recovery

- Bugünün Hazır Antrenmanı ile Guided Workout Runner, ilk set başlayana kadar aynı canlı canonical reçeteyi izler.
- Eski fakat hiç uygulanmamış Guided oturumu artık güncel günlük programı canonical plan olarak ezemez.
- Runner kartını açmak süreyi başlatmaz; ana seans sayacı ilk set ile başlar ve seans tamamlandığında sabitlenir.
- `Planı Eşitle`, `Süreyi Sıfırla` ve `Antrenmanı Baştan Başlat` bakım kontrolleri eklendi.
- Baştan başlatma yalnızca aktif Guided oturumunun ürettiği setleri siler; manuel ve diğer seans kayıtlarını korur.

## v8.1 — Canonical Training Plan Synchronization

# Athlete Life OS v8.1 — Canonical Training Plan Synchronization

## Reported problem

The Training page could show different workouts in:

1. **Bu Haftanın Antrenman Planı**
2. **Bugünün Hazır Antrenmanı**
3. **Guided Workout Runner**

The divergence was real and had two architectural causes.

### Cause 1 — different plan readers

The weekly layer was primarily reading `futurePlans`, while today's detailed workout was
built through `resolvedTemplate()`.

Those two structures describe the same intended session at different abstraction levels,
but there was no persistent session-level prescription object binding the exact movement
list, prescriptions, loads and rest targets to one identity.

### Cause 2 — Guided Runner could become stale

Guided Workout Runner copied its own `items` snapshot when a workout was started.

If readiness, Coach optimization or a manual plan rebuild created a newer `futurePlans`
version afterwards, Weekly/Today could move to the new plan while an already active Guided
Runner continued using its older snapshot.

The old repair logic checked the Guided engine version, not the current plan prescription
identity. That allowed three screens to legitimately drift apart.

A separate case also exists by design: Session Router can intentionally target a previous
day for a late/catch-up workout. That should be shown as a **different target date**, not
silently look like a synchronization failure.

## v8.1 solution — Canonical Session Prescription

Added `canonical-session-engine.js`.

For each program date the application now owns one canonical session snapshot in:

`db.sessionPrescriptions[date]`

The snapshot contains:

- canonical `snapshotId`
- fingerprint
- plan type/name/version
- readiness/plan metadata
- exact ordered movement list
- prescription text
- load recommendation
- rest target/min/max
- pain/risk context
- health/modifier context
- lock state and lock reason

### Before execution

The prescription remains **unlocked**.

If readiness, health, Coach optimization or plan version changes, the canonical snapshot can
refresh. Weekly Plan, Today's Workout and a newly started Guided Runner will all see the new
snapshot.

### Once execution begins

The prescription becomes **locked** when:

- Guided Runner starts, or
- a manual performed exercise is recorded, or
- performed/session feedback data already exists.

After locking, the future-plan optimizer is not allowed to delete or replace that session.

This prevents an in-progress workout from changing underneath the athlete.

## Three-way consumer rule

### Weekly Plan

`renderWeeklyTrainingPlanV5()` now reads the canonical snapshot and displays a short movement
preview plus the canonical snapshot identity.

### Today's Ready Workout

`renderTodayTrainingPlanV5()` uses `canonicalTemplate(date)`.

The badge also shows plan version and `LOCK` when execution has started.

### Guided Workout Runner

`planItems(target)` now consumes `CanonicalSessionEngine.template(target)`.

When Runner starts:

1. it receives the canonical movement list,
2. the canonical session is locked,
3. the runner stores `canonicalSnapshotId`,
4. all generated training rows carry that canonical snapshot ID.

Guided integrity now reports:

- `CANONICAL OK`, or
- `PLAN SYNC HATASI`.

## Existing active Guided sessions

v8.1 does not discard an already active workout created by an older version.

If an unfinished Guided Runner already exists, its actual movement prescription is adopted as
the locked canonical snapshot.

Weekly Plan and Today's Workout therefore move to the active runner's real started session,
instead of silently replacing the workout mid-session.

## Optimizer behavior

`buildFuturePlanV5()` now treats a locked session as a hard scheduling constraint.

A locked date:

- is not deleted during re-optimization,
- is counted toward the week's scheduled session requirement,
- is removed from candidate dates for a replacement workout.

Future unlocked days can still be optimized normally.

## Adherence / Coach consistency

Plan adherence fallback now uses canonical movement names rather than rebuilding a generic
template from only the plan type.

Adaptation context and Coach workout rendering also use the canonical session metadata.

## Session Router distinction

The Session Router now exposes the canonical snapshot ID.

If Guided Runner is deliberately pointed at another date, the UI explicitly says that the
Runner is executing a catch-up/other-date plan.

That is considered an intentional target-date difference, not a three-way synchronization
failure.

## New Training sync indicator

The Training page now contains a synchronization strip.

Normal same-day state:

**3/3 SYNC**

It verifies:

`Weekly Plan → Today's Ready Workout → Guided Runner`

against the same canonical prescription.

If an active Runner targets a different date, it shows:

**TELAFİ HEDEFİ**

and explains which date the Runner belongs to.

## Persistence / schema

Schema target is now **9**.

Migration step 9 creates:

`sessionPrescriptions`

and marks:

`sessionArchitecture = "canonical-prescription-v1"`

Because the canonical prescription store is inside the main application DB, it is included in
the existing Data Vault backup/checkpoint payloads.

## Regression protection

New tests cover:

- unlocked canonical prescription follows a new plan version
- locked prescription does not drift after a new plan is generated
- existing Guided session can be adopted as canonical
- Guided / Today / Weekly use the same movement sequence
- Guided start locks the prescription
- optimizer cannot delete a locked date
- Session Router is canonical-aware
- schema migration 5 → 9
- Service Worker includes canonical engine

## Validation

- JavaScript syntax: **65/65 PASS**
- Node test files: **22/22 PASS**
- Missing HTML script assets: **0**
- Duplicate HTML IDs: **0**
- v8.1 canonical contracts: **10/10 PASS**

Existing regression tests for physiology, load prescription, hydration, nutrition,
Guided Workout core, substitution, pain, Water Ledger and v8 architecture continue to pass.

## Runtime boundary

This build validates engine logic, migration, canonical locking, cross-module wiring,
JavaScript syntax and package integrity.

A fresh real-browser mouse/touch click-through, WebGL and offline-PWA installation test is
not claimed in this environment.

## v10 Dynamic Application Architecture

This release is no longer persistence-dependent on a static browser page. Start it with `START_MAC.command`, `START_WINDOWS.bat`, or `python3 launch.py`.
The application server runs at `http://127.0.0.1:8765` and stores the canonical state transactionally in SQLite at:

- macOS/Linux: `~/.athlete-life-os/athlete-life-os.sqlite3`
- override with environment variable `ATHLETE_LIFE_OS_DATA_DIR`

The browser copy is a cache/offline safety layer. SQLite is the cross-release durable application database. The server keeps up to 250 verified revisions and uses WAL + FULL synchronous commits.
