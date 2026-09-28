# Branş tekniği ve performans notları — 28 Eylül 2026

## Bulgu

Alan işlevsiz değildi. `GuidedPlan` içindeki yazı, seçilen branşın
`sport_experience[].known_skills` alanına kaydediliyordu. `ai_planning.prepare`
bu listeyi ve `training_history` alanını izinli AI bağlamına dahil ediyor;
`call_evren` aynı bağlamı JSON olarak kullanıcı mesajında gönderiyor.
Önceki genel talimat branş geçmişini dikkate almayı istiyordu ancak teknik
notlarının kullanımını ayrı ve açık biçimde anlatmıyordu.

## Değişiklik

- Branş deneyimi bölümleri açık başlar. Not kutusu görünür, gerekli olarak
  etiketlenir; ne yazılması gerektiği ve AI onayı sonrası gönderileceği açıklanır.
- Seçili her branşın notu tamamlanmadan üçüncü adımdan ilerlenmez.
  Yalnız boşluk geçerli cevap değildir. Sayısal geçmiş alanları isteğe bağlı kalır.
- Bilgisi olmayan kişi açıkça “Henüz teknik veya performans bilgim yok” seçer;
  bu cevap sıfır kapasite ya da ölçülmüş veri olarak yorumlanmaz.
- Eski cihaz taslağında boş not varsa en geç bu adıma dönülür. Son oluşturma
  düğmesi de eksikliği kontrol eder. Mevcut onaylı programlar değiştirilmez.
- `ai-planner-13` talimatı teknik, performans, birim ve belirsizlik bilgisini
  hareket seçimi, zorluk ve ilerleme değerlendirmesinde kullanmayı; önemli
  etkileri gerekçede/eksiklikte açıklamayı ister. Serbest metin, katalog dışı
  hareketi veya kişinin seçmediği ileri beceriyi kendiliğinden etkinleştirmez.
- Tamamlama şartı yeni sihirbazın arayüz kuralıdır. Eski API/program kayıtları
  boş `known_skills` ile okunmaya devam eder; eksik bilgi UNKNOWN kalır.

## Doğrulama ve sınır

`docs/evidence/stage-9/sport_experience_*` komutu, ortamı, kaynak commit/dosya
özetlerini, stdout/stderr ve exit code'u saklar. 71 API ve 45 ön yüz testi geçti.
Kalistenik, koşu, yüzme ve boks notlarının gerçek HTTP isteği oluşturma kodundan
eksiksiz çıktığı sahte EVREN taşımasıyla doğrulandı. Onaylanan planda notların
saklanması, kapasite sınırlarının metinle aşılmaması da kontrol edildi.

Sentetik mobil tarayıcı testi: boş/boşluk yanıtın engellenmesi, her branşın ayrı
tamamlanması, açık bilinmiyor yanıtı, yeniden açılışta notların korunması,
AI istek gövdesi ve düzenleyiciye ilerleme. Erişilebilirlik taraması sıfır ihlal.
Gerçek sağlayıcıya veya kişisel hesaba test isteği yapılmadı. Bu testler LLM'nin
her notu her seferinde doğru yorumladığını veya planın biyolojik doğruluğunu
kanıtlamaz; veri iletimi, talimat ve uygulama davranışını doğrular.

İlk API koşusu 62 geçti/1 başarısızdı. Önceden var olan
`test_generated_schema_error_does_not_blame_form`, kontrollü onarım akışından
önceki `ai_invalid_response` kodunu bekliyordu. `generate_validated` iki başarısız
denemeden sonra zaten `ai_draft_rejected` döndürüyor; `test_ai_repair` bu sözleşmeyi
test ediyordu. Beklenti güncellendi; iki çağrı ve `repair_attempted` doğrulaması
eklendi. 502, özel çıktı sızmaması ve kayıt yazılmaması koşulları korundu.
Başarısız koşu kanıt geçmişindedir.

## Şema, yayın ve geri dönüş

Yeni veri alanı veya veritabanı şema değişikliği yok. Hesap, MongoDB verisi ve
medya göçü yok. Bu teslim yerel 10005 önizlemesindedir; Render yayını yapılmaz.
Geri dönüşte `ai-planner-13` okuma uyumluluğu korunmalı; yeni plan kayıtlarını
strict eski sürümün reddetmemesi gerekir. Ücretli kaynak eklenmedi.
