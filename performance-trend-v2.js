
(function(){
"use strict";
const V="8.0",avg=a=>a.length?a.reduce((s,x)=>s+(+x||0),0)/a.length:0;
function score(row,date){
 const k=window.EXERCISE_KNOWLEDGE?.[row.name]||{},sets=(row.sets||[]).map(Number).filter(x=>x>0),best=Math.max(0,...sets),total=sets.reduce((a,b)=>a+b,0),rir=Number.isFinite(+row.rir)?+row.rir:2,rest=(row.restBetweenSets||[]).map(Number).filter(Boolean);
 const medRest=rest.length?rest.sort((a,b)=>a-b)[Math.floor(rest.length/2)]:0,bw=window.LoadPrescriptionEngine?.bodyweight?.()||72;
 if(k.metric==="seconds"||row.type==="STATIC"){
   const decay=sets.length>1?(sets.at(-1)/Math.max(1,sets[0])):1;return best*.55+total*.25+decay*10+rir*1.5;
 }
 if(+row.load>0||["WEIGHTED","BARBELL"].includes(row.type)){
   const sys=/Weighted Pull-Up|Weighted Ring Dip/.test(row.name)?bw+(+row.load||0):(+row.load||0);
   return sys*(1+best/30)*(1+rir*.015)*(1+(medRest?Math.max(-.08,Math.min(.08,(180-medRest)/180*.08)):0));
 }
 return best+total*.08+rir*.5;
}
function series(name,days=84,end=window.todayKey?.()){
 const start=window.addDaysKey?.(end,-days+1)||end,out=[];Object.entries(window.ALOSRuntime?.getDb?.().trainingLogs||{}).forEach(([date,rows])=>{
  if(date<start||date>end)return;(rows||[]).forEach(r=>{if(r.name===name&&!r.approximateBackfill)out.push({date,value:score(r,date),row:r})})
 });return out.sort((a,b)=>a.date.localeCompare(b.date));
}
function trend(name,days=28,end=window.todayKey?.()){
 const s=series(name,days*2,end);if(s.length<4)return {name,state:"insufficient",confidence:25,count:s.length};
 const mid=window.addDaysKey?.(end,-days+1),a=s.filter(x=>x.date<mid),b=s.filter(x=>x.date>=mid);if(!a.length||!b.length)return {name,state:"insufficient",confidence:30,count:s.length};
 const av=avg(a.map(x=>x.value)),bv=avg(b.map(x=>x.value)),delta=av?((bv-av)/av*100):0;
 const state=delta>=3?"rising":delta<=-3?"declining":s.length>=6?"plateau":"stable";
 return {name,state,delta,confidence:Math.min(95,45+s.length*6),count:s.length,prior:av,recent:bv};
}
function summary(period="monthly",end=window.todayKey?.()){
 const days=period==="weekly"?7:period==="cycle"?42:28,names=[...new Set(Object.values(window.ALOSRuntime?.getDb?.().trainingLogs||{}).flat().map(r=>r.name).filter(Boolean))];
 const items=names.map(n=>trend(n,days,end)).filter(x=>x.state!=="insufficient"),d=items.map(x=>x.delta).filter(Number.isFinite);
 const med=d.length?[...d].sort((a,b)=>a-b)[Math.floor(d.length/2)]:null;
 const state=med==null?"insufficient":med>=3?"rising":med<=-3?"declining":items.length>=3?"plateau":"stable";
 return {version:V,period,state,delta:med,confidence:Math.min(95,35+items.length*8),items,
  comment:state==="rising"?"Çoklu performans göstergelerinde yükseliş var.":state==="declining"?"Birden fazla performans göstergesi geriliyor; recovery, illness, load ve enerji bağlamını incele.":state==="plateau"?"Performans büyük ölçüde yatay; RIR/rest/bodyweight düzelmesi varsa bunu gizli ilerleme olarak ayrıca değerlendir.":"Trend için veri sınırlı."};
}
window.PerformanceTrendV2={version:V,score,series,trend,summary};
})();
