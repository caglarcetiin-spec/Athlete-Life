# Özellik paritesi — mevcut ürün ve 2.0 hedefi

Kaynak commit e92b4b7. **Korundu (mevcut)** ifadesi bu görevde kaldırılmadı anlamındadır; bütün edge-case'ler geçti anlamına gelmez. **2.0 için tüm özellikler henüz taşınmadı.** Bu ayrım eksik işlevleri gizleyerek parity tamamlandı demeyi önler. Bilinçli kaldırma kararı verilmedi.

Kanıt türleri: statik kaynak, unit/VM, gerçek HTTP, gerçek Chrome route. Mevcut unit PASS yalnız adındaki kapsamdır; ilgili tüm UI akışına aktarılmaz. 29 anonim route PNG'si: `docs/evidence/stage-0/browser/`; çoğu boş veri durumunda, viewport görüntüsü. Modal ve tüm scroll alanları henüz görsel parity değil.

## 23 Eylül 2026 V2 değerlendirmesi

Tablonun son sütunu güncellenmiştir; diğer sütunlar aşama 0'daki eski ürün kanıtıdır. V2 kanıtları `docs/evidence/stage-6/*-regression.json` (komut, kaynak hashleri, ortam, exit), önceki aşama RESULT raporları ve `tests/v2/` içindedir. Route birleştirmesi, alt işlevin otomatik tamamlandığı anlamına gelmez. **U-06 tam PASS değildir.**

Kaynak/ana akış alt işlev eşlemesi `docs/evidence/stage-9/FEATURE_REVIEW.md` içinde tamamlandı; bütün form kombinasyonları ve kişisel legacy göçü doğrulanmış sayılmaz. 32 MB üzeri sentetik yedek roundtrip geçti; tarayıcı aktarım üst sınırı 64 MB. Kişisel kalibrasyon ve bilimsel kesinlik gerektiren eski iddialar doğrulanmış gibi açılmadı; bilinçli ürün kararı ve gerekçesi release incelemesinde görünür olmalı. Gerçek iPhone/VoiceOver/WebKit/Firefox ve uzun süreli performans henüz test edilmedi.

## Tüm sayfalar

