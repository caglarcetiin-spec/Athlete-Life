
(function(){
"use strict";

db.adherencePlans=db.adherencePlans||{};
db.deviationReasons=db.deviationReasons||{};
let chartDays=14;

function histPlan(k){
 return (db.futurePlans||{})[k] || db.planHistory?.[k]?.versions?.at(-1)?.plan || null;
}
function parseWindow(win){
 const m=String(win||"").match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
 if(!m)return null;
 return {start:+m[1]*60 + +m[2], end:+m[3]*60 + +m[4]};
}
function circDiff(a,b){
 if(a==null||b==null)return null;
 let d=Math.abs(a-b)%1440;return Math.min(d,1440-d);
}
function signedTimeDiff(actual,planned){
 if(actual==null||planned==null)return null;
 let d=actual-planned;
 while(d>720)d-=1440;
 while(d<-720)d+=1440;
 return d;
}
function debtBefore(k,days=7){
 let debt=0,valid=0;
 for(let i=1;i<=days;i++){
   const d=db.daily[addDaysKey(k,-i)];
   if(d?.sleepTime&&d?.wakeTime){debt+=Math.max(0,(db.settings.targetSleep||8)*60-sleepDuration(d));valid++}
 }
 return {minutes:Math.round(debt),days:valid};
}
function basePrescription(k){
 const p=histPlan(k),sh=p?{status:p.status,shift:p.shift}:shiftDataForKey(k);
 const target=(db.settings.targetSleep||8)*60, w=parseWindow(p?.window||recommendedWindow(sh.shift,sh.status));
 const debt=debtBefore(k,7);
 let wake;
 const workWake=sh.status==="work" ? mins(SHIFT[sh.shift]?.start||"10:00")-(db.settings.prep||45)-(db.settings.commute||35) : null;
 const trainingWake=(p?.type!=="recovery"&&w)?w.start-60:null;

 if(sh.status==="work"){
   wake=workWake;
   if(trainingWake!=null){
     // pre-work sessions require an earlier wake; post-work sessions do not.
     const trainIsPreWork=w && w.start < mins(SHIFT[sh.shift]?.start||"10:00");
     if(trainIsPreWork)wake=Math.min(wake,trainingWake);
   }
 }else{
   wake=9*60;
   // On free days allow a modest recovery extension when prior sleep debt is high.
   if(debt.minutes>=120)wake+=Math.min(75,Math.round(debt.minutes/4));
   if(trainingWake!=null)wake=Math.min(wake,trainingWake);
 }
 wake=(wake+1440)%1440;
 const sleep= wake-target;
 const bed=sleep-15;
 return {
   key:k,createdAt:new Date().toISOString(),sourcePlanVersion:p?.version||db.planHistory?.[k]?.currentVersion||null,
   status:sh.status,shift:sh.shift,sessionType:p?.type||"recovery",sessionName:p?.name||"Recovery / Rest",
   trainingWindow:p?.window||recommendedWindow(sh.shift,sh.status),
   wake:fmtMin(wake),sleep:fmtMin(sleep),bed:fmtMin(bed),targetSleepHours:db.settings.targetSleep||8,
   priorDebtMinutes:debt.minutes
 };
}
function ensurePlan(k,force=false){
 const existing=db.adherencePlans[k];
 if(existing&&!force)return existing;
 const plan=basePrescription(k);
 db.adherencePlans[k]=plan;save();return plan;
}
function captureUpcoming(){
 for(let i=0;i<14;i++)ensurePlan(addDaysKey(todayKey(),i));
 // Also create a reconstructable baseline for recent dates that predate this version.
 for(let i=1;i<=30;i++){const k=addDaysKey(todayKey(),-i);if(!db.adherencePlans[k]&&(db.daily[k]||db.planHistory?.[k]))ensurePlan(k)}
}
function rowsForPlan(k){
 const out=[];
 Object.entries(db.trainingLogs||{}).forEach(([actual,rows])=>(rows||[]).forEach(r=>{
   if((r.scheduledFor||actual)===k && r.planContribution!==false && r.source!=="ad_hoc")out.push({...r,_actualKey:actual});
 }));
 return out;
}
function firstTrainingTime(k){
 const rows=rowsForPlan(k).filter(r=>r.performedAt||r.recordedAt);
 if(rows.length){
   const times=rows.map(r=>new Date(r.performedAt||r.recordedAt)).filter(d=>!Number.isNaN(+d)).sort((a,b)=>a-b);
   if(times.length)return times[0].getHours()*60+times[0].getMinutes();
 }
 const h=db.planHistory?.[k]?.performed?.at;
 if(h){const d=new Date(h);if(!Number.isNaN(+d))return d.getHours()*60+d.getMinutes()}
 return null;
}
function completedExerciseScore(k){
 const p=histPlan(k)||db.adherencePlans[k];
 if(!p)return null;
 const type=p.type||p.sessionType||"recovery", rows=rowsForPlan(k);
 const feedback=Object.entries(db.sessionFeedback||{}).map(([actual,f])=>({...f,_actual:actual})).filter(f=>(f.targetPlanDate||f._actual)===k&&Number.isFinite(+f.completionPct)).sort((a,b)=>String(a.completedAt||"").localeCompare(String(b.completedAt||""))).at(-1);
 if(feedback)return clamp(Math.round(Number.isFinite(+feedback.planFidelityPct)?+feedback.planFidelityPct:+feedback.completionPct),0,100);
 const setSummary=window.GuidedWorkout?.completionSummaryForTarget?.(k);
 if(setSummary&&setSummary.performedSets>0)return clamp(setSummary.substitutionExercises?setSummary.planFidelityPct:setSummary.completionPct,0,100);
 if(type==="recovery"){
   const own=rows.filter(r=>(r.scheduledFor||r._actualKey)===k);
   return own.length?65:100;
 }
 let planned=[];
 try{planned=templateForType(type).items.map(x=>Array.isArray(x)?x[0]:x.name).filter(Boolean)}catch(e){}
 if(!planned.length)return rows.length?100:null;
 const actual=rows.map(r=>r.name);
 const done=planned.filter(n=>actual.includes(n)).length;
 return Math.round(done/planned.length*100);
}
function trainingTimingScore(k){
 const plan=ensurePlan(k),type=plan.sessionType;
 if(type==="recovery")return 100;
 const actual=firstTrainingTime(k);if(actual==null)return null;
 const w=parseWindow(plan.trainingWindow);if(!w)return null;
 let outside=0;
 if(actual<w.start)outside=w.start-actual;
 else if(actual>w.end)outside=actual-w.end;
 return clamp(Math.round(100-outside*.55),25,100);
}
function sleepScheduleScore(k){
 const plan=ensurePlan(k),d=db.daily[k];
 if(!d?.wakeTime&&!d?.bedTime)return null;
 const wakeDev=d?.wakeTime?circDiff(mins(d.wakeTime),mins(plan.wake)):null;
 const bedDev=d?.bedTime?circDiff(mins(d.bedTime),mins(plan.bed)):null;
 let vals=[],weights=[];
 if(wakeDev!=null){vals.push(clamp(100-wakeDev*.48,20,100));weights.push(.62)}
 if(bedDev!=null){vals.push(clamp(100-bedDev*.35,20,100));weights.push(.38)}
 if(!vals.length)return null;
 return Math.round(vals.reduce((a,v,i)=>a+v*weights[i],0)/weights.slice(0,vals.length).reduce((a,b)=>a+b,0));
}
function sleepQuantityScore(k){
 const d=db.daily[k];if(!d?.sleepTime||!d?.wakeTime)return null;
 return clamp(Math.round((sleepDuration(d)/60)/(db.settings.targetSleep||8)*100),25,105);
}
function nutritionAdherence(k){
 const has=(db.foodLogs[k]||[]).length||db.water[k];if(!has)return null;
 return nutritionMetricsForDate(k).score;
}
function weighted(parts){
 let num=0,den=0;
 parts.forEach(([v,w])=>{if(v!=null&&Number.isFinite(v)){num+=v*w;den+=w}});
 return den?Math.round(num/den):null;
}
function isDayPast(k){return k<todayKey()}
function currentWindowPassed(k){
 if(k<todayKey())return true;if(k>todayKey())return false;
 const plan=ensurePlan(k),w=parseWindow(plan.trainingWindow);if(!w)return false;
 const now=new Date(),m=now.getHours()*60+now.getMinutes();
 return m>w.end+60;
}
function dailyAdherence(k){
 const plan=ensurePlan(k),schedule=sleepScheduleScore(k),sleepQty=sleepQuantityScore(k),vr=db.gapReconciliation?.[k];
 let complete=completedExerciseScore(k),timing=trainingTimingScore(k),nutrition=nutritionAdherence(k);
 if(plan.sessionType!=="recovery"&&complete==null&&currentWindowPassed(k)){
   if(vr?.status==="missed"||vr?.status==="rested")complete=0;
   else complete=null; // no record != missed; wait for reconciliation
 }
 if(plan.sessionType!=="recovery"&&timing==null&&complete===0&&vr?.status==="missed")timing=0;
 const score=weighted([[schedule,.25],[sleepQty,.10],[complete,.35],[timing,.15],[nutrition,.15]]);
 return {key:k,score,schedule,sleepQty,complete,timing,nutrition,plan,verification:vr?.status||null};
}
function inferredSmartDeviation(k){
 const plan=ensurePlan(k),d=db.daily[k],debt=debtBefore(k,7),reason=db.deviationReasons[k]||"";
 const wakeDiff=d?.wakeTime?signedTimeDiff(mins(d.wakeTime),mins(plan.wake)):0;
 const sleepH=d?.sleepTime&&d?.wakeTime?sleepDuration(d)/60:0;
 const manualRecovery=reason==="sleep_debt"||reason==="pain"||reason==="energy";
 const autoRecovery=wakeDiff>=45&&debt.minutes>=90&&sleepH>=(db.settings.targetSleep||8)-.35;
 return {yes:manualRecovery||autoRecovery,wakeDiff,debt:debt.minutes,sleepH,reason,autoRecovery};
}
function adaptationScore(k){
 const d=db.daily[k],adh=dailyAdherence(k),smart=inferredSmartDeviation(k);
 const read=d?readiness(d):null, sleep=adh.sleepQty, nut=adh.nutrition, pain=typeof maxPain==="function"?maxPain(k):0;
 let trainQuality=adh.complete;
 if(adh.plan.sessionType==="recovery")trainQuality=100;
 const painScore=clamp(100-pain*8,20,100);
 let score=weighted([[read,.28],[sleep,.24],[nut,.14],[trainQuality,.20],[painScore,.14]]);
 if(score!=null&&smart.yes)score=Math.min(100,score+5);
 return score;
}
function avgScore(days,fn){
 const vals=[];
 for(let i=0;i<days;i++){const k=addDaysKey(todayKey(),-i),v=fn(k);if(v!=null)vals.push(v)}
 return vals.length?Math.round(avg(vals)):null;
}
function alertsFor(k=todayKey()){
 const plan=ensurePlan(k),d=db.daily[k],adh=dailyAdherence(k),smart=inferredSmartDeviation(k),alerts=[];
 const wakeDiff=d?.wakeTime?signedTimeDiff(mins(d.wakeTime),mins(plan.wake)):null;
 if(wakeDiff!=null&&wakeDiff>30){
   if(smart.yes)alerts.push({c:"adaptive",icon:"↻",t:`Uyanış ${wakeDiff} dk gecikti`,x:`Plan ${plan.wake}, gerçekleşen ${d.wakeTime}. Önceki uyku borcu ${Math.round(smart.debt/60*10)/10} saat ve ${smart.sleepH.toFixed(1)} saat uyudun; plan uyumu düşer ama bu recovery-koruyucu bir sapma olarak işaretlendi.`});
   else alerts.push({c:wakeDiff>=90?"bad":"warn",icon:"!",t:`Uyanış planından ${wakeDiff} dk saptın`,x:`Plan ${plan.wake}, gerçekleşen ${d.wakeTime}. Sistem kalan günü yeniden değerlendirir; bu sapma Program Uyumu grafiğine yansır.`});
 }else if(wakeDiff!=null&&wakeDiff<-30){
   alerts.push({c:"warn",icon:"!",t:`Planlanandan ${Math.abs(wakeDiff)} dk erken uyandın`,x:`Uyku fırsatı azaldıysa readiness düşebilir. Plan ${plan.wake}, gerçekleşen ${d.wakeTime}.`});
 }
 if(d?.sleepTime&&d?.wakeTime&&sleepDuration(d)/60<(db.settings.targetSleep||8)-.75){
   alerts.push({c:"warn",icon:"Z",t:"Uyku hedefi eksik",x:`${(sleepDuration(d)/60).toFixed(1)} saat uyku kaydedildi; hedef ${(db.settings.targetSleep||8).toFixed(1)} saat.`});
 }
 if(plan.sessionType!=="recovery"){
   const comp=adh.complete, timing=adh.timing, rows=rowsForPlan(k);
   if(comp===0&&currentWindowPassed(k))alerts.push({c:"bad",icon:"!",t:"Planlanan antrenman yapılmadı olarak doğrulandı",x:`${plan.sessionName} için ${plan.trainingWindow} önerilmişti. Bu gün açıkça missed/rest olarak işlendi; istersen geçmiş seansı sonradan detaylı girerek düzeltebilirsin.`});
   else if(comp==null&&currentWindowPassed(k)&&plan.sessionType!=="recovery")alerts.push({c:"adaptive",icon:"?",t:"Antrenman günü doğrulanmayı bekliyor",x:`${plan.sessionName} için kayıt yok; sistem bunu otomatik missed saymıyor. Eksik Günleri Tamamla kartından o gün gerçekte ne yaptığını seç.`});
   else if(comp!=null&&comp>0&&comp<80)alerts.push({c:"warn",icon:"½",t:`Antrenman eksik: %${comp}`,x:"Planlanan ana hareketlerin bir kısmı kaydedilmedi. Eksik seans olarak uyum grafiğine işlenir; gerektiğinde Koç gelecek günleri yeniden dağıtır."});
   if(rows.length&&timing!=null&&timing<75){
     const at=firstTrainingTime(k);alerts.push({c:"warn",icon:"◷",t:"Antrenman saati plandan saptı",x:`Önerilen pencere ${plan.trainingWindow}; ilk kayıt yaklaşık ${fmtMin(at)}. Completion ayrı, zaman uyumu ayrı puanlanır.`});
   }
 }
 if(!d&&k===todayKey()){
   const now=new Date(),nowM=now.getHours()*60+now.getMinutes(),wakeM=mins(plan.wake);
   if(signedTimeDiff(nowM,wakeM)>90)alerts.push({c:"warn",icon:"?",t:"Günlük check-in gecikti",x:`Planlanan uyanış ${plan.wake}. Gerçek uyku/uyanış kaydı gelince sistem plan sapmasını ve recovery bağlamını değerlendirecek.`});
 }
 if(!alerts.length)alerts.push({c:"good",icon:"✓",t:"Belirgin plan sapması yok",x:"Mevcut kayıtlar programa yakın ilerliyor. Yeni veri geldikçe Guardian yeniden hesaplar."});
 return alerts;
}
function renderGuardian(){
 if(!q("guardianAlerts"))return;
 captureUpcoming();
 const k=todayKey(),plan=ensurePlan(k),adh=dailyAdherence(k),adapt=adaptationScore(k);
 q("guardianAdherenceBadge").textContent="Uyum "+(adh.score==null?"--":adh.score+"/100");
 q("guardianAdaptationBadge").textContent="Adaptasyon "+(adapt==null?"--":adapt+"/100");
 q("guardianAlerts").innerHTML=alertsFor(k).map(a=>`<div class="guardian-alert ${a.c}"><div class="guardian-icon">${a.icon}</div><div><strong>${a.t}</strong><span>${a.x}</span></div></div>`).join("");
 const d=db.daily[k]||{},actualTrain=firstTrainingTime(k);
 q("guardianTodayPlan").innerHTML=[
  ["Plan Uyanış",plan.wake,d.wakeTime?`Gerçek ${d.wakeTime}`:"Henüz kayıt yok"],
  ["Uyku Hedefi",`${plan.sleep}→${plan.wake}`,d.sleepTime?`Gerçek ${d.sleepTime}→${d.wakeTime}`:"--"],
  ["Antrenman",plan.trainingWindow,actualTrain!=null?`Gerçek ≈ ${fmtMin(actualTrain)}`:plan.sessionName],
  ["Önceki Uyku Borcu",`${Math.floor(plan.priorDebtMinutes/60)}s ${plan.priorDebtMinutes%60}dk`,db.deviationReasons[k]?"Bağlam kayıtlı":"Otomatik bağlam"]
 ].map(x=>`<div class="guardian-plan-item"><span>${x[0]}</span><strong>${x[1]}</strong><span>${x[2]}</span></div>`).join("");
 if(q("deviationReason"))q("deviationReason").value=db.deviationReasons[k]||"";
}
function colorVar(name,fallback){
 const v=getComputedStyle(document.documentElement).getPropertyValue(name).trim();return v||fallback;
}
function chartPoints(days){
 const arr=[];
 for(let i=days-1;i>=0;i--){
   const k=addDaysKey(todayKey(),-i),a=dailyAdherence(k),ad=adaptationScore(k);
   // Only show dates with at least one real signal.
   const has=db.daily[k]||(db.foodLogs[k]||[]).length||rowsForPlan(k).length||db.sessionFeedback[k];
   if(has)arr.push({k,a:a.score,ad});
 }
 return arr;
}
function drawChart(days=chartDays){
 const canvas=q("adherenceChart");if(!canvas)return;
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 const W=Math.max(300,Math.round(rect.width*dpr)),H=Math.max(180,Math.round(rect.height*dpr));
 if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
 const ctx=canvas.getContext("2d"),pad={l:42*dpr,r:18*dpr,t:18*dpr,b:32*dpr};
 ctx.clearRect(0,0,W,H);const bg=colorVar("--panel2","#161b22"),mut=colorVar("--muted","#8b949e"),line=colorVar("--line","#30363d");
 ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 ctx.font=`${11*dpr}px system-ui`;ctx.textAlign="right";ctx.textBaseline="middle";
 [0,25,50,75,100].forEach(v=>{const y=pad.t+(100-v)/100*(H-pad.t-pad.b);ctx.strokeStyle=line;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();ctx.fillStyle=mut;ctx.fillText(String(v),pad.l-8*dpr,y)});
 const pts=chartPoints(days);
 if(!pts.length){ctx.fillStyle=mut;ctx.textAlign="center";ctx.fillText("Trend için veri bekleniyor",W/2,H/2);return}
 const xAt=i=>pts.length===1?(pad.l+W-pad.r)/2:pad.l+i/(pts.length-1)*(W-pad.l-pad.r),yAt=v=>pad.t+(100-clamp(v??0,0,100))/100*(H-pad.t-pad.b);
 function series(key,color){
   ctx.strokeStyle=color;ctx.lineWidth=2.5*dpr;ctx.lineJoin="round";ctx.beginPath();let started=false;
   pts.forEach((p,i)=>{if(p[key]==null){started=false;return}const x=xAt(i),y=yAt(p[key]);if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y)});
   ctx.stroke();ctx.fillStyle=color;pts.forEach((p,i)=>{if(p[key]==null)return;ctx.beginPath();ctx.arc(xAt(i),yAt(p[key]),3*dpr,0,Math.PI*2);ctx.fill()});
 }
 series("a","#2f81f7");series("ad","#3fb950");
 const labels=Math.min(6,pts.length);ctx.fillStyle=mut;ctx.textAlign="center";ctx.textBaseline="top";
 for(let j=0;j<labels;j++){const i=Math.round(j*(pts.length-1)/Math.max(1,labels-1));ctx.fillText(pts[i].k.slice(5),xAt(i),H-pad.b+8*dpr)}
}
function renderTrend(){
 if(!q("adh7Score"))return;
 const a7=avgScore(7,k=>dailyAdherence(k).score),a30=avgScore(30,k=>dailyAdherence(k).score),ad30=avgScore(30,adaptationScore);
 let smart=0;for(let i=0;i<30;i++)if(inferredSmartDeviation(addDaysKey(todayKey(),-i)).yes)smart++;
 q("adh7Score").textContent=a7==null?"--":a7+"/100";q("adh30Score").textContent=a30==null?"--":a30+"/100";q("adapt30Score").textContent=ad30==null?"--":ad30+"/100";q("smartDeviationCount").textContent=smart;
 q("adherenceLegend").innerHTML=`<span><i style="background:#2f81f7"></i>Program Uyumu</span><span><i style="background:#3fb950"></i>Adaptasyon Başarısı</span>`;
 const k=todayKey(),a=dailyAdherence(k);
 q("adherenceBreakdown").innerHTML=[
   ["Uyku Saat Uyumu",a.schedule],["Uyku Miktarı",a.sleepQty],["Antrenman Tamamlama",a.complete],["Antrenman Zamanı",a.timing],["Beslenme",a.nutrition]
 ].map(x=>`<div class="adherence-factor"><span>${x[0]}</span><strong>${x[1]==null?"veri yok":Math.round(x[1])+"/100"}</strong></div>`).join("");
 drawChart(chartDays);
 const top=q("adherenceScore"),adaptEl=q("adaptationScore");if(top)top.textContent=(a7==null?"--":a7)+"/100";if(adaptEl)adaptEl.textContent=(ad30==null?"--":ad30)+"/100";
 if(q("weeklyAdherenceContext")){
   const msg=a7==null?"Program uyumu için henüz yeterli veri yok.":a7>=85?"Planın büyük bölümünü uyguluyorsun; küçük sapmalar normal ve sistem bunları bağlama göre yeniden optimize ediyor.":a7>=70?"Program uyumu orta-yüksek. En büyük sapmaları Guardian kartından takip et; completion ve zamanlama ayrı puanlanıyor.":"Planlanan ve gerçekleşen arasında belirgin fark var. Koç, programı gerçek yaşam ritmine daha iyi oturtmak için bu trendi kullanacak.";
   q("weeklyAdherenceContext").textContent=`7 günlük Plan Uyumu: ${a7??"--"}/100 · 30 günlük Adaptasyon Başarısı: ${ad30??"--"}/100. ${msg}`;
 }
}
function saveReason(){
 db.deviationReasons[todayKey()]=q("deviationReason")?.value||"";save();renderGuardian();renderTrend();
}
function maybeReoptimizeAfterCheckin(){
 const smart=inferredSmartDeviation(todayKey()),plan=ensurePlan(todayKey()),d=db.daily[todayKey()];
 if(!d?.wakeTime)return;
 const diff=signedTimeDiff(mins(d.wakeTime),mins(plan.wake));
 if(Math.abs(diff)>=45){
   try{buildFuturePlanV5(14,smart.yes?"recovery-protective schedule deviation":"schedule deviation")}catch(e){}
 }
}
function hookRenders(){
 const oldAnalytics=window.renderAnalytics;if(typeof oldAnalytics==="function")window.renderAnalytics=function(){oldAnalytics();renderTrend()};
 const oldReports=window.renderReports;if(typeof oldReports==="function")window.renderReports=function(){oldReports();renderTrend()};
 const oldToday=window.renderToday;if(typeof oldToday==="function")window.renderToday=function(){oldToday();renderGuardian()};
}
function bind(){
 q("saveDeviationReason")?.addEventListener("click",saveReason);
 document.querySelectorAll(".adherence-range-btn").forEach(b=>b.addEventListener("click",()=>{
   chartDays=+b.dataset.days;document.querySelectorAll(".adherence-range-btn").forEach(x=>x.classList.toggle("active",x===b));drawChart(chartDays);
 }));
 q("saveDailyBtn")?.addEventListener("click",()=>setTimeout(()=>{maybeReoptimizeAfterCheckin();renderGuardian();renderTrend()},80));
 q("completeSessionBtn")?.addEventListener("click",()=>setTimeout(()=>{renderGuardian();renderTrend()},80));
 q("addExerciseBtn")?.addEventListener("click",()=>setTimeout(()=>{renderGuardian();renderTrend()},80));
 window.addEventListener("resize",()=>drawChart(chartDays));
}
function init(){
 captureUpcoming();hookRenders();bind();renderGuardian();renderTrend();
}
window.AdherenceGuardian={render:()=>{renderGuardian();renderTrend()},dailyAdherence,adaptationScore,alertsFor,ensurePlan,rowsForPlan,completedExerciseScore,trainingTimingScore};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
