# EVREN model karşılaştırması — ilk eleme

Bu tablo aynı sentetik 3 senaryoyu, aynı ai-planner-3 istemini ve aynı üretim validatörünü karşılaştırır. Son seçim finalist tekrarları ve analiz görevi sonrasında yapılır.

| Model | Geçerli taslak | Ortalama süre (başarısız istekler dahil) |
|---|---:|---:|
| qwen3.8-flash-next | 3/3 | 59.55 sn |
| mimo-v2.6-pro | 3/3 | 60.27 sn |
| glm-5.3 | 2/3 | 63.18 sn |
| qwen3-vl-30b | 1/3 | 12.41 sn |
| deepseek-v4.1-flash | 1/3 | 85.18 sn |
| deepseek-v4-flash | 0/3 | 38.72 sn |
| gemma-4-31b | 0/3 | 90.11 sn |

Başlangıç senaryosunda ekipman yetersizliğine ilişkin `needs_review` uyarısı beklenen doğru davranıştır; başarısızlık sayılmadı. Süre ve oranlar bu küçük deney örneklemine aittir, evrensel model sıralaması veya klinik doğrulama değildir.