| Route / görünen ad | Mevcut durum ve kaynak | Kayıt / hesap kaynağı | Yeni çalıştırılan kanıt | 2.0 durumu |
|---|---|---|---|---|
| `today` · Sağlık · Günlük durum | Korundu; `app.js:146 loadToday` | `daily, painLogs` | [Ekran](docs/evidence/stage-0/browser/today.png); health-state-engine.test.js | `health` günlük durum ve ağrı; API+tarayıcı testli |
| `week` · Antrenman · Takvim ve vardiya | Korundu; `app.js:308 persistWeeklyScheduleFromUI` | `scheduleByDate, weekOptimizations` | [Ekran](docs/evidence/stage-0/browser/week.png); browser_probe.js (ACK/restart/second-context) | `week` tarihli vardiya ve öneri; ACK/restart/ikinci cihaz testli |
| `training` · Antrenman · Hareket ve set kaydı | Korundu; `app.js:372 initTraining; guided-workout-engine.js:329` | `trainingLogs, sessionPrescriptions, activeGuidedWorkout` | [Ekran](docs/evidence/stage-0/browser/training.png); integration-v9.test.js | `workout` reçete + gerçek set + Runner; geçmiş ve offline testli |
| `nutrition` · Beslenme · Günlük beslenme | Korundu; `app.js renderNutrition; nutrition-ledger-engine.js` | `foodLogs, waterLogs, water` | [Ekran](docs/evidence/stage-0/browser/nutrition.png); nutrition-ledger-engine.test.js | `nutrition` öğün/besin/tarif/su; API+tarayıcı testli |
| `analytics` · Gelişim · Grafikler | Korundu; `app.js renderAnalytics; periodic-trend-engine.js` | `training/daily/food derived` | [Ekran](docs/evidence/stage-0/browser/analytics.png); periodic-trend-engine.test.js | `reports` sürümlü 7/28/84 günlük analiz; eski bütün grafik çeşitleri birebir değil |
| `detailed` · Gelişim · Ölçümler | Korundu; `app.js detailed panels; account-photos.js` | `bodyMeasurements, capabilityRecords, photos` | [Ekran](docs/evidence/stage-0/browser/detailed.png); account-extensions.test.py | `capability` ölçümler + `backup` fotoğraf/tarih/elle ölçüm metadata; API testli |
| `coach` · Antrenman · Program incelemesi | Korundu; `app.js:2679 renderCoachV5` | `futurePlans, sessionPrescriptions` | [Ekran](docs/evidence/stage-0/browser/coach.png); v9_2_program_engine.test.js | `program` hedefli taslak ve `reports` açıklanabilir inceleme; öneri otomatik benimsenmez |
| `character` · Profilim · Spor profilim | Korundu; `athlete-profile-engine.js; sports-profile-ui.js` | `athleteProfile, characterData, capabilityRecords` | [Ekran](docs/evidence/stage-0/browser/character.png); sports-profile.test.js | `profile` 199 branş/ekipman/deneyim + `capability`; kayıt testli |
| `reports` · Sağlık · Vücut ve toparlanma | Korundu; `app.js:1832 muscleRecoveryDetail; bodymap3d.js:9` | `trainingLogs, painLogs, body model` | [Ekran](docs/evidence/stage-0/browser/reports.png); recovery-elapsed.test.js (GLB NOT RUN) | `reports` 2D/isteğe bağlı 3D; kalıcı kullanıcı GLB yükleme/yeniden açma/restore sentetik testli |
| `records` · Gelişim · Kayıt yönetimi | Korundu; `record-manager.js:68` | `dated logs, undo` | [Ekran](docs/evidence/stage-0/browser/records.png); record-edit-safety.test.js | Alan sayfalarında düzenle/sil + `backup` geri getir; API testli |
| `settings` · Profilim · Tercihler ve veriler | Korundu; `workspace-lifecycle-ui.js; backup-vault.js:103` | `settings, archives, export` | [Ekran](docs/evidence/stage-0/browser/settings.png); workspace-lifecycle.test.js | `profile` tercihler + `backup` arşiv/yedek; API+tarayıcı testli |
| `workspace-today` · Bugün · Özet | Korundu; `account-workspace.js` | `multisportPeriods, sportSessions` | [Ekran](docs/evidence/stage-0/browser/workspace-today.png); athlete-workspace-core.test.js | `today` ortak tarihli özet ve aktif plan |
| `workspace-plan` · Antrenman · Dönemlerim | Korundu; `workout-program-ui.js; training-planner-ui.js` | `multisportPeriods, draft` | [Ekran](docs/evidence/stage-0/browser/workspace-plan.png); training-planner.test.js | `program` hedefli taslak/manual/hafta aralığı/sürüm/onay; API+Runner testli |
| `workspace-training` · Antrenman · Seanslarım | Korundu; `sports-profile-ui.js; workout-program-core.js` | `sportSessions, trainingLogs projection` | [Ekran](docs/evidence/stage-0/browser/workspace-training.png); workout-program.test.js | `workout` planlı veya plan dışı seans; API+tarayıcı testli |
| `workspace-analysis` · Gelişim · Ortak analiz | Korundu; `account-workspace.js; athlete-workspace-core.js` | `sportSessions, periods` | [Ekran](docs/evidence/stage-0/browser/workspace-analysis.png); athlete-workspace-core.test.js | `reports` gerçekleşen seanslardan sürümlü hesaplar; biyolojik doğrulama değil |
| `health-overview` · Sağlık · Genel bakış | Korundu; `wellness-ui.js` | `daily, lab, episodes` | [Ekran](docs/evidence/stage-0/browser/health-overview.png); wellness-integration.test.js | `health` günlük durum, ağrı, hastalık; API+tarayıcı testli |
| `health-sleep` · Sağlık · Uyku | Korundu; `health-core.js:78 saveSleep; wellness-ui.js` | `daily sleep intervals` | [Ekran](docs/evidence/stage-0/browser/health-sleep.png); health-core.test.js | `health` başlangıç/bitiş tarihli uyku; gece yarısı ve çakışma testli |
| `health-labs` · Sağlık · Kan tahlilleri | Korundu; `health-core.js:56 saveReport; wellness-ui.js` | `healthLabRecords/history` | [Ekran](docs/evidence/stage-0/browser/health-labs.png); health-core.test.js | `health` laboratuvar sonucu, birim, kendi referansı, karşılaştırma işareti; API testli |
| `account-profile` · Profilim · Hesabım | Korundu; `account-personal-ui.js; account_server.py:244` | `server identity, email, version, avatar` | [Ekran](docs/evidence/stage-0/browser/account-profile.png); profile-authority.test.py | `profile` ad/e-posta/parola/kurtarma/fotoğraf; sahiplik ve API testli |
| `health-report` · Sağlık · Sağlık raporu | Korundu; `health-report-ui.js; health_report.py` | `server-scoped report` | [Ekran](docs/evidence/stage-0/browser/health-report.png); health-report.test.py / accounts.test.py | `reports` kişisel tarihli PDF; kaynak/birim/UNKNOWN testli |
| `health-profile` · Sağlık · Sağlık profilim | Korundu; `personal-health-ui.js; personal-health-core.js` | `personalHealthProfile` | [Ekran](docs/evidence/stage-0/browser/health-profile.png); personal-health-core.test.js | `profile` spor/sağlık profili; bilinmeyen eski alanlar arşivde |
| `health-recovery` · Sağlık · Toparlanma geçmişi | Korundu; `personal-health-ui.js; personal-health-core.js` | `healthEpisodes/healthAdjustments` | [Ekran](docs/evidence/stage-0/browser/health-recovery.png); health-history-integration.test.js | `health` hastalık/toparlanma geçmişi + `reports` ihtiyat sinyalleri |
| `health-cycle` · Sağlık · Regl günlüğü | Korundu; `personal-health-ui.js` | `cycleDays, profile opt-in` | [Ekran](docs/evidence/stage-0/browser/health-cycle.png); personal-health-core.test.js | `health` kullanıcının açtığı regl günlüğü; evreden kas yüzdesi türetilmez |
| `simple-home` · Bugün | Korundu; `account-guidance-ui.js:8` | `daily check-in, goals` | [Ekran](docs/evidence/stage-0/browser/simple-home.png); current browser route only; full submit NOT RUN | `today` basit mod; mobil/masaüstü route ve kontrast testli |
| `simple-activity` · Antrenman · Hareket günlüğü | Korundu; `account-guidance-ui.js:17` | `sportSessions` | [Ekran](docs/evidence/stage-0/browser/simple-activity.png); workout-program.test.js (core only) | `workout` aynı gerçek kayıt kaynağı; ikinci paralel günlük yok |
| `simple-health` · Sağlık · Sağlığım | Korundu; `account-guidance-ui.js:20` | `health route links` | [Ekran](docs/evidence/stage-0/browser/simple-health.png); current browser route only | `health` sağlık alt başlıkları; route/kontrast testli |
| `simple-progress` · Gelişim · Gelişimim | Korundu; `account-guidance-ui.js` | `actual sessions coverage` | [Ekran](docs/evidence/stage-0/browser/simple-progress.png); current browser route only | `status` ve `reports` hedef/gerçek ölçüm; veri yoksa UNKNOWN |
| `guide` · Profilim · Görünüm ve rehber | Korundu; `account-guidance-core.js; account-guidance-ui.js` | `settings mode, guideProgress` | [Ekran](docs/evidence/stage-0/browser/guide.png); current browser route; old onboarding e2e FAIL | `guide` altı adımlı tur/yol haritası/sözlük; tam ekran okuyucu incelemesi NOT RUN |
| `goal-status` · Durumum · Hedefler ve eğilimler | Korundu; `training-planner-core.js; training-planner-ui.js` | `athleteGoals, goalMeasurements` | [Ekran](docs/evidence/stage-0/browser/goal-status.png); training-planner.test.js | `status` + `goals` kullanıcı hedefi ve ölçümleri; API ve rapor testli |

