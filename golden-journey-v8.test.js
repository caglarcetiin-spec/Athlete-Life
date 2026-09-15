
const fs=require("fs");
const app=fs.readFileSync("app.js","utf8"),html=fs.readFileSync("index.html","utf8"),boot=fs.readFileSync("architecture-bootstrap.js","utf8");
function a(x,m){if(!x)throw new Error(m)}
const modules=["engine-bus.js","data-lineage-engine.js","schema-migration-engine.js","event-store-engine.js","performance-trend-v2.js","personal-calibration-engine.js","tissue-load-engine.js","adaptive-nutrition-engine.js","adaptive-coach-solver.js","release-integrity-v8.js","architecture-bootstrap.js"];
for(const f of modules)a(html.includes(f),f+" not loaded");
a(app.includes('AthleteEventStore?.append?.("FOOD_LOGGED"'),"food not dual-written to event store");
a(app.includes('AthleteEventStore?.append?.("WATER_LOGGED"'),"water not dual-written");
a(app.includes('AthleteEventStore?.append?.("WATER_DELETED"'),"water delete event missing");
a(app.includes('AthleteEventStore?.append?.("DAILY_CHECKIN_RECORDED"'),"daily check-in event missing");
a(app.includes('TRAINING_ROW_RECORDED'),"training event missing");
a(app.includes("renderArchitectureV8"),"architecture UI missing");
a(boot.includes("EngineBus")&&boot.includes("bootstrapFromLegacy"),"bootstrap not wiring event/bus");
console.log("v8 golden journey static contracts: PASS");
