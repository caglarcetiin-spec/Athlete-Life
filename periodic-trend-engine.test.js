
global.window=global;
global.db={daily:{},trainingLogs:{}};
global.EXERCISE_KNOWLEDGE={"Weighted Pull-Up":{type:"WEIGHTED",metric:"reps"}};
global.todayKey=()=> "2026-09-15";
global.addDaysKey=(k,d)=>{const x=new Date(k+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+d);return x.toISOString().slice(0,10)};
global.currentBodyWeightScience=()=>72;
global.readiness=d=>d?.ready??null;
require("./periodic-trend-engine.js");
function a(x,m){if(!x)throw new Error(m)}
const end="2026-09-15";
for(let i=55;i>=28;i-=7){const k=addDaysKey(end,-i);db.trainingLogs[k]=[{name:"Weighted Pull-Up",type:"WEIGHTED",load:25,sets:[5,5,5],rir:2}]}
for(let i=27;i>=0;i-=7){const k=addDaysKey(end,-i);db.trainingLogs[k]=[{name:"Weighted Pull-Up",type:"WEIGHTED",load:35,sets:[5,5,5],rir:2}]}
let t=PeriodicTrendEngine.exerciseTrend("Weighted Pull-Up","monthly",end);
a(t.state==="rising"&&t.delta>3,"rising trend "+JSON.stringify(t));
db.trainingLogs={};
for(let i=55;i>=0;i-=7){const k=addDaysKey(end,-i);db.trainingLogs[k]=[{name:"Weighted Pull-Up",type:"WEIGHTED",load:35,sets:[5,5,5],rir:2}]}
t=PeriodicTrendEngine.exerciseTrend("Weighted Pull-Up","monthly",end);
a(t.state==="plateau","plateau trend "+JSON.stringify(t));
console.log("v7.15 periodic-trend tests: PASS");