## Sayfa olmayan işlevler / modallar

| İşlev | Kaynak dayanağı | Mevcut kanıt / sınır | 2.0 taşıma aşaması |
|---|---|---|---|
| Login/signup/logout/recovery/password/email | account_server.py:167; accounts.py; mongo_accounts.py; accounts-ui.js | accounts.test.py/extended/cloud HTTP PASS; dört eski onboarding e2e FAIL | 1/2 |
| Basit/profesyonel mod, roadmap ve öğretici tur | account-guidance-core.js; account-guidance-ui.js; account-workspace.js:9 | Kaynak + guide PNG; adım adım tur yeni browser e2e NOT RUN | 6 |
| Üst profil kimliği / fotoğraf / tema / geri-ileri-ana sayfa | account-workspace.js; profile-avatar.js; appearance.js | Route PNG; avatar upload/keyboard/dark full matrix bu görevde NOT RUN | 6 |
| GG.AA.YYYY tarih ve saat/süre picker | entry-fields-core.js; account-entry-ui.js | entry-fields.test.js PASS; tarihi yanlış inputta partial typing ayrı test ister | 1/3/6 |
| Branş/ekipman/profil sihirbazı | sports-profile-core.js; sports-profile-ui.js | sports-profile.test.js PASS; eski browser selector FAIL | 3/6 |
| Branş seansı plan bağlantısı / linked movement / yöntem / metrics | workout-program-core.js; sports-profile-ui.js | workout-program.test.js PASS; yeni her select kombinasyonu e2e değil | 3 |
| Seans edit / sil / geri getir | workspace-lifecycle-core.js:31/42; workspace-lifecycle-ui.js | lifecycle test PASS; geçmiş projection koruması unit/integration | 3 |
| Dönem goal-first sihirbaz / manual editor / review / adopt | training-planner-core.js:59; workout-program-ui.js | training-planner.test.js PASS; approval akışı yeni DB'ye taşınmadı | 3 |
| Eski dönem / progression / phase / roadmap | training-periods.js:15/44/121; app.js AthleteProgramEngine | calendar-period-integration.test.js + v9_2_program_engine.test.js PASS | 3 |
| Legacy Guided Runner: rest/pause/resume/undo/skip/timing | guided-workout-engine.js:329/367; canonical-session-engine.js:62 | core/timing/integration PASS; server atomic lock ve slot identity eksik | 3 |
| Yeni dönem canlı Runner: actual metrics/formDraft | training-planner-core.js:121/130/135; training-planner-ui.js | training-planner.test.js PASS; canonical guided'dan ayrı model | 3 |
| Capability Lab/rings/muscle-up/strength/speed/balance/mobility/endurance | capability-catalog.js; athlete-profile-engine.js | capability-catalog-v922 + capability-domains-v923 PASS; protocol canonicalization hedef | 4 |
| Hareket kütüphanesi / alias / ekipman / efor / dinlenme | exercise-knowledge-library.js; rest-interval-engine.js; load-prescription-engine.js | catalog-universal-physiology / load prescription / substitution test PASS | 3/4 |
| Sürpriz sosyal plan / ek fiziksel aktivite | app.js renderTradeoff; ad-hoc-session-engine.js | Kaynakta iki ayrı model; tüm interop e2e NOT RUN | 4 |
| Öğün ve besin edit/undo, nutrient snapshot, su ledger | nutrition-record-engine.js; nutrition-ledger-engine.js; water-ledger-engine.js | ledger/runtime/water tests PASS; domain server idempotency yok | 4 |
| Ağrı / günlük durum / hastalık-toparlanma / cycle / lab | health-state-engine.js; personal-health-core.js; pain-intelligence-core.js; health-core.js | health/pain/wellness testleri PASS; tıbbi doğruluk iddiası yok | 4/5 |
| Kas haritası 2D/3D, fotoğraf, kullanıcı model yükleme | bodymap3d.js:9; account-photos.js; account_photos.py | API photo unit/HTTP PASS; bu görevde GLB engellendi, rendering NOT RUN | 2/5/6 |
| Recovery/yük/analiz/calibration/science açıklamaları | app.js:1782/1832; sports-science-policy.js; physiological-impact-engine.js | recovery elapsed ve clock PASS; biyolojik geçerlilik/lineage NOT RUN | 5 |
| Hedeflerim ve Durumum, günlük/haftalık/aylık/84 günlük eğilim | training-planner-core.js goalSeries/overview; training-planner-ui.js | training-planner.test.js + goal-status PNG; ilerleme garanti edilmez | 3/5 |
| Veri sıfırlama/generation/arşiv/kayıt geçmişi | workspace-lifecycle-core.js:10/16; workspace-lifecycle-ui.js | workspace-reset-integration.test.js PASS; gerçek reset yapılmadı | 2/6 |
| Kişisel tam JSON export/import/checkpoint/undo | backup-vault.js:103/147/269; record-manager.js:68 | Synthetic merge testleri PASS; bağımsız full restore/medya roundtrip NOT RUN | 2 |
| Genel PDF/arşiv PDF ve sağlık PDF/önizleme | activity_report.py; health_report.py; health_report_pdf.py; account_server.py:203 | activity-report/health-report + auth HTTP PASS; mevcut synthetic PDFs | 2/5 |
| System Integrity ve teknik motor durumu | system-integrity-engine.js:28; architecture-bootstrap.js:41 | Transport spy dört sandbox save gördü; izolasyon FAIL (RSK-06) | 1 güvenlik sınırı / 5 |
| PWA/sync/conflict/account isolation | account-sync.js:29/50; account-context.js; account_server.py:153 | Unit/HTTP + offline POST/restart e2e; offline app-shell yok | 1/6 |

