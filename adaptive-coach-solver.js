
(function(){
"use strict";
const V="8.0";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,+x||0));
function weights(){return {muscle:9,planche:10,frontLever:9,run:6,weightGain:8}}
function constraints(date,type){
 const d=window.db?.daily?.[date]||window.ALOSRuntime?.getDb?.()?.daily?.[date]||{},health=window.HealthStateEngine?.assess?.(d)||{},pain=window.maxPain?.(date)||0,time=window.availableMinutes?.(date)||75;
 const mesh=window.AthleteLoadMesh?.rollingBefore?.(date,2)||{},trend=window.PerformanceTrendV2?.summary?.("monthly",date)||{};
 return {health,pain,time,mesh,trend,plannedType:type};
}
function candidateScore(c,ctx,w=weights()){
 let score=50,why=[];
 if(c.type===ctx.plannedType){score+=22;why.push("planned-session continuity")}
 if(ctx.health.action==="stop_hard_training"&&c.type!=="recovery")return {score:-999,why:["illness hard constraint"]};
 if(ctx.pain>=7&&c.jointRisk>=6)return {score:-999,why:["pain hard constraint"]};
 if(c.duration>ctx.time)return {score:-999,why:["time hard constraint"]};
 score+=c.hypertrophy*w.muscle*.35+c.planche*w.planche*.25+c.frontLever*w.frontLever*.25+c.run*w.run*.18;
 if((ctx.mesh.neuralDemand||0)>75&&c.neural>7){score-=16;why.push("recent neural load")}
 if((ctx.mesh.mechanicalDemand||0)>75&&c.mechanical>7){score-=12;why.push("recent mechanical load")}
 if(ctx.trend.state==="declining"&&c.recoveryCost>7){score-=8;why.push("declining trend")}
 if(ctx.health.action==="reduce"){score-=c.recoveryCost*2;why.push("health volume reduction")}
 return {score,why};
}
function solve(date,plannedType="recovery"){
 const ctx=constraints(date,plannedType),catalog=[
  {type:"pull",duration:70,hypertrophy:8,planche:0,frontLever:9,run:0,neural:8,mechanical:8,recoveryCost:8,jointRisk:6},
  {type:"push",duration:70,hypertrophy:8,planche:9,frontLever:0,run:0,neural:8,mechanical:8,recoveryCost:8,jointRisk:7},
  {type:"legs",duration:65,hypertrophy:9,planche:0,frontLever:0,run:2,neural:7,mechanical:9,recoveryCost:9,jointRisk:5},
  {type:"zone2",duration:45,hypertrophy:1,planche:0,frontLever:0,run:8,neural:2,mechanical:3,recoveryCost:4,jointRisk:3},
  {type:"recovery",duration:30,hypertrophy:0,planche:1,frontLever:1,run:1,neural:1,mechanical:1,recoveryCost:1,jointRisk:1}
 ];
 const scored=catalog.map(c=>({...c,...candidateScore(c,ctx)})).sort((a,b)=>b.score-a.score),best=scored[0];
 return {version:V,date,plannedType,best,alternatives:scored.slice(1,4),constraints:ctx,
  recommendation:window.DataLineage?.recommended?.(best.type,{model:"AdaptiveCoachSolver",version:V,confidence:best.score<0?30:78,inputs:["health","pain","time","load_mesh","performance_trend"],note:best.why.join(", ")})||best.type};
}
window.AdaptiveCoachSolver={version:V,solve,weights};
})();
