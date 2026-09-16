# Sağlık raporu

Sağlık → Sağlık raporu: dönem seç, önizle, PDF indir. Son 30 ve 90 gün
kısayolları bulunur. Tarihler GG.AA.YYYY olarak girilir; en fazla 366 gün seçilir.

## Kapsam

- A4 özet: profil adı, dönem, kayıtlı gece sayısı, ortalama net uyku süresi,
  bildirilen uyku kalitesi ve eksik günleri boş bırakan uyku grafiği.
- Kan tahlilleri: aynı test, birim, laboratuvar, yöntem, açlık ve referans
  sınırlarına göre oluşturulan serilerin son değerleri. Önceki değer, seçilen
  dönemdeki önceki farklı gündür. Bilinmeyen koşullar eşdeğerlik kanıtı değildir.
- Özet en fazla 12 seri gösterir; uzun metinlerde daha az satır sığabilir.
  Gösterilmeyen seri sayısı hem önizlemede hem PDF'te belirtilir.
- “Tüm tahlil sonuçlarını ek sayfalara ekle” seçeneği, dönemdeki tüm geçerli
  ve arşivlenmemiş ölçümleri ekler. Ekli çıktı en fazla 1000 ölçüm içerir.
- Eksik geceler sıfır sayılmaz. Eksik referans veya `<`, `>` gibi sınırlı
  sonuçlara normal/anormal yorumu atanmaz. Referans etiketleri tanı değildir.
  Geçersiz raporlar dışlanır ve veri havuzundaki dışlanan rapor sayısı gösterilir.

## Veri ve güvenlik

PDF yalnız giriş yapılmış hesabın sunucuda kayıtlı verilerinden oluşturulur.
Oturum, hesap kimliği, CSRF ve veri revizyonu kontrol edilir. Eşitlenmemiş veri
varsa önce eşitleme gerekir; önizlemeden sonra veri değişirse yeniden önizlenir.
Rapor oluşturma kayıtlara veya revizyon geçmişine yazmaz.

Üretim bellekte yapılır; sunucuda PDF saklanmaz, dış servise veri gönderilmez.
Yanıt `no-store` ve indirme başlığı taşır. Kullanıcının indirdiği dosyayı
paylaşması kendi kontrolündedir. PDF, asıl laboratuvar raporunun yerine geçmez.
Kaynak: [NIH / MedlinePlus](https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/).

Türkçe karakterler için pakete dahil Liberation Sans kullanılır; SIL OFL lisansı
`assets/report-fonts/LICENSE_LIBERATION` içindedir. ReportLab üretim bağımlılığıdır.

## Doğrulama

```sh
python -m pip install -r requirements-dev.txt
python health-report.test.py
ACCOUNT_STORAGE_BACKEND=sqlite python accounts.test.py
ACCOUNT_STORAGE_BACKEND=sqlite python cloud-http.test.py
node --check health-report-ui.js
```

Model/PDF testleri: eksik veri, koşullara uygun geçmiş karşılaştırması, küçük
sayılarda hassasiyet, Türkçe karakterler, tek sayfa sınırı, uzun alanlar ve eklerin
eksiksizliği. Node parity testi için gerekirse `ALOS_TEST_NODE` ayarlanabilir.
HTTP testleri SQLite ve MongoDB taklidiyle hesap yalıtımını, CSRF'yi, eski revizyonu
reddetmeyi ve raporun kayıtlara yazmadığını doğrular. Testler gerçek sağlık verisi
kullanmaz. `--fixtures` sentetik PDF'leri Git dışında tutulan `tmp/pdfs` içine yazar.
