
global.window=global;
const N=require("./nutrition-ledger-engine.js");
function a(x,m){if(!x)throw new Error(m)}
const db={foodLogs:{}},date="2026-09-15";
const water=N.snapshot({id:"water",n:"Maden suyu",cat:"İçecek",serv:"200 ml",water:200,calcium:100,magnesium:30,sodium:120,kcal:0,p:0,c:0,f:0},1,"Ara","12:00");
const meat=N.snapshot({id:"meat",n:"Köfte",cat:"Et",serv:"150 g",kcal:330,p:30,c:8,f:20,iron:3,zinc:5},1,"Öğle","13:00");

a(N.append(db,date,water).ok,"first append");
a(N.append(db,date,meat).ok,"second append");
a(db.foodLogs[date].length===2,"append must preserve first");

const waterId=db.foodLogs[date][0].logId, meatId=db.foodLogs[date][1].logId;
const meatEdited=N.snapshot({id:"meat",n:"Köfte",cat:"Et",serv:"150 g",kcal:330,p:30,c:8,f:20,iron:3,zinc:5},1.5,"Akşam","19:00");
const up=N.updateById(db,date,meatId,meatEdited);
a(up.ok&&db.foodLogs[date].length===2,"edit must not change row count");
a(db.foodLogs[date][1].logId===meatId,"edit must preserve stable logId");
a(db.foodLogs[date][1].servings===1.5,"serving edit");
a(Math.round(db.foodLogs[date][1].kcal)===495,"nutrients must recalc after serving edit");
a(db.foodLogs[date][0].logId===waterId,"editing meatball must not mutate mineral water");

let t=N.totals(db.foodLogs[date],[]);
a(t.water===200&&Math.round(t.kcal)===495&&t.calcium===100,"totals after edit");

const del=N.removeById(db,date,waterId);
a(del.ok&&db.foodLogs[date].length===1,"delete one food only");
a(db.foodLogs[date][0].logId===meatId,"remaining food should be meatball");

t=N.totals(db.foodLogs[date],[]);
a(t.water===0&&Math.round(t.kcal)===495&&Math.round(t.p)===45,"totals recalc after delete");

const json=JSON.parse(JSON.stringify(db));
a(json.foodLogs[date].length===1&&json.foodLogs[date][0].logId===meatId,"persistence roundtrip");

console.log("v7.16 nutrition edit/delete tests: PASS",JSON.stringify({rows:db.foodLogs[date].length,kcal:t.kcal,protein:t.p,stableId:meatId}));
