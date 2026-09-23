# Athlete Life OS 2.0 çalışma sözleşmesi

- Ana şartname: `prompts/01_MASTER_PROMPT.md`. Kullanıcının 16 Eylül 2026 tarihli son talimatı bütün aşamaları ara onay beklemeden tamamlamaktır; önceki tek-aşama/görev sınırının yerini alır. Aşamaları sırayla, gerçek kabul kapılarını geçerek uygula; sıra ve kapsam `PLANS.md`, gerçek durum `STATUS.md`.
- Aşama 0 uygulama yeniden yazımı değildir. Canlı v10 hesaplı sürüm ve eski launcher farklı yollardır; bulguları karıştırma.
- Gerçek MongoDB/SQLite, kişisel yedek, fotoğraf ve GLB ile test yapma. Sentetik kayıt ve geçici veri klasörü kullan; `.env` değerlerini çıktıya alma.
- Eski rapor veya test adı başarı kanıtı değildir. Komut, kaynak commit, ortam, stdout/stderr ve exit code kaydet. Başarısız testi değiştirmeden önce nedenini açıkla.
- Uygulama testi için `PYTHON_DOTENV_DISABLED=1`, `STORAGE_BACKEND=sqlite`, `ACCOUNT_STORAGE_BACKEND=sqlite` kullan. Kişisel `backup-rehearsal.test.js` ve `private-package-browser.test.js` otomatik baseline kapsamı dışında.
- Kaynak gezintisi: `docs/architecture/CURRENT_SYSTEM_MAP.md`, `FEATURE_PARITY.md`, `LEGACY_DATA_MAP.md`. Yeni veri alanını haritaya ekle; bilinmeyen alanı sessizce atma.
- Ana veriye çift yazım yok. Aşama 1 ayrı PostgreSQL test DB/feature flag ile gelişir. Mevcut hesabın MongoDB kayıtlarını otomatik taşıma.
- Şema, yayın, hesap/medya göçü ve rollback etkisini her teslimde belirt. Ücretli kaynak ve üretim geçişi ayrı yetki ister; mevcut oturumdaki yetkiyi tekrar isteme.
- Spor modeli test başarısı klinik/biyolojik doğrulama değildir. Eksik veri UNKNOWN; çıkarımı ölçüm diye etiketleme.
- İnceleme artefact'ları `docs/evidence/stage-0/`. Yeniden üretim araçları `tools/stage0/`; bu dizinler mevcut HTTP statik allowlist'inde değildir.
