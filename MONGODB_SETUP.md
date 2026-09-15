# MongoDB hazırlığı

Sunucu artık `STORAGE_BACKEND=sqlite|mongodb` ile veri deposunu seçer.
Varsayılan SQLite'tır; bağlantı bilgisi olmadan uygulama mevcut verileriyle çalışır.
MongoDB seçildiğinde hata durumunda SQLite'a otomatik dönüş yapılmaz.
Tarayıcı `/api/state`, `/api/revisions` ve `/api/restore/<revision>` üzerinden
çalışmaya devam eder. LocalStorage / IndexedDB çevrimdışı kopyalardır.

## Daha sonra bağlantı kurma (macOS / Linux)

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export STORAGE_BACKEND=mongodb
export MONGODB_URI='mongodb://localhost:27017'
export MONGODB_DATABASE=athlete_life
python3 launch.py
```

Atlas için kendi bağlantı URI'nizi sunucu ortamına girin. `.env.example` dosyasını `.env` olarak kopyalayabilirsiniz; başlatıcı `.env` dosyasını otomatik yükler. Ortamda zaten tanımlı değişkenler önceliklidir. Windows PowerShell'de değişkenleri
`$env:STORAGE_BACKEND="mongodb"` biçiminde ayarlayın. URI tarayıcı koduna yazılmaz;
`.env` dosyaları Git'e alınmaz ve HTTP üzerinden sunulmaz.
`GET /api/health` seçili depoyu ve revizyonu döndürür, bağlantı sırrını döndürmez.

## Mevcut verileri aktarma

Önce uygulamadan JSON yedeği alın ve yazma yapan tüm uygulama sunucularını kapatın.
MongoDB ortam değişkenlerini yukarıdaki gibi ayarladıktan sonra, sunucuyu açmadan:

```sh
python3 migrate_to_mongodb.py --sqlite-path "$HOME/.athlete-life-os/athlete-life-os.sqlite3"
```

Araç son doğrulanmış SQLite durumunu **boş** MongoDB hedefine aktarır ve tekrar
okuyarak doğrular. SQLite dosyasını silmez. Eski revizyon geçmişi SQLite'ta kalır;
MongoDB'de aktarım yeni bir revizyon oluşturur. Dolu hedefe aktarım reddedilir.
Aktarım sırasında başka sunucu çalıştırmayın. Tarayıcıdaki daha yeni çevrimdışı
kayıtlar mevcut açılış senkronizasyonuyla ayrıca gönderilebilir.

## Veri modeli ve sınırlar

`state_revisions` koleksiyonu: `_id`, `revision`, `schema_version`, `saved_at`,
`reason`, `checksum`, `weight`, `payload`. `revision` benzersiz indekslidir.
`payload`, mevcut uygulamanın JSON durumudur; antrenman/beslenme kayıtları ayrı
koleksiyonlara bölünmez. Bu sayede mevcut iç içe alanlar ve anahtarlar aynen korunur.
En yeni doğrulanmış kayıt güncel durumdur; her kayıt tek atomik belge eklemesidir.
En fazla 250 revizyon tutulur (temizlik hatasında sonraki kayıt tekrar dener).
Bütün durum tek belgede olduğundan MongoDB'nin 16 MiB belge sınırı geçerlidir;
büyük kayıt reddedilir. Bu aşama tek sporcu uygulaması içindir; çok kullanıcılı
kimlik doğrulama ve eşzamanlı kullanıcı düzenlemelerini birleştirme içermez.

Canlı bağlantı sonrası kayıt/yeniden başlatma/geri yükleme testi yapılmalıdır.
Bağlantı davranışı [resmî PyMongo dokümanına](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/connect/mongoclient/)
uygundur.
