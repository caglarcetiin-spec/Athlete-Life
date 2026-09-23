# Eski veri → 2.0 eşleştirme planı

Durum: kaynak incelemesi + sentetik store/tarayıcı deneyi. **Gerçek kullanıcı verisi taşınmadı.** Harita e92b4b7 kaynak biçimlerini kapsar; gerçek import öncesi alan sayısı/unknown raporu yeniden üretilmeli. Hedef tablolar tasarımdır, oluşturulmuş şema değildir. Dinamik anahtarları ve alt alanları taşıma sırasında recursive unknown-field manifest'ine almak zorunludur.

## Fiziksel depolar ve kimlik

| Kaynak / dayanak | Biçim | Hedef / korunma kuralı |
|---|---|---|
| `sqlite_store.py:21 init_db` | `app_state(id=1, revision, payload, checksum, weight)`, `state_revisions` | Owner bilinmez. Dry-run'da açık athlete eşleştirmesi; tutarlı read-only SQLite kopyası; eski revizyonları güncel veri gibi tekrar import etme. |
| `mongo_store.py` | Legacy Mongo snapshot/revisions | Aynı global format, owner varsayma. Canlı erişim bu aşamada yok. |
| `account_states.py:35/99` | SQLite `account_revisions`; Mongo `account_state_revisions`, user_id + revision; JSON payload | Başına gerçek server owner eşle; istemcinin `meta.accountId` alanına güvenme. Migration run + source checksum + legacy ID map. 250 revizyon bağımsız backup değildir. |
| `accounts.py:41`, `mongo_accounts.py:19` | users/sessions/attempts/recovery; Mongo account_users/account_sessions/account_login_attempts | users/athlete_memberships; eski hash yalnız tanınan algoritma ve parametreyle kontrollü taşınabilir, başarılı login sonrası rehash. Aktif cookie/CSRF/token'ları yeni sisteme kopyalama; yeniden giriş. Hash/kodları audit fixture'a yazma. |
| `account_photos.py`, `mongo_account_photos.py` | Hesap kapsamlı fotoğraf record/version/deleted ve Mongo chunks | Private media_objects + owner FK + checksum; tombstone koru. DB ile medya count/hash doğrulaması ayrı. |
| `account-context.js:6` | `alos-account:{user_id}:` localStorage/sessionStorage/IndexedDB namespace | Kaynak origin + user + api_environment manifest'te. Farklı origin kendiliğinden okuyamaz. Eski uygulamada export gerekir. |
| `durable-persistence.js:3` | RAW athleteLifeOS; commit.v3; LastKnownGood; IDB AthleteLifeOSDurable/revisions | RAW/rollback/mirror adayları aynı veri diye kör birleştirilmez. Her checksum/revision ve ACK/pending ayrı. Daha büyük weight doğru kayıt kanıtı değildir. |
| `account-sync.js:5` | account.pending `{data,reason,baseRevision}`, account.serverRevision, account.conflict.timestamp | Canonical kayıttan ayrı pending import journal. Tam snapshot farkı kullanıcıya göster; bunu sunucu ACK'i sanma. |
| `event-store-engine.js:5` | athleteLifeOS.events.v1 + import digest | Ham legacy event/tombstone arşivi; yeni performed_set'e projection ile tekrar yükleme yok. Kaynak kayıt kimliğine göre reconcile; belirsiz ilişki inceleme. |
| `backup-vault.js:5` | IDB AthleteLifeOSVault/snapshots; AthleteLifeOSPhotos/checkins; portable format/schema2 | immutable migration source; checkpoints ve photos manifest'i. Gövde SHA-256, boyut ve schema denetimi. |
| `backup-vault.js:119 sanitizeIncoming` | `.alosbackup`/`.alosbackup.json`: portable `{data,events,photos,integrity}`; eski data wrapper; raw db JSON | Format algılama; orijinal bayt hash'i ve semantik hash ayrı. Uzantı tek başına format kanıtı değil. Unknown metadata korunur. |
| `bodymap3d.js`, bundled assets | GLB model, 2D SVG/png, fotoğraf / avatar data URL | Katalog asset'i ve kişisel medya ayrımı. Kişisel modele bütün kullanıcılara erişim yok; lisans/owner belirsizse karantina. Kod ZIP'i kişisel data backup değildir. |

## Snapshot alanlarının semantik eşleşmesi

Satır kaynakları: [source-index](docs/evidence/stage-0/inventory/source-index.json) her aday alanın dosya/satırlarını içerir. Buradaki ana domain alanları elle doğrulandı; regex'in Date/DOM/SQL false-positive alanları domain sayılmadı.

