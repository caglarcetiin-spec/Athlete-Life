# MongoDB uyarlama incelemesi — 23 Eylül 2026

Kapsam: kullanıcının mevcut MongoDB ve ücretsiz Render kararı (ADR-0005). Canlı Atlas/Render değişmedi. Testler yalnız `127.0.0.1:27028`, `alos_test_*` sentetik verilerle; kişisel yedek/hesap/medya kullanılmadı.

## Değişiklik

V2 repository için MongoDB backend, snapshot/majority transaction, unique/partial index, owner/referans/CHECK doğrulaması, UTC tarih eşlemesi, büyük kayıtların transaction içi parçalanması eklendi. SQL/SQLite ana veriye çift yazım yok. MongoDB transaction geçici hataları sınırlı tekrar edilir; bilinmeyen commit sonucu aynı commit ile doğrulanır. Geçici hatalar gizli bağlantı bilgisi içermeyen 503 döndürür. Worker geçici bağlantı hatasında kapanmadan tekrar dener.

Yeni `alos_v2_*` koleksiyonları eski v10 koleksiyonlarını değiştirmez. Render taslağı Python/free mevcut servis ayarlarına çevrildi; yeni DB/disk/worker oluşturmuyor. PostgreSQL yalnız alternatif regression backend olarak durur.

## Hata incelemeleri

- İlk CHECK uyarlamasında parser `IS NOT NULL` için `Is.negate` kullandığından gece vardiyası constraint'i hatalı reddedildi. Compiler düzeltildi; gece yarısını aşan vardiya ve NULL mantığı için test eklendi. İş kuralı assertion'ları değiştirilmedi.
- Sekiz eşzamanlı yazıcıda 6 kısa retry yeterli değildi. Retry toplam 10 saniye/40 denemeyle sınırlı exponential jitter olarak düzeltildi. 20 farklı kayıt/cursor testi değişmeden geçti.
- Yerel MongoDB dosya sınırına ulaştı (`TooManyFilesOpen`); restore UI başarılıyken cleanup dahil sunucu çöktü. Başarısız çalıştırmalar saklandı. Yerel daemon 65536 dosya limitiyle yeniden başlatıldı. Test fixture'ı migration başarısız olduğunda da kendi sentetik DB'sini temizleyecek şekilde düzeltildi.
- Önceki evidence manifest `tests/mongodb` içermiyordu. Yeni runner bu dizini, YAML ve lock dosyalarını da hashler. Eski loglar bu genişletilmiş kapsamın kanıtı sayılmaz.

## Kanıtlar

