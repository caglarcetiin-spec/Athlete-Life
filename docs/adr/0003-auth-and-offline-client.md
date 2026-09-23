# ADR-0003 — Kimlik, kullanıcıya ait cache ve çevrimdışı kayıt

Durum: hedef karar; current account edition'ın mevcut scrypt/CSRF korumaları korunacak davranış envanteridir, kod kopyalama zorunluluğu değil.

## Identity

Same-origin HttpOnly/Secure/SameSite session cookie; CSRF token + Origin doğrulaması. Public registration varsayılan kapalı, ilk sentetik kullanıcı CLI fixture ile; gerçek kullanıcılara davet/admin akışı. Bakımlı framework/güvenlik kütüphaneleri, kendimize ait hash algoritması yok. Backend kullanıcı/athlete membership'ini doğrular; tüm resource queries owner-scoped; profile update version kontrollü. Login/session rotation, logout/revocation, throttling, timeout, parola değişikliği test edilir. Identity store tek PostgreSQL otoritesi; plaintext parola ve session token migration artefact'ına girmez.

Eski scrypt hesaplar gerçek migration seçilirse desteklenen algoritma adaptörüyle kontrol edilir; reset yerine login sırasında güvenli rehash politikası ayrı testle. Bu aşamada herhangi bir kullanıcının hash'i alınmadı. Yeni canlı hesap veya external identity provider kurulmadı.

## Offline state machine

IndexedDB veritabanı adı API environment + authenticated user/athlete kapsamlı. Tek readwrite transaction içinde local entity overlay + komut journal. State `queued → in_flight → acknowledged | conflict | failed`. in_flight lease restart'ta queued'a döner, op ID aynı kalır; ACK gelmeden kayıt silinmez. Query cache server state, overlay pending state; UI ve domain hesap birbirine karışmaz.

UI: “Bu cihazda kaydedildi — eşitleme bekliyor”, “Sunucuya kaydedildi”, “Çatışma çözülmeli”, “Kayıt başarısız”. Sayı ve lastACK erişilebilir. Quota transaction başarısızsa form korunur ve success yok. `navigator.storage.persist()` destekleniyorsa talep edilir; garanti diye sunulmaz.

Birden fazla sekme için IDB lease + BroadcastChannel haberi; channel sahiplik veya veri doğruluğu kaynağı değildir. Reconnect/pageshow/visibility/manual retry; exponential backoff+jitter. Background Sync opsiyonel; iPhone background JavaScript'e güvenilmez. 401'de kuyruk aynı kullanıcıya ait kilitli kalır; tekrar login sonrası retry. Kullanıcı değiştirmeden önce pending export/kal/çık seçenekleri; başka hesaba ait cache açılmaz. Eski hesabın cache silinmesi yalnız açık kullanıcı seçimi/retention ile.

PWA başlangıçta yalnız public/versioned shell; private API cache yok. Offline yeni login desteklenmez. Önceden yetkili local veriye erişim süresi/cihaz erişimi politikası Aşama 6 güvenlik incelemesinde kesinleştirilir; henüz offline güvenli re-open iddiası yok. Logout + pending + SW update ortak test kapısı.

Resmi teknik referans: [IndexedDB kullanımı](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB), erişim 16 Eylül 2026. Transaction complete/abort sınırları client protokolünün temelidir. Yerel transaction sunucu ACK'i veya fiziksel cihaz kaybına karşı yedek değildir.
