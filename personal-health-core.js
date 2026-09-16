/* Account health context: self-reports, transparent rules, no diagnosis or hormone inference. */
(function(root,factory){const api=factory();root.PersonalHealth=api;if(typeof module==='object')module.exports=api})(typeof window!=='undefined'?window:globalThis,()=>{
'use strict';
const version=1,copy=x=>JSON.parse(JSON.stringify(x)),list=x=>Array.isArray(x)?x:[],uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
const sources={
 cycle:{title:'McNulty ve ark. · Döngü ve egzersiz performansı',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7497427/'},
 illness:{title:'IOC · Solunum yolu enfeksiyonu sonrası spora dönüş',url:'https://pubmed.ncbi.nlm.nih.gov/35863871/'},
 iron:{title:'NIH · Demir ve besin kaynakları',url:'https://ods.od.nih.gov/factsheets/Iron-Consumer/'},
 periods:{title:'NHS · Regl belirtilerini takip etmek',url:'https://www.nhs.uk/conditions/periods/period-problems/'},
 activity:{title:'WHO · Yaşa göre fiziksel aktivite rehberi',url:'https://www.who.int/publications/i/item/9789240014886'},
 strength:{title:'ACSM · 2026 direnç antrenmanı rehberi',url:'https://acsm.org/resistance-training-guidelines-update-2026/'}
};
const sexes={unspecified:'Belirtmek istemiyorum',female:'Kadın',male:'Erkek',other:'Başka / farklı fizyolojik durum'};
const histories={unknown:'Henüz belirtmedim',new:'Yeni başlıyorum / düzenli spor yapmıyorum',returning:'Ara verdim, yeniden başlıyorum',regular:'Düzenli spor yapıyorum',advanced:'Uzun süredir ileri düzey çalışıyorum'};
const kinds={illness:'Hastalık',injury:'Sakatlık / ağrı',fatigue:'Halsizlik / yorgunluk'};
const states={ongoing:'Devam ediyor',recovering:'Toparlanıyorum',resolved:'Tamamen sona erdi'};
const bleeding={none:'Kanama yok',spotting:'Lekelenme',light:'Hafif',medium:'Orta',heavy:'Yoğun'};
function today(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`}
function date(v){let s=String(v||'').trim();if(/^\d{2}\.\d{2}\.\d{4}$/.test(s))s=s.split('.').reverse().join('-');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||s<'1900-01-01'||!Number.isFinite(Date.parse(s))||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)throw Error('Geçerli bir tarih gir: GG.AA.YYYY.');return s}
function addDays(d,n){const v=new Date(date(d)+'T12:00:00Z');v.setUTCDate(v.getUTCDate()+n);return v.toISOString().slice(0,10)}
function days(a,b){return Math.round((Date.parse(b)-Date.parse(a))/86400000)}
function text(v,max=1000){return String(v??'').trim().slice(0,max)}
function num(v,min,max,optional=true){if(v===''||v==null){if(optional)return null;throw Error('Gerekli sayısal alanı doldur.')}const s=String(v).trim().replace(',','.');if(!/^\d+(?:\.\d+)?$/.test(s)||!Number.isFinite(+s)||+s<min||+s>max)throw Error(`${min}–${max} arasında bir sayı gir.`);return +s}
function age(profile,on=today()){if(!profile?.birthDate)return null;try{const b=date(profile.birthDate);if(b>on)return null;return +on.slice(0,4)-+b.slice(0,4)-(on.slice(5)<b.slice(5)?1:0)}catch(_){return null}}
function validateProfile(raw,on=today()){
 const birthDate=raw.birthDate?date(raw.birthDate):null,sex=raw.sex||'unspecified',trainingHistory=raw.trainingHistory||'unknown';
 if(!Object.hasOwn(sexes,sex)||!Object.hasOwn(histories,trainingHistory))throw Error('Profil seçimini kontrol et.');
 const years=age({birthDate},on);if(birthDate&&(birthDate>on||years>120))throw Error('Doğum tarihini kontrol et.');
 return {birthDate,sex,trainingHistory,cycleTracking:raw.cycleTracking===true};
}
function saveProfile(db,raw,expected=JSON.stringify(db.personalHealthProfile),on=today()){
 if(JSON.stringify(db.personalHealthProfile)!==expected)throw Error('Profil değişti. Güncel halini yeniden aç.');
 const before=db.personalHealthProfile||null,after={...validateProfile(raw,on),updatedAt:new Date().toISOString(),version};
 return {personalHealthProfile:after,personalHealthHistory:[...list(db.personalHealthHistory),{kind:'profile',at:after.updatedAt,before:copy(before),after:copy(after)}]};
}
function saveEpisode(db,raw,{id=null,expected=null,on=today()}={}){
 const rows=list(db.healthEpisodes),before=id?rows.find(r=>r.id===id):null;
 if(id&&(!before||JSON.stringify(before)!==expected))throw Error('Bu kayıt değişti. Güncel kaydı yeniden aç.');
 const startDate=date(raw.startDate),assessmentDate=date(raw.assessmentDate||on),state=raw.state,kind=raw.kind;
 if(!Object.hasOwn(states,state)||!Object.hasOwn(kinds,kind)||startDate>on||assessmentDate>on||assessmentDate<startDate)throw Error('Durumu ve geçmişe ait tarihleri kontrol et.');
 const recoveryDate=state==='ongoing'?null:date(raw.recoveryDate||raw.endDate),endDate=state==='resolved'?date(raw.endDate):null;
 if(recoveryDate&&(recoveryDate<startDate||recoveryDate>assessmentDate))throw Error('Toparlanma tarihi başlangıç ile değerlendirme tarihi arasında olmalı.');
 if(endDate&&(endDate<recoveryDate||endDate>assessmentDate))throw Error('Bitiş tarihi toparlanma ile değerlendirme tarihi arasında olmalı.');
 const severity=num(raw.severity,0,10,false),symptoms={};
 for(const k of ['fever','chestBreathing','dizziness','severeGI'])symptoms[k]=raw.symptoms?.[k]===true;
 if(state==='resolved'&&(severity!==0||Object.values(symptoms).some(Boolean)))throw Error('Belirtiler sürüyorsa “Toparlanıyorum” seç. Sona eren kayıtta şiddet 0 olmalı.');
 const after={id:before?.id||uid(),kind,state,startDate,recoveryDate,endDate,assessmentDate,severity,symptoms,region:text(raw.region,100),notes:text(raw.notes),clinicianReturn:raw.clinicianReturn===true,createdAt:before?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
 return {healthEpisodes:before?rows.map(r=>r.id===id?after:r):[...rows,after],personalHealthHistory:[...list(db.personalHealthHistory),{kind:'episode',id:after.id,at:after.updatedAt,before:copy(before),after:copy(after)}]};
}
function saveCycle(db,raw,expected,on=today()){
 if(!db.personalHealthProfile?.cycleTracking)throw Error('Önce profilinden isteğe bağlı regl takibini aç.');
 const key=date(raw.date);if(key>on)throw Error('Bugün veya geçmişe ait bir tarih seç.');
 const before=db.cycleDays?.[key]||null;if(expected!==undefined&&JSON.stringify(before)!==expected)throw Error('Bu günün kaydı değişti. Tarihi yeniden seç.');
 if(!Object.hasOwn(bleeding,raw.bleeding))throw Error('Kanama bilgisini seç.');
 if(raw.cycleStart===true&&raw.bleeding==='none')throw Error('Regl başlangıcında kanama bilgisi olmalı.');
 const after={date:key,bleeding:raw.bleeding,cycleStart:raw.cycleStart===true,pain:num(raw.pain,0,10),fatigue:num(raw.fatigue,0,10),notes:text(raw.notes),updatedAt:new Date().toISOString()};
 return {cycleDays:{...db.cycleDays,[key]:after},personalHealthHistory:[...list(db.personalHealthHistory),{kind:'cycle',date:key,at:after.updatedAt,before:copy(before),after:copy(after)}]};
}
function saveCheckin(db,raw,expected,on=today()){
 const key=date(raw.date);if(key>on)throw Error('Bugün veya geçmişe ait bir tarih seç.');
 const before=db.daily?.[key]||{};if(expected!==undefined&&JSON.stringify(before)!==expected)throw Error('Günlük kayıt değişti. Tarihi yeniden seç.');
 const energy=num(raw.energy,1,5),fatigueLevel=num(raw.fatigueLevel,0,10);
 if(energy===null||fatigueLevel===null)throw Error('Enerjini ve yorgunluğunu belirt.');
 return {daily:{...db.daily,[key]:{...before,energy,fatigueLevel,checkinAt:new Date().toISOString()}}};
}
function context(db,on=today()){
 date(on);const p=db.personalHealthProfile||{},years=age(p,on),d=db.daily?.[on]||{},cycle=p.cycleTracking?db.cycleDays?.[on]||null:null;
 let level='normal';const reasons=[],notes=[],nutrition=[],rank={normal:0,ease:1,review:2,stop:3};
 const flag=(next,code,message,source)=>{if(rank[next]>rank[level])level=next;reasons.push({code,message,source})};
 const episodes=list(db.healthEpisodes).filter(e=>e&&typeof e.startDate==='string'&&e.startDate<=on&&(!e.endDate||e.endDate>on));
 // Only assessments at or before the requested day are used. Later edits never leak symptoms backward.
 const active=episodes.map(e=>{
  const candidates=[...list(db.personalHealthHistory).filter(h=>h&&h.kind==='episode'&&h.id===e.id).flatMap(h=>[h.before,h.after]),e].filter(r=>r&&r.assessmentDate<=on);
  return candidates.sort((a,b)=>a.assessmentDate.localeCompare(b.assessmentDate)||String(a.updatedAt||'').localeCompare(String(b.updatedAt||''))).at(-1)||{...e,state:'ongoing',assessmentDate:null,symptoms:{},severity:null};
 });
 if(d.healthFever||d.healthChestBreathing||d.healthDizziness||(d.healthGI&&+d.illnessSeverity>=6))flag('stop','daily-red','Ateş, göğüs/solunum yakınması, baş dönmesi veya ağır mide-bağırsak belirtisi var. Egzersizi durdur; sağlık değerlendirmesi al. Şiddetli göğüs ağrısı, ciddi nefes darlığı veya bayılmada 112.','illness');
 else if(d.healthStatus==='sick'||+d.illnessSeverity>=7)flag('stop','daily-sick','Belirgin hastalık kaydı varken antrenmanı ertele ve sağlık değerlendirmesi al.','illness');
 else if(d.healthStatus==='mild_illness'||+d.illnessSeverity>=2)flag('review','daily-ill','Hastalık belirtilerin sürüyor. Yoğun çalışmaya geçmeden belirtilerini ve uygun dönüşü değerlendir.','illness');
 else if(d.healthStatus==='recovering')flag('ease','daily-recovering','Bugünkü kaydına göre hastalık sonrası toparlanıyorsun. Programı değiştirmeden daha kolay bir seans değerlendir.','illness');
 if(+d.fatigueLevel>=8)flag('review','fatigue-high','Belirgin halsizlik var. Bugün yük artırma; dinlenmeyi ve sebebini değerlendirmeyi önceliklendir.','illness');
 else if(+d.fatigueLevel>=5)flag('ease','fatigue','Yorgunluk bildirimin yüksek; daha kısa ve kolay bir çalışma değerlendir.','strength');
 if(Math.max(...['painShoulder','painElbow','painWrist','painBack','painHip','painKnee','painAnkle'].map(k=>+d[k]||0))>=5)flag('review','pain','Belirgin eklem/bölge ağrısı kaydın var. Ağrıyı artıran hareketi zorlama; değerlendirme olmadan yük artırma.','strength');
 for(const e of active){
  const stale=!e.assessmentDate||days(e.assessmentDate,on)>2;
  if(Object.values(e.symptoms||{}).some(Boolean))flag('stop','episode-red:'+e.id,'Son sağlık kaydında önemli belirtiler var. Yoğun egzersize başlama; belirtileri güncelle ve sağlık değerlendirmesi al. Şiddetli göğüs ağrısı, ciddi nefes darlığı veya bayılmada 112.','illness');
  else if(stale)flag('review','episode-stale:'+e.id,'Devam eden sağlık olayının değerlendirmesi güncel değil. İyileştiğin varsayılmıyor; durumu güncelle.','illness');
  else if(e.kind==='injury'&&(e.state!=='recovering'||!e.clinicianReturn||e.severity>2))flag('review','injury:'+e.id,(e.region?e.region+': ':'')+'Sakatlık/ağrı kaydı için otomatik yük reçetesi üretilmiyor. Ağrılı hareketi ertele ve sana verilen dönüş planını izle.','strength');
  else if(e.severity>=5||e.state==='ongoing'&&e.kind==='illness')flag('review','active:'+e.id,'Sağlık şikayetin sürüyor. Önce belirtileri değerlendir; yoğun antrenmanı ertele.','illness');
  else flag('ease','recovering:'+e.id,`${kinds[e.kind]} sonrası toparlanma kaydın dikkate alınıyor. İlk kolay seansa verdiğin yanıtı ve ertesi günü izle; kötüleşirse dur.`,'illness');
 }
 if(cycle){
  if(cycle.pain>=7||cycle.fatigue>=8)flag('review','cycle-severe','Regl günlüğünde günlük yaşamı etkileyebilecek düzeyde ağrı/halsizlik var. Ağır çalışmayı ertele ve sağlık uzmanıyla görüş.','periods');
  else if(cycle.pain>=4||cycle.fatigue>=5)flag('ease','cycle-symptoms','Bugün bildirdiğin regl belirtileri nedeniyle daha kısa, kolay veya rahat hissettiren bir hareket seçebilirsin.','cycle');
  else notes.push({message:'Regl kaydı tek başına kas gelişiminin durduğunu veya yük azaltman gerektiğini göstermez. Bugünkü belirtilerini ve kendi seans yanıtını izle.',source:'cycle'});
  if(cycle.bleeding==='heavy')nutrition.push({message:'Yoğun kanama ve halsizlik tekrar ediyorsa hekimle görüş; demir eksikliği yalnız belirtilerden anlaşılmaz. Gerekiyorsa kan tahlillerini birlikte değerlendir.',source:'iron'});
 }
 if(p.cycleTracking)nutrition.push({message:'Regl için zorunlu özel bir diyet yok. Düzenli öğünlere baklagil, et/balık veya demirle zenginleştirilmiş besin ekleyebilirsin. Bitkisel demiri biber, narenciye gibi C vitamini kaynaklarıyla eşleştir. Demir takviyesi veya dozunu tahlil ve uzman değerlendirmesi olmadan belirleme.',source:'iron'});
 if(active.length)nutrition.push({message:'Toparlanırken düzenli öğünlerini, yeterli sıvıyı ve tolere edebildiğin besinleri önceliklendir. Hastalık kaydından kalori, ilaç veya takviye dozu hesaplanmaz.',source:'illness'});
 if(years===null)notes.push({message:'Yaş bilgisi eksik. Yaşa özel sayısal antrenman uyarlaması yapılmıyor.',source:'activity'});
 else if(years<18)notes.push({message:'18 yaş altındasın. Yetişkinlere ait yük yüzdeleri uygulanmaz; yaşına uygun çalışmayı nitelikli bir antrenörle planla.',source:'activity'});
 else if(years>=65)notes.push({message:'65 yaş ve üzerinde kuvvet, denge ve işlevsel hareketleri birlikte düşün. Yaş tek başına kapasite veya yavaş iyileşme hükmü değildir; mevcut yeterliliğin ve sağlık durumun belirleyicidir.',source:'activity'});
 if(['new','returning'].includes(p.trainingHistory))notes.push({message:'Yeni başlıyor veya aradan dönüyorsun. Önce teknik ve düzenlilik; süreyi ve zorluğu kademeli artır. İleri düzey geçmiş, ara sonrası eski yükün uygun olduğunu tek başına göstermez.',source:'strength'});
 else if(['regular','advanced'].includes(p.trainingHistory))notes.push({message:'Antrenman geçmişin var. İlerlemeyi kendi benzer koşullardaki kayıtlarınla izle; deneyim hastalık veya ağrı uyarılarını geçersiz kılmaz.',source:'strength'});
 const adaptation=list(db.healthAdjustments).filter(a=>(!a.cancelledAt||(a.cancelledOn&&a.cancelledOn>on))&&a.from<=on&&a.to>=on).at(-1)||null;
 const canScale=years!==null&&years>=18&&level==='ease';
 return {version,date:on,age:years,sex:p.sex||'unspecified',trainingHistory:p.trainingHistory||'unknown',level,reasons,notes,nutrition,cycle,episodes:active,adaptation,
  proposal:canScale?{volumeFactor:.7,loadFactor:.9,minRir:3}:null,
  notice:'Öneriler kayıtlarına dayalıdır; ölçülmüş hormon, klinik iyileşme veya kas gelişimi tahmini değildir. %70 hacim / %90 dış yük ve RIR 3, kolayca düzenlenebilen uygulama başlangıç ayarıdır; doğrulanmış tedavi protokolü değildir.'};
}
function dose(db,on=today()){
 const c=context(db,on),a=c.adaptation;
 if(['stop','review'].includes(c.level)||(c.level==='ease'&&!c.proposal))return {blocked:true,volumeFactor:0,loadFactor:0,minRir:null,context:c};
 const factors=c.proposal||{volumeFactor:1,loadFactor:1,minRir:null};
 if(a&&c.age>=18){factors.volumeFactor=Math.min(factors.volumeFactor,a.volumeFactor);factors.loadFactor=Math.min(factors.loadFactor,a.loadFactor);factors.minRir=Math.max(factors.minRir||0,a.minRir)}
 return {...factors,blocked:false,context:c};
}
function adjustBlock(db,block,on){
 const f=dose(db,on),original=copy(block);
 // Never turn a health pause into a zero-set prescription that the recorder cannot understand.
 if(f.blocked)return {...original,healthAdjustment:{...f,context:undefined},healthPaused:true};
 if(f.volumeFactor===1&&f.loadFactor===1)return original;
 const steps=list(original.steps).map(s=>({...s,sets:Math.max(1,Math.floor(s.sets*f.volumeFactor)),loadKg:s.loadKg==null?null:Math.floor(s.loadKg*f.loadFactor*10)/10,rir:s.type==='resistance'?Math.max(s.rir||0,f.minRir||0):s.rir,progressionMetric:null,increment:null}));
 return {...original,durationMin:Math.max(1,Math.round(original.durationMin*f.volumeFactor)),targetRir:original.targetRir==null?null:Math.max(original.targetRir,f.minRir||0),steps,healthAdjustment:{volumeFactor:f.volumeFactor,loadFactor:f.loadFactor,minRir:f.minRir,originalDuration:original.durationMin,ruleVersion:version}};
}
function adoptWeek(db,raw,on=today()){
 const c=context(db,on);if(!c.proposal)throw Error('Önce güncel sağlık durumunu ve yaş bilgini değerlendir. Bu durumda otomatik hafif hafta önerisi yok.');
 const volumeFactor=num(raw.volumeFactor,.4,1,false),loadFactor=num(raw.loadFactor,.5,1,false),minRir=num(raw.minRir,2,5,false);
 const entry={id:uid(),from:on,to:addDays(on,6),volumeFactor,loadFactor,minRir,reasons:c.reasons.map(r=>r.message),acceptedAt:new Date().toISOString(),ruleVersion:version};
 return {healthAdjustments:[...list(db.healthAdjustments).map(a=>!a.cancelledAt&&a.to>=on?{...a,cancelledAt:entry.acceptedAt,cancelledOn:on}:a),entry]};
}
function cancelWeek(db,id,on=today()){return {healthAdjustments:list(db.healthAdjustments).map(a=>a.id===id?{...a,cancelledAt:new Date().toISOString(),cancelledOn:on}:a)}}
return {version,sources,sexes,histories,kinds,states,bleeding,today,date,addDays,days,age,validateProfile,saveProfile,saveEpisode,saveCycle,saveCheckin,context,dose,adjustBlock,adoptWeek,cancelWeek};
});
