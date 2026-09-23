# Aşama 8 — operasyon kanıtı, 23 Eylül 2026

Kaynak: `911e889cf006bcd52701074415690badc2da37d2`. GitHub run [35806086944](https://github.com/caglarcetiin-spec/Athlete-Life/actions/runs/35806086944): core ve container SUCCESS. `ci-911e889.json` gerçek job ve adım sonuçlarıdır. Önceki run 35805444032 FAIL olarak korunur; ilk bootstrap öncesi restore düğmesi ve yanlış archive selector düzeltildi.

- Ubuntu 24.04/Python 3.12/Node 24/PostgreSQL 18: Python lint, 61 API testi, şema drift, client test/lint/build ve beş gerçek Chromium kullanım yolu geçti.
- Gerçek Docker Compose build → PostgreSQL → migration → web readiness → statik kök → özel `.env` yolunda 404 geçti (O-01).
- Yerel native fail-closed/start/shutdown kontrolü geçti; eksik DB durumunda fallback yok (O-02).
- Yerel gerçek pg_dump/pg_restore bütün tablo sayı/hash karşılaştırması geçti. Dump sonrası yeni fixture yazısı yok; ölçüm cloud PITR/RPO değildir (B-06 kapsamı).
- Worker lease, eski client schema, sahiplik, CSRF, import/media kısıtları API testlerinde sınandı. Üretim deploy overlap ayrıca yapılmadı.
- 1000 kayıt/4 okuyucu performansı ölçüldü. Uzun gerçek kullanıcı oturumu ve yıllarca geçmiş kapasitesi ölçülmedi (O-05 kısmi).

**Render staging NOT RUN.** Kaynak/Blueprint hazır; mevcut connector Docker Blueprint uygulayamıyor, yerel Mac kilitli olduğu için Dashboard erişimi kullanılamadı. Kalıcı ücretli PostgreSQL planı yetkilendirilmedi. Free DB 30 gün süreli; kişisel kayıtların kalıcı deposu olarak seçilmedi. Mevcut Render/MongoDB değişmedi.

V2 şeması ayrı PostgreSQL'e aittir. Gerçek hesap/medya göçü yok. Rollback genişletilmiş şemayı tutan eski V2 image veya ayrı DB restore ile yapılır; eski MongoDB'ye ters yazım yok. Tam üretim kabulü henüz tamamlanmadı.
