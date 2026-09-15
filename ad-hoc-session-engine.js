
(function(){
"use strict";
let draft=[];

const STRUCTURE_LABELS={
 circuit:"Circuit",continuous:"Kesintisiz Devre",superset:"Superset / Giant Set",
 straight_sets:"Serbest Set",emom:"EMOM",amrap:"AMRAP",for_time:"For Time"
};
const MUSCLE_LABELS={
 chest:"Göğüs",frontDelts:"Ön Omuz",sideDelts:"Yan Omuz",rearDelts:"Arka Omuz",triceps:"Triceps",biceps:"Biceps",
 forearms:"Önkol / Grip",lats:"Lat",upperBack:"Üst Sırt",traps:"Trapez",scapular:"Scapular Stabilizatör",
 abs:"Karın",obliques:"Oblique",spinalErectors:"Bel/Erector",glutes:"Glute",quads:"Quadriceps",
 hamstrings:"Hamstring",adductors:"Adductor",calves:"Calf",hipFlexors:"Hip Flexor"
};
const QUALITY_LABELS={strength:"Kuvvet",hypertrophy:"Hipertrofi",power:"Power",skill:"Skill",stability:"Stabilizasyon",core:"Core",endurance:"Dayanıklılık"};

function uid(){return `adhoc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`}
function currentExercise(){
 const name=q("adhocExerciseSelect")?.value;
 return EXERCISES.find(x=>x.n===name)||null;
}
function kFor(name){return window.movementKnowledge?.(name)||window.EXERCISE_KNOWLEDGE?.[name]||{}}
function fillExercises(){
 const sel=q("adhocExerciseSelect");if(!sel)return;
 const names=[...new Set(EXERCISES.map(x=>x.n))].sort((a,b)=>a.localeCompare(b,"tr"));
 sel.innerHTML=names.map(n=>`<option value="${n}">${n}</option>`).join("");
 updateValueMode();
}
function updateValueMode(){
 const e=currentExercise(),k=kFor(e?.n),label=q("adhocValueLabel"),inp=q("adhocValue");if(!e||!label||!inp)return;
 const sprintMode=k.doseModel==="sprint_work_seconds",intervalMode=k.doseModel==="interval_work_seconds",staticMode=(k.metric==="seconds"||e.type==="STATIC")&&!sprintMode&&!intervalMode,minuteMode=k.metric==="minutes";
 const txt=sprintMode?"Her sprint süresi (sn)":intervalMode?"Her interval çalışma süresi (sn)":staticMode?"Her tur hold (sn)":minuteMode?"Her tur süre (dk)":"Her tur tekrar";
 Array.from(label.childNodes).filter(n=>n.nodeType===3).forEach(n=>n.remove());label.insertBefore(document.createTextNode(txt+" "),inp);
 inp.step=(staticMode||minuteMode||sprintMode||intervalMode)?"0.1":"1";
 if((staticMode||sprintMode)&&(+inp.value||0)>60)inp.value=sprintMode?6:10;
 const dl=q("adhocDistanceLabel");if(dl)dl.hidden=!sprintMode;
 const lr=window.LoadPrescriptionEngine?.recommend?.(e.n,"",window.todayKey?.()||null,{}),ll=q("adhocLoadLabel");
 if(ll){
   const li=ll.querySelector("input");Array.from(ll.childNodes).filter(n=>n.nodeType===3).forEach(n=>n.remove());
   if(li)ll.insertBefore(document.createTextNode((lr?.applicable?lr.label:"Ek yük (kg)")+" "),li);
 }
}
function addMovement(){
 const e=currentExercise(),value=+q("adhocValue")?.value||0;if(!e||value<=0)return alert("Hareket ve tekrar/hold değerini gir.");
 const k=kFor(e.n);
 draft.push({id:uid(),name:e.n,type:e.type,metric:k.metric||(e.type==="STATIC"?"seconds":"reps"),value,load:+q("adhocLoad")?.value||0,equipment:k.variantEquipment||k.equipment?.[0]||null,doseModel:k.doseModel||null,distanceM:+q("adhocDistanceM")?.value||0});
 renderDraft();
}
function removeMovement(id){draft=draft.filter(x=>x.id!==id);renderDraft()}
function renderDraft(){
 if(q("adhocDraftBadge"))q("adhocDraftBadge").textContent=`${draft.length} hareket`;
 const el=q("adhocDraftList");if(!el)return;
 if(!draft.length){el.innerHTML='<div class="record-empty">Devreye hareket ekle. Örn. Pull-Up → Push-Up → Squat.</div>';return}
 el.innerHTML=draft.map((x,i)=>`<div class="adhoc-draft-row"><b>${i+1}</b><span>${x.name}</span><strong>${x.value} ${x.metric==="seconds"?"sn":x.metric==="minutes"?"dk":"tekrar"}${x.distanceM?` · ${x.distanceM} m`:""}${x.load?` · +${x.load} kg`:""}</strong><button onclick="AdHocSession.removeMovement('${x.id}')">Sil</button></div>`).join("");
}
function config(){
 return {
  structure:q("adhocStructure")?.value||"circuit",rounds:Math.max(1,+q("adhocRounds")?.value||1),
  duration:Math.max(1,+q("adhocDuration")?.value||1),rpe:Math.max(1,Math.min(10,+q("adhocRpe")?.value||7)),
  exerciseRest:Math.max(0,+q("adhocExerciseRest")?.value||0),roundRest:Math.max(0,+q("adhocRoundRest")?.value||0)
 };
}
function densityClass(c){
 if(c.structure==="continuous"||c.structure==="amrap"||c.structure==="emom"||((c.exerciseRest<=10)&&(c.roundRest<=30)))return {key:"very_high",label:"Çok yüksek density",score:95};
 if(c.structure==="circuit"||c.structure==="superset"||c.exerciseRest<=30)return {key:"high",label:"Yüksek density",score:82};
 if(c.exerciseRest<=90)return {key:"moderate",label:"Orta density",score:62};
 return {key:"low",label:"Düşük density / strength-style",score:40};
}
function makeRows(session,date){
 return draft.map((x,i)=>{
   const k=kFor(x.name),sets=Array.from({length:session.rounds},()=>x.value);
   const restVal=session.structure==="straight_sets"?session.exerciseRest:session.roundRest;
   const rests=Array.from({length:Math.max(0,session.rounds-1)},()=>restVal);
   return {
    name:x.name,type:x.type,load:x.load,sets,rir:Math.max(0,Math.min(5,Math.round(4-(session.rpe-6)*.5))),
    metricUnit:x.metric,movementClass:k.contraction||null,knowledgeVersion:window.EXERCISE_KNOWLEDGE_META?.version||null,executionEquipment:x.equipment,
    plannedRestSec:restVal,restBetweenSets:rests,
    performedAt:new Date().toISOString(),calendarDate:localDateKey(new Date()),athleteDay:date,scheduledFor:date,
    source:"ad_hoc",planContribution:false,adHocSessionId:session.id,adHocMovementIndex:i,
    sessionStructure:session.structure,densityClass:session.density.key,sessionRpe:session.rpe,sessionDurationMin:session.duration,sprintDistanceM:x.distanceM||0
   };
  });
}
function summarizeRows(rows,session){
 const physiology=window.AthleteLoadMesh?.sessionImpact?.(session,rows);
 if(physiology){
   const qualities={strength:0,hypertrophy:0,power:0,skill:0,stability:0,core:0,endurance:0};let qDen=0,totalDose=0;
   rows.forEach(r=>{const dose=window.exerciseDoseUnits?.(r)||(r.sets||[]).length,k=kFor(r.name);totalDose+=dose;Object.keys(qualities).forEach(qv=>qualities[qv]+=((k.qualities||{})[qv]||0)*dose);qDen+=dose});
   Object.keys(qualities).forEach(k=>qualities[k]=qDen?qualities[k]/qDen:0);
   return {muscles:physiology.muscles,qualities,totalDose,srpe:physiology.loads.sessionRpeAU,workCapacity:physiology.adaptation.workCapacity,conditioning:Math.round((physiology.adaptation.aerobicConditioning+physiology.loads.metabolicDemand)/2),fatigue:physiology.loads.recoveryCost,density:session.density,physiology,mesh:physiology};
 }
 return {muscles:{},qualities:{},totalDose:0,srpe:Math.round(session.duration*session.rpe),workCapacity:0,conditioning:0,fatigue:0,density:session.density,physiology:null};
}
function saveSession(){
 if(!draft.length)return alert("Önce en az bir hareket ekle.");
 const c=config(),date=window.sessionActualKey?.()||athleteDayKey(new Date()),density=densityClass(c);
 const s={id:uid(),date,createdAt:new Date().toISOString(),...c,density,movements:draft.map(x=>({...x}))};
 const rows=makeRows(s,date);rows.forEach(r=>window.AthleteLoadMesh?.stampRow?.(r,date));const analysis=summarizeRows(rows,s);s.analysis=analysis;
 db.adHocSessions=Array.isArray(db.adHocSessions)?db.adHocSessions:[];
 db.adHocSessions.push(s);
 db.trainingLogs[date]=db.trainingLogs[date]||[];db.trainingLogs[date].push(...rows);
 save();
 try{buildFuturePlanV5(14,`plan dışı ${STRUCTURE_LABELS[s.structure]} seansı`)}catch(e){}
 try{window.GuidedWorkout?.syncFromLogs?.("ad hoc session logged")}catch(e){}
 safeRender(renderTrainingAdaptive);safeRender(renderToday);safeRender(renderMuscleReport);safeRender(renderAdaptiveIntelligence);
 window.MovementIntelligence?.render?.();window.RestIntervalEngine?.render?.();
 renderAnalysis(s);renderHistory();draft=[];renderDraft();
}
function renderAnalysis(s){
 const el=q("adhocAnalysis");if(!el||!s?.analysis)return;const a=s.analysis;
 const muscles=Object.entries(a.muscles).sort((x,y)=>y[1]-x[1]).slice(0,6),qs=Object.entries(a.qualities).sort((x,y)=>y[1]-x[1]).slice(0,5);
 const plus=a.workCapacity>=80?"Work capacity / kondisyon için güçlü ek stimulus.":a.workCapacity>=60?"Orta-yüksek work capacity stimulus.":"Daha çok lokal kas/kuvvet çalışması karakterinde.";
 const minus=a.fatigue>=80?"Recovery maliyeti yüksek; sonraki planlı seansı Coach yeniden değerlendirmeli.":a.fatigue>=60?"Recovery maliyeti orta-yüksek; aynı kas gruplarının ertesi gün yüküne dikkat.":"Ek recovery maliyeti sınırlı.";
 el.innerHTML=`<div class="adhoc-analysis-head"><div><span>SESSION TYPE</span><strong>${STRUCTURE_LABELS[s.structure]} · ${a.density.label}</strong></div><span class="plan-badge">sRPE ${a.srpe} AU</span></div>
 <div class="adhoc-metrics">
   <div><span>Work Capacity</span><strong>${a.workCapacity}/100</strong></div>
   <div><span>Conditioning Demand</span><strong>${a.conditioning}/100</strong></div>
   <div><span>Recovery Cost</span><strong>${a.fatigue}/100</strong></div>
   <div><span>Kas stimulus unit</span><strong>${a.totalDose.toFixed(1)}</strong></div>
 </div>
 ${a.physiology?`<div class="physio-impact-grid">
   <div><span>ATP-PCr / Phosphagen Demand</span><strong>${a.physiology.energySystems.phosphagen}/100</strong></div>
   <div><span>Glycolytic Demand</span><strong>${a.physiology.energySystems.glycolytic}/100</strong></div>
   <div><span>Aerobic Contribution Demand</span><strong>${a.physiology.energySystems.aerobic}/100</strong></div>
   <div><span>Neuromuscular / Power</span><strong>${a.physiology.adaptation.neuromuscularPower}/100</strong></div>
   <div><span>Speed Exposure</span><strong>${a.physiology.adaptation.speedExposure}/100</strong></div>
   <div><span>Metabolic Demand</span><strong>${a.physiology.loads.metabolicDemand}/100</strong></div>
   <div><span>High-Speed Exposure</span><strong>${a.physiology.loads.highSpeedExposureSec.toFixed(0)} sn</strong></div>
   <div><span>Analiz Güveni</span><strong>${a.physiology.confidence}/100</strong></div>
 </div>${a.physiology.movementImpacts.map(x=>`<div class="physio-movement-card"><strong>${x.name}</strong><span>${x.interpretation}</span><small>${x.mode} · Mekanik ${Math.round(x.demands?.mechanical||0)} · Metabolik ${Math.round(x.demands?.metabolic||0)} · Nöral ${Math.round(x.demands?.neural||0)} · Kardiyo ${Math.round(x.demands?.cardiovascular||0)} · Recovery ${Math.round(x.loads?.recoveryCost||0)}</small></div>`).join("")}<p class="physio-limit">Bütün hareketler kendi tip modelinden geçer. Skorlar ölçülmüş laktat/VO₂/kalori değildir; gerçek set/hold/yük/rest/RIR/RPE ve hareket biyomekaniğinden türetilen karar-destek indeksleridir.</p>`:""}
 <div class="adhoc-columns"><div><h4>En çok çalışan kaslar</h4>${muscles.map(([m,v])=>`<div class="adhoc-bar"><span>${MUSCLE_LABELS[m]||m}</span><i style="width:${Math.min(100,v/(muscles[0]?.[1]||1)*100)}%"></i><b>${v.toFixed(1)}</b></div>`).join("")}</div>
 <div><h4>Seans karakteri</h4>${qs.map(([k,v])=>`<div class="adhoc-bar"><span>${QUALITY_LABELS[k]||k}</span><i style="width:${v*10}%"></i><b>${v.toFixed(1)}</b></div>`).join("")}</div></div>
 <div class="insight-box ${a.fatigue>=80?"warn":"good"}"><strong>Artısı:</strong> ${plus}<br><strong>Eksisi / trade-off:</strong> ${minus}<br><span class="athlete-profile-note">Bu seans plan uyumu olarak sayılmaz; fakat gerçek kas yükü ve recovery hesabına dahil edilir.</span></div>`;
}
function renderHistory(){
 const el=q("adhocHistory");if(!el)return;const rows=(db.adHocSessions||[]).slice(-5).reverse();
 el.innerHTML=rows.length?`<div class="section-head compact"><div><h4>Son serbest seanslar</h4></div></div>${rows.map(s=>`<div class="adhoc-history-row"><span>${s.date} · ${STRUCTURE_LABELS[s.structure]||s.structure}</span><strong>${s.rounds} tur · ${s.duration} dk · RPE ${s.rpe}</strong><small>${s.movements.map(x=>x.name).join(" → ")}</small></div>`).join("")}`:"";
}
function clearDraft(){draft=[];renderDraft();if(q("adhocAnalysis"))q("adhocAnalysis").innerHTML=""}
function init(){
 db.adHocSessions=Array.isArray(db.adHocSessions)?db.adHocSessions:[];
 fillExercises();renderDraft();renderHistory();
 q("adhocExerciseSelect")?.addEventListener("change",updateValueMode);
 q("adhocAddMovement")?.addEventListener("click",addMovement);
 q("adhocSaveSession")?.addEventListener("click",saveSession);
 q("adhocClearDraft")?.addEventListener("click",clearDraft);
}
window.AdHocSession={removeMovement,renderHistory,clearDraft,densityClass,summarizeRows,analyzeSession:(session,rows)=>summarizeRows(rows,session)};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
