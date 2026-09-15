
global.window=global;
const H=require("./health-state-engine.js");
function a(x,m){if(!x)throw new Error(m)}
let x=H.assess({healthStatus:"normal",fatigueLevel:0,illnessSeverity:0});
a(x.action==="normal"&&x.readinessPenalty===0,"healthy");
x=H.assess({healthStatus:"fatigued",fatigueLevel:8});
a(x.volumeFactor<.6&&x.readinessPenalty>=20,"fatigue reduction");
x=H.assess({healthStatus:"sick",illnessSeverity:8,healthFever:true});
a(x.action==="stop_hard_training"&&x.volumeFactor===0&&x.redFlag,"sick guard");
console.log("v7.15 health-state tests: PASS");
