
global.window=global;
const day="2026-09-15";
const db={daily:{},trainingLogs:{},sessionFeedback:{},sessionPrescriptions:{},activeGuidedWorkout:null};
let plan={type:"pull",name:"Pull + Front Lever",version:3,window:"19:00–20:10",status:"work",shift:"morning",predictedReadiness:82,reason:"test"};
let items=[
 {name:"Muscle-Up",prescription:"3×2–4",note:"power",loadRecommendation:{applicable:false},restTargetSec:180,restMinSec:150,restMaxSec:240},
 {name:"Front Lever",prescription:"4×5–10 sn",note:"skill",loadRecommendation:{applicable:false},restTargetSec:150,restMinSec:120,restMaxSec:210},
 {name:"Weighted Pull-Up",prescription:"5×5",note:"+35 kg",loadRecommendation:{applicable:true,value:35,display:"+35 kg"},restTargetSec:180,restMinSec:150,restMaxSec:240}
];
global.ALOSRuntime={
 getDb:()=>db,
 getPlan:()=>plan,
 getResolvedTemplate:()=>({type:plan.type,name:plan.name,version:plan.version,duration:70,modifier:{volume:1,intensity:1,label:"Tam"},health:{action:"normal"},items})
};
global.EngineBus={publish:()=>({})};
require("./canonical-session-engine.js");
function a(x,m){if(!x)throw new Error(m)}

const s1=CanonicalSessionEngine.get(day);
a(s1.planType==="pull","initial pull");
a(s1.items.map(x=>x.name).join("|")==="Muscle-Up|Front Lever|Weighted Pull-Up","items order");

plan={...plan,type:"push",name:"Push + Planche",version:4};
items=[
 {name:"Full Planche",prescription:"5×5–8 sn",restTargetSec:180},
 {name:"Weighted Ring Dip",prescription:"5×5",loadRecommendation:{applicable:true,value:20,display:"+20 kg"},restTargetSec:180}
];
const s2=CanonicalSessionEngine.get(day);
a(s2.snapshotId!==s1.snapshotId&&s2.planType==="push","unlocked refresh follows new plan");

db.activeGuidedWorkout={id:"gw1",targetDate:day,phase:"work",events:[{type:"set_started",at:new Date().toISOString()}],items};
CanonicalSessionEngine.lock(day,"guided_first_set",{sessionId:"gw1",source:"guided"});
const locked=CanonicalSessionEngine.get(day);
plan={...plan,type:"legs",name:"Legs + Hybrid",version:5};
items=[{name:"RDL",prescription:"4×6–10",restTargetSec:180}];
const still=CanonicalSessionEngine.get(day);
a(still.snapshotId===locked.snapshotId&&still.planType==="push","locked prescription must not drift");

const oldSession={
 id:"gwLegacy",targetDate:"2026-09-16",phase:"ready",planType:"pull",planName:"Legacy Pull",planVersion:7,
 items:[{name:"Ring Row",prescription:"3×8–12",setCount:3,restTargetSec:90,restMinSec:60,restMaxSec:120,load:0}]
};
db.activeGuidedWorkout=oldSession;
db.trainingLogs["2026-09-16"]=[{name:"Ring Row",sets:[10],scheduledFor:"2026-09-16",guidedSessionId:"gwLegacy"}];
const adopted=CanonicalSessionEngine.adoptGuidedSession(oldSession,"migration");
a(adopted.locked&&adopted.items[0].name==="Ring Row","guided migration adopts exact runner");
a(CanonicalSessionEngine.get("2026-09-16").snapshotId===adopted.snapshotId,"guided canonical stable");
const audit=CanonicalSessionEngine.audit("2026-09-16");
a(audit.ok,"weekly/today/runner audit should match active target "+JSON.stringify(audit));

plan={...plan,type:"legs",name:"Back Lever + Legs",version:8};
items=[
 {name:"Back Lever",prescription:"4×8–12 sn",restTargetSec:150},
 {name:"Bulgarian Split Squat",prescription:"4×8–10",restTargetSec:120}
];
const idleLegacy={id:"gwIdle",targetDate:"2026-09-17",phase:"ready",version:"8.1",startedAt:"2026-09-17T08:00:00.000Z",events:[],items:[{name:"Full Planche",prescription:"5×5–8 sn",setCount:5}]};
db.activeGuidedWorkout=idleLegacy;
const rec=CanonicalSessionEngine.reconcileActive();
a(!rec.adopted,"idle legacy Runner must not become canonical");
a(CanonicalSessionEngine.get("2026-09-17").items.map(x=>x.name).join("|")==="Back Lever|Bulgarian Split Squat","idle Runner follows live plan");

console.log("v9.0 canonical session tests: PASS",JSON.stringify({initial:s1.snapshotId,updated:s2.snapshotId,locked:locked.snapshotId,adopted:adopted.snapshotId,idle:rec.snapshot?.snapshotId}));
