
const C=require("./guided-workout-core.js");
function assert(x,m){if(!x)throw new Error(m)}
let p=C.parsePrescription("3×2–4","reps");assert(p.setCount===3&&p.min===2&&p.max===4,"parser");
let row={sets:[],setDurationsSec:[],guidedTiming:[],restBetweenSets:[]};C.writeSet(row,0,{value:4,workSec:8,workScore:95,metric:"reps"});C.writeSet(row,1,{value:4,workSec:8,workScore:95,metric:"reps"});assert(C.savedSetCount(row)===2,"2 sets");
const items=[{name:"Weighted Pull-Up",setCount:5},{name:"Ring Row",setCount:3}],counts=[2,0],closures={0:{status:"partial",reason:"fatigue"}};
let prog=C.firstUnresolved(items,i=>counts[i],i=>closures[i]||null);assert(prog.exerciseIndex===1&&prog.setIndex===0,"partial moves next");
let sum=C.completionSummary(items,i=>counts[i],i=>closures[i]||null);assert(sum.status==="partial"&&sum.performedSets===2&&sum.plannedSets===8&&sum.completionPct===25,"partial summary");
closures[1]={status:"skipped"};prog=C.firstUnresolved(items,i=>counts[i],i=>closures[i]||null);assert(prog.complete===true,"resolved partial+skip completes navigation");
assert(C.safeProgress(NaN,NaN)==="—","NaN guard");
console.log("v7.11 partial autoregulation core tests: PASS");

const itemsSub=[{name:"Ring Row",setCount:3},{name:"Curl",setCount:3}];
const countsSub=[0,0];
const closuresSub=[{status:"substituted",replacementSets:3,similarityPct:20,actualMovement:"Ring Dip"},null];
let nextSub=C.firstUnresolved(itemsSub,i=>countsSub[i],i=>closuresSub[i]);
assert(nextSub.exerciseIndex===1,"accepted substitution advances to next movement");
let sumSub=C.completionSummary(itemsSub,i=>countsSub[i],i=>closuresSub[i]);
assert(sumSub.substitutionExercises===1,"substitution counted");
assert(sumSub.planFidelityPct>0&&sumSub.planFidelityPct<50,"low-fit substitution gets partial plan fidelity credit");
console.log("v7.12 guided substitution completion test: PASS");
