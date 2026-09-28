# Athlete Life için EVREN model seçimi

28 Eylül 2026 · **Seçim: `qwen3.8-flash-next`, reasoning `low`.**

Bu seçim EVREN'deki genel olarak “en zeki” veya klinik olarak doğrulanmış spor uzmanı iddiası değildir. Athlete Life'ın mevcut metin planlama işi, hareket kataloğu, istemi, JSON sözleşmesi ve süre bütçesinde yapılan küçük canlı karşılaştırmanın sonucudur.

## Yöntem

- Hesabın `/v1/models` kataloğundaki yedi adlandırılmış metin/vision-chat modeli denendi. OCR, ses, embedding, reranker göreve uygun olmadığı için; `auto` ise sabit bir model olmadığı için karşılaştırmaya alınmadı.
- Ortak `ai-planner-3`, aynı sentetik formlar, uygun hareket listesi, 10.000 çıkış tokenı bütçesi, 90 saniye socket timeout, otomatik tekrar yok. Destek bildiren modellerde reasoning `low`; diğerlerinde ayar gönderilmedi. Aynı ayarların her modelin teorik optimumu olduğu varsayılmadı.
- Başlangıç/ekipmansız (3 gün, 35 dakika), hibrit (4 gün, 75 dakika, EZ bar/halka/barfiks), ileri beceri + kondisyon (front lever, muscle-up, dört gün) senaryoları.
- İlk eleme: 7×3 = 21 üretim. Öne çıkan MiMo/Qwen'e aynı üç senaryo ikinci kez: 6 üretim. Üç modelin hatalı ve düzgün plan analizi: 6 çağrı. **Toplam 33 canlı model çağrısı**, yalnız sentetik içerik; kişisel hesap/sağlık/antrenman kayıtları okunmadı, DB bağlantısı açılmadı.
- Plan üretiminde 3, analizde 2 eşzamanlı istek. Çağrı sırası rastgeleleştirilmedi; gateway yükü ve gün/saat gecikmeyi etkileyebilir. Bu bir istatistiksel güvenilirlik sertifikası değildir.
- Eleme ölçütü önce yapısal + domain doğrulaması, sonra hedef/yöntem kapsamı ve açıklama kalitesi, sonra gecikme. Set sayısının daha yüksek olması kendiliğinden daha iyi kabul edilmedi.

## Eşit koşullu ilk eleme

| Model | Geçerli plan / 3 | Ortalama saniye, hatalar dahil | Gözlem |
|---|---:|---:|---|
| Qwen3.8-Flash-Next | 3/3 | 59,55 | Üç senaryo geçerli; eksik ekipmanı açıkça bildirdi |
| MiMo-v2.6-Pro | 3/3 | 60,27 | Üç senaryo geçerli; Türkçe açıklamada bazı ifade kusurları |
| GLM-5.3 | 2/3 | 63,18 | Hibrit/beceri başarılı, başlangıç isteği süre sınırında kaldı |
| DeepSeek-v4.1-Flash | 1/3 | 85,18 | İki süre aşımı |
| Qwen3-VL-30B | 1/3 | 12,41 | Çok hızlı; iki yanıt uygulama biçimine uymadı |
| DeepSeek-v4-Flash | 0/3 | 38,72 | Yanıtlar çıktı bütçesi nedeniyle `length` ile sonlandı |
| Gemma-4-31B | 0/3 | 90,11 | Üç istekte süre sınırı |

Başlangıç vakasında uygun katalogda sırt çekişi yok. Bunu `needs_review` ile açıklamak doğru davranış; başarısızlık sayılmadı. Tablo modellerin bütün kullanım alanlarında başarısız olduğunu göstermez; mevcut adaptör/bütçeye uyumu ölçer.

## Finalist tekrarları

| Model | İki tur toplam | Ortalama süre, tüm istekler | Süre aralığı |
|---|---:|---:|---:|
| **Qwen3.8-Flash-Next** | **6/6** | **66,18 sn** | 35,95–89,62 sn |
| MiMo-v2.6-Pro | 5/6 | 58,92 sn | 30,66–80,47 sn |

MiMo ikinci hibrit istekte geçerli yapılandırılmış plan veremedi. Qwen iki turda da becerileri uygun sıraya koydu, mevcut yetkinlik sınırlarını, süre/set bütçelerini ve ekipman kısıtlarını geçti; başlangıç örneğinde sırt kapsamı eksikliğini saklamadı. En uzun başarılı Qwen çağrısı 90 saniye sınırına yakın: gecikme riski sürüyor. Altı başarı gelecekte %100 başarı garantisi değildir.

## Antrenman analizi: yalnız hata etiketi sayısı yeterli değil

Sentetik hatalı planda 8 sorun türü vardı: ekipman, yetkinlik, set hacmi, RIR, süre, kas/hareket dengesi, aynı hareketin tekrarı ve ölçülmemiş biyolojik yüzdeler. Kontrol planında bu sözleşmeye göre ihlal yoktu.

