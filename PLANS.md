# Athlete Life OS 2.0 — aşamalı uygulama planı

## Şimdi

**Aşama 0–6 kapsamlı yerel kanıtları mevcut; optional 7 kapalı; Aşama 8 yayın/kurtarma hazırlığı sürüyor; 9 bekliyor.** Referans commit e92b4b7; çalışma `codex/alos-2-stage-0`. Yeni V2 ayrı dizinlerde ve ayrı sentetik PostgreSQL ortamında gelişiyor. Canlı v10 runtime ve gerçek kullanıcı kayıtları değişmedi. Güncel sonuçlar STATUS.md; aşağıdaki ilk dilim planı tarihsel plan olarak korunuyor.

Öncelik: kayıt bütünlüğü → zaman/Runner → migration/restore → açıklanabilir modeller → UX → opsiyonel AI. Aşamalar bu görev içinde sırayla, kanıtlı kapılarla ilerler. Önceki aşamada kritik açık varsa sonraki görsel/bilimsel özelliklere ilerleme yok. Kaynak belgeler `prompts/`; eski audit `reference/` altında değişmeden saklandı.

## Aşama 1 — ilk çalışan dikey dilim

Kullanıcı yolu: **giriş → hafta seç → Salı 14–22 vardiyası → ACK → optimize et → yeniden aç → ikinci cihaz**. Çevrimdışı düzenleme ve çatışma da bu dilimin parçası. Boş demo/yalnız scaffold kabul edilmez. Eski MongoDB verisi okunup değiştirilmeyecek; ayrı test DB ve synthetic iki kullanıcı.

### Ön koşul ve kararlar

- ADR-0001..4 hedef stack'i belirler. Mevcut ortamda Node runtime/Python/Chrome var; Docker/psql PATH'te yok, FastAPI/SQLAlchemy/Alembic mevcut Python ortamında yok. İlk adım izole V2 dev ortamı ve gerçek PostgreSQL test veritabanı sağlamaktır. Canlı DSN testte kullanılamaz; fixture bootstrap prod benzeri DSN'de reddeder.
- Paket sürümlerini resmi dokümanlarla uygulama tarihinde doğrula, lockfile oluştur. Aşama 0 hiçbir hedef dependency kurmadı; deployment komutu test edilmeden “hazır” yazma.
- ALOS_V2_ENABLED default-off; ayrı V2 server/dev origin. Mevcut start_render.py, hesap DB'si ve root frontend aynı kalır. Yeni domain yazımı legacy `/api/state` üzerinden yapılmaz.
- İlk dilimde render açılışı salt okuma. System Integrity benzeri testlerin canlı persistence erişimi olamaz. Legacy servis test butonunu yeni arayüze taşıma.

### Uygulanacak dosyalar ve amaç

