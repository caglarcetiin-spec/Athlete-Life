# Aşama 6 — kapsamlı UX ve parite çalışması

Çalışan alanlar tek React arayüzünde: Bugün/Haftam/Antrenman, plan sürümleri ve fazlar, beslenme, sağlık/uyku/lab/cycle, hedef/durum, capability, profil/güvenlik, arşiv/yedek, kılavuz ve sistem kontrolü. Eski 29 route'un karşılıkları FEATURE_PARITY'de ayrı ayrı belirtilmiştir.

Kanıtlar: komut, base commit, çalışma kaynak hashleri, ortam ve exit code aynı klasördeki JSON/log dosyalarındadır. Son kaynak test sayısını STATUS belirler; eski rapor sayısı yeni kaynak kanıtı olarak kullanılmaz.

- 17 route × mobil/masaüstü × açık/koyu = 68 axe/layout kontrolü PASS.
- Profil/email, profesyonel moda geçiş bildirimi, tarih history, form taslağı, klavye çıkış penceresi, pending varken SW güncellemesi ve offline private-cache testleri PASS.
- Kalıcı GLB UI yükleme, gerçek sentetik WebGL çizimi, yeniden açma ve bozuk dosya fallback PASS. Gerçek kişisel GLB okunmadı.
- Hesap kurtarma/parola, aktif DB hesap silme, dönem arşivi/reset ve scoped undo, fotoğraf metadata ve medya restore güvenliği API testli.
- Yedek sayısal checksum, büyük tam sayı koruması, >32 MB sentetik roundtrip ve tekrar yedeklemede katlanan kopyayı önleme PASS.

U-01/03/04/05 belirtilen Chrome kapsamıyla geçti. U-02 gerçek VoiceOver/iPhone ve bütün büyük yazı varyantları NOT RUN; otomasyon fiziksel cihaz testinin yerine yazılmadı. U-06 kaynak eşlemesi var, nihai bütün alt özellik incelemesi Aşama 9'da kapatılacak. Model kaynakları ve bilimsel sınırlamalar görünür; eski kesin biyolojik iddialar kopyalanmadı.

Yayın kararı bu rapordan tek başına GO değildir. Operasyonel container/staging/bağımsız restore ve release incelemesi tamamlanmalıdır. V2 default-off; gerçek MongoDB/hesap/medya geçişi yok.
