
const fs=require("fs"),vm=require("vm");
function a(x,m){if(!x)throw new Error(m)}
const storage={};
const localStorage={getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=String(v),removeItem:k=>delete storage[k]};
const ctx={window:{},localStorage,console,Date,Math,setTimeout:()=>{},clearTimeout:()=>{}};
ctx.window=ctx;ctx.todayKey=()=> "2026-09-15";
vm.createContext(ctx);
for(const f of ["engine-bus.js","data-lineage-engine.js","schema-migration-engine.js","event-store-engine.js"]){
 vm.runInContext(fs.readFileSync(f,"utf8"),ctx,{filename:f});
}
// Schema migration
let db={meta:{schemaVersion:5},daily:{},foodLogs:{},trainingLogs:{},water:{},waterLogs:{}};
let mig=ctx.SchemaMigration.migrate(db);
a(mig.from===5&&mig.to===9&&mig.applied.join(",")==="6,7,8,9","schema migration "+JSON.stringify(mig));
a(ctx.SchemaMigration.validate(db).ok,"schema validate");

// Lineage
let x=ctx.DataLineage.measured(72,{model:"Scale",version:"1",units:"kg"});
a(x.kind==="measured"&&x.confidence===100,"measured lineage");
x=ctx.DataLineage.estimated(80,{model:"Recovery",version:"2",confidence:63});
a(x.kind==="estimated"&&x.confidence===63,"estimated lineage");

// Engine Bus
let got=0;ctx.EngineBus.subscribe("test",p=>got=p,"unit");ctx.EngineBus.publish("test",7);a(got===7,"bus pubsub");
ctx.EngineBus.register("X",{version:"1",inputs:["a"],outputs:["b"]});a(ctx.EngineBus.graph().engines.length===1,"bus register");

// Event store stable dedupe + state
db={
 meta:{schemaVersion:8},daily:{"2026-09-15":{weight:72}},
 foodLogs:{"2026-09-15":[{logId:"f1",name:"Leblebi",kcal:111}]},
 waterLogs:{"2026-09-15":[{id:"w1",ml:500}]},
 trainingLogs:{"2026-09-15":[{id:"t1",name:"Weighted Pull-Up",load:35,sets:[5,5,5]}]},
 sessionFeedback:{"2026-09-15":{duration:60,rpe:8}}
};
let b1=ctx.AthleteEventStore.bootstrapFromLegacy(db),count1=ctx.AthleteEventStore.list().length;
let b2=ctx.AthleteEventStore.bootstrapFromLegacy(db),count2=ctx.AthleteEventStore.list().length;
a(count1===5,"expected 5 bootstrapped events got "+count1);
a(count2===count1,"bootstrap must be idempotent");
ctx.AthleteEventStore.append("WATER_DELETED",{id:"w1"},{id:"wd1",domain:"nutrition",athleteDay:"2026-09-15"});
a(ctx.AthleteEventStore.state("2026-09-15").nutrition.water.length===0,"water delete projector");
console.log("v8 core architecture tests: PASS",JSON.stringify({schema:mig.to,events:count2,engines:ctx.EngineBus.graph().engines.length}));
