((root)=>{
'use strict';
const C=root.SportCatalog||(typeof require==='function'?require('./sport-catalog.js'):null);
const S=root.SportScience||(typeof require==='function'?require('./sport-science-engine.js'):null);
const P=root.WorkoutProgram||(typeof require==='function'?require('./workout-program-core.js'):null);
const copy=x=>JSON.parse(JSON.stringify(x));
const days=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
const uid=()=>root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
function dayKey(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
function parseDate(value){
 if(root.EntryFields)return root.EntryFields.date(value);
 let key=String(value||'').trim();if(/^\d{2}\.\d{2}\.\d{4}$/.test(key))key=key.split('.').reverse().join('-');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(key))return null;
 const d=new Date(key+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===key?key:null;
}
function customSport(name,family,schema,existing=[]){
 name=String(name||'').trim();
 if(name.length<2||name.length>70)throw new Error('Branş adı 2–70 karakter olmalı.');
 if(!Object.hasOwn(C.families,family)||!Object.hasOwn(C.schemas,schema))throw new Error('Bir spor ailesi ve kayıt biçimi seç.');
 if(C.all(existing).some(s=>C.normalize(s.name)===C.normalize(name)))throw new Error('Bu ad kütüphanede var. Arama alanından seçebilirsin.');
 return {id:'custom:'+uid(),name,family,schema,aliases:'',support:'record-summary',custom:true};
}
function validateProfile(profile,custom=[]){
 const errors=[];
 if(!profile||!Array.isArray(profile.sports)||!profile.sports.length)errors.push('En az bir branş seç.');
 const ids=new Set();
 for(const s of Array.isArray(profile?.sports)?profile.sports:[]){
  if(!C.find(s?.sportId,custom))errors.push('Seçilen branş kütüphanede bulunamadı.');
  if(ids.has(s?.sportId))errors.push('Aynı branş iki kez seçilemez.');ids.add(s?.sportId);
  if(!Object.hasOwn(C.experience,s?.experience))errors.push('Her branş için deneyimini belirt.');
 }
 for(const [field,catalog,label] of [['goals',C.goals,'hedef'],['equipment',C.equipment,'ekipman']]){
  if(!Array.isArray(profile?.[field])||profile[field].some(id=>!Object.hasOwn(catalog,id)))errors.push(`Geçerli ${label} seç.`);
 }
 if(!profile?.goals?.length)errors.push('En az bir hedef seç.');
 if(!Array.isArray(profile?.methods)||profile.methods.some(id=>!C.methods.some(m=>m.id===id)))errors.push('Geçerli çalışma yöntemi seç.');
 if(!Array.isArray(profile?.availability)||profile.availability.length!==7||profile.availability.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>480||v%5))errors.push('Her gün için 0–480 dakika gir; 5 dakikalık adımlar kullan.');
 if(Array.isArray(profile?.availability)&&profile.availability.every(v=>v===0))errors.push('En az bir güne antrenman için zaman ayır.');
 return [...new Set(errors)];
}
function applyProfile(db,input,custom=[],now=new Date().toISOString()){
 const definitions=[...(db.customSports||[])];
 for(const sport of custom){if(!definitions.some(s=>s.id===sport.id))definitions.push(copy(sport));}
 const errors=validateProfile(input,definitions);if(errors.length)throw new Error(errors.join('\n'));
 const previous=db.athleteProfile;
 const profile={...previous,version:1,sports:copy(input.sports),goals:[...new Set(input.goals)],
  equipment:[...new Set(input.equipment)],methods:[...new Set(input.methods)],availability:[...input.availability],
  createdAt:previous?.createdAt||now,completedAt:previous?.completedAt||now,updatedAt:now};
 return {athleteProfile:profile,customSports:definitions,
  athleteProfileHistory:[...(db.athleteProfileHistory||[]),...(previous?[{profile:copy(previous),replacedAt:now}]:[])]};
}
function numeric(value,label,min,max,integer=false){
 if(value===''||value===null||value===undefined)return null;
 const n=typeof value==='string'?Number(value.trim().replace(',','.')):value;
 if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error(`${label}: ${min}–${max} aralığında ${integer?'tam ':''}sayı gir.`);
 return n;
}
function validateSession(input,custom=[],today=dayKey()){
 const sport=C.find(input.sportId,custom);if(!sport)throw new Error('Bir branş seç.');
 const date=parseDate(input.date);if(!date||date>today)throw new Error('Geçerli, bugün veya geçmişe ait bir tarih gir (GG.AA.YYYY).');
 const durationMin=numeric(input.durationMin,'Seans süresi',0.1,1440);if(durationMin===null)throw new Error('Seans süresini gir.');
 const effort=numeric(input.effort,'Hissedilen zorluk',0,10);
 if(input.methodId&&!C.methods.some(m=>m.id===input.methodId))throw new Error('Çalışma yöntemi bulunamadı.');
 const metrics={};
 const model=S?.definition(sport),fields=model?[...model.fields,...model.optionalTests]:C.schemas[sport.schema].fields;
 for(const [key,label,,min,max,integer] of fields){const value=numeric(input.metrics?.[key],label,min,max,integer);if(value!==null)metrics[key]=value;}
 S?.validateMetrics(sport,metrics,durationMin,input);
 if(metrics.movingMinutes>durationMin)throw new Error('Aktif hareket süresi toplam seans süresinden uzun olamaz.');
 for(const key of ['completed','hits'])if(metrics[key]!=null&&(metrics.attempts==null||metrics[key]>metrics.attempts))throw new Error('Tamamlama / isabet sayısı deneme sayısını aşamaz; deneme sayısını da gir.');
 const notes=String(input.notes||'').trim();if(notes.length>2000)throw new Error('Not en fazla 2000 karakter olabilir.');
 return {sportId:sport.id,sportName:sport.name,family:sport.family,schema:sport.schema,date,durationMin,effort,
  methodId:input.methodId||null,discipline:String(input.discipline||'').trim().slice(0,100),conditions:String(input.conditions||'').trim().slice(0,300),metrics,notes,provenance:'self-reported',measurementModel:model?{id:model.modelId,version:S.version}:null};
}
function applySession(db,input,{id=null,expected=null,today=dayKey(),now=new Date().toISOString()}={}){
 const rows=db.sportSessions||[],previous=id?rows.find(r=>r.id===id):null;
 if(id&&(!previous||JSON.stringify(previous)!==expected))throw new Error('Bu kayıt değişti. Güncel kaydı yeniden aç.');
 const validated=validateSession(input,db.customSports||[],today);
 const W=root.AthleteWorkspaceCore;
 const links=W?{linkedSessionId:W.validateLink(db,input,id),...W.validatePlanLink(db,input)}:{};
 const workout=P?.execution(db,input,previous)||null;
 const row={...previous,...validated,...links,workout,id:previous?.id||uid(),createdAt:previous?.createdAt||now,updatedAt:now};
 return {sportSessions:previous?rows.map(r=>r.id===id?row:r):[...rows,row],
  ...(P&&(workout||previous?.workout)?{trainingLogs:P.project(db,row)}:{}),
  sportSessionHistory:[...(db.sportSessionHistory||[]),...(previous?[{record:copy(previous),replacedAt:now}]:[])]};
}
function summary(db,{sportId=null,from=null,to=dayKey()}={}){
 const rows=(db.sportSessions||[]).filter(r=>(!sportId||r.sportId===sportId)&&(!from||r.date>=from)&&r.date<=to);
 const bySport={};
 for(const r of rows){
  const s=bySport[r.sportId]||={sportId:r.sportId,name:r.sportName,sessions:0,minutes:0,distanceM:0,distanceEntries:0};
  s.sessions++;s.minutes+=r.durationMin;
  const distance=r.metrics?.distanceM??(r.metrics?.distanceKm!=null?r.metrics.distanceKm*1000:null);
  if(distance!=null){s.distanceM+=distance;s.distanceEntries++;}
 }
 return {sessions:rows.length,minutes:rows.reduce((sum,r)=>sum+r.durationMin,0),bySport:Object.values(bySport),
  missingEffort:rows.filter(r=>r.effort===null||r.effort===undefined).length};
}
function sessionDetails(row){
 if(S)return S.measurements(row);
 const result=[],m=row.metrics||{};
 if(m.movingMinutes&&m.distanceM)result.push({label:'Aktif tempo',value:m.movingMinutes/(m.distanceM/100),unit:'dk / 100 m'});
 if(m.movingMinutes&&m.distanceKm)result.push({label:'Aktif tempo',value:m.movingMinutes/m.distanceKm,unit:'dk / km'});
 if(m.attempts&&m.hits!=null)result.push({label:'İsabet oranı',value:m.hits/m.attempts*100,unit:'%'});
 if(m.attempts&&m.completed!=null)result.push({label:'Tamamlama oranı',value:m.completed/m.attempts*100,unit:'%'});
 return result;
}
function context(db,date=dayKey()){
 if(!parseDate(date))throw new Error('Geçersiz tarih');
 const profile=db.athleteProfile||null,day=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;
 const notes=[];
 const period=(db.trainingPeriods||[]).filter(p=>p.startDate<=date&&(!p.endDate||p.endDate>=date)).sort((a,b)=>b.startDate.localeCompare(a.startDate))[0];
 if(profile&&period)days.forEach((label,i)=>{if(period.weekly?.[i]?.length&&profile.availability[i]===0)notes.push(`${label}: programda hareket var, profilinde süre ayrılmamış.`);});
 if(profile&&!period)notes.push('Aktif bir kişisel dönem yok. Programım bölümünden taslağını oluşturup ana plana alabilirsin.');
 if(profile&&!profile.equipment.length)notes.push('Ekipman belirtilmedi; program seçerken erişebildiğin ekipmanı kontrol et.');
 return {date,profile,availableMinutes:profile?profile.availability[day]:null,goals:(db.athleteGoals||[]).filter(g=>!g.archivedAt),
  selectedSports:(profile?.sports||[]).map(s=>({...s,definition:C.find(s.sportId,db.customSports||[])})),
  recorded:summary(db,{from:date,to:date}),notes,
  coverage:{sessionSummary:true,measurementModels:!!S,automaticPrescription:false,physiologyIntegration:false}};
}
const api={days,dayKey,parseDate,customSport,validateProfile,applyProfile,validateSession,applySession,summary,sessionDetails,context};
root.SportsProfileCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
