# Yüklenen v10 kaynak paketi — Sınırlı mühendislik incelemesi

İnceleme tarihi: 16 Eylül 2026.
Kaynak: `Athlete-Life-OS-v10.0.0-Dynamic-SQLite.zip`.
ZIP SHA-256: `63ad83c0ccefe5a518fcfceb9aa9426f42cb8643b33b79fa7b4d30e4115cc334`.
İnceleme canlı Render servisini, kullanıcının gerçek SQLite dosyasını veya gerçek cihaz tarayıcı geçmişini kapsamaz. Kaynak metinler ve bir yalıtılmış sentetik deney incelendi; bütün regresyon paketi bu görevde çalıştırılmadı.

## 1. Yeniden üretilmiş risk: eski tam durum, yeni kaydı düşürebiliyor

Kaynak konumları: `launch.py` içindeki `commit_state` (yaklaşık 118–148. satırlar); `server-sync.js` içindeki `bootstrap`, `push`, `flush` (25–52. satırlar). Kesin satırlar yeni depoda değişebilir; fonksiyon adını esas al.

Sunucu kayıt modeli tek `app_state` satırı, `payload` JSON'u ve `state_revisions` geçmişinden oluşuyor. Client revizyonu güncel sunucu revizyonunun altında olsa bile `next_rev = max(current_rev, client_rev) + 1` hesabıyla yeni snapshot kabul ediliyor. Snapshot'ın daha yeni kayıtlardan hangilerini eksilttiği karşılaştırılmıyor. Revision artması verinin semantik olarak yeni veya doğru olduğunu kanıtlamıyor.

Geçici SQLite üzerinde sentetik senaryo: Revision 1'de set-a; revision 2'de set-a + set-b. Sonra revision 1'i temel alan eski istemci bir vardiya ekliyor ve yalnız set-a içeren tam snapshot gönderiyor. Sunucu bunu revision 3 olarak kabul ediyor. Son canlı state'te set-b bulunmuyor.

```json
{
  "test": "synthetic stale client update in isolated temporary SQLite database",
  "original_revision": 1,
  "newer_revision": 2,
  "stale_request_old_revision": 1,
  "stale_request_accepted_as_revision": 3,
  "ids_after_stale_write": [
    "set-a"
  ],
  "newer_set_missing_in_current_state": true,
  "notes": "Historical revision remains; no real user data was touched. Does not establish cause of every reported problem."
}
```

Önemli sınır: set-b önceki revision geçmişinde hâlâ bulunabilir. Deney kalıcı olarak tüm kurtarma kopyalarının yok olduğunu değil, güncel state'in eski veriyle gerileyebildiğini gösteriyor. Kullanıcının bildirdiği bütün kaybolma olaylarının aynı nedenle olduğu kanıtlanmadı.

2.0 karşılığı: entity/command tabanlı mutations, server-authoritative version, optimistic concurrency ve idempotency. PostgreSQL'e aynı JSON overwrite modelini aynen taşımak bu hatayı çözmez.

## 2. Kaydedildi etiketi sunucu commit'ini beklemiyor

`app.js`, `persistWeeklyScheduleFromUI` yaklaşık 277–293. satırlarda snapshot persistence çağrısından sonra “Vardiya planı kaydedildi” etiketi koyuyor. `durable-persistence.js` içindeki save, tarayıcıya yazıp `ALOSServerSync.push` çağrısını başlatıyor. `server-sync.js` push yalnız pending state ayarlayıp gecikmeli flush planlıyor; server acknowledgement'ı bu UI zincirinde beklenmiyor.

Bu kaynak incelemesi UI başarısının tarayıcı ve sunucu başarısını ayırmadığını gösteriyor. Gerçek ağ/cihaz üzerinde kullanıcıya görünen kayıp süresi bu görevde ölçülmedi. Yeni kabul şartı local-only ve server-saved durumlarını ayırıyor.

## 3. Pending gönderim yarışları

`server-sync.js` flush, fetch başlamadan pending'i null yapıyor; hata halinde eski payload'ı tekrar pending'e atıyor. Uçuşta olan veri ile daha sonra oluşturulan veri ayrı kalıcı operasyon kuyruğunda tutulmuyor. Kaynak yapısı eski başarısız isteğin yeni bekleyen snapshot'ı ezebilmesi gibi yarışlara açık. Bu spesifik yarış bu incelemede ayrı dinamik testle yeniden üretilmedi; doğrulanması gereken risk olarak sınıflı.

2.0 karşılığı: ayrı operation kimlikleri, IndexedDB transaction, ACK sonrasında temizlenen outbox ve in-flight lease.

## 4. İnternete açılan API için kimlik/sahiplik katmanı görünmüyor

İncelenen `launch.py` GET/POST/restore handler'larında kullanıcı login'i veya kayıt sahipliği kontrolü bulunmuyor; bütün state tek id=1 satırında. Varsayılan bind 127.0.0.1 olduğundan paket yerel kullanıma göre başlatılıyor. Bunun doğrudan internete açılması authentication/authorization eklenmeden yapılmamalı. Canlı Render ortamının güvenlik yapılandırması incelenmedi; orada kesin açık bulunduğu iddia edilmiyor.

2.0 karşılığı: güvenli oturum, athlete-scoped kayıtlar, her kaynakta authorization ve iki hesap izolasyon testi.

## 5. Service worker özel API cevaplarını da genel GET cache yoluna sokuyor

`service-worker.js` aynı origin GET cevapları için genel network-first/cache fallback davranışı uyguluyor. `/api/` için ayrı private-data/sahiplik politikasına rastlanmadı. Bu, API cache tutarlılığı ve ileride multi-user gizliliği için ayrıca test edilmesi gereken bir tasarım riskidir; bu inceleme bir kullanıcılar-arası sızıntıyı yeniden üretmedi.

2.0 karşılığı: app-shell ile private data cache ayrımı; owner/ortam namespace; eski client ve pending kuyruk için güvenli update protokolü.

## 6. Korunacak mevcut işlevler var

`app.js` içinde `persistWeeklyScheduleFromUI`, `optimizeWeek`, `renderSavedWeekOptimization` ve `AthleteProgramEngine` export'u mevcut. `canonical-session-engine.js` içinde prescription snapshot, execution lock ve guided/manual kayıt ilişkisi için kod bulunuyor. Bunlar mevcut iş mantığını anlamadan kaldırılmamalı. “Sıfırdan rewrite” yerine feature parity ve veri mapping bu yüzden zorunlu tutuldu.

## 7. İnceleme sonucu ve yetki sınırı

Yeni prompt paketi üretildi; mevcut uygulama dosyaları veya gerçek DB değiştirilmedi. Sentetik deney yalnız geçici klasörde çalıştı, HTTP sunucusu başlatmadı. 2.0'ın testleri henüz yok/çalıştırılmadı; kabul matrisindeki sonuçlar başlangıçta NOT RUN'dır. Canlı yayın, gerçek kullanıcı verisi migration'ı ve spor bilimi model doğrulaması ayrıca yapılacaktır.
