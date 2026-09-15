const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('capability-catalog.js','utf8'),ctx);
const c=ctx.window.CAPABILITY_CATALOG;
for(const d of ['balance_control','work_capacity','mobility','endurance']){assert(Array.isArray(c[d])&&c[d].length>=5,d+' catalog missing');for(const t of c[d]){assert(t.id&&t.name&&t.unit&&Array.isArray(t.bands)&&t.bands.length===4,d+' malformed test')}}
const html=fs.readFileSync('index.html','utf8');
for(const id of ['capPanelBalance','capPanelWork','capPanelMobility','capPanelEndurance'])assert(html.includes(id),id+' missing');
const engine=fs.readFileSync('athlete-profile-engine.js','utf8');
for(const d of ['balance_control','work_capacity','mobility','endurance'])assert(engine.includes(d),d+' not wired');
console.log('capability domains v9.2.3 OK');
