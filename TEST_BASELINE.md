# Gerçek test tabanı — Aşama 0

Kaynak commit: `e92b4b736e9f4aa8bcd64103ec59b1aa6abf5297`. Branch `codex/alos-2-stage-0`. Yeni eklenen araçlar ve belgeler bu commit üzerine çalışma ağacı değişiklikleridir; runtime dosyaları aynı. Eski raporların PASS sayıları kullanılmadı.

## Sonuç

**75 mevcut test giriş dosyası: 69 PASS, 4 FAIL, 0 BLOCKED, 2 NOT RUN.** Bunlar dosya/komut sayısıdır, assertion sayısı veya 2.0 kabul sonucu değildir. Bazı JS testleri birbirini require eder; bunlar bağımsız 69 senaryo diye sayılmaz. Bazıları yalnız kaynak metni kontrolüdür. Python HTTP testleri gerçek localhost/SQLite, Mongo testleri mongomock kullanır. Hepsi dışa aktarılmış stdout/stderr/exit code ile yeniden çalıştırıldı.

- [Tüm sonuçlar, komutlar ve süreler](docs/evidence/stage-0/baseline/results.json)
- Her komut için aynı dizinde `<test>.stdout.txt` ve `<test>.stderr.txt`; boş stderr dosyası da saklandı.
- Baseline runner toplam exit code **1**, çünkü dört test başarısız. Assertion/uygulama değiştirilerek yeşile çevrilmedi.
- `account-revision-browser.test.js`, `account-workspace-browser.test.js`, `accounts-browser.test.js`: eski `#setup-back`/`#sports-setup #setup-back` 30 sn timeout.
- `sports-profile-browser.test.js`: eski `#sports-setup` görünürlüğünde 30 sn timeout. Bu dört akış ileri adımlara ulaşmadı. Mevcut onboarding değişmiş; sonraki davranışlar bu testlerle doğrulanmış sayılmaz.
- NOT RUN: `backup-rehearsal.test.js` gerçek `.local-backups` okuyor; `private-package-browser.test.js` private seed/runtime bekliyor. Kişisel kayıtlar audit fixture'ı yapılmadı. Sentetik `private-delivery.test.py` çalıştı ve geçti.

## Ortam ve yeniden çalıştırma

Python/platform/Node tam sürümleri results.json'da; Chrome sürümü [browser observations](docs/evidence/stage-0/browser/observations.json) içinde. Local Chrome headless, 1280×900 desktop; mobile emulation 390×844, Europe/Istanbul, reduced motion. Gerçek iPhone değil. Kullanıcı profili/Chrome login oturumu kullanılmadı. `.env` yükleme devre dışı, hesap/state backend SQLite, geçici dizin; kişisel GLB browser request'leri engellendi.

```sh
.venv-modern/bin/python -B tools/stage0/run_baseline.py \
  --node /Users/caglarcetin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  --node-path /Users/caglarcetin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules
```

Farklı makinede iki runtime yolu yerel kurulumla değiştirilir. Browser testi localhost portu/Chrome process izni ister. Bağımlılığı olmayan test PASS sayılmaz. Runner dotenv disabled + backend override kullanır; canlı DSN gerektirmez. `--only` ve ayrı `--output` ile dar tekrar kaydı tutulabilir.

## Yeni risk deneyleri

| Deney / komut | Exit | Gözlem / kapsam |
|---|---:|---|
| `.venv-modern/bin/python -B tools/stage0/storage_probe.py` | 0 | Gerçek geçici SQLite legacy stale overwrite; hesaplı SQLite ve mongomock reddetti. Account lost-ACK retry conflict. [JSON](docs/evidence/stage-0/probes/storage.stdout.json) |
| `node tools/stage0/client_probe.js` (yukarıdaki Node) | 0 | Account transport gerçek kaynak VM; 500/503 cache koruma, 401 lock; invalid200 boş profil, kayıp ACK409, quota. [JSON](docs/evidence/stage-0/probes/client.stdout.json) |
| `NODE_PATH=<aynı node_modules> node tools/stage0/browser_probe.js` | 0 | Gerçek geçici hesaplı HTTP + Chrome; aşağıdaki akış. [stdout](docs/evidence/stage-0/probes/browser.stdout.txt), [stderr](docs/evidence/stage-0/probes/browser.stderr.txt), [ölçümler](docs/evidence/stage-0/browser/observations.json) |
| `.venv-modern/bin/python -B tools/stage0/inventory.py` | 0 | 282 izlenen dosya/133 kaynak/184 regex alan adayı. Domain false-positive'ları LEGACY_DATA_MAP'te ayrıldı. |

