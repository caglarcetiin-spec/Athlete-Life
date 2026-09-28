# Ayrı yönetici arayüzü

2026-09-28. Yönetici rolü normal kayıt veya profil formundan atanamaz. `Administrator` kaydı yalnız yetkili sunucu operatörünün provisioning aracıyla oluşturulur. Giriş sonrası `auth/me.is_admin` arayüzü seçer; güvenlik istemci alanına dayanmaz, her yönetici API'si oturumu ve sunucudaki rolü yeniden kontrol eder.

## İşlevler ve sınırlar

- 50 hesaplık sayfalı kullanıcı listesi: kullanıcı adı, görünen ad, e-posta, kayıt tarihi, yönetici rolü.
- Seçili kullanıcının mevcut domain bootstrap kayıtları: profil, planlar, gerçekleşen set/seans, beslenme, sağlık/ölçüm/kan değerleri ve medya metadata. Boş gruplar gizlidir. Fotoğraf ve model erişimi hedef hesabın sahipliğiyle ayrıca doğrulanır.
- **Parola, parola özeti, oturum anahtarı ve kurtarma kodları hiçbir yönetici yanıtında yoktur.** Parolalar tek yönlü doğrulama özetiyle saklanır; mevcut parolayı gösterme özelliği eklenmedi.
- Kullanıcının tüm oturumlarını kapatma ve hesabını kalıcı silme: yönetici kendi parolasını tekrar girer, hedef kullanıcı adını aynen yazar ve UI onay kutusunu işaretler. Origin/CSRF, reauth limiti, sunucu rolü ve kullanıcı adı doğrulaması uygulanır. Silme ortak account.erase_records hattını kullanır.
- Yönetici hesaplarının silinmesi/oturum kapatılması bu panelden engellenir; normal self-delete API'si de yönetici hesabını korur.
- Veri görüntüleme, medya erişimi, silme ve oturum kapatma SecurityAudit içinde işlem türü + hedef kimliğiyle kaydedilir. Panel son 100 kendi yönetici işlemini gösterir. Hedef hesap silinince yöneticinin denetim izi silinmez.
- Bu sürümde admin şifre sıfırlama, rol verme/kaldırma, MFA ve dışa kullanıcı raporu indirme yoktur. Bunlar sonraki ayrı özelliklerdir. Kullanıcı bilgileri ayrıntılı teknik kayıt görünümüyle okunur; parola veya üçüncü taraf sırları içermez.

## Provisioning

`tools/v2/create_admin.py --username <ad> --name <görünen-ad>`; uygulamanın mevcut güvenli ortam yapılandırması ile çalıştırılır. Şifre getpass üzerinden gizli terminal girişinden alınır; argv/env veya kaynak dosyaya yazılmaz. Aynı kullanıcı adı varsa şifre üzerine yazılmaz ve rol sessizce yükseltilmez. Yeni User/Athlete/Administrator ve admin_provisioned audit tek transaction içinde oluşturulur. Kayıt e-posta doğrulaması herkese açık signup için zorunlu kalır; bu araç yalnız sunucu operatörünün açık provisioning işlemidir.

İstenen yönetici hesabı **yerel 10005 önizlemesinin mevcut MongoDB'sinde** oluşturuldu. Gerçek hesapla test yapılmadı ve mevcut kullanıcıların kişisel kayıtları incelenmedi. Parola test/kanıt dosyalarına konmadı.

## Şema, yayın ve geri alma

PostgreSQL revision b829admin001, parent a829email001: administrators(user_id FK/PK, created_at). Mongo'da alos_v2_administrators koleksiyonu; kullanıcı/sağlık/medya göçü yok. Yerelde eklemeli koleksiyon oluşturuldu. Render'a veya GitHub'a yayın yapılmadı; yerel hesabın canlı sistemde de mevcut olduğu iddia edilmez.

Mevcut hesap silme ortak helper'a taşındı; admin grant varsa self-delete engeli eklendi. Geri almada admin hesabını normal sürümde bırakarak self-delete korumasını kaybetmemek gerekir. Önce yeni yönetici girişlerini kapatıp ilgili oturumları iptal et; rol koleksiyonunu ve audit'i sakla. Migration downgrade yalnız grant tablosunu kaldırır, hesap verisini geri getirmez. Bu teslimde yalnız sentetik hedef hesaplar silindi.

## Testler

Sentetik PostgreSQL ve MongoDB: normal kullanıcı erişim reddi, rol yükseltme reddi, parolasız/yanlış parola/yanlış hedef adı/CSRF reddi, silme sonrası oturum iptali, başka hesapların korunması, rol iptalinde anlık erişim reddi, medya hedef eşleşmesi ve denetim izi.

Tarayıcı: ayrı yönetici ekranı, kullanıcı detayı, yanlış parola reddi, onaylı silme, audit ve yönetici self-delete koruması; mobil/masaüstü Axe ve taşma kontrolü. Kanıtlar `docs/evidence/stage-9/admin_*`.

İlk derleme eski sentetik Me nesnesinde yeni is_admin alanının eksikliğini buldu; fixture'a false eklendi, yetki beklentileri değiştirilmedi. İlk tarayıcı testinde seçenek metinleriyle birleşen select etiketi exact eşleşmedi; ürüne açık aria-label eklendi. İncelemede boş gruplar gizlendi ve genel sticky header stili yönetim başlığından ayrıldı.

Sonuç: 24 API regresyon testi ve 39 web testi geçti. Son kaynak üzerinde 8 yönetici API testi yeniden geçti; mobil/masaüstü tarayıcı senaryosu ve üretim derlemesi başarılı. Yerel önizleme readiness yanıtı ve sunulan JS dosyasının paketle eşleşmesi doğrulandı. Gerçek hesapla giriş testi yapılmadı.

## Sonraki öneriler

1. Yönetici için iki aşamalı doğrulama (MFA).
2. Yetkileri ayırma: destek görevlisi yalnız hesap bilgisi; sağlık verisine ayrı izin.
3. Şifreyi göstermeden, tek kullanımlık ve süreli sıfırlama bağlantısı.
4. Büyük kullanıcı kitlesinde arama/filtre ve toplam kayıt/aktif kullanım istatistikleri.
