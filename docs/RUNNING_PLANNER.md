# Koşu ve performansa göre planlama — 2026-09-28

## Davranış

- Önceden kuvvet başlangıç taslağında hareket kalmaması yaş/sağlık engeli sanılabiliyordu. Uygunluk artık ayrı hesaplanır: yetişkin onayı/kayıtlı yaş ve güncel sağlık bağlamı. Eksik ortam veya yetkinlik `ai_no_candidates`; gerçek sağlık kısıtı `ai_health_gate` ve somut nedenlerdir. Sağlık engelinde sağlayıcı çağrılmaz.
- Koşu yöntemi 15 kanonik çalışma türünü açar: koşu-yürüyüş, kolay, toparlanma, uzun, sabit ritim, tempo, eşik, interval, yüksek eforlu aerobik interval, fartlek, kısa hızlanma, yokuş tekrarları, patika, sprint, kısa yokuş hızlanması. Yedi yeni kimlik, sekiz mevcut kimlik; kütüphane/program/gerçek kayıt aynı kimliği kullanır.
- Başlangıçtaki varsayılan ağırlık yönteminden koşuya geçiş yalnız koşuyu seçer. Kullanıcı sonradan ağırlık ekleyerek hibrit plan oluşturabilir. Mevcut açıkça kaydedilmiş karma tercihler sessizce silinmez.
- Saf dayanıklılık akışı kas puanı ve üst/alt vücut bölünmesi istemez. Mesafe, sürdürülebilen süre, tempo, yokuş ve düzen öncelikleri vardır. Boks/dövüş akışında ayak çalışması, savunma, kombinasyon, raunt, hız ve taktik öncelikleri AI bağlamına gider. Kuvvet eşlik ediyorsa isteğe bağlı kas öncelikleri korunur.
- Koşu ekipmanı: yol, pist, park, patika, yokuş, bant/eğimli bant, diğer açık alan, ayakkabı ve isteğe bağlı saat/nabız sensörü. Aksesuarlar tek başına uygun koşu ortamı sayılmaz. Yokuş/patika/sprint için ilgili ortam koşulu ayrıca denetlenir.
- Yeni koşucu, süre testi girmeden koşu-yürüyüş başlangıcı alabilir. İleri koşular için beyan edilen yetkinlik, deneyim ve gün sayısı gerekir. Saf koşu günleri kolay temel, uygun tek kalite günü ve seçilirse uzun koşu şeklinde planlanır. Interval seti süre/tekrar + ayrı dinlenme olarak tutulur.

## Doz sınırları ve bilgi sınırı

AI ile deterministik taslak aynı uygun adaylar, süre/kapasite, ortam ve gün doğrulamalarını kullanır. Bildirilen haftalık koşu dakikası >0 ise planlanan koşu çalışma süresi bu sınırı aşamaz. Sıfır, yerleşmiş haftalık koşu geçmişi olmadığını ifade eder; sıfır antrenman reçetesi değildir. Eksik kapasite test sonucu sayılmaz.

Haftada en fazla bir yoğun koşu günü, kapasitenin %80'ini geçmeyen tek çalışma ve set/süre tavanları **düzenlenebilir ürün güvenlik varsayımlarıdır**; klinik olarak doğrulanmış optimal antrenman veya bireysel fizyolojik eşik değildir. Mesafe hedefi ölçülmüş kapasite değildir. Pace, nabız bölgesi, VO2max, iyileşme veya kas gelişim yüzdesi türetilmez. Çıktı kullanıcının son onayıyla kaydedilir, otomatik yük artırımı yapılmaz.

### Kavramsal kaynaklar

- [England Athletics: koşu antrenman hızları](https://www.englandathletics.org/news/simplifying-the-running-jargon-training-pace-2/) — kolay/tempo/interval ayrımı.
- [England Athletics: koşucu soruları](https://www.englandathletics.org/runtogether/support/runner-frequently-asked-questions/) — farklı koşu seans türleri.
- [NHS: Couch to 5K](https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/) — yeni başlayan için kademeli koşu-yürüyüş yaklaşımı. Bu uygulamanın dozları NHS programının kopyası değildir.
- [England Boxing: Coaching Handbook](https://www.englandboxing.org/wp-content/uploads/2022/03/EB_Boxing-Coaching-Handbook-Part-1_v8-002.pdf) — teknik, ayak çalışması, kondisyon, savunma ve ekipman ayrımı.

Kaynaklar yukarıdaki ürün tavanlarını veya otomatik kişisel uygunluğu doğrulamaz. 199 branş kataloğu temel kapsam olmaya devam eder; her branştaki tüm tekniklerin tamamlandığı iddia edilmez.

## Şema, kayıt, yayın ve geri alma

Yeni tablo/DB şema göçü yok. `guided_choices` içine isteğe bağlı `running_profile` (target_distance_km, continuous_minutes, weekly_minutes; tümü nullable) ve `performance_focus[]` eklenir. `split=endurance_days`, `ai-planner-8` önceki değerlerle birlikte desteklenir. AI form onayı bu plan tercihlerini kapsar; özel sağlık kayıtları AI bağlamına eklenmez. Alanlar kullanıcı kabulünden sonra `program.decisions.guided_choices` içinde tek yazımla saklanır; profilin üstüne yazılmaz. Planner katalog çıktısındaki `run_form` yalnız arayüzün süre etiketidir.

Hesap/medya/MongoDB göçü, kişisel veri testi, ücretli kaynak açılması veya gerçek sağlayıcı test çağrısı yapılmadı. Yerel önizleme ve yayın paketi güncellenir; Render/GitHub yayını bu teslimin parçası değildir.

Geri almada yeni `running-planner-1` hareket kimliklerini ve yeni seçim/AI sürüm değerlerini okuyabilen uyumluluk korunmalı. Sadece eski kaynağa dönmek yeni planların eski editörde doğrulanmasını engelleyebilir. Kişisel veriler silinmemeli veya eski yedekle üzerine yazılmamalıdır.

## Doğrulama

`docs/evidence/stage-9/running_*.json`: komut, kaynak commit ve hash manifesti, ortam, stdout/stderr, exit code. İlk hatalar `docs/evidence/running-planner/NOTES.md` içinde açıklanır; eski loglar korunur. API/domain testleri geçici sentetik PostgreSQL/MongoDB kullanır. Tarayıcı testi 10011 portunda, ayrı sentetik hesapta gerçek doğrulama uç noktasına sentetik EVREN cevabı verir; canlı sağlayıcının yanıt kalitesini ölçmez. 390/1280 px taşma ve ciddi/kritik Axe kontrolü, kaydedilen seçimler, branşa özel sorular ve dolu son editör denetlenir.

Son sonuç: genel PostgreSQL/MongoDB regresyonu 529 geçti; odaklı koşu ve kayıt kabulü 15 geçti; web 27 geçti; koşu ve boks tarayıcı akışları geçti. Odaklı testler genel testlerle örtüşür. Yayın paketi derlendi; yalnız mevcut büyük JS paketi ve bağımlılık yorum uyarıları var. Yerel hazır olma kontrolü 200 ve sunulan JS dosyası son paketle aynı.
