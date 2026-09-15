
global.window=global;global.WaterLedger={total:(db,d)=>+db.water?.[d]||0};
const H=require("./hydration-intelligence-engine.js");function a(x,m){if(!x)throw new Error(m)}
const d="2026-09-15",db={settings:{targetWater:3},daily:{[d]:{weight:72,runMinutes:0,runRpe:0}},water:{[d]:2400},bodyMeasurements:[],sessionFeedback:{},adHocSessions:[]};
let x=H.context(db,d,{foodWaterMl:200});
a(x.lowL>=2.1&&x.highL<=3.0,"rest range "+JSON.stringify(x));a(x.status==="within","2.6L should be within");a(!x.message.includes("daha su içmen"),"no fake exact deficit");
db.water[d]=1200;x=H.context(db,d,{foodWaterMl:200});a(["low_recorded","below_range"].includes(x.status),"low state");a(x.message.includes("dehidrasyon")||x.message.includes("Kesin"),"uncertainty text");
db.water[d]=2400;db.daily[d].runMinutes=60;db.daily[d].runRpe=9;x=H.context(db,d,{foodWaterMl:200});
a(x.highL>3.2&&x.lowL>2.4,"exercise range "+JSON.stringify(x));a(x.confidence<70,"no sweat rate = moderate confidence");
const y=H.estimate({bodyWeight:72,exerciseMinutes:60,rpe:9,sweatRateMlPerHr:900});a(y.sweatRateKnown&&y.confidence>=80,"sweat rate confidence");
console.log("v7.19 hydration intelligence tests: PASS",JSON.stringify({exercise:[x.lowL,x.highL],confidence:x.confidence}));
