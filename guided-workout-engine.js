
(function(){
"use strict";

const C=window.GuidedWorkoutCore;
const ACTIVE_KEY="activeGuidedWorkout";
const VERSION="9.2";
let tickHandle=null,audioCtx=null;

function nowIso(){return new Date().toISOString()}
function secBetween(a,b=new Date()){if(!a)return 0;return Math.max(0,(+b-new Date(a))/1000)}
function phaseElapsed(s,at){return secBetween(at,s?.paused&&s.pauseStartedAt?new Date(s.pauseStartedAt):new Date())}
function fmtClock(sec,tenths=false){
 sec=Math.max(0,+sec||0);
 const m=Math.floor(sec/60),s=Math.floor(sec%60);
 return tenths?`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${Math.floor((sec%1)*10)}`:`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function active(){return db[ACTIVE_KEY]||null}
const PARTIAL_REASON_LABELS={fatigue:"Yorgunluk / readiness düşük",performance_drop:"Performans düştü",form_quality:"Teknik / form kalitesi bozuldu",pain:"Ağrı / eklem sinyali",time:"Zaman kısıtı",other:"Diğer"};
function exerciseResolution(s,i){return s?.exerciseClosures?.[i]||null}
function commit(s){s.lastUpdatedAt=nowIso();db[ACTIVE_KEY]=s;save()}
function clearActive(){db[ACTIVE_KEY]=null;save()}
function targetKey(){return window.selectedSessionTargetKey?.()||todayKey()}
function actualDay(){return window.sessionActualKey?.()||athleteDayKey(new Date())}
function selectedTrainingDay(){return window.trainingViewDate?.()||todayKey()}
function sessionHasExecution(s){return !!(s&&((s.events||[]).some(e=>["set_started","set_saved","exercise_partial_close","exercise_skipped"].includes(e?.type))||["work","result","rest","exercise_done"].includes(s.phase)))}
function beep(freq=660,duration=.1){
 if(db.settings.guidedSound===false)return;
 try{
   audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
   const o=audioCtx.createOscillator(),g=audioCtx.createGain();
   o.frequency.value=freq;g.gain.value=.045;o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);
 }catch(e){}
 try{navigator.vibrate?.(70)}catch(e){}
}
function metricFallback(k){return k?.metric||"reps"}
function workWindow(k,p){
 const metric=p.unit||metricFallback(k),q=k?.qualities||{};
 if(metric==="seconds"){
   const fallback=k?.staticHoldBandSec||[5,15],lo=p.min||fallback[0],hi=p.max||fallback[1];
   return {min:Math.max(1,lo*.8),targetMin:lo,targetMax:hi,max:Math.max(hi*1.55,hi+4),basis:"hold kalite penceresi"};
 }
 if(metric==="minutes"){
   const lo=(p.min||5)*60,hi=(p.max||p.min||10)*60;
   return {min:lo*.8,targetMin:lo,targetMax:hi,max:hi*1.2,basis:"planlanan süre"};
 }
 if(metric==="km")return {min:0,targetMin:0,targetMax:0,max:0,basis:"mesafe"};
 const lo=p.min||5,hi=p.max||lo;
 if((q.power||0)>=8||String(k?.contraction||"").toLowerCase().includes("explosive"))
   return {min:Math.max(2,lo*1.2),targetMin:Math.max(3,lo*1.5),targetMax:Math.max(10,hi*4.5),max:Math.max(20,hi*7),basis:"power/skill kalite penceresi"};
 if((q.strength||0)>=8&&hi<=8)
   return {min:Math.max(5,lo*1.8),targetMin:Math.max(8,lo*2.2),targetMax:Math.max(25,hi*6),max:Math.max(45,hi*9),basis:"ağır kuvvet kalite penceresi"};
 if((q.hypertrophy||0)>=8)
   return {min:Math.max(10,lo*1.5),targetMin:Math.max(15,lo*2),targetMax:Math.max(45,hi*4.5),max:Math.max(75,hi*6),basis:"hipertrofi kalite penceresi"};
 return {min:5,targetMin:10,targetMax:60,max:90,basis:"genel kalite penceresi"};
}
function workStatus(sec,w){
 if(!w||!w.max)return {key:"neutral",text:"Süre yalnızca kayıt amacıyla izleniyor.",score:90};
 if(sec<w.min)return {key:"warn",text:"Set çok kısa görünüyor; timer başlangıcını ve tam ROM'u kontrol et.",score:72};
 if(sec<w.targetMin)return {key:"good",text:"Hedef çalışma bandının kısa tarafı.",score:92};
 if(sec<=w.targetMax)return {key:"good",text:"Aktif set süresi hedef kalite penceresinde.",score:100};
 if(sec<=w.max)return {key:"warn",text:"Set hedef bandı aştı; tempo yavaşlaması veya kısa intra-set duraklama olabilir.",score:78};
 return {key:"bad",text:"Set belirgin uzun sürdü. Rest-pause/cluster yaptıysan not et; aksi halde timer geç durdurulmuş olabilir.",score:55};
}
function planItems(target){
 const rt=window.CanonicalSessionEngine?.template?.(target);
 if(!rt)throw new Error("Ortak antrenman reçetesi bulunamadı; Runner başlatılmadı.");
 const items=(rt.items||[]).map((it,i)=>{
   const k=window.movementKnowledge?.(it.name)||window.EXERCISE_KNOWLEDGE?.[it.name]||{};
   const p=C.parsePrescription(it.prescription,metricFallback(k));
   const setCount=C.sanitizeSetCount(p.setCount);
   const rest=restIntervalPrescription(it.name);
   const loadRec=it.loadRecommendation||{applicable:false};
   const m=String(it.note||"").match(/\+\s*([\d.]+)\s*kg/i);
   return {
     index:i,name:it.name,prescription:String(it.prescription||"—"),note:it.note||"",progression:it.progression||"",risk:it.risk||"",targetRir:it.targetRir??null,
     setCount,resultMin:p.min,resultMax:p.max,metric:p.unit||metricFallback(k),parseValid:p.valid,
     integrityIssue:!p.valid?`Reçete çözümlenemedi: ${String(it.prescription||"")}`:null,
     workWindow:workWindow(k,p),restTargetSec:it.restTargetSec??rest.target,restMinSec:it.restMinSec??rest.min,restMaxSec:it.restMaxSec??rest.max,
     load:loadRec?.value??(m?+m[1]:0),loadRecommendation:loadRec,knowledge:k
   };
 });
 return {template:rt,items};
}

function itemEquipment(it){
 const k=it?.knowledge||{};
 return k.variantEquipment||((k.equipment||[]).length===1?k.equipment[0]:null);
}
function rowEquipment(row){
 const k=window.movementKnowledge?.(row?.name)||window.EXERCISE_KNOWLEDGE?.[row?.name]||{};
 return row?.executionEquipment||k.variantEquipment||((k.equipment||[]).length===1?k.equipment[0]:null);
}
function movementMatches(it,row){
 if(!it||!row)return false;
 const pk=it.knowledge||window.movementKnowledge?.(it.name)||window.EXERCISE_KNOWLEDGE?.[it.name]||{};
 const rk=window.movementKnowledge?.(row.name)||window.EXERCISE_KNOWLEDGE?.[row.name]||{};
 const pe=itemEquipment(it),re=rowEquipment(row);
 if(it.name===row.name){
   if(pe&&re&&pe!==re)return false;
   return true;
 }
 if(!pk.variantGroup||!rk.variantGroup||pk.variantGroup!==rk.variantGroup)return false;
 if(pe&&re&&pe!==re)return false;
 return true;
}
function rowTargetDate(actual,row){return row?.scheduledFor||row?.targetPlanDate||actual}
function performedRefsForItem(s,exerciseIndex){
 const it=s?.items?.[exerciseIndex],out=[];
 if(!s||!it)return out;
 Object.entries(db.trainingLogs||{}).forEach(([actual,rows])=>(rows||[]).forEach((row,rowIndex)=>{
   if(rowTargetDate(actual,row)!==s.targetDate)return;
   if(row.planContribution===false||row.source==="ad_hoc")return;
   if(!movementMatches(it,row))return;
   const count=C.performedSetCount(row);
   if(!count)return;
   out.push({actual,row,rowIndex,count,source:row.guidedSessionId===s.id?"runner":row.guidedSessionId?"other_runner":"manual"});
 }));
 return out;
}
function performedCount(s,exerciseIndex){
 const total=performedRefsForItem(s,exerciseIndex).reduce((n,x)=>n+x.count,0);
 return Math.min(s?.items?.[exerciseIndex]?.setCount||total,total);
}
function sourceStats(s,exerciseIndex){
 const refs=performedRefsForItem(s,exerciseIndex),out={manual:0,runner:0,otherRunner:0,total:0,rows:refs.length};
 refs.forEach(x=>{
   out.total+=x.count;
   if(x.source==="manual")out.manual+=x.count;
   else if(x.source==="runner")out.runner+=x.count;
   else out.otherRunner+=x.count;
 });
 const planned=s?.items?.[exerciseIndex]?.setCount||out.total;
 out.total=Math.min(planned,out.total);
 return out;
}
function allSourceStats(s){
 const out={manual:0,runner:0,otherRunner:0,total:0,planned:0,matchedRows:0};
 (s?.items||[]).forEach((it,i)=>{
   const x=sourceStats(s,i);out.manual+=x.manual;out.runner+=x.runner;out.otherRunner+=x.otherRunner;out.total+=x.total;out.planned+=it.setCount;out.matchedRows+=x.rows;
 });
 return out;
}

function guidedRowsForSession(s){
 const out=[];if(!s?.id)return out;
 Object.entries(db.trainingLogs||{}).forEach(([actual,rows])=>(rows||[]).forEach((row,rowIndex)=>{
   if(row.guidedSessionId===s.id&&C.performedSetCount(row)>0)out.push({actual,row,rowIndex});
 }));
 return out;
}
function hasGuidedExecution(s){
 if(!s)return false;
 if(guidedRowsForSession(s).length)return true;
 if(["work","result","rest","exercise_done"].includes(s.phase))return true;
 return (s.events||[]).some(e=>["set_started","set_saved","exercise_partial_close","exercise_skipped"].includes(e?.type));
}
function validTime(value){const t=Date.parse(value||"");return Number.isFinite(t)?t:null}
function deriveTimingStart(s){
 const resets=(s.events||[]).filter(e=>e?.type==="session_timer_reset"&&validTime(e.at)!=null).map(e=>Date.parse(e.at));
 const resetAt=resets.length?Math.max(...resets):null,candidates=[];
 const afterReset=x=>validTime(x)!=null&&(resetAt==null||Date.parse(x)>resetAt);
 (s.events||[]).forEach(e=>{if(e?.type==="set_started"&&afterReset(e.at))candidates.push(e.at)});
 guidedRowsForSession(s).forEach(({row})=>{
   [row.performedAt,...(row.guidedTiming||[]).map(x=>x?.startedAt||x?.savedAt)].forEach(x=>{if(afterReset(x))candidates.push(x)});
 });
 return candidates.sort((a,b)=>Date.parse(a)-Date.parse(b))[0]||null;
}
function repairTiming(s){
 s.createdAt=s.createdAt||s.startedAt||nowIso();
 if(validTime(s.timingStartedAt)==null)s.timingStartedAt=deriveTimingStart(s);
 if(!hasGuidedExecution(s)&&!deriveTimingStart(s)){
   s.timingStartedAt=null;s.totalPausedSec=0;
   if(s.paused){s.paused=false;s.pauseStartedAt=null}
 }
 s.totalPausedSec=Math.max(0,+s.totalPausedSec||0);
 return s;
}

function rowId(actual,row,rowIndex){
 if(!row.entryId)row.entryId=`tr_${actual}_${rowIndex}_${Date.now().toString(36)}`;
 return row.entryId;
}
function planMovementProfile(it){
 const k=it?.knowledge||window.movementKnowledge?.(it?.name)||window.EXERCISE_KNOWLEDGE?.[it?.name]||{};
 return {...k,name:it?.name||k.name};
}
function actualMovementProfile(row){
 const k=window.movementKnowledge?.(row?.name)||window.EXERCISE_KNOWLEDGE?.[row?.name]||{};
 return {...k,name:row?.name||k.name};
}
function substitutionScore(it,row){return window.SubstitutionIntelligenceCore?.score?.(planMovementProfile(it),actualMovementProfile(row))||{score:0,label:"Bilinmiyor",warning:"Profil karşılaştırılamadı."}}
function rowMatchesAnyPlannedItem(s,row){return (s.items||[]).some(it=>movementMatches(it,row))}
function substitutionCandidates(s){
 const out=[];if(!s)return out;
 Object.entries(db.trainingLogs||{}).forEach(([actual,rows])=>(rows||[]).forEach((row,rowIndex)=>{
   if(rowTargetDate(actual,row)!==s.targetDate)return;
   if(row.planContribution===false||row.source==="ad_hoc"||row.substitutionFor||row.substitutionDecision==="extra")return;
   if(row.guidedSessionId===s.id)return;
   if(!C.performedSetCount(row))return;
   if(rowMatchesAnyPlannedItem(s,row))return;
   out.push({actual,row,rowIndex,id:rowId(actual,row,rowIndex),at:new Date(row.performedAt||row.recordedAt||`${actual}T12:00:00`).getTime()||0});
 }));
 return out.sort((a,b)=>b.at-a.at);
}
function detectPendingSubstitution(s){
 if(!s||s.phase==="complete"||["work","result"].includes(s.phase))return null;
 const it=currentItem(s);if(!it||exerciseResolution(s,s.exerciseIndex))return null;
 const cand=substitutionCandidates(s)[0];if(!cand)return null;
 const score=substitutionScore(it,cand.row);
 s.pendingSubstitution={plannedIndex:s.exerciseIndex,plannedMovement:it.name,actualKey:cand.actual,rowId:cand.id,rowIndex:cand.rowIndex,actualMovement:cand.row.name,replacementSets:C.performedSetCount(cand.row),score,detectedAt:nowIso()};
 return s.pendingSubstitution;
}
function pendingRow(s){
 const p=s?.pendingSubstitution;if(!p)return null;
 const rows=db.trainingLogs?.[p.actualKey]||[];
 let idx=rows.findIndex(r=>r.entryId===p.rowId);if(idx<0)idx=p.rowIndex;
 const row=rows[idx];return row?{row,rowIndex:idx,actual:p.actualKey}:null;
}
function acceptSubstitution(){
 let s=active();if(!s?.pendingSubstitution)return;
 const p=s.pendingSubstitution,ref=pendingRow(s),it=s.items[p.plannedIndex];if(!ref||!it){s.pendingSubstitution=null;commit(s);render();return}
 const row=ref.row,sets=C.performedSetCount(row),sim=p.score?.score||0;
 row.substitutionFor={targetDate:s.targetDate,guidedSessionId:s.id,plannedExerciseIndex:p.plannedIndex,plannedMovement:it.name,actualMovement:row.name,similarityPct:sim,fitLabel:p.score?.label||"",acceptedAt:nowIso()};
 row.planContribution="substitution";
 s.exerciseClosures[p.plannedIndex]={status:"substituted",performedSets:0,replacementSets:sets,plannedSets:it.setCount,completionPct:Math.round(Math.min(sets,it.setCount)/it.setCount*100),similarityPct:sim,fitLabel:p.score?.label||"",actualMovement:row.name,actualRowId:row.entryId,substitutionAnalysis:p.score,reason:"movement_substitution",reasonLabel:`${row.name} ile değiştirildi`,at:nowIso()};
 s.events.push({type:"exercise_substitution",at:nowIso(),exerciseIndex:p.plannedIndex,plannedMovement:it.name,actualMovement:row.name,replacementSets:sets,similarityPct:sim});
 s.pendingSubstitution=null;
 const progress=nextProgress(s);if(progress.complete){commit(s);finishGuided();return}
 s.exerciseIndex=progress.exerciseIndex;s.setIndex=progress.setIndex;s.phase="ready";s.restStartedAt=null;s.restTargetCurrent=null;
 commit(s);window.MovementIntelligence?.render?.();render();
}
function keepSubstitutionAsExtra(){
 const s=active();if(!s?.pendingSubstitution)return;const ref=pendingRow(s);if(ref){ref.row.planContribution=false;ref.row.substitutionDecision="extra";ref.row.extraDecisionAt=nowIso()}
 s.events.push({type:"substitution_rejected_extra",at:nowIso(),plannedMovement:s.pendingSubstitution.plannedMovement,actualMovement:s.pendingSubstitution.actualMovement});s.pendingSubstitution=null;commit(s);window.MovementIntelligence?.render?.();render();
}

function nextProgress(s){return C.firstUnresolved(s.items,i=>performedCount(s,i),i=>exerciseResolution(s,i))}
function completionSummaryForSession(s){
 if(!s)return {status:"unperformed",completionPct:0,plannedSets:0,performedSets:0,details:[]};
 const x=C.completionSummary(s.items,i=>performedCount(s,i),i=>exerciseResolution(s,i));
 return {...x,targetDate:s.targetDate,actualAthleteDay:s.actualAthleteDay,sessionClosure:s.sessionClosure||null};
}
function completionSummaryForTarget(target){
 const running=active();
 if(running&&running.targetDate===target)return completionSummaryForSession(running);
 // Historical adherence may exist without a saved executable prescription.
 if(!window.CanonicalSessionEngine?.get?.(target))return {status:"unverified",completionPct:null,plannedSets:0,performedSets:0,details:[],targetDate:target};
 const p=planItems(target),fake={targetDate:target,actualAthleteDay:target,items:p.items,exerciseClosures:{},id:"summary_only"};
 const x=C.completionSummary(fake.items,i=>performedCount(fake,i),()=>null);
 return {...x,targetDate:target,actualAthleteDay:null,sessionClosure:null};
}
function closureReason(){return q("guidedPartialReason")?.value||"fatigue"}
function runnerRowFor(s,exerciseIndex,create=false){

 const bucket=db.trainingLogs[s.actualAthleteDay]=db.trainingLogs[s.actualAthleteDay]||[];
 let row=bucket.find(r=>r.guidedSessionId===s.id&&r.guidedExerciseIndex===exerciseIndex);
 if(!row&&create){
   const it=s.items[exerciseIndex],e=EXERCISES.find(x=>x.n===it.name),mk=it.knowledge||window.EXERCISE_KNOWLEDGE?.[it.name];
   row={
     name:it.name,type:e?.type||mk?.type||"DYNAMIC",load:it.load||0,sets:[],rir:2,
     metricUnit:it.metric,movementClass:mk?.contraction||null,knowledgeVersion:window.EXERCISE_KNOWLEDGE_META?.version||null,
     executionEquipment:mk?.variantEquipment||mk?.equipment?.[0]||null,
     plannedRestSec:it.restTargetSec,restBetweenSets:[],setDurationsSec:[],guidedTiming:[],
     guidedSessionId:s.id,guidedExerciseIndex:exerciseIndex,performedAt:nowIso(),calendarDate:localDateKey(new Date()),
     athleteDay:s.actualAthleteDay,scheduledFor:s.targetDate,planType:s.planType,planVersion:s.planVersion,canonicalSnapshotId:s.canonicalSnapshotId||null,lateOrCatchup:s.actualAthleteDay!==s.targetDate
   };
   bucket.push(row);
 }
 if(row)C.ensureRowArrays(row);
 return row||null;
}
function currentItem(s=active()){return s?.items?.[s.exerciseIndex]||null}
function savedCount(s=active(),index=s?.exerciseIndex){return s?performedCount(s,index):0}

function repairSession(s){
 if(!s)return null;
 if(s.phase==="complete")return repairTiming(s);
 const executed=hasGuidedExecution(s);
 if(executed&&(s.version!==VERSION||!s.canonicalSnapshotId)&&Array.isArray(s.items)&&s.items.length&&guidedRowsForSession(s).length){
   const adopted=window.CanonicalSessionEngine?.adoptGuidedSession?.(s,"guided_runner_migration");
   if(adopted){s.canonicalSnapshotId=adopted.snapshotId;s.canonicalFingerprint=adopted.fingerprint}
 }
 const rebuilt=planItems(s.targetDate),canonical=window.CanonicalSessionEngine?.get?.(s.targetDate);
 const badItems=!Array.isArray(s.items)||!s.items.length||s.items.some(x=>!Number.isFinite(+x.setCount)||+x.setCount<1||!x.name);
 const parseIssues=Array.isArray(s.items)?s.items.filter(x=>x.integrityIssue).length:0;
 const canonicalMismatch=!!(canonical&&(canonical.snapshotId!==s.canonicalSnapshotId||window.TrainingSessionService?.contract(s.items)!==window.TrainingSessionService?.contract(canonical.items)));
 if(canonicalMismatch&&executed){
   s.planConflict=true;return repairTiming(s);
 }
 s.planConflict=false;
 if(badItems||s.version!==VERSION||canonicalMismatch||(!executed&&JSON.stringify((s.items||[]).map(x=>x.name))!==JSON.stringify(rebuilt.items.map(x=>x.name)))){
   s.items=rebuilt.items;s.planName=rebuilt.template.name||s.planName;s.planType=rebuilt.template.type||s.planType;s.planVersion=rebuilt.template.version||s.planVersion;s.version=VERSION;
   s.canonicalSnapshotId=rebuilt.template.canonicalSnapshotId||canonical?.snapshotId||s.canonicalSnapshotId;
   s.canonicalFingerprint=rebuilt.template.canonicalFingerprint||canonical?.fingerprint||s.canonicalFingerprint;
 }
 s.exerciseIndex=C.finiteIndex(s.exerciseIndex,Math.max(0,s.items.length-1));
 s.setIndex=C.finiteIndex(s.setIndex,19);
 s.integrity={ok:!badItems&&parseIssues===0,issues:parseIssues,repaired:badItems,lastCheckedAt:nowIso()};
 s.completedExercises=Array.isArray(s.completedExercises)?s.completedExercises:[];
 s.skippedExercises=Array.isArray(s.skippedExercises)?s.skippedExercises:[];
 s.exerciseClosures=s.exerciseClosures&&typeof s.exerciseClosures==="object"?s.exerciseClosures:{};
 s.pendingSubstitution=s.pendingSubstitution||null;
 repairTiming(s);
 s.lastReconciledAt=nowIso();
 s.events=Array.isArray(s.events)?s.events:[];
 const progress=nextProgress(s);
 s.completedExercises=s.items.map((_,i)=>i).filter(i=>performedCount(s,i)>=s.items[i].setCount);
 if(progress.complete){
   if(s.phase!=="complete"){s.phase="complete";s.completedAt=s.completedAt||nowIso()}
   return s;
 }
 const oldExercise=s.exerciseIndex,oldSet=s.setIndex;
 s.exerciseIndex=progress.exerciseIndex;s.setIndex=progress.setIndex;
 // Preserve a legitimate live phase only when it still points at the derived current set.
 const live=["work","result","rest"].includes(s.phase) && oldExercise===s.exerciseIndex;
 if(s.phase==="rest" && oldSet!==s.setIndex)s.phase="rest";
 else if(!live && s.phase!=="exercise_done")s.phase="ready";
 if(s.phase==="exercise_done" && !s.completedExercises.includes(s.exerciseIndex))s.phase="ready";
 if(!s.pendingSubstitution)detectPendingSubstitution(s);
 return s;
}
function sessionElapsedSec(s){
 const start=validTime(s?.timingStartedAt);if(start==null)return 0;
 const end=validTime(s?.completedAt)??Date.now();
 const pauseEnd=s?.paused&&validTime(s.pauseStartedAt)!=null?Math.max(0,(end-Date.parse(s.pauseStartedAt))/1000):0;
 return Math.max(0,(end-start)/1000-(s?.totalPausedSec||0)-pauseEnd);
}
function startWorkout(targetOverride=null){
 window.AthleteCoordinator?.flush?.("before_start");
 const target=typeof targetOverride==="string"?targetOverride:todayKey();
 // v9.2: for today/future, refresh the single Program Engine projection before
 // materializing the canonical Runner prescription. Past dates keep their history.
 if(target>=todayKey())window.AthleteProgramEngine?.build?.(14,"guided_runner_start");
 const p=planItems(target);
 if(!p.items.length)return alert("Bu planda yönlendirilecek hareket yok.");
 let old=active();
 if(old&&old.phase!=="complete"&&old.targetDate===target){
   old=repairSession(old);commit(old);showRunner();render();return;
 }
 if(old&&old.phase!=="complete"&&old.targetDate!==target){
   const executed=sessionHasExecution(old);
   if(executed&&!confirm(`${old.targetDate} için başlanmış bir seans var. Onu arşivleyip ${target} planını başlatmak istiyor musun?`))return;
   db.guidedWorkoutHistory=db.guidedWorkoutHistory||[];
   db.guidedWorkoutHistory.push({...JSON.parse(JSON.stringify(old)),archivedAt:nowIso(),archiveReason:executed?"target_changed_after_execution":"stale_idle_target_replaced"});
   db[ACTIVE_KEY]=null;old=null;
 }
 const s={
   id:`gw_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,version:VERSION,targetDate:target,actualAthleteDay:actualDay(),
   planType:p.template.type||"training",planName:p.template.name||p.template.type||"Antrenman",planVersion:p.template.version||null,
   canonicalSnapshotId:p.template.canonicalSnapshotId||null,canonicalFingerprint:p.template.canonicalFingerprint||null,
   createdAt:nowIso(),startedAt:null,timingStartedAt:null,phase:"ready",paused:false,exerciseIndex:0,setIndex:0,items:p.items,events:[],completedExercises:[],skippedExercises:[],exerciseClosures:{},pendingSubstitution:null,totalPausedSec:0
 };
 repairSession(s);
 const src=allSourceStats(s);
 s.events.push({type:"cross_entry_reconcile",at:nowIso(),manualSets:src.manual,otherRunnerSets:src.otherRunner,totalRecognized:src.total});
 commit(s);showRunner();render();try{window.refreshTrainingPlanner?.(false);window.renderTrainingPlanSyncV81?.()}catch(e){}beep(520,.08);
}
function showRunner(){
 ["guidedWorkoutCard","guidedTimingCard","guidedAutomationCard","guidedResumeWorkout"].forEach(id=>q(id)?.removeAttribute("hidden"));
}
function hideStagePanels(){
 if(q("guidedResultPanel"))q("guidedResultPanel").hidden=true;
 if(q("guidedRestPanel"))q("guidedRestPanel").hidden=true;
 if(q("guidedExerciseDone"))q("guidedExerciseDone").hidden=true;
}
function startSet(){
 let s=active();if(!s)return;
 window.AthleteCoordinator?.flush?.("before_set");
 const safety=window.TrainingSessionService?.safety(s.targetDate);
 if(safety?.blocked)return alert(safety.reason);
 s=repairSession(s);const it=currentItem(s);if(!it||s.phase==="complete")return;
 if(s.planConflict)return alert("Bu eski oturumun reçetesi günlük planla uyuşmuyor. Kayıtları koruyarak baştan başlat; yanlış plana yeni set eklenmedi.");
 if(s.paused){resumePause(s);}
 if(s.phase==="rest")captureRest(s);
 if(!["ready","rest"].includes(s.phase))return;
 if(!s.timingStartedAt){s.timingStartedAt=nowIso();s.startedAt=s.timingStartedAt}
 const locked=window.CanonicalSessionEngine?.lock?.(s.targetDate,"guided_first_set",{sessionId:s.id,source:"guided"});
 if(locked){s.canonicalSnapshotId=locked.snapshotId;s.canonicalFingerprint=locked.fingerprint;s.planVersion=locked.planVersion;s.planName=locked.planName;s.planType=locked.planType}
 s.phase="work";s.workStartedAt=nowIso();s.workStoppedAt=null;s.measuredWorkSec=null;s.restStartedAt=null;s.restBeepedAt=null;
 s.events.push({type:"set_started",at:s.workStartedAt,exerciseIndex:s.exerciseIndex,setIndex:s.setIndex});
 commit(s);hideStagePanels();beep(760,.05);render();
}
function stopSet(){
 const s=active(),it=currentItem(s);if(!s||!it||s.phase!=="work")return;
 const elapsed=phaseElapsed(s,s.workStartedAt);
 s.workStoppedAt=nowIso();s.measuredWorkSec=Math.round(elapsed*10)/10;s.phase="result";
 commit(s);beep(500,.07);
 if(it.metric==="seconds"){
   saveSet(Math.max(.1,s.measuredWorkSec),it.load||0,+q("guidedResultRir")?.value||2,"stopwatch auto-hold");
   return;
 }
 if(it.metric==="minutes"){
   saveSet(Math.max(.1,Math.round((s.measuredWorkSec/60)*10)/10),it.load||0,+q("guidedResultRir")?.value||2,"stopwatch auto-duration");
   return;
 }
 if(it.metric==="completion"){
   saveSet(1,it.load||0,+q("guidedResultRir")?.value||2,"guided completion");
   return;
 }
 render();setTimeout(()=>q("guidedResultValue")?.focus(),30);
}
function saveSet(value,load,rir,note=""){
 let s=active();if(!s)return;
 s=repairSession(s);const it=currentItem(s);if(!it||s.phase!=="result")return;
 if(s.planConflict)return alert("Reçete çakışması: sonuç yanlış plana yazılmadı. Önce oturumu uzlaştır.");
 value=Number(value);
 if(!(value>0))return alert(it.metric==="km"?"Mesafeyi gir.":it.metric==="minutes"?"Süreyi gir.":"Tekrar sayısını gir.");
 const row=runnerRowFor(s,s.exerciseIndex,true),planIndex=s.setIndex,localIndex=C.savedSetCount(row),dur=+s.measuredWorkSec||0,ws=workStatus(dur,it.workWindow);
 row.load=+load||row.load||0;row.rir=Number.isFinite(+rir)?+rir:2;
 C.writeSet(row,localIndex,{
   value,workSec:Math.round(dur*10)/10,workMinSec:it.workWindow.targetMin||0,workMaxSec:it.workWindow.targetMax||0,
   workHardMaxSec:it.workWindow.max||0,workScore:ws.score,workStatus:ws.key,metric:it.metric,note,savedAt:nowIso()
 });
 window.AthleteLoadMesh?.stampRow?.(row,s.actualAthleteDay);
 if(row.guidedTiming?.[localIndex])row.guidedTiming[localIndex].planSet=planIndex+1;
 s.lastGuidedSaved={exerciseIndex:s.exerciseIndex,localIndex,planSet:planIndex+1};
 s.events.push({type:"set_saved",at:nowIso(),exerciseIndex:s.exerciseIndex,setIndex:planIndex,localIndex,value,metric:it.metric,workSec:dur,workScore:ws.score});
 const count=performedCount(s,s.exerciseIndex);
 if(count>=it.setCount){
   s.setIndex=Math.max(0,it.setCount-1);s.phase="exercise_done";s.completedExercises=[...new Set([...s.completedExercises,s.exerciseIndex])];
   s.workStartedAt=null;s.measuredWorkSec=null;
 }else{
   s.setIndex=count;
   s.phase="rest";s.restStartedAt=nowIso();s.restTargetCurrent=it.restTargetSec;s.restTargetOriginal=it.restTargetSec;s.restBeepedAt=null;
   s.workStartedAt=null;s.workStoppedAt=null;s.measuredWorkSec=null;
 }
 if(q("guidedResultValue"))q("guidedResultValue").value="";
 if(q("guidedResultNote"))q("guidedResultNote").value="";
 commit(s);
 window.renderTrainingAdaptive?.();window.MovementIntelligence?.render?.();window.RestIntervalEngine?.render?.();
 render();
}
function saveDynamicSet(){
 const s=active(),it=currentItem(s);if(!s||!it||s.phase!=="result")return;
 saveSet(+q("guidedResultValue")?.value,+q("guidedResultLoad")?.value||it.load||0,+q("guidedResultRir")?.value||0,q("guidedResultNote")?.value||"");
}
function restScore(restSec,it,target){
 let score=100,status="target";
 if(restSec<it.restMinSec){score=Math.max(45,Math.round(100-(it.restMinSec-restSec)/Math.max(1,it.restMinSec)*55));status="short"}
 else if(restSec>it.restMaxSec){score=Math.max(82,Math.round(100-Math.min(18,(restSec-it.restMaxSec)/Math.max(1,it.restMaxSec)*12)));status="long"}
 return {score,status,target};
}
function captureRest(s){
 if(!s.restStartedAt)return;
 const it=currentItem(s),restSec=Math.round(phaseElapsed(s,s.restStartedAt)),ref=s.lastGuidedSaved,row=ref&&ref.exerciseIndex===s.exerciseIndex?runnerRowFor(s,s.exerciseIndex,false):null;
 if(row&&ref){
   const rs=restScore(restSec,it,s.restTargetCurrent||it.restTargetSec);
   C.writeRest(row,ref.localIndex,restSec,rs);
 }
 s.events.push({type:"rest_complete",at:nowIso(),exerciseIndex:s.exerciseIndex,setIndex:ref?.planSet?ref.planSet-1:Math.max(0,s.setIndex-1),localIndex:ref?.localIndex??null,actualRestSec:restSec,targetRestSec:s.restTargetCurrent||it.restTargetSec});
 s.restStartedAt=null;s.restTargetCurrent=null;s.restBeepedAt=null;
}
function beginNextSet(){const s=active();if(!s||s.phase!=="rest")return;startSet()}
function plusRest(){const s=active();if(!s||s.phase!=="rest")return;s.restTargetCurrent=(s.restTargetCurrent||currentItem(s).restTargetSec)+30;commit(s);render()}
function redoSet(){const s=active();if(!s||s.phase!=="result")return;s.phase="ready";s.workStartedAt=null;s.workStoppedAt=null;s.measuredWorkSec=null;commit(s);render()}
function closeExercisePartial(){
 let s=active();if(!s)return;
 s=repairSession(s);const it=currentItem(s),done=performedCount(s,s.exerciseIndex);if(!it||done<=0||done>=it.setCount)return;
 if(s.phase==="work"||s.phase==="result")return alert("Önce aktif seti kaydet veya iptal et.");
 if(s.phase==="rest")captureRest(s);
 const reason=closureReason();
 s.exerciseClosures[s.exerciseIndex]={status:"partial",performedSets:done,plannedSets:it.setCount,completionPct:Math.round(done/it.setCount*100),reason,reasonLabel:PARTIAL_REASON_LABELS[reason]||reason,at:nowIso()};
 s.events.push({type:"exercise_partial_close",at:nowIso(),exerciseIndex:s.exerciseIndex,name:it.name,performedSets:done,plannedSets:it.setCount,reason});
 const progress=nextProgress(s);
 if(progress.complete){s.sessionClosure={status:"partial",reason,reasonLabel:PARTIAL_REASON_LABELS[reason]||reason,at:nowIso()};commit(s);finishGuided();return}
 s.exerciseIndex=progress.exerciseIndex;s.setIndex=progress.setIndex;s.phase="ready";s.workStartedAt=null;s.restStartedAt=null;s.measuredWorkSec=null;s.restTargetCurrent=null;
 commit(s);render();
}
function nextExercise(){
 let s=active();if(!s)return;
 s=repairSession(s);
 if(s.phase!=="exercise_done")return;
 if(s.exerciseIndex>=s.items.length-1){finishGuided();return}
 const progress=nextProgress(s);
 if(progress.complete){finishGuided();return}
 s.exerciseIndex=progress.exerciseIndex;s.setIndex=progress.setIndex;s.phase="ready";s.workStartedAt=null;s.restStartedAt=null;s.measuredWorkSec=null;s.restTargetCurrent=null;
 commit(s);render();
}
function skipExercise(){
 let s=active(),it=currentItem(s);if(!s||!it)return;
 if(!confirm(`${it.name} hareketini atlamak istiyor musun?`))return;
 s.skippedExercises=[...new Set([...s.skippedExercises,s.exerciseIndex])];
 s.exerciseClosures[s.exerciseIndex]={status:"skipped",performedSets:performedCount(s,s.exerciseIndex),plannedSets:it.setCount,reason:"user_skip",reasonLabel:"Hareket atlandı",at:nowIso()};
 s.events.push({type:"exercise_skipped",at:nowIso(),exerciseIndex:s.exerciseIndex,name:it.name});
 if(s.exerciseIndex>=s.items.length-1){commit(s);finishGuided();return}
 const progress=nextProgress(s);
 if(progress.complete){commit(s);finishGuided();return}
 s.exerciseIndex=progress.exerciseIndex;s.setIndex=progress.setIndex;s.phase="ready";s.workStartedAt=null;s.restStartedAt=null;s.measuredWorkSec=null;
 commit(s);render();
}
function resumePause(s){
 if(!s.paused)return;
 const pauseSec=secBetween(s.pauseStartedAt);s.totalPausedSec=(s.totalPausedSec||0)+pauseSec;
 if(s.phase==="work"&&s.workStartedAt)s.workStartedAt=new Date(new Date(s.workStartedAt).getTime()+pauseSec*1000).toISOString();
 if(s.phase==="rest"&&s.restStartedAt)s.restStartedAt=new Date(new Date(s.restStartedAt).getTime()+pauseSec*1000).toISOString();
 s.paused=false;s.pauseStartedAt=null;s.events.push({type:"resume",at:nowIso(),pauseSec:Math.round(pauseSec)});
}
function pauseSession(){
 const s=active();if(!s)return;
 if(!s.timingStartedAt)return alert("Antrenman süresi henüz başlamadı. Sayaç ilk seti başlattığında otomatik çalışacak.");
 if(!s.paused){s.paused=true;s.pauseStartedAt=nowIso();s.events.push({type:"pause",at:s.pauseStartedAt})}
 else resumePause(s);
 commit(s);render();
}
function resetSessionTimer(){
 const s=active();if(!s)return;
 if(s.phase==="complete")return alert("Tamamlanmış seansın süresi sabitlendi. Yeni süre için antrenmanı baştan başlat.");
 if(s.phase==="work"||s.phase==="result")return alert("Önce çalışan seti durdur veya yeniden yap seçeneğiyle iptal et.");
 if(!confirm("Antrenman süresi 00:00 olarak sıfırlansın mı? Kayıtlı setler korunur; süre sonraki set başladığında yeniden çalışır."))return;
 s.timingStartedAt=null;s.startedAt=null;s.totalPausedSec=0;s.paused=false;s.pauseStartedAt=null;s.completedAt=null;
 s.events=Array.isArray(s.events)?s.events:[];s.events.push({type:"session_timer_reset",at:nowIso()});
 commit(s);render();
}
function syncPlanNow(){
 let s=active();if(!s)return;
 if(hasGuidedExecution(s))return alert("Antrenman başladıktan sonra hareket listesi değiştirilemez. Güncel planla temiz başlamak için ‘Antrenmanı Baştan Başlat’ seçeneğini kullan.");
 window.CanonicalSessionEngine?.refreshFromPlan?.(s.targetDate);
 const p=planItems(s.targetDate);
 if(!p.items.length)return alert("Bu tarih için eşitlenecek bir antrenman bulunamadı.");
 s.items=p.items;s.planName=p.template.name||s.planName;s.planType=p.template.type||s.planType;s.planVersion=p.template.version||s.planVersion;
 s.canonicalSnapshotId=p.template.canonicalSnapshotId||null;s.canonicalFingerprint=p.template.canonicalFingerprint||null;s.version=VERSION;
 s.exerciseIndex=0;s.setIndex=0;s.phase="ready";s.completedExercises=[];s.skippedExercises=[];s.exerciseClosures={};s.pendingSubstitution=null;
 s.timingStartedAt=null;s.startedAt=null;s.totalPausedSec=0;s.paused=false;s.pauseStartedAt=null;
 s.events=Array.isArray(s.events)?s.events:[];s.events.push({type:"plan_manual_sync",at:nowIso(),canonicalSnapshotId:s.canonicalSnapshotId});
 commit(s);try{window.refreshTrainingPlanner?.(false);window.renderTrainingPlanSyncV81?.()}catch(e){}render();
}
function restartWorkout(){
 const s=active();if(!s)return;
 if(!confirm("Runner sıfırlansın mı? Tüm kaydedilmiş setler korunur. Sayaç sıfırlanır ve ortak planın ilk eksik setinden devam edilir."))return;
 const target=s.targetDate,id=s.id;
 db.guidedWorkoutHistory=db.guidedWorkoutHistory||[];
 db.guidedWorkoutHistory.push({...JSON.parse(JSON.stringify(s)),archivedAt:nowIso(),archiveReason:"restart_preserving_records"});
 db[ACTIVE_KEY]=null;
 window.CanonicalSessionEngine?.unlock?.(target,"guided_restart");
 window.CanonicalSessionEngine?.refreshFromPlan?.(target);
 save();startWorkout(target);
}
function finishGuided(){
 const s=active();if(!s)return;
 if(s.phase==="rest")captureRest(s);
 const summary=completionSummaryForSession(s);
 if(summary.completionPct<100){
   const reason=s.sessionClosure?.reason||closureReason()||"other";
   s.sessionClosure={...(s.sessionClosure||{}),status:"partial",reason,reasonLabel:PARTIAL_REASON_LABELS[reason]||reason,completionPct:summary.completionPct,performedSets:summary.performedSets,plannedSets:summary.plannedSets,at:s.sessionClosure?.at||nowIso()};
 }else s.sessionClosure={status:"completed",completionPct:100,performedSets:summary.performedSets,plannedSets:summary.plannedSets,at:nowIso()};
 s.phase="complete";s.completedAt=nowIso();commit(s);
 const mins=Math.max(1,Math.round(sessionElapsedSec(s)/60));if(q("sessionDuration"))q("sessionDuration").value=mins;
 render();beep(880,.15);
}
function endSession(){
 const s=active();if(!s)return;const summary=completionSummaryForSession(s);
 const msg=summary.completionPct<100?`Antrenmanı burada kapatmak istiyor musun? ${summary.performedSets}/${summary.plannedSets} planlı set (%${summary.completionPct}) kaydedildi. Kalan işler yapılmadı olarak saklanacak; Coach buna göre sonraki planı optimize edecek.`:"Antrenmanı burada bitirmek istiyor musun? Kaydedilmiş setler korunacak.";
 if(confirm(msg))finishGuided();
}
function finalizeToCoach(){
 const s=active();if(!s)return;
 if(s.phase!=="complete")finishGuided();
 const duration=Math.max(1,Math.round(sessionElapsedSec(s)/60));if(q("sessionDuration"))q("sessionDuration").value=duration;
 window.AthleteLoadMesh?.restampDay?.(s.actualAthleteDay);
 if(window.completeSessionAdaptive?.({id:s.id,targetDate:s.targetDate,actualAthleteDay:s.actualAthleteDay})!==true)return;
 db.guidedWorkoutHistory=db.guidedWorkoutHistory||[];
 db.guidedWorkoutHistory.push({...s,archivedAt:nowIso()});db.guidedWorkoutHistory=db.guidedWorkoutHistory.slice(-100);
 clearActive();render();
}
function restoreSelectionForActive(){
 const s=active(),sel=q("sessionAttributionMode");if(!s||!sel)return;
 let opt=[...sel.options].find(o=>o.value===`catchup:${s.targetDate}`||o.textContent.includes(s.targetDate));
 if(!opt){opt=document.createElement("option");opt.value=`catchup:${s.targetDate}`;opt.textContent=`Aktif guided · ${s.targetDate} · ${s.planName}`;sel.appendChild(opt)}
 sel.value=opt.value;
}
function setTargetText(it){
 const range=it.resultMin==null?"plan":`${it.resultMin}${it.resultMax&&it.resultMax!==it.resultMin?`–${it.resultMax}`:""}`;
 if(it.metric==="seconds")return `${range} sn`;
 if(it.metric==="minutes")return `${range} dk`;
 if(it.metric==="km")return `${range} km`;
 return `${range} tekrar`;
}
function renderQueue(s){
 const el=q("guidedPlanQueue");if(!el)return;
 el.innerHTML=s.items.map((it,i)=>{
   const done=performedCount(s,i),total=it.setCount,src=sourceStats(s,i);
   const closure=exerciseResolution(s,i),st=done>=total?"done":closure?.status==="substituted"?"substituted":closure?.status==="partial"?"partial":s.skippedExercises.includes(i)?"skip":i===s.exerciseIndex?"active":"future";
   const sourceBits=[src.manual?`${src.manual} manuel`:"",src.otherRunner?`${src.otherRunner} önceki runner`:"",src.runner?`${src.runner} bu runner`:""].filter(Boolean).join(" · ");
   const closeBits=closure?.status==="substituted"?` · DEĞİŞTİRİLDİ: ${closure.actualMovement} · fit ${closure.similarityPct}/100`:closure?.status==="partial"?` · KISMİ: ${closure.reasonLabel||closure.reason||""}`:closure?.status==="skipped"?" · ATLANDI":"";
   return `<div class="guided-queue-item ${st}"><b>${i+1}</b><span>${it.name}</span><small>${C.safeProgress(done,total)} set${sourceBits?` · ${sourceBits}`:""}${closeBits}</small></div>`;
 }).join("");
}
function durationFeedback(s,it){
 const elapsed=s.phase==="work"?phaseElapsed(s,s.workStartedAt):(+s.measuredWorkSec||0),st=workStatus(elapsed,it.workWindow);
 let text=st.text;
 if(s.phase==="work"&&it.workWindow.max&&elapsed>it.workWindow.max)text=`Üst kalite penceresini ${Math.round(elapsed-it.workWindow.max)} sn aştın. Set bittiyse durdur.`;
 return {elapsed,st,text};
}
function renderResultPanel(s,it){
 const panel=q("guidedResultPanel");if(!panel)return;panel.hidden=s.phase!=="result";if(panel.hidden)return;
 q("guidedMeasuredDuration").textContent=`Aktif süre ${fmtClock(s.measuredWorkSec,true)}`;
 const label=q("guidedResultValueLabel"),input=q("guidedResultValue"),load=q("guidedResultLoadLabel");
 const text=it.metric==="km"?"Mesafe (km)":it.metric==="minutes"?"Aktivite (dk)":"Tekrar";
 if(label){const inp=label.querySelector("input");Array.from(label.childNodes).filter(n=>n.nodeType===3).forEach(n=>n.remove());label.insertBefore(document.createTextNode(text+" "),inp)}
 if(input){input.step=it.metric==="km"?"0.01":it.metric==="minutes"?"0.1":"1";input.placeholder=`Set ${s.setIndex+1}: ${setTargetText(it)}`}
 if(load){
   load.style.display=(it.knowledge?.type==="WEIGHTED"||it.knowledge?.type==="BARBELL"||it.name.includes("Weighted")||it.load>0)?"grid":"none";
   const inp=load.querySelector("input");Array.from(load.childNodes).filter(n=>n.nodeType===3).forEach(n=>n.remove());
   if(inp)load.insertBefore(document.createTextNode((it.loadRecommendation?.label||"Ek yük (kg)")+" "),inp);
 }
 if(q("guidedResultLoad"))q("guidedResultLoad").value=it.load||0;
 if(q("guidedResultHint")&&it.loadRecommendation?.applicable&&it.loadRecommendation?.display)q("guidedResultHint").textContent+=` · Önerilen yük: ${it.loadRecommendation.display}`;
 q("guidedResultHint").textContent=`Set ${C.safeProgress(s.setIndex+1,it.setCount)} · gerçek sonucu yaz ve Enter'a bas veya Kaydet'e dokun.`;
}
function renderRest(s,it){
 const panel=q("guidedRestPanel");if(!panel)return;panel.hidden=s.phase!=="rest";if(panel.hidden)return;
 const actual=phaseElapsed(s,s.restStartedAt),target=s.restTargetCurrent||it.restTargetSec,remaining=Math.max(0,target-actual);
 q("guidedRestCountdown").textContent=fmtClock(remaining);q("guidedRestActual").textContent=`Gerçek dinlenme: ${fmtClock(actual)}`;
 q("guidedRestRange").textContent=`Hedef bandı ${fmtRestSec(it.restMinSec)}–${fmtRestSec(it.restMaxSec)} · plan ${fmtRestSec(target)}.`;
 const msg=q("guidedRestMessage");
 if(actual<it.restMinSec)msg.textContent=`Set ${s.setIndex+1} öncesi toparlanma devam ediyor.`;
 else if(actual<=it.restMaxSec)msg.textContent=remaining>0?`Set ${s.setIndex+1} için uygun banda girdin.`:`Set ${s.setIndex+1} hazır.`;
 else msg.textContent=`Set ${s.setIndex+1} hazır; üst rest bandını geçtin.`;
 const next=q("guidedNextSet");if(next)next.textContent=`Set ${s.setIndex+1}'yi Başlat`;
 if(q("guidedSkipRest"))q("guidedSkipRest").hidden=true;
 if(remaining<=0&&!s.restBeepedAt){s.restBeepedAt=nowIso();commit(s);beep(820,.13)}
}
function renderExerciseDone(s,it){
 const p=q("guidedExerciseDone");if(!p)return;p.hidden=s.phase!=="exercise_done";if(p.hidden)return;
 const row=runnerRowFor(s,s.exerciseIndex,false);
 q("guidedExerciseDoneSummary").textContent=` ${window.exerciseMetricText?.(row)||(row?.sets||[]).join("/")} · ${it.name}`;
 q("guidedNextExercise").textContent=s.exerciseIndex>=s.items.length-1?"Seansı Tamamla":"Sonraki Harekete Geç";
}
function renderComplete(s){
 if(s.phase!=="complete")return;
 hideStagePanels();
 const summary=completionSummaryForSession(s);
 q("guidedCurrentExercise").textContent=summary.completionPct>=100?"Antrenman tamamlandı":"Kısmi antrenman kaydedildi";
 q("guidedCurrentInstruction").innerHTML=summary.completionPct>=100?`Tüm planlı setler kaydedildi. Session RPE'yi girip <b>Seansı Koça Gönder</b> ile finalize et.`:`${summary.performedSets}/${summary.plannedSets} planlı set · %${summary.completionPct}. Kalan setler eksik/uyarlanmış olarak saklandı. Session RPE'yi girip <b>Seansı Koça Gönder</b>; Coach gelecek planı buna göre yeniden optimize edecek.`;
 q("guidedStartSet").hidden=true;q("guidedStopSet").hidden=true;
 let btn=q("guidedFinalizeCoach");
 if(!btn){
   btn=document.createElement("button");btn.id="guidedFinalizeCoach";btn.type="button";btn.className="primary guided-big-btn";btn.textContent="Seansı Koça Gönder";
   q("guidedCurrentInstruction").after(btn);btn.onclick=finalizeToCoach;
 }
}
function timingRows(s=active()){
 if(!s)return[];
 const rows=(db.trainingLogs[s.actualAthleteDay]||[]).filter(r=>r.guidedSessionId===s.id),out=[];
 rows.forEach(r=>(r.guidedTiming||[]).forEach((t,i)=>{if(t)out.push({...t,label:`${r.name.replace(/Weighted |Ring /g,"").slice(0,12)} S${i+1}`,exercise:r.name})}));
 return out;
}
function drawTimingChart(){
 const canvas=q("guidedTimingChart"),s=active();if(!canvas||!s)return;
 const data=timingRows(s),rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),W=Math.max(360,Math.round(rect.width*dpr)),H=Math.max(190,Math.round(rect.height*dpr));
 if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
 const c=canvas.getContext("2d"),pad={l:34*dpr,r:12*dpr,t:14*dpr,b:42*dpr},mut=getComputedStyle(document.documentElement).getPropertyValue("--muted").trim()||"#8b949e",line=getComputedStyle(document.documentElement).getPropertyValue("--line").trim()||"#30363d";
 c.clearRect(0,0,W,H);c.font=`${10*dpr}px system-ui`;c.textAlign="right";c.textBaseline="middle";
 [0,25,50,75,100].forEach(v=>{const y=pad.t+(100-v)/100*(H-pad.t-pad.b);c.strokeStyle=line;c.beginPath();c.moveTo(pad.l,y);c.lineTo(W-pad.r,y);c.stroke();c.fillStyle=mut;c.fillText(v,pad.l-5*dpr,y)});
 if(!data.length){c.textAlign="center";c.fillStyle=mut;c.fillText("Set kaydı bekleniyor",W/2,H/2);q("guidedTimingAverage").textContent="--";q("guidedTimingDetails").innerHTML="";return}
 const gap=(W-pad.l-pad.r)/data.length,barW=Math.min(24*dpr,gap*.55);
 data.forEach((x,i)=>{const score=x.timingScore??x.workScore??0,xp=pad.l+gap*(i+.5),y=pad.t+(100-score)/100*(H-pad.t-pad.b);c.fillStyle=score>=85?"#3fb950":score>=65?"#d29922":"#f85149";c.fillRect(xp-barW/2,y,barW,H-pad.b-y);c.save();c.translate(xp,H-pad.b+6*dpr);c.rotate(-.7);c.textAlign="right";c.fillStyle=mut;c.fillText(x.label,0,0);c.restore()});
 const average=Math.round(data.reduce((a,x)=>a+(x.timingScore??x.workScore??0),0)/data.length);
 q("guidedTimingAverage").textContent=`${average}/100`;
 q("guidedTimingDetails").innerHTML=data.slice(-10).map(x=>`<span><b>${x.label}</b> ${x.workSec}s work${x.restSec!=null?` · ${x.restSec}s rest`:""} · ${x.timingScore??x.workScore}/100</span>`).join("");
}
function renderAutomation(s){
 const el=q("guidedAutomationSummary");if(!el)return;
 const rows=timingRows(s),rests=rows.filter(x=>x.restSec!=null),workAvg=rows.length?rows.reduce((a,x)=>a+x.workSec,0)/rows.length:null,restAvg=rests.length?rests.reduce((a,x)=>a+x.restSec,0)/rests.length:null;
 const src=allSourceStats(s),totalSets=src.planned,saved=src.total;
 el.innerHTML=[
   ["Kaydedilen set",C.safeProgress(saved,totalSets)],["Elle algılanan",`${src.manual} set`],["Önceki runner",`${src.otherRunner} set`],["Bu runner",`${src.runner} set`],
   ["Aktif hareket",C.safeProgress(s.exerciseIndex+1,s.items.length)],["Ortalama aktif set",workAvg?`${workAvg.toFixed(1)} sn`:"--"],["Ortalama gerçek rest",restAvg?fmtRestSec(restAvg):"--"]
 ].map(x=>`<div class="summary-item"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
 const bad=rows.filter(x=>(x.workScore??100)<65).length,short=rests.filter(x=>x.restStatus==="short").length;
 const sources=allSourceStats(s);
 q("guidedCoachTimingAdvice").innerHTML=sources.manual?`<strong>${sources.manual} manuel set otomatik eşleştirildi.</strong> Runner bunları tekrar yaptırmadan ilk eksik set/hareketten devam ediyor.`:bad?`<strong>${bad} set aktif süre guardrail'inin belirgin dışında.</strong> Sonuç tekrar/hold ve RIR ile birlikte yorumlanmalı.`:short?`<strong>${short} dinlenme alt bandın altında.</strong> Sonraki set performansı düşüyorsa dinlenmeyi uzat.`:`<strong>Runner state sağlıklı.</strong> Her set ayrı kayıt, ayrı rest ve ayrı timing noktası olarak saklanıyor.`;
}
function renderHistory(){
 const canvas=q("guidedHistoryChart");if(!canvas)return;
 const end=todayKey(),by={};
 Object.entries(db.trainingLogs||{}).forEach(([k,rows])=>{if(k<addDaysKey(end,-27)||k>end)return;(rows||[]).forEach(r=>(r.guidedTiming||[]).forEach(t=>{const sc=t?.timingScore??t?.workScore;if(sc!=null){by[k]=by[k]||[];by[k].push(sc)}}))});
 const data=Object.entries(by).sort().map(([k,v])=>({k,score:Math.round(v.reduce((a,b)=>a+b,0)/v.length),n:v.length}));
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),W=Math.max(360,Math.round(rect.width*dpr)),H=Math.max(180,Math.round(rect.height*dpr));
 if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
 const c=canvas.getContext("2d"),pad={l:36*dpr,r:12*dpr,t:14*dpr,b:28*dpr},mut=getComputedStyle(document.documentElement).getPropertyValue("--muted").trim()||"#8b949e",line=getComputedStyle(document.documentElement).getPropertyValue("--line").trim()||"#30363d";
 c.clearRect(0,0,W,H);[0,25,50,75,100].forEach(v=>{const y=pad.t+(100-v)/100*(H-pad.t-pad.b);c.strokeStyle=line;c.beginPath();c.moveTo(pad.l,y);c.lineTo(W-pad.r,y);c.stroke();c.fillStyle=mut;c.font=`${10*dpr}px system-ui`;c.textAlign="right";c.fillText(v,pad.l-5*dpr,y)});
 if(!data.length){c.textAlign="center";c.fillStyle=mut;c.fillText("Guided set verisi bekleniyor",W/2,H/2);q("guided28dScore").textContent="--";q("guidedHistorySummary").innerHTML="";return}
 const x=i=>data.length===1?(pad.l+W-pad.r)/2:pad.l+i/(data.length-1)*(W-pad.l-pad.r),y=v=>pad.t+(100-v)/100*(H-pad.t-pad.b);
 c.strokeStyle="#58a6ff";c.lineWidth=2*dpr;c.beginPath();data.forEach((d,i)=>i?c.lineTo(x(i),y(d.score)):c.moveTo(x(i),y(d.score)));c.stroke();c.fillStyle="#58a6ff";data.forEach((d,i)=>{c.beginPath();c.arc(x(i),y(d.score),3*dpr,0,Math.PI*2);c.fill()});
 const all=Object.values(by).flat(),average=Math.round(all.reduce((a,b)=>a+b,0)/all.length);
 q("guided28dScore").textContent=`${average}/100`;q("guidedHistorySummary").innerHTML=`<div class="summary-item"><span>28G guided set</span><strong>${all.length}</strong></div><div class="summary-item"><span>Timing quality</span><strong>${average}/100</strong></div><div class="summary-item"><span>Aktif gün</span><strong>${data.length}</strong></div>`;
}
function renderSubstitution(s){
 const panel=q("guidedSubstitutionPanel");if(!panel)return;
 const p=s?.pendingSubstitution,ref=p?pendingRow(s):null;
 if(!p||!ref){panel.hidden=true;return}
 panel.hidden=false;
 const score=p.score||{},it=s.items[p.plannedIndex],actual=ref.row;
 q("guidedSubstitutionTitle").textContent=`Plan: ${it.name} · Kaydedilen: ${actual.name}`;
 q("guidedSubstitutionFit").textContent=`${score.label||"Eşleşme"} · ${score.score??0}/100`;
 q("guidedSubstitutionCompare").innerHTML=`<div><span>PLANLANAN</span><strong>${it.name}</strong><small>${it.knowledge?.pattern||""} · ${it.setCount} set</small></div><div class="swap-arrow">→</div><div><span>GERÇEK</span><strong>${actual.name}</strong><small>${actualMovementProfile(actual).pattern||""} · ${C.performedSetCount(actual)} set</small></div>`;
 q("guidedSubstitutionAnalysis").innerHTML=`<strong>Kas benzerliği ${score.muscleOverlap??0}/100 · Pattern ${score.patternScore??0}/100 · Etki profili ${score.qualityScore??0}/100</strong><br>${score.warning||""}<br><span class="athlete-profile-note">Yerine sayarsan Runner sonraki plan hareketine geçer; kas/recovery analizi ise planlanan hareketi değil gerçekten yaptığın ${actual.name} verisini kullanır.</span>`;
}

