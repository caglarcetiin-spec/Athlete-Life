(function(){
"use strict";
const V="9.2";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,+v||0));
const POLICY={
 hypertrophy:{weeklySetsReference:10,productiveMin:6,softUpper:18,rirTarget:[1,3],frequencyPreferred:[2,4],restCompound:[120,240],restIsolation:[60,180]},
 strength:{heavyPct1RM:80,setsPerExercise:[2,5],rirTarget:[1,4],rest:[180,300]},
 power:{pct1RM:[30,70],repsPerSet:[1,6],intent:"max_concentric_velocity"},
 skill:{order:"first_when_fresh",fatigueCeiling:72,qualityPriority:true},
 calisthenics:{staticQualityDropStopPct:20,weightedProgressionStepPct:[2,5],relativeStrengthPriority:true},
 recovery:{minimumSleepHours:7,preferredSleepHours:[7.5,9],proteinGPerKg:[1.6,2.2],loadHalfLifeHours:30}
};
function db(){return window.ALOSRuntime?.getDb?.()||window.db||{}}
function addDays(key,n){const d=new Date(key+"T12:00:00");d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function sleepHours(d){if(!d?.sleepTime||!d?.wakeTime)return 0;const m=t=>{const [h,x]=String(t).split(":").map(Number);return h*60+x};let v=m(d.wakeTime)-m(d.sleepTime);if(v<0)v+=1440;return Math.max(0,v-(+d.nightAwake||0))/60}
function bodyweight(){const keys=Object.keys(db().daily||{}).sort().reverse();for(const k of keys){const w=+db().daily[k]?.weight;if(w>0)return w}return +db().settings?.targetWeight||70}
function rowSets(r){return (r?.sets||[]).filter(x=>+x>0).length}
function recentRows(date,days=7){const out=[];for(let i=0;i<days;i++){const k=addDays(date,-i);(db().trainingLogs?.[k]||[]).forEach(r=>out.push(r))}return out}
function muscleVolume(date){const out={};recentRows(date,7).forEach(r=>{const map=window.V5_EXERCISE_MUSCLES?.[r.name]||{};const n=rowSets(r);Object.entries(map).forEach(([m,c])=>out[m]=(out[m]||0)+n*c)});return out}
function exerciseScore(name,date,type){
 const k=window.EXERCISE_KNOWLEDGE?.[name]||{},s=window.EXERCISE_SCIENCE?.[name]||{},vol=muscleVolume(date),muscles=k.muscles||window.V5_EXERCISE_MUSCLES?.[name]||{};
 let score=50,why=[];
 const skill=+(k.qualities?.skill??s.skill??0),hyp=+(k.qualities?.hypertrophy??s.hypertrophy??0),str=+(k.qualities?.strength??s.strength??0);
 if(["push","pull","legs"].includes(type)){score+=hyp*1.4+str*.8}
 if(skill>=7){score+=4;why.push("skill-specificity")}
 const primary=Object.entries(muscles).sort((a,b)=>b[1]-a[1])[0]?.[0];if(primary){const v=vol[primary]||0;if(v<POLICY.hypertrophy.productiveMin){score+=8;why.push("under-target muscle volume")}if(v>POLICY.hypertrophy.softUpper){score-=12;why.push("weekly volume already high")}}
 const pain=window.PainIntelligence?.exerciseAdvice?.(name,date);if((pain?.level||0)>=2){score-=30;why.push("pain compatibility")}
 const hist=Object.values(db().trainingLogs||{}).flat().filter(r=>r?.name===name);if(hist.length){score+=5;why.push("progression continuity")}
 return {score,why};
}
function optimizeTemplate(date,type,template){
 if(!template?.items)return template;
 // v9.2 Program Engine rule: science may score/audit the planned exercises but it may
 // not silently reorder or replace them. Progression continuity and skill practice are
 // part of the prescription. Any variation must be an explicit pain/health substitution.
 const arr=template.items.map((x,i)=>({x,i,...exerciseScore(x[0]||x.name,date,type)}));
 return {...template,items:arr.map(o=>o.x),scienceAudit:{version:V,policy:"stable_program_continuity",scores:arr.map(o=>({name:o.x[0]||o.x.name,score:Math.round(o.score),why:o.why}))}};
}
function recoveryEnvironment(date){
 const d=db().daily?.[date]||{},sleep=sleepHours(d),bw=bodyweight();
 const rows=db().foodLogs?.[date]||[];const totals=window.NutritionLedger?.totals?.(rows,window.NUTRITION_LIBRARY||[])||{};
 const waterRows=db().waterLogs?.[date],drinkMl=Array.isArray(waterRows)?waterRows.reduce((s,r)=>s+Math.max(0,+r.ml||0),0):(+db().water?.[date]||0);
 const protein=+totals.p||0,water=(drinkMl/1000)+((+totals.water||0)/1000),targetWater=+db().settings?.targetWater||3;
 const sleepScore=sleep?clamp((sleep-5)/3.5,0,1):.72,proteinScore=protein?clamp(protein/(bw*1.6),0,1):.75,energyScore=totals.kcal?clamp(+totals.kcal/(+db().settings?.targetCalories||2800),.55,1):.78,hydrationScore=water?clamp(water/targetWater,.5,1):.8;
 return {sleepHours:sleep,proteinG:protein,score:clamp(.42*sleepScore+.28*proteinScore+.18*energyScore+.12*hydrationScore,.45,1.05)};
}
function audit(date,type,template){return {version:V,date,type,policy:POLICY,volume:muscleVolume(date),template:optimizeTemplate(date,type,template)?.scienceAudit||null}}
window.SportsSciencePolicy={version:V,policy:POLICY,optimizeTemplate,exerciseScore,muscleVolume,recoveryEnvironment,audit};
})();
