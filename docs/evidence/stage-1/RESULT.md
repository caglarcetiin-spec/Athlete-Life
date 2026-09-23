# Aşama 1 — ölçülmüş sonuç

16 Eylül 2026; `codex/alos-2-stage-0`; temel commit `e92b4b7`, V2 değişiklikleri henüz çalışma ağacında.

- Gerçek PostgreSQL 18.6, Python 3.12.14, macOS arm64, Node 24.19.0.
- `.venv-v2/bin/pytest -q tests/v2`: **9 PASS**, exit 0; `api-tests.log`. İki sentetik hesap, her test için ayrı DB ve Alembic migration. Commit öncesi/sonrası gerçek Python process SIGKILL; çakışma/tombstone/retry/ordered cursor/worker lease/CSRF/ownership/DST.
- `npm --prefix apps/web test`: **5 PASS**, exit 0; `client-tests.log`. Gerçek IndexedDB API emülasyonu üzerinde quota hatası, pending retention, 500/bozuk 200/401/hesap ayrımı; eski ACK sürüm birleştirme ve tarih bağlamı.
- `node tools/v2/browser_gate.mjs`: **PASS**, exit 0; `browser-results.json` ve `browser.log`. Gerçek Chrome 153, localhost HTTP + PostgreSQL, iki bağımsız context; 14–22 vardiya, structured öneri/onay, server SIGKILL + boş browser cache + login, offline kuyruk + sekme kapama, commit sonrası kayıp ACK + retry.
- 1360×980 masaüstü ve 390×844 mobil viewport; gerçek ekran PNG'leri. Mobil `axe` WCAG A/AA taraması: 0 ihlal. Gerçek iPhone/VoiceOver, WebKit/Firefox bu aşamada NOT RUN.
- TypeScript + Vite build ve ESLint exit 0. Python lint düzeltmeleri sonrası kalan hata yok. Paketlenmiş JS 348 KB, gzip 107 KB (başlangıç dilimi; performans SLO kanıtı değildir).

İlk koşumda ACK ve bootstrap zaman ofsetleri farklı çıktı; bağlantı UTC yapıldı ve aynı assertion geçene kadar tekrarlandı. İlk axe koşumunda hero metni 4.02 kontrast verdi; renk düzeltildi ve tekrar kontrol edildi. Hatalar gevşetilmedi.

## Sınır

Bu kapı vardiya dilimine uygulanabilen P/T/S satırlarını kapsar. Performed set idempotency henüz yok; W modülünde aynı protokol yeniden sınanacak. Bilim, bütün feature parity, gerçek kullanıcı migration ve cloud release tamamlanmış sayılmaz. V2 ayrı URL/DB/flag; legacy runtime ve gerçek MongoDB değişmedi.
