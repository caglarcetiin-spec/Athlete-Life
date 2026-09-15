const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync('durable-persistence.js','utf8');
const store={};
const localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>delete store[k]};
const ctx={window:{},localStorage,console,Date,JSON,Math,indexedDB:null};ctx.window=ctx;
vm.createContext(ctx);vm.runInContext(code,ctx);
function ok(x,m){if(!x)throw new Error(m)}
let db={daily:{'2026-09-15':{sleep:8}},week:{Pazartesi:{shift:'morning'}},weekOptimizations:{'2026-09-14':{days:[1]}},trainingLogs:{}};
let r1=ctx.ALOSDurablePersistence.save(db,'first');ok(r1.rev===1,'rev1');
db.week.Pazartesi.shift='evening';let r2=ctx.ALOSDurablePersistence.save(db,'second');ok(r2.rev===2,'rev2');
let boot=ctx.ALOSDurablePersistence.bootstrap();ok(boot.week.Pazartesi.shift==='evening','latest state not restored');
const rb=JSON.parse(store.athleteLifeOSLastKnownGood);ok(rb.data.week.Pazartesi.shift==='morning','previous verified revision not preserved');
// corrupt live raw; bootstrap must fall back to previous verified state
store.athleteLifeOS='{broken';boot=ctx.ALOSDurablePersistence.bootstrap();ok(boot.week.Pazartesi.shift==='morning','rollback recovery failed');
console.log('durable-persistence-v930: ok');