Storage/client exit=0 gözlemin assertion ile üretildiğini gösterir. Örneğin “legacy veri kaybını yeniden ürettik” **ürün için FAIL**'dir. Tam 2.0 matrisi [REQUIREMENTS_TRACEABILITY](REQUIREMENTS_TRACEABILITY.md)'de NOT RUN kalır.

### Gerçek tarayıcı yolu

1. Yeni sentetik “Deneme Sporcusu” UI signup; professional görünüm aynı synthetic state'te.
2. Dinamik 29 route açıldı, her route için viewport PNG; 29'u görünür, JS pageerror yok. Tam sayfa/modal/tema durum matrisi değil. Sayfaların çoğu boş kayıt durumunda.
3. API POST engelliyken Salı Çalışma/14–22: local toast “Vardiya planı kaydedildi”, transport pending=true. Bu çelişki yeniden üretildi.
4. Ağ geri → flush ACK → optimize 7 structured row → ikinci ayrı browser context/login. scheduleByDate ve weekOptimizations eşit.
5. Sunucu process sonlandır/yeni process aynı geçici SQLite → cache'siz üçüncü context/login. Aynı vardiya ve optimizasyon korundu. Canlı Render restart testi değil.
6. Actual midnight callback'ine kontrollü takvim enjekte edildi: seçili 2026-09-10 → 2026-09-17. Geçmiş bağlam koruması FAIL; kayıt silindi iddiası yok.
7. Sentetik hesaptaki SystemIntegrity çalıştırıldı; transport push spy ile 4 sandbox save yakalandı. finally raw state memory eşit; bu, IDB/outbox izolasyonu kanıtı değil. İçeride 113 kontrolün 1'i (`DB Hammer Curl başlangıç yükü`) başarısız; yeni matrise PASS aktarılmaz. Sabit başlangıç yükü beklentisinin profil/default bağlamıyla ilişkisi ayrıca incelenmeli; bu assertion değiştirilmedi.

### Görsel referans

29 route görüntüsü `docs/evidence/stage-0/browser/` içinde. Login, today-mobile ve week-offline ek görüntüleri var. week-offline, today-mobile, workspace-plan, training, health-labs görselleri ayrıca açılarak incelendi. Görünen sorun: week date input dar, mobile header büyük, bottom nav kaydırılabilir içeriğin üzerinde. Bu gözlem WCAG/kontrast ölçümü değil.

## Çalıştırılmayanlar / kapsam sınırı

| Alan | Durum / gerekçe |
|---|---|
| Yeni React/FastAPI/PostgreSQL schema/typecheck/lint/e2e | NOT RUN; Aşama 1 kaynakları henüz yok. Bu aşama onları üretmiyor. |
| Gerçek PostgreSQL transaction/kill/cursor/worker | NOT RUN; ayrı PG test ortamı henüz yok; Docker/psql PATH'te bulunmadı. |
| Gerçek MongoDB/Atlas majority, failure, production HTTP | NOT RUN; canlı veriye test uygulanmadı. Mongo mock testleri ayrı etiketli. |
| Gerçek kişisel migration ve bağımsız restore/RPO/RTO | NOT RUN; kişisel kaynak okunmadı, yeni format/importer henüz yok. |
| WebKit/Firefox, gerçek iPhone/VoiceOver, WCAG AA | NOT RUN; Chrome gözlemi bunların yerine geçmez. |
| Tam offline app reopen/session-expiry/SW-update crash | NOT RUN; bu probe yalnız açık sekmede POST kesintisini kullandı. |
| Biyolojik geçerlilik/evidence registry review | NOT RUN; clock/recovery yazılım testleri klinik sonuç kanıtı değil. |
| Performance p95 / uzun oturum / container build | NOT RUN; kısa functional probe benchmark değildir. |

Runtime kusurları bu görevde düzeltilmedi. Testler current v10 baseline ve yeniden üretilebilir geçiş girdisidir; 2.0 release kapısı değildir.
