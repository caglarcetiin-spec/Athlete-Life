
const fs=require("fs"),vm=require("vm");
function a(x,m){if(!x)throw new Error(m)}
const db={
 settings:{targetCalories:2800,targetWeight:76},meta:{schemaVersion:8},calibration:{},tissueLoad:{},
 daily:{"2026-09-01":{weight:72},"2026-09-15":{weight:72.2,healthStatus:"normal"}},
 foodLogs:{},trainingLogs:{},sessionFeedback:{},adHocSessions:[]
};
function addDaysKey(k,d){const x=new Date(k+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+d);return x.toISOString().slice(0,10)}
for(let i=55;i>=28;i-=7){const k=addDaysKey("2026-09-15",-i);db.trainingLogs[k]=[{name:"Weighted Pull-Up",type:"WEIGHTED",load:25,sets:[5,5,5],rir:2,restBetweenSets:[180,180]}]}
for(let i=27;i>=0;i-=7){const k=addDaysKey("2026-09-15",-i);db.trainingLogs[k]=[{name:"Weighted Pull-Up",type:"WEIGHTED",load:35,sets:[5,5,5],rir:2,restBetweenSets:[180,180]}]}
const ctx={window:{},console,Date,Math};ctx.window=ctx;
ctx.todayKey=()=> "2026-09-15";ctx.addDaysKey=addDaysKey;ctx.ALOSRuntime={getDb:()=>db};
ctx.LoadPrescriptionEngine={bodyweight:()=>72};
ctx.EXERCISE_KNOWLEDGE={"Weighted Pull-Up":{type:"WEIGHTED",metric:"reps"},"Full Planche":{type:"STATIC",metric:"seconds"}};
ctx.AthleteLoadMesh={
 movementImpact:r=>({loads:{recoveryCost:r.name==="Full Planche"?80:70}}),
 rollingBefore:()=>({neuralDemand:50,mechanicalDemand:50,metabolicDemand:40})
};
ctx.HealthStateEngine={assess:()=>({action:"normal"})};ctx.maxPain=()=>0;ctx.availableMinutes=()=>75;
ctx.planForDate=()=>({type:"pull"});ctx.DataLineage={recommended:(v,o)=>({value:v,...o})};
vm.createContext(ctx);
for(const f of ["performance-trend-v2.js","personal-calibration-engine.js","tissue-load-engine.js","adaptive-nutrition-engine.js","adaptive-coach-solver.js"]){
 vm.runInContext(fs.readFileSync(f,"utf8"),ctx,{filename:f});
}
let tr=ctx.PerformanceTrendV2.trend("Weighted Pull-Up",28,"2026-09-15");
a(tr.state==="rising"&&tr.delta>3,"trend v2 rising "+JSON.stringify(tr));
let cal=ctx.PersonalCalibration.updateLoadResponse("Weighted Pull-Up",{load:35,sets:[5,5,5],rir:2});
a(cal.sessions===1&&cal.confidence>35,"calibration update");
db.trainingLogs["2026-09-15"]=[{name:"Full Planche",sets:[6,6,5],rir:1}];
let tissue=ctx.TissueLoadEngine.rolling(14,"2026-09-15");
a(tissue.wrist&&tissue.anteriorShoulder,"tissue map "+JSON.stringify(tissue));
let nut=ctx.AdaptiveNutrition.targets("2026-09-15");
a(Number.isFinite(nut.kcal)&&nut.proteinG>100&&nut.carbsG>200,"adaptive nutrition "+JSON.stringify(nut));
let sol=ctx.AdaptiveCoachSolver.solve("2026-09-15","pull");
a(sol.best&&Number.isFinite(sol.best.score),"solver finite");
console.log("v8 advanced engines tests: PASS",JSON.stringify({trend:tr.state,tissue:Object.keys(tissue),nutrition:nut.kcal,coach:sol.best.type}));
