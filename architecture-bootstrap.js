
(function(){
"use strict";
const V="9.0";
function db(){return window.ALOSRuntime?.getDb?.()}
function register(){
 const B=window.EngineBus;if(!B)return;
 const regs=[
  ["AthleteEventStore",window.AthleteEventStore,["measured events"],["athlete.state"]],
  ["AthleteLoadMesh",window.AthleteLoadMesh,["training events"],["physiology.load"]],
  ["CanonicalSessionEngine",window.CanonicalSessionEngine,["coach plan","readiness","health","pain","load prescription"],["training.prescription"]],
  ["HealthStateEngine",window.HealthStateEngine,["recovery events"],["recovery.health"]],
  ["HydrationIntelligence",window.HydrationIntelligence,["nutrition events","training.load"],["nutrition.hydration"]],
  ["NutritionImpact",window.NutritionImpact,["nutrition events","training.load"],["nutrition.impact"]],
  ["PerformanceTrendV2",window.PerformanceTrendV2,["training events"],["performance.trend"]],
  ["TissueLoadEngine",window.TissueLoadEngine,["training events"],["tissue.load"]],
  ["PersonalCalibration",window.PersonalCalibration,["training events","nutrition events","bodyweight"],["athlete.calibration"]],
  ["AdaptiveNutrition",window.AdaptiveNutrition,["athlete.calibration","training.load"],["nutrition.targets"]],
  ["AdaptiveCoachSolver",window.AdaptiveCoachSolver,["recovery.health","training.load","performance.trend","tissue.load"],["coach.recommendation"]]
 ];
 regs.forEach(([name,obj,inputs,outputs])=>obj&&B.register(name,{version:obj.version||"unknown",inputs,outputs,health:()=>({available:true})}));
}

let wired=false;
function wire(){
 if(wired||!window.EngineBus)return;wired=true;
 window.EngineBus.subscribe("event.appended",(evt)=>{
   const domain=evt?.domain||"unknown";window.EngineBus.publish(`${domain}.changed`,evt);
 },"domain-router");
 window.EngineBus.subscribe("nutrition.changed",()=>{
   window.AthleteCoordinator?.schedule?.("nutrition");
 },"nutrition-consumers");
 window.EngineBus.subscribe("training.changed",()=>{
   window.AthleteCoordinator?.schedule?.("training");
 },"training-consumers");
 window.EngineBus.subscribe("recovery.changed",()=>{
   window.AthleteCoordinator?.schedule?.("recovery");
 },"recovery-consumers");
}

function modelSnapshot(){
 const d=db();if(!d)return null;const date=window.todayKey?.(),snap={
  version:V,date,createdAt:new Date().toISOString(),
  lineage:{
   readiness:window.DataLineage?.derived?.(window.readiness?.(d.daily?.[date]),{model:"Readiness",version:"v8-compat",inputs:["sleep","energy","motivation","soreness","joint","stress","health"]}),
   hydration:window.DataLineage?.estimated?.(window.nutritionMetricsForDate?.(date)?.hydration,{model:"HydrationIntelligence",version:window.HydrationIntelligence?.version||"unknown",confidence:window.nutritionMetricsForDate?.(date)?.hydration?.confidence||50}),
   coach:window.DataLineage?.recommended?.(window.CanonicalSessionEngine?.get?.(date)?.planType,{model:"CanonicalSessionEngine",version:"9.0",note:"Tek aktif reçete; bağımsız solver yalnızca alternatif senaryo."}),
   nutrition:window.DataLineage?.recommended?.(window.AdaptiveNutrition?.targets?.(date),{model:"AdaptiveNutrition",version:window.AdaptiveNutrition?.version||"unknown",confidence:window.PersonalCalibration?.nutritionMaintenance?.().confidence||35})
  }
 };
 d.modelSnapshots=d.modelSnapshots||{};d.modelSnapshots[date]=snap;return snap;
}
function init(){
 const d=db();if(!d)return;
 const mig=window.SchemaMigration?.migrate?.(d);if(mig?.applied?.length)window.ALOSRuntime?.save?.();
 const boot=window.AthleteEventStore?.bootstrapFromLegacy?.(d)||{};
 try{window.CanonicalSessionEngine?.reconcileActive?.()}catch(e){}
 register();wire();
 try{window.ALOSRuntime?.buildFuturePlan?.(14,"v9.0 canonical live-sync solver")}catch(e){}
 try{window.refreshTrainingPlanner?.(false);window.renderTrainingPlanSyncV81?.()}catch(e){}
 try{window.ALOSRuntime?.renderNutrition?.()}catch(e){}
 modelSnapshot();
 try{window.ALOSRuntime?.save?.()}catch(e){}
 window.EngineBus?.publish?.("architecture.ready",{version:V,events:boot.total||0,schema:d.meta?.schemaVersion||0});
 try{window.renderArchitectureV8?.()}catch(e){}
}
window.ALOSArchitecture={version:V,init,register,modelSnapshot};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(init,0));else setTimeout(init,0);
})();
