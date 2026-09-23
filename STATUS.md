# Güncel durum — 23 Eylül 2026

Kullanıcının tüm aşamaları ara onay beklemeden tamamlama talimatıyla çalışmaya devam ediliyor.

| Aşama | Gerçek durum |
|---|---|
| 0–4 | Kapsamı belirtilen kabul kapıları geçti; aşama raporları docs/evidence altında. |
| 5 | Deterministik model, kaynak takibi, rapor/PDF testleri geçti; klinik doğrulama yapılmadı. |
| 6 | Ana UX/PWA yolları ve 29 eski route karşılığı uygulandı. 61 backend/8 client, 68 route/tema/viewport, büyük yedek ve GLB kontrolleri geçti. Fiziksel iPhone/VoiceOver NOT RUN; nihai alt özellik incelemesi sürüyor. |
| 7 | Optional AI ve cihaz bağlantıları kapalı/yapılandırılmamış. Çekirdek LLM olmadan çalışır; harici AI testi yapılmış sayılmaz. |
| 8 | DEVAM EDİYOR: Render Blueprint resmi şemayla doğrulandı; native server smoke, gerçek yerel PG dump/restore ve 1000 kayıt/4 okuyucu performansı ölçüldü. Docker/CI ve Render staging bekliyor. |
| 9 | Nihai bağımsız release incelemesi bekliyor. |

Canlı v10/Render/MongoDB değişmedi. Gerçek hesap, sağlık verisi veya medya göçü yapılmadı. V2 halen ayrı, varsayılan kapalı. **Üretim geçişi NO-GO**: tüm kabul kapıları kapanmadı. Yeni hesap kurtarma ve dönem arşiv şemaları yalnız sentetik PostgreSQL testlerinde doğrulandı; yayınlanmadı.

Aşağıdaki eski tarihli bölümler çalışma geçmişidir; yukarıdaki tablo güncel durumu belirtir.

---

# Athlete Life OS 2.0 — güncel durum

## Aşama 0: tamamlandı

Çalışma dalı: `codex/alos-2-stage-0`. İncelenen runtime commit: `e92b4b736e9f4aa8bcd64103ec59b1aa6abf5297`.

Kullanıcının dört belgesi `prompts/` ve `reference/` içine değişmeden alındı. Ana şartnamenin ilk-görev sınırı uygulandı: keşif, gerçek test tabanı ve mimari geçiş planı. Uygulama kaynakları/DB şeması/gerçek kullanıcı verileri değişmedi; GitHub push, Render deploy, Atlas aktarımı yapılmadı.

### Kanıtlı teslimatlar

- [Mevcut sistem haritası](docs/architecture/CURRENT_SYSTEM_MAP.md): iki giriş yolu, API, persistence, motor bağımlılıkları, source index.
- [Özellik paritesi](FEATURE_PARITY.md): 29 route ve ek modal/alt işlev envanteri; current kanıt ile hedef durum ayrı.
- [Eski veri haritası](LEGACY_DATA_MAP.md): SQLite/Mongo/browser/backup/medya + domain alanları, unknown/date/duplicate politikası.
- [Riskler](RISK_REGISTER.md): stale overwrite, yanlış ACK hissi, kayıp yanıt retry, midnight ve test izolasyonu.
- [Test tabanı](TEST_BASELINE.md): **69 PASS / 4 FAIL / 2 NOT RUN** test giriş dosyası; yeni sentetik risk probları ve 29 anonim ekran.
- [ADR-0001](docs/adr/0001-modular-monolith.md), [0002](docs/adr/0002-storage-transactions-and-sync.md), [0003](docs/adr/0003-auth-and-offline-client.md), [0004](docs/adr/0004-deployment-and-migration.md).
- [Aşama 1 planı](PLANS.md), [kabul izlenebilirliği](REQUIREMENTS_TRACEABILITY.md), yeniden üretim araçları `tools/stage0/`.

### En önemli bulgular

1. Güncel hesaplı store eski revizyonu reddediyor; eski tek-kullanıcı store'da yeni seti düşüren overwrite tekrar üretildi. İki yol karıştırılmadı.
2. Güncel UI vardiya mesajı ACK beklemiyor. Kayıp ACK tekrarında idempotency yerine 409 var; farklı kayıtların eşzamanlı değişimi global snapshot çatışması yaratıyor.
3. Midnight bilinçli geçmiş tarih seçimini değiştiriyor. System Integrity sandbox'ı transport save yoluna ulaşabiliyor; bu düğme gerçek kayıtları koruyan izole test gibi kabul edilemez.
4. Güncel ayrı browser probunda vardiya + structured optimizer ikinci context'te ve server restart/fresh login sonrasında eşit kaldı.
5. Eski dört browser testinin onboarding selector'ları güncel akışa uymuyor; başarısızlıklar saklandı, PASS sayılmadı.

