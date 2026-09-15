
const fs=require("fs"),a=fs.readFileSync("app.js","utf8"),n=fs.readFileSync("nutrition-impact-engine.js","utf8");
function ok(x,m){if(!x)throw new Error(m)}
ok(a.includes("HydrationIntelligence?.context"),"context missing");ok(!a.includes("daha su içmen hedefe ulaşmanı sağlar"),"old liter advice remains");ok(!a.includes("ml su eksik"),"old ml deficit remains");ok(n.includes("targetLowL")&&n.includes("targetHighL"),"impact range missing");
console.log("v7.19 hydration advice wiring tests: PASS");
