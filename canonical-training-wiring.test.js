
const fs=require("fs");
const app=fs.readFileSync("app.js","utf8"),guided=fs.readFileSync("guided-workout-engine.js","utf8"),
      adaptive=fs.readFileSync("adaptive-intelligence.js","utf8"),html=fs.readFileSync("index.html","utf8");
function a(x,m){if(!x)throw new Error(m)}
a(html.includes("canonical-session-engine.js?v=9.0"),"canonical engine not loaded");
a(app.includes("function canonicalTemplate(k)"),"today/coach canonical helper missing");
a(app.includes("CanonicalSessionEngine?.get?.(k)")&&app.includes("canonical-preview"),"weekly renderer not canonical");
a(app.includes("renderTrainingPlanSyncV81"),"3-way sync UI missing");
a(guided.includes("CanonicalSessionEngine?.template?.(target)"),"Guided planItems not canonical");
a(guided.includes('CanonicalSessionEngine?.lock?.(s.targetDate,"guided_first_set"'),"Guided first set does not lock canonical prescription");
a(guided.includes("canonicalSnapshotId"),"Guided does not retain canonical snapshot id");
a(guided.includes("function syncPlanNow()")&&html.includes('id="guidedSyncPlan"'),"manual Guided plan sync missing");
a(guided.includes("function resetSessionTimer()")&&html.includes('id="guidedResetTimer"'),"timer reset missing");
a(guided.includes("function restartWorkout()")&&html.includes('id="guidedRestartWorkout"'),"workout restart missing");
a(guided.includes("timingStartedAt:null")&&guided.includes("if(!s.timingStartedAt)"),"timer must wait for first set");
a(adaptive.includes("CanonicalSessionEngine?.get?.(target)"),"Session Router not canonical-aware");
a(app.includes('if(!window.CanonicalSessionEngine?.isLocked?.(k))delete db.futurePlans[k]'),"optimizer can overwrite locked session");
console.log("v9.0 training 3-way canonical wiring tests: PASS");
