
global.window=global;const W=require("./water-ledger-engine.js");
function a(x,m){if(!x)throw new Error(m)}
const d="2026-09-15",db={water:{},waterLogs:{}},x=W.append(db,d,250),y=W.append(db,d,500);
a(W.total(db,d)===750&&W.entries(db,d).length===2,"add");
a(W.removeById(db,d,x.row.id).ok&&W.total(db,d)===500,"delete only 250");
a(W.entries(db,d)[0].id===y.row.id,"500 remains");
a(W.updateById(db,d,y.row.id,600).ok&&W.total(db,d)===600,"edit");
const old={water:{[d]:1500}},legacy=W.entries(old,d);
a(legacy[0].source==="legacy_total"&&legacy[0].ml===1500,"legacy migrate");
a(W.removeById(old,d,legacy[0].id).ok&&W.total(old,d)===0&&old.water[d]===0,"legacy delete");
console.log("v7.18 water ledger tests: PASS");
