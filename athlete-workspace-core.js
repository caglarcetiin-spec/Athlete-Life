/* Shared, deterministic account-edition session and planning contract.
   Measurements remain separate from interpretation; never writes prescriptions. */
((root)=>{
'use strict';
const K=root.SportsProfileCore||(typeof require==='function'?require('./sports-profile-core.js'):null);
const C=root.SportCatalog||(typeof require==='function'?require('./sport-catalog.js'):null);
const clone=x=>JSON.parse(JSON.stringify(x));
const uid=()=>root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const num=(v,min=0,max=Infinity)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(+v)&&+v>=min&&+v<=max?+v:null;
function addDays(date,n){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function legacySessions(db){
 const result=[],dates=new Set([...Object.keys(db.trainingLogs||{}),...Object.keys(db.sessionFeedback||{})]);
 for(const date of dates){
  if(!K.parseDate(date))continue;
  const rows=(db.trainingLogs?.[date]||[]).filter(r=>!r.adHocSessionId&&r.source!=='ad_hoc'&&r.source!=='sport_program');
  const f=db.sessionFeedback?.[date];
  if(!rows.length&&!f)continue;
  result.push({id:'legacy:'+date,date,sportName:'Hareket antrenmanı',sportId:'strength',source:'movement',
   durationMin:num(f?.duration,0.1,1440),effort:num(f?.rpe,0,10),rowIds:rows.map(r=>r.id).filter(Boolean),guidedSessionId:f?.guidedSessionId||null});
 }
 for(const s of db.adHocSessions||[]){
  if(!s.id||!K.parseDate(s.date))continue;
  result.push({id:'adhoc:'+s.id,date:s.date,sportName:s.name||'Ek seans',sportId:null,source:'ad-hoc',durationMin:num(s.duration,0.1,1440),effort:num(s.rpe,0,10)});
 }
 return result;
}
function ledger(db,{from=null,to=K.dayKey()}={}){
 const legacy=legacySessions(db),byId=new Map(legacy.map(r=>[r.id,r])),issues=[],claims=new Set(),seen=new Set();
 const sports=[];
 for(const r of db.sportSessions||[]){
  if(!r.id||!K.parseDate(r.date)){issues.push({code:'invalid-session',message:'Tarihi veya kimliği olmayan seans analiz dışında.'});continue;}
  if(seen.has(r.id)){issues.push({code:'duplicate-id',message:'Aynı kimlikli branş seansı bir kez sayıldı.'});continue}seen.add(r.id);
  const linked=r.linkedSessionId?byId.get(r.linkedSessionId):null;
  if(r.linkedSessionId&&(!linked||linked.date!==r.date||claims.has(linked.id))){issues.push({code:'invalid-link',id:r.id,message:'Seans bağlantısı geçersiz veya birden fazla kayıtla eşleştirilmiş; kontrol gerekli.'});}
  const validLink=linked&&linked.date===r.date&&!claims.has(linked.id);
  if(validLink)claims.add(linked.id);
  const duration=num(r.durationMin,0.1,1440),effort=num(r.effort,0,10);
  sports.push({...clone(r),id:'sport:'+r.id,source:'sport',durationMin:duration??(validLink?linked.durationMin:null),effort:effort??(validLink?linked.effort:null),linkedSessionId:validLink?linked.id:null});
 }
 const rows=[...legacy.filter(r=>!claims.has(r.id)),...sports].filter(r=>(!from||r.date>=from)&&r.date<=to).sort((a,b)=>a.date.localeCompare(b.date));
 for(const r of rows){r.loadAU=r.family!=='mind'&&r.durationMin!==null&&r.effort!==null?r.durationMin*r.effort:null;}
 for(const s of sports.filter(r=>!r.linkedSessionId&&(!from||r.date>=from)&&r.date<=to))if(legacy.some(l=>l.date===s.date&&!claims.has(l.id)))issues.push({code:'possible-overlap',id:s.id,message:s.date+': branş ve hareket kaydı var. Aynı seanssa kaydı düzenleyip eşleştir.'});
 return {version:1,from,to,rows,issues,sessions:rows.length,minutes:rows.reduce((n,r)=>n+(r.durationMin??0),0),
  loadAU:rows.reduce((n,r)=>n+(r.loadAU??0),0),rated:rows.filter(r=>r.loadAU!==null).length,
  missingDuration:rows.filter(r=>r.durationMin===null).length,missingEffort:rows.filter(r=>r.effort===null).length};
}
function linkOptions(db,date,excludeId=null){
 const claimed=new Set((db.sportSessions||[]).filter(r=>r.id!==excludeId).map(r=>r.linkedSessionId));
 return legacySessions(db).filter(s=>s.date===date&&!claimed.has(s.id));
}
function validateLink(db,input,id){
 if(input.linkedSessionId&&!linkOptions(db,K.parseDate(input.date),id).some(r=>r.id===input.linkedSessionId))throw new Error('Seans bağlantısı değişti. Aynı tarihteki uygun bir seansı seç.');
 return input.linkedSessionId||null;
}
function periodFor(db,date){return (db.multisportPeriods||[]).find(p=>p.startDate<=date&&p.endDate>=date)||null;}
function planned(db,date){
 const p=periodFor(db,date);if(!p)return [];
 const day=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;
 const week=Math.floor((Date.parse(date)-Date.parse(p.startDate))/604800000)+1;
 return p.blocks.filter(b=>b.day===day).map(b=>({...clone(b),periodId:p.id,periodName:p.name,date,week}));
}
function validatePeriod(db,input,today=K.dayKey()){
 if(!String(input.name||'').trim()||String(input.name).length>100)throw new Error('Dönem adı 1–100 karakter olmalı.');
 const startDate=K.parseDate(input.startDate),weeks=+input.weeks;
 if(!startDate||startDate<today)throw new Error('Dönem başlangıcı bugün veya gelecekte olmalı.');
 if(!Number.isInteger(weeks)||weeks<1||weeks>52)throw new Error('1–52 hafta seç.');
 const endDate=addDays(startDate,weeks*7-1);
 if((db.multisportPeriods||[]).some(p=>p.startDate<=endDate&&p.endDate>=startDate))throw new Error('Bu tarih aralığında bir dönem zaten var. Sonraki dönemi onun bitişinden sonra başlat.');
 if(!Array.isArray(input.blocks)||!input.blocks.length||input.blocks.length>70)throw new Error('Haftaya 1–70 çalışma ekle.');
 const ids=new Set();
 const blocks=input.blocks.map(b=>{
  const sport=C.find(b.sportId,db.customSports||[]);
  if(!sport||!Number.isInteger(+b.day)||+b.day<0||+b.day>6)throw new Error('Geçerli branş ve gün seç.');
  const durationMin=num(b.durationMin,1,480);if(durationMin===null)throw new Error('Çalışma süresi 1–480 dakika olmalı.');
  if(b.methodId&&!C.methods.some(m=>m.id===b.methodId))throw new Error('Çalışma yöntemi bulunamadı.');
  const targetRir=num(b.targetRir,0,10),restSec=num(b.restSec,0,1800);
  for(const key of ['targetRir','restSec'])if(b[key]!=null&&b[key]!==''&&(key==='targetRir'?targetRir:restSec)===null)throw new Error('RIR veya dinlenme değeri geçersiz.');
  const text=key=>{const v=String(b[key]||'').trim();if(v.length>2000)throw new Error('Çalışma açıklaması çok uzun.');return v};
  const id=b.id||uid();if(ids.has(id))throw new Error('Çalışma kimliği tekrar ediyor.');ids.add(id);
  const steps=root.WorkoutProgram?.validateSteps(b.steps||[])||[];
  return {id,day:+b.day,sportId:sport.id,sportName:sport.name,durationMin,methodId:b.methodId||null,targetRir,restSec,prescription:text('prescription'),progression:text('progression'),steps};
 });
 const goal=String(input.goal||'').trim();if(goal.length>1000)throw new Error('Hedef en fazla 1000 karakter olabilir.');
 return {name:input.name.trim(),goal,startDate,endDate,weeks,blocks};
}
function reviewPeriod(db,input,today=K.dayKey()){
 const p=validatePeriod(db,input,today),notes=[],budgets=db.athleteProfile?.availability;
 const minutes=Array.from({length:7},(_,i)=>p.blocks.filter(b=>b.day===i).reduce((n,b)=>n+b.durationMin,0));
 if(budgets)minutes.forEach((n,i)=>{if(n>budgets[i])notes.push(`${K.days[i]}: ${n} dk plan, profilinde ${budgets[i]} dk var.`)});
 if(minutes.every(n=>n>0))notes.push('Her gün çalışma var. Dinlenme düzenini ve yoğun günlerin dağılımını gözden geçir.');
 if(p.blocks.some(b=>!b.prescription))notes.push('Bazı çalışmaların hareket/mesafe/teknik hedefi boş. Uygulamadan önce ayrıntı ekle.');
 for(const b of p.blocks){const timed=b.steps.reduce((n,s)=>n+(s.seconds||0)*s.sets+(s.restSec||0)*Math.max(0,s.sets-1),0);if(timed>b.durationMin*60)notes.push(b.sportName+': adımların çalışma ve dinlenme süresi ayırdığın seans süresini aşıyor.');}
 if(p.blocks.some(b=>!b.progression))notes.push('Bazı çalışmalarda ilerleme ve hafifletme kuralı yok. Yük, tekrar veya süreyi ne zaman değiştireceğini belirt.');
 const selected=(db.athleteProfile?.sports||[]).map(s=>s.sportId);
 if(selected.some(id=>!p.blocks.some(b=>b.sportId===id)))notes.push('Profilindeki bazı branşlar bu dönemde yer almıyor; bu bilinçli bir öncelik olabilir.');
 const science=root.SportScience?.reviewBlocks(p.blocks,db.athleteProfile)||[];
 return {period:p,minutes,notes,science,notice:'Takvim, çalışma ayrıntısı ve kaynaklı antrenman ilkeleri birlikte incelenir. Program yalnız sen onayladığında etkinleşir.'};
}
function activate(db,input,today=K.dayKey(),expected=JSON.stringify(db.multisportPeriods||[])){
 if(JSON.stringify(db.multisportPeriods||[])!==expected)throw new Error('Dönemler değişti. Güncel planı yeniden incele.');
 const p=validatePeriod(db,input,today);
 return {multisportPeriods:[...(db.multisportPeriods||[]),{...p,id:uid(),createdAt:new Date().toISOString(),activation:'manual',modelVersion:1}]};
}
function validatePlanLink(db,input){
 if(!input.planBlockId&&!input.periodId)return {periodId:null,planBlockId:null};
 const block=planned(db,K.parseDate(input.date)).find(b=>b.periodId===input.periodId&&b.id===input.planBlockId&&b.sportId===input.sportId);
 if(!block)throw new Error('Plan bağlantısı bu tarih ve branşla eşleşmiyor. Güncel çalışmayı seç.');
 return {periodId:block.periodId,planBlockId:block.id};
}
function outcomes(db,period,today=K.dayKey()){
 let scheduled=0,recorded=0,minutes=0;const dates=[];
 for(let d=period.startDate;d<=period.endDate&&d<=today;d=addDays(d,1)){
  const blocks=planned(db,d).filter(b=>b.periodId===period.id);
  for(const b of blocks){scheduled++;const rows=(db.sportSessions||[]).filter(s=>s.periodId===period.id&&s.planBlockId===b.id&&s.date===d);if(rows.length){recorded++;minutes+=rows.reduce((n,r)=>n+(num(r.durationMin)||0),0)}dates.push({date:d,blockId:b.id,recorded:rows.length>0});}
 }
 return {scheduled,recorded,unconfirmed:scheduled-recorded,minutes,dates};
}
// Compare only explicitly matching branch, discipline, conditions and distance.
// This is a descriptive change, never a fitness or injury inference.
function progress(db,to=K.dayKey()){
 const groups=new Map();
 for(const row of db.sportSessions||[]){
  if(!K.parseDate(row.date)||row.date>to||!row.discipline||!row.conditions)continue;
  for(const detail of K.sessionDetails(row)){
   const m=row.metrics||{},distance=m.distanceM??m.distanceKm??null;
   const key=JSON.stringify([row.sportId,C.normalize(row.discipline),C.normalize(row.conditions),detail.label,distance]);
   const list=groups.get(key)||[];list.push({date:row.date,id:row.id,value:detail.value,unit:detail.unit,label:detail.label,sportName:row.sportName,discipline:row.discipline,conditions:row.conditions});groups.set(key,list);
  }
 }
 return [...groups.values()].filter(g=>g.length>=2).map(g=>{g.sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)));const first=g[0],last=g.at(-1);return {...last,firstDate:first.date,firstValue:first.value,change:last.value-first.value,count:g.length}});
}
function snapshot(db,date=K.dayKey()){
 const recent=ledger(db,{from:addDays(date,-6),to:date}),previous=ledger(db,{from:addDays(date,-13),to:addDays(date,-7)}),today=ledger(db,{from:date,to:date});
 const context=K.context(db,date),period=periodFor(db,date),plan=planned(db,date),findings=[];
 const finding=(id,title,detail,source,action)=>findings.push({id,title,detail,source,action,kind:'rule-based-review'});
 if(!db.athleteProfile)finding('profile','Profilini tamamla','Branş, hedef ve ayırabildiğin süre bilinmiyor.','athleteProfile','profile');
 if(!db.daily?.[date])finding('daily','Bugünkü durumunu ekle','Uyku ve sağlık kaydı yok; antrenmana hazır olduğun varsayılmıyor.','daily:'+date,'daily');
 if(recent.missingDuration||recent.missingEffort)finding('missing','Yük özetinde eksik veri var',`${recent.sessions} seansın ${recent.rated} tanesinde süre ve zorluk birlikte var. Eksikler sıfır yük anlamına gelmez.`,'session-ledger','record');
 if(recent.issues.length)finding('links','Seans bağlantılarını kontrol et',recent.issues.map(i=>i.message).join(' '),'session-ledger','record');
 const health=root.HealthStateEngine?.assess?.(db.daily?.[date]||{});
 if(health&&health.action!=='normal')finding('health','Sağlık kaydını dikkate al',health.reason,'health:'+date,'daily');
 const used=plan.reduce((n,b)=>n+b.durationMin,0);
 if(context.availableMinutes!==null&&used>context.availableMinutes)finding('time','Plan zamanına sığmıyor',`${used} dakika çalışma, ${context.availableMinutes} dakika ayrılan zaman. Süreyi veya günü düzenleyebilirsin.`,'profile+period','plan');
 if(!period)finding('period','Kendi dönemini oluştur','Branşlarını ve çalışma tariflerini seç. İncelemeden ve ana plana almadan programın değişmez.','multisportPeriods','plan');
 if(period&&date>=addDays(period.endDate,-7))finding('review','Dönem sonu değerlendirmesi',`${period.name} ${period.endDate} tarihinde bitiyor. Sonuçlarını inceleyip sonraki dönemi kendin oluşturabilirsin.`,'period:'+period.id,'plan');
 if(recent.rated===recent.sessions&&previous.rated===previous.sessions&&recent.sessions&&previous.sessions)finding('load','İki haftanın kayıtlı yükü',`Son 7 gün ${Math.round(recent.loadAU)} AU; önceki 7 gün ${Math.round(previous.loadAU)} AU. Bu fark tek başına gelişim veya sakatlık riski göstermez.`,'duration×RPE','analysis');
 return {version:2,generatedAt:new Date().toISOString(),date,today,recent,previous,context,period,plan,findings,progress:progress(db,date),science:root.SportScience?.analyze(db,date)||null,
  coverage:{sessionLoad:'self-reported-duration-times-RPE',muscleRecovery:'movement-model-only',sportPrescription:'manual',quality:'completeness-not-confidence'},
  notice:'AU, süre × hissedilen zorluk hesabıdır. Kas hasarı, iyileşme yüzdesi, kalori veya sakatlık olasılığı ölçümü değildir.'};
}
const api={addDays,legacySessions,ledger,linkOptions,validateLink,periodFor,planned,validatePeriod,reviewPeriod,activate,validatePlanLink,outcomes,progress,snapshot};
root.AthleteWorkspaceCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
