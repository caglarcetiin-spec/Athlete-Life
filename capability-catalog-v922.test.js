const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('capability-catalog.js','utf8'),ctx);
const cat=ctx.window.CAPABILITY_CATALOG.calisthenics;
const ids=new Set(cat.map(x=>x.id));
assert.equal(ids.size,cat.length,'duplicate capability ids');
['muscle_up','weighted_muscle_up','ring_muscle_up','weighted_ring_muscle_up','ring_false_grip_hang','ring_rto_support','ring_pullup','ring_dip','weighted_ring_dip','ring_l_sit','skin_the_cat','german_hang','ring_front_lever','ring_back_lever','ring_handstand','ring_hspu','iron_cross','maltese'].forEach(id=>assert(ids.has(id),`missing ${id}`));
assert(cat.filter(x=>x.group==='Muscle-Up').length>=6,'Muscle-Up group incomplete');
assert(cat.filter(x=>x.group==='Rings / Gymnastics').length>=12,'Rings group incomplete');
console.log('capability catalog v9.2.2 OK',cat.length);
