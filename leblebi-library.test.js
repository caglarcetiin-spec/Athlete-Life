
const fs=require("fs"),vm=require("vm"),src=fs.readFileSync("nutrition-library.js","utf8"),ctx={window:{}};vm.createContext(ctx);vm.runInContext(src,ctx);
const l=ctx.window.NUTRITION_LIBRARY.find(x=>x.n==="Leblebi, sarı (kavrulmuş, tuzsuz)");if(!l)throw new Error("missing");
if(l.cat!=="Kuruyemiş & Tohum")throw new Error("category");for(const k of ["kcal","p","c","f","fiber","potassium","magnesium","iron","folate"])if(!Number.isFinite(+l[k]))throw new Error(k);
console.log("v7.19 leblebi library test: PASS",JSON.stringify({serv:l.serv,kcal:l.kcal,p:l.p,c:l.c,f:l.f,fiber:l.fiber}));
