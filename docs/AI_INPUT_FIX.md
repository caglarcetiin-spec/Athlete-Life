# AI plan formu düzeltmesi — 28 Eylül 2026

## Neden ve değişiklik

`Competency.seconds` bütün süreli hareketlere 600 saniye sınırı uyguluyordu. Bu sınır izometrik tutuş içindi; 1800 saniyelik koşu kapasitesi de reddediliyor, AI çağrılmadan genel 422 mesajı dönüyordu. Eski kaynakla sentetik 30 dakika koşu reddi ve düzeltilmiş kaynakla kabulü `ai-input-root-cause.log` içinde kaydedildi.

Kardiyo için pozitif, en fazla 86400 saniye kapasite kabul edilir; izometrik tutuşun 600 saniye ve tekrarın 1–100 tam sayı sınırı korunur. Bunlar giriş doğrulama sınırlarıdır, antrenman dozu önerisi değildir. Kapasite boş kalabilir. İstemci artık uygun sınır ve hareket adıyla uyarır; geçersiz kapasiteyle ilerlemeyi engeller. Mevcut 1800 saniyelik kayıt değiştirilmez, kırpılmaz.

AI form hatası alan adıyla açıklanır; AI çıktısının kayıt sözleşmesine uymaması kullanıcı girdi hatası olarak sunulmaz. Yanıtlarda özel giriş/çıktı değerleri yoktur. AI isteği 120 saniye bekler (sağlayıcı bağlantı zaman aşımı 90 saniye), normal senkronizasyon 12 saniyedir. Otomatik tekrar veya sağlayıcı değiştirme eklenmedi.

## Kanıtlar

`docs/evidence/stage-9/ai-input-*.json` kaynak commit'i, çalışma ağacı dosya özetlerini, ortamı, komutu ve çıkış kodunu içerir; bitişik `.log` stdout/stderr içerir.

- API ve planlayıcı: 66 test PASS.
- İstemci: 4 test PASS; 65 saniyelik sentetik yanıtın kesilmeden alınması dahil.
- Geçici yerel MongoDB: 2 test PASS; uzun kardiyo kapasitesiyle taslak kaydı dahil.
- Tarayıcı: 30 dakika koşu, geçersiz tutuş uyarısı, 13 saniye geciktirilmiş sentetik yanıt, taslak kaydı ve açık aktivasyon PASS; 360/390/768/1280 genişliklerinde taşma yok; Axe ihlali yok.
- Frontend build, Python ve frontend lint PASS.

Testlerde gerçek hesap/veritabanı kullanılmadı. AI sağlayıcı çağrıları bu düzeltmenin otomatik testlerinde sentetik yanıtlarla değiştirildi; yeni canlı model karşılaştırması yapılmadı.

## Yayın ve veri etkisi

Yerel `127.0.0.1:10005` sunucusu aynı veritabanı ve EVREN/Qwen yapılandırması korunarak temiz bir Python alt sürecinde yeniden başlatıldı. Anahtar yalnız bellek/anonim pipe içinde kaldı. Genel arayüz paketi `release/v2` altında üretildi. GitHub'a push ve Render yayını bu düzeltme kapsamında yapılmadı. Eski sekmede service worker güncellemesi için “Yeni sürümü aç” gerekir.

Kalıcı alan, DB şeması, hesap veya medya göçü yok. Geri dönüş: önceki kaynak ve arayüz paketini geri yükleyip sunucuyu yeniden başlat; veri temizliği gerekmez. Eski sürüm 600 saniyeden uzun kardiyo kapasitesini tekrar reddeder.