function render(){
 let s=active(),start=q("guidedStartWorkout"),resume=q("guidedResumeWorkout");
 if(!s){
   ["guidedWorkoutCard","guidedTimingCard","guidedAutomationCard"].forEach(id=>{if(q(id))q(id).hidden=true});
   if(resume)resume.hidden=true;if(start)start.textContent="Bugünün Ortak Planını Başlat";renderHistory();return;
 }
 s=repairSession(s);db[ACTIVE_KEY]=s; // repair in memory; don't write every 250ms
 showRunner();const it=currentItem(s);if(!it)return;
 if(start)start.textContent="Bugünün Ortak Planını Başlat";if(resume){resume.hidden=false;resume.textContent=`Kayıtlı Oturuma Dön · ${s.targetDate}`}
 const statuses={work:"SET ÇALIŞIYOR",rest:"DİNLENME",result:"SONUÇ GİR",complete:"TAMAMLANDI",exercise_done:"HAREKET BİTTİ",ready:"HAZIR"};
 q("guidedSessionStatus").textContent=s.planConflict?"ESKİ OTURUM — EŞLEŞME YOK":s.targetDate!==todayKey()?`AYRI TARİH · ${s.targetDate}`:s.paused?"DURAKLATILDI":statuses[s.phase]||"HAZIR";
 q("guidedSessionElapsed").textContent=fmtClock(sessionElapsedSec(s));
 q("guidedPlanTitle").textContent=s.planName;q("guidedPlanDate").textContent=`Plan ${s.targetDate} · gerçek gün ${s.actualAthleteDay}`;
 const exerciseProgress=C.safeProgress(s.exerciseIndex+1,s.items.length),setProgress=C.safeProgress(Math.min(s.setIndex+1,it.setCount),it.setCount);
 q("guidedExerciseProgress").textContent=exerciseProgress;q("guidedExerciseName").textContent=it.name;
 q("guidedSetProgress").textContent=setProgress;
 const integrity=q("guidedIntegrityBadge");
 if(integrity){
   const issues=(s.items||[]).filter(x=>x.integrityIssue).length,canon=window.CanonicalSessionEngine?.get?.(s.targetDate);
   const names=(s.items||[]).map(x=>x.name),canonicalNames=(canon?.items||[]).map(x=>x.name),sync=JSON.stringify(names)===JSON.stringify(canonicalNames)&&(!s.canonicalSnapshotId||s.canonicalSnapshotId===canon?.snapshotId);
   integrity.textContent=issues?`DATA ${issues} UYARI`:sync?"CANONICAL OK":"PLAN SYNC HATASI";
   integrity.className=`plan-badge ${issues||!sync?"bad":"good"}`;
 }
 const currentSrc=sourceStats(s,s.exerciseIndex);
 q("guidedPrescription").textContent=`${it.prescription} · ${C.safeProgress(performedCount(s,s.exerciseIndex),it.setCount)} kayıtlı${currentSrc.manual?` · ${currentSrc.manual} manuel`:""}${currentSrc.otherRunner?` · ${currentSrc.otherRunner} önceki runner`:""}`;
 q("guidedRestTarget").textContent=fmtRestSec(s.restTargetCurrent||it.restTargetSec);
 q("guidedWorkWindow").textContent=it.workWindow.targetMax?`Aktif set ${fmtClock(it.workWindow.targetMin)}–${fmtClock(it.workWindow.targetMax)}`:`Süre referans amaçlı`;
 q("guidedMovementClass").textContent=`${it.knowledge?.contraction||"Movement"} · ${it.knowledge?.pattern||""} · ${window.MovementIntelligence?.equipmentLabel?.(it.knowledge?.variantEquipment||it.knowledge?.equipment?.[0])||it.knowledge?.variantEquipment||it.knowledge?.equipment?.[0]||"Ekipman belirtilmemiş"}`;
 renderSubstitution(s);
 q("guidedCurrentExercise").textContent=it.name;
 q("guidedCurrentInstruction").textContent=`Set ${C.safeProgress(Math.min(s.setIndex+1,it.setCount),it.setCount)} · ${it.prescription} · ${it.note}${it.risk?` · ⚠ ${it.risk}`:""}${it.integrityIssue?` · ⚠ ${it.integrityIssue}`:""}`;
 q("guidedTargetChips").innerHTML=`<span>${setTargetText(it)}</span>${it.targetRir!=null?`<span>Hedef RIR ${it.targetRir}</span>`:""}${it.loadRecommendation?.applicable&&it.loadRecommendation?.display?`<span>Yük ${it.loadRecommendation.display}</span>`:""}<span>Dinlenme ${fmtRestSec(it.restTargetSec)}</span><span>${it.workWindow.basis}</span>`;
 renderQueue(s);hideStagePanels();
 const sf=q("guidedStartSet"),st=q("guidedStopSet");
 if(sf){sf.hidden=s.phase!=="ready";sf.disabled=!!s.planConflict;sf.textContent=`Set ${C.safeProgress(s.setIndex+1,it.setCount)} Başlat`}
 if(st)st.hidden=s.phase!=="work";
 if(q("guidedSkipRest"))q("guidedSkipRest").hidden=true;

 if(s.phase==="work"){
   const f=durationFeedback(s,it);q("guidedWorkTimer").textContent=fmtClock(f.elapsed,true);q("guidedTimerFeedback").className=`guided-timer-feedback ${f.st.key}`;q("guidedTimerFeedback").textContent=f.text;q("guidedTimerLabel").textContent=it.metric==="seconds"?"HOLD TIMER":"ACTIVE SET TIMER";
 }else if(s.phase==="result"){
   q("guidedWorkTimer").textContent=fmtClock(s.measuredWorkSec,true);const f=durationFeedback(s,it);q("guidedTimerFeedback").className=`guided-timer-feedback ${f.st.key}`;q("guidedTimerFeedback").textContent=f.text;renderResultPanel(s,it);
 }else if(s.phase==="rest"){
   q("guidedWorkTimer").textContent="REST";q("guidedTimerFeedback").className="guided-timer-feedback neutral";q("guidedTimerFeedback").textContent=`Set ${C.safeProgress(s.setIndex,it.setCount)} kaydedildi. Sıradaki ${C.safeProgress(s.setIndex+1,it.setCount)} için dinleniyorsun.`;renderRest(s,it);
 }else if(s.phase==="exercise_done"){
   q("guidedWorkTimer").textContent="✓";q("guidedTimerFeedback").className="guided-timer-feedback good";q("guidedTimerFeedback").textContent=`${C.safeProgress(it.setCount,it.setCount)} set kaydedildi.`;renderExerciseDone(s,it);
 }else if(s.phase==="complete"){
   q("guidedWorkTimer").textContent="✓";q("guidedTimerFeedback").className="guided-timer-feedback good";q("guidedTimerFeedback").textContent="Guided akış tamamlandı.";renderComplete(s);
 }else{
   q("guidedWorkTimer").textContent="00:00.0";q("guidedTimerFeedback").className="guided-timer-feedback neutral";
   const src=sourceStats(s,s.exerciseIndex),external=src.manual+src.otherRunner;
   q("guidedTimerFeedback").textContent=external?`${external} set daha önce kayıtlardan algılandı. ${it.name} ${C.safeProgress(s.setIndex+1,it.setCount)} noktasından devam.`:`Set ${C.safeProgress(s.setIndex+1,it.setCount)} hazır.`;
 }
 const pc=q("guidedPartialControls"),partialBtn=q("guidedCloseExercisePartial"),doneNow=performedCount(s,s.exerciseIndex),canPartial=(s.phase!=="complete"&&!["work","result","exercise_done"].includes(s.phase)&&doneNow>0&&doneNow<it.setCount)&&!s.pendingSubstitution;
 if(pc)pc.hidden=!canPartial;
 if(canPartial){if(q("guidedPartialTitle"))q("guidedPartialTitle").textContent=`${it.name}: ${doneNow}/${it.setCount} sette bitir`;if(q("guidedPartialCopy"))q("guidedPartialCopy").textContent=`${doneNow} set korunur, kalan ${it.setCount-doneNow} set yapılmadı olarak kaydedilir ve sıradaki harekete geçilir.`;if(partialBtn)partialBtn.textContent=`Hareketi ${doneNow}/${it.setCount} Sette Bitir → Sonraki Harekete Geç`;}
 q("guidedSkipExercise").disabled=s.phase==="complete";q("guidedPauseSession").textContent=s.paused?"Seansa Devam":"Seansı Duraklat";
 drawTimingChart();renderAutomation(s);renderHistory();
}
function tick(){const s=active();if(!s||s.paused)return;render()}
function bind(){
 q("guidedStartWorkout")?.addEventListener("click",()=>startWorkout(selectedTrainingDay()));
 q("guidedStartToday")?.addEventListener("click",()=>startWorkout(selectedTrainingDay()));
 q("guidedStartCatchup")?.addEventListener("click",()=>{
   const target=targetKey();if(target!==todayKey()&&!confirm(`${target} tarihli ayrı bir telafi oturumu başlatılacak. Bugünün programı değişmez. Devam edilsin mi?`))return;
   startWorkout(target);
 });
 q("guidedResumeWorkout")?.addEventListener("click",()=>{showRunner();render()});
 q("guidedStartSet")?.addEventListener("click",startSet);
 q("guidedStopSet")?.addEventListener("click",stopSet);
 q("guidedSaveSet")?.addEventListener("click",saveDynamicSet);
 q("guidedRedoSet")?.addEventListener("click",redoSet);
 q("guidedNextSet")?.addEventListener("click",beginNextSet);
 q("guidedRestPlus30")?.addEventListener("click",plusRest);
 q("guidedNextExercise")?.addEventListener("click",nextExercise);
q("guidedCloseExercisePartial")?.addEventListener("click",closeExercisePartial);
 q("guidedAcceptSubstitution")?.addEventListener("click",acceptSubstitution);
 q("guidedKeepExtra")?.addEventListener("click",keepSubstitutionAsExtra);
  q("guidedSkipExercise")?.addEventListener("click",skipExercise);
 q("guidedPauseSession")?.addEventListener("click",pauseSession);
 q("guidedEndSession")?.addEventListener("click",endSession);
 q("guidedSyncPlan")?.addEventListener("click",syncPlanNow);
 q("guidedResetTimer")?.addEventListener("click",resetSessionTimer);
 q("guidedRestartWorkout")?.addEventListener("click",restartWorkout);
 q("guidedResultValue")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();saveDynamicSet()}});
 q("sessionAttributionMode")?.addEventListener("change",()=>setTimeout(render,20));
 window.addEventListener("resize",()=>{drawTimingChart();renderHistory()});
 window.addEventListener("pagehide",()=>{
   const s=active();if(s&&s.phase!=="complete"&&s.timingStartedAt&&!s.paused){
     s.paused=true;s.pauseStartedAt=nowIso();s.events.push({type:"pause",at:s.pauseStartedAt,reason:"page_closed"});commit(s);
   }
 });
}
function archiveAndClearStaleActive(reason="day_rollover"){
 const s=active();if(!s)return false;
 const selected=selectedTrainingDay(),today=todayKey();
 // A completed Runner belongs to history, never to the next day's live card.
 // Likewise an idle Runner from another target date must not remain the visual authority.
 const completed=s.phase==="complete";
 const staleIdle=s.targetDate!==selected&&!sessionHasExecution(s);
 const completedPast=s.targetDate!==today&&completed;
 if(!(completedPast||staleIdle))return false;
 db.guidedWorkoutHistory=db.guidedWorkoutHistory||[];
 const already=db.guidedWorkoutHistory.some(x=>x?.id===s.id);
 if(!already)db.guidedWorkoutHistory.push({...JSON.parse(JSON.stringify(s)),archivedAt:nowIso(),archiveReason:reason});
 db[ACTIVE_KEY]=null;save();return true;
}
function init(){
 db.guidedWorkoutHistory=db.guidedWorkoutHistory||[];
 archiveAndClearStaleActive("startup_target_refresh");
 if(active()){const s=repairSession(active());commit(s)}
 bind();render();tickHandle=setInterval(tick,250);
}
function syncFromLogs(reason="training log changed"){
 const s=active();if(!s)return;
 if(s.phase==="complete"){render();return}
 const before=`${s.exerciseIndex}:${s.setIndex}:${s.phase}`,oldPhase=s.phase;
 repairSession(s);
 // External/manual entries should advance only when runner is not in the middle of an active set/result.
 if(["work","result"].includes(oldPhase)){
   // Do not jump away while user is actively timing or entering a result.
 }else{
   const progress=nextProgress(s);
   if(progress.complete){s.phase="complete";s.completedAt=s.completedAt||nowIso()}
   else{s.exerciseIndex=progress.exerciseIndex;s.setIndex=progress.setIndex;s.phase="ready";s.restStartedAt=null;s.restTargetCurrent=null;s.restBeepedAt=null}
 }
 if(!s.pendingSubstitution)detectPendingSubstitution(s);
 const after=`${s.exerciseIndex}:${s.setIndex}:${s.phase}`;
 s.events.push({type:"external_log_sync",at:nowIso(),reason,before,after,sources:allSourceStats(s),pendingSubstitution:s.pendingSubstitution?{planned:s.pendingSubstitution.plannedMovement,actual:s.pendingSubstitution.actualMovement,fit:s.pendingSubstitution.score?.score}:null});
 commit(s);render();
}
function reconcilePlan(){
 const s=active();if(s){repairSession(s);render()}
}
window.GuidedWorkout={start:startWorkout,render,finish:finishGuided,finalize:finalizeToCoach,syncFromLogs,reconcilePlan,syncPlanNow,resetSessionTimer,restartWorkout,sessionElapsedSec,normalizeTiming:repairTiming,completionSummary:()=>completionSummaryForSession(active()),completionSummaryForTarget,closeExercisePartial,acceptSubstitution,keepSubstitutionAsExtra,substitutionScore,repair:()=>syncFromLogs("manual repair")};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
