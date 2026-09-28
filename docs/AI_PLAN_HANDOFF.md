# AI taslağından son düzenlemeye geçiş — 28 Eylül 2026

## Sorun ve davranış

`GuidedPlan.onUse` program nesnesini zaten düzenleyiciye iletiyordu. Ancak düzenleyici boş öneri sorularını yeniden açıyor ve her hareketin başında seçilmemiş katalog seçicisini gösteriyordu. Ayrıca sayfa yeniden açıldığında `program` yerel taslağı yalnız “Dönem oluştur” tıklandıktan sonra yükleniyordu; ilk planı henüz kaydetmeyen kullanıcıya tekrar soru akışı gösterilebiliyordu.

Artık AI veya yönlendirmeli taslak “Programın hazır · son rötuşlar” ekranında açılır:

- Dönem adı/hedefi/tarihi/süresi, günler ve hareketler aynı nesneden dolu gelir. Yeni öneri soruları tekrar gösterilmez.
- Hareket kartı adını, set/tekrar veya süresini, dinlenmesini ve varsa RIR/yükünü gösterir. Kart açılınca mevcut değerler düzenlenebilir. Hareket değiştirme, gün takvimi ve hafta aralığı isteğe bağlı açılır.
- Yeni hareket seçicisi hazır hareketin önüne geçmez; değiştirme panelinin içinde kalır. Bilinmeyen ağırlık gibi isteğe bağlı değerler uydurulmaz veya yeniden giriş şartı yapılmaz.
- Hesaba ait mevcut `program` taslağı sayfa açılışında yüklenir. Başlangıç sorularından önce yükleme tamamlanır; yükleme hatasında yeni/boş bir planla üzerine yazılmaz.
- Taslağı kaydetme ve “Ana planım yap” ayrımı korunur. AI önizlemesi otomatik olarak aktif planı değiştirmez.

## Kanıt

`tools/v2/ai_handoff_browser.mjs`: ayrı PostgreSQL veritabanı, sentetik hesap ve sentetik AI cevabı kullanır; kişisel hesaba veya dış AI servisine bağlanmaz. Önizlemeden sonra tüm hareketlerin varlığı ve dolu alanlar doğrulanır; sadece bir set sayısı değiştirilir; düzenleyici kapatılıp sayfa yenilenir; aynı değişiklikli taslak geri gelir. Kayda gönderilen **bütün program nesnesi**, AI programının sadece bu tek rötuş yapılmış haliyle eşit olmak zorundadır. Ardından taslak kaydı, açık aktivasyon, Bugün ve sağlık bağlantıları kontrol edilir.

360/390/768/1280 ekran genişliklerinde taşma yok; düzenleme ekranında Axe ihlali yok. Derleme ve frontend lint sonuçları `docs/evidence/stage-9/ai-handoff-*` altında; komut, kaynak hashleri, exit code ve stdout/stderr kayıtlıdır. Görseller ve senaryo sonucu `docs/evidence/ai-handoff/` altında.

## Veri / yayın / geri dönüş

Yeni kalıcı alan, API veya DB şeması yok. Mevcut hesaba özel IndexedDB `draft:program` kaydı kullanılır; hesap/medya göçü ve gerçek veri yazımı yok. Yerel önizleme arayüzü ve `release/v2` güncellendi; GitHub push veya Render yayını yapılmadı. Önceki kaynak/arayüz paketiyle geri dönülebilir; mevcut taslakları silmek gerekmez. Eski arayüzde taslağı yeniden açmak için “Dönem oluştur” gerekebilir.
