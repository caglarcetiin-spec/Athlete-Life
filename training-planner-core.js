/* Guided drafts, explicit goals and resumable sessions share the account snapshot. */
((root)=>{
'use strict';
const C=root.SportCatalog||(typeof require==='function'?require('./sport-catalog.js'):null);
const K=root.SportsProfileCore||(typeof require==='function'?require('./sports-profile-core.js'):null);
const P=root.WorkoutProgram||(typeof require==='function'?require('./workout-program-core.js'):null);
const W=()=>root.AthleteWorkspaceCore||(typeof require==='function'?require('./athlete-workspace-core.js'):null);
const uid=()=>root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const copy=x=>JSON.parse(JSON.stringify(x)), list=x=>Array.isArray(x)?x:[], norm=x=>C.normalize(String(x||''));
const finite=x=>x!==''&&x!=null&&Number.isFinite(+x), mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const sources=[{name:'ACSM · Direnç antrenmanı, 2026',url:'https://acsm.org/resistance-training-guidelines-update-2026/'},{name:'CDC · Aktiviteye başlama',url:'https://www.cdc.gov/physical-activity-basics/adding-adults/what-counts.html'}];
const explanations={resistance:'Hareket / set: örneğin 2 kez 8 çömelme. Bir tekrar hareketin bir kez yapılması, set ise tekrar grubudur.',interval:'Aralıklı çalışma: çalışma ve dinlenme sırayla tekrarlanır. Örneğin 4 tur, her tur 1 dakika çalışma ve ardından 1 dakika dinlenme. Her interval yüksek şiddetli değildir.',skill:'Teknik deneme: bir beceriyi kontrollü çalışmak. Örneğin 3 grup ayak hareketi; amaç yorulmak yerine tekniği korumaktır.',segment:'Kesintisiz çalışma: tek bir süre veya mesafe boyunca sürdürmek. Örneğin 15 dakika rahat yürüyüş. Birden fazla bölüm varsa her biri bir etaptır.'};
function health(db,on){return root.PersonalHealth?.context(db,on)||{age:null,level:'normal',reasons:[],notes:[]}}
function style(s){if(['strength','calisthenics','bodybuilding','functional-fitness'].includes(s.id))return 'strength';if(s.family==='combat')return 'combat';if(['running','walking','road-cycling','indoor-cycling','rowing','indoor-rowing'].includes(s.id))return 'endurance';if(s.family==='mind')return 'mind';return 'technique'}
function step(type,name,sets,values={}){return P.validateSteps([{id:uid(),type,name,sets,...values}])[0]}
function suggestion(db,a){
 const sport=C.find(a.sportId,db.customSports||[]);if(!sport)throw Error('Branşını seç.');
 if(!Object.hasOwn(C.experience,a.experience))throw Error('Bu branştaki deneyimini seç.');
 if(!Object.hasOwn(C.goals,a.objective))throw Error('Bu dönemde neyi geliştirmek istediğini seç.');
 const minutes=+a.minutes;if(!Number.isInteger(minutes)||minutes<15||minutes>120)throw Error('Taslak için 15–120 dakika seç.');
 const h=health(db,a.startDate||K.dayKey()),adult=h.age!=null?h.age>=18:a.adult==='yes';
 const safe=adult&&h.level==='normal',kind=style(sport),beginner=['new','returning'].includes(a.experience),sets=beginner?2:3;
 const focus=String(a.focus||'').trim().slice(0,120),notes=[];let steps=[];
 const specialist=['scuba','freediving','diving','ski-jumping','mountaineering','motorsport','motorcycling'].includes(sport.id)||['adaptive','equestrian','winter'].includes(sport.family);
 if(!safe||specialist){notes.push(!safe?'Yaş veya güncel sağlık bağlamı nedeniyle sayısal çalışma önerisi oluşturulmadı. Hedef ve takvim taslağını kaydedebilir, uygun ayrıntıları antrenörünle tanımlayabilirsin.':'Bu branşın güvenlik ve teknik koşulları uzmanlık gerektirir. Takvim ve ölçüm takibi hazır; süre, yük ve teknik ayrıntılarını antrenörünle belirle.');}
 else if(kind==='strength'){
  const equipment=list(a.equipment),weighted=equipment.includes('dumbbells')||equipment.includes('gym');
  const reps=a.objective==='hypertrophy'?10:8;
  steps=[step('resistance','Bodyweight Squat',sets,{reps,loadKg:0,rir:3,restSec:90}),step('resistance',beginner?'Incline Push-Up':'Push-Up',sets,{reps:beginner?6:8,loadKg:0,rir:3,restSec:90}),step('resistance','Glute Bridge',sets,{reps:10,loadKg:0,rir:3,restSec:60})];
  if(weighted)steps.push(step('resistance','DB Row',sets,{reps:8,rir:3,restSec:90}));
  else if(equipment.includes('bands'))steps.push(step('resistance','Band Row',sets,{reps:10,rir:3,restSec:90}));
  else notes.push('Çekiş hareketi için bant, güvenli bar veya salon ekipmanı ekleyebilirsin. Ekipman olmadan taslak tüm hareket örüntülerini kapsamıyor.');
  if(/barfiks|pull.?up/.test(norm(focus))&&(equipment.includes('pullup')||equipment.includes('gym'))){steps.push(step('resistance',beginner?'Assisted Pull-Up':'Pull-Up',sets,{reps:beginner?3:5,rir:3,restSec:120}));notes.push('Barfiks hedefin için uygun destek / varyasyonu seç. Yardım kuvveti dış yük değildir; koşullarına destek biçimini yaz.');}
  for(const s of steps){s.progressionMetric='reps';s.increment=1;}
  notes.push('Yük bilinmiyorsa kilogram uydurulmaz. Hedefin sonunda yaklaşık 3 tekrar daha yapabilecek kadar kolay bir varyasyon seç. RIR bunu anlatır.');
 }else if(kind==='endurance'){
  const main=Math.max(5,minutes-10);steps=[step('segment','Rahat başlangıç · '+sport.name,1,{seconds:300}),step('segment',focus||sport.name+' · konuşabilecek rahat tempo',1,{seconds:main*60}),step('segment','Rahat bitiriş',1,{seconds:300})];
  notes.push('Hız veya nabız eşiği ölçülmedi; yüksek yoğunluk atanmadı. Rahat konuşma sürdürülemiyorsa tempoyu azalt.');
 }else if(kind==='combat'){
  steps=[step('segment','Hafif ısınma ve ayak hareketleri',1,{seconds:300}),step('skill',focus||sport.name+' · bildiğin temel teknik, temassız',sets,{seconds:120,restSec:60}),step('skill','Kontrollü ayak hareketi ve teknik tekrar',sets,{seconds:120,restSec:60})];
  notes.push('Taslak temassız teknik çalışmadır; sparring, sert temas veya müsabaka yükü önermiyor. Bilmediğin tekniği antrenörle öğren.');
 }else if(kind==='mind'){
  steps=[step('skill',focus||sport.name+' · temel problem / strateji',sets,{seconds:300,restSec:60}),step('segment','Hataları gözden geçir ve not al',1,{seconds:300})];
 }else{
  steps=[step('skill',focus||sport.name+' · bildiğin temel beceri',sets,{seconds:120,restSec:60})];
  notes.push('Bu branşta genel teknik çalışma iskeleti sunuluyor. Hareket adı, uygulama standardı ve güvenli süreyi kendi branş koşullarına göre düzenle; taslak tam bir branş reçetesi değildir.');
 }
 if(focus&&kind==='strength')notes.push('Özel beceri hedefin: '+focus+'. İleri beceri yükünü tahmin etmiyoruz; ayrıntı panelinde bildiğin uygun basamağı ekle.');
 if(a.experience==='competitive')notes.push('Müsabaka düzeyi için bu başlangıç iskeletini takvimine ve antrenörünün yük planına göre özelleştir.');
 return {sport,steps,notes,kind,methodId:kind==='strength'?'strength-sets':kind==='endurance'?'continuous':'technique',coverage:!safe||specialist?'calendar-only':kind==='technique'?'general-framework':'starter-template'};
}
function draft(db,a,on=K.dayKey()){
 const startDate=K.parseDate(a.startDate);if(!startDate||startDate<on)throw Error('Başlangıç için bugün veya sonraki bir tarih seç.');
 const weeks=+a.weeks;if(![4,8,12].includes(weeks))throw Error('4, 8 veya 12 hafta seç.');
 const days=[...new Set(list(a.days).map(Number))].sort();if(!days.length||days.length>6||days.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('1–6 antrenman günü seç; en az bir dinlenme günü bırak.');
 const target=String(a.target||'').trim();if(!target||target.length>1000)throw Error('Dönem sonunda ulaşmak istediğin sonucu yaz (en fazla 1000 karakter).');
 const rec=suggestion(db,{...a,startDate});
 const restDays=[0,1,2,3,4,5,6].filter(d=>!days.includes(d));
 const blocks=days.map(day=>({id:uid(),day,sportId:rec.sport.id,durationMin:+a.minutes,methodId:rec.methodId,targetRir:rec.kind==='strength'?3:null,restSec:rec.kind==='strength'?90:null,steps:copy(rec.steps).map(s=>({...s,id:uid()})),prescription:target+' · '+rec.notes.join(' '),progression:'İlk hafta uygunluğu kontrol et. Her hafta gerçekleşen set, zorluk ve sağlık kayıtlarını incele. İki benzer seansta rahat tamamlanırsa tek bir hedefi manuel artır; 4., 8. ve 12. haftalarda değerlendirme yap. Artış otomatik uygulanmaz.'}));
 return {name:String(a.name||rec.sport.name+' · '+weeks+' haftalık yolum').slice(0,100),startDate,weeks,goal:target,blocks,planner:{version:1,answers:{sportId:rec.sport.id,experience:a.experience,objective:a.objective,focus:String(a.focus||'').slice(0,120),equipment:list(a.equipment),adult:a.adult,days,minutes:+a.minutes},restDays,coverage:rec.coverage,notes:rec.notes,sourceUrls:sources.map(s=>s.url),checkpoints:[4,8,12].filter(n=>n<=weeks)},goalIds:list(a.goalIds).filter(id=>list(db.athleteGoals).some(g=>g.id===id&&!g.archivedAt))};
}
function saveGoal(db,input,id=null,on=K.dayKey()){
 const old=list(db.athleteGoals).find(g=>g.id===id),type=input.type;
 if(id&&!old)throw Error('Hedef bulunamadı.');
 if(!['weight','movement','sport'].includes(type))throw Error('Hedef türünü seç.');
 const title=String(input.title||'').trim().slice(0,120),startDate=K.parseDate(input.startDate),targetDate=K.parseDate(input.targetDate);
 if(!title||!startDate||!targetDate||startDate>on||targetDate<startDate)throw Error('Hedef adı ve tarihlerini kontrol et. Başlangıç bugün veya geçmişte olmalı.');
 const baseline=+String(input.baseline).replace(',','.'),target=+String(input.target).replace(',','.');
 if(String(input.baseline??'').trim()===''||String(input.target??'').trim()===''||!Number.isFinite(baseline)||!Number.isFinite(target)||baseline<0||target<0||target===baseline)throw Error('Farklı başlangıç ve hedef değerleri gir.');
 let unit=type==='weight'?'kg':String(input.unit||'').trim().slice(0,30),sportId=type==='weight'?null:input.sportId,movement=String(input.movement||'').trim().slice(0,120),conditions=String(input.conditions||'').trim().slice(0,300);
 if(!unit||(type!=='weight'&&(!C.find(sportId,db.customSports||[])||!conditions)))throw Error('Branşını, birimi ve karşılaştırma koşulunu belirt.');
 if(type==='movement'&&(!movement||!['reps','seconds','loadKg'].includes(input.metric)))throw Error('Hareket ve ölçüm türünü seç.');
 if(type==='weight'&&(baseline<20||baseline>350||target<20||target>350))throw Error('Kilo değerini kontrol et.');
 const sportField=type==='sport'&&input.sportMetric!=='manual'?(root.SportScience?.definition(C.find(sportId,db.customSports||[]))?.fields||[]).find(f=>f[0]===input.sportMetric):null;
 const metric=type==='weight'?'weight':type==='movement'?input.metric:sportField?.[0]||'manual';if(sportField)unit=sportField[2];
 if(type==='movement')unit={reps:'tekrar',seconds:'sn',loadKg:'kg'}[metric];
 const row={id:old?.id||uid(),title,type,metric,unit,sportId,movement,conditions,discipline:String(input.discipline||'').trim().slice(0,100),baseline,target,startDate,targetDate,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),archivedAt:null};
 return {...(type==='weight'&&!old?{bodyMeasurements:[...list(db.bodyMeasurements),{date:startDate,weight:baseline,source:'goal-baseline',goalId:row.id}]}:{}),athleteGoals:old?db.athleteGoals.map(g=>g.id===id?row:g):[...list(db.athleteGoals),row],goalHistory:[...list(db.goalHistory),{before:old||null,after:row,at:row.updatedAt}]};
}
function measurement(db,id,value,date,on=K.dayKey()){
 const g=list(db.athleteGoals).find(g=>g.id===id&&!g.archivedAt),d=K.parseDate(date),n=Number(String(value).replace(',','.'));
 if(!g||!d||d>on||d<g.startDate||String(value).trim()===''||!Number.isFinite(n)||n<0||(g.type==='weight'&&(n<20||n>350)))throw Error('Ölçüm değerini ve tarihini kontrol et.');
 return {goalMeasurements:[...list(db.goalMeasurements),{id:uid(),goalId:id,date:d,value:n,unit:g.unit,conditions:g.conditions,createdAt:new Date().toISOString()}],...(g.type==='weight'?{bodyMeasurements:[...list(db.bodyMeasurements),{date:d,weight:n,source:'goal-measurement'}]}:{})};
}
function goalSeries(db,g,on=K.dayKey()){
 let points=[{date:g.startDate,value:g.baseline,source:'Başlangıç beyanın'}];
 if(g.type==='weight')points.push(...Object.entries(db.daily||{}).map(([date,r])=>({date,value:r.weight,source:'Günlük kilo'})),...list(db.bodyMeasurements).map(r=>({date:r.date,value:r.weight,source:'Vücut ölçümü'})));
 if(g.type==='movement')for(const r of list(db.sportSessions).filter(r=>r.sportId===g.sportId&&norm(r.conditions)===norm(g.conditions))){
  const steps=list(r.workout?.steps).filter(s=>norm(s.name)===norm(g.movement));
  const values=list(r.workout?.actual).filter(a=>a.done&&steps.some(s=>s.id===a.stepId)&&finite(a[g.metric])).map(a=>+a[g.metric]);
  if(values.length)points.push({date:r.date,value:Math.max(...values),source:'Eşleşen seansın en yüksek set değeri'});
 }
 if(g.type==='sport'&&g.metric!=='manual')points.push(...list(db.sportSessions).filter(r=>r.sportId===g.sportId&&norm(r.conditions)===norm(g.conditions)&&norm(r.discipline)===norm(g.discipline)&&finite(r.metrics?.[g.metric])).map(r=>({date:r.date,value:+r.metrics[g.metric],source:'Eşleşen branş ölçümü'})));
 points.push(...list(db.goalMeasurements).filter(r=>r.goalId===g.id&&r.unit===g.unit&&norm(r.conditions)===norm(g.conditions)).map(r=>({...r,source:'Hedef ölçümün'})));
 const byDay=new Map();for(const p of points.filter(p=>K.parseDate(p.date)&&p.date>=g.startDate&&p.date<=on&&finite(p.value))){byDay.set(p.date,{...p,value:+p.value});}
 return [...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function goalStatus(db,g,on=K.dayKey()){
 if(g.startDate>on)return {goal:g,points:[],hasMeasurement:false,current:null,lastDate:null,source:'Bu tarihte hedef başlamamıştı',progress:0,expected:null,deviation:null,trend:'unknown',staleDays:0,reached:false};
 const points=goalSeries(db,g,on),last=points.at(-1),hasMeasurement=last.source!=='Başlangıç beyanın',previous=points.at(-2)||(hasMeasurement?{value:g.baseline}:null),range=g.target-g.baseline;
 const ratio=(last.value-g.baseline)/range,elapsed=Math.max(0,Math.min(1,(Date.parse(last.date)-Date.parse(g.startDate))/Math.max(86400000,Date.parse(g.targetDate)-Date.parse(g.startDate))));
 return {goal:g,points,hasMeasurement,current:last.value,lastDate:last.date,source:last.source,progress:ratio*100,expected:g.baseline+range*elapsed,deviation:last.value-(g.baseline+range*elapsed),trend:!previous?'unknown':(last.value-previous.value)*Math.sign(range)>0?'toward':last.value===previous.value?'stable':'away',staleDays:Math.floor((Date.parse(on)-Date.parse(last.date))/86400000),reached:ratio>=1};
}
function overview(db,days=7,on=K.dayKey()){
 const from=W().addDays(on,1-days),ledger=W().ledger(db,{from,to:on}),prior=W().ledger(db,{from:W().addDays(from,-days),to:W().addDays(from,-1)});
 let scheduled=0,recorded=0,plannedSets=0,actualSets=0;
 for(let d=from;d<=on;d=W().addDays(d,1))for(const b of W().planned(db,d)){scheduled++;if(list(db.sportSessions).some(s=>s.date===d&&s.periodId===b.periodId&&s.planBlockId===b.id))recorded++;}
 for(const s of list(db.sportSessions).filter(s=>s.date>=from&&s.date<=on)){plannedSets+=s.workout?.plannedSets||0;actualSets+=s.workout?.recordedSets||0;}
 const sleep=root.HealthCore?.sleepSummary(db,days,on)||{count:0,average:null},previousSleep=root.HealthCore?.sleepSummary(db,days,W().addDays(from,-1))||{count:0,average:null};
 const foods=Object.entries(db.foodLogs||{}).filter(([d,r])=>d>=from&&d<=on&&list(r).length);
 const calories=foods.filter(([,rows])=>rows.every(r=>finite(r.kcal)||finite(r.totals?.kcal))).map(([date,rows])=>({date,value:rows.reduce((sum,r)=>sum+(finite(r.kcal)?+r.kcal:finite(r.totals?.kcal)?+r.totals.kcal:0),0)}));
 return {days,from,on,ledger,prior,scheduled,recorded,plannedSets,actualSets,sleep,previousSleep,nutrition:{recordedDays:foods.length,completeCalorieDays:calories.length,averageKcal:mean(calories.map(r=>r.value)),targetKcal:db.settings?.personalTargets?.kcal??null},goals:list(db.athleteGoals).filter(g=>!g.archivedAt).map(g=>goalStatus(db,g,on)),health:health(db,on)};
}
function archivePeriod(db,id,on=K.dayKey()){
 const p=list(db.multisportPeriods).find(p=>p.id===id);if(!p)throw Error('Dönem bulunamadı.');
 if(db.activeWorkoutRun?.periodId===id)throw Error('Önce açık antrenmanı bitir veya taslağını kapat.');
 const scheduleEndDate=list(db.sportSessions).some(s=>s.periodId===id&&s.date===on)?on:W().addDays(on,-1);
 return {multisportPeriods:db.multisportPeriods.map(r=>r.id===id?{...r,archivedOn:on,scheduleEndDate,archivedAt:new Date().toISOString()}:r),settings:{...db.settings,pinnedPeriodId:db.settings?.pinnedPeriodId===id?null:db.settings?.pinnedPeriodId}};
}
function discardRun(db){const r=db.activeWorkoutRun;if(!r)throw Error('Açık antrenman yok.');return {activeWorkoutRun:null,workoutRunHistory:[...list(db.workoutRunHistory),{...r,closedAt:new Date().toISOString(),status:'draft-archived'}]};}
function startRun(db,block,on=K.dayKey(),now=Date.now()){
 if(db.activeWorkoutRun)throw Error('Önce açık antrenmanına devam et.');
 const valid=W().planned(db,on).find(b=>b.id===block.id&&b.periodId===block.periodId);
 if(!valid||valid.healthPaused)throw Error('Bu çalışma bugün başlayamaz. Takvimini veya güncel sağlık değerlendirmesini kontrol et.');
 if(!valid.steps?.length)throw Error('Canlı takip için önce planına hareket adımları ekle. Seans özetini ayrıca kaydedebilirsin.');
 if(list(db.sportSessions).some(s=>s.date===on&&s.planBlockId===block.id&&s.periodId===block.periodId))throw Error('Bugünkü çalışma zaten kayıtlı. Seanslarım bölümünden düzenleyebilirsin.');
 return {activeWorkoutRun:{id:uid(),date:on,periodId:block.periodId,planBlockId:block.id,sportId:block.sportId,block:copy(valid),steps:copy(valid.steps),actual:[],startedAt:new Date(now).toISOString(),activeSince:now,elapsedMs:0,status:'running',revision:1}};
}
function elapsed(run,now=Date.now()){return Math.max(0,run.elapsedMs+(run.status==='running'?Math.max(0,now-run.activeSince):0));}
function updateRun(db,input,expected,now=Date.now()){
 const r=db.activeWorkoutRun;if(!r||r.id!==expected.id||r.revision!==expected.revision)throw Error('Açık antrenman değişti. Güncel kaydı yeniden aç.');
 const actual=P.validateExecution(r.steps,input.actual??r.actual),status=input.status||r.status;if(!['running','paused'].includes(status))throw Error('Geçersiz antrenman durumu.');
 return {activeWorkoutRun:{...r,actual,formDraft:copy(actual),status,elapsedMs:elapsed(r,now),activeSince:now,conditions:String(input.conditions??r.conditions??'').slice(0,300),revision:r.revision+1}};
}
function finishRun(db,{durationMin,effort,conditions},expected,on=K.dayKey()){
 const r=db.activeWorkoutRun;if(!r||r.id!==expected.id||r.revision!==expected.revision)throw Error('Açık antrenman değişti.');
 const current=W().planned(db,r.date).find(b=>b.id===r.planBlockId&&b.periodId===r.periodId);if(!current||JSON.stringify(current.steps)!==JSON.stringify(r.steps))throw Error('Plan veya sağlık hedefleri antrenman başladıktan sonra değişti. Taslağın korunuyor; güncel planla seans kaydını gözden geçir.');
 if(!r.actual.some(a=>a.done))throw Error('En az bir tamamlanan seti veya turu kaydet.');
 const patch=K.applySession(db,{sportId:r.sportId,date:r.date,durationMin,effort,conditions,periodId:r.periodId,planBlockId:r.planBlockId,methodId:r.block.methodId,metrics:{},workout:{actual:r.actual},notes:'Canlı antrenman takibiyle kaydedildi.'},{today:on});
 const saved=patch.sportSessions.at(-1);return {...patch,activeWorkoutRun:null,workoutRunHistory:[...list(db.workoutRunHistory),{...r,finishedAt:new Date().toISOString(),sportSessionId:saved.id}]};
}
const api={sources,explanations,style,suggestion,draft,saveGoal,measurement,goalSeries,goalStatus,overview,archivePeriod,startRun,updateRun,finishRun,elapsed,discardRun};root.TrainingPlanner=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
