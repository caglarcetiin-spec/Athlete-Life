# Karma çalışma planlayıcısı — guided-hybrid-2

27 Eylül 2026, yerel inceleme adayı. Önceki 14 adaylı guided-1 taslağının yerini alır. Önceki davranışın kaydı `MACROFACTOR_REVIEW.md`; güncel planlama davranışı bu belgededir.

## Değişen davranış

On ekran: deneyim → yöntemler → kontrollü yapılabilen hareketler ve isteğe bağlı kapasite → hedef → ekipman → gün/süre → en fazla beş bölge öncelik puanı → split/dönem → son kontrol → önizleme. Hareket araması seçimleri korur. Eski sekiz adımlı yarım formun cevapları korunur, yeni soruların atlanmaması için ilk adıma döner. Aktif programlar otomatik değiştirilmez.

54 aday: ağırlık, kalistenik, jimnastik becerisi ve temel kondisyon. EZ bar RDL/row/press, barbell squat/deadlift, ring/pull-up varyantları, front lever/muscle-up/tutuşlar gibi farklı çalışma türleri aynı plana girebilir. Her adayın gereken ekipmanı, yöntemleri, hareket örüntüsü ve yetkinlik koşulu açık metadata'dır (`planner_catalog.py`). İleri seviye seçmek teknik beceri bildirimi değildir. Gerekli ekipman yoksa veya bir ileri becerinin kontrollü yapılabildiği bildirilmemişse hareket seçilmez. Kendi bildirilen kapasite ölçülmüş test değildir; bilinmeyen kilogram tahmin edilmez.

Split ana örüntüleri belirler. Hedef bölge katkısı, bildirilen yetkinlik, mevcut dış yük ekipmanı ve haftalık tekrar sayısı aday sıralamasını etkiler. Teknik blok seansın en fazla %20'si / 15 dakika ve en fazla iki hareket; ardından ana örüntüler, tamamlayıcılar ve isteğe bağlı kondisyon. Süre hesabı 5–8 dakika hazırlık, tekrar başına 4 saniye veya tutuş saniyesi, set arası dinlenme ve hareket başına 60 saniye geçiş içerir. Süre üst sınırdır, doldurulması gereken hedef değildir.

Set üst sınırları yeni/dönüş 12, düzenli 20, ileri 24; normal hareketlerde 2/3 set; güç/karma/hipertrofi 6/8/10 tekrar; ana hareket 150 saniye (güç 180), tamamlayıcı 90; teknik 2 set, 3 tekrar veya 8 saniye, 120 saniye dinlenme. Bildirilen tekrar kapasitesinin %70'i/tutuşun %60'ı bir tavan olarak kullanılır. Bunlar **düzenlenebilir mühendislik/koçluk varsayımlarıdır**, kişiselleştirilmiş biyolojik doz iddiası değildir. Teknik hareket ve tutuşta RIR uydurulmaz. Teknik tekrarlı hareketler kanonik `skill`, tutuşlar `isometric` olarak kaydedilir.

Eksik ana örüntü, karşılanamayan yöntem veya belirgin katkısı olmayan öncelik görünür uyarı ve `needs_review` verir. Katalog katsayısı ≥0.5 yalnız yazılımda belirgin katkı eşiğidir. Bir bölgenin haftalık ağırlıklandırılmış set sayısı yeterlilik, hipertrofi veya hasar ölçümü değildir. Üç günlük üst/alt dağılımın eşit olmadığı açıklanır. Haftalar otomatik yük artışıyla değiştirilmez; kayıtlı ana plan kullanıcı kontrolündedir. Diğer branşlarda manuel editör korunur; 199 branşın uzman otomatik modeli iddiası yok.

## Bilimsel dayanak ve sınır