| Legacy alan(lar) | Anlam / okuyucu-yazıcı dayanağı | 2.0 hedefi / dönüşüm |
|---|---|---|
| `settings`, `profile`, `athleteProfile`, `athleteProfileHistory` | `app.js:70`, sports-profile-core.js, account-personal-model.js | athlete_profiles + user_settings + profile_versions; adı server identity'den bağla; timezone explicit; hedefler ve tema korunur. |
| `personalHealthProfile`, `personalHealthHistory` | personal-health-core.js, personal-health-ui.js | health_profiles + profile_history; cinsiyet/yaş/deneyim kaynak ve belirsizliği korunur; hassas alanlar opsiyonel. |
| `characterData`, `characterOverrides` | app.js karakter düzenleyici, athlete-profile-engine.js | Legacy ölçümler/protokol provenance; otomatik e1RM veya measured strength diye çevirmeme. |
| `daily` | `app.js:146 loadToday`, health-core.js:78 | daily_checkins + sleep_entries + body_measurements + legacy_extensions; gece uykusu interval; sağlık/sport alanları ayrı. Her subfield orijinal JSON pointer ile. |
| `scheduleByDate` | `app.js:308 persistWeeklyScheduleFromUI` | shifts + schedule_exceptions + social_plans; 10–18/12–20/14–22 legacy shift definitions; seçili timezone tarih-only bilgisi korunur. |
| `week` | app.js:354 initWeek | date varsa exact shifts; index-only/weekday-only ise unresolved template. Güncel haftaya otomatik atama **yasak**. |
| `weekOptimizations` | app.js:365 optimizeWeek | optimization_runs/items: weekStart/end/generatedAt/rows/work/window/sleepTarget; eksik input_revision=unknown, orijinal metin de korunur. |
| `social` | app.js:renderTradeoff | social_plans; gerçek egzersiz değil. |
| `trainingPeriods`, `trainingPeriodDraft`, `trainingPeriodDrafts` | training-periods.js:15/121 | program_versions/blocks/weekly_slots + drafts; startDate/weeks/deload/progression/user-custom movement sırası korunur. |
| `multisportPeriods`, `customSports` | athlete-workspace-core.js, workout-program-core.js | program_versions/blocks/weekly_slots + activity_definitions; archivedOn/scheduleEndDate/pinnedPeriodId korunur. İki dönem modelini birbirine kanıtsız eşleme yok. |
| `programEngine`, `generatedWeekPlan`, `futurePlans` | app.js AthleteProgramEngine | Karar/plan snapshot'ları; calculation model/provenance unknown ise legacy-unknown. Ham gerçek antrenman olarak taşınmaz. |
| `sessionPrescriptions` | canonical-session-engine.js:76 | Immutable session_prescriptions/items/slots. Date-key'i yeni UUID'ye eşle; snapshotId/fingerprint/lock/version ham olarak sakla. |
| `planHistory`, `sessionFeedback`, `adherencePlans`, `deviationReasons`, `gapReconciliation` | training-session-service.js:11, adherence-engine.js, gap-reconciliation.js | plan_decisions, session_feedback, adherence, reconciliation; missing/unverified/missed farklı kalır. |
| `trainingLogs` | app.js manual records, guided-workout-engine.js:256 | workout_sessions + performed_sets/intervals; row ID + set ordinal/source map. scheduledFor/targetPlanDate ile actualAthleteDay farklı. source=sport_program projection ise relation kaydet, çift gerçek set yaratma. Belirsiz aynı ad/tarih varyasyonları ayrı aday. |
| `activeGuidedWorkout`, `guidedWorkoutHistory` | guided-workout-engine.js:6/329/367 | execution draft/ready/active/paused/history + timing events. Prescriptions ve actual set linkleri korunur. Tamamlanmış kayıt bugün aktif hale getirilemez. |
| `activeWorkoutRun`, `workoutRunHistory` | training-planner-core.js:121–140 | Yeni Runner actual/formDraft/elapsedMs/activeSince/status/revision/sportSessionId. Bunu legacy guided ile birleştirmek açık adapter gerektirir; startRun görüntüde startedAt üretir. |
| `sportSessions`, `sportSessionHistory`, `removedSportSessions` | workout-program-core.js, workspace-lifecycle-core.js | actual activity/session + audit/tombstone/restore data. Aynı seans bağlantıları ve planBlockId/periodId korunur. |
| `adHocSessions`, `runs` | ad-hoc-session-engine.js, app.js | Canonical activity relations + cardio_intervals; planlanan sosyal etkinlikle karıştırma; duplicate aday inceleme. |
| `foodLogs` | nutrition-ledger-engine.js / nutrition-record-engine.js | meal_entries/items + tüketim nutrient snapshot; recipe kaynağı/version biliniyorsa ilişki. complete/partial/not_logged eski kayıtta bilinmiyorsa uydurma. |
| `water`, `waterLogs` | water-ledger-engine.js | hydration_entries; legacy aggregate ayrı reconciliation; aynı miktarı iki defa toplama. |
| `painLogs`, `healthEpisodes`, `healthAdjustments`, `cycleDays` | pain-intelligence-core.js, personal-health-core.js | pain_entries, health_episodes, weekly_adjustments, cycle_entries; tarih/seviye/yan/not/kaynak/audit. |
| `healthLabRecords`, `healthLabHistory` | health-core.js:19/56 | lab_reports/observations; birim, lab referans aralığı, yöntem, açlık, geçmiş versiyon; evrensel tanı aralığı atama yok. |
| `bodyMeasurements`, `capabilityRecords` | athlete-profile-engine.js, capability-catalog.js | body_measurements + capability_protocol_versions/measurements; unit/variant/side/method/exercise aliases. Eksik önkoşuldan score üretme. |
| `athleteGoals`, `goalMeasurements`, `goalHistory` | training-planner-core.js | goals + measurements/history; hedef tarih ve kullanıcı onayı; planlanan gelişim garanti değildir. |
| `tissueLoad`, `adaptiveModel`, `modelSnapshots`, `calibration` | architecture-bootstrap.js:41, personal-calibration-engine.js | calculation_runs/derived_metrics + input_lineage + modelVersion; raw tarihi değiştirmeden legacy snapshot olarak tut. |
| `lifecycle` | app.js ensureLifecycle / closeElapsedDaysV5 | closed-day/uncertain-missed geçmişi; ham datadan yeni türetim eski kararın yerine yazılmaz. |
| `workspaceArchives`, `workspaceGeneration` | workspace-lifecycle-core.js | Athlete kapsamlı immutable arşiv + generation; nested data recursive mapping, mevcut aktif kayıttan ayır. Arşivde eksik fotoğraf/avatar açık raporlanır. |
| `photoProgress`, `settings.profileAvatar` | account-photos.js, profile-avatar.js | media_objects/measurement relation; boyut/type/hash; orijinal avatar yalnız mevcut düşük çözünürlüklü içerik. |
| `uiState` | app.js:115, account-workspace.js | selectedDate/week/session route-local state; kullanıcı tercihleri ayrı. Gün değişiminde bilinçli history seçimini koru. |
| `meta`, `_portableImport` | state_common.py, schema-migration-engine.js, event-store-engine.js:11 | Kaynak sürüm/revision/owner/hash/provenance → import manifest. Yeni version alanları birbirinden bağımsız. Owner server mapping ile doğrulanır. |
| `training`, `workouts`, `exerciseLogs`, `sessions` ve tanınmayan her alan | workspace-lifecycle-core.js compatibility keys; arbitrary JSON server kabulü | Şema tespit edilemiyorsa bounded `legacy_extensions`/karantina + pointer/hash/count; sessiz discard yok. İsimden çalışılmış seans varsayılmaz. |

