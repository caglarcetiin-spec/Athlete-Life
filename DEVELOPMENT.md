# Yerel geliştirme

Paket; uygulama kaynaklarını, testleri, özel Python ortamını ve Node/Playwright
araçlarını içerir. Python standart kütüphanesi ve MongoDB sürücüsü hazırdır.
Playwright tarayıcı testleri Mac'te kurulu Google Chrome'u kullanır.

```
runtime/python/bin/python3 -B start_local.py
runtime/python/bin/python3 -B accounts.test.py
runtime/python/bin/python3 -B account-extensions.test.py
runtime/python/bin/python3 -B private-delivery.test.py
runtime/node/bin/node sport-science.test.js
runtime/node/bin/node workout-program.test.js
runtime/node/bin/node account-personal-model.test.js
```

Tarayıcı doğrulaması (geçici hesap ve SQLite deposuyla):

```
AL_OS_TEST_PYTHON="$PWD/runtime/python/bin/python3" NODE_PATH="$PWD/runtime/node/node_modules" runtime/node/bin/node account-revision-browser.test.js
```

Hesap, profil ve çalışma alanı senaryoları da aynı komutla
`accounts-browser.test.js`, `sports-profile-browser.test.js` ve
`account-workspace-browser.test.js` üzerinden çalışır. Kişisel yedek denemesi
olan `backup-rehearsal.test.js` dışındaki birim testleri sentetik kayıt kullanır.

Çıkarılmış özel paketin başlatıcısını, ilk hesaba yedek aktarımını, gerçek 3D
modelini ve ikinci hesap ayrımını geçici SQLite deposunda doğrulamak için:

```
NODE_PATH="$PWD/runtime/node/node_modules" runtime/node/bin/node private-package-browser.test.js
```

Bu prova paket yedeğini okur; asıl veri klasörüne veya MongoDB'ye yazmaz.

MongoDB geçiş testi sürücü taklidi kullanır. Canlı aktarım komutu yalnız
`migrate_account_storage.py --apply` ile yazma yapar. Aktarımda hesap kimliği
korunur, mevcut farklı uzak kayıt varsa işlem durur.

Başka bir geliştirme makinesinde Python 3.10+ ve Node 20+ ile
`requirements-dev.txt` ve `playwright` paketini kurarak kaynakları kullanabilirsin.
Paket içindeki derlenmiş çalışma ortamları macOS arm64 içindir.

Özel yedekler, ortam şifreleri ve canlı veritabanları HTTP üzerinden statik
dosya olarak sunulmaz. Bunları herkese açık kaynak deposuna ekleme.
