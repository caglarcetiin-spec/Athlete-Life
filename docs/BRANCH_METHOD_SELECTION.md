# Branşa göre çalışma yöntemi — 2026-09-28

## Kullanıcı akışı

Branş seçimi artık sabit bir yöntem panelinin yanında duran bağlam metni değildir. Katalogdaki 199 branşın her biri kendi adını ve mevcut tekniklerini içeren yöntem kartları sunar. Kategori seçimi, branş seçimini daraltır ve bu kategorinin örnek tekniklerini gösterir; kategori kendi başına bir sporcu branşı olarak kaydedilmez. Kullanıcı belirli branşı eklediğinde kartlar ve seçili varsayılan yöntem görünür biçimde güncellenir.

- Yol bisikleti: pedal ritmi, vites/kadans geçişi, sürüş pozisyonu; teknik, uygulama ve analiz seçimleri.
- Alp disiplini: denge duruşu, kenar kontrolü, dönüş bağlantısı.
- At terbiyesi: geçişler, dairede ritim ve mevcut katalogdaki diğer çalışmalar.
- Koşu/yüzme/kuvvet gibi mevcut özel planlayıcısı olan branşlarda o çalışma yöntemi doğrudan seçilebilir; önceki koşu akışı korunur.
- Ağırlık, kalistenik, jimnastik becerileri, koşu, yüzme, kondisyon ve güç destekleri ayrı açılır bölümde eklenir. Seçilmiş destekler daima görünür ve kaldırılabilir.

Her branşın teknik/uygulama/analiz seçimi ayrıdır. Bisiklette teknik seçmek, kayakta teknik seçmeyi zorunlu kılmaz. Sonraki yetkinlik soruları yalnız o branş için seçilen yöntemleri açar. AI'ye iletilen uygun hareket listesi ve günlük gerekli yöntemler bu eşlemeyi aynen uygular. Özel ortam/eğitmen/partner kontrolleri korunur; otomatik fiziksel planlamaya kapalı branşlarda yalnız analiz varsayılan olur, fiziksel kartlar nedenleriyle devre dışıdır.

Kartlar mevcut temel kataloğa dayanır. Bu değişiklik yeni teknik müfredatı, spor bilimsel doğrulama veya 199 branştaki tüm hareketleri öğrenmiş bir model iddiası değildir.

## Veri sözleşmesi ve geri uyumluluk

Yeni alan: `guided_choices.sport_methods: {sport_id: [sport_technique|sport_practice|sport_tactics]}`; varsayılan `{}`. Ana yazım noktası değişmez: `program.decisions.guided_choices`. Harita yalnız seçili branşları içerir, tekrar/uyuşmayan yöntemler reddedilir. Boş dizi branş teknik yöntemi seçilmediğini açıkça ifade eder. Ana `methods` alanı desteklerle birlikte haritanın birleşimini içerir.

Eski isteklerde haritada bulunmayan branş, önceki global branş yöntemlerini kullanır. Yeni arayüz ilk değişiklikte eski seçimleri açık haritaya dönüştürerek korur. Branş silinince o branşın harita girdisi, yetkinlikleri, deneyimi ve ortam bilgisi kaldırılır; diğer branşlar korunur. Branş takvimine yalnız etkin branş yöntemine sahip branşlar atanır. Koşu gibi ek destek aynı günün kalan süre bütçesinde uygulanır; bu model ayrı bir çoklu seans takvimi üretmez.

`coverage().method_options` ve `native_method` katalog arayüz metadata alanlarıdır. `sport_training.methods_for` uygun adayları, `active_sports/days` takvimi, `sport_program` temel taslağı ve `ai_planning` doğrulamasını bağlar. `ai-planner-9`, `guided-sports-6`; eski sürümler okunur.

## Yayın, göç, geri alma

DB tablo/şema göçü, hesap, medya veya kişisel veri taşıması yok. MongoDB ve mevcut kayıtlar korunur. AI yalnız mevcut form onayı kapsamında seçilen yöntem eşlemesini alır; hesap ve sağlık kayıtları eklenmez. Gerçek AI isteği, üretim yayını veya ücretli kaynak oluşturma yapılmadı. Teslim yerel önizleme ve derlenmiş yayın paketidir.

Geri alırken yeni `sport_methods` alanını ve `ai-planner-9` değerini okuyabilen uyumluluk korunmalı. Eski sürüme körlemesine dönmek yeni plan tercihlerini reddedebilir. Kullanıcı verilerinin silinmesi veya önceki yedekle üzerine yazılması gerekmez.

## Kanıt

`docs/evidence/stage-9/branch_methods_*.json`: komut, kaynak commit/hash, ortam, stdout/stderr ve exit code. `docs/evidence/branch-methods/` mobil/masaüstü görselleri ve sonuçlar. Tüm testler geçici sentetik PostgreSQL/MongoDB ve 10011 portunda sentetik hesaplarla yapılır. Tarayıcı AI sağlayıcısını sentetik yanıtla değiştirir; gerçek aday ve plan doğrulaması çalışır.

- 629 API/domain/veritabanı testi geçti (tüm v2 + ilgili MongoDB parity).
- 31 web testi geçti; derleme ve kapsamlı olmayan statik lint kontrolleri geçti.
- Kategori önizlemesi, bisiklet/kayak/binicilik kartları, bağımsız yöntem seçimi, kaldırma, yeniden yükleme, filtrelenmiş teknikler, AI günleri ve dolu son editör; 390/1280 px taşma ve ciddi/kritik Axe kontrolleri geçti.
- Mevcut koşu akışının ayrı tarayıcı regresyonu geçti. Build'de mevcut büyük paket/dependency annotation uyarıları var; hata yok.
- Boks tarayıcı regresyonu da geçti: yeni partnerli raunt kartından AI taslağı, dolu editör ve kaydedilen tur/rapor süresine kadar doğrulandı. İlk seçici uyuşmazlığı ve düzeltmesi kanıt notlarında korunur.