| Dosya / dizin | Teslimat |
|---|---|
| `apps/api/pyproject.toml`, kilit dosyası | FastAPI/Pydantic/SQLAlchemy/Alembic/test/auth bağımlılıkları |
| `apps/api/app/config.py`, `main.py` | Ayrı environment, fail-closed DSN, v2 flag, health/readiness, same-origin static dist |
| `apps/api/app/security/{sessions,csrf,ownership,passwords}.py` | Mature library temelli hash/session; davetli/signup kontrollü; iki sentetik hesap |
| `apps/api/app/domain/scheduling.py`, `clock.py` | Tarih, timezone, gece vardiyası, custom/off/annual/social, saf doğrulama |
| `apps/api/app/services/{commands,scheduling,optimization,sync}.py` | Komut transaction, revision-tagged optimizer, bootstrap/pull sözleşmesi |
| `apps/api/app/repositories/{models,unit_of_work,scheduling,operations}.py` | Owner-scoped gerçek SQL sorguları, kilitler, idempotency ve tombstone |
| `apps/api/app/api/{auth,shifts,optimizations,sync,errors}.py` | `/api/v2` endpoint'leri ve makinece okunabilir Türkçe hatalar |
| `apps/api/app/workers/outbox.py` | DB lease/ack/retry; gereksiz harici broker yok |
| `apps/api/alembic/versions/0001_identity_scheduling.py` | users/sessions/athletes/memberships/shifts/optimizations/idempotency/audit/change_log/outbox |
| `contracts/openapi/v2.json`, `packages/generated-client/` | Çalışan backend'den üretilmiş sözleşme ve typecheck |
| `apps/web/{package.json,package-lock.json,vite.config.ts,tsconfig.json}` | Reproducible React/TS build; mevcut tema token'ları referans |
| `apps/web/src/api/client.ts`, `sync/{db,outbox,consumer,conflicts}.ts` | Per-user/env IDB transaction, lease, same-op retry, session expiry koruması |
| `apps/web/src/features/{auth,scheduling}/` | Login/hafta/dirty-field form/Kaydet/Optimize/sonuç/çatışma |
| `apps/web/src/components/SyncStatus.tsx`, `features/scheduling/routes.ts` | Seçili tarih/hafta URL state; pending/synced/error erişilebilir durum |
| `infra/compose.test.yaml`, `.env.example` V2 bölümü | Yalnız sentetik PostgreSQL, healthcheck, dedicated test DSN; secret yok |
| `tests/{unit,contract,integration,e2e}/` | Aşağıdaki gerçek kanıtlar; izole fixture teardown |

### Minimum şema / endpoint sözleşmesi

- `shifts`: id UUID, athlete_id, local_date DATE, timezone, status, start_local/end_local, resolved UTC interval, version, updated_at/deleted_at. Gece vardiyası next-day end açık. DATE'i UTC midnight'a zorla çevirmeme.
- `optimization_runs/items`: week_start, algorithm_version, input_sequence, input references, proposed windows, status (`proposed/accepted/stale`), approval. Yeni vardiya eski sonucu silmez; stale işaretler. Save ve optimize ayrı komut.
- `idempotency_keys`: owner/op unique, command/payload digest + canonical response. `athlete_sync_sequence` commit-ordered cursor. `change_log`, `audit_records`, `transactional_outbox` command commit'inde. PII minimum.
- `/api/v2/me`, `/shifts?week=`, `/optimizations?week=`, `/sync/bootstrap`, `/sync/push`, `/sync/pull?cursor=`. HTTP 401/403/409/422/429/503 typed; 200 invalid/null schema asla yeni hesap sayılmaz.
- dirty PATCH yalnız değişen alanı taşır. Farklı günler bağımsız; aynı vardiya version çatışması görünür. Form açılışı veya week navigation otomatik örnek/default kayıt yazmaz.

### Kabul ve test dosyaları

| Test | Koşul / kabul |
|---|---|
| `tests/integration/test_shift_transactions.py` | P-01/03/04/N-06: iki connection, farklı entity ikisi kalır; aynı entity bir success/bir visible conflict |
| `tests/integration/test_idempotency.py` | P-05/06: aynı op 10 retry tek etki; farklı payload 409; lost ACK aynı yanıt |
| `tests/integration/test_crash_commit.py` | P-08: subprocess failpoint precommit rollback / postcommit read + retry, gerçek PostgreSQL |
| `tests/integration/test_sync_cursor.py` | P-13/14: silme+stale update, ters başlangıç/commit sıraları; hiçbir committed change atlanmaz |
| `tests/integration/test_identity_isolation.py` | S-01/02/03: iki sentetik kullanıcı; owner spoof, cross FK, revoked session, CSRF/throttle; export henüz yoksa kapsam açık |
| `tests/unit/test_scheduling_time.py` | T-01..04 başlangıç dilimi; 22–06 süre; Europe/Istanbul ve DST synthetic zone |
| `tests/contract/test_generated_client.py` | OpenAPI/schema/typegen drift; 200 bad shape/empty account ayrımı |
| `tests/e2e/shift-journey.spec.ts` | UI gerçek input → ACK → optimizer → process restart → tüm cache sil/yeni login → aynı değer; ikinci context |
| `tests/e2e/offline-queue.spec.ts` | P-07/09/10: IDB quota abort, outbox transaction sonrası tab kill, delayed responses; pending doğru |
| `tests/e2e/auth-offline.spec.ts` | P-11/12: offline expiry, yeniden login, başka kullanıcı; kuyruk export/keep ve izolasyon |
| `tests/e2e/bootstrap-errors.spec.ts` | P-15: 500/401/timeout/malformed200; cache/pending korunur, default yazılmaz |
| `tests/e2e/date-context.spec.ts` | T-01/02/03: clock midnight, geçmiş seçim sabit, selectedDate ve actual date ayrı |
| `tests/integration/test_outbox_lease.py` | Lease expiry/retry/dead-letter, worker crash tek mantıksal etki |

