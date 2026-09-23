# ADR-0004 — Same-origin dağıtım, tek yazıcı ve rollback

Durum: tasarım. Render/Atlas/GitHub canlı güncellemesi yapılmadı; Aşama 0 sadece doküman ve sentetik test ekler.

## Hedef dağıtım

Tek web service, React build çıktısı + FastAPI `/api/v2`; frontend build sırasında Node, runtime Python. PostgreSQL authoritative; credentials yoksa fail closed. Public liveness kişisel bilgi içermeyen process kontrolü, readiness DB/schema/API compatibility kontrolü. ASGI production server `0.0.0.0:$PORT`. Schema tek controlled migration job, web worker başlangıcında otomatik migration yok. Media private object storage, signed expiry + owner kontrolü; gerekmeden worker/ücretli servis yaratma.

Aşama 1 yerel/dev V2 flag default-off, izole DSN ve isim alanıyla çalışır. Mevcut `start_render.py`/Mongo yolu aynı kalır. Ayrı port/test origin V1 storage'ına erişim sağlamaz. V2'ye taşınmayan route gizlenerek parity sağlandı sayılmaz. Eski ürün prod'da tek yazıcı, V2 sadece sentetik ortamda yazıcıdır.

Aşama 8 Docker/build/compose/Render Blueprint gerçek smoke testlerinden sonra final komutlar ve maliyet/plan/backup belgelenir. Şimdi Render planının PostgreSQL/PITR desteği, fiyatı veya RPO garanti edilmedi. N/N-1 API compatibility + minimum client version; uyumsuz istemcinin pending journal'ı korunarak update istenir. Deploy active Runner veya outbox silmez.

## Taşıma / cutover

[LEGACY_DATA_MAP](../../LEGACY_DATA_MAP.md) bütün kaynak formatları ve domain alanlarını belirler. İlk adapter readonly snapshot; source digest + stable legacy mapping. Dry-run → staging import → semantic counts/checksums → UI roundtrip → bağımsız restore → kullanıcı kontrollü cutover. Yeni veriyle eski sistemin kör double-write etmesi yok. Kimlik, fotoğraf, aktif seans ve pending mutation'lar ayrı migration riskleridir.

Rollback: cutover öncesi flag kapatılabilir; sonra yeni commit edilmiş veriyi koru. Reverse adapter doğrulanmadıysa eski snapshot'a overwrite değil read-only veya forward-fix. Mongo kaynak son doğrulanmış snapshot ve retention ile korunur. Kişisel export filtreli athlete verisi; tüm kullanıcı DB dump'ı yerine kullanılamaz.

Normal restart ACK koruması, browser outbox, revizyon geçmişi, personal export ve bağımsız felaket yedeği ayrı garantiler. İzole restore'da gerçek ölçülen RPO/RTO olmadan kurtarma hedefi geçti denmez. M/B/O kapıları Aşama 2/8'e bağlı.
