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

## EVREN alternatifi — 28 Eylül 2026

Resmî kaynak: https://evren.ssyz.org.tr/llm/models (giriş gerekli), halka açık https://evren.ssyz.org.tr/llm-inference/.
Resmî katalog istemcisindeki örnekler `https://evren-llmapi.ssyz.org.tr/v1`, Bearer veya X-API-Key kimlik doğrulaması, `/models`, `/terms/status`, `/chat/completions` ve `/responses` yollarını yayımlar. Bu uygulama EVREN için Chat Completions kullanır. OpenAI aynı Responses entegrasyonuyla korunur.

Sunucunun gizli ortam ayarları:

```text
ALOS_V2_AI_PROVIDER=evren
ALOS_V2_EVREN_API_KEY=<sunucuda gizli değer>
ALOS_V2_EVREN_MODEL=<hesabında erişilebilir metin modeli>
```

- Anahtar kaynak koda, frontend VITE değişkenine, loga veya GitHub'a yazılmaz. Uygulama `.env` dosyasını kendiliğinden okumaz.
- Kullanıcı EVREN'deki LLM kullanım koşullarını kendisi okumalı/kabul etmeli. Uygulama kullanım koşullarını otomatik kabul etmez. 403, koşullar/model/anahtar izinleri için açıklama gösterir.
- Sabit HTTPS hedefi ve yönlendirme reddi anahtarın başka domaine gitmesini engeller. EVREN hatasında OpenAI'ye otomatik geçiş yoktur.
- EVREN onayı `planning-form-evren-v1`; önceki OpenAI onayı geçersizdir. Sağlayıcı değişimi veya gönderilen form verisi değişimi onayı temizler; aynı sağlayıcıdaki bağlantı yenilemesi yerel onayı korur.
- Yalnız formdaki hedef, ekipman, deneyim, yöntem, yetkinlik, odak, süre ve uygun hareket kataloğu gönderilir. Sağlık kayıtları/kimlik/şifre/medya gönderilmez. Kullanıcının hedef metni dış sağlayıcıya gittiği için arayüzde açıkça belirtilir.
- EVREN'in OpenAI uyumluluğu strict JSON Schema desteği garantisi sayılmaz. JSON şeması isteme eklenir; yanıt Pydantic + mevcut hareket/süre/yetkinlik doğrulamasından geçer. Sadece tek dış Markdown JSON çiti kaldırılabilir; yanlış JSON veya plan onarılıp sessiz kabul edilmez. Eksik/yarım yanıtlar, araç çağrıları ve hatalar kayda dönüşmez.
- Socket timeout 90 s, çıktı bütçesi 10.000 token (akıl yürütme de kullanabilir), en fazla 1 MB yanıt, otomatik tekrar yok. Provider rate limits ve mevcut uygulama 15 dakikalık limitleri birlikte geçerli; bunlar parasal harcama tavanı değildir.
- Durum uç noktası yalnız ayar varlığını bildirir. Gerçek API erişimi ve model kalitesi ayrı canlı sentetik denemeyle doğrulanmalıdır.
- Resmî sayfa 1 Kasım 2026'ya kadar ücretsiz entegrasyon dönemi belirtir; bu kalıcı ücretsiz kullanım garantisi veya üretim hizmet seviyesi taahhüdü değildir.

Şema ve hesap/medya göçü yok. Render yayını ve kalıcı sunucu sırrı kurulumu bu yerel bağlantı çalışmasının parçası olarak yapılmadı. `AI_PROVIDER=openai` ile sağlayıcı geri alınabilir; uygun OpenAI key/model ve yeniden kullanıcı onayı gerekir. Kayıtları silmeyin.

### Doğrulanmış yerel bağlantı

28 Eylül 2026: kullanım koşulları kullanıcı tarafından kabul edildikten sonra `mimo-v2.6-pro` + `ALOS_V2_EVREN_REASONING_EFFORT=low` ile dört günlük sentetik hibrit taslak ~62 saniyede üretildi ve ortak validatörden geçti. Tek örnek bütün hedef/ekipman kombinasyonlarının kalite garantisi değildir. GLM ve Gemma ilk uzun isteklerde 90 saniye sınırına takıldı; MiMo reasoning=none ilk denemelerde hatalı plan üretti ve reddedildi. Hatalar sessizce düzeltilmedi veya kaydedilmedi. EVREN modeli ancak hesabın `/v1/models` yanıtında desteklenen reasoning değerleriyle yapılandırılmalı.

İstem `ai-planner-2`, her adayın ölçü/set kurallarını, günlük süre/set bütçesini ve formdan türetilen başlangıç taslağını açıkça iletir. LLM bunu düzenler ve açıklar; çıktı aynı kurallardan geçmeden kabul edilmez. Gerçek geçmiş antrenman verisi gönderilmez.

Yeniden üretim (manuel gerçek API çağrısı; otomatik test değildir):

```sh
PYTHON_DOTENV_DISABLED=1 STORAGE_BACKEND=sqlite ACCOUNT_STORAGE_BACKEND=sqlite .venv-v2/bin/python tools/v2/verify_evren.py --model mimo-v2.6-pro --reasoning-effort low
```

Anahtar yankısız terminal isteminde girilir. Araç veritabanı bağlantısı açmaz; yalnız sabit sentetik örneği gönderir. Sağlayıcı, komut, source commit/hash, süre ve exit-code içeren secretsiz artefact `docs/evidence/evren/live-*.json` altında tutulur.

### Güncel kullanıcı seçimi: GLM‑5.3

Kullanıcı talebi üzerine yerel aktif model ve `.env.example` EVREN `glm-5.3` / reasoning `low` olarak değiştirildi. MiMo artık aktif tercih değildir; sessiz model geçişi yoktur. 28 Eylül sentetik canlı kabul: dört gün, 22 hareket girdisi, 43.21 saniye, `draft` validasyonu PASS. Önceki iki GLM denemesi hareket kapsamı / yanıt biçimi nedeniyle reddedildi; bu tek başarı her çağrıda geçerli plan garantisi değildir. `ai-planner-3` gün bazında required_patterns ve minimum_strength_sets alanlarını aynı validatör sabitlerinden üretir. Çıktı bütçesi 10.000, timeout 90 s aynı kaldı. Başarılı tanı çağrısı 4.359 giriş, 2.097 çıkış tokenı kullandı (402 reasoning dahil); maliyet/kota kullanım sayısı garantisi değildir.

```sh
.venv-v2/bin/python tools/v2/verify_evren.py --model glm-5.3 --reasoning-effort low
```

Anahtar yalnız çalışan önizleme sürecinin belleğinde; yeniden başlatma için güvenli sunucu ayarı gerekir. Render/GitHub yayını bu model seçimi sırasında yapılmadı.

### 28 Eylül — karşılaştırma sonrası güncel seçim

Kullanıcının EVREN modellerini karşılaştırıp en uygunu seçme talebiyle 7 model/33 sentetik çağrı değerlendirildi. Güncel yerel tercih `ALOS_V2_EVREN_MODEL=qwen3.8-flash-next`, `ALOS_V2_EVREN_REASONING_EFFORT=low`. Ayrıntılı yöntem, sonuçlar, hata analizi ve sınırlılıklar: `docs/EVREN_MODEL_COMPARISON.md`. GLM'den sessiz fallback yok; bu açık model seçimi sunucu ayarında yapıldı. Anahtar süreç belleğinde, Render yayını yok.
