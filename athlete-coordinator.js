(function(){
"use strict";
// Single dependency-ordered refresh boundary for all legacy save paths.
// Re-evaluate elapsed recovery every five minutes as well as on committed data changes.
let pending=null,running=false,lastInput=null,lastDay=null,revision=0,lastReport=null;
const db=()=>window.ALOSRuntime?.getDb?.()||{};
function inputs(){
 const d=db();return JSON.stringify({daily:d.daily,food:d.foodLogs,water:d.waterLogs,legacyWater:d.water,
  training:d.trainingLogs,feedback:d.sessionFeedback,pain:d.painLogs,settings:d.settings,
  schedule:d.scheduleByDate,week:d.week,body:d.bodyMeasurements,capabilities:d.capabilityRecords,
  character:d.characterData,overrides:d.characterOverrides,runs:d.runs,
  adhoc:d.adHocSessions,gaps:d.gapReconciliation,periods:d.trainingPeriods,sportSessions:d.sportSessions,athleteProfile:d.athleteProfile,multisportPeriods:d.multisportPeriods,recoveryClock:Math.floor(Date.now()/300000)},(key,value)=>
   ["physiologySnapshot","lastCheckedAt","updatedAt"].includes(key)?undefined:value);
}
function schedule(reason="data_changed"){
 if(running||pending)return;
 pending=setTimeout(()=>{pending=null;flush(reason)},60);
}
function flush(reason="manual",force=false){
 if(running)return lastReport;
 if(pending){clearTimeout(pending);pending=null}
 const before=inputs(),day=window.todayKey?.();
 if(!force&&before===lastInput&&day===lastDay)return lastReport;
 running=true;const errors=[],stages=[];
 const stage=(name,fn)=>{try{fn();stages.push(name)}catch(e){errors.push({stage:name,message:e.message});console.error(name,e)}};
 try{
  stage("measured-records",()=>window.AthleteEventStore?.bootstrapFromLegacy?.(db()));
  stage("physiology",()=>Object.keys(db().trainingLogs||{}).forEach(k=>window.AthleteLoadMesh?.restampDay?.(k)));
  stage("shared-sport-analysis",()=>window.AthleteWorkspace?.refresh?.());
  stage("calibration",()=>window.PersonalCalibration?.rebuild?.());
  stage("future-plan",()=>window.ALOSRuntime?.buildFuturePlan?.(14,"data revision: "+reason));
  stage("canonical-prescription",()=>window.TrainingSessionService?.prescription(day));
  stage("runner",()=>window.GuidedWorkout?.reconcilePlan?.());
  stage("analysis",()=>window.ALOSArchitecture?.modelSnapshot?.());
  stage("planner-view",()=>window.refreshTrainingPlanner?.(false));
  stage("period-analysis",()=>window.TrainingPeriods?.render?.());
  stage("training-view",()=>window.renderTrainingAdaptive?.());
  stage("coach-view",()=>window.renderCoach?.());
  stage("nutrition-view",()=>window.ALOSRuntime?.renderNutrition?.());
  stage("nutrition-impact",()=>window.NutritionImpact?.render?.());
  stage("athlete-profile",()=>window.AthleteProfile?.render?.());
  stage("movement-view",()=>window.MovementIntelligence?.render?.());
  stage("pain-view",()=>window.PainIntelligence?.render?.());
  stage("reports",()=>{window.ALOSRuntime?.renderReports?.();window.renderArchitectureV8?.()});
  revision++;lastDay=day;lastInput=inputs();
  lastReport={revision,date:day,at:new Date().toISOString(),reason,stages,errors,ok:errors.length===0};
  db().meta=db().meta||{};db().meta.dataRevision=revision;
  window.ALOSRuntime?.save?.();
  window.EngineBus?.publish?.("athlete.state.ready",cloneReport());
 }finally{running=false;renderStatus()}
 return lastReport;
}
function cloneReport(){return lastReport?JSON.parse(JSON.stringify(lastReport)):null}
function renderStatus(){
 const el=document.getElementById("athleteSyncStatus");if(!el)return;
 const s=window.TrainingSessionService?.summary?.(),a=window.TrainingSessionService?.audit?.();
 el.textContent=`${lastReport?.ok&&a?.ok?"Senkron":"Kontrol gerekli"} · Veri revizyonu ${revision} · Plan ${a?.snapshotId||"—"} · `+
   (s?.readiness==null?"Günlük hazır oluş verisi eksik; plan tahmin içerir.":"Hazır oluş: özbildirimden hesaplanır.");
 el.dataset.status=lastReport?.ok&&a?.ok?"ok":"warning";
 const err=document.getElementById("athleteSyncErrors");if(err)err.textContent=(lastReport?.errors||[]).map(x=>x.stage+": "+x.message).join(" • ");
}
function init(){
 revision=+db().meta?.dataRevision||0;
 window.EngineBus?.register?.("AthleteCoordinator",{version:"9.0",inputs:["committed athlete records"],outputs:["athlete.state.ready"]});
 document.getElementById("refreshAthleteState")?.addEventListener("click",()=>flush("manual",true));
 setTimeout(()=>flush("startup",true),0);
 setInterval(()=>schedule(lastDay!==window.todayKey?.()?"athlete_day_changed":"recovery_clock"),30000);
}
window.AthleteCoordinator={version:"9.0",schedule,flush,status:cloneReport,inputs};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
