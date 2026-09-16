(function(root,factory){const api=factory();root.AccountGuide=api;if(typeof module==='object')module.exports=api})(typeof window!=='undefined'?window:globalThis,()=>{
'use strict';
const mode=db=>db.settings?.interfaceMode==='professional'?'professional':'simple';
function settings(db,next){if(!['simple','professional'].includes(next))throw Error('Geçerli görünümü seç.');return {settings:{...db.settings,interfaceMode:next}}}
function roadmap(db){return [
 {id:'intro',title:'Kendine uygun görünümü seç',detail:'Basit görünüm temel işleri öne çıkarır. Profesyonel görünüm bütün menüleri açar. Seçim spor seviyen değildir.',page:'guide',done:!!db.settings?.welcomeCompletedAt},
 {id:'profile',title:'İstersen kendini tanıt',detail:'Yaşın ve antrenman geçmişin yorumların bağlamını oluşturur. Sağlık bilgileri isteğe bağlıdır.',page:'health-profile',done:!!db.personalHealthProfile},
 {id:'checkin',title:'Bugün nasıl olduğunu kaydet',detail:'Enerji ve yorgunluk kayıtların bugünkü öneriye bağlanır.',page:'simple-home',done:Object.values(db.daily||{}).some(d=>d.checkinAt)},
 {id:'move',title:'Yaptığın hareketi kaydet',detail:'Yürüyüş de bir başlangıç. Süreyi gir; istersen zorluğunu ekle. Geçmiş bir gün de seçebilirsin.',page:'simple-activity',done:!!(db.sportSessions?.length||Object.keys(db.trainingLogs||{}).length)},
 {id:'review',title:'Biriken kayıtlarını incele',detail:'Gelişim ekranında süre ve kayıt düzenini gör. Daha ayrıntılı analizleri istediğinde aç.',page:'simple-progress',done:!!db.settings?.guideProgress?.review}
 ]}
const lessons=[
 {id:'home',page:'simple-home',title:'Bugün: tek bir başlangıç noktası',text:'“Nasıl hissediyorsun?” alanına enerji ve yorgunluğunu gir. Sağlık kaydın varsa öneri burada görünür. Eksik veri, iyi olduğun varsayımıyla doldurulmaz.'},
 {id:'move',page:'simple-activity',title:'Hareket: yaptığını kaydet',text:'Branşı, günü ve süreyi seç. Zorluk 0 çok kolay, 10 olabilecek en zor seanstır. Boş bırakabilirsin. Set, ağırlık ve RIR ayrıntıları Profesyonel görünümde veya ayrıntılı kayıtta bulunur.'},
 {id:'health',page:'simple-health',title:'Sağlık: uyku ve toparlanma bir arada',text:'Uyku, tahlil ve hastalık/sakatlık geçmişi burada. Hastalandığında bir süreç aç; düzelirken “Toparlanıyorum”, bittiğinde “Tamamen sona erdi” seç. Regl takibi yalnız sen açarsan görünür.'},
 {id:'review',page:'simple-progress',title:'Gelişim: önce kendi geçmişin',text:'Kayıt sayısını ve süreyi takip et. Bunlar kas gelişimi veya sağlık puanı değildir. Ayrıntılı analizde benzer koşullardaki seansları karşılaştırabilirsin.'},
 {id:'settings',page:'guide',title:'Kontrol sende',text:'Profilim → Görünüm ve rehber bölümünden görünümü her zaman değiştir. Kayıtların iki görünümde ortaktır. Bu turu aynı bölümden yeniden açabilirsin.'}
];
return {mode,settings,roadmap,lessons};
});
