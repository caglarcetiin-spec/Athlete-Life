# Athlete Life OS v7.18 — Water Ledger

Kök neden: su kayıtları `db.water[date] = toplam ml` olarak tek sayı tutuluyordu. Bu nedenle
+250/+500 ml eklenebiliyor ama her eklemenin ayrı kimliği olmadığı için tek tek silinemiyordu.

v7.18 ile her su eklemesi `waterLogs` içinde ayrı ID'li satırdır. Beslenme ekranında her su
satırının yanında **Sil** bulunur. 250 ml + 500 ml varsa 250 ml'yi silmek yalnız onu kaldırır
ve toplam 500 ml olur.

Eski `db.water[date]` toplamı uyumluluk için yeni ledger ile senkron tutulur; Hydration,
Nutrition Impact ve raporlar çalışmaya devam eder. Eski 1500 ml gibi scalar kayıtlar da
`1500 ml · eski toplam` olarak migrate edilip silinebilir.

Data Vault artık `waterLogs` alanını da merge/normalize eder.

Regression testleri: su ekleme, tek kayıt silme, kalan kaydı koruma, legacy migration,
legacy silme ve Nutrition UI wiring — PASS.