- `mongo-core.json/log`: 10 çekirdek test PASS.
- `mongo-parity.json/log`: 52 domain/query test PASS (daha erken kaynak snapshot'ı; nihai suite ayrıca).
- `mongo-durability.json/log`: 3 test PASS; gerçek subprocess SIGKILL, schema revision ve NULL filtre semantiği.
- `stage-6/{shift,restore,runner,lifestyle,reports}-regression.json/log`: beş gerçek tarayıcı yolu PASS; Mongo backend ortamı komut metadata'sına ayrıca aşağıda kaydedilir.
- `postgres-regression.json/log`: ortak değişikliklerden sonra 61 eski backend testi PASS.
- `stage-8/blueprint-validation.json`: resmi Render JSON şeması PASS; gerçek deploy değildir.
- `mongo-suite.json/log`: **65 PASS**, 227,70 saniye, exit 0; nihai kaynak hash manifesti ve test ortamı bu çalıştırmada. İki dependency deprecation uyarısı var.

## Sınırlar ve yayın

Tek ortak transactional writer fence eşzamanlı referans silme yarışlarını önler ancak yazma kapasitesini sınırlar. Commit öncesi süreç ölümü sonrası tekrar 66,67 saniyede tamamlandı; bu sürede false ACK verilmedi. Klinik/biyolojik doğrulama iddiası yok.

**Canlı geçiş NO-GO:** mevcut hesap/parola özeti, kaynak snapshot ve özel medya için kontrollü geçiş/rollback provası ve Linux Mongo CI sonucu henüz tamamlanmadı. CI Mongo job'ı eklendi; yerel PASS, CI çalışmış demek değildir. Eski servis çalışma halinde korunur. Hesaplar otomatik taşınmadı. Yeni V2 yazıları başladıktan sonra eski v10'a körlemesine rollback yapılmaz; o yazılar ayrı korunmalıdır.

Tarayıcı test ortamı: `PYTHON_DOTENV_DISABLED=1 STORAGE_BACKEND=sqlite ACCOUNT_STORAGE_BACKEND=sqlite ALOS_TEST_BACKEND=mongodb ALOS_BROWSER_EXECUTABLE=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; Node 24.19.0. Test DB URI ve adı araç içinde yalnız localhost/sentetik olarak sabittir. Gerçek URI veya secret kaydedilmedi.

### Yerel toplu test sunucusu düzeltmesi

İlk nihai suite 58 testten sonra yine dosya sınırına takıldı; 65536 kabuk limiti tek başına yeterli değildi. `sysctl` salt okunur ölçümü `kern.maxfiles=30720`, `kern.maxfilesperproc=10240` verdi. Sistem geneli değiştirilmedi. Yerel MongoDB test daemon'unda varsayılan 600 saniye boşta açık dosya tutma süresi 10 saniyeye, tarama aralığı 5 saniyeye, minimum açık handle eşiği 128'e ayarlandı. Bu yalnız çok sayıda ayrı DB oluşturan test sunucusunun ayarıdır; uygulama, Atlas veya Render değişikliği değildir. Başarısız suite evidence geçmişinde korunur.

Yeniden üretim (repo kökünde, yalnız sentetik dizin):

```sh
ulimit -n 65536
.runtime-v2/mongodb/bin/mongod --dbpath .cache-v2/mongodb-test --port 27028 --bind_ip 127.0.0.1 --replSet alos-test --logpath .cache-v2/mongodb-test.log --setParameter wiredTigerFileHandleCloseIdleTime=10 --setParameter wiredTigerFileHandleCloseMinimum=128 --setParameter wiredTigerFileHandleCloseScanInterval=5 --fork
PYTHON_DOTENV_DISABLED=1 STORAGE_BACKEND=sqlite ACCOUNT_STORAGE_BACKEND=sqlite ALOS_TEST_BACKEND=mongodb .venv-v2/bin/python tools/v2/run_evidence.py --stage 9 mongo-suite .venv-v2/bin/python -m pytest tests/mongodb -q -x
```

Daemon başlangıç çıktısı üç parametrenin kabul edildiğini doğruladı. Veri transaction süresi veya test assertion'ları değiştirilmedi. Yeni `mongo-suite.json` ilgili backend ortam bayrağını da içerir.

## Kullanılabilir yayın hazırlığı — 23 Eylül devamı

Kaynak `cb9c391`: açık operatör hesabı geçişi, bounded eski scrypt doğrulaması, tamamlanmamış aktarımda giriş/readiness engeli, bakım modu ve mevcut Render komutlarıyla V2 başlatma eklendi. Kaynak snapshot/photo checksum, kullanıcı adı çakışması ve kaynak değişmesi durdurma koşulları sentetik olarak doğrulandı. Geçişte eski oturum tokenları kopyalanmaz. Özgün v10 koleksiyonları korunur.

`release-account-gates.json/log`: 65 PASS (hesap/aktarım/bakım dahil seçilmiş regression paketi); `render-entry-smoke.json/log`: 3 PASS (gerçek `start_render.py`, bakımda yazma engeli, V2 paketli frontend, özel yolların 404 olması). `legacy-pdf-compatibility`: 5 unittest, 1 skip; pypdf 6.19.0 yalnız test ortamına eklendi. Şema değişikliği `alos_v2_cutovers` koleksiyonudur; otomatik göç yoktur.

Önceki kaynak `24ca526` GitHub Linux CI run 35891299000: core/container/mongodb SUCCESS. Yeni kaynak için run 35913432104 ayrıca izleniyor; önceki kaynak sonucu yenisinin yerine sayılmaz.

Gerçek kaynak salt okunur ön kontrol: 3 hesap, 3 geçerli checksum'lı snapshot, 0 sunucu fotoğraf kaydı. Git dışında `.cache-v2` altında 0600 özel kurtarma kopyaları alındı. Bu gerçek veri testi değildir; yetkilendirilmiş aktarımın kaynak/yedek hazırlığıdır. Canlıda henüz hesap veya uygulama sürümü değiştirilmedi.

Otomatik inceleme daha sonra localhost önizleme hesabının canlı hesaplarla salt okunur karşılaştırmasını, AGENTS gerçek veri testi yasağı kapsamında reddetti. Kullanıcıya bunun gerçek geçiş olduğunu açıklayan açık onay sorusu gönderildi. Bu işlem farklı yoldan denenmedi; buna bağlı gerçek veri geçişi onay bekler. Render/GitHub hesap giriş ekranına tarayıcı erişimi de geniş hesap kapsamı nedeniyle reddedildi; tarayıcıyla bu sayfaya devam edilmedi. Yayın artık mevcut dar kapsamlı Render bağlantısı ve mevcut başlatma komutlarıyla hazırlanmıştır.
