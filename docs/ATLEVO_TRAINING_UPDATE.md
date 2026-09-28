# Athlete Life renkleri, kas raporu ve dönemli AI taslağı

## Teslim kapsamı

Athlete Life adı korunur. Açık tema #F2F5ED / #FFFFFF / #17251B / #315A16; koyu tema #111713 / #1C261F / #F3F7F1 / #C7F464. Açık temanın çalışma anında katalogdan gelen renkleri de güncellendi. Uyarı/hata semantiği korunur.

Kas raporu varsayılan olarak yüzdeli yük modelini açar. Teknik ağırlıklı-set ayrıntıları kapalı bölümdedir. Şu anki hesap varsayılanı seçili geçmiş tarihten bağımsızdır; son 366 günlük kayıtları sunucunun şimdiki zamanında değerlendirir. Dakikalık yenileme, sekmeye dönüş ve senkronizasyon cursor değişimi yeniden hesaplatır. Kullanıcı geçmiş hesabı ayrıca açabilir. Yeni set eklenmesi yükü artırır; geçen zaman mevcut modeldeki 36 saatlik kuvvet yarılanma varsayımıyla azaltır.

**Bilimsel sınır:** Bu yüzdeler kalibre edilmemiş kayıt modelidir. Doku hasarı, kas büyümesi, biyolojik iyileşme veya kuvvet kapasitesi ölçümü değildir. RIR/RPE eksikliği ve saat belirsizliği yüzde aralığı oluşturur. Eşleşmeyen veya kuvvet dışı kayıtlar bu yüzdeye çevrilmez. Uyku/beslenme/sağlık bağlamı gösterilir, doğrulanmamış iyileşme katsayısı üretilmez. Son 366 günden önceki yük hesabın dışında kalır.

## AI dönemleme sözleşmesi

Form somut hedefi, 4/8/12 haftalık süreyi, dönemleme tercihini ve 2–5 hedef RIR seçimini alır. `progression_mode` ve `target_rir`, mevcut hedef/branş/ekipman alanlarıyla izin listesine eklenmiştir. `ai-planner-10` istemi bu hedefi ve `periodization_policy` nesnesini Evren'e gönderir. Gerçek kişisel kayıtların ek paylaşımı yoktur.

Model geçerli temel haftayı üretir. Sunucu, açıkça belirtilen yerel dönem şablonunu kuvvet çalışma setlerine uygular: 1. hafta hedef RIR +1 (en çok 5), 2–3. haftalar hedef RIR, 4. hafta hedef RIR +1 ve setlerin 0.7 katı (aşağı yuvarlama, en az 1). Sekiz/on iki haftada blok tekrar eder. Bu evrensel optimal reçete iddiası değil, düzenlenebilir planlama varsayımıdır. Teknik, patlayıcı güç, tutuş ve kardiyo aynı dozu korur. Kuvvet seti yoksa uygulama dönemleme sınırlamasını söyler.

İlerleme koşulu: iki karşılaştırılabilir tamamlanmış seansta hedef tekrar ve RIR korunması. Kg otomatik artmaz. Sağlık durumundan sayısal doz kararı çıkarılmaz. Mevcut progression-review politikası korunur; manuel düzenleme ve yeni plan onayı gerekir. Kullanıcı sonraki blokta artırılmış kilogram varmış gibi yanıltılmaz.

Hafta aralıkları `ProgramDay.first_week/last_week` içine yazılır; UI bunları gösterir. Aynı haftada her gün yalnız bir kez kapsanır. Hafif hafta kaydedilip takvimden seansa çevrildiğinde daha az gerçek hedef set oluşturur. Mevcut kabul edilmiş programlar kendiliğinden değiştirilmez.

## Şema ve geri alma

SQL/Mongo koleksiyon migration'ı yok. Yeni alanlar mevcut `Program.decisions.guided_choices` JSON'unda saklanır. Yeni prompt sürümü AIOrigin izin listesine eklenmiştir. Hesap/GLB/sağlık veri taşıması veya silme yapılmadı. Yeni taslakların bu alanlarını okuyamayan eski sunucuya rollback yapmadan önce uyumluluk korunmalı; geçerli hafta aralıkları ve program verileri silinmemeli. Yayın kapsamı yerel önizlemedir; Render'a bu turda dağıtım yapılmadı.

## Kanıt ve sorunlar

`docs/evidence/stage-9/atlevo_*` komut, kaynak özetleri, ortam, stdout/stderr ve exit code içerir. Testler sentetik PostgreSQL, sentetik GLB ve sentetik Evren yanıtı kullanır. Gerçek sağlayıcı çağrısı veya kişisel veriyle test yapılmadı.

İlk tema kontrolünde yeni genel düğme rengi saydam gezinme düğmelerini beyaz yaptı. Genel override kaldırıldı ve aynı kontroller tekrarlandı. Marka kataloğunun açık CSS renklerini ezmesi de düzeltildi. İlk kalıcılık testinde testin `analysis` alanına bakması yanlıştı; mevcut sözleşme `decisions` olduğundan beklenti doğru alanla tekrarlandı. İlk yeni tarayıcı aracında yinelenmiş catch bloğu vardı; araç düzeltilerek tekrar çalıştırıldı. Test eşikleri gevşetilmedi.

## Dayanak

- https://pubmed.ncbi.nlm.nih.gov/19204579/ — ACSM kuvvet ilerleme çerçevesi. Buradaki 4 haftalık yazılım şablonunun klinik doğrulaması değildir.
- https://pubmed.ncbi.nlm.nih.gov/35247203/ — RIR ve tükenişe yakınlık raporlamasının sınırları.
- https://www.w3.org/TR/WCAG22/ — tema kontrastı ve erişilebilirlik kontrolleri.

Son doğrulama: 50 AI/rapor/plan API testi, 12 seans/hafta testi, 39 web testi geçti. Ek 5 dönem testi (ilk 4 test önceki 50 içinde) kalıcılık dahil geçti. Sentetik 3B tarayıcı testi, 20 açık/koyu-mobil/masaüstü rota kontrolü ve hedef/RIR–AI taslağı–düzenleyici akışı geçti. Yeni select alanlarında birleşik etiket sorunu ürüne aria-label eklenerek düzeltildi. Aynı ilerleme metni genel gerekçede de bulunduğundan tarayıcı beklentisi açılan dönem paneline kapsamlandı. Lint ilk kez yanlış çalışma dizininde başlatıldı; apps/web altında tekrar başarıyla çalıştırıldı. Yerel readiness ve paket eşleşmesi doğrulandı.
