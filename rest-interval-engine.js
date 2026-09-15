
(function(){
"use strict";

let evidence=null;
let timerHandle=null,timerRemaining=0,timerRunning=false;

fetch("rest-interval-evidence.json").then(r=>r.json()).then(x=>{evidence=x;renderEvidenceNote()}).catch(()=>{});

function currentExercise(){
 const idx=Number(q("exerciseSelect")?.value);
 return EXERCISES?.[idx]||null;
}
function currentTarget(){
 try{return selectedSessionTargetKey()}catch(e){return todayKey()}
}
function currentReadiness(){
 const k=currentTarget(),d=db.daily?.[k];return d?readiness(d):null;
}
function prescription(){
 const e=currentExercise();return restIntervalPrescription(e?.n||"",currentReadiness());
}
function setRestInputFromExercise(force=false){
 const e=currentExercise();if(!e)return;
 const r=prescription(),inp=q("exerciseRestPlanned");
 if(inp&&(force||!inp.dataset.manual)){inp.value=r.target;inp.dataset.autoValue=r.target}
 renderRecommendation();
 resetTimer(true);
}
function renderRecommendation(){
 const el=q("restRecommendationBox"),e=currentExercise();if(!el||!e)return;
 const r=prescription(),custom=+q("exerciseRestPlanned")?.value||r.target;
 el.innerHTML=`<div><strong>${e.n} · önerilen set arası dinlenme</strong><span>${fmtRestSec(r.min)}–${fmtRestSec(r.max)} · hedef ${fmtRestSec(custom)}</span></div>
 <p>${r.kind}. Amaç bir sonraki setin teknik/kuvvet kalitesini korumak. Hedef süre zorunlu değildir; performans düşüyorsa bandın üst tarafına çıkabilirsin.</p>`;
}
function fmtTimer(sec){
 sec=Math.max(0,Math.round(sec));return `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
}
function updateTimer(){
 if(q("restTimerDisplay"))q("restTimerDisplay").textContent=fmtTimer(timerRemaining);
 const st=q("restTimerStatus");if(st)st.textContent=timerRunning?"Dinlenme devam ediyor…":timerRemaining===0?"Dinlenme tamamlandı.":"Önerilen dinlenme süresini kullanır.";
}
function resetTimer(toPlan=true){
 clearInterval(timerHandle);timerHandle=null;timerRunning=false;
 if(toPlan)timerRemaining=+q("exerciseRestPlanned")?.value||prescription().target||120;
 updateTimer();if(q("restTimerStart"))q("restTimerStart").textContent="Başlat";
}
function startPauseTimer(){
 if(timerRunning){
   clearInterval(timerHandle);timerHandle=null;timerRunning=false;if(q("restTimerStart"))q("restTimerStart").textContent="Devam";updateTimer();return;
 }
 if(timerRemaining<=0)resetTimer(true);
 timerRunning=true;if(q("restTimerStart"))q("restTimerStart").textContent="Duraklat";updateTimer();
 timerHandle=setInterval(()=>{
   timerRemaining--;
   if(timerRemaining<=0){
     clearInterval(timerHandle);timerHandle=null;timerRunning=false;timerRemaining=0;
     if(q("restTimerStart"))q("restTimerStart").textContent="Tekrar Başlat";
     if(q("restTimerStatus"))q("restTimerStatus").textContent="✓ Hedef dinlenme tamamlandı";
     try{navigator.vibrate?.([120,80,120])}catch(e){}
   }
   updateTimer();
 },1000);
}
function plus30(){timerRemaining+=30;updateTimer()}
function actualRests(row){return (row?.restBetweenSets||[]).map(Number).filter(x=>x>0)}
function assessRow(row){
 const p=restIntervalPrescription(row?.name),target=+row?.plannedRestSec||p.target,rests=actualRests(row);
 if(!rests.length)return {state:"unknown",avg:null,score:null,shortCount:0,longCount:0,target,min:p.min,max:p.max};
 const avgR=avg(rests),shortCount=rests.filter(x=>x<p.min).length,longCount=rests.filter(x=>x>p.max).length;
 let penalties=0;
 rests.forEach(x=>{
   if(x<p.min)penalties+=Math.min(30,(p.min-x)/p.min*40);
   else if(x>p.max)penalties+=Math.min(8,(x-p.max)/p.max*8);
 });
 const score=clamp(Math.round(100-penalties/rests.length),0,100);
 return {state:shortCount?"short":longCount?"long":"target",avg:avgR,score,shortCount,longCount,target,min:p.min,max:p.max};
}
function performanceDrop(row){
 const sets=(row?.sets||[]).map(Number).filter(x=>x>0);if(sets.length<2)return null;
 const first=sets[0],last=sets.at(-1);return first?((first-last)/first*100):null;
}
function rowAdvice(row){
 const a=assessRow(row),drop=performanceDrop(row);
 if(a.state==="unknown")return `Dinlenme süreleri kaydedilmedi. Planlanan ${fmtRestSec(a.target)}.`;
 if(a.shortCount&&drop!=null&&drop>=12)return `Ortalama dinlenme ${fmtRestSec(a.avg)} ve set performansı yaklaşık %${drop.toFixed(0)} düştü. Sonraki seansta ${fmtRestSec(a.min)}–${fmtRestSec(a.max)} bandına yaklaşmak set kalitesini koruyabilir.`;
 if(a.shortCount)return `${a.shortCount} dinlenme önerilen alt bandın altında. Performans stabilse sorun olmayabilir; düşüş başlarsa süreyi uzat.`;
 if(a.longCount)return `Dinlenme ortalaması ${fmtRestSec(a.avg)}. Üst bandın üzerinde olsa da kaliteyi koruyorsa otomatik ceza yok; yalnızca seans süresi maliyeti artar.`;
 return `Dinlenme hedef bandında: ortalama ${fmtRestSec(a.avg)}.`;
}
function rowsForCurrentTarget(){
 const k=currentTarget();
 try{return rowsForTarget(k)}catch(e){return db.trainingLogs?.[k]||[]}
}
function renderSessionSummary(){
 const el=q("sessionRestSummary");if(!el)return;
 const rows=rowsForCurrentTarget();
 if(!rows.length){el.innerHTML="";return}
 let actual=[],short=0,withData=0,totalRest=0;
 rows.forEach(r=>{
   const a=assessRow(r),rs=actualRests(r);if(rs.length){withData++;actual.push(...rs);short+=a.shortCount;totalRest+=rs.reduce((x,y)=>x+y,0)}
 });
 const avgR=actual.length?Math.round(avg(actual)):null;
 el.innerHTML=`<div class="rest-summary-grid">
   <div><span>Rest verisi</span><strong>${withData}/${rows.length} hareket</strong></div>
   <div><span>Ortalama gerçek dinlenme</span><strong>${avgR?fmtRestSec(avgR):"—"}</strong></div>
   <div><span>Kısa dinlenme</span><strong>${short} interval</strong></div>
   <div><span>Toplam kayıtlı rest</span><strong>${totalRest?fmtRestSec(totalRest):"—"}</strong></div>
 </div>`;
}
function enhanceLiveAdvice(){
 const rows=rowsForCurrentTarget(),last=rows.at(-1),el=q("liveAutoregulation");if(!last||!el)return;
 const base=liveSetAdvice(last),rest=rowAdvice(last);
 el.innerHTML=`<strong>Set kalitesi:</strong> ${base}<br><strong>Dinlenme:</strong> ${rest}`;
}
function renderEvidenceNote(){
 const el=q("restEvidenceNote");if(!el)return;
 el.innerHTML=`<strong>Dinlenme bilimi:</strong> Ağır kuvvet hareketlerinde daha uzun dinlenme, özellikle antrenmanlı kişilerde set performansını ve kuvvet gelişimini korumaya yardımcı olabilir. Hipertrofide amaç “kısa dinlenme” değil, yeterli kaliteli hacmi sürdürebilmektir. <span class="athlete-profile-note">v7.1 kaynak kütüphanesi: ${evidence?.principles?.length||4} çalışma/derleme.</span>`;
}
function enrichPlanVsActual(){
 const el=q("planVsActual");if(!el)return;
 const rows=rowsForCurrentTarget(),withRest=rows.filter(r=>actualRests(r).length);
 if(!rows.length)return;
 const avgScore=withRest.length?Math.round(avg(withRest.map(r=>assessRow(r).score))):null;
 let d=el.querySelector("[data-rest-quality]");
 if(!d){d=document.createElement("div");d.className="summary-item";d.dataset.restQuality="1";d.innerHTML="<span>Dinlenme verisi</span><strong>—</strong>";el.appendChild(d)}
 d.querySelector("strong").textContent=avgScore==null?"Henüz yok":`${avgScore}/100 · ${withRest.length}/${rows.length} hareket`;
}
function render(){
 renderRecommendation();renderSessionSummary();enhanceLiveAdvice();enrichPlanVsActual();renderEvidenceNote();
}
function bind(){
 const sel=q("exerciseSelect");
 if(sel){
   sel.addEventListener("change",()=>setRestInputFromExercise(true));
   setTimeout(()=>setRestInputFromExercise(true),0);
 }
 const inp=q("exerciseRestPlanned");
 if(inp){
   inp.addEventListener("input",()=>{inp.dataset.manual="1";renderRecommendation();timerRemaining=+inp.value||120;updateTimer()});
 }
 q("restTimerStart")?.addEventListener("click",startPauseTimer);
 q("restTimerPlus30")?.addEventListener("click",plus30);
 q("restTimerReset")?.addEventListener("click",()=>resetTimer(true));
 q("addExerciseBtn")?.addEventListener("click",()=>setTimeout(()=>{render();resetTimer(true)},80));
 document.querySelector('.nav-btn[data-page="training"]')?.addEventListener("click",()=>setTimeout(render,0));
}
function init(){bind();resetTimer(true);render()}
window.RestIntervalEngine={render,assessRow,rowAdvice,prescription,setRestInputFromExercise};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
