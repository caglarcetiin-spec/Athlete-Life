# Sentetik PDF görsel kontrolü

Kaynak: `tools/v2/revision_pdf.py`. Komut/çıkış/kaynak hashleri `../stage-9/revision-v2-pdf.json` ve logunda. Artefact: `synthetic-report.pdf`; SHA256 ve byte sayısı `pdf-check.json`.

İçerik: 90 tarih, 90 gerçek barbell seti (10 tekrar/60 kg/RIR2), 12 uzun Türkçe hedef; iki öğünde bilinen 400 kcal/15 g protein ve bir eksik protein. Gerçek kişisel veri yok.

Poppler ile tüm sayfalar PNG'ye çevrildi ve 11 sayfa görsel olarak incelendi. Türkçe ı/İ/ş/ğ/ü/ö/ç, uzun satır kaydırma, tekrar eden tablo başlıkları, 60 kg/10 tekrar/RIR2, 400/15/bilgi yok değerleri okunur. Başlığın önceki sayfada yalnız kalması ve kaynak URL'sinin ayrı sayfaya taşması düzeltildi. Son kaynak sayfası 11. sayfada bütün olarak yer alır. Taşma veya kırpılma gözlenmedi.

Render komutu (exit0):

```
/Users/caglarcetin/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/bin/pdftoppm -scale-to 800 -png docs/evidence/revision-v2/synthetic-report.pdf /private/tmp/alos-revision-pdf/verified
```

Kaynak bölümü düzenlemesinden sonra son iki sayfa aynı araçla `-f 10 -l 11 -scale-to 1000` kullanılarak tekrar render edilip incelendi. Önizleme/PDF aynı report_sections çıktısını kullanır; sağlık içeriği varsayılan kapalıdır. Bu kontrol görsel yazılım QA'sıdır, sağlık içeriği uzman onayı değildir.