- [ACSM 2026 genel direnç antrenmanı değerlendirmesi](https://pubmed.ncbi.nlm.nih.gov/41843416/): hedef, yük ve hacim bağlamı; bu algoritmanın tek tek sayısal eşiklerini doğrulamaz.
- [Direnç reçeteleri ağ meta-analizi](https://pubmed.ncbi.nlm.nih.gov/37414459/): farklı reçetelerin kuvvet/hipertrofi sonuçları.
- [Eşzamanlı kuvvet ve aerobik çalışma derlemesi](https://pubmed.ncbi.nlm.nih.gov/34757594/): karma çalışma bağlamı; otomatik olarak herkes için aynı karma dozun uygunluğu anlamına gelmez.

Bu kaynakların kamuya açık özetleri incelendi; tüm tam metinlerin okunduğu veya uygulamanın klinik doğrulandığı ileri sürülmez. Mevcut yaş/sağlık uyarı kapısı korunur. Otomatik tıbbi doz, yaralanmaya özel reçete, 1RM/ek ağırlık veya sayısal progresyon politikası açılmadı.

## Gerçek kayıt → 3B → Sağlık

Plan → reçete → gerçekleşmiş set mevcut kanonik hattıdır. Taslak veya hedef, gerçekleşmiş set yaratmaz. Hem Raporlar hem Sağlık → Kas ve antrenman aynı analiz API'sini ve BodyModel bileşenini kullanır. Kuvvet ağırlıklı set, tutuş saniyesi, teknik deneme ve kondisyon saniyesi ayrı kanallardır. 3B renkler seçilen dönemde **aynı kanal içindeki** göreli dağılımdır; kanallar toplanmaz. Kas seçimi kaynak hareket ve tarihe bağlantı verir. Set silinince güncel dağılımdan düşer. Önceki zamanla azalan kayıt endeksi ayrı görünüm olarak korunur. Büyüme/hasar/iyileşme yüzdesi ölçülmez; endeks gerçek biyolojik kapasite değildir.

Sağlık paneli güncel analiz için görünürken dakikada bir yenilenir; geçmiş seçimi sabit tarih olarak belirtilir. Mevcut beslenme kayıt ekranına bağlanır; ayrı bir beslenme kayıt deposu veya doğrulanmamış biyolojik çarpan eklenmedi. İsimli atlas yüzeylerinin mevcut eşlemesi korunur; adsız model eşlemesi yaklaşık kalır. Kas başı/sağ-sol için ayrı gerçek ölçüm iddiası yok.

## Şema, yayın, göç, rollback

Yeni SQL sütunu/Mongo koleksiyonu yok. `Program.decisions.guided_choices`: ek `methods`, `competencies[{movement_id,reps?,seconds?}]`, `conditioning_minutes`; eski değerlerde varsayılan yöntem weights, boş yetkinlik, 10 dakika kondisyon. Model sürümü `guided-hybrid-2`; yeni katalog hareketleri 2.2. GET `/api/v2/guided-planning-options` oturum gerektirir. POST taslak salt okunur ve CSRF korumalıdır. Yeni katalog kimlikleri ana veri kayıtlarını yeniden yazmaz.

Hesap/medya göçü, gerçek veriyle test, canlı Mongo değişikliği, ücretli hizmet, GitHub/Render yayını yapılmadı. Yerel preview aynı veritabanı korunarak yeniden başlatılır. Geri dönüşte önceki API yeni seçenek alanlarını doğrulamayabilir, yeni hareketler UNKNOWN olabilir; UI/API/katalog birlikte sürümlenmeli. Gerçek kayıtlar silinmeden ileri uyumlu düzeltme tercih edilir.

## Kanıt

`docs/evidence/stage-9/hybrid-*`: kaynak hashleri, baz commit, komut, test ortamı, stdout/stderr, exit code. `docs/evidence/hybrid-planning/VALIDATION.md` ilk regresyonun nedeni; başarısız koşu korunur. Sentetik program öncesi/sonrası JSON, mobil ekran, Axe ve tarayıcı sonuçları aynı dizinde. Kullanıcı hesabı/GLB/yedek test verisi değildir. Testler klinik etkinlik kanıtı değildir.
