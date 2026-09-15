
const fs=require("fs"),src=fs.readFileSync("nutrition-impact-engine.js","utf8");
function ok(x,m){if(!x)throw new Error(m)}
ok(src.includes("const hasWaterRecord="),"water-record helper missing");
ok(src.includes("function rollingHydration"),"rolling hydration missing");
ok(src.includes("today=nutritionMetricsForDate(key)"),"Hydration is not based on today");
ok(src.includes("Bugün ${s.hydr.liters.toFixed(1)} L"),"UI does not identify today's water");
ok(!src.includes('const target=(db.settings.targetWater||3)*1000'),"old fixed target source remains");
console.log("v7.20 hydration dilution regression test: PASS");
