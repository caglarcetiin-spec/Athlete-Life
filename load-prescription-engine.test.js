
global.window=global;
global.db={
 daily:{"2026-09-15":{weight:72}},
 trainingLogs:{},
 bodyMeasurements:[],
 characterData:{}
};
global.EXERCISE_KNOWLEDGE={
 "DB Hammer Curl":{type:"WEIGHTED"},
 "Weighted Pull-Up":{type:"WEIGHTED"},
 "OHP":{type:"BARBELL"}
};
require("./load-prescription-engine.js");
function a(x,m){if(!x)throw new Error(m)}
let r=LoadPrescriptionEngine.recommend("DB Hammer Curl","2×10–15","2026-09-15",{readinessScore:80});
a(r.value===8,"hammer baseline should be 8 kg/dumbbell: "+JSON.stringify(r));
a(r.unit==="per_dumbbell","hammer unit");
db.trainingLogs["2026-09-15"]=[{name:"DB Hammer Curl",load:8,sets:[15,15],rir:2}];
r=LoadPrescriptionEngine.recommend("DB Hammer Curl","2×10–15","2026-09-15",{readinessScore:80});
a(r.value===10&&r.source==="history","hammer progression should become 10: "+JSON.stringify(r));
db.trainingLogs={};
r=LoadPrescriptionEngine.recommend("Weighted Pull-Up","5×5","2026-09-15",{readinessScore:80,templateNote:"+35 kg başlangıç"});
a(r.value===35&&r.source==="template_anchor","WPU template anchor: "+JSON.stringify(r));
console.log("v7.14 load prescription tests: PASS",JSON.stringify({hammer:8,hammerNext:10,wpu:35}));
