# Branşa göre yöntemler

Yeni akışta branş eklemek o branşın varsayılan yöntemini doğrudan seçer. Eski tarayıcı testi ayrı “Branş teknikleriyle planla” ön ayarına basıyordu; bu gereksiz adım kaldırıldığı için test artık branşın kendi “Boks · Teknik çalışma” kartının seçili olduğunu doğrular. Branş uygulama kartı artık branş adı ve gerçek katalog başlığıyla etiketlenir. Gün/teknik/doz/AI kabulü ve kayıt assert'leri korunur.

Beklenen sürüm artışları: guided-sports-6 ve ai-planner-9. Yeni branş bazlı yöntem eşlemesi AI adaylarını/günlerini etkiler; eski sürüm değerleri okunmaya devam eder.

Koşu regresyonunda varsayılan ağırlık seçilmediği doğrulaması artık kartın kapalı destek bölümünde görünmemesi + gönderilen methods dizisinin yalnız running olmasıyla yapılır. İşlevsel koşu/AI/editör kontrolleri korunur.

Sonuçlar: branch_methods_unit 207 geçti (DB testi ayrı genel koşuda); branch_methods_api 629 geçti; branch_methods_web 31 geçti; build exit 0. branch_methods_browser ve branch_methods_running_browser PASS. İlk kaynak/şablon kontrollerinde test assertion hatası yok. Yanlışlıkla geniş formatlanan ilgisiz altı Python dosyası birebir HEAD içeriklerine geri alındı; kapsam dışı kullanıcı değişiklikleri korunuyor.

Boks tarayıcı regresyonunun ilk koşusu kartı “Boks · ...uygulama” adıyla aradığı için zaman aşımına uğradı. Gerçek katalog etiketi “Boks · Partnerli teknik raunt”; yeni arayüz bunu doğru gösteriyordu. Test seçicisi bu gözlenen katalog başlığına düzeltildi; seçim, AI kabulü ve rapor assert'leri değiştirilmedi. İlk log korunur.

Boks son kontrolü branch_methods_boxing_final PASS: gerçek doğrulama uç noktasında sentetik AI yanıtı, dolu editör, gerçek sentetik tur kaydı ve rapor süresi doğrulandı. Önizleme hazır olma kontrolü 200; sunulan JS son yayın paketiyle eşleşiyor. Kişisel önizleme kayıtları okunmadı.
