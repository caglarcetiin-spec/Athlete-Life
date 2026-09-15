
(function(){
"use strict";
const V="8.0",clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,+x||0));
const MAP={
 "Full Planche":{wrist:1,elbow:.8,anteriorShoulder:1},
 "Front Lever":{elbow:.6,shoulder:.8,bicepsTendon:.7},
 "Weighted Pull-Up":{elbow:.8,bicepsTendon:.8,shoulder:.6,grip:.6},
 "Weighted Ring Dip":{anteriorShoulder:.8,elbow:.7,wrist:.5},
 "Sprint":{hamstring:.9,achilles:.8,patellar:.5},
 "Hill Sprint":{hamstring:.8,achilles:.9,patellar:.5},
 "RDL":{hamstring:.8,lowBack:.6},
 "Bulgarian Split Squat":{patellar:.7,hip:.6}
};
function impact(row){
 const base=window.AthleteLoadMesh?.movementImpact?.(row,{})||{},cost=base.loads?.recoveryCost||50,map=MAP[row.name]||{};
 const tissues={};Object.entries(map).forEach(([t,c])=>tissues[t]=Math.round(clamp(cost*c+(+row.rir<=1?8:0))));
 return {name:row.name,tissues,confidence:Object.keys(map).length?70:35,modelVersion:V};
}
function rolling(days=14,end=window.todayKey?.()){
 const d=window.ALOSRuntime?.getDb?.()||{},out={};for(let i=0;i<days;i++){const k=window.addDaysKey?.(end,-i);(d.trainingLogs?.[k]||[]).forEach(r=>{const x=impact(r);Object.entries(x.tissues).forEach(([t,v])=>out[t]=(out[t]||[]).concat(v))})}
 const result={};Object.entries(out).forEach(([t,vals])=>{const recent=vals.slice(0,6),avg=recent.reduce((a,b)=>a+b,0)/recent.length;result[t]={load:Math.round(avg),exposures:vals.length,kind:"heuristic_estimate",status:avg>=80?"high":avg>=60?"elevated":"normal"}});return result;
}
window.TissueLoadEngine={version:V,impact,rolling};
})();
