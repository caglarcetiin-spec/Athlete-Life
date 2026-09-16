/* Structured manual prescriptions and actuals. Inputs are never inferred from targets. */
((root)=>{
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const uid=()=>root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const TYPES={resistance:'Hareket / set',interval:'Interval / tur',skill:'Teknik deneme',segment:'Etap / kesintisiz çalışma'};
function number(v,label,min,max,integer=false){
 if(v===''||v==null)return null;const n=typeof v==='string'?Number(v.replace(',','.')):v;
 if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error(label+': geçerli aralık '+min+'–'+max+'.');return n;
}
function validateSteps(input=[]){
 if(!Array.isArray(input)||input.length>60)throw new Error('En fazla 60 çalışma adımı ekleyebilirsin.');
 const ids=new Set();
 return input.map(s=>{
  const id=String(s.id||uid()),name=String(s.name||'').trim();
  if(!Object.hasOwn(TYPES,s.type)||name.length<2||name.length>120||ids.has(id))throw new Error('Çalışma türü, adı veya kimliği geçersiz.');ids.add(id);
  const sets=number(s.sets,'Set / tur',1,30,true);if(sets===null)throw new Error('Set / tur sayısını gir.');
  const reps=number(s.reps,'Tekrar',1,1000,true),seconds=number(s.seconds,'Çalışma süresi',.1,86400),distanceM=number(s.distanceM,'Mesafe',.1,1000000),loadKg=number(s.loadKg,'Dış yük',0,1500),rir=number(s.rir,'RIR',0,10),restSec=number(s.restSec,'Dinlenme',0,3600);
  if(s.type==='resistance'&&reps===null&&seconds===null)throw new Error('Hareket için tekrar veya tutuş süresi gir.');
  if(s.type!=='resistance'&&reps===null&&seconds===null&&distanceM===null)throw new Error('Adım için tekrar, süre veya mesafe gir.');
  if(s.type!=='resistance'&&(loadKg!==null||rir!==null))throw new Error('Dış yük ve RIR direnç adımına aittir.');
  const progressionMetric=['loadKg','reps','seconds','distanceM'].includes(s.progressionMetric)?s.progressionMetric:null;
  const increment=number(s.increment,'Artış adımı',.01,1000);
  if((increment!==null)!==!!progressionMetric)throw new Error('Artış türünü ve adımını birlikte belirt.');
  if(progressionMetric&&({loadKg,reps,seconds,distanceM})[progressionMetric]===null)throw new Error('Artırılacak hedefin başlangıç değerini gir.');
  if(progressionMetric==='reps'&&increment%1)throw new Error('Tekrar artışı tam sayı olmalı.');
  return {id,name,type:s.type,sets,reps,seconds,distanceM,loadKg,rir,restSec,progressionMetric,increment};
 });
}
function validateExecution(steps,input=[]){
 if(!Array.isArray(input)||input.length>1800)throw new Error('Çalışma kayıt biçimi geçersiz.');
 const seen=new Set();return input.map(x=>{
  const step=steps.find(s=>s.id===x.stepId),index=number(x.index,'Set sırası',0,29,true),key=x.stepId+':'+index;
  if(!step||index===null||index>=step.sets||seen.has(key))throw new Error('Çalışma kaydı planla eşleşmiyor.');seen.add(key);
  const done=x.done===true;
  const reps=number(x.reps,'Gerçek tekrar',0,1000,true),seconds=number(x.seconds,'Gerçek süre',0,86400),distanceM=number(x.distanceM,'Gerçek mesafe',0,1000000),loadKg=number(x.loadKg,'Gerçek dış yük',0,1500),rir=number(x.rir,'Gerçek RIR',0,10),restSec=number(x.restSec,'Gerçek dinlenme',0,3600);
  if(done&&step.reps!==null&&(!reps||reps<1))throw new Error('İşaretlediğin setin gerçek tekrarını gir.');
  if(done&&step.seconds!==null&&(!seconds||seconds<=0))throw new Error('İşaretlediğin turun gerçek süresini gir.');
  if(done&&step.distanceM!==null&&(!distanceM||distanceM<=0))throw new Error('İşaretlediğin turun gerçek mesafesini gir.');
  if(done&&step.type==='resistance'&&loadKg===null)throw new Error('Dış yükü gir; yalnız vücut ağırlığıyla yaptıysan 0 yaz.');
  return {stepId:step.id,index,done,reps,seconds,distanceM,loadKg,rir,restSec};
 });
}
function execution(db,input,previous){
 const block=(db.multisportPeriods||[]).find(p=>p.id===input.periodId)?.blocks.find(b=>b.id===input.planBlockId);
 const same=previous?.periodId===input.periodId&&previous?.planBlockId===input.planBlockId;
 const effective=block&&root.PersonalHealth?root.PersonalHealth.adjustBlock(db,block,root.PersonalHealth.date(input.date)):block;
 const steps=validateSteps(same&&previous?.workout?.steps?previous.workout.steps:effective?.steps||[]);
 if(!steps.length){if(input.workout?.actual?.some(x=>x.done))throw new Error('Bu çalışma planla eşleşmiyor.');return null;}
 const actual=validateExecution(steps,input.workout?.actual||(same?previous?.workout?.actual:[])||[]);
 return {version:1,steps:copy(steps),actual,plannedSets:steps.reduce((n,s)=>n+s.sets,0),recordedSets:actual.filter(x=>x.done).length};
}
function project(db,row){
 // One editable owner: the sport session. Legacy engines read a tagged projection.
 const trainingLogs={};
 for(const [date,rows] of Object.entries(db.trainingLogs||{})){const kept=rows.filter(r=>!(r.source==='sport_program'&&r.sportSessionId===row.id));if(kept.length)trainingLogs[date]=kept;}
 const generated=[];
 for(const a of row.workout?.actual||[]){
  const s=row.workout.steps.find(s=>s.id===a.stepId);if(!a.done||s?.type!=='resistance')continue;
  generated.push({id:'sport-program:'+row.id+':'+s.id+':'+a.index,name:s.name,type:s.reps!==null?'DYNAMIC':'STATIC',metricUnit:s.reps!==null?'reps':'seconds',
   sets:[s.reps!==null?a.reps:a.seconds],load:a.loadKg,rir:a.rir,restBetweenSets:[],priorRestSec:a.restSec,setDurationsSec:a.seconds===null?[]:[a.seconds],
   plannedRestSec:s.restSec,source:'sport_program',sportSessionId:row.id,sportStepId:s.id,periodId:row.periodId,planContribution:false,
   scheduledFor:row.date,athleteDay:row.date,calendarDate:row.date,performedAt:row.date+'T12:00:00',timestampPrecision:'date',
   provenance:'self-reported-structured-set',projectionVersion:1});
 }
 if(generated.length)trainingLogs[row.date]=[...(trainingLogs[row.date]||[]),...generated];
 return trainingLogs;
}
function summary(row){
 const w=row.workout;if(!w)return null;let reps=0,externalVolume=0,seconds=0,distanceM=0;
 for(const a of w.actual.filter(a=>a.done)){const s=w.steps.find(s=>s.id===a.stepId);reps+=a.reps||0;seconds+=a.seconds||0;distanceM+=a.distanceM||0;if(s?.type==='resistance')externalVolume+=(a.reps||0)*(a.loadKg||0);}
 return {planned:w.plannedSets,recorded:w.recordedSets,reps,externalVolume,seconds,distanceM,notice:'Dış yük hacmi yalnız tekrar × girilen ek ağırlıktır; vücut ağırlığı ve toplam kas kuvveti dahil değildir.'};
}
function progression(db,blockId,periodId){
 const rows=(db.sportSessions||[]).filter(r=>r.planBlockId===blockId&&(!periodId||r.periodId===periodId)&&r.workout).sort((a,b)=>a.date.localeCompare(b.date)||String(a.createdAt).localeCompare(String(b.createdAt)));
 if(rows.length<2)return [];
 const last=rows.at(-1),before=rows.at(-2);if(last.date===before.date)return [];
 return last.workout.steps.filter(s=>s.progressionMetric).map(step=>{
  const match=before.workout.steps.find(s=>s.id===step.id);
  const same=match&&JSON.stringify(match)===JSON.stringify(step)&&last.discipline===before.discipline&&last.conditions&&last.conditions===before.conditions;
  const achieved=row=>{const actual=row.workout.actual.filter(a=>a.stepId===step.id&&a.done);return actual.length===step.sets&&actual.every(a=>['reps','seconds','distanceM','loadKg'].every(k=>step[k]===null||(a[k]!==null&&a[k]>=step[k]))&&(step.rir===null||(a.rir!==null&&a.rir>=step.rir)));};
  return {stepId:step.id,name:step.name,ready:!!same&&achieved(last)&&achieved(before),metric:step.progressionMetric,current:step[step.progressionMetric],suggested:step[step.progressionMetric]+step.increment,
   reason:'Kullanıcının kuralı: aynı hedef ve koşullardaki iki ayrı günde bütün setlerin hedefini ve varsa RIR değerini karşılaştır. Artış kendiliğinden uygulanmaz.'};
 });
}
const api={version:1,types:TYPES,validateSteps,validateExecution,execution,project,summary,progression};root.WorkoutProgram=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
