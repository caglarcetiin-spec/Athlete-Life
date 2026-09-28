# Ölçüm test notları

İlk metrics_browser koşusu süre dönüştürme, AI bağlamı ve önizlemeyi geçti; son editörde kapalı hareket ayrıntısını açmadan birim seçmeye çalıştığı için zaman aşımına uğradı. Test, kullanıcı akışındaki “hareketi düzenle” açma adımı eklenerek düzeltildi; sayısal beklentiler değiştirilmedi.

İkinci tarayıcı kontrolünde ölçüm grubuyla giriş aynı erişilebilir adı taşıdığı için seçici grubu buldu. Grup adı “ölçüm alanı” ekiyle ayrıldı; giriş adı korunuyor. API koşusundaki test_programming.py dosya yolu mevcut değildi; gerçek program test dosyası kullanılacak. Bu iki hata sayısal beklenen değerleri değiştirmiyor.

Üçüncü tarayıcı koşusu planı başarıyla kaydetti; test bootstrap içinde iç içe program.days beklediği için durdu. Sistem normalleştirilmiş program_days/program_exercises kullanır; test bu gerçek veri sözleşmesine göre düzeltildi. Kapasite API testi de doğru normalize edilmiş değerleri doğruladıktan sonra bootstrap anahtarını capabilities sandığı için durdu; mevcut anahtar capabilitys. Beklenen 1800/5000/90 değerleri değiştirilmedi.

Sonuç: metrics_browser_final tam plan → gerçek kayıt → seans özeti → yenileme akışını geçti. metrics_regression 259 test, metrics_web_final 36 test geçti. metrics_release_build son frontend kaynaklarını derledi; package_frontend.py bu çıktıyı release/v2'ye aldı. Son süreli teknik/mobilite ana alan eşlemesi web birim testine dahil edildi. Kişisel veri veya gerçek AI çağrısı ile test yapılmadı.
