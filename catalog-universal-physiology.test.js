
global.window=global;
global.db={daily:{"2026-09-15":{weight:72}},trainingLogs:{},sessionFeedback:{},adHocSessions:[]};
global.addDaysKey=(k,d)=>{const x=new Date(k+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+d);return x.toISOString().slice(0,10)};
global.todayKey=()=> "2026-09-15";
global.LoadPrescriptionEngine={bodyweight:()=>72};
require("./exercise-knowledge-library.js");
global.exerciseDoseUnits=r=>(r.sets||[]).length||1;
global.MovementIntelligence={impactForRow:r=>{
 const k=EXERCISE_KNOWLEDGE[r.name]||{},n=(r.sets||[]).length||1;
 return Object.fromEntries(Object.entries(k.muscles||{}).map(([m,c])=>[m,c*n]));
}};
require("./physiological-impact-engine.js");
function a(x,m){if(!x)throw new Error(m)}
const fail=[];
for(const [name,k] of Object.entries(EXERCISE_KNOWLEDGE)){
 if(k.hiddenFromManual)continue;
 let sets;
 if(k.metric==="seconds")sets=[8,8,8];
 else if(k.metric==="minutes")sets=[15];
 else if(k.metric==="km")sets=[5];
 else sets=[8,8,8];
 const row={name,type:k.type,sets,rir:2,restBetweenSets:[90,90],plannedRestSec:90,sessionRpe:7,sessionDurationMin:k.metric==="km"?30:0,load:(k.type==="WEIGHTED"||k.type==="BARBELL")?10:0};
 const x=AthleteLoadMesh.movementImpact(row,{date:"2026-09-15",rpe:7,duration:row.sessionDurationMin||0});
 const fields=["mechanical","metabolic","neural","skill","cardiovascular","stability"];
 if(!x?.mode||fields.some(f=>!Number.isFinite(x.demands?.[f]))||!Number.isFinite(x.loads?.recoveryCost))fail.push({name,mode:x?.mode,demands:x?.demands});
}
a(fail.length===0,"catalog physiology failures: "+JSON.stringify(fail));
console.log("v7.14 catalog-wide physiology test: PASS",Object.keys(EXERCISE_KNOWLEDGE).length+" movements");
