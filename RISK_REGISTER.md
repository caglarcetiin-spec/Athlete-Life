# Risk kaydı — Aşama 0

Kaynak e92b4b7, sentetik çalışma. **2.0 release kararı: NO-GO; Aşama 1 geliştirmesine geçilebilir.** Bu karar çalışan eski ürünü kapatma talimatı değildir. Çalıştırılmış risk deneyinin exit=0 olması riski geçtiğimiz değil, gözlemi yeniden ürettiğimiz anlamına gelir.

| ID / önem | Bulgu / doğrulama türü ve dayanak | Etki / en küçük sonraki adım | Kabul |
|---|---|---|---|
| RSK-01 Kritik | `sqlite_store.py:77 commit_state` eski snapshot'ı kabul ediyor; storage_probe gerçek geçici SQLite: set-b live state'ten düştü, rev2'de kaldı. `launch.py:36` bu yolu kullanır. | Legacy yolu public deployment'a sokma; yeni API'de entity expected_version. Güncel hesaplı yol CAS koruması ayrı testte doğrulandı. | P-03/04, INV-02 |
| RSK-02 Yüksek | `app.js:326` vardiya mesajı ACK beklemiyor; browser observations week_offline pending=true. | Kullanıcı uzak kayıt var sanabilir. Tüm formlar local-only/synced/conflict/error kullanmalı. | INV-01, P-01/15 |
| RSK-03 Yüksek | `account_states.py:65/113`, `account-sync.js:50`: kayıp ACK sonrası aynı snapshot retry 409. VM/store deneyinde yeniden üretildi. | İdempotency anahtarı + payload digest + saklanan yanıt aynı transaction'da; kullanıcıyı sahte conflict'e düşürme. | P-05/06/08 |
| RSK-04 Yüksek | Global snapshot CAS bağımsız set/vardiya değişimini birleştirmiyor. Store probe A seti koruyor, B vardiyası commit olmuyor. | Veri sessiz ezilmiyor fakat ikinci cihaz manual export ile çözmek zorunda. Entity komutu/PATCH + alan konflikti. | P-03/04/N-06 |
| RSK-05 Yüksek | `account-sync.js:35` 200 `{}` yanıtını yeni profile çeviriyor. VM cached marker kaybını gösterdi; 500/503'te cache korundu. | Bootstrap schema + explicit empty_account sözleşmesi; bozuk yanıtta cache/pending koru, hata göster. | P-15 |
| RSK-06 Kritik | `system-integrity-engine.js:28/53/272` global db değiştiriyor. Gerçek tarayıcı sentetik hesapta `ALOSServerSync.push` sınırı yakalandı: 4 sandbox save girişimi; finally memory geri geldi. Gönderimler testte intercept edildi. | Canlıya gerçekten yazıldı iddiası yok; test izolasyonu yok. Saf immutable fixture/process; Aşama 1 yeni arayüzde test butonunu gerçek save yoluna bağlama. Mevcut üründe bu düğme güvenli test kanıtı sayılmamalı. | INV-13, R-10 |
| RSK-07 Yüksek | `app.js:2758` midnight bilinçli seçili 10 Eylül'ü 17 Eylül'e çevirdi. Actual callback, kontrollü saat browser probe. | Geçmiş düzenleme bağlamı kaybolur. today-follow flag + selectedDate ayrımı; midnight/DST/clock injection testleri. | T-02, INV-07 |
| RSK-08 Yüksek | İki execution modeli: canonical date-keyed guided ve TrainingPlanner activeWorkoutRun; source inspection `canonical-session-engine.js:76`, `training-planner-core.js:121`. | Aynı gün çoklu seans, manuel/guided slot eşleştirme ve ilk set lock DB'de ortak değil. Tek performed_sets ve prescription slot ID'leri Aşama 3. | W-01..07 |
| RSK-09 Yüksek | `durable-persistence.js:26` local snapshot/IDB/pending ayrı yazılıyor; IDB mirror hatası loglanıyor, push hatası catch ediliyor. VM outbox quota throws. | Crash/quota atomikliği kanıtlı değil; tek IndexedDB snapshot+outbox transaction. ACK sonrası sıra sil; lease/retry. | P-07/09/11/12 |
| RSK-10 Yüksek | `backup-vault.js:103/147/269` client snapshot/events/photos ayrı toplanıyor, heuristic merge var; pending/manifest/snapshot transaction yok. Kaynak incelemesi. | Tam ve doğrulanmış restore garantisi verilemez. Aşama 2 migration-map + canonical/pending ayrımı + bağımsız restore. | M/B ailesi |
| RSK-11 Yüksek | Recovery clock testleri PASS; `app.js:1782/1813/1832` as_of/model/input lineage tam sözleşme değil, 8 günlük context ortalaması ve ETA heuristic. | Tarihsel karar ile bugünkü yeniden hesap ayrılmalı. Sayısal doğruluk biyolojik geçerlilik değil; model card/review Aşama 5. | R-01..06/09 |
| RSK-12 Orta | `account_server.py:153` replacement SW cache temizler; offline shell yok. Browser full-offline reopen/Safari NOT RUN. | Açık sekmede local kayıt ile kapalı uygulamayı offline başlatma farklı; Aşama 6 owned app-shell. | U-03/04 |
| RSK-13 Yüksek | `account_server.py:177` signup public; `:162` GLB dahil ortak assets authenticated hesaplara açık. Statik bulgu; kişisel GLB görülmedi. | Davetli kayıt, asset ownership/lisans denetimi; kullanıcıya özel model private medya olmalı. | S-01/05/06 |
| RSK-14 Orta | Mevcut 4 tarayıcı testi eksik `#setup-back` selector'ında fail; `account-workspace-browser.test.js` 5 grup bekliyor, şimdi 7 var. Ham stderr saklandı. | Test bakım açığı; bütün davranışların bozuk olduğu kanıtı değil. Eski assertions silinmeden yeni onboarding e2e'leri Aşama 1/6'da kurulmalı. | U-06/test gate |
| RSK-15 Orta | `BASLA.md`/DEVELOPMENT runtime/15-char geçmiş yönergeler; source/package sürümleri değişik. `render-start.test.py` dar test PASS. | Sürüm ve teslim metinleri tek release manifest'ten; lockfile/build/container Aşama 1/8. | O-01/03 |
| RSK-16 Orta | 29 desktop route screenshot, 1 mobile: viewport taşması yok; week date input dar, mobile header önemli alanı kaplıyor, alt nav içeriğin üzerinde. Görsel örnekler doğrulandı. | Tam WCAG/keyboard/VoiceOver/gerçek iPhone testi yok; görünümü koruyup Aşama 6 ölçümlerle düzelt. | U-01/02/05 |

## Referans audit ile karşılaştırma

- Eski overwrite yeniden üretildi; hesaplı SQLite/mongomock aynı stale yazımı reddetti.
- Eski “server-sync eski hata yeni pending'i ezer” iddiası güncel `pending=pending||payload` koduna koşulsuz taşınmadı. Account edition pending'i ACK'e kadar saklıyor.
- Disk service worker artık API cache dışlaması içeriyor; account edition daha da farklı worker sunuyor. Eski cache riskini güncel doğrulanmış cross-account sızıntı diye raporlamıyoruz.
- Canonical/Program/Coordinator mevcut. “Dosya yok, motor yok” sonucu çıkarılmadı. Bununla birlikte global state ve paralel Runner yolları kalıcı domain transaction'ı yerine geçmiyor.

Her riskin yürütülebilir kanıtı veya statik doğrulama sınırı [TEST_BASELINE](TEST_BASELINE.md) içindedir. Çözüm bu aşamada üretim koduna uygulanmadı; Aşama 0 şartnamesi keşif/test/plan ile sınırlıdır.