Çalıştırma sırası: pinned dependency install → isolated test DB migrate → lint/typecheck → unit/contract → real PG integration → Chrome e2e → build/start smoke. Kesin komutlar dosyalar var olup çalıştırılınca TEST_BASELINE/STATUS'a yazılacak. Bu tablodaki dosyalar henüz yok, testleri NOT RUN.

### Aşama 1 kapısı ve rollback

P-01..15 ve T-01..04/S-01/S-02'nin vardiya dilimine uygulanabilir bölümleri çalıştırılmış kanıtla PASS. Set/öğün komutu henüz olmadığı yerde generic idempotency sözleşmesi denenir, gerçek workout/nutrition kabulü tamamlandı denmez. PostgreSQL yoksa SQLite ile PASS'e çevrilmez. Görsel tasarım veya science eklemeden kapı kapatılır. Flag kapalıyken V1 değişmediği regression ile; flag açıkken yalnız V2 test/staging DB'si. Rollback dev flag + ayrı uygulama durdurma; veri silme değil.

## Sonraki aşamalar (bu görevde yapılmadı)

| Aşama | Giriş / çıkış kapısı | Risk / veri etkisi |
|---|---|---|
| 2 | İlk dilim PASS → kaynak readonly format adapters + idempotent migration + isolated export/restore; M/B | Gerçek import ayrı kontrollü işlem; unknown/medya kaybı varsa dur |
| 3 | Veri korunması → tek prescription/slot/performed_set/Runner, W/T golden journey | Aynı gün iki seans, geçmiş active/timer ve manual reconciliation |
| 4 | Ortak protokol → beslenme/su/check-in/Capability, N/C | Eksik=UNKNOWN, snapshot macros, unit/protocol |
| 5 | Ham kaynak stabil → evidence registry, model cards, clock/as_of/lineage, R | Bilimsel review yazılım testinden ayrı |
| 6 | Domain akışları → 29 görünüm/alt özellik paritesi, erişilebilir UX/PWA, U | Gerçek iPhone checklist; eksik işlevi gizleyerek geçme |
| 7 | Core kapıları + açık seçim → opsiyonel read-only AI/adapters, A | Token/consent yoksa disabled; core LLM'siz |
| 8 | M/B/S/O + parity → test edilmiş Render staging ve restore, onaylı cutover | Ücretli resource/prod etkisi ayrı yetki; ölçülmüş RPO/RTO |
| 9 | Tüm kanıt → bağımsız release incelemesi GO/CONDITIONAL/NO-GO | Bu görevde bağımsız reviewer çalıştırılmadı |

Bu tarihsel ilk dilim planından sonra yürütme kapsamı aşağıdaki kullanıcı talimatıyla genişletildi.

## Güncel yürütme kararı

Son kullanıcı talimatıyla tüm aşamalar tek devam eden iş olarak yürütülüyor. Aşama 1'in dar kabul kapısı geçildi (`docs/evidence/stage-1/RESULT.md`). Aşama 2→3→4→5→6→7→8→9 sırası ve veri/güvenlik kapıları korunur; devam için yeniden kullanıcı onayı istenmez. Üretim geçişi yalnız veri/özellik/restore kapıları kapandığında yapılabilir.