## Kabul kapısı

| Kapı | Durum |
|---|---|
| Gerçek dosya/özellik/veri haritası | PASS (kaynak ve anonim browser scope belirtilerek) |
| Riskler sınıflı ve önemli overwrite tekrar üretimi | PASS (riski bulma görevi; ürün riski çözülmüş değil) |
| Yeni ölçülmüş baseline + ham stdout/stderr/exit | PASS (başarısız testler dahil dürüst rapor) |
| Mimari kararlar ve Aşama 1 dosya/test planı | PASS |
| 2.0 uygulama / bütün acceptance matrix | NOT RUN |
| 2.0 release uygunluğu | NO-GO; henüz yeni çekirdek yok ve kritik açıklıklar var |

## Sonraki tek aşama

**Aşama 1 — giriş + vardiya + transaction ACK + yeniden açılış + ikinci cihaz.** React/TypeScript + FastAPI + PostgreSQL ayrı sentetik ortamda. İlk iş bağımlılıklar/gerçek PG test ortamı; sonra ADR-0002/3 kayıt protokolü. MongoDB üretim verisi mevcut kalır. Yeni science/grafik/AI Aşama 1 kapısını geçmeden eklenmeyecek.

## Geri dönüş

Bu görev yalnız belgeler ve audit araçları ekler; çalışma dalından ayrılmak uygulama davranışını eski haline döndürme gerektirmez, çünkü runtime değiştirilmedi. Yeni DB/veri migrasyonu yok. Sonraki aşamalarda rollback farklıdır ve PLANS/ADR-0004'te açıkça tanımlıdır.

# 16 Eylül 2026 — tüm aşamalar için devam talimatı

Kullanıcı bütün aşamaları ara onay beklemeden tamamlama yetkisi verdi. Yukarıdaki Aşama 0 görev sınırı artık güncel çalışma kapsamı değildir.

- Aşama 1: çalışan auth + PostgreSQL + küçük komutlar + idempotency + audit/change/outbox + IndexedDB pending + vardiya/hafta önerisi. İlgili kapı PASS; [kanıt](docs/evidence/stage-1/RESULT.md).
- Aşama 2: DEVAM EDİYOR — legacy staging/dry-run/import, tam export, izole restore.
- Aşama 3–9: sırayla yürütülecek; henüz tamamlanmadı.
- Canlı v10/MongoDB değişmedi; V2 geçiş kapıları kapanana kadar NO-GO.

## Aşama 2 sonucu

Kayıpsız arşivleme, staging/önizleme/onay, kişisel export, private fotoğraf, read-only SQLite çıkarımı ve bağımsız PostgreSQL restore tamamlandı. **16 backend testi PASS**, gerçek browser restore PASS. [Kanıt ve kapsam](docs/evidence/stage-2/RESULT.md). Legacy domain kayıtları arşivden erişiliyor; native adapter'lar sonraki domain aşamalarında tamamlanacak.

Aşama 3 DEVAM EDİYOR: program → değişmez reçete → tek gerçek set kaynağı → yeniden açılabilen Runner.

## Aşama 3 sonucu

Tek reçete ve actual set kaynağı, program sürümleme/onay, geçmiş seanslar, mobil Runner, timer, manuel/offline slot uzlaştırma ve structured legacy adaptörü çalışıyor. **24 backend + 5 client testi PASS**, gerçek mobil viewport golden journey PASS. [Kanıt](docs/evidence/stage-3/RESULT.md).

Aşama 4 DEVAM EDİYOR: beslenme, su, günlük sağlık, Capability, hedef ve sosyal/gerçek aktivite kayıt bütünlüğü.

## Aşama 4 sonucu

Beslenme/yiyecek/tarif, su, check-in/uyku/ağrı/sağlık kayıtları, Capability, hedef ve sosyal/gerçek aktivite modelleri ortak transaction ve offline protokolüne bağlı. 31 backend testi ve gerçek mobil/ikinci oturum akışı PASS. [Kanıt](docs/evidence/stage-4/RESULT.md).

Aşama 5 DEVAM EDİYOR: açıklanabilir, sürümlü hesaplar; 37 backend regression PASS. Rapor arayüzü ve PDF kontrolleri sürüyor.
