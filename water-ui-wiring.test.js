
const fs=require("fs"),a=fs.readFileSync("app.js","utf8"),h=fs.readFileSync("index.html","utf8");
function ok(x,m){if(!x)throw new Error(m)}
ok(h.includes('waterLedgerList'),"list");ok(h.includes('water-ledger-engine.js?v=7.18'),"script");
ok(a.includes("WaterLedger?.append"),"append");ok(a.includes("WaterLedger?.removeById"),"remove");ok(a.includes("removeWaterLog"),"action");
console.log("v7.18 water UI wiring tests: PASS");
