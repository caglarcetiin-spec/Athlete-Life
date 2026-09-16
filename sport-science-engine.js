/* Versioned measurement models. Source-backed methods and descriptive arithmetic
   are labelled separately; no model claims to measure injury risk or healing. */
((root)=>{
'use strict';
const C=root.SportCatalog||(typeof require==='function'?require('./sport-catalog.js'):null);
const VERSION='2.0';
const sources={
 monitoring:{title:'Bourdon ve ark. · Antrenman yükü izleme uzlaşısı (2017)',url:'https://pubmed.ncbi.nlm.nih.gov/28463642/',scope:'İç yük, dış yük ve bireysel yanıtı birlikte, bağlamıyla izleme.'},
 srpe:{title:'Foster ve ark. · Seans RPE yöntemi (2001)',url:'https://pubmed.ncbi.nlm.nih.gov/11708692/',scope:'Seans süresi × algılanan zorluk; branş performansı veya kas hasarı değildir.'},
 rir:{title:'Zourdos ve ark. · Tekrar rezervi ölçeği (2016)',url:'https://pubmed.ncbi.nlm.nih.gov/26049792/',scope:'Direnç çalışmasında sette kalan tekrarın öznel tahmini; seans RPE ile aynı ölçüm değil.'},
 resistance:{title:'ACSM · Direnç antrenmanı bildirisi (2026)',url:'https://acsm.org/resistance-training-guidelines-update-2026/',scope:'Sağlıklı yetişkinlerde direnç çalışması. Branş, yaş ve rehabilitasyon reçetesi yerine geçmez.'},
 hybrid:{title:'Schumann ve ark. · Birlikte dayanıklılık ve kuvvet çalışması (2022)',url:'https://pubmed.ncbi.nlm.nih.gov/34757594/',scope:'Aynı seansta aerobik ve kuvvet çalışmasının özellikle patlayıcı kuvvet hedefiyle ilişkisi.'},
 swim:{title:'Dekerle ve ark. · 200/400 m kritik yüzme hızı (2002)',url:'https://pubmed.ncbi.nlm.nih.gov/11842355/',scope:'Antrenmanlı yüzücülerde mesafe-zaman modeli. Doğrudan laktat eşiği ölçümü değildir.'},
 swimReliability:{title:'Branş stiline özgü kritik yüzme hızı testi (2024)',url:'https://pubmed.ncbi.nlm.nih.gov/38380294/',scope:'200/400 m protokolünde stil ve ölçüm koşullarının korunması; tahmin belirsizliği vardır.'}
};
// [key, label, unit, minimum, maximum, integer]. Bounds validate input, not norms.
const fields={
 power:['powerW','Ortalama ölçülen güç','W',0,5000],cadence:['cadence','Ortalama kadans','dev/dk',0,300],
 strokes:['strokeCount','Toplam kulaç / kürek çekişi','adet',0,100000,true],
 swim200:['test200Sec','200 m test süresi','sn',30,7200],swim400:['test400Sec','400 m test süresi','sn',60,14400],
 active:['activeMinutes','Aktif oyun / çalışma süresi','dk',0,1440],
 technical:['technicalAttempts','Teknik deneme','adet',1,100000,true],success:['technicalSuccess','Başarılı teknik deneme','adet',0,100000,true],
 points:['pointsWon','Kazanılan puan','adet',0,100000,true],pointsAll:['pointsPlayed','Oynanan toplam puan','adet',1,100000,true],
 wins:['wins','Galibiyet','adet',0,1000,true],draws:['draws','Beraberlik','adet',0,1000,true],losses:['losses','Mağlubiyet','adet',0,1000,true],
 shots:['shots','Şut / vuruş denemesi','adet',1,10000,true],onTarget:['shotsOnTarget','İsabetli şut / vuruş','adet',0,10000,true],
 contacts:['contacts','Temas / sıçrama sayısı','adet',0,10000,true],
 work:['workMinutes','Toplam çalışma süresi','dk',0.01,1440],rest:['restMinutes','Toplam dinlenme süresi','dk',0,1440],
 score:['score','Ölçülen puan','puan',-10000,100000],maxScore:['maxScore','Mümkün en yüksek puan','puan',0.01,100000],
 faults:['faults','Hata / ceza sayısı','adet',0,10000,true],penalty:['penaltySeconds','Zaman cezası','sn',0,86400],
 bestTime:['bestSeconds','En iyi tamamlanan deneme','sn',0.01,86400],
 bestDistance:['bestDistanceM','En iyi atlama / atış','m',0.01,1000],
 hold:['holdSeconds','Toplam kontrollü tutuş','sn',0,86400],rom:['rangeDegrees','Ölçülen hareket açıklığı','derece',0,360],
 routes:['routes','Denediğin rota / problem','adet',1,10000,true],sent:['routesCompleted','Tamamlanan rota / problem','adet',0,10000,true],
 holes:['holes','Oynanan delik','adet',1,200,true],golfStrokes:['golfStrokes','Toplam vuruş','adet',1,2000,true],par:['coursePar','Oynanan deliklerin toplam par değeri','vuruş',1,1000,true],
 breath:['breathHoldSeconds','Kaydedilen nefes tutuşu','sn',0.1,1800],depth:['depthM','Kaydedilen en fazla derinlik','m',0,400],
 transitions:['transitionMinutes','Toplam geçiş süresi','dk',0,1440],
 errors:['unforcedErrors','Kaydedilen kontrolsüz hata','adet',0,10000,true],
 puzzles:['tasks','Çalışılan görev / problem','adet',1,10000,true],solved:['tasksSolved','Tamamlanan görev / problem','adet',0,10000,true]
};
// A model describes the measurement protocol, not universal physiological norms.
const models={
 resistance:{name:'Kuvvet ve set modeli',extra:[],methods:['strength-sets','hypertrophy','isometric','eccentric'],conditions:'Hareket varyasyonu, ekipman, hareket açıklığı ve dış yük tanımı',focus:'Set, tekrar, dış yük, RIR ve dinlenmeyi ayrı izle. Vücut ağırlığını dış yükle toplama.',sources:['monitoring','rir','resistance']},
 run:{name:'Koşu / yürüyüş modeli',extra:[],methods:['continuous','interval','fartlek','speed'],conditions:'Mesafe, parkur, eğim, zemin, hava ve ölçüm aracı',focus:'Aynı parkur ve mesafede aktif tempo ile zorluğu birlikte karşılaştır.',sources:['monitoring','srpe']},
 cycle:{name:'Bisiklet ve güç modeli',extra:['power','cadence'],methods:['continuous','interval','speed','technique'],conditions:'Bisiklet, güç ölçer, parkur / eğim, rüzgâr ve kadans',focus:'Güç yalnız ölçer verisi varsa hesaplara girer. Yol hızı tek başına fizyolojik gelişim göstermez.',sources:['monitoring','srpe']},
 row:{name:'Kürek ve çekiş modeli',extra:['power','strokes'],methods:['continuous','interval','technique'],conditions:'Tekne / ergometre, direnç ayarı, su ve rüzgâr koşulları',focus:'500 m bölünmüş süre, çekiş ve ölçülen mekanik işi aynı cihaz/koşulla izle.',sources:['monitoring','srpe']},
 swim:{name:'Yüzme ölçüm modeli',extra:['strokes'],methods:['continuous','interval','technique','speed'],conditions:'Stil, havuz boyu, ekipman, dönüş ve başlama yöntemi',focus:'100 m temposunu aktif yüzme süresinden hesapla; dinlenmeyi toplam seansla karıştırma.',sources:['monitoring','swim','swimReliability']},
 openWater:{name:'Açık su modeli',extra:['strokes'],methods:['continuous','interval','technique'],conditions:'Stil, rota, su sıcaklığı, akıntı, dalga, kıyafet ve mesafe ölçer',focus:'Akıntı ve rota farklıysa tempo değişimini kondisyon kazanımı sayma.',sources:['monitoring','srpe']},
 multisport:{name:'Çok etaplı spor modeli',extra:['transitions','work','rest'],methods:['continuous','interval','technique','strength-sets'],conditions:'Etap sırası, etap mesafeleri, geçiş düzeni ve parkur',focus:'Etapları yapılandırılmış çalışma satırlarıyla kaydet. Farklı etap hızlarını tek tempo yapma.',sources:['monitoring','hybrid']},
 field:{name:'Saha ve takım oyunu modeli',extra:['active','shots','onTarget','technical','success','contacts'],methods:['tactics','practice-match','interval','technique','strength-sets'],conditions:'Pozisyon, rakip düzeyi, saha ölçüsü, oyun formatı ve aktif dakika',focus:'Oyun maruziyetiyle teknik sonucu ayrı izle. Takım sonucundan bireysel kondisyon çıkarma.',sources:['monitoring','srpe']},
 net:{name:'File ve raket oyunu modeli',extra:['active','points','pointsAll','errors','technical','success'],methods:['technique','tactics','practice-match','agility'],conditions:'Rakip düzeyi, format, yüzey, ekipman ve kullanılan teknik',focus:'Puan ve teknik başarı oranını rakip ve oyun koşullarıyla değerlendir.',sources:['monitoring','srpe']},
 bat:{name:'Vuruş ve atış oyunu modeli',extra:['active','technical','success','shots','onTarget'],methods:['technique','tactics','practice-match','speed'],conditions:'Rol, kullanılan top/ekipman, oyun formatı ve rakip',focus:'Teknik denemeler ile aktif oyunu ayır; farklı rollerin sayımlarını birbirine karıştırma.',sources:['monitoring','srpe']},
 combat:{name:'Raunt ve mücadele modeli',extra:['work','rest','technical','success','contacts'],methods:['technique','tactics','practice-match','interval','strength-sets'],conditions:'Teknik / sparring türü, partner, temas düzeyi, kural seti ve raunt süresi',focus:'Çalışma-dinlenme oranını ve teknik başarıyı kaydet. Temas sayısı hasar ölçümü değildir.',sources:['monitoring','srpe']},
 skill:{name:'Beceri ve uygulama modeli',extra:['technical','success','hold','faults'],methods:['technique','skill-progression','balance','strength-sets'],conditions:'Hareket varyasyonu, zorluk, destek, yüzey ve uygulama standardı',focus:'Aynı beceri basamağındaki başarılı denemeleri karşılaştır; zorluk değişimini not et.',sources:['monitoring']},
 judged:{name:'Hakemli performans modeli',extra:['score','maxScore','technical','success','faults'],methods:['technique','skill-progression','balance','strength-sets'],conditions:'Rutin, zorluk düzeyi, puanlama sürümü, hakem ve ekipman',focus:'Puan değişimini aynı rutin ve puanlama sistemi içinde izle.',sources:['monitoring']},
 mobility:{name:'Kontrol ve hareket açıklığı modeli',extra:['hold','rom','technical','success'],methods:['mobility','balance','isometric','technique'],conditions:'Eklem / taraf, ölçüm pozisyonu, araç, aktif-pasif ölçüm ve destek',focus:'Aynı ölçüm protokolünü kullan. Daha fazla hareket açıklığı her durumda daha iyi değildir.',sources:['monitoring']},
 climb:{name:'Rota ve tırmanış modeli',extra:['routes','sent','bestTime'],methods:['technique','skill-progression','strength-sets','interval'],conditions:'Rota / problem, derece sistemi, stil, tutamak, emniyet ve koşullar',focus:'Tamamlama oranını aynı derece/rota bağlamında izle; farklı derece sistemlerini otomatik eşitleme.',sources:['monitoring']},
 outdoor:{name:'Doğa ve rota modeli',extra:['work','rest'],methods:['continuous','technique','interval'],conditions:'Rota, eğim, irtifa, taşınan yük, hava ve zemin',focus:'Mesafe, yükselti ve süreyi birlikte değerlendir. Hava ve rota farkı yük yorumunu değiştirir.',sources:['monitoring','srpe']},
 timed:{name:'Zamana karşı teknik spor modeli',extra:['bestTime','penalty','faults'],methods:['technique','speed','skill-progression'],conditions:'Parkur, ekipman, zemin, başlama ve zamanlama yöntemi',focus:'Temiz deneme süresi ile cezayı ayrı kaydet; farklı parkurların sürelerini kıyaslama.',sources:['monitoring']},
 distanceAttempt:{name:'Atlama / atış modeli',extra:['bestDistance','faults'],methods:['technique','speed','plyometric','strength-sets'],conditions:'Alt branş, alet ağırlığı, rüzgâr, koşu yaklaşması ve ölçüm yöntemi',focus:'Geçerli denemeleri ve en iyi mesafeyi izle. Teknik ve kuvvet kayıtlarını ayrı tut.',sources:['monitoring','resistance']},
 precision:{name:'Hedef ve isabet modeli',extra:['score','maxScore','technical','success'],methods:['technique','balance','practice-match'],conditions:'Hedef, uzaklık, deneme sayısı, ekipman ve ortam',focus:'Deneme sayısı ve mesafe eşleşmeden isabet yüzdesinden üstünlük çıkarma.',sources:['monitoring']},
 golf:{name:'Golf turu modeli',extra:['holes','golfStrokes','par','technical','success'],methods:['technique','practice-match','tactics'],conditions:'Saha, başlangıç noktası, delikler, par ve hava',focus:'Vuruş farkını aynı saha/başlangıç koşuluyla izle; handikap hesabı yapmaz.',sources:['monitoring']},
 table:{name:'Masa / hedef oyunu modeli',extra:['score','technical','success','errors'],methods:['technique','practice-match','tactics'],conditions:'Oyun türü, masa/zemin, ekipman, format ve rakip',focus:'Aynı oyun formatında seri, puan ve teknik başarıyı izle.',sources:['monitoring']},
 dive:{name:'Dalış kayıt modeli',extra:['depth','breath','work','rest'],methods:['technique','easy-session'],conditions:'Dalış türü, derinlik, ekipman, ortam ve gözetim',focus:'Yalnız yapılan dalışın kaydı. Dekompresyon, nefes tutuş hedefi veya güvenli dalış sınırı hesaplanmaz.',sources:['monitoring']},
 equestrian:{name:'Binicilik performans modeli',extra:['score','faults','bestTime','technical','success'],methods:['technique','practice-match','balance'],conditions:'At, parkur/rutin, ekipman, zemin ve puanlama biçimi',focus:'Binici özbildirimini atın fizyolojisi sayma. At değiştiğinde karşılaştırmayı ayır.',sources:['monitoring']},
 motor:{name:'Motor sporları modeli',extra:['bestTime','faults','work','rest'],methods:['technique','practice-match','tactics'],conditions:'Araç, parkur, lastik/ayarlar, hava ve zamanlama sistemi',focus:'Tur süresi araç ve koşullara bağlıdır. Araç hızı sporcunun metabolik yüküne çevrilmez.',sources:['monitoring']},
 mind:{name:'Bilişsel performans modeli',extra:['wins','draws','losses','puzzles','solved','errors'],methods:['tactics','practice-match','technique'],conditions:'Oyun / görev, süre kontrolü, rakip düzeyi, platform ve yardım kullanımı',focus:'Görev doğruluğu ve sonuçları izle. Zorluk × süre fiziksel antrenman yüküne katılmaz.',sources:['monitoring']},
 general:{name:'Kişisel ölçüm modeli',extra:['technical','success','work','rest'],methods:['technique','continuous','easy-session'],conditions:'Çalışma türü, ekipman, ortam ve gözlem standardı',focus:'Tanımladığın koşullar korunarak seans süresi ve teknik sonuçlar izlenir.',sources:['monitoring']}
};
const assignments={};
function assign(model,ids){for(const id of ids.split(/\s+/).filter(Boolean)){if(assignments[id])throw new Error('Repeated model: '+id);assignments[id]=model;}}
assign('resistance','strength calisthenics bodybuilding powerlifting weightlifting strongman functional-fitness kettlebell para-powerlifting');
assign('run','running trail-running track-running race-walking walking');
assign('cycle','road-cycling track-cycling mountain-bike indoor-cycling para-cycling');
assign('row','rowing indoor-rowing para-rowing canoe-sprint sea-kayak sup para-canoe');
assign('swim','swimming finswimming para-swimming');assign('openWater','open-water');
assign('multisport','triathlon duathlon aquathlon modern-pentathlon combined-athletics adventure-racing biathlon nordic-combined eventing para-triathlon para-biathlon');
assign('distanceAttempt','athletics-jumps athletics-throws ski-jumping');
assign('judged','artistic-swimming diving artistic-gymnastics rhythmic-gymnastics trampoline acrobatics aerobic-gymnastics dance breaking cheerleading freestyle-ski figure-skating bmx-freestyle vaulting');
assign('field','football futsal beach-soccer basketball basketball-3x3 handball beach-handball rugby-union rugby-sevens rugby-league american-football flag-football field-hockey floorball lacrosse ultimate netball korfball kabaddi australian-football gaelic-football hurling water-polo ice-hockey roller-derby polo wheelchair-basketball wheelchair-rugby blind-football goalball para-ice-hockey underwater-hockey underwater-rugby');
assign('net','volleyball beach-volleyball tennis table-tennis badminton squash padel pickleball racquetball beach-tennis wheelchair-tennis para-badminton para-table-tennis sitting-volleyball sepak-takraw');
assign('bat','baseball softball cricket');
assign('combat','arm-wrestling boxing kickboxing muay-thai mma judo karate taekwondo wrestling bjj ju-jitsu sambo wushu kendo fencing sumo wheelchair-fencing para-judo para-taekwondo oil-wrestling mas-wrestling tug-of-war');
assign('skill','aikido capoeira parkour rope-skipping surfing water-ski wakeboard skateboarding');
assign('mobility','yoga pilates mobility');
assign('climb','sport-climbing bouldering ice-climbing para-climbing');
assign('outdoor','mountaineering hiking orienteering caving rafting sailing windsurfing kitesurfing lifesaving ski-mountaineering');
assign('timed','canoe-slalom alpine-skiing snowboard bobsleigh luge skeleton bmx-racing para-alpine para-snowboard');
assign('run','cross-country-ski speed-skating short-track roller-skating para-cross-country');
assign('precision','archery shooting darts petanque bocce curling para-archery para-shooting boccia wheelchair-curling boules-sports');
assign('golf','golf disc-golf');assign('table','billiards bowling lawn-bowls');
assign('dive','scuba freediving');assign('equestrian','dressage show-jumping equestrian-endurance para-equestrian');
assign('motor','motocross motor-racing');assign('mind','chess go bridge esports');
assign('general','para-athletics'); // Event-specific metrics must be chosen; no assumed impairment physiology.
const familyDefaults={strength:'resistance',endurance:'run',water:'general',team:'field',racket:'net',combat:'combat',gymnastics:'skill',outdoor:'outdoor',winter:'timed',precision:'precision',wheels:'timed',equestrian:'equestrian',adaptive:'general',mind:'mind',traditional:'general'};
function definition(sport){
 if(typeof sport==='string')sport=C.find(sport);if(!sport)return null;
 const modelId=assignments[sport.id]||familyDefaults[sport.family]||'general',m=models[modelId];
 const base=C.schemas[sport.schema]?.fields||[],extra=m.extra.map(k=>fields[k]);
 const unique=[...new Map([...base,...extra].map(f=>[f[0],f])).values()];
 return {version:VERSION,sportId:sport.id,name:sport.name,modelId,...m,fields:unique,
  optionalTests:sport.id==='swimming'?[fields.swim200,fields.swim400]:[],
  adapted:sport.family==='adaptive',custom:!!sport.custom,
  scope:'Kayıt, hesaplanan ölçümler, koşulları eşleşen gelişim ve plan incelemesi. Klinik veya federasyon onaylı performans normu değildir.'};
}
const valid=(v,min=0)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(+v)&&+v>=min;
function validateMetrics(sport,m,duration,context={}){
 for(const [part,total] of [['technicalSuccess','technicalAttempts'],['pointsWon','pointsPlayed'],['shotsOnTarget','shots'],['routesCompleted','routes'],['tasksSolved','tasks'],['hits','attempts'],['completed','attempts']])
  if(m[part]!=null&&(m[total]==null||m[part]>m[total]))throw new Error('Başarı sayısı toplam denemeden büyük olamaz; toplamı da gir.');
 for(const key of ['movingMinutes','activeMinutes','workMinutes','restMinutes','transitionMinutes'])if(m[key]>duration)throw new Error('Aktif çalışma veya dinlenme toplam seans süresini aşamaz.');
 if((m.workMinutes||0)+(m.restMinutes||0)>duration)throw new Error('Çalışma ve dinlenme toplamı seans süresini aşıyor.');
 if(m.maxScore!=null&&(m.score==null||m.score>m.maxScore))throw new Error('Puan ve mümkün en yüksek puanı kontrol et.');
 if(m.matches!=null&&(m.wins||0)+(m.draws||0)+(m.losses||0)>m.matches)throw new Error('Sonuç sayısı maç sayısını aşamaz.');
 if(m.test200Sec!=null||m.test400Sec!=null){
  if(sport.id!=='swimming'||!m.test200Sec||!m.test400Sec||m.test400Sec<=m.test200Sec*2)throw new Error('200 ve 400 m test sürelerini birlikte gir. 400 m ortalama hızı 200 m hızından düşük olmalı.');
  if(!m.poolLengthM||!String(context.discipline||'').trim()||!String(context.conditions||'').trim())throw new Error('Kritik hız için aynı stil, havuz boyu ve test koşullarını belirt.');
  if((m.test200Sec+m.test400Sec)/60>duration)throw new Error('Test süreleri toplam seans süresini aşıyor.');
 }
}
function measurements(row,custom=[]){
 const sport=C.find(row.sportId,custom)||((String(row.sportId).startsWith('custom:')&&C.families[row.family]&&C.schemas[row.schema])?{id:row.sportId,name:row.sportName,family:row.family,schema:row.schema,custom:true}:null);
 const d=definition(sport);if(!d)return [];
 const m=row.metrics||{},out=[];
 function add(id,label,value,unit,formula,kind='calculated',source=null,direction=null){if(Number.isFinite(value))out.push({id,label,value,unit,formula,kind,source,direction,modelVersion:VERSION});}
 const distance=valid(m.distanceM,.001)?+m.distanceM:valid(m.distanceKm,.001)?+m.distanceKm*1000:null;
 if(distance&&valid(m.movingMinutes,.001)){
  const time=+m.movingMinutes*60;
  const split=d.modelId==='row'?500:((sport.schema==='swimming'||['swim','openWater'].includes(d.modelId))?100:1000);
  add('pace','Aktif tempo',time/distance*split/60,'dk / '+(split===1000?'km':split+' m'),'Aktif süre / mesafe','calculated',null,'lower');
  add('speed','Ortalama aktif hız',distance/time*3.6,'km/sa','Mesafe / aktif süre');
 }
 if(valid(m.powerW)&&valid(m.movingMinutes,.001))add('mechanicalWork','Ölçülen mekanik iş',+m.powerW*+m.movingMinutes*60/1000,'kJ','Ortalama ölçülen güç × aktif saniye / 1000');
 for(const [part,total,id,label] of [['hits','attempts','accuracy','İsabet oranı'],['completed','attempts','completion','Tamamlama oranı'],['technicalSuccess','technicalAttempts','technique','Teknik başarı'],['pointsWon','pointsPlayed','points','Kazanılan puan oranı'],['shotsOnTarget','shots','shotAccuracy','Şut / vuruş isabeti'],['routesCompleted','routes','routes','Rota tamamlama'],['tasksSolved','tasks','tasks','Görev tamamlama']])
  if(valid(m[part])&&valid(m[total],1)&&+m[part]<=+m[total])add(id,label,+m[part]/+m[total]*100,'%','Başarılı / toplam × 100','calculated',null,'higher');
 if(valid(m.workMinutes,.01)&&valid(m.restMinutes,.01))add('workRest','Çalışma / dinlenme',+m.workMinutes/+m.restMinutes,': 1','Çalışma süresi / dinlenme süresi');
 if(valid(m.test200Sec,1)&&valid(m.test400Sec,1)&&m.test400Sec>m.test200Sec*2&&m.poolLengthM&&row.discipline&&row.conditions&&row.sportId==='swimming')add('css','Kritik yüzme temposu tahmini',(+m.test400Sec-+m.test200Sec)/2/60,'dk / 100 m','(400 m saniye − 200 m saniye) / 2 / 60','estimate','swim','lower');
 if(valid(m.golfStrokes,1)&&valid(m.coursePar,1))add('parDifference','Par farkı',+m.golfStrokes-+m.coursePar,'vuruş','Vuruş − girilen par','calculated',null,'lower');
 for(const [key,label,unit,direction] of [['powerW','Ölçülen güç','W',null],['bestSeconds','En iyi süre','sn','lower'],['bestDistanceM','En iyi mesafe','m','higher'],['score','Puan','puan',null],['rangeDegrees','Hareket açıklığı','derece',null],['holdSeconds','Kontrollü tutuş','sn',null]])if(valid(m[key],key==='score'?-10000:0))add(key,label,+m[key],unit,'Kullanıcının girdiği ölçüm','recorded',null,direction);
 const observed=(row.workout?.actual||[]).filter(a=>a.done&&row.workout.steps.some(s=>s.id===a.stepId&&s.type==='resistance'));
 if(observed.length){
  add('observedSets','Kaydedilen direnç seti',observed.length,'set','Yaptım olarak işaretlenmiş direnç setleri');
  add('externalVolume','Dış yük hacmi',observed.reduce((n,a)=>n+(+a.reps||0)*(+a.loadKg||0),0),'kg·tekrar','Her sette tekrar × girilen ek ağırlık toplamı; vücut ağırlığı hariç');
  const rirs=observed.filter(a=>valid(a.rir));if(rirs.length)add('meanRir','Kaydedilen ortalama RIR',rirs.reduce((n,a)=>n+(+a.rir),0)/rirs.length,'tekrar','Yalnız RIR değeri girilmiş '+rirs.length+' setin ortalaması','calculated','rir');
 }
 return out;
}
function compare(rows,custom=[]){
 const groups=new Map();
 for(const row of rows){
  if(!row.discipline?.trim()||!row.conditions?.trim())continue;
  const m=row.metrics||{};
  for(const v of measurements(row,custom)){
   const protocol=[m.distanceM??m.distanceKm??null,m.poolLengthM??null,m.maxScore??null,m.holes??null,m.coursePar??null,(row.workout?.steps||[]).map(s=>[s.name,s.type])];
   const key=JSON.stringify([row.sportId,C.normalize(row.discipline),C.normalize(row.conditions),v.id,protocol]);
   const g=groups.get(key)||[];g.push({...v,date:row.date,recordId:row.id,sportId:row.sportId,sportName:row.sportName,discipline:row.discipline,conditions:row.conditions});groups.set(key,g);
  }
 }
 return [...groups.values()].filter(g=>g.length>=2).map(g=>{
  g.sort((a,b)=>a.date.localeCompare(b.date)||String(a.recordId).localeCompare(String(b.recordId)));const first=g[0],last=g.at(-1);
  const mean=g.reduce((n,x)=>n+x.value,0)/g.length,variance=g.reduce((n,x)=>n+(x.value-mean)**2,0)/(g.length-1);
  return {...last,firstDate:first.date,firstValue:first.value,change:last.value-first.value,count:g.length,mean,sd:Math.sqrt(variance),interpretation:'Aynı beyan edilen koşullarda gözlenen değişim. Nedensellik veya anlamlı gelişim testi değildir.'};
 });
}
function analyze(db,date){
 const seen=new Set();
 const rows=(db.sportSessions||[]).filter(r=>r.id&&r.date<=date&&!seen.has(r.id)&&seen.add(r.id));
 const selected=new Set([...(db.athleteProfile?.sports||[]).map(s=>s.sportId),...rows.map(r=>r.sportId)]);
 const bySport=[...selected].map(id=>{const sport=C.find(id,db.customSports||[]);if(!sport)return null;const model=definition(sport),sessions=rows.filter(r=>r.sportId===id).sort((a,b)=>a.date.localeCompare(b.date));return {sport,model,count:sessions.length,latest:sessions.at(-1)||null,measurements:sessions.length?measurements(sessions.at(-1),db.customSports||[]):[],comparisons:compare(sessions,db.customSports||[])};}).filter(Boolean);
 return {version:VERSION,date,bySport,coverage:{catalogue:C.sports.length,mapped:C.sports.filter(s=>assignments[s.id]).length,models:Object.keys(models).length},sources};
}
function reviewBlocks(blocks,profile){
 const out=[];
 for(const b of blocks){const d=definition(C.find(b.sportId));if(!d)continue;
  if(b.targetRir!=null&&d.modelId!=='resistance'&&b.methodId!=='strength-sets'&&b.methodId!=='hypertrophy')out.push({text:b.sportName+': RIR yalnız direnç setleri için anlamlıdır; seans zorluğunu ayrı değerlendir.',source:'rir'});
  if(b.methodId&&!d.methods.includes(b.methodId))out.push({text:b.sportName+': seçilen yöntem bu modelin temel yöntemleri dışında; branş destek çalışmasıysa tarifini belirt.',source:'monitoring'});
  if(d.modelId==='dive')out.push({text:'Dalış için yalnız kayıt ve gözlem sunulur; programdan güvenli derinlik veya nefes tutuş hedefi türetilmez.',source:'monitoring'});
 }
 for(let day=0;day<7;day++){
  const ds=blocks.filter(b=>b.day===day),strength=ds.some(b=>definition(C.find(b.sportId))?.modelId==='resistance'),endurance=ds.some(b=>['run','cycle','row','swim','openWater'].includes(definition(C.find(b.sportId))?.modelId));
  if(strength&&endurance)out.push({text:['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'][day]+': kuvvet ve dayanıklılık aynı gün. Patlayıcı performans önceliğinse seans sırası ve aralığını planla; sistem otomatik ayırmaz.',source:'hybrid'});
 }
 if(profile?.goals?.includes('strength')&&new Set(blocks.filter(b=>definition(C.find(b.sportId))?.modelId==='resistance').map(b=>b.day)).size<2)out.push({text:'Kuvvet hedefi var; haftada iki güne yayılmış direnç çalışması genel sağlıklı yetişkin rehberiyle karşılaştırılabilir. Bu, kişisel veya rehabilitasyon reçetesi değildir.',source:'resistance'});
 return out;
}
function coverage(){return C.sports.map(s=>({id:s.id,name:s.name,model:assignments[s.id]||null,fields:definition(s).fields.map(f=>f[0])}));}
const api={version:VERSION,sources,models,definition,validateMetrics,measurements,compare,analyze,reviewBlocks,coverage};
root.SportScience=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
