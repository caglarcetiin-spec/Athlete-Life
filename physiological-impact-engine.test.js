
global.window=global;
global.db={daily:{"2026-09-15":{weight:72}},trainingLogs:{},sessionFeedback:{},adHocSessions:[]};
global.addDaysKey=(k,d)=>{const x=new Date(k+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+d);return x.toISOString().slice(0,10)};
global.todayKey=()=> "2026-09-15";
global.LoadPrescriptionEngine={bodyweight:()=>72};
global.EXERCISE_KNOWLEDGE={
 "Front Lever":{type:"STATIC",metric:"seconds",contraction:"Isometric",qualities:{strength:9,hypertrophy:6,power:2,skill:10,stability:9,endurance:5},muscles:{lats:1,abs:.8}},
 "Weighted Pull-Up":{type:"WEIGHTED",metric:"reps",qualities:{strength:9,hypertrophy:8,power:5,skill:4,stability:5,endurance:4},muscles:{lats:1,biceps:.7}},
 "Muscle-Up":{type:"DYNAMIC",metric:"reps",contraction:"Explosive dynamic",qualities:{strength:8,hypertrophy:6,power:9,skill:9,stability:6,endurance:5},muscles:{lats:1,biceps:.7,chest:.5}},
 "Ring Row":{type:"DYNAMIC",metric:"reps",qualities:{strength:6,hypertrophy:8,power:3,skill:4,stability:8,endurance:7},muscles:{lats:1,upperBack:.8}},
 "Sprint":{type:"RUN",metric:"seconds",doseModel:"sprint_work_seconds",physiology:{mode:"sprint"},qualities:{power:10,endurance:6},muscles:{hamstrings:1,glutes:1}},
 "Zone 2 Run":{type:"RUN",metric:"km",qualities:{endurance:10},muscles:{calves:.5,quads:.3}},
 "Mobility":{type:"MOBILITY",metric:"minutes",qualities:{skill:3,stability:4,endurance:2},muscles:{}}
};
global.MovementIntelligence={impactForRow:r=>{
 const k=EXERCISE_KNOWLEDGE[r.name]||{},n=(r.sets||[]).length||1;
 return Object.fromEntries(Object.entries(k.muscles||{}).map(([m,c])=>[m,c*n]));
}};
global.exerciseDoseUnits=r=>(r.sets||[]).length||1;
require("./physiological-impact-engine.js");
function a(x,m){if(!x)throw new Error(m)}
const cases=[
 [{name:"Front Lever",sets:[8,8,7,7],rir:2,restBetweenSets:[180,180,180]},"static_isometric"],
 [{name:"Weighted Pull-Up",load:35,sets:[5,5,5,5,5],rir:2,restBetweenSets:[180,180,180,180]},"loaded_dynamic"],
 [{name:"Muscle-Up",sets:[3,3,3],rir:2,restBetweenSets:[180,180]},"explosive_skill"],
 [{name:"Ring Row",sets:[12,12,10],rir:2,restBetweenSets:[90,90]},"bodyweight_dynamic"],
 [{name:"Sprint",sets:[8,8,8,8,8,8],restBetweenSets:[60,60,60,60,60],sessionRpe:9,sessionDurationMin:12,sprintDistanceM:50},"sprint"],
 [{name:"Zone 2 Run",sets:[5.7],sessionRpe:4,sessionDurationMin:39},"continuous_aerobic"],
 [{name:"Mobility",sets:[15],sessionRpe:2},"mobility_recovery"]
];
for(const [row,mode] of cases){
 const x=AthleteLoadMesh.movementImpact(row,{date:"2026-09-15",rpe:row.sessionRpe||7,duration:row.sessionDurationMin||0});
 a(x.mode===mode,row.name+" mode "+x.mode+" != "+mode);
 for(const k of ["mechanical","metabolic","neural","skill","cardiovascular","stability"])a(Number.isFinite(x.demands[k]),row.name+" missing "+k);
 a(Number.isFinite(x.loads.recoveryCost),row.name+" recovery");
}
db.trainingLogs["2026-09-15"]=[
 {name:"Weighted Pull-Up",load:35,sets:[5,5,5,5,5],rir:2,restBetweenSets:[180,180,180,180]},
 {name:"Front Lever",sets:[8,8,7,7],rir:2,restBetweenSets:[180,180,180]}
];
db.sessionFeedback["2026-09-15"]={duration:60,rpe:8};
const roll=AthleteLoadMesh.rolling(7,"2026-09-15");
a(roll.sessions>=1,"rolling sessions");
a(roll.mechanicalDemand>0&&roll.neuralDemand>0&&roll.metabolicDemand>0,"rolling universal demands "+JSON.stringify(roll));
const st=db.trainingLogs["2026-09-15"][0];AthleteLoadMesh.stampRow(st,"2026-09-15");
a(st.physiologySnapshot?.version==="7.14","snapshot version");
console.log("v7.14 universal physiology tests: PASS",JSON.stringify({modes:cases.map(x=>x[1]),rolling:{mechanical:roll.mechanicalDemand,neural:roll.neuralDemand,metabolic:roll.metabolicDemand}}));
