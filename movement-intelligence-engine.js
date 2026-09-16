
(function(){
"use strict";

let scienceEvidence=null;
fetch("movement-science-evidence.json").then(r=>r.json()).then(x=>{scienceEvidence=x;renderScienceNote()}).catch(()=>{});

const MUSCLE_LABELS={
 chest:"Göğüs",frontDelts:"Ön Omuz",sideDelts:"Yan Omuz",rearDelts:"Arka Omuz",triceps:"Triceps",biceps:"Biceps",
 forearms:"Önkol / Grip",lats:"Lat",upperBack:"Üst Sırt",traps:"Trapez",scapular:"Scapular Stabilizatör",
 abs:"Karın",obliques:"Oblique",spinalErectors:"Erector Spinae",glutes:"Glute",quads:"Quadriceps",
 hamstrings:"Hamstring",adductors:"Adductor",calves:"Calf",hipFlexors:"Hip Flexor"
};
const QUALITY_LABELS={strength:"Kuvvet",hypertrophy:"Hipertrofi",power:"Power",skill:"Skill",stability:"Stabilizasyon",core:"Core",endurance:"Dayanıklılık"};

const EQUIPMENT_LABELS={
 "Pull-Up Bar":"Bar","Rings":"Jimnastik Halkaları","Parallettes":"Paralet","Floor":"Zemin",
 "Weight Belt":"Ağırlık Kemeri","Vertical Bar":"Dikey Bar","Dumbbells":"Dumbbell","Dumbbell":"Dumbbell","EZ Bar":"EZ Bar",
 "Backpack":"Sırt Çantası","Bodyweight":"Vücut Ağırlığı","Outdoor":"Dış Mekan","Treadmill":"Koşu Bandı"
};
function equipmentLabel(x){return EQUIPMENT_LABELS[x]||x||"Belirsiz"}
function selectedEquipment(){
 const opt=q("exerciseSelect")?.selectedOptions?.[0];
 if(opt?.dataset?.executionEquipment)return opt.dataset.executionEquipment;
 const k=selectedKnowledge();return k?.variantEquipment||k?.equipment?.[0]||null;
}
function optionLabel(e,k,filter){
 const base=k.displayName||e.n;
 let eq=k.variantEquipment||null;
 if(filter && filter!=="all")eq=filter;
 else if(!eq && (k.equipment||[]).length===1)eq=k.equipment[0];
 return (k.variantGroup||eq)?`${base} · ${equipmentLabel(eq||k.equipment?.[0])}`:base;
}


function knowledge(name){
 return window.EXERCISE_KNOWLEDGE?.[name]||inferKnowledge(name);
}
function inferKnowledge(name){
 const e=EXERCISES.find(x=>x.n===name)||{type:"DYNAMIC"},m=V5_EXERCISE_MUSCLES[name]||{},s=EXERCISE_SCIENCE[name]||{};
 return {
   name,type:e.type,equipment:s.equipment||[],metric:e.type==="STATIC"?"seconds":e.type==="RUN"?"minutes":"reps",
   contraction:e.type==="STATIC"?"Isometric":e.type==="RUN"?"Cyclic":"Dynamic",
   pattern:s.pattern||"General",muscles:m,
   qualities:{strength:s.strength||5,hypertrophy:s.hypertrophy||5,power:s.power||2,skill:s.skill||2,stability:4,core:m.abs||m.obliques?6:3,endurance:s.endurance||5},
   evidence:"Legacy exercise map / biomechanical inference",evidenceConfidence:"low-medium",note:"Generic profile generated from the internal exercise map."
 };
}
function confidenceWeight(c){
 c=String(c||"").toLowerCase();return c.includes("high")?.95:c==="medium"?.78:c.includes("low")?.55:.68;
}
function staticHoldFactor(sec,band){
 sec=+sec||0;if(sec<=0)return 0;
 const lo=band?.[0]||5,hi=band?.[1]||15;
 if(sec<lo*.4)return .35;
 if(sec<lo)return .65+.25*(sec/lo);
 if(sec<=hi)return 1.0;
 if(sec<=hi*1.75)return .95;
 return .85; // very long hold shifts toward endurance; don't scale muscle stimulus linearly forever
}
function dataConfidenceFactor(r){return r?.dataConfidence==="medium"?.65:r?.dataConfidence==="low"?.40:1}
function exerciseDoseUnits(row){
 const k=knowledge(row?.name),sets=(row?.sets||[]).map(Number).filter(x=>x>0),conf=dataConfidenceFactor(row);
 if(!sets.length)return 0;
 if(k.doseModel==="sprint_work_seconds"){
   // Each high-speed bout is one bounded exposure unit; longer sprints increase dose sub-linearly.
   return sets.reduce((sum,s)=>sum+clamp(.55+s/12,.65,1.65),0)*conf;
 }
 if(k.doseModel==="interval_work_seconds")return sets.reduce((sum,s)=>sum+clamp(.45+s/90,.55,1.55),0)*conf;
 if((row?.metricUnit||k.metric)==="seconds" || row?.type==="STATIC"){
   const units=sets.reduce((sum,s)=>sum+staticHoldFactor(s,k.staticHoldBandSec),0);
   return units*conf;
 }
 return sets.length*effectiveSetFactor(row);
}
function exerciseMetricText(r){
 const k=knowledge(r?.name),sets=(r?.sets||[]).map(Number).filter(x=>x>0);
 if(!sets.length)return "veri yok";
 const metric=r?.metricUnit||k.metric;
 if(metric==="seconds"||r?.type==="STATIC"){
   const total=sets.reduce((a,b)=>a+b,0),best=Math.max(...sets),avgValue=total/sets.length;
   if(k.doseModel==="sprint_work_seconds"||k.doseModel==="interval_work_seconds")return `${sets.length} interval · ort ${avgValue.toFixed(1)} sn · toplam çalışma ${total.toFixed(1)} sn`;
   return `${sets.length} hold · best ${best.toFixed(best%1?1:0)} sn · toplam ${total.toFixed(total%1?1:0)} sn · ort ${avgValue.toFixed(1)} sn`;
 }
 if(metric==="minutes")return `${sets.reduce((a,b)=>a+b,0).toFixed(1)} dk`;
 if(metric==="km")return `${sets.reduce((a,b)=>a+b,0).toFixed(2)} km · ${sets.length} kayıt`;
 return `${sets.reduce((a,b)=>a+b,0)} tekrar · ${sets.length} set`;
}
function impactForRow(row){
 const k=knowledge(row.name),dose=exerciseDoseUnits(row),out={};
 Object.entries(k.muscles||V5_EXERCISE_MUSCLES[row.name]||{}).forEach(([m,c])=>out[m]=(out[m]||0)+dose*c);
 return out;
}
window.exerciseDoseUnits=exerciseDoseUnits;
window.exerciseMetricText=exerciseMetricText;
window.movementKnowledge=knowledge;

function currentRows(){
 try{return rowsForTarget(selectedSessionTargetKey())}catch(e){return db.trainingLogs?.[todayKey()]||[]}
}
function selectedKnowledge(){
 const idx=Number(q("exerciseSelect")?.value),e=EXERCISES[idx];return e?knowledge(e.n):null;
}
function rebuildExerciseSelect(){
 const filter=q("exerciseEquipmentFilter"),sel=q("exerciseSelect");if(!sel)return;
 const allEquipment=[...new Set(EXERCISES.flatMap(e=>knowledge(e.n).equipment||[]).filter(Boolean))]
   .sort((a,b)=>equipmentLabel(a).localeCompare(equipmentLabel(b),"tr"));
 if(filter){
   const priorFilter=filter.value||"all";
   filter.innerHTML=["all",...allEquipment].map(x=>`<option value="${x}">${x==="all"?"Tüm ekipmanlar":equipmentLabel(x)}</option>`).join("");
   if([...filter.options].some(o=>o.value===priorFilter))filter.value=priorFilter;
 }
 const f=filter?.value||"all";
 const prevName=sel.selectedOptions?.[0]?.dataset?.movementName||EXERCISES[Number(sel.value)]?.n||null;
 let list=EXERCISES.map((e,i)=>({e,i,k:knowledge(e.n)}))
   .filter(x=>!x.k.hiddenFromManual)
   .filter(x=>f==="all"||(x.k.equipment||[]).includes(f));

 // Within a concrete equipment filter, one movement family can resolve to only one exact variant.
 if(f!=="all"){
   const byGroup=new Map(),plain=[];
   list.forEach(x=>{
     const g=x.k.variantGroup;
     if(!g){plain.push(x);return}
     const exact=x.k.variantEquipment===f,current=byGroup.get(g);
     if(!current || (exact && current.k.variantEquipment!==f))byGroup.set(g,x);
   });
   list=[...plain,...byGroup.values()];
 }

 // Remove accidental duplicates while retaining both real variants in "all".
 const seen=new Set();
 list=list.filter(x=>{
   const key=x.k.variantGroup?`${x.k.variantGroup}|${x.k.variantEquipment||x.k.equipment?.join("+")}`:x.e.n;
   if(seen.has(key))return false;
   seen.add(key);return true;
 });
 list.sort((a,b)=>{
   const an=a.k.displayName||a.e.n,bn=b.k.displayName||b.e.n;
   return an.localeCompare(bn,"tr") ||
     equipmentLabel(a.k.variantEquipment||a.k.equipment?.[0]).localeCompare(equipmentLabel(b.k.variantEquipment||b.k.equipment?.[0]),"tr");
 });
 sel.innerHTML=list.map(x=>{
   const executionEquipment=f!=="all"?f:(x.k.variantEquipment||((x.k.equipment||[]).length===1?x.k.equipment[0]:""));
   return `<option value="${x.i}" data-movement-name="${x.e.n}" data-execution-equipment="${executionEquipment}">${optionLabel(x.e,x.k,f)}</option>`;
 }).join("");

 let restore=[...sel.options].find(o=>o.dataset.movementName===prevName);
 if(!restore && f!=="all"){
   const prevK=prevName?knowledge(prevName):null;
   if(prevK?.variantGroup)restore=[...sel.options].find(o=>knowledge(o.dataset.movementName)?.variantGroup===prevK.variantGroup);
 }
 if(restore)sel.value=restore.value;
 updateInputMode();
}
function labelText(id,text){
 const l=q(id);if(!l)return;
 const input=l.querySelector("input");if(!input)return;
 Array.from(l.childNodes).filter(n=>n.nodeType===3).forEach(n=>n.remove());
 l.insertBefore(document.createTextNode(text+" "),input.closest(".entry-field")||input);
}
function updateInputMode(){
 const k=selectedKnowledge();if(!k)return;
 const staticMode=k.metric==="seconds",minuteMode=k.metric==="minutes",kmMode=k.metric==="km";
 for(let i=1;i<=5;i++){
   labelText(`setLabel${i}`,staticMode?`Hold ${i} (sn)`:minuteMode?`Blok ${i} (dk)`:kmMode?`Mesafe ${i} (km)`:`Set ${i} (tekrar)`);
   const inp=q("set"+i);if(inp)inp.step=(staticMode||minuteMode)?".1":kmMode?".01":"1";
 }
 labelText("exerciseRirLabel",staticMode?"Hold reserve / efor (0–5)":kmMode?"Koşu RIR / efor rezervi":"RIR");
 const loadLabel=q("exerciseLoadLabel"),loadRec=window.LoadPrescriptionEngine?.recommend?.(k.name,"",window.todayKey?.()||null,{readinessScore:window.readiness?.(window.db?.daily?.[window.todayKey?.()])});
 if(loadLabel){
   loadLabel.style.display=(k.type==="WEIGHTED"||k.type==="BARBELL"||k.name.includes("Weighted"))?"grid":"none";
   if(loadRec?.applicable)labelText("exerciseLoadLabel",loadRec.label||"Ek yük (kg)");
 }
 renderPreview();
 window.RestIntervalEngine?.setRestInputFromExercise?.(true);
}
function percentBar(v){return `<div class="movement-quality-bar"><i style="width:${Math.max(0,Math.min(100,(+v||0)*10))}%"></i></div>`}
function renderPreview(){
 const el=q("movementEffectPreview"),k=selectedKnowledge();if(!el||!k)return;
 const muscles=Object.entries(k.muscles||{}).sort((a,b)=>b[1]-a[1]);
 const top=muscles.slice(0,3),rest=muscles.slice(3);
 const evidenceClass=String(k.evidenceConfidence).includes("high")?"high":String(k.evidenceConfidence).includes("low")?"low":"medium";
 el.innerHTML=`<div class="movement-preview-head">
   <div><span>${k.contraction}</span><strong>${k.displayName||k.name}</strong><small>${k.pattern} · Uygulama: ${equipmentLabel(selectedEquipment())}</small></div>
   <div><span class="movement-evidence ${evidenceClass}">${k.evidenceConfidence} kanıt</span><span class="movement-metric">${k.metric==="seconds"?"Saniye / hold":k.metric==="minutes"?"Dakika":k.metric==="km"?"Kilometre":"Tekrar"}</span></div>
 </div>
 <div class="movement-muscle-chips">
   ${top.map(([m,c])=>`<span class="primary">${MUSCLE_LABELS[m]||m} · ${Math.round(c*100)}</span>`).join("")}
   ${rest.map(([m,c])=>`<span>${MUSCLE_LABELS[m]||m} · ${Math.round(c*100)}</span>`).join("")}
 </div>
 <div class="movement-quality-grid">${Object.entries(k.qualities||{}).map(([qv,v])=>`<div><span>${QUALITY_LABELS[qv]||qv}</span><strong>${v}/10</strong>${percentBar(v)}</div>`).join("")}</div>
 <p>${k.note||"Hareket etkisi internal Movement Intelligence veritabanından okunuyor."} <b>Kas katsayıları yüzde EMG veya büyüme yüzdesi değildir.</b></p>`;
 renderLoadPrescription();renderUnifiedPhysiologyPreview();
}

function provisionalRow(){
 const sel=q("exerciseSelect"),e=EXERCISES[Number(sel?.value)],k=selectedKnowledge();if(!e||!k)return null;
 const sets=[1,2,3,4,5].map(i=>+q("set"+i)?.value||0).filter(x=>x>0);
 const rests=["rest12","rest23","rest34","rest45"].map(id=>+q(id)?.value).filter(Number.isFinite);
 return {name:e.n,type:e.type,load:+q("exerciseLoad")?.value||0,sets,rir:+q("exerciseRir")?.value||2,
  metricUnit:k.metric,executionEquipment:selectedEquipment(),plannedRestSec:+q("exerciseRestPlanned")?.value||0,restBetweenSets:rests};
}
function renderLoadPrescription(){
 const el=q("loadPrescriptionBox"),k=selectedKnowledge();if(!el||!k)return;
 const r=window.LoadPrescriptionEngine?.recommend?.(k.name,"",window.todayKey?.()||null,{readinessScore:window.readiness?.(window.db?.daily?.[window.todayKey?.()])});
 if(!r?.applicable){el.innerHTML="";el.hidden=true;return}
 el.hidden=false;
 el.innerHTML=`<div class="load-prescription-head"><span>LOAD PRESCRIPTION</span><strong>${r.display}</strong><small>Güven ${r.confidence}/100 · ${r.source}</small></div><p>${r.rationale}</p>`;
 const inp=q("exerciseLoad");
 if(inp&&r.value!=null&&(+inp.value||0)===0){inp.placeholder=String(r.value)}
}
function demandBar(label,v){return `<div class="upi-demand"><span>${label}</span><div><i style="width:${Math.max(0,Math.min(100,+v||0))}%"></i></div><strong>${Math.round(+v||0)}</strong></div>`}
function renderUnifiedPhysiologyPreview(){
 const el=q("unifiedPhysiologyPreview"),row=provisionalRow();if(!el||!row)return;
 if(!(row.sets||[]).length){el.innerHTML='<div class="upi-empty">Set/hold değerlerini girdikçe merkezi fizyolojik analiz burada oluşacak.</div>';return}
 const x=window.AthleteLoadMesh?.movementImpact?.(row,{date:window.todayKey?.()||"",rpe:Math.max(1,10-(+row.rir||2))});
 if(!x){el.innerHTML="";return}
 const d=x.demands||{},a=x.adaptation||{},e=x.energySystems||{};
 el.innerHTML=`<div class="upi-head"><div><span>UNIFIED PHYSIOLOGY</span><strong>${x.mode}</strong><small>Güven ${Math.round(x.confidence||0)}/100</small></div><span class="plan-badge">Recovery ${Math.round(x.loads?.recoveryCost||0)}/100</span></div>
 <div class="upi-grid">${demandBar("Mekanik",d.mechanical)}${demandBar("Metabolik",d.metabolic)}${demandBar("Nöral",d.neural)}${demandBar("Skill",d.skill)}${demandBar("Kardiyo",d.cardio||d.cardiovascular)}${demandBar("Stabilite",d.stability)}</div>
 <div class="upi-energy"><span>ATP-PCr <b>${Math.round(e.phosphagen||0)}</b></span><span>Glikolitik <b>${Math.round(e.glycolytic||0)}</b></span><span>Aerobik <b>${Math.round(e.aerobic||0)}</b></span></div>
 <p>${x.interpretation||""} <b>Bu değerler ölçülmüş biyolojik yüzdeler değil, karar-destek demand indeksleridir.</b></p>`;
}

function sessionMuscles(rows){
 const totals={};rows.forEach(r=>Object.entries(impactForRow(r)).forEach(([m,v])=>totals[m]=(totals[m]||0)+v));return totals;
}
function renderSessionMuscleImpact(){
 const el=q("sessionMuscleImpact");if(!el)return;
 const rows=currentRows(),tot=sessionMuscles(rows),arr=Object.entries(tot).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]),max=arr[0]?.[1]||1,total=arr.reduce((s,[,v])=>s+v,0);
 q("sessionStimulusBadge").textContent=`${total.toFixed(1)} weighted unit`;
 if(!arr.length){el.innerHTML='<div class="record-empty">Hareket ekledikçe kas etkisi burada oluşacak.</div>';return}
 el.innerHTML=arr.slice(0,12).map(([m,v])=>`<div class="session-muscle-row"><span>${MUSCLE_LABELS[m]||m}</span><div><i style="width:${Math.round(v/max*100)}%"></i></div><strong>${v.toFixed(1)}</strong></div>`).join("");
}
function renderSignature(){
 const el=q("sessionEffectSignature");if(!el)return;
 const rows=currentRows();
 if(!rows.length){el.innerHTML='<div class="record-empty">Etki imzası için antrenman kaydı bekleniyor.</div>';q("sessionMovementConfidence").textContent="Güven --";q("sessionStaticSummary").textContent="Henüz seans verisi yok.";return}
 const sums={strength:0,hypertrophy:0,power:0,skill:0,stability:0,core:0,endurance:0},confs=[];let den=0;
 let staticSec=0,staticSets=0,explosiveSets=0,ringMovements=0;
 rows.forEach(r=>{
   const k=knowledge(r.name),dose=Math.max(.25,exerciseDoseUnits(r));den+=dose;confs.push(confidenceWeight(k.evidenceConfidence));
   Object.keys(sums).forEach(x=>sums[x]+=((k.qualities||{})[x]||0)*dose);
   if(k.metric==="seconds"||r.type==="STATIC"){const s=(r.sets||[]).map(Number).filter(Boolean);staticSec+=s.reduce((a,b)=>a+b,0);staticSets+=s.length}
   if((k.qualities?.power||0)>=8)explosiveSets+=(r.sets||[]).filter(Boolean).length;
   if((k.equipment||[]).includes("Rings"))ringMovements++;
 });
 const avgQ=Object.fromEntries(Object.entries(sums).map(([k,v])=>[k,den?v/den:0]));
 el.innerHTML=Object.entries(avgQ).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="effect-signature-row"><span>${QUALITY_LABELS[k]||k}</span><div><i style="width:${Math.round(v*10)}%"></i></div><strong>${v.toFixed(1)}/10</strong></div>`).join("");
 q("sessionMovementConfidence").textContent=`Güven ${Math.round(avg(confs)*100)}/100`;
 q("sessionStaticSummary").innerHTML=`<strong>Seans yapısı:</strong> ${staticSets?`${staticSets} statik hold · ${staticSec.toFixed(0)} sn toplam izometrik süre. `:""}${explosiveSets?`${explosiveSets} patlayıcı/power seti. `:""}${ringMovements?`${ringMovements} halka hareketi. `:""}Statik saniyeler doğrusal biçimde “set” sayılmaz; hold süresi bounded quality factor ile stimulus-equivalent unit'e çevrilir.`;
}
function renderScienceNote(){
 const el=q("movementScienceNote");if(!el)return;
 const n=scienceEvidence?.principles?.length||6;
 el.innerHTML=`<div class="section-head"><div><h3>Movement Science Database</h3><p class="hint">Hareket anatomisi + antrenman bilimi + evidence confidence birlikte tutulur.</p></div><span class="plan-badge">${window.EXERCISE_KNOWLEDGE_META?.count||0} curated movement</span></div>
 <p>Statik hareketler <b>izometrik</b>, Muscle-Up / Ring Muscle-Up ise <b>patlayıcı mixed-skill</b> olarak modellenir. Halka egzersizleri instability/stabilization talebini ayrıca taşır. Kütüphanede ${n} ana bilimsel kaynak metadata'sı bulunuyor; hareket bazında doğrudan çalışma yoksa sistem bunu biomechanical inference olarak etiketler.</p>`;
}

