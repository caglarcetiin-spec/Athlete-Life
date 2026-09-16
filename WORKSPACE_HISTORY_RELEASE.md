# Toparlanma, geçmiş ve hesap deneyimi

## Kullanıcı akışları

- Seanslarım / Spor profilim: branş kaydını kaldırma; Ayarlar'da geri alma. Yalnız o seansın ürettiği hareket projeksiyonları çıkarılır. Bağımsız bağlı hareketler korunur.
- Tercihler ve veriler: kapsamı inceleyip `YENİ BAŞLANGIÇ` yazarak antrenman veya tüm günlük kayıtları sıfırlama. Arşivleme varsayılan açık. Hesap, spor/sağlık profili, fotoğraflar ve tercihler korunur. Önce açık antrenman bitirilmelidir.
- Arşivler aktif analizlere girmez. Geçmiş plan inceleme, ham JSON ve tarih aralıklı genel PDF (7/10/28 gün, 12 hafta, kayıtlı dönem veya özel aralık) aynı hesap verisini kullanır.
- PDF: dönemler, gerçekleşen seans/setler, bağımsız hareketler, hedefler, uyku, beslenme, su, ağrı/döngü, vücut ölçümleri, sağlık olayları ve tahliller. Hesap/CSRF/sürüm kontrolü; başka hesabın arşivi okunamaz. En fazla 2000 satır, 5 yıl; uzun notlar 500 karaktere özetlenir. Tam veri JSON'da korunur.
- Şifre sınırı kayıt/değiştirme/kurtarmada 8–128 karakter; scrypt, oturum iptali ve hız sınırı korunur.
- Profil fotoğrafı isteğe bağlı, cihazda 256 × 256 JPEG'e küçültülür; maksimum kalıcı veri URI'si 125 KB. Orijinal dosya sunucuya gönderilmez.
- Aktif tema adı, Durumum simgesi, kompakt gezinme, azaltılmış hareket tercihine uyan geçişler.

## Toparlanma modeli

Kalan yükün saatlik üstel azalması korunur. Tarihi belli, saati bilinmeyen kayıtlar gün başlangıcından yaklaşık hesaplanır; bu belirsizlik detayda gösterilir. Canlı oturumun bilinen bitişi varsa kullanılır. Gelecekteki açık saat damgası etkisiz kalır. Eksik RIR, sıfır RIR sayılmaz. Başlangıç planı hareket adları kas bölgeleriyle eşleşir.

Görsel puan `100 / (1 + 0.075 × kalan yük)` olarak doyuma girmeyen sürekli ölçeğe alınmıştır; renkler ve ondalık puan zamanla değişir. Kalan yük, başlangıç yükündeki model azalması ve geçen saat birlikte gösterilir. Dakikalık ekran yenilemesi ve sekmeye dönüş hesabı devam eder. Bu puan biyolojik iyileşme, hasar yüzdesi veya antrenmana tıbbi uygunluk ölçümü değildir. Ağrı girdileri zaman geçti diye silinmez. Bu matematik mühendislik tahminidir; klinik olarak doğrulanmış bir model değildir.

Genel toparlanma bağlamı: [ACSM - A Road Map to Effective Muscle Recovery](https://www.acsm.org/docs/default-source/files-for-resource-library/a-road-map-to-effective-muscle-recovery.pdf). Kaynak, uygulamanın sayısal katsayılarını doğrulamaz.

## Doğrulama

- Gerçek motor entegrasyonu: sıfırlama sonrası eski örnek plan/olay projeksiyonu geri gelmiyor; koordinatör hatasız; arşiv korunuyor.
- Kaldırma/geri alma, bağımsız hareket koruma, eski form/sürüm çakışması, iki sıfırlama kapsamı.
- Zamanla yük azalması, yüksek hacimde puanın donmaması, hareket eşleşmeleri, saat belirsizliği, gelecekteki kayıt dışlama.
- SQLite ve Mongo mock: 7 karakter reddi, 8 karakter kayıt/değiştirme/kurtarma kabulü; mevcut hesap/HTTP güvenlik testleri.
- PDF hesap izolasyonu, CSRF ve sürüm kontrolleri; Türkçe karakterler, uzun notlar, çok sayfa görsel kontrolü.
- Yerel sentetik hesap: seans kaldırma/geri alma, arşivle başlangıç ve yeniden açılış, PDF indirme, büyük görselin 256 px / yaklaşık 3 KB fotoğrafa dönüşmesi ve hesabına kaydı.

Canlı kullanıcı kayıtlarına sıfırlama uygulanmadı.
