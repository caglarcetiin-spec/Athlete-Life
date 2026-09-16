/* Curated educational summaries. No universal reference intervals or diagnostic thresholds. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HealthLabLibrary=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const base='https://medlineplus.gov/lab-tests/';
const item=(id,name,group,units,about,context,source)=>({id,name,group,units,about,context,source:base+source+'/',reviewed:'2026-09-16'});
return Object.freeze([
 item('hgb','Hemoglobin (HGB)','Kan sayımı',['g/dL','g/L'],'Kırmızı kan hücrelerinin oksijen taşıyan proteinini ölçer.','Kan sayımının diğer bileşenleri, belirtiler ve sıvı durumu birlikte değerlendirilir.','complete-blood-count-cbc'),
 item('wbc','Lökosit (WBC)','Kan sayımı',['10^9/L','10^3/µL'],'Bağışıklık sisteminde görev alan beyaz kan hücrelerini sayar.','Tek başına enfeksiyonun nedenini veya türünü göstermez; hücre alt grupları da önemlidir.','complete-blood-count-cbc'),
 item('plt','Trombosit (PLT)','Kan sayımı',['10^9/L','10^3/µL'],'Pıhtılaşmada görev alan trombositlerin sayısını ölçer.','Diğer kan sayımı sonuçları, ilaçlar ve klinik öyküyle değerlendirilir.','complete-blood-count-cbc'),
 item('ferritin','Ferritin','Vitamin ve demir',['ng/mL','µg/L'],'Vücudun demir depolarının değerlendirilmesinde kullanılır.','İnflamasyon ferritini yükseltebilir. Ferritin tek başına demir tedavisi kararı için yeterli değildir.','ferritin-blood-test'),
 item('vitd','25-OH D vitamini','Vitamin ve demir',['ng/mL','nmol/L'],'D vitamini durumunu değerlendirmek için kullanılan kan testidir.','Sonuç yaş, sağlık durumu ve kullanılan desteklerle birlikte yorumlanır; uygulama doz önermez.','vitamin-d-test'),
 item('b12','B12 vitamini','Vitamin ve demir',['pg/mL','pmol/L'],'B12 düzeyini değerlendirir; kan hücreleri ve sinir sistemi işlevleriyle ilişkilidir.','Eksiklik şüphesinde belirtiler ve gerekirse ek testler gerekir.','vitamin-b-test'),
 item('glucose','Glukoz','Metabolizma',['mg/dL','mmol/L'],'Örnek alındığı andaki kan şekeri düzeyini gösterir.','Açlık ve yemek sonrası ölçümler farklı koşullardır; trendlerde ayrı tutulur.','blood-glucose-test'),
 item('hba1c','HbA1c','Metabolizma',['%','mmol/mol'],'Yaklaşık son üç ayın ortalama kan şekeri hakkında bilgi verir.','Bazı anemiler ve hemoglobin özellikleri sonucu etkileyebilir. Tanı klinik doğrulama gerektirir.','hemoglobin-a1c-hba1c-test'),
 item('totalchol','Total kolesterol','Lipitler',['mg/dL','mmol/L'],'Kandaki toplam kolesterolü ölçer.','Kardiyovasküler risk, yaş ve diğer risk etkenleriyle birlikte değerlendirilir.','cholesterol-levels'),
 item('ldl','LDL kolesterol','Lipitler',['mg/dL','mmol/L'],'LDL ile taşınan kolesterolü değerlendirir.','Tedavi hedefi kişisel riske bağlıdır; rapor aralığı kişisel tedavi hedefi değildir.','cholesterol-levels'),
 item('hdl','HDL kolesterol','Lipitler',['mg/dL','mmol/L'],'HDL ile taşınan kolesterolü değerlendirir.','Tek başına yüksek bir HDL sonucu tüm kalp-damar riskini açıklamaz.','cholesterol-levels'),
 item('tg','Trigliserit','Lipitler',['mg/dL','mmol/L'],'Kandaki bir yağ türünün düzeyini ölçer.','Örnek alım koşulları ve diğer lipit sonuçlarıyla birlikte değerlendirilir.','cholesterol-levels'),
 item('tsh','TSH','Tiroid',['mIU/L','µIU/mL'],'Tiroid bezine hormon üretmesi için verilen uyarıyı ölçer.','Tiroid işlevinin yorumunda serbest T4 gibi ek testler ve belirtiler gerekebilir.','tsh-thyroid-stimulating-hormone-test'),
 item('creatinine','Kreatinin','Böbrek',['mg/dL','µmol/L'],'Böbreklerin süzme işlevinin değerlendirilmesinde kullanılır.','Kas kütlesi, yoğun egzersiz ve sıvı durumu etkileyebilir. Tek sonuç böbrek hastalığı tanısı koydurmaz.','creatinine-test'),
 item('alt','ALT','Karaciğer',['U/L','IU/L'],'Karaciğer hücreleriyle ilişkili bir enzimi ölçer.','Diğer karaciğer testleri, ilaçlar ve öyküyle birlikte değerlendirilir.','alt-blood-test'),
 item('ast','AST','Karaciğer ve kas',['U/L','IU/L'],'Karaciğer ve kas dahil çeşitli dokularda bulunan bir enzimi ölçer.','Kas hasarı veya yoğun egzersiz de sonucu etkileyebilir; tek başına karaciğere özgü değildir.','ast-test'),
 item('crp','CRP','İnflamasyon',['mg/L','mg/dL'],'Vücuttaki inflamasyonu değerlendirmek için kullanılan bir belirteçtir.','İnflamasyonun yerini ya da nedenini tek başına belirlemez. hs-CRP ile aynı test olarak kaydetme.','c-reactive-protein-crp-test')
].map(Object.freeze));
});
