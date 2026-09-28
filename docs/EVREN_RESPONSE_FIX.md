# EVREN plan yanıtı düzeltmesi — 28 Eylül 2026

## Yeniden üretilen iki sorun

Kişisel hesap/DB kullanmadan beş günlük PPL + beceri/kondisyon senaryosu çalıştırıldı. İlk gerçek EVREN çağrısı `finish_reason=length`, 10.000 completion tokenı (6.966 reasoning tokenı), yarım JSON ve 89,81 saniye ile bitti. JSON tamamlanmadan plan kaydı yapılmaması doğruydu; tek genel mesaj nedeni gizliyordu.

Bütçe/istem değişikliğinden sonraki ikinci çağrı JSON'u tamamladı (`stop`, 8.604 completion tokenı, 76,86 saniye). Ancak itiş gününe scapular/çekiş aksesuarı eklediği için mevcut dağılım kontrolü haklı olarak reddetti. Modele günün adı ve zorunlu hareket örüntüleri gönderiliyordu; validatördeki izin verilen aileler tüm ayrıntılarıyla gönderilmiyordu.

Son gün listesi düzeltmesinden sonraki üçüncü canlı deneme `stop`, 64,74 saniye ve tüm kanonik plan denetimlerinden PASS sonucu verdi. Üretilen gerçek sentetik yanıt ayrıca PostgreSQL/MongoDB testlerinde taslak olarak kaydedilip geri okunur.

## Değişiklik

- EVREN çıktı bütçesi 16.000 token, bağlantı/socket bekleme süresi 150 saniye. İstemci AI isteği 180 saniye; normal API istekleri 12 saniye olarak kaldı. Socket timeout toplam duvar saati garantisi değildir.
- `ai-planner-4`: kısa açıklamalar ve kompakt JSON istenir. Günlere özgü `allowed_movement_ids`, validatörün de kullandığı tek `ALLOWED_FAMILIES` sabitinden üretilir. Aday ekipman/yetkinlik filtresi korunur.
- Tamamlanmayan yanıt, JSON hatası, şema hatası, ret ve zarf hatası ayrı tanılanır. Günlüğe yalnız sabit hata kategorisi yazılır; form/yanıt/anahtar yazılmaz.
- Sadece tek, tam kapsayan JSON/Markdown çiti kaldırılabilir. Eksik JSON onarılmaz, yarım hafta kaydedilmez, dozu veya hareketleri sessizce değiştiren bir düzeltme uygulanmaz. Otomatik tekrar/fallback yok.
- Mevcut 1/2/3 istem sürümleri ve yeni 4 sürümüyle taslak kaydı desteklenir; açık kullanıcı onayı olmadan program kaydı/aktivasyonu yapılmaz.

## Doğrulama ve yeniden üretim

`docs/evidence/stage-9/evren-response-*.json` komut, commit, çalışma ağacı hashleri, süre ve exit code; bitişik `.log` dosyaları stdout/stderr içerir. Önceki çalışma çıktıları `runs/` altında korunur.

- API/planlayıcı: 76 test; istemci: 4 test (130 saniyelik sentetik yanıtın kesilmeden alınması dahil).
- Geçici MongoDB: 3 test, kanonik taslak kaydı.
- Build ve Python lint.
- Canlı sentetik denemeler: `docs/evidence/evren/response-*.json`. Otomatik testlerde sağlayıcı cevapları sentetiktir.

Elle yeniden üretim, depo kökünden:

```sh
PYTHON_DOTENV_DISABLED=1 STORAGE_BACKEND=sqlite ACCOUNT_STORAGE_BACKEND=sqlite .venv-v2/bin/python tools/v2/diagnose_evren_response.py
```

Anahtar terminalde gizli istenir; test aracının çıktısı yalnız sentetik plan ve teknik sonuçtur. Kullanıcının gerçek programı bu amaçla okunmaz/gönderilmez. Bu küçük örneklem gelecekte her AI yanıtının geçerli olacağını garanti etmez.

## Veri, yayın, geri dönüş

Kalıcı DB alanı/şeması, hesap/medya göçü veya gerçek plan değişikliği yok. Yerel 10005 önizlemesi aynı MongoDB ve Qwen/low ayarıyla yenilendi; secret yalnız süreç belleğinde/anonim pipe üzerinden taşındı. Arayüz paketi `release/v2` içinde hazır; GitHub push/Render yayını yapılmadı. Geri dönüş önceki kod + arayüz paketini yükleyip sunucuyu yeniden başlatmaktır; veri silme gerekmez. Eski kod v4 kökenli yeni taslakları kabul etmeyeceğinden v4 kabulü geri dönüşte korunmalıdır.
