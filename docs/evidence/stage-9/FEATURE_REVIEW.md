# Alt işlev karşılığı incelemesi

23 Eylül 2026. Kaynak: 911e889 + yerel kanıt dosyaları. FEATURE_PARITY.md içindeki 29 route ve sayfa olmayan işlevler, V2 feature kaynakları ve ilgili API testleriyle eşlendi. Bu bir kaynak/akış incelemesidir; bütün olası form değerlerinin exhaustive testi değildir.

| Eski işlev grubu | V2 karşılığı | Kanıt / sınır |
|---|---|---|
| Giriş/kayıt/kurtarma/parola/e-posta | Login, Profile; auth/account | test_core, test_lifecycle; 8 karakter alt sınır, hesap sahipliği |
| Basit/profesyonel görünüm, yol haritası/tur | App, Guide, Profile | final-routes; experience browser; fiziksel ekran okuyucu NOT RUN |
| Tema/profil/geri-ileri/ana sayfa | App, navigation, Profile | experience browser, 68 route/tema/viewport |
| Tarih/saat/süre ve virgüllü değer | Records, Scheduling, Workouts | lifecycle/lifestyle/workout tests; native tarih, tarih hassasiyeti korunur |
| Branş/ekipman/deneyim profili | Profile + 199 branş kataloğu | profile/draft API tests; katalog otomatik kişisel uzmanlık iddiası değildir |
| Seans bağlantısı ve plan dışı kayıt | Workouts + RX/session/set ilişkileri | workout browser, test_workouts |
| Seans/set düzenle/sil/geri al | Workouts + Lifecycle | tarih koruma, soft delete, scoped restore testleri |
| Hedefli taslak ve manuel program | Programming + program-drafts | program review, health/profile context, onayla benimse; test_workouts |
| Dönem/faz/hafif hafta/sürüm | Programming hafta aralıkları | phase/range tests, legacy mapped phase fixtures |
| Runner dinlenme/duraklat/devam/atla/ek set | Workouts | manual/guided same slots, offline/reload browser; immutable RX |
| Capability/rings/muscle-up ve diğer alanlar | Capabilities + katalog | protocol/variant/unit/side/attempt; lifestyle tests; özel test yolu |
| Hareket kütüphanesi/alias/ekipman/efor | Programming/Workouts + catalog | modality/variant kimliği, assisted/bodyweight alanları API'de; her eski öneri katsayısı korunmadı |
| Sosyal plan ve yapılmış ek aktivite | Events | planned vs actual ayrımı; science duplicate fixture |
| Öğün/tarif/besin/su/gün kapsamı | Nutrition | snapshot immutable; edit/delete/restore; lifestyle browser |
| Uyku/ağrı/hastalık/regl/tahlil | Health/Profile | interval, personal refs/comparator, opt-in; lifestyle/science tests |
| Kas haritası 2D/3D ve fotoğraf | Reports/BodyModel/Backups/Profile | private GLB roundtrip, photo capture metadata; body-model tests/browser |
| Toparlanma/yük/geçmiş karar | Reports/Science | as_of, UNKNOWN, model/version/input lineage; science tests |
| Hedef ve 7/28/84 gün eğilimi | Goals/Reports/Status | comparable measurement/source links; report browser |
| Sıfırlama/arşiv/son silinenler | Lifecycle | generation/cursor check; archive/PDF/undo tests |
| Tam yedek/bekleyen işlem/taslak | Backups + sync | iki DB restore browser, büyük backup, unknown fields, exact numeric text |
| Genel/arşiv/sağlık PDF | Reports/Lifecycle | owner scope ve rendered synthetic PDF |
| System Integrity | SystemChecks + pure integrity | gerçek kullanıcı DB mutation yok; science integrity test |
| PWA/sync/conflict | sync store/AppUpdate/service worker | lost ACK, lease, ownership, pending update fixtures |

## Bilinçli farklılıklar

- Bir işi yapan eski paneller ortak kayıt sayfasında birleştirildi; ayrı route sayısı 29 → 17. Kullanıcının sadeleştirme talebiyle uyumludur.
- Gerçek kas hasarı/iyileşme yüzdesi, kesin ETA, doğrulanmamış kişisel kalibrasyon ve fotoğraftan biyolojik ölçüm yapılmış gibi gösterilmez. Eski ham alanlar arşivde korunabilir; yeni motor bunları ölçüm gibi kullanmaz. Bu, şartnamenin bilimsel belirsizlik politikasını uygular.
- Harici AI/cihaz erişimi kapalıdır; Aşama 7 çekirdek yayın için zorunlu değildir.
- Kesin takvim/protokolü olmayan eski alanlar yanlış yeni modele atanmak yerine kaynak arşivinde görünür. Gerçek kişisel yedekle test/göç yapılmadı.
- Tarayıcı backup üst sınırı 64 MB; sınırsız arşiv desteği yok. Büyük arşiv için operasyon planı gerekir.

Kaynak eşleme incelemesi tamamlandı. Ana kayıt akışlarında yeniden üretilmiş açık kritik kayıp bulunmadı; bu bütün olası legacy alanların veya gerçek kullanıcı arşivinin kayıpsız göç ettiği anlamına gelmez. Gerçek kullanıcı cutover öncesi kişisel veri doğrulaması ayrı ve kontrollü yapılmalıdır. Fiziksel erişilebilirlik ve çok uzun geçmiş kapasitesi kapsam sınırı olarak kalır.
