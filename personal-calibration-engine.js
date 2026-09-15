
(function(){
"use strict";
const V="8.0";
function db(){return window.ALOSRuntime?.getDb?.()||window.db||{}}
function ema(prev,x,a=.25){return prev==null?x:prev*(1-a)+x*a}
function updateLoadResponse(name,row){
 const d=db(),c=d.calibration=d.calibration||{},key=`load:${name}`,p=c[key]||{};
 const reps=(row.sets||[]).map(Number).filter(x=>x>0),avg=reps.length?reps.reduce((a,b)=>a+b,0)/reps.length:0,rir=Number.isFinite(+row.rir)?+row.rir:null;
 p.sessions=(p.sessions||0)+1;p.avgReps=ema(p.avgReps,avg);if(rir!=null)p.avgRir=ema(p.avgRir,rir);if(+row.load>0)p.avgLoad=ema(p.avgLoad,+row.load);
 p.confidence=Math.min(95,35+p.sessions*8);p.updatedAt=new Date().toISOString();c[key]=p;return p;
}
function nutritionMaintenance(){
 const d=db(),days=Object.keys(d.daily||{}).sort().slice(-21),weights=days.map(k=>+d.daily[k]?.weight||0).filter(Boolean);
 const kcal=days.map(k=>(d.foodLogs?.[k]||[]).reduce((s,r)=>s+(+r.kcal||0),0)).filter(Boolean);
 if(weights.length<6||kcal.length<6)return {status:"insufficient",confidence:25};
 const weightDays=days.filter(k=>+d.daily[k]?.weight>0);
 const elapsedDays=(Date.parse(weightDays.at(-1))-Date.parse(weightDays[0]))/86400000;
 if(elapsedDays<7)return {status:"insufficient",confidence:25};
 const change=weights.at(-1)-weights[0],avgKcal=kcal.reduce((a,b)=>a+b,0)/kcal.length,weeks=elapsedDays/7;
 const rate=change/weeks,est=avgKcal-rate*7700/7;
 return {status:"estimated",kind:"heuristic_estimate",limitation:"Eksik besin kayıtları ve kısa dönem su/kilo değişimi tahmini yanıltabilir.",maintenanceKcal:Math.round(est/25)*25,weightRateKgWeek:rate,avgKcal:Math.round(avgKcal),confidence:Math.min(70,35+Math.min(weights.length,kcal.length))};
}
function rebuild(){
 const d=db();d.calibration=d.calibration||{};
 Object.keys(d.calibration).filter(k=>k.startsWith("load:")).forEach(k=>delete d.calibration[k]);
 Object.entries(d.trainingLogs||{}).sort(([a],[b])=>a.localeCompare(b)).forEach(([date,rows])=>{
  const groups=new Map();(rows||[]).filter(r=>!r.approximateBackfill&&(r.sets||[]).some(x=>+x>0)).forEach(r=>{
   const key=r.name+"|"+(r.guidedSessionId||r.adHocSessionId||date),g=groups.get(key)||{...r,sets:[]};
   g.sets.push(...r.sets);groups.set(key,g);
  });groups.forEach(r=>updateLoadResponse(r.name,r));
 });return d.calibration;
}
window.PersonalCalibration={version:V,updateLoadResponse,nutritionMaintenance,rebuild};
})();
