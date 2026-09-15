# Athlete Life OS v8.2 — Guided Sync & Timer Fix

## Düzeltilen kök nedenler

1. v8.1, yalnızca Runner kartı açılmış olsa bile Guided snapshot'ını canonical plan olarak kilitliyordu.
2. Eski Guided oturumlarının hareket listesi, gerçek set kaydı bulunmadan güncel günlük planın önüne geçebiliyordu.
3. Seans süresi Runner oluşturulduğu anda başlıyor ve sayfa kapalıyken de büyüyordu.
4. Tamamlanan seanslarda sayaç `completedAt` yerine güncel zamanı kullanmaya devam edebiliyordu.

## v8.2 davranışı

- Günlük plan, haftalık görünüm ve Runner tek canonical reçeteyi okur.
- Canonical kilit ilk Guided set başladığında veya ölçülmüş kayıt oluştuğunda devreye girer.
- Uygulanmamış eski Runner otomatik olarak güncel canonical harekete eşitlenir.
- Eski Runner ancak gerçekten kaydedilmiş Guided setleri varsa veri bütünlüğü için korunur.
- Seans sayacı ilk set ile başlar, duraklamaları çıkarır ve tamamlanma zamanında donar.
- Manuel `Planı Eşitle`, `Süreyi Sıfırla` ve onaylı `Antrenmanı Baştan Başlat` kontrolleri mevcuttur.

## Veri koruması

`Antrenmanı Baştan Başlat`, yalnızca aktif `guidedSessionId` ile yazılmış satırları kaldırır. Manuel kayıtlar, başka Guided oturumları ve diğer tarihler korunur.

## Doğrulama

- Tüm JavaScript dosyaları syntax kontrolünden geçti.
- Canonical session, Guided wiring ve sayaç regresyon testleri geçti.
- Mevcut 21 test dosyasının tamamı başarıyla çalıştı.
