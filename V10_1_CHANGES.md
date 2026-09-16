# 10.1 — Tarihler, toparlanma ve kullanıcı kontrollü dönemler

## Kullanım

- **Antrenman → Antrenman Kaydı:** `10.09.2026` yaz veya takvimden seç. **Günü Aç** kayıtları gösterir; **Hareket Ekle** doğrudan yazdığın tarihe kaydeder. Boş, geçersiz veya gelecekteki tarih kabul edilmez. Yazarken ekran yeniden kurulmaz.
- **Haftam:** bir tarih seçip **Haftayı Aç**. Önceki/sonraki hafta ve bu hafta kısayolları var. Başlıklar gün + `GG.AA.YYYY` gösterir. Başka haftayı görüntülemek o haftaya kendiliğinden vardiya yazmaz.
- **Raporlar → Kas Haritası:** `assets/caglar-body.glb` otomatik yüklenir. Başarılı yükleme tarayıcıda ayrıca önbelleğe alınır. WebGL2 ve çalışan yerel HTTP sunucusu gerekir; `START_MAC.command` ile açılır.
- Harita başlangıçta **Toparlanma** gösterir. **Antrenman Uyaranı** birikmiş yükü gösterir ve zaman geçmesiyle azalması beklenen bir iyileşme ölçümü değildir.
- **Antrenman → Programım:** hedef, model adı, başlangıç, dönem uzunluğu, hafif hafta ve progresyon seç. Her güne kütüphaneden hareket, set, hedef aralığı, RIR, dinlenme ve isteğe bağlı yük ekle. Sıralamayı ve hareketleri düzenleyebilirsin.
- **Taslağı Analiz Et:** dağılım, kas katkısı, sıklık, koşu/kuvvet dengesi, ağrı ve günlük veri eksikleri değerlendirilir. **Ana Plana Al** yeni dönemi başlatır. Taslak kaydetmek ana programı değiştirmez.
- **Dönem geçmişi ve gelişim:** eski dönemler, kayıtlı günler ve aynı hareketin ilk/son sonuçları korunur. Dönem sonunda yeni program otomatik başlamaz; **Yeni Dönem** ile kendin oluşturursun.

## Ortak hesaplama

`trainingPeriods` ve `trainingPeriodDraft`, uygulamanın mevcut durum nesnesinde saklanır; yerel kalıcılık, taşınabilir yedek ve MongoDB snapshot akışına katılır.

`AthleteCoordinator` kayıt → fizyoloji → kalibrasyon → gelecek plan → ortak reçete → seans yürütücüsü → analiz/ekranlar sırasını korur. Dönem değişikliği de aynı hattı tetikler. Ana plan ve yürütücüde hareket sırası, set hedefi, yük, RIR ve dinlenme eşleşmesi kontrol edilir.

Başlamış veya gerçekleşmiş seans yeniden yazılmaz. Başlangıç tarihinde başlamış seans varsa dönem aktivasyonu sonraki bir günün seçilmesini ister. Geçmiş kayıtlar ve eski dönem tanımları silinmez. Sağlık kısıtı günlük yürütülebilir reçeteyi toparlanmaya çevirebilir; gerçek kayıtların kendisini değiştirmez.

Toparlanma, gerçekleşme zamanı ve geçen saatlere göre azalır. İçe aktarma zamanı geçmiş antrenmanın yapıldığı zaman yerine kullanılmaz. Gelecekteki gerçekleşme damgaları bugünkü toparlanmaya eklenmez. Uyku, protein, enerji ve tarihli su kayıtları tahmini hızı etkiler. Harita dakikada bir, açık uygulamanın plan hesabı en geç beş dakikada bir ve yeni veri kaydında yenilenir.

İki başarılı seans seçeneğinde üst hedef, gerekli setler, RIR ve aynı yük iki farklı günde doğrulanmadan ek yük artırılmaz. Başlangıç yükü boşsa kişisel yük geçmişi/kalibrasyon kullanılır. Ağrı ve günlük hacim/yoğunluk sınırları geçerlidir.

## Sadelik

İkinci yürütücü önizlemesi, Koç bölümündeki yinelenen hareket listesi ve eski sabit program kartı görünür akıştan kaldırıldı. Uyumluluk için eski DOM hedefleri gizli tutulur; veri motorları korunur. Program dışı seans, teknik senkronizasyon bilgisi ve ayrıntılı adaptasyon raporu açılır bölümlerde. Dar masaüstü panellerinde gezinme ve formlar yeniden düzenlendi.

## Sınırlar ve dayanak

Toparlanma puanı gerçek kas hasarı veya biyolojik iyileşme yüzdesi değildir. Kesin iyileşme zamanı ve kişiye özgü “en iyi program” iddiası yoktur. Bu sürüm, kayıtları kullanan açıklanabilir kurallar uygular; otonom bir yapay zekâ koçu değildir. Eksik günlük veri açıkça belirtilir. Dönem uyumu, planlanan hareketlerin kaydının varlığını sayar; bütün setlerin ve tekniğin kusursuz tamamlandığı anlamına gelmez.

Hibrit taslak 3 kuvvet/beceri, 2 kolay koşu, 2 dinlenme günü içerir. Hareket varyasyonları ve mesafeler kullanıcı tarafından kontrol edilir. RIR, iki seanslı ilerleme ve hafif hafta oranları ürünün ayarlanabilir çalışma kurallarıdır; kesin bilimsel eşikler olarak sunulmaz.

Genel düzenlilik, kişiselleştirme ve haftalık kas dağılımı yaklaşımında [ACSM 2026 açıklaması](https://acsm.org/resistance-training-guidelines-update-2026/) kullanıldı. Kuvvet ve dayanıklılığı birlikte düzenlerken [eşzamanlı antrenman sistematik derlemesi](https://pubmed.ncbi.nlm.nih.gov/34757594/) bağlam olarak değerlendirildi. Bu kaynaklar ürünün toparlanma formülünü klinik olarak doğrulamaz.

## Doğrulama — 16 Eylül 2026

- 41 JavaScript test dosyası: gerçek uygulama modülleri birlikte yüklenerek ve mevcut regresyon senaryolarıyla.
- Depolama 6, başlatıcı 2 Python testi; HTTP kaydetme, revizyon geri alma ve yeniden başlatma testi.
- Yeni senaryolar: `10.09.2026`, eksik/geçersiz tarih, ay/yıl geçişi, haftalar arası izolasyon, dönem aktivasyonu, sağlık kısıtı, çift seanslı progresyon, dönem sonu bekleme, geçmiş ve yeniden yükleme, saat ilerledikçe toparlanma.
- Gerçek tarayıcı: tarih girişi, `28.09.2026 – 04.10.2026` haftası, dönem paneli ve elle dosya seçmeden GLB yüklenmesi doğrulandı.
- MongoDB geri okuması: 7 antrenman, 16 beslenme, 7 su kaydı korundu. Hibrit taslak mevcut; aktive edilmiş yeni dönem yok.

Güncel kaynak envanteri: [SYSTEM_PARAMETER_INVENTORY.md](SYSTEM_PARAMETER_INVENTORY.md).
