# Birleşik V2 — karar kaydı

Kaynak görev: `prompts/REVISION_V2.md`. Üretim yayını bu revizyondan ayrı bir karardır.

| Problem / kanıt | Seçim ve gerekçe | Yapılmayan alternatif | Kabul |
|---|---|---|---|
| F01/F02: katalogdan analize kopuk kimlik | Kanonik ID ve sürüm, kontrollü Türkçe alias; Squat tek başına kararsız. Kullanıcı seçimi kimliği taşır. | Benzer adları bulanık eşleyip anatomik sonuç uydurmak | AT02–05,31 |
| Eski setin türü bilinmiyor | Eklemeli nullable alanlar; set_kind=unknown. Isınma, çalışma ve toplam ayrı. | Geçmişin tamamını çalışma saymak | AT37–38 |
| F03: ölçüm değişince kg kaldı | Birim türe bağlı; önceki sayı temizlenir ve açıklanır. Reddedilmiş taslak aynı yerde düzenlenir. | Otomatik ve belirsiz dönüşüm | AT08–10 |
| Ağ/çatışma veri kaybı riski | Aynı mantıksal işte aynı operation_id; kalıcı ret bağımsız işleri durdurmaz; çatışmada açık sürüm seçimi | Sessiz son-yazan-kazanır | AT10–12 |
| F04 profil aktarımı / içerik açığı | Kayıtlı deneyim ve sürümlü ekipman anlık görüntüsü; uygunluk filtresi, örüntü envanteri, süre önizlemesi; mevcut genel şablonun kişiselleştirme sınırı açık | Yeni barbell reçetesini uzman onaylı diye üretmek | AT13,40–44 |
| F05 onaysız sağlık doz değişikliği | Sayısal sağlık ve artış politikaları kapalı; açıklama ve manuel yeni sürüm açık | Ağrıdan −1 set/−%10 kg, iki seanstan +%2,5 kg | AT14–17 |
| Anatomik çıktı ölçüm gibi anlaşılabilir | Varsayılan gerçek dağılım ve kapsam; zaman endeksi açık mühendislik varsayımı. Aynı grup yüzeyleri aynı indeks kullanır | Hasar/iyileşme/kapasite yüzdesi iddiası | AT02–05,33,45 |
| F06 bilinen protein kayboldu | Her besin alanının bilinen toplamı ve eksik sayısı; kayıt anındaki porsiyon/kaynak korunur | Tek eksikle tüm makroları gizlemek veya sıfır saymak | AT18–20,47–48 |
| Vardiya saati uyku olmadan uyduruluyor | Kullanıcı uygunluk+uyku+süre pencereleri; komşu vardiyalar, ulaşım/hazırlık ve yerel saat; yer yoksa açık sonuç | Sabit 11:00 veya otomatik 45 dakika | AT22–23,44 |
| Rapor hassasiyet ve sürüm farkı | Aynı sunucu bölüm üreticisi önizleme/PDF; sağlık opt-in; digest değişince 409 | Önizleme sonrası farklı veriyi sessiz indirmek | AT28–29,52 |
| Taşınabilirlik | Belgeli genel CSV; kaynak hash, satır hatası, atomic import, tekrar dedup; formül kaçışı | Fixture olmadan Strong/Hevy bağlayıcısı ilanı | AT49–51 |
| İsteğe bağlı modüller | Profil tercihi analiz eksiklerini ve kayıt kartı önceliğini değiştirir; eski kayıtlar açılabilir | Veriyi silmek veya sağlık onayı üretmek | AT53 |
| Ana gezinti | Mevcut beş odak Bugün/Antrenman/Sağlık/Gelişim/Araçlar korundu; Plan Antrenman altında, Profil sürekli sağ üstte. Önceki kullanıcının beğendiği Araçlar merkezi ve eski adresler korunur. | Aynı işlevi yeni beş başlıkta tekrar çoğaltmak | AT32–35,54 |
| Marka | API ve web aynı brand.json; logo seçimi, açık tema, başlık, giriş, PDF aynı kaynaktan | Veri/oturum/paket kimliğini yeniden adlandırmak | AT55 |

Tasarım tercihleri kullanılabilirlik hipotezidir; gerçek pilot sonucu değildir. Rakip ürünlerin ekranı, resmi veya gizli algoritması kopyalanmadı. Bilimsel model testi ürün aritmetiğini sınar; biyolojik etkinlik kanıtı değildir.