## Zaman, kimlik ve duplicate politikası

- Legacy date-only kaydın `occurred_at` alanı null olabilir; `athlete_local_date`, `time_precision=date_only`, `time_source=legacy_unknown` taşı. Eski motorun 00:00/18:00 yaklaşık saatini ölçülmüş timestamp gibi taşıma (`app.js:1786 trainingRowTime`).
- Ayrı `recorded_at`, `received_at`, `updated_at`, `scheduled_for`, source timezone/offset alanları. Import anı yalnız ingestion time'dır. UTC dönüşümü belirsizse user resolution; DST fixture gereklidir.
- `(migration_source_digest, legacy_pointer, athlete_id)` ve stable source ID mapping idempotent import temeli. Aynı hareket/tarih/değer tek başına duplicate delili değildir. Orijinal ID yoksa migration-map deterministik kimlik üretir, kaynak dosya içinde birbirine benzeyen iki satır ayrı kalır.
- Unknown alanları dump ederek halka açık loga koyma; kullanıcıya field names/count/karantina durumu göster. Payload boyut sınırı, derinlik sınırı, MIME, ZIP ratio/path traversal kontrolü Aşama 2 test kapısıdır.

## Taşıma ve geri alma planı

1. Ayrı boş staging DB ve iki sentetik kullanıcı; önce synthetic roundtrip. Gerçek kaynak değişmez snapshot/export'tur.
2. Dry-run: kaynak hash/sürüm/owner, her varlık ve unknown sayısı, duplicate adayları, belirsiz tarihler, eksik medya. Mevcut DB'ye yazmaz.
3. Onaylı migration_run transaction/staging namespace; sayısal/birim/ilişki/semantik hash kontrolleri; interrupted job resume veya rollback.
4. UI'dan vardiya, iki Runner geçmişi, öğün, su, capability ve fotoğrafı açarak doğrula. Bağımsız yeni backup'tan ikinci boş DB'ye restore et.
5. Canlı cutover öncesi eski yazımları dondur, pending cihazları çözümle, son snapshot al. Bir domain için bir yazıcı. MongoDB → PostgreSQL çift yönlü kör sync yok.
6. Rollback: yeni yazım başlamadıysa flag geri döner; başlamışsa V2 verisi/export korunarak read-only veya forward-fix. Eski snapshot restore ederek yeni kayıtları atma.