| Model | Bulduğu sorun türü | Düzgün kontrol planı | Elle incelenen sınırlılık |
|---|---:|---|---|
| **Qwen3.8-Flash-Next** | **8/8** | **0 yanlış alarm** | Süreyi 4130 sn yazdı; doğru hesap 4070 sn. Bazı alternatifler ek destek/ekipman gerektirebilir. |
| GLM-5.3 | 8/8 | 0 yanlış alarm | Süreyi yalnız yaklaşık verdi; ekipman yokken masa altı çekiş alternatifini sundu. |
| MiMo-v2.6-Pro | 8/8 | Geçerli JSON yanıtı alınamadı | 4070 sn hesabı doğru; yetkinliği/ekipmanı belirsiz kişiye tuck front lever önerisi sorunlu. |

Bu nedenle “8/8 sorun buldu” kusursuz veya tıbben güvenilir analiz demek değildir. Üç modelin de önerileri ekipman/kapasite kontrollerinden geçmeli. Süre, set sayısı, RIR ve kayıt hesapları mevcut deterministik motorda kalmalı; LLM'nin serbest metin hesabı ölçüm gibi gösterilmemeli. Bu tur ayrı bir analiz ekranı veya otomatik sağlık kararı modülü eklenmedi; analiz çağrıları seçim deneyidir.

## Spor bilimi bakımından sınır

ACSM'nin 2026 kılavuz özeti hedefe ve kişiye uygun, sürdürülebilir direnç antrenmanını vurgular; karmaşıklık veya her seti tükenişe götürmek genel yetişkin grubunda zorunlu üstünlük göstermez. Bu yüzden uzun/karmaşık yanıt otomatik olarak yüksek kalite sayılmadı. Kaynak: https://acsm.org/resistance-training-guidelines-update-2026/

Uygulamadaki 12/20/24 set tavanları, RIR 2–5 ve bildirilen kapasitenin %60/%70'i gibi sınırlar yazılımın muhafazakâr planlama varsayımlarıdır; bu deney onları klinik kurala dönüştürmez. Doğum sonrası, hastalık, sakatlık rehabilitasyonu, yarışma hazırlığı, dayanıklılık branşları, kadın döngüsü ve bütün spor dalları için model uzmanlığı test edilmedi. Kesin kas hasarı/iyileşme yüzdesi hiçbir modelin metninden ölçüm gibi üretilmemeli.

## Karar ve uygulama

Ana planlayıcı için **Qwen3.8-Flash-Next / low** seçildi. Gerekçe: bu örneklemde en tutarlı geçerli plan üretimi, eksik veriyi belirtmesi, hata analizindeki kapsama ve kontrol planında sıfır yanlış alarm. GLM kötü bir model ilan edilmedi; bu uygulamanın mevcut üretim koşullarında Qwen daha tutarlı çıktı. MiMo daha hızlı alternatif, fakat otomatik fallback olarak etkinleştirilmedi.

Yerel `http://127.0.0.1:10005/#program` önizlemesi aynı veri deposuyla seçilen modele geçirildi. Anahtar yalnız sunucu süreci belleğinde; kaynak/GitHub/rapora yazılmadı. Yeniden başlatmada güvenli secret kurulumu gerekir. `.env.example` model seçimini belgelemek için güncellendi; uygulama bu dosyayı otomatik okumaz.

Render yayını, yeni ücretli kaynak, şema/hesap/medya göçü veya mevcut programların değiştirilmesi yapılmadı. Geri alma `ALOS_V2_EVREN_MODEL=glm-5.3` ve reasoning `low` ile sunucuyu yeniden başlatmaktır; geçmiş planlar silinmez. Gerçek üretimde tüm taslaklar validatör + kullanıcı kabulünden geçmeye devam eder.

## Kanıt ve yeniden üretim

- İlk eleme: `docs/evidence/evren/benchmark-20260928T034234Z/`
- Finalist tekrarı: `docs/evidence/evren/benchmark-20260928T035015Z/`
- Analiz + kontrol: `docs/evidence/evren/critique-20260928T035254Z/`
- Birleşik sayılar: `docs/evidence/evren/model-selection/combined-summary.json`
- Kaynak commit/hash, senaryolar, model yetenekleri ilgili manifestlerde; her yanıt/sonuç sentetik JSON artefact'ında. Provider reasoning metni, anahtarlar ve hesap bakiyesi tutulmadı.

```sh
PYTHON_DOTENV_DISABLED=1 STORAGE_BACKEND=sqlite ACCOUNT_STORAGE_BACKEND=sqlite .venv-v2/bin/python tools/v2/benchmark_evren.py
PYTHON_DOTENV_DISABLED=1 STORAGE_BACKEND=sqlite ACCOUNT_STORAGE_BACKEND=sqlite .venv-v2/bin/python tools/v2/benchmark_evren.py --models mimo-v2.6-pro qwen3.8-flash-next
.venv-v2/bin/python tools/v2/critique_evren.py mimo-v2.6-pro qwen3.8-flash-next glm-5.3
```

Bunlar manuel dış API çağrılarıdır; otomatik test kapsamına alınmaz. Yeni çağrılar sağlayıcının o andaki kota/ücret koşullarına tabidir. İlk fixture hazırlığında min conditioning_minutes ve odak anahtarı düzeltildi; model karşılaştırması başlamadan üç form yerel şemadan geçirildi. Karşılaştırma sırasında üretim istemi/validatör değiştirilmedi.
