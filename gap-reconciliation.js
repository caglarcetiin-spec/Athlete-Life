
(function(){
"use strict";

db.gapReconciliation=db.gapReconciliation||{};
let activeBackfillKey=null;

function planForGap(k){return planForDate(k)||db.planHistory?.[k]?.versions?.at(-1)?.plan||null}
function rowsForGap(k){
 const out=[];
 Object.entries(db.trainingLogs||{}).forEach(([actual,rows])=>(rows||[]).forEach(r=>{
   if((r.scheduledFor||actual)===k)out.push({...r,_actualKey:actual});
 }));
 return out;
}
function isPlannedTraining(k){
 const p=planForGap(k);return !!p&&p.type!=="recovery";
}
function hasAnyTraining(k){return rowsForGap(k).length>0}
function migration(){
 const lc=ensureLifecycle();let changed=false;
 // v6.7 and older could have marked "record yok" as missed. Convert only records that were never explicitly user-verified.
 Object.entries(lc.closedDays||{}).forEach(([k,x])=>{
   if(x?.completion==="missed"&&!hasAnyTraining(k)&&isPlannedTraining(k)&&!db.gapReconciliation[k]){
     x.completion="unverified";x.migratedFromLegacyMissed=true;
     if(!lc.unverifiedDays.includes(k))lc.unverifiedDays.push(k);
     changed=true;
   }
 });
 const explicitMissed=new Set(Object.entries(db.gapReconciliation).filter(([,v])=>v?.status==="missed").map(([k])=>k));
 const before=(lc.missedDays||[]).length;
 lc.missedDays=(lc.missedDays||[]).filter(k=>explicitMissed.has(k)||hasAnyTraining(k));
 if(lc.missedDays.length!==before)changed=true;
 if(changed)save();
}
function scanPending(limit=45){
 const current=todayKey(),out=[];
 for(let i=1;i<=limit;i++){
   const k=addDaysKey(current,-i),p=planForGap(k),vr=db.gapReconciliation[k],rows=rowsForGap(k);
   if(!p||p.type==="recovery")continue;
   if(rows.length){
     if(!vr){
       db.gapReconciliation[k]={status:"completed",resolution:"existing_logs",dataConfidence:"high",resolvedAt:new Date().toISOString()};
     }
     continue;
   }
   if(["completed","modified","rested","missed"].includes(vr?.status))continue;
   out.push({key:k,plan:p,status:vr?.status||"unverified"});
 }
 return out.sort((a,b)=>a.key.localeCompare(b.key));
}
function setLifecycleState(k,status,confidence=null){
 const lc=ensureLifecycle();lc.closedDays[k]=lc.closedDays[k]||summarizeDayClose(k);
 lc.closedDays[k].completion=status==="missed"?"missed":status==="rested"?"rested":status==="completed"?"backfilled":status==="modified"?"modified":"unverified";
 lc.closedDays[k].verificationStatus=status;lc.closedDays[k].dataConfidence=confidence;
 lc.unverifiedDays=(lc.unverifiedDays||[]).filter(x=>x!==k);
 if(status==="missed"&&!lc.missedDays.includes(k))lc.missedDays.push(k);
 else if(status!=="missed")lc.missedDays=(lc.missedDays||[]).filter(x=>x!==k);
}
function approximateRows(k,p,completionPct,rpe,time){
 const base=templateForType(p.type).items||[],take=Math.max(1,Math.ceil(base.length*(completionPct/100)));
 return base.slice(0,take).map(item=>{
   const name=item[0],pres=item[1]||"",e=EXERCISES.find(x=>x.n===name);
   const m=String(pres).match(/(\d+)\s*[×x]/i),setCount=m?Math.max(1,+m[1]):3;
   let performedAt=null;
   if(time){const d=new Date(`${k}T${time}:00`);if(!Number.isNaN(+d))performedAt=d.toISOString()}
   return {
     name,type:e?.type||"DYNAMIC",load:0,sets:Array(setCount).fill(1),rir:Number.isFinite(+rpe)?Math.max(0,Math.min(4,Math.round(5-(+rpe/2)))):2,
     performedAt,calendarDate:k,athleteDay:k,scheduledFor:k,planType:p.type,planVersion:p.version||null,
     backfilledAt:new Date().toISOString(),lateOrCatchup:false,approximateBackfill:true,dataConfidence:"medium",
     approximatePrescription:pres
   };
 });
}
function quickBackfill(k){
 const p=planForGap(k);if(!p)return;
 activeBackfillKey=k;
 q("gapBackfillTitle").textContent=`${k} · ${p.name}`;
 q("gapBackfillSubtitle").textContent="Bilgisayardan uzaktayken yaptığın seansı yaklaşık olarak kaydet. Saati bilmiyorsan boş bırakabilirsin.";
 q("gapBackfillTime").value="";
 q("gapBackfillDuration").value="60";
 q("gapBackfillRpe").value="7";
 q("gapBackfillCompletion").value="100";
 q("gapBackfillNote").value="";
 q("gapBackfillDialog").showModal();
}
function saveQuickBackfill(){
 const k=activeBackfillKey,p=planForGap(k);if(!k||!p)return;
 const time=q("gapBackfillTime").value||"",duration=+q("gapBackfillDuration").value||0,rpe=+q("gapBackfillRpe").value||0,pct=+q("gapBackfillCompletion").value||100,note=q("gapBackfillNote").value||"";
 const rows=approximateRows(k,p,pct,rpe,time);
 db.trainingLogs[k]=db.trainingLogs[k]||[];
 // Avoid duplicate quick backfills.
 db.trainingLogs[k]=db.trainingLogs[k].filter(r=>!r.approximateBackfill||r.scheduledFor!==k);
 db.trainingLogs[k].push(...rows);
 let performedAt=null;if(time){const d=new Date(`${k}T${time}:00`);if(!Number.isNaN(+d))performedAt=d.toISOString()}
 db.sessionFeedback[k]={...(db.sessionFeedback[k]||{}),type:p.type,targetPlanDate:k,planVersion:p.version||null,rpe,duration,note,
   completedAt:performedAt||new Date().toISOString(),backfilledAt:new Date().toISOString(),exerciseCount:rows.length,approximateBackfill:true,dataConfidence:"medium"};
 db.planHistory[k]=db.planHistory[k]||{versions:[]};
 db.planHistory[k].performed={at:performedAt||null,backfilledAt:new Date().toISOString(),actualAthleteDay:k,scheduledFor:k,logs:JSON.parse(JSON.stringify(rows)),feedback:db.sessionFeedback[k],dataConfidence:"medium"};
 db.gapReconciliation[k]={status:pct>=80?"completed":"modified",resolution:"quick_backfill",dataConfidence:"medium",completionPct:pct,resolvedAt:new Date().toISOString(),timeKnown:!!time};
 setLifecycleState(k,pct>=80?"completed":"modified","medium");
 save();q("gapBackfillDialog").close();activeBackfillKey=null;
 buildFuturePlanV5(14,"retroactive quick backfill");
 refreshAll();
}
function markRest(k){
 const p=planForGap(k);if(!p)return;
 db.gapReconciliation[k]={status:"rested",resolution:"user_confirmed_rest",dataConfidence:"high",resolvedAt:new Date().toISOString()};
 db.sessionFeedback[k]={...(db.sessionFeedback[k]||{}),type:"recovery",targetPlanDate:k,note:"Planned training replaced by rest — retrospectively confirmed",backfilledAt:new Date().toISOString(),dataConfidence:"high"};
 setLifecycleState(k,"rested","high");save();buildFuturePlanV5(14,"historical rest reconciliation");refreshAll();
}
function markMissed(k){
 if(!confirm(`${k} tarihindeki planlı antrenmanı yapmadığını doğruluyor musun?`))return;
 db.gapReconciliation[k]={status:"missed",resolution:"user_confirmed_missed",dataConfidence:"high",resolvedAt:new Date().toISOString()};
 setLifecycleState(k,"missed","high");save();buildFuturePlanV5(14,"confirmed missed session");refreshAll();
}
function postpone(k){
 db.gapReconciliation[k]={...(db.gapReconciliation[k]||{}),status:"pending_details",resolution:"deferred",resolvedAt:null,updatedAt:new Date().toISOString()};
 const lc=ensureLifecycle();if(!lc.unverifiedDays.includes(k))lc.unverifiedDays.push(k);save();renderGapCard();
}
function detailed(k){
 db.gapReconciliation[k]={...(db.gapReconciliation[k]||{}),status:"pending_details",resolution:"detailed_entry_started",updatedAt:new Date().toISOString()};
 save();
 window.openHistoricalSessionTarget?.(k);
}
function refreshAll(){
 safeRender(renderToday);safeRender(renderAnalytics);safeRender(renderReports);safeRender(renderCoach);safeRender(renderCoachWeek);
 safeRender(renderWeeklyTrainingPlanV5);safeRender(renderLifecycleStatusV5);safeRender(renderMuscleReport);safeRender(renderCharacter);
 window.AdherenceGuardian?.render?.();window.renderAdaptiveIntelligence?.();window.initSessionRouter?.();renderGapCard();
}
function renderGapCard(){
 const card=q("gapReconciliationCard"),list=q("gapReconciliationList"),badge=q("gapPendingBadge"),intro=q("gapReconciliationIntro");
 if(!card||!list)return;
 const items=scanPending();
 card.hidden=!items.length;
 if(!items.length)return;
 badge.textContent=`${items.length} gün doğrulanacak`;
 intro.innerHTML=`<strong>Kayıt yok ≠ antrenman yapılmadı.</strong> Bu ${items.length} günün planı var fakat uygulamada gerçek seans kaydı yok. Doğrulayana kadar Program Uyumu bu günleri “missed” kabul etmez.`;
 list.innerHTML=items.map(x=>{
   const p=x.plan,chip=x.status==="pending_details"?"Detay bekliyor":"Doğrulanmamış";
   return `<div class="gap-day">
     <div class="gap-day-main">
       <strong>${x.key} · ${p.name}<span class="gap-status-chip ${x.status==="pending_details"?"medium":""}">${chip}</span></strong>
       <span>Plan: ${p.window||"--"} · ${p.type}. Bilgisayardan uzaktayken bu gün için ne yaptığını seç.</span>
     </div>
     <div class="gap-day-actions">
       <button class="gap-btn good-lite" onclick="GapReconciliation.quickBackfill('${x.key}')">Planı yaptım</button>
       <button class="gap-btn primary-lite" onclick="GapReconciliation.detailed('${x.key}')">Değiştirerek yaptım / detay gir</button>
       <button class="gap-btn warn-lite" onclick="GapReconciliation.rest('${x.key}')">Dinlendim</button>
       <button class="gap-btn danger-lite" onclick="GapReconciliation.missed('${x.key}')">Yapmadım</button>
       <button class="gap-btn" onclick="GapReconciliation.postpone('${x.key}')">Sonra</button>
     </div>
   </div>`;
 }).join("");
}
function init(){
 migration();renderGapCard();
 q("gapBackfillSave")?.addEventListener("click",saveQuickBackfill);
 // Re-scan after normal historical session completion and record edits.
 q("completeSessionBtn")?.addEventListener("click",()=>setTimeout(renderGapCard,150));
 document.querySelector('.nav-btn[data-page="today"]')?.addEventListener("click",renderGapCard);
}
window.GapReconciliation={render:renderGapCard,quickBackfill,detailed,rest:markRest,missed:markMissed,postpone,scanPending};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
