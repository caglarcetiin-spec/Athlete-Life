
const fs=require("fs"),vm=require("vm");
const src=fs.readFileSync("nutrition-impact-engine.js","utf8");
const date="2026-09-15";
const db={
 settings:{targetCalories:2800,targetWater:3,targetSleep:8},
 daily:{[date]:{weight:72}},
 foodLogs:{},
 water:{[date]:1500},
 waterLogs:{[date]:[{id:"w1",ml:1000},{id:"w2",ml:500}]},
 bodyMeasurements:[],trainingLogs:{},sessionFeedback:{},adHocSessions:[]
};
const elements={};
const context={
 window:{},
 db,
 fetch:()=>Promise.reject(new Error("offline test")),
 todayKey:()=>date,
 addDaysKey:(k,d)=>{const x=new Date(k+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+d);return x.toISOString().slice(0,10)},
 avg:a=>a.length?a.reduce((s,x)=>s+(+x||0),0)/a.length:0,
 clamp:(x,a,b)=>Math.max(a,Math.min(b,+x||0)),
 mins:t=>0,sleepDuration:d=>480,currentBodyWeightScience:()=>72,
 nutritionMetricsForDate:k=>{
   const direct=(db.waterLogs[k]||[]).reduce((s,x)=>s+x.ml,0);
   return {kcal:0,protein:0,carbs:0,fat:0,fiber:0,caffeine:0,microScore:0,sodium:0,potassium:0,calcium:0,iron:0,magnesium:0,zinc:0,vitC:0,vitD:0,b12:0,folate:0,
    water:direct,hydration:{totalWaterL:direct/1000,totalWaterMl:direct,directWaterMl:direct,foodWaterMl:0,score:70,lowL:2.2,highL:2.9,confidence:58,status:"below_range",title:"test",message:"test"}};
 },
 q:id=>elements[id]||(elements[id]={textContent:"",innerHTML:""}),
 document:{readyState:"loading",addEventListener:()=>{},querySelector:()=>null},
 console
};
context.window=context;context.window.HydrationIntelligence={averageEstimate:()=>({lowL:2.2,highL:2.9,confidence:58})};context.window.AthleteLoadMesh={rolling:()=>({})};
vm.createContext(context);vm.runInContext(src,context);
function a(x,m){if(!x)throw new Error(m)}

let b=context.NutritionImpact.build();
a(b.hydr.recorded===true,"today Water Ledger must be recorded");
a(Math.abs(b.hydr.liters-1.5)<.001,"Hydration must read 1.5L Water Ledger, got "+b.hydr.liters);
a(Math.abs(b.hydr.directLiters-1.5)<.001,"direct water breakdown");
a(b.hydr.rolling.days===1,"rolling hydration should count water-recorded day");

db.water[date]=2000;db.waterLogs[date].push({id:"w3",ml:500});
b=context.NutritionImpact.build();
a(Math.abs(b.hydr.liters-2.0)<.001,"after +500ml Hydration should read 2.0L, got "+b.hydr.liters);

db.waterLogs[date]=db.waterLogs[date].filter(x=>x.id!=="w3");db.water[date]=1500;
b=context.NutritionImpact.build();
a(Math.abs(b.hydr.liters-1.5)<.001,"after delete Hydration should return to 1.5L");

console.log("v7.20 Nutrition Impact ↔ Water Ledger sync tests: PASS",JSON.stringify({liters:b.hydr.liters,recorded:b.hydr.recorded,rollingDays:b.hydr.rolling.days}));
