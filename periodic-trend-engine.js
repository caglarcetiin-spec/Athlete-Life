
(function(){
"use strict";
const V="7.15";
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,+x||0));
const avg=a=>a?.length?a.reduce((s,x)=>s+(+x||0),0)/a.length:0;
const median=a=>{a=(a||[]).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
const PERIODS={weekly:{label:"Haftalık",days:7},monthly:{label:"Aylık",days:28},cycle:{label:"12 Hafta",days:42}};
function dateNum(k){return new Date(k+"T12:00:00").getTime()}
function bwAt(date){
 const d=window.db?.daily?.[date];if(+d?.weight>0)return +d.weight;
 try{return window.currentBodyWeightScience?.()||72}catch(e){return 72}
}
function scoreRow(row,date){
 const k=window.EXERCISE_KNOWLEDGE?.[row.name]||{},sets=(row.sets||[]).map(Number).filter(x=>x>0),best=Math.max(0,...sets),total=sets.reduce((a,b)=>a+b,0);
 if(!sets.length)return null;
 if(k.metric==="seconds"||row.type==="STATIC")return best*.76+total*.24;
 if(k.metric==="km"){
   const mins=+row.sessionDurationMin||+window.db?.sessionFeedback?.[date]?.duration||0;
   return mins>0?total/(mins/60):total;
 }
 if(k.doseModel==="sprint_work_seconds"){
   const dist=+row.sprintDistanceM||0;return dist&&best?dist/best:1/Math.max(.1,best);
 }
 const load=+row.load||0;
 if(load>0||["WEIGHTED","BARBELL"].includes(row.type)){
   const system=["Weighted Pull-Up","Weighted Ring Dip","Weighted Dip"].includes(row.name)?bwAt(date)+load:load;
   return system>0?system*(1+best/30):best;
 }
 return best+total*.08;
}
function rows(name,start,end){
 const out=[];Object.entries(window.db?.trainingLogs||{}).forEach(([date,rs])=>{
   if(date<start||date>end)return;(rs||[]).forEach(r=>{if(r.name===name&&!r.approximateBackfill&&!(r.source==="ad_hoc"&&r.sessionStructure!=="straight_sets")){const score=scoreRow(r,date);if(score!=null&&score>0)out.push({date,score,row:r})}})
 });return out.sort((a,b)=>a.date.localeCompare(b.date));
}
function addDays(k,d){return window.addDaysKey?window.addDaysKey(k,d):new Date(dateNum(k)+d*86400000).toISOString().slice(0,10)}
function classify(delta,count,periodDays,readinessDelta=0){
 if(delta==null)return "insufficient";
 if(delta>=3)return "rising";
 if(delta<=-3)return "declining";
 if(count>=4&&periodDays>=28)return "plateau";
 return "stable";
}
function exerciseTrend(name,period="monthly",end=window.todayKey?.()||new Date().toISOString().slice(0,10)){
 const pd=PERIODS[period]?.days||28,priorStart=addDays(end,-pd*2+1),mid=addDays(end,-pd+1);
 const prior=rows(name,priorStart,addDays(mid,-1)),recent=rows(name,mid,end),all=[...prior,...recent];
 if(!prior.length||!recent.length)return {name,period,state:"insufficient",delta:null,confidence:Math.min(45,all.length*12),count:all.length,priorCount:prior.length,recentCount:recent.length};
 const p=Math.max(...prior.map(x=>x.score)),r=Math.max(...recent.map(x=>x.score)),delta=p?((r-p)/p*100):null;
 const state=classify(delta,all.length,pd),coverage=Math.min(1,(prior.length+recent.length)/Math.max(4,pd/7));
 return {name,period,state,delta,priorBest:p,recentBest:r,count:all.length,priorCount:prior.length,recentCount:recent.length,confidence:Math.round(45+coverage*50)};
}
function readinessDelta(period,end){
 const pd=PERIODS[period]?.days||28,vals=(a,b)=>{const x=[];for(let k=a;k<=b;k=addDays(k,1)){const r=window.readiness?.(window.db?.daily?.[k]);if(r!=null)x.push(r);if(k===b)break}return x};
 const mid=addDays(end,-pd+1),priorStart=addDays(end,-pd*2+1),a=vals(priorStart,addDays(mid,-1)),b=vals(mid,end);
 return a.length&&b.length?avg(b)-avg(a):null;
}
function summary(period="monthly",end=window.todayKey?.()||new Date().toISOString().slice(0,10)){
 const pd=PERIODS[period]?.days||28,names=[...new Set(Object.values(window.db?.trainingLogs||{}).flat().map(r=>r.name).filter(Boolean))];
 const trends=names.map(n=>exerciseTrend(n,period,end)).filter(x=>x.state!=="insufficient").sort((a,b)=>Math.abs(b.delta||0)-Math.abs(a.delta||0));
 const rd=readinessDelta(period,end),deltas=trends.map(x=>x.delta).filter(Number.isFinite),delta=median(deltas);
 const healthStart=addDays(end,-pd+1),healthDays=Object.entries(window.db?.daily||{}).filter(([k,d])=>k>=healthStart&&k<=end&&((d.healthStatus&&d.healthStatus!=="normal")||(+d.fatigueLevel||0)>=5||(+d.illnessSeverity||0)>=2)).length;
 let state=classify(delta,trends.reduce((s,x)=>s+x.count,0),pd,rd),comment="";
 if(!trends.length){state="insufficient";comment="Bu dönem için karşılaştırılabilir performans kaydı henüz yetersiz."}
 else if(state==="rising")comment=`Performans medyanı önceki döneme göre yaklaşık +${delta.toFixed(1)}%. Yükseliş var; mevcut progresyon işe yarıyor.`;
 else if(state==="declining")comment=`Performans medyanı önceki döneme göre yaklaşık ${delta.toFixed(1)}%. Düşüş var; recovery, hastalık, ağrı, enerji alımı ve training load birlikte kontrol edilmeli.${healthDays?` Bu dönemde ${healthDays} sağlık/halsizlik günü kaydı var; düşüşün tamamını gerçek kapasite kaybı olarak yorumlama.`:""}`;
 else if(state==="plateau")comment=rd!=null&&rd<-5?"Performans yatay ama readiness de geriliyor; gerçek plato demeden önce fatigue/recovery etkisini çöz.":"Performans değişimi küçük ve veri yeterli: plato adayı. Hacim, yoğunluk, egzersiz varyasyonu veya deload yanıtı değerlendirilebilir.";
 else comment="Performans büyük ölçüde stabil; henüz kesin yükseliş/düşüş/plato sinyali yok.";
 const confidence=Math.round(clamp(trends.length*10+trends.reduce((s,x)=>s+x.confidence,0)/Math.max(1,trends.length)*.55,0,96));
 return {version:V,period,label:PERIODS[period]?.label||period,state,delta,confidence,readinessDelta:rd,healthDays,trends,comment};
}
function stateLabel(s){return {rising:"YÜKSELİŞ",declining:"DÜŞÜŞ",plateau:"PLATO",stable:"STABİL",insufficient:"VERİ YETERSİZ"}[s]||s}
function render(){
 const root=document.getElementById("periodicTrendPanel");if(!root)return;
 const active=document.querySelector(".periodic-trend-tab.active")?.dataset.period||"monthly",s=summary(active);
 const cls=s.state==="rising"?"good":s.state==="declining"?"bad":s.state==="plateau"?"warn":"neutral";
 const top=s.trends.slice(0,8);
 document.getElementById("periodicTrendBadge").textContent=`${stateLabel(s.state)} · ${s.confidence}/100`;
 document.getElementById("periodicTrendBadge").className=`plan-badge ${cls}`;
 document.getElementById("periodicTrendSummary").className=`insight-box ${cls}`;
 document.getElementById("periodicTrendSummary").innerHTML=`<strong>${s.label}: ${stateLabel(s.state)}</strong><br>${s.comment}${s.readinessDelta==null?"":`<br>Readiness değişimi: ${s.readinessDelta>=0?"+":""}${s.readinessDelta.toFixed(1)} puan.`}`;
 document.getElementById("periodicTrendMovements").innerHTML=top.length?top.map(x=>`<div class="trend-row ${x.state}"><strong>${x.name}</strong><span>${stateLabel(x.state)}</span><b>${x.delta>=0?"+":""}${x.delta.toFixed(1)}%</b><small>güven ${x.confidence}/100 · ${x.recentCount}+${x.priorCount} kayıt</small></div>`).join(""):'<div class="record-empty">Karşılaştırılabilir hareket verisi yok.</div>';
}
function init(){
 document.querySelectorAll(".periodic-trend-tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".periodic-trend-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");render()}));
 render();
}
const API={version:V,scoreRow,exerciseTrend,summary,stateLabel,render};
window.PeriodicTrendEngine=API;
if(typeof module!=="undefined"&&module.exports)module.exports=API;
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
})();
