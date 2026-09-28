# AI son istekler, sohbetten program ve profil fotoğrafı

2026-09-28. Kaynak tabanı: `8e63e66`; test kayıtlarında çalışma ağacı SHA-256 değerleri bulunur.

## Davranış

- AI son adımında gerekli serbest metin alanı: günler, çalışma şartları ve son tercihler. `final_requests` en fazla 4000 karakter; standart taslak etkilenmez.
- EVREN sohbetindeki seçilen yanıt, düzenlenebilir `chat_plan_text` (20000 karakter) olarak planlayıcıya aktarılır. Kullanıcı profil, kapasite, gün ve ekipmanı doğrular; yeniden açık gönderim onayı verir. Taslak düzenleyiciye aktarılır; aktif program ancak kullanıcının onayıyla değişir. Görseller taşınmaz.
- AI metni yapılandırılmış kapasite, süre, ekipman ve sağlık sınırlarını geçersiz kılamaz. Çelişkiler ve desteklenmeyen hareketler önizleme sınırlamalarında görünür. AI çıktısı katalog ve program doğrulamasından geçer.
- Profil fotoğrafı en fazla 8.000.000 bayt ve 12 megapiksel JPEG/PNG/WebP. Sunucu metaveriyi çıkarıp en fazla 960 piksel JPEG üretir. Sohbet görsellerinin mevcut 2 MB sınırı korunur.
- `media.save` içindeki `avatar` ve `profile_version` profil seçimini fotoğrafla aynı işlemde kaydeder. Sürüm çakışması iki kaydı da geri alır. Fotoğraf üst başlıkta, yan menüde ve ilk kurulum başlığında görünür.

## Veri ve yayın

Yeni SQL şeması veya MongoDB koleksiyonu yok. Ek JSON alanları `Program.decisions.guided_choices` içinde saklanır. Mevcut MongoDB kayıtları taşınmaz veya sıfırlanmaz. Fotoğraflar mevcut sahiplik kontrollü medya deposunda kalır. Sohbet aktarım taslağı hesabın yerel taslak deposundadır; kullanıcı onaylayınca program kaydına girer.

Mevcut ücretsiz Render servisi, GitHub `main` ve mevcut MongoDB bağlantısı kullanılır. EVREN bağlantısı yalnız Render gizli ortam ayarlarında tutulur. Kullanıcının önceki parola ile kayıt tercihi korunur. Ücretli kaynak oluşturulmaz.

Rollback: yalnız ön yüzü geri almak JSON verilerini silmez. Tam sunucu rollback'i yeni `ai-planner-14` kararlarını ve ek alanları okuyabilmeli; bunları reddeden eski API'ye körlemesine dönülmemeli. Şema geri alma/veri silme yok.

## Doğrulama

`docs/evidence/stage-9/final_touch_*` komut, kaynak hashleri, ortam, stdout/stderr ve exit kodlarını içerir. API, MongoDB işlem eşdeğerliği, tarayıcı, TypeScript/build, lint ve ön yüz birim testleri sentetik verilerle çalıştırılır. Harici EVREN çağrısı testte taklit edilir; gerçek AI yanıt kalitesinin veya biyolojik doğruluğun kanıtı değildir.

İlk tarayıcı denemesi bootstrap zaman aşımı; ikinci deneme sandbox localhost engeli; sonraki deneme erişilebilir textarea etiketi eşleşmesi nedeniyle durdu. Açık textarea etiketleri eklendi, test beklentileri gevşetilmedi. Kurulum başlığındaki fotoğraf koşulunun TypeScript `unknown` hatası açık boolean dönüşümüyle düzeltildi. Önceki başarısız çıktılar evidence/runs altında korunur.
