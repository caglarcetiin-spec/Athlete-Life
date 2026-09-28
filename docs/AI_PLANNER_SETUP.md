# AI planlayıcı kurulumu

28 Eylül 2026. Entegrasyon yerel inceleme için hazırlandı; gerçek OpenAI hesabı/anahtarı henüz yok. Bu nedenle **canlı GPT üretimi ve modelin plan kalitesi henüz doğrulanmadı**. Test çıktıları sentetik sağlayıcı yanıtlarıdır. Başlangıçta veya girişte otomatik ücretli çağrı yapılmaz.

## Hesap hazır olduğunda

1. [OpenAI API başlangıç rehberinden](https://developers.openai.com/api/docs/quickstart) Platform hesabını ve bir API projesini oluştur. Kullanım/ödeme ayarlarını kontrol et; ChatGPT oturumu bu uygulamaya API anahtarı sağlamaz.
2. Projeye ait API anahtarını oluştur. Anahtarı sohbet, kaynak dosya, GitHub, ekran görüntüsü veya tarayıcıya yazma. Uygulamanın sunucu ortamına gizli değer olarak ekle.
3. Sunucunun iki ayarı:

   | Sunucu değişkeni | Değer |
   | --- | --- |
   | `ALOS_V2_OPENAI_API_KEY` | Gizli proje API anahtarı |
   | `ALOS_V2_OPENAI_MODEL` | Hesabında açık, Responses + Structured Outputs destekli model kimliği |

   Örnek uyumlu model kimliği `gpt-4.1`; bu isim en ucuz/en iyi model iddiası değildir. [Resmî model sayfası](https://developers.openai.com/api/docs/models/gpt-4.1) Structured Outputs desteğini belirtir. Model seçimi ve maliyeti hesabın üzerinden kontrol edilmeli. Kod sabit bir modele veya modele sessiz geçişe bağlı değildir.
4. Yerel sunucu bu ortamla yeniden başlatılmalı. `.env` otomatik okunmaz. Anahtarı terminal geçmişine açıkça yazmadan gizli girişle sunucuya verebiliriz. Render'a yayınlama aşamasında aynı iki değer mevcut servisin gizli Environment ayarlarına eklenir; yeni ücretli Render hizmeti veya disk gerekmez. Bu görevde Render değiştirilmedi.
5. Planım → Birlikte program oluşturalım → sorular → Son bir kontrol → AI ile hazırla. Ekrandaki veri aktarım açıklamasını inceleyip onayla. İlk gerçek denemeyi sentetik bir profil/istekle yap; API erişimi, şema uyumu, gecikme ve plan kalitesini doğrula. Sonuçtan sonra kendi taslağını oluşturup düzenle ve açıkça ana plana al.

Anahtar yokken uygulama AI kurulumunun beklendiğini gösterir. “Hazır ayarlar” yalnız anahtar/modelin tanımlı olduğu anlamına gelir; kredi veya erişim garantisi değildir. Kullanıcı isterse standart taslağa açıkça geçebilir; başarısız AI çağrısı sessizce standart plana dönüştürülmez.

## Veri aktarımı ve maliyet

Her AI üretiminde `planning-form-v1` onayı gerekir; sayfa yenilenince onay yeniden alınır, form değişince temizlenir. Gönderilenler: hedef serbest metni, deneyim, amaç, ekipman, yöntemler, bildirilen hareket kapasitesi, günler/süre, bölge öncelikleri, dönem uzunluğu ve uygun hareket kataloğu. Serbest hedef metni kullanıcı yazdığı için özel bilgi içerebilir; gönderim öncesi ekranda açıklanır. Hesap ID/ad/şifre, kişisel GLB/fotoğraf, geçmiş antrenman, beslenme ve sağlık kayıtları gönderilmez. Sağlık kapısı yalnız sunucuda çalışır; uygun değilse dış istek yapılmaz.

Sabit HTTPS `api.openai.com/v1/responses` hedefi; yönlendirme takip edilmez, model tool erişimi almaz. `store:false` kullanılır; bu sağlayıcının bütün günlükleri tutmadığı veya sıfır saklama garantisi anlamına gelmez. Sağlayıcı anahtarı `SecretStr` ve sunucu ortamında kalır. Hata mesajı API gövdesini/anahtarı döndürmez. [Responses/Structured Outputs sözleşmesi](https://developers.openai.com/api/docs/guides/structured-outputs).

Varsayılan sınırlar: hesap başına 15 dakikada 3, tüm sunucuda 15 dakikada 20 istek; mevcut kalıcı oran sayacı kullanılır. Çıktı en fazla 7000 token, yanıt en fazla 1 MB, ağ zaman aşımı 60 saniye. Otomatik retry yok. Bunlar **parasal harcama tavanı değildir**; sağlayıcı hesabındaki fatura ve kullanım ayarları ayrıca yönetilir. Anahtarı kaldırmak AI üretimini kapatır.

## AI planının denetimi ve sınırları

AI hedefe göre hareket seçer, set/tekrar/tutuş/dinlenme önerir ve gerekçe yazar. Kanonik aday filtresi ekipman, yöntem, bildirilen ileri beceri ve sevilmeyen hareketleri kullanır. Yanıt katı JSON şemasından sonra ayrıca şu kontrollerden geçer: doğru/tekil gün, desteklenen/tekil hareket, uygun split, modalite birimi, bildirilen kapasite tavanı, süre ve set üst sınırı, teknik blok sırası/süresi, temel hareket kapsamı. Eksik yöntem veya belirgin bölge katkısı uyarılır. Hatalı taslak kabul edilmez. İstek hiçbir program/gerçek set yaratmaz; düzenleyici → taslak kaydı → ana plana alma mevcut hattır.

Bu denetimler matematik ve uygulama sözleşmesidir; klinik uygunluk, optimal doz veya uzman antrenör değerlendirmesi değildir. Yeni kilogram, sağlık tanısı, hasar/iyileşme yüzdesi veya otomatik progresyon oluşturulmaz. Mevcut kayıt ve 3B analiz hattı korunur. Bu ilk entegrasyon tek taslak üretimidir; sohbetli takip, geçmiş kayıtları AI'ye gönderme veya kendiliğinden haftalık plan değiştirme içermez.

## Şema / yayın / geri dönüş

SQL sütunu/Mongo koleksiyonu eklenmedi; hesap ve medya göçü yok. `ProgramInput.ai_origin` isteğe bağlı metadata: provider/model/prompt_version/generated_at/summary; `Program.decisions.ai_origin` içinde korunur. Kullanıcının düzenlediği taslakla birlikte kaydedilir; kriptografik üretim kanıtı veya planın düzenlenmediği garantisi değildir. Ham istemden ve ham sağlayıcı yanıtından kalıcı günlük tutulmaz. Mevcut `guided_choices` değişmez. Sayısal kural sürümü `openai-planner-1` belgelenmiştir.

Henüz GitHub/Render yayını yapılmadı. Ücretsiz Render ve MongoDB korunur. Rollback: anahtarı kaldırıp AI'yi kapat; UI/API birlikte önceki pakete alınabilir. Önceki API yeni `ai_origin` alanını taslak kaydında tanımayabilir, bu yüzden tarayıcıdaki bekleyen yeni taslaklar dışarı aktarılmadan eski API'ye dönülmemeli. Kaydedilmiş planın hareket/setleri standart kanoniktir; metadata eklemelidir.

## Kanıt

`docs/evidence/stage-9/ai-*`: komut, baz commit, kaynak hashleri, stdout/stderr, çıkış kodu. `docs/evidence/ai-planning/VALIDATION.md`: başarısız fixture koşuları ve düzeltme gerekçeleri. Testler yerel sentetik PostgreSQL/Mongo, taklit OpenAI HTTP yanıtları ve mobil tarayıcı UI sözleşmesini kapsar. Hiçbir test gerçek OpenAI sunucusuna bağlanmaz.

### 28 Eylül — son kontrol ekranı düzeltmesi

Yöntem seçimi artık seçili durumu belirgin native radio kontrolüdür. Anahtar yokken de onay kutusu kullanılabilir; üretim düğmesi sessizce devre dışı kalmak yerine eksik bağlantı/izin/yaş koşulunu açıklar. Kurulum bağlantısı ve sayfayı yenilemeden bağlantı durumunu tekrar okuma eklenmiştir. Program adı, tarih, yaş/belirti gibi OpenAI'ye gönderilmeyen alanlar onayı silmez; dışarı gönderilecek hedef/ekipman/yetkinlik gibi alanlar değişirse onay yeniden gerekir. Sağlık kapısı ve sunucudaki onay doğrulaması korunur. Bu UI düzeltmesi API anahtarı olmadan gerçek GPT erişimi sağlamaz.

`ai-controls-browser` anahtarsız seçim/onay, eksik bağlantıda sıfır AI isteği, yeniden kontrol, onaysız sıfır istek, taklit sağlayıcı hatası/başarısı ve plan kaydını doğrular. Üretim derlemesi ve lint geçti. Şema, hesap/medya göçü veya sunucu sırrı değişikliği yok. Yerel önizleme güncel; Render yayını yok. Geri dönüş yalnız UI/paket commit'idir; ana veriyi etkilemez.
