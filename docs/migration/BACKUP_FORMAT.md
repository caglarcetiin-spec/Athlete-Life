# V2 yedek ve taşıma sözleşmesi

## Ayrı garantiler

- `/api/v2/backups/export`: aynı PostgreSQL REPEATABLE READ snapshot'ından yalnız oturum sahibinin kayıtları, audit/işlem geçmişi, özel medya, sürümler, sayılar ve SHA-256 manifest. Kimlik doğrulama hash/token'ları kişisel export'a dahil değildir.
- Arayüz indirimi `alos-v2-transfer` kabıdır: `canonical` imzalı sunucu paketi + `pending_journal` bu cihazda ACK almamış işlemler. Bekleyen işlem yapılmış kayıt diye restore edilmez; kaynak pakette korunur.
- Sunucuya erişilemiyorsa `alos-local-journal` adıyla cihaz kopyası indirilir. Bu dosya tam sunucu yedeği değildir.
- Kişisel restore yeni/boş profile uygulanır. Eski owner ID'leri yeni oturum sahibine bağlanır; varlık UUID'leri deterministic yeniden eşlenir. Kaynak paket/audit orijinal biçimde arşivde kalır. Transport cursor/idempotency geçmişi yeni hesap için tekrar oynatılmaz.
- Tam PostgreSQL felaket kurtarması kişisel export'tan farklıdır; Aşama 8 runbook'u ayrıca transport geçmişini ve hesapları kapsar.

## Güvenlik ve sınırlar

16 MB JSON; 40 derinlik; 100.000 düğüm. Duplicate JSON anahtarı, non-finite sayı, geçersiz Unicode, bilinmeyen schema, bozuk checksum ve gzip/ZIP reddedilir. ZIP açılmadığından zip-bomb/path traversal girdisi dosya sistemine ulaşmaz. Medya owner-scoped DB alanında; public static dizinine konmaz. Fotoğraflar JPEG önizlemeye dönüştürülür, EXIF taşınmaz; legacy orijinal yedek byte içeriği raw arşivde korunur.

## Legacy

Portable schema 1/2 SHA-256: eski `stableStringify` ile aynı ECMAScript sayı/sıralama için [RFC 8785 uygulaması](https://github.com/trailofbits/rfc8785.py) kullanılır. Wrapper/raw/localStorage JSON biçimleri algılanır. Bütün top-level/nested alanlar immutable kaynak paketinde ve JSON-pointer arşivinde korunur. Bilinmeyen alanlar raporlanır. Aynı adlı/tarihli iki kayıt birleştirilmez; hafta index'i bugünkü tarihe çevrilmez. Domain adapter'ları daha sonra ayrı, sürümlü ve incelenebilir biçimde canonical tabloya aktarır.

SQLite çıkarımı:

```sh
.venv-v2/bin/python tools/v2/extract_legacy_sqlite.py SOURCE.sqlite NEW_EXPORT.json
# Hesaplı veritabanında ayrıca --account-id SOURCE_USER_ID
```

Kaynak `mode=ro` ve `query_only=ON`, transaction snapshot; çıktı var olan dosyanın üstüne yazmaz. Auth/session tablolarına erişmez.

## Origin/cutover

Eski sitede "Tüm Verileri Yedekle" ile export → yeni sitede Yedekler → dosya seç → sayı/belirsizlik önizlemesi → açık "Aktarımı onayla". Yeni origin eski localStorage/IndexedDB'yi okuyamaz. Testler sentetiktir; gerçek kullanıcı migration tamamlandı anlamına gelmez. Geçiş öncesi eski writer durdurulur ve bekleyen işlemler çözülür; iki bağımsız writer arasında kör senkronizasyon yapılmaz.