const NON_EXERCISE_COACH_ITEMS=new Set(["Hydration + Sleep"]);
function coachCatalogAudit(){
 const issues=[],seen=new Set(),templates=typeof HYBRID_TEMPLATES!=="undefined"?HYBRID_TEMPLATES:{};
 Object.values(templates).forEach(t=>(t.items||[]).forEach(it=>{
   const name=it[0];if(seen.has(name)||NON_EXERCISE_COACH_ITEMS.has(name))return;seen.add(name);
   const ex=EXERCISES.find(x=>x.n===name),k=window.EXERCISE_KNOWLEDGE?.[name]||null;
   if(!ex)issues.push({name,reason:"EXERCISES listesinde yok"});
   if(!k)issues.push({name,reason:"Movement Intelligence profili yok"});
   else{
     if(!k.metric)issues.push({name,reason:"metric tanımsız"});
     if(!Array.isArray(k.equipment)||!k.equipment.length)issues.push({name,reason:"equipment tanımsız"});
   }
 }));
 return {ok:issues.length===0,issues,total:seen.size,valid:seen.size-new Set(issues.map(x=>x.name)).size};
}
function renderCatalogAudit(){
 const b=q("coachCatalogIntegrityBadge");if(!b)return;
 const a=coachCatalogAudit();
 b.textContent=a.ok?`Coach ↔ Katalog ${a.valid}/${a.total} OK`:`Katalog ${a.valid}/${a.total} · ${a.issues.length} hata`;
 b.className=`version-chip ${a.ok?"":"catalog-bad"}`;
 b.title=a.issues.map(x=>`${x.name}: ${x.reason}`).join("\n");
}
function render(){renderPreview();renderSessionMuscleImpact();renderSignature();renderScienceNote();renderCatalogAudit();renderLoadPrescription();renderUnifiedPhysiologyPreview()}
function bind(){
 const filter=q("exerciseEquipmentFilter");if(filter)filter.onchange=rebuildExerciseSelect;
 const sel=q("exerciseSelect");if(sel)sel.addEventListener("change",updateInputMode);
 ["exerciseLoad","set1","set2","set3","set4","set5","exerciseRir","exerciseRestPlanned","rest12","rest23","rest34","rest45"].forEach(id=>q(id)?.addEventListener("input",()=>{renderLoadPrescription();renderUnifiedPhysiologyPreview()}));
 q("addExerciseBtn")?.addEventListener("click",()=>setTimeout(render,100));
 document.querySelector('.nav-btn[data-page="training"]')?.addEventListener("click",()=>setTimeout(()=>{rebuildExerciseSelect();render()},0));
}
function init(){
 rebuildExerciseSelect();bind();render();
 try{renderMuscleReport()}catch(e){}
}
window.MovementIntelligence={render,knowledge,exerciseDoseUnits,exerciseMetricText,impactForRow,rebuildExerciseSelect,selectedEquipment,equipmentLabel,coachCatalogAudit,renderCatalogAudit,renderLoadPrescription,renderUnifiedPhysiologyPreview};
init();
})();
