
global.window=global;
global.document={
 readyState:"complete",
 getElementById:()=>null,
 addEventListener:()=>{}
};
global.confirm=()=>true;
global.alert=(m)=>{throw new Error("unexpected alert: "+m)};

const N=require("./nutrition-ledger-engine.js");
global.NutritionLedger=N;

const date="2026-09-15";
const db={foodLogs:{}};
const foods=[
 {id:"water",n:"Maden suyu",cat:"İçecek",serv:"200 ml",kcal:0,p:0,c:0,f:0,water:200,calcium:100,magnesium:30,sodium:120},
 {id:"meat",n:"Köfte",cat:"Et",serv:"150 g",kcal:330,p:30,c:8,f:20,iron:3,zinc:5}
];

let saves=0,renders=0;
global.ALOSRuntime={
 getDb:()=>db,
 getFoods:()=>foods,
 save:()=>{saves++},
 renderNutrition:()=>{renders++},
 renderAnalytics:()=>{},
 renderReports:()=>{}
};

// IMPORTANT: these are intentionally undefined to reproduce the old bug.
if(global.db!==undefined)delete global.db;
if(global.FOODS!==undefined)delete global.FOODS;

const w=N.snapshot(foods[0],1,"Ara","12:00");
const k=N.snapshot(foods[1],1,"Öğle","13:00");
N.append(db,date,w);N.append(db,date,k);

require("./nutrition-record-engine.js");
function a(x,m){if(!x)throw new Error(m)}

a(NutritionRecordEngine._currentDb()===db,"editor must use runtime db getter");
a(NutritionRecordEngine._foods().length===2,"editor must use runtime foods getter");
a(NutritionRecordEngine._rowById(date,w.logId)?.name==="Maden suyu","row lookup through runtime bridge");

NutritionRecordEngine.remove(date,w.logId);
a(db.foodLogs[date].length===1,"daily UI delete must remove exactly one row");
a(db.foodLogs[date][0].name==="Köfte","meatball must remain after deleting mineral water");
a(saves===1,"delete must persist through runtime save");
a(renders===1,"delete must re-render daily nutrition");

NutritionRecordEngine.duplicate(date,k.logId);
a(db.foodLogs[date].length===2,"duplicate must append");
a(db.foodLogs[date][0].name==="Köfte"&&db.foodLogs[date][1].name==="Köfte","duplicate should preserve original and add copy");
a(saves===2&&renders===2,"duplicate must save/render");

console.log("v7.17 nutrition UI runtime bridge tests: PASS",JSON.stringify({rows:db.foodLogs[date].length,saves,renders,names:db.foodLogs[date].map(x=>x.name)}));
