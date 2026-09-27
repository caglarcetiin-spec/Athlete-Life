# MacroFactor Workouts incelemesi ve Athlete Life uyarlaması

Tarih: 27 Eylül 2026. Kaynak taban: f6878f6. Bu inceleme resmî ürün/kılavuz sayfaları ve kılavuzlardaki mobil ekran görsellerine dayanır. Native uygulamada yeni hesap açılmadı, ücretli deneme başlatılmadı; oturum içi kullanım doğrulanmış değildir. Mevcut bilgisayarın erişilebilir uygulama listesinde MacroFactor yoktu. Telefon hesabı erişimi kullanıcıya soruldu. Sunucu kaynak kodu ve özel algoritmalar kamuya açık değil; aynı algoritmayı uygulama iddiası yok.

## Doğrulanan ürün akışı

[Smart Generation](https://help.macrofactorapp.com/en/articles/285-create-a-new-program-via-smart-generation): hedef, beş öncelik puanı, azaltılacak kas öncelikleri, gün/süre, ekipman profili, split, deneyim ve dönem seçeneklerinden sonra düzenlenebilir önizleme. Kaydetme ve etkinleştirme ayrı.

[Program girdileri](https://help.macrofactorapp.com/en/articles/370-what-information-does-macrofactor-workouts-use-to-generate-my-program): deneyim, zaman, ekipman, hariç tutulan hareketler ve hedef üretime girer. Gerçek setler sonraki öneriler için kullanılır.

[Ürün mekanizması](https://macrofactor.com/workouts/): üretici ilerlemeyi kural tabanlı olarak tanımlar. Özel kuralları/parametreleri yayımlamıyor. Athlete Life bu motoru kopyalamaz; kendi açık, sürümlü taslak kurallarını kullanır.

[Levels](https://help.macrofactorapp.com/en/articles/342-understanding-levels): vücut haritası dönem boyunca ortalama haftalık setleri ve katkı yapan hareketleri gösterir. Kas büyüme yüzdesi veya hasar ölçümü değildir.

[Muscle Groups](https://help.macrofactorapp.com/en/articles/280-muscle-groups): set ve hacim trendi, vücut ağırlığı ve dış yük katkıları ayrı incelenir.

[Smart Progressions](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions): kayıt sonrası öneri döngüsü ve kullanıcı kontrolü. Kamuya açık davranış açıklaması, algoritmanın tam doğrulaması değildir.

[App Store](https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524): mobil ürün, uygulama içi abonelik/deneme; bu görevde ödeme veya abonelik yapılmadı.

## Uygulanan Athlete Life davranışı

Sekiz ekran: deneyim → amaç ve somut hedef → ekipman → çalışma günleri/süre → beş kas öncelik puanı → split ve 4/8/12 hafta → tarih ve sağlık bağlamı → önizleme. İlk boş hesap bu akışa yönlendirilir; manuel giriş ve daha sonra seçeneği korunur. Var olan hesap/plan değişmez. Yanıtlar hesap kapsamlı IndexedDB taslağında saklanır; onay sonrası programın değişmez `decisions.guided_choices` alanına girer.

Hareket havuzu bilinçli olarak sınırlı, kimlikleri kanonik ve sürümlüdür. Ekipman, deneyim, hariç tutulan hareketler, split, öncelik ve zaman aday seçimini etkiler. Tam vücutta ana örüntülere önce yer ayrılır; öncelik bunların sırasını değiştirir. Ekipman yetersizse eksik hedef açıkça gösterilir. Aynı temel dikey çekiş varyantları bir seansta tekrarlanmaz. Dambıl ve vücut ağırlığı varyantları ekipman açısından ayrı kimlik alır; eski kayıtlar yeniden yazılmaz.

Taslak otomatik olarak ana plan yapılmaz. Önizleme salt okunur; mevcut düzenleyicide son düzeltme → taslak kaydı → ana plana alma. Hedefler gerçekleşmiş set olarak sayılmaz. Mevcut seans, geçmiş set, rapor ve 3B kayıt dağılımı bu kanonik kimlikleri kullanır.

## Bilimsel sınır ve koçluk varsayımları

[ACSM 2026](https://pubmed.ncbi.nlm.nih.gov/41843416/) direnç çalışmasının kuvvet/kas gelişimi yararlarını ve hedefe göre yük/hacim farklılıklarını destekler; buradaki tek tek varsayımları kişisel olarak doğrulamaz. İki/üç set, hedefe göre 6/8/10 tekrar, üç yedek tekrar, 120/180 sn dinlenme bu ürünün düzenlenebilir başlangıç varsayımlarıdır; uzman onayı yok. 45 sn set, 60 sn geçiş ve 5 dk hazırlık yalnız süre tahminidir. Isınma ve kişisel gerçek süre daha uzun olabilir. Kilogram, 1RM, kas büyümesi, hasar, klinik iyileşme veya otomatik yük artışı hesaplanmaz. Yeni/dönüşte barbell squat ve barfiks otomatik seçilmez. Yaş ve güncel sağlık uyarıları önceki sunucu kapısından geçer; checkbox kayıtlı uyarıyı silemez.

Kapsam: yetişkin kuvvet/hipertrofi başlangıç taslağı. Bütün branşlar için uzman motoru, haftadan haftaya otomatik periodizasyon, yaralanmaya özel reçete veya MacroFactor ile özellik eşitliği iddiası yok. Diğer branşların manuel planlayıcısı korunur. Düşük süre bütçesi ve sınırlı katalog nedeniyle tüm kaslar için yeterlilik garanti edilmez. Katalog katsayısı ≥0.5 yalnız “önceliğe belirgin katkı” yazılım eşiğidir; biyolojik eşik değildir.

## Veri, yayın ve geri dönüş

Yeni SQL sütunu veya Mongo koleksiyonu gerekmiyor. `Program.decisions.guided_choices` eklemeli JSON; yerel `guided-plan` taslağı hesap kapsamlı. Yeni endpoint CSRF/hesap sınırını kullanır; mevcut program kaydı ve etkinleştirme aynı komut hattında. Canlı veriye taşıma ve Render/GitHub yayını yapılmadı. Ücretsiz Render/MongoDB korunur. Önceki sürüm yeni katalog kimliklerini tanımayacağı için eski uygulamaya dönüşte bu hareketler UNKNOWN kalabilir; veri silinmez. UI/API/katalog birlikte yayınlanmalı. Önceki sürüm uyumlu ileri düzeltme tercih edilir.

## Kontrol kaydı

`docs/evidence/stage-9/guided-*` dosyaları komut, kaynak hashleri, ortam, stdout/stderr ve çıkış kodlarını içerir. Önceki başarısız koşular `runs/` altında korunmuştur. İlk build PATH'te Node bulunmadığı için, ilk DB/tarayıcı koşuları sandbox yerel bağlantıyı engellediği için başarısızdı; yerel sentetik erişimle yeniden çalıştırıldı. Süre alanının erişilebilir adı düzeltildi. Soru taslağının ilk IndexedDB açılmadan yüklenmesi yenilemede sıfırlanmasına yol açıyordu; snapshot hazırlığı beklenerek düzeltildi. Küçük dolaylı kas katkısı öncelik karşılanması sayılmıyor. Eski planı olan hesap yenilemede sihirbaza zorlanmıyor.

Kaynak kısıtı: native MacroFactor hesabı oluşturma/oturum içi inceleme henüz tamamlanmadı. Bu durum belgelerle doğrulanan akışı uygulamamızı engellemez; sonucu “MacroFactor'ı giriş yaparak bütünüyle test ettim” diye sunmuyoruz.

### Son doğrulama

- `guided-core`: 24 test geçti (13 yeni yönlendirme ve 11 mevcut antrenman senaryosu).
- `guided-mongo`: 1 gerçek, yerel sentetik MongoDB kalıcılık senaryosu geçti.
- `guided-browser`: 390px mobil uçtan uca akış, taslak yenileme, beş puan, salt okunur önizleme, taslak kaydı/ana plana alma ve aktif planla yenileme geçti. 360/390/768/1280 genişliklerinde önizlemede taşma yok; önizleme Axe ihlali yok.
- TypeScript üretim derlemesi, ESLint, Ruff başarılı. Var olan büyük 3B chunk uyarısı devam ediyor.
- Native MacroFactor, gerçek kişi sağlık verisi, fiziksel telefon yazılım klavyesi veya kullanıcı pilotu test edilmedi. Kod testi biyolojik etkinlik kanıtı değildir.

Görsel kanıt: `docs/evidence/guided-planning/preview.png`. Makine sonucu: `docs/evidence/guided-planning/browser.json`. Bu ekranlar tamamen sentetik yerel hesaba aittir.
