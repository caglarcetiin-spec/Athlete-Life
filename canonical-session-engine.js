
(function(){
"use strict";
const V="9.0";
function rt(){return window.ALOSRuntime||null}
function db(){return rt()?.getDb?.()||null}
function clone(x){return x==null?x:JSON.parse(JSON.stringify(x))}
function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function stores(){const d=db();if(!d)return null;d.sessionPrescriptions=d.sessionPrescriptions||{};return d.sessionPrescriptions}
function plan(date){return rt()?.getPlan?.(date)||null}
function resolved(date){return rt()?.getResolvedTemplate?.(date)||null}
function compactItem(it,i){
 return {
  index:i,name:it.name,prescription:String(it.prescription||"—"),note:it.note||"",progression:it.progression||"",risk:it.risk||"",
  loadRecommendation:clone(it.loadRecommendation||null),restTargetSec:+it.restTargetSec||0,restMinSec:+it.restMinSec||0,restMaxSec:+it.restMaxSec||0,restKind:it.restKind||null,
  painAdvice:clone(it.painAdvice||null)
 };
}
function material(date){
 const p=plan(date),r=resolved(date);if(!p||!r)return null;
 const items=(r.items||[]).map(compactItem);
 return {
  date,planType:r.type||p.type||"recovery",planName:r.name||p.name||r.type||p.type||"Antrenman",
  planVersion:p.version||r.version||null,window:p.window||null,status:p.status||null,shift:p.shift||null,
  predictedReadiness:p.predictedReadiness??null,reason:p.reason||"",modifier:clone(r.modifier||null),health:clone(r.health||null),
  duration:r.duration||null,items
 };
}
function fingerprint(m){
 if(!m)return null;
 return hashString(JSON.stringify({
  date:m.date,planType:m.planType,planName:m.planName,planVersion:m.planVersion,window:m.window,
  modifier:m.modifier?.label||m.modifier,health:m.health?.action||m.health?.label,
  duration:m.duration,items:m.items
 }));
}
function snapshotFromMaterial(m,prior=null){
 const fp=fingerprint(m),createdAt=prior?.createdAt||new Date().toISOString();
 return {
  canonicalVersion:V,snapshotId:`cs_${m.date}_${m.planVersion||"x"}_${fp}`,fingerprint:fp,date:m.date,
  planType:m.planType,planName:m.planName,planVersion:m.planVersion,window:m.window,status:m.status,shift:m.shift,
  predictedReadiness:m.predictedReadiness,reason:m.reason,modifier:m.modifier,health:m.health,duration:m.duration,
  items:m.items,locked:false,lockReason:null,lockedAt:null,source:"resolved_plan",createdAt,updatedAt:new Date().toISOString()
 };
}
function targetedRows(date){
 const d=db();if(!d)return [];
 const out=[];Object.entries(d.trainingLogs||{}).forEach(([actual,rows])=>(rows||[]).forEach(r=>{
   const target=r.scheduledFor||r.targetPlanDate||actual;
   if(target===date&&r.planContribution!==false&&r.source!=="ad_hoc"&&(r.sets||[]).some(x=>+x>0))out.push(r);
 }));
 return out;
}
function performed(date){return targetedRows(date).length>0||Object.entries(db()?.sessionFeedback||{}).some(([actual,f])=>(f.targetPlanDate||actual)===date)}
function guidedRows(session){
 const d=db(),out=[];if(!d||!session?.id)return out;
 Object.values(d.trainingLogs||{}).forEach(rows=>(rows||[]).forEach(r=>{
   if(r.guidedSessionId===session.id&&(r.sets||[]).some(x=>+x>0))out.push(r);
 }));
 return out;
}
function guidedExecutionStarted(session){
 if(!session||session.phase==="complete")return false;
 if(guidedRows(session).length)return true;
 if(["work","result","rest","exercise_done"].includes(session.phase))return true;
 return (session.events||[]).some(e=>["set_started","set_saved","exercise_partial_close","exercise_skipped"].includes(e?.type));
}
function activeGuidedExecution(date){
 const s=db()?.activeGuidedWorkout;return !!(s&&s.targetDate===date&&guidedExecutionStarted(s));
}
function isLocked(date){
 const s=stores()?.[date];return !!((s?.locked&&(performed(date)||activeGuidedExecution(date)))||performed(date)||activeGuidedExecution(date));
}
function projectLegacyPlan(s){
 const d=db();if(!d||!s)return;
 d.futurePlans=d.futurePlans||{};
 const p=d.futurePlans[s.date]||{key:s.date};
 d.futurePlans[s.date]={...p,key:s.date,type:s.planType,name:s.planName,version:s.planVersion||p.version||1,window:s.window||p.window||null,
   canonicalSnapshotId:s.snapshotId,canonicalLocked:!!s.locked,canonicalSource:s.source||"canonical"};
}
function lock(date,reason="execution_started",meta={}){
 const s=get(date,{refresh:true});if(!s)return null;
 s.locked=true;s.lockReason=reason;s.lockedAt=s.lockedAt||new Date().toISOString();
 if(meta.sessionId)s.lockedBySessionId=meta.sessionId;
 if(meta.source)s.lockSource=meta.source;
 stores()[date]=s;projectLegacyPlan(s);
 try{window.EngineBus?.publish?.("training.prescription.locked",clone(s))}catch(e){}
 return s;
}
function unlock(date,reason="manual"){
 const s=stores()?.[date];if(!s||performed(date)||activeGuidedExecution(date))return {ok:false,reason:"execution_exists"};
 s.locked=false;s.lockReason=null;s.lockedAt=null;s.unlockedReason=reason;s.updatedAt=new Date().toISOString();return {ok:true,snapshot:s};
}
function get(date,{refresh=true}={}){
 const st=stores();if(!st)return null;
 let existing=st[date]||null;
 const executionLocked=performed(date)||activeGuidedExecution(date);
 // v8.1 locked a session as soon as the Runner card was opened. That allowed a
 // stale, never-performed Runner snapshot to override the live daily plan.
 // Locks without execution evidence are now released and rebuilt from the plan.
 if(existing?.locked&&!executionLocked){
   existing.locked=false;existing.lockReason=null;existing.lockedAt=null;
   existing.unlockedReason="v8.2_no_execution_guard";existing.updatedAt=new Date().toISOString();
 }
 if(existing?.locked&&executionLocked)return existing;
 if(executionLocked&&existing){
   existing.locked=true;existing.lockReason=activeGuidedExecution(date)?"guided_execution":"performed_data";existing.lockedAt=existing.lockedAt||new Date().toISOString();projectLegacyPlan(existing);return existing;
 }
 const m=material(date);if(!m)return existing;
 if(executionLocked&&!existing){
   const s=snapshotFromMaterial(m,null);s.locked=true;s.lockReason=activeGuidedExecution(date)?"guided_execution":"performed_data";s.lockedAt=new Date().toISOString();st[date]=s;projectLegacyPlan(s);return s;
 }
 const fp=fingerprint(m);
 if(existing&&existing.fingerprint===fp)return existing;
 if(!refresh&&existing)return existing;
 const s=snapshotFromMaterial(m,existing);st[date]=s;
 try{window.EngineBus?.publish?.("training.prescription.changed",clone(s))}catch(e){}
 return s;
}
function adoptGuidedSession(session,reason="guided_existing_session"){
 if(!session?.targetDate||!Array.isArray(session.items)||!session.items.length)return null;
 const date=session.targetDate,existing=stores()?.[date];
 // Migration never overwrites a prescription already used by another consumer.
 if(existing)return existing;
 if(!guidedRows(session).length)return get(date);
 if(existing?.locked&&existing.lockedBySessionId===session.id)return existing;
 const items=session.items.map((it,i)=>compactItem({
   name:it.name,prescription:it.prescription,note:it.note,progression:it.progression,risk:it.risk,
   loadRecommendation:it.loadRecommendation||(+it.load>0?{applicable:true,value:+it.load,display:`${+it.load} kg`}:null),
   restTargetSec:it.restTargetSec,restMinSec:it.restMinSec,restMaxSec:it.restMaxSec
 },i));
 const m={
  date,planType:session.planType||"training",planName:session.planName||"Guided Workout",
  planVersion:session.planVersion||null,window:null,status:null,shift:null,predictedReadiness:null,
  reason:"Active Guided Runner snapshot adopted as canonical session",modifier:null,health:null,duration:null,items
 };
 const s=snapshotFromMaterial(m,existing);
 s.locked=true;s.lockReason=reason;s.lockedAt=new Date().toISOString();s.lockedBySessionId=session.id;s.lockSource="guided";s.source="guided_snapshot";
 stores()[date]=s;projectLegacyPlan(s);
 try{window.EngineBus?.publish?.("training.prescription.locked",clone(s))}catch(e){}
 return s;
}
function template(date){
 const s=get(date);if(!s)return null;
 return {
  type:s.planType,name:s.planName,version:s.planVersion,duration:s.duration,items:clone(s.items),
  modifier:clone(s.modifier||{volume:1,intensity:1,label:"Canonical"}),health:clone(s.health||null),
  canonicalSnapshotId:s.snapshotId,canonicalFingerprint:s.fingerprint,canonicalLocked:s.locked
 };
}
function movementNames(date){return (get(date)?.items||[]).map(x=>x.name)}
function equality(a,b){return JSON.stringify((a||[]).map(String))===JSON.stringify((b||[]).map(String))}
function audit(date){
 const s=get(date),weekly=s?.items?.map(x=>x.name)||[],today=movementNames(date);
 const g=db()?.activeGuidedWorkout,runner=g?.targetDate===date?(g.items||[]).map(x=>x.name):weekly;
 return {date,snapshotId:s?.snapshotId||null,locked:!!s?.locked,weekly,today,runner,
   weeklyToday:equality(weekly,today),todayRunner:equality(today,runner),ok:equality(weekly,today)&&equality(today,runner),
   runnerTarget:g?.targetDate||null,runnerIsDifferentTarget:!!(g&&g.targetDate!==date&&g.phase!=="complete")};
}
function reconcileActive(){
 const s=db()?.activeGuidedWorkout;
 if(s&&s.phase!=="complete"&&Array.isArray(s.items)&&s.items.length){
   // Only a Runner with real execution data may become authoritative. An idle
   // legacy Runner must follow the current daily prescription instead.
   if(guidedRows(s).length&&!stores()?.[s.targetDate]){
     const snap=adoptGuidedSession(s,"active_guided_execution_migration");
     s.canonicalSnapshotId=snap?.snapshotId||s.canonicalSnapshotId;s.canonicalFingerprint=snap?.fingerprint||s.canonicalFingerprint;
     return {adopted:true,snapshot:snap};
   }
   const snap=get(s.targetDate,{refresh:true});
   return {adopted:false,reason:"idle_runner_follows_plan",snapshot:snap};
 }
 return {adopted:false};
}
function refreshFromPlan(date){
 if(performed(date)||activeGuidedExecution(date))return {ok:false,reason:"execution_exists",snapshot:get(date,{refresh:false})};
 const st=stores();if(!st)return {ok:false,reason:"store_unavailable",snapshot:null};
 const prior=st[date];if(prior){prior.locked=false;prior.lockReason=null;prior.lockedAt=null}
 const m=material(date);if(!m)return {ok:false,reason:"plan_unavailable",snapshot:prior||null};
 const snap=snapshotFromMaterial(m,prior||null);st[date]=snap;projectLegacyPlan(snap);
 try{window.EngineBus?.publish?.("training.prescription.changed",clone(snap))}catch(e){}
 return {ok:true,snapshot:snap};
}
window.CanonicalSessionEngine={version:V,get:(...args)=>clone(get(...args)),template,lock,unlock,isLocked,performed,adoptGuidedSession,reconcileActive,refreshFromPlan,guidedExecutionStarted,movementNames,audit,fingerprint};
})();
