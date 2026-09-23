# ADR-0001 — Modüler monolit ve evrimsel geçiş

Durum: Aşama 0 tasarım kararı; uygulanmadı. Dayanak: [mevcut harita](../architecture/CURRENT_SYSTEM_MAP.md), RSK-01..10. Şartname varsayılanı korunur.

## Karar

React + TypeScript + Vite arayüz; FastAPI + Pydantic HTTP sınırı; SQLAlchemy repository ve Alembic migration; PostgreSQL authoritative kayıt deposu. Identity, AthleteProfile, Scheduling, Programming, WorkoutExecution, NutritionHydration, RecoveryAnalytics, Capabilities, Evidence, Backups, Integrations tek deployable modüller. Domain fonksiyonları saf, clock/repository dışarıdan verilir. OpenAPI'den TypeScript istemci üretilir; API/domain versiyonları ayrılır.

Mevcut global db kaynak/hikâye kataloğu olarak korunur. Yeni işler `apps/web`, `apps/api`, `contracts`, `tests` altında **çalışan ilk dilimle birlikte** eklenir. Aşama 0 boş scaffold üretmez. Business rules backend otoritesindedir; browser önizlemesi geçici ve sürümlü, offline görünüm son onaylı kayıttır.

## Alternatifler

| Seçenek | Kazanç | Neden seçilmedi / sınır |
|---|---|---|
| Mevcut vanilla JS + ThreadingHTTPServer + Mongo snapshot | Hızlı küçük UI düzeltmesi, mevcut deployment | global snapshot/idempotency/typed contract/aynı entity transaction sorunu sürer. |
| MongoDB üzerinde normalize domain belgeleri + transaction | Canlı kaynakla aynı teknoloji | Teknik olarak mümkün; hatanın sebebi MongoDB değil. Yine command/outbox/ownership/data migration gerektirir; bu aşamada daha düşük riskli denetlendiğine dair kanıt yok. Şartname PostgreSQL seçimini değiştirecek gerekçe yok. |
| FastAPI + normalize PostgreSQL + mevcut frontend'in tümünü bir anda değiştirmek | Tek hedef tasarım | Parity/gerçek kayıt kaybı riski; aşamalı dikey dilim seçildi. |
| Mikroservis/event-sourcing/Kafka | Gelecek ölçek | Ölçülmüş gereksinim yok; transaction ve işletimi gereksiz zorlaştırır. |

## Sonuç / doğrulama

MongoDB şimdi değiştirilmez. Ayrı sentetik PostgreSQL veritabanında Aşama 1; gerçek taşıma Aşama 2/8 kapılarından sonra. Framework seçimi doğruluk kanıtı değildir. Sürümler Aşama 1 uygulama tarihinde uyumluluk + resmi docs ile belirlenip lockfile'a sabitlenecek; bu doküman test edilmemiş sürüm numarası vermez.

Resmi referanslar, erişim 16 Eylül 2026: [FastAPI özellikleri](https://fastapi.tiangolo.com/features/) OpenAPI/JSON Schema üretimini; [Vite rehberi](https://vite.dev/guide/) geliştirme/build araç zincirini açıklar. Bunlardan uygulama concurrency garantisi çıkarılmadı.
