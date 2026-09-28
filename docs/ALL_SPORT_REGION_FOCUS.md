# Tüm branşlarda bölge önceliği

2026-09-28. Bölge paneli artık bütün branşlarda açık ve görünür. Mevcut sekiz anatomik seçenek ve beş puan bütçesi korunur: kullanıcı beş farklı bölgeye birer puan veya bazı bölgelere birden fazla puan verebilir. Performans hedefleri aynı ekranda ayrı kalır. Bu, beş yeni makro bölgeye veri dönüşümü değildir.

Koşu/yüzme yöntem veya branş değişikliğinde ve AI/standart taslak gönderiminde focus temizleyen dört nokta kaldırıldı. Ekipman listelerini yöneten yöntem koşulu değiştirilmedi. Mevcut focus JSON alanı program.guided_choices ve kayıt sırasında program.decisions.guided_choices üzerinden korunur.

AI bağlamında mevcut focus yanında aynı tercihin açıklaması olan body_region_priorities (region, priority_points, muscle_ids) gönderilir. Sistem talimatı bunun bütün branşlara uygulanacak kullanıcı tercihi olduğunu, seçilmeyen yöntem eklemeye veya bilinmeyen kas kapsamı uydurmaya izin vermediğini açıklar. Bilinmeyen branş-kas eşleşmeleri hâlâ UNKNOWN; sağlayıcı kalite/performans garantisi verilmez. Mevcut review.missing_focus karşılanamayan öncelikleri gösterir.

## Doğrulama

199 branşın her biri sentetik bağlam → doğrulanmış AI planı → guided_choices hattında aynı beş bölgeyi korur. Koşu, yüzme ve karma kuvvet için EVREN HTTP gövdesi sahte taşıma ile yakalanır; gerçek endpoint adresi, sistem talimatı ve user JSON içinde bölge/puan/kas eşleşmesi doğrulanır. Gerçek sağlayıcıya veri gönderilmez.

İlk API koşusunda 224 test geçti; yüzme sentetik profili hiçbir yüzme yetkinliği içermediği için aday bulamadı. Teste serbest yüzme yetkinliği eklendi; aktarım beklentileri ve üretim güvenlik kapıları değiştirilmedi. Komut, kaynak hashleri, çıktı ve exit kodları docs/evidence/stage-9/all_sport_focus_* içindedir.

## Yayın, veri ve geri alma

Yerel önizleme güncellenir; Render yayını/GitHub push yapılmaz. Veritabanı şeması, hesap ve medya taşıması yok. Yeni kalıcı veri alanı yok; body_region_priorities sadece mevcut focus ve sabit katalogdan üretilen sağlayıcı bağlamıdır. Eski kayıtlar yeniden yazılmaz. Kod geri alınabilir, fakat önceki frontend koşu/yüzme taslaklarında focus alanını yeniden boşaltır; geri almada bu koruma tutulmalıdır. Kişisel kayıtlar test edilmedi.

Sonuç: 225 API testi, üretim derlemesi ve sentetik tarayıcı planlama → yenileme → düzenleme → kayıt akışı geçti. Tarayıcıda beş puandan sonra artırma engeli, koşu seçiliyken bölge paneli ve program.decisions.guided_choices.focus saklama doğrulandı.
