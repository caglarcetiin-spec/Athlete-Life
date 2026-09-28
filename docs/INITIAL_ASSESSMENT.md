# Başlangıç analizi ve kişisel planlama

Yeni kayıt için: hesap → başlangıç analizi → branş/deneyim/yöntem/yetkinlik/hedef/ekipman/günler → taslağı incele → kaydet → ana planım yap. Normal uygulama gezinmesi bu onaydan sonra açılır. Sonraki girişlerde kurulum tekrarlanmaz. Var olan hesaplar zorunlu kuruluma alınmaz; Profilim ve Programımı hazırla üzerinden aynı alanları kullanır.

## Veriler ve sınırlar

Yaş, boy (cm), kilo (kg), cinsiyet ve spor geçmişi (ay) kullanıcı tarafından girilir. Cinsiyetin paylaşılması zorunlu değildir. Hiç spor yapmamış kişi 0 ay ile yeni başlayan düzeyine alınır; çelişen ileri düzey/branş geçmişi reddedilir. Branşlara özel geçmiş ve hareket yetkinliği ayrıca sorulur. 18 yaş altındaki kişi yetişkin kutusunu işaretlese de otomatik AI planı alamaz; uzmanla hazırlanan manuel plan kullanılabilir.

Bu alanlar AI taslağı için onay metninde açıkça sayılır. EVREN/OpenAI aktarımında hesap adı/kimliği, doğum tarihi veya geçmiş sağlık günlüğü yoktur. Taslakta kullanılan bağlam o planın sürümüyle saklanır. Boy ve kilodan beden tipi, yağ oranı veya kaldırılacak kg; cinsiyetten güç veya toparlanma kapasitesi çıkarılmaz.

Kadın/interseks seçeneğinde döngü alanları isteğe bağlıdır. Geçerli değil/paylaşmak istemiyorum seçenekleri ve erkek seçimine geçiş formdaki döngü alanlarını temizler. Son adet başlangıcı, adet süresi, biliniyorsa iki başlangıç arası gün sayısı girilir. Gelecek başlangıç tarihi kabul edilmez.

- **Aynı programla devam:** takvim ve yük sırf döngü nedeniyle değişmez.
- **Gün gün karar ver:** otomatik takvim değişmez; kullanıcı seansını düzenler.
- **Ara ver:** girilen adet günleri dinlenme olur. Gelecek döngüler için ayrıca onay verilirse kullanıcı uzunluğuna göre tahmini günler eklenir. Atlanan yük kalan günlere taşınmaz. Başlangıç değişirse kullanıcı yeni taslağı incelemelidir.

Döngü fazına göre otomatik performans, hormon veya kas iyileşmesi tahmini yapılmaz. Bireysel belirti ve tercih odaklı yaklaşım için kaynaklar: [6.812 egzersiz yapan kadında döngü belirtileri araştırması](https://bjsm.bmj.com/content/55/8/438), [UEFA kadın sporcularda döngü takibi uzlaşısı](https://bmjopensem.bmj.com/content/11/3/e002769). Bunlar yazılımdaki sayısal antrenman kurallarının klinik doğrulaması değildir.

## Doğrulama

`tools/v2/run_evidence.py` kaynak commit, dosya özetleri, komut, izin verilen test ortamı, stdout/stderr ve çıkış kodlarını kaydeder. Tüm veriler geçici/sentetiktir; gerçek kullanıcı veya EVREN çağrısı kullanılmaz.

- `intake_api`: yeni testler, doğrulamalı ve yalnız şifreli kayıt akışı, AI validasyonu ve dönemleme regresyonu.
- `intake_mongo`: aynı profil/taslak/aktivasyon sözleşmesi ile kayıt, sohbet ve silme regresyonu.
- `intake_web`: mevcut ön yüz birim testleri.
- `intake_browser`: kayıt, URL ile gezinme sınırı, ölçülerin aktarımı, kadın/erkek alanları, 0 ay başlangıç, sentetik EVREN taslağı, takvim ara günleri, aktivasyon sonrası erişim, yenilemede kalıcılık, mobil ve açık/koyu erişilebilirlik.

İlk tarayıcı denemesinde select etiketinin option metinleriyle eşleşmesi sorunu bulundu; alanlara açık erişilebilir adlar eklendi. İkinci deneme Axe'ın açık `browser.newContext` ihtiyacı nedeniyle test kurulumunda durdu. Üçüncü deneme tema geçişi sürerken kontrastı ölçtü; test şimdi gerçek tema düğmesini kullanıp animasyonun bitmesini bekler. Mobil görsel incelemesinde ilk kurulum başlığının genel sticky header stilini aldığı da görüldü; başlık normal belge akışına alındı. Başarısız koşular kanıt geçmişinde korunur, kabul koşulları gevşetilmez.

## Yayın ve geri dönüş

Önizleme paketi `release/v2` güncellenir. Bu çalışma Render'a üretim yayını veya gerçek hesap/veri/medya göçü yapmaz; ücretli servis eklemez. Yeni alanlar mevcut JSON sütunundadır; SQL şeması değişmez. Eski profile dokunulmaz. Geri dönüşte yeni JSON alanlarını okuyabilen sözleşme korunmalıdır; yeni alanları tanımayan eski strict okuyucuya doğrudan dönülmemelidir.

Mobil uçtan uca testte program onayı başarıyla çalıştı; test yanlışlıkla yalnız masaüstünde görünür olan sidebar için görünürlük bekledi. Kontrol mobil ana gezinme öğesine yöneltildi; test edilen erişim ve kalıcılık koşulları aynıdır.

Son kabul: API 45/45, MongoDB 8/8, ön yüz 39/39; sentetik tarayıcı akışı ve açık/koyu mobil WCAG A/AA taraması başarılı. TypeScript/Vite derlemesi, Ruff ve dokunulan ön yüz dosyalarında ESLint geçti. Önizleme için hesap veya veri aktarımı yapılmadan aynı yerel süreç yeniden başlatılır.
