(function(){
"use strict";
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const data=()=>window.ALOSRuntime?.getDb?.()||{};
const today=()=>window.todayKey();
function prescription(date=today()){
 const p=window.CanonicalSessionEngine?.get(date);
 if(!p)throw new Error("Antrenman reçetesi bulunamadı: "+date);
 return p;
}
function rows(target){
 return Object.entries(data().trainingLogs||{}).flatMap(([actual,rs])=>(rs||[])
  .filter(r=>(r.scheduledFor||r.targetPlanDate||actual)===target&&r.planContribution!==false&&r.source!=="ad_hoc")
  .map(r=>({...clone(r),actualAthleteDay:actual})));
}
function contract(items){
 return JSON.stringify((items||[]).map(i=>({name:i.name,prescription:i.prescription,
  load:i.loadRecommendation?.value??null,rir:i.targetRir??null,rest:+i.restTargetSec||0,min:+i.restMinSec||0,max:+i.restMaxSec||0})));
}
function audit(date=today()){
 const p=prescription(date),s=data().activeGuidedWorkout;
 const applicable=!!s&&s.phase!=="complete"&&s.targetDate===date;
 const matches=!applicable||(s.canonicalSnapshotId===p.snapshotId&&contract(s.items)===contract(p.items));
 return {ok:matches,date,snapshotId:p.snapshotId,locked:p.locked,runnerTarget:s?.targetDate||null,
  runnerMode:applicable?"today":s&&s.phase!=="complete"?"separate_session":"preview",contract:contract(p.items)};
}
function safety(date=today()){
 // Execution prescription is immutable, but a new health signal must still stop a start.
 const h=window.HealthStateEngine?.assessFor?.(data(),today())||window.HealthStateEngine?.assess?.(data().daily?.[today()]||{});
 return {blocked:h?.action==="stop_hard_training",reason:h?.reason||"",health:h,date};
}
function summary(date=today()){
 const p=prescription(date),actual=rows(date),readiness=window.readiness?.(data().daily?.[date]);
 return {date,snapshotId:p.snapshotId,prescription:p,actual,readiness:readiness??null,
  sharedTraining:window.AthleteWorkspaceCore?.snapshot?.(data(),date)||null,
  readinessKind:readiness==null?"missing":"derived_from_self_report",safety:safety(date),
  modelNotice:"Toparlanma, doku yükü ve performans puanları model tahminidir; klinik ölçüm veya sakatlık olasılığı değildir."};
}
window.TrainingSessionService={version:"9.0",prescription,rows,contract,audit,safety,summary,today};
})();
