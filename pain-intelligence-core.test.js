
const C=require("./pain-intelligence-core.js");
function assert(x,m){if(!x)throw new Error(m)}
const rows=[
 {date:"2026-09-14",joint:"wrist",side:"left",severity:6,status:"active",redFlags:{}},
 {date:"2026-09-13",joint:"knee",side:"right",severity:4,status:"resolved",resolvedAt:"2026-09-15T09:00:00",redFlags:{}},
 {date:"2026-09-12",joint:"shoulder",side:"left",severity:8,status:"active",onset:"trauma",redFlags:{}}
];
assert(C.activeAtDate(rows[0],"2026-09-15"),"left wrist active");
assert(C.activeAtDate(rows[1],"2026-09-14"),"resolved knee was active before resolve date");
assert(!C.activeAtDate(rows[1],"2026-09-15"),"resolved knee inactive on resolved date");
assert(C.maxSeverity(rows,"2026-09-15")===8,"max severity");
assert(C.redFlag(rows[2]),"trauma red flag");
assert(C.sideCompatible("left","bilateral"),"bilateral movement uses left");
assert(!C.sideCompatible("left","right"),"right-only movement should not consume left pain");
const agg=C.aggregate(rows,"2026-09-15");
assert(agg.wrist===6&&agg.shoulder===8&&agg.knee===0,"aggregate active pain");
console.log("v7.7 pain intelligence core tests: PASS");
