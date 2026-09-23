# Aşama 7 — isteğe bağlı AI sınırı

Harici LLM ve cihaz entegrasyonları **kapalı/yapılandırılmamış**. Ana şartnamenin izin verdiği gibi çekirdek ürün bunlara bağımlı değil. Typed durum endpoint'i gerçek bağlantı olmadığını bildirir; kullanıcı verisini dışarı gönderen bir transport veya araç yürütme yetkisi yoktur. Domain taslak/onay/reçete akışı önceki aşamalardaki deterministik servistir, LLM diye etiketlenmez.

A-01: kapalı hizmet halinde core akışları stage-6 backend ve browser regresyonlarında çalıştırıldı. LLM timeout/ücret limit denemesi NOT RUN (provider yok). A-02/03: dış model/araç uygulaması yok; prompt injection'ın bağlı bir LLM üzerindeki testi yapılmış sayılmaz. A-04: HealthKit native izin/uygulama ve wearable token yok; sahte başarı gösterilmez.

Bu, çalışan bir AI koçu teslimi değildir. Provider/consent/bütçe olmadan harici API açılmadı; kayıtların tamamlanması veya güvenli çekirdek yayını bunun bitmesini beklemez. Yeni şema yok, hesap veya veri göçü yok.