Gerçek kaynak/yedek sayıları, kişisel restore, Atlas PITR/RPO/RTO bu aşamada **NOT RUN**. Kod ZIP'inden çıkarılabilecek veri envanteri ile gerçek kullanıcı kaydı sayısı eşit değildir.

## V2 alan ekleri — 23 Eylül 2026

- `weekly_slots.first_week` (1 varsayılan) ve `last_week` (null = dönem sonu): açık periyot fazı aralığı; gerçekleşmiş set değildir. Eski programda kesin faz aralığı yoksa bütün dönem tekrarı korunur, belirsiz eski faz ayrıntıları raw arşivden atılmaz. Yeni reçete yalnız seçili tarihin dönem haftasına uyan gün tanımından çıkarılır. Migration f137c8e642a1; eski reçeteler yeniden hesaplanmaz.
- `workspace_archives.raw/counts/input_revision`: açık yeni başlangıç öncesi kullanıcı kapsamlı kayıt snapshot'ı. Profil/medya korunur; eski günlük kayıtlar tombstone olur. Tam export raw içeriği taşır, normal sync içerik yerine metadata taşır.
- Hesap `RecoveryCode/SecurityAudit`: yalnız parola özeti ve tek kullanımlık kod özeti; kişisel spor export'u kimlik parolalarını içermez. Hesap silme aktif kayıtları kaldırır; kullanıcı indirmeleri/sağlayıcı yedekleri ayrı saklama sınırıdır.
- IndexedDB `draft:*`: henüz tamamlanmamış form/program taslakları; canonical kayıt değildir. Cihaz yedeği ve tam transfer zarfında ayrı `drafts/local_drafts` alanıyla korunur. Otomatik actual set sayılmaz.

## 23 Eylül 2026 ek alanlar

- `MediaObject.captured_date`: kullanıcı veya geçerli legacy `photos[].date`; yoksa null. `details`: görünüş, elle girilen weight_kg/waist_cm/note; `legacy_context` bilinmeyen kaynak metadata'yı korur. Dosya bytes/hash metadata düzenlemesiyle değişmez.
- `MediaObject.mime=model/gltf-binary`: kullanıcıya özel GLB, en fazla 8 MB; tüm export'ta base64+hash, restore'da aynı bytes. Yönetici dosya kütüphanesi bu kayıttan ayrıdır ve JSON dışında ayrıca indirilir.
- `lab_observations.comparator`: =, <, >, ≤, ≥ korunur. Eşitsizlik sonucu kesin sayı gibi normal/anormal sınıflanmaz.
- `ProgramExercise.target_range` ve `prescription_set_slots.target_range`: unit/minimum/maximum; gerçekleşmiş sete aralık veya tahmini tekrar kopyalanmaz.
- `alos-v2-transfer-text.canonical_text`: sunucunun özgün JSON metni, güvenli tam sayı sınırı dışındaki bilinmeyen değerleri tarayıcı yuvarlamasından korur. `pending_journal` ve `local_drafts` gerçekleşmiş kayıt değildir. RFC8785-SHA256 ve eski ALOS-JSON-SHA256 tanınır; bilinmeyen algoritma reddedilir.

## MongoDB V2 depolama sınırı — 23 Eylül 2026

Mevcut `v10` hesap/state koleksiyonları yerinde kalır. Yeni backend, `apps/api/alos/models.py` içindeki her tabloyu `alos_v2_<table>` koleksiyonuna eşler. UUID alanları metin, timezone içeren tarihler UTC ISO mikro-saniye biçiminde, JSON alanları kayıpsız JSON metni olarak tutulur. `alos_v2_schema` revision, `alos_v2_locks` transaction yazım kilidi ve `alos_v2_blobs` büyük özel içerik parçalarını tutar. Bunlar yeni sağlık ölçümü alanları değildir. Parçalar kaydın kendisiyle aynı transaction içinde yazılır/silinir; uzunluğu ve SHA-256 doğrulanır.

Eski MongoDB hesabından bu koleksiyonlara otomatik aktarım yoktur. Mevcut importer/restore alan eşlemesi korunur; hesap şifre özeti ve medya geçişi ayrıca doğrulanmadan canlı cutover yapılamaz. SQLAlchemy burada yalnız model/sorgu tanımıdır; Mongo backend SQL çalıştırmaz, SQLite'a çift yazmaz.