## Görsel ve erişilebilirlik kapısı

Mevcut 29 route görünür ve desktop overflow ölçümü false. Yalnız bugün mobil 390×844 ölçüldü. Login, haftalık offline, training, dönem, lab ve mobil bugün görüntüleri insan gözüyle incelendi. Ekran okuyucu, kontrast oranları, keyboard focus sırası, koyu/açık her form durumu, gerçek iPhone, WebKit/Firefox **NOT RUN**. Sistem tasarımı ilk aşamada korunacak; tam kullanım kolaylığı kapısı Aşama 6.

Yeni release için her satır V2 API+DB+UI kanıtıyla tekrar ele alınacak; kritik henüz-taşınmadı satırı varken U-06 PASS olamaz.

### V2 3B bölgesel analiz — 24 Eylül 2026

Yüklenen GLB yalnız görüntüleyici değildir: aynı analiz raporundaki kuvvet yükleri 3B yüzeyde renklenir; kas seçimi, kaynak setler, belirsizlik aralıkları, model rezervi ve 24/48 saatlik yük azalması tek paneldedir. Adsız yüzeylerde eski sürümün koordinat yaklaşımı yaklaşık olarak kullanılır; anatomik segmentasyon olduğu iddia edilmez. 2B görünüm aynı hesabın alternatifidir. Büyük GLB yükleme/hesaba bağlı saklama değişmez.

### Ayrıntılı anatomi ve kalıcı görünüm — 25 Eylül 2026

669 adlandırılmış anatomik yapı içeren lisanslı kas atlası, seçili kasın tüm parçalarını izole etme/yakınlaştırma ve özgün sağ/sol adlarla arama eklendi. Kişisel yüklenen model korunur; kayıtlı model ve cihazdaki kaynak seçimi sonraki girişte otomatik açılır. Tekrar eden sürüm/rehber bildirimleri ertelenebilir; başlangıç profil yüklemesi sahte mod bildirimi oluşturmaz.
