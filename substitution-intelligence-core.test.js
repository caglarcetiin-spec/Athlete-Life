const S=require("./substitution-intelligence-core.js");
function assert(x,m){if(!x)throw new Error(m)}
const row={name:"Ring Row",pattern:"Horizontal pull",muscles:{upperBack:1,lats:.8,biceps:.7,scapular:.75},qualities:{strength:6,hypertrophy:9,power:3,skill:4,stability:8,core:5,endurance:8}};
const dip={name:"Ring Dip",pattern:"Vertical push",muscles:{chest:1,triceps:.88,frontDelts:.68,scapular:.58},qualities:{strength:7,hypertrophy:9,power:4,skill:6,stability:9,core:5,endurance:6}};
const ringRow2={name:"Feet-Elevated Ring Row",pattern:"Horizontal pull",muscles:{upperBack:1,lats:.9,biceps:.72,rearDelts:.68,scapular:.78},qualities:{strength:7,hypertrophy:9,power:3,skill:5,stability:8,core:6,endurance:7}};
const bad=S.score(row,dip),good=S.score(row,ringRow2);
assert(bad.score<40,"Ring Dip should be a low-fit replacement for Ring Row");
assert(bad.plannedAction==="pull"&&bad.actualAction==="push","push/pull mismatch detected");
assert(good.score>bad.score,"similar row variant should score higher");
console.log("v7.12 substitution intelligence tests: PASS",{ringRowToRingDip:bad.score,ringRowToElevatedRow:good.score});
