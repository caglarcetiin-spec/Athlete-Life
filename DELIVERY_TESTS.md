# Teslim doğrulaması · 16 Eylül 2026

## Sonuç

- **48/48 JavaScript test dosyası**: mevcut motor regresyonları, tüm 199 branşın
  model eşlemesi, ölçüm sınırları, karşılaştırma koşulları, yapılandırılmış
  setler, tek sayım, tarih düzeltme, kullanıcı ilerleme kuralı ve kişisel hedefler.
- **21/21 Python testi**: kimlik/oturum, kullanıcı ayrımı, CSRF, çakışma,
  depolama, fotoğraflar, kurtarma, başlatıcı, ilk hesaba yedek ve MongoDB geçişi.
- **5 Chrome senaryosu**: hesaplar; profil/branş; dönem/fotoğraf/kurtarma;
  yenilenen 11 ekran ve yapılandırılmış kayıt; çıkarılmış özel paketin açılışı.
- 11 eski ekran **1440 ve 390 piksel** genişlikte kontrol edildi. Yatay taşma
  ve sayfa JavaScript hatası görülmedi. Temel formlar ve 3D görünüm ayrıca incelendi.

## Paketin kendi ortamında

Python 3.12.14 ve Node 24.19.0, ZIP'ten çıkarılmış konumda çalıştırıldı.
48 JavaScript test dosyası ve 21 Python testi bu ortamda da geçti.
Yenilenen ekran/seans ve özel teslim senaryoları paketlenmiş çalışma ortamları
ile tekrar doğrulandı. Playwright, Mac'te kurulu Chrome'u kullanır.

Gerçek START_LOCAL_MAC.command başlatıcısı geçici veri klasöründe çalıştırıldı:

1. MongoDB anlık kopyasının SHA-256 değeri hem Python hem tarayıcı biçimiyle doğrulandı.
2. İlk hesap uygulama açılmadan önce yedekteki verinin tamamını aldı.
3. Uygulama açıldıktan sonra kayıt adetleri korundu.
4. Dahili GLB model dosyası elle yüklenmeden WebGL üzerinde görüntülendi.
5. İkinci hesap kişisel kayıtları almadı.
6. Kayıt değiştirildi, uygulama yeniden başlatıldı; ilk yedek yeni kaydı ezmedi.
7. Ortam şifresi, özel yedek, çalışma ortamı ve test kaynakları HTTP üzerinden sunulmadı.

## Canlı veri ve sınırlar

Canlı MongoDB'den **1449** numaralı sürüm okundu; kaynak kayıt zamanı
**2026-09-16T02:18:50.330027+00:00**. Okuma sonrası canlı veri değiştirilmedi.
Hesaplı MongoDB geçişi sentetik sürücü testiyle doğrulandı; gerçek taşıma
bu teslimin açılışında kendiliğinden yapılmaz. Varsayılan depo yerel SQLite'tır.

Testler yazılımın belirtilen davranışlarını doğrular. Her spor dalı ve kullanıcı
grubu için deneysel fizyolojik/klinik doğrulama yerine geçmez. Model kapsamı
SCIENCE_MODELS.md içindedir. İnternet yayını ve web barındırma yapılmadı.
