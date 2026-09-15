
(function(){
"use strict";
const C=window.PainIntelligenceCore;
const JOINTS={
 shoulder:"Omuz",elbow:"Dirsek",wrist:"El bileği",hand:"El / avuç",neck:"Boyun",
 upperBack:"Üst sırt",lowBack:"Bel / lumbar",hip:"Kalça",knee:"Diz",ankle:"Ayak bileği",foot:"Ayak"
};
const SIDES={left:"Sol",right:"Sağ",bilateral:"İki taraf",midline:"Orta hat"};
const CONTEXTS={movement:"hareket sırasında",after_training:"antrenman sonrası",rest:"dinlenirken",morning:"sabah",daily:"günlük yaşamda"};
const SENSATIONS={ache:"sızı/ağrı",sharp:"keskin",stiffness:"sertlik",burning:"yanma",tingling:"uyuşma/karıncalanma",other:"diğer"};

function id(){return `pain_${Date.now()}_${Math.random().toString(36).slice(2,7)}`}
function allEntries(){
 const out=[];Object.entries(db.painLogs||{}).forEach(([date,rows])=>(Array.isArray(rows)?rows:[]).forEach((r,index)=>out.push({...r,_date:date,_index:index})));
 return out;
}
function activeEntries(date=todayKey()){return allEntries().filter(r=>C.activeAtDate(r,date))}
function entriesForDate(date){return allEntries().filter(r=>r._date===date)}
function findEntry(entryId){return allEntries().find(r=>r.id===entryId)||null}
function entryLabel(r){return `${SIDES[r?.side]||""} ${JOINTS[r?.joint]||r?.joint||""}`.trim()}
function severityClass(v){return +v>=7?"bad":+v>=4?"warn":"good"}
function initExerciseSelect(){
 const el=q("painTriggerExercise");if(!el)return;
 const prev=el.value;const names=[...new Set(EXERCISES.map(x=>x.n))].sort((a,b)=>a.localeCompare(b,"tr"));
 el.innerHTML='<option value="">Belirli hareket yok / bilmiyorum</option>'+names.map(n=>`<option value="${n}">${n}</option>`).join("");
 if(names.includes(prev))el.value=prev;
}
function redFlagsFromUI(){
 return {
  swelling:!!q("painFlagSwelling")?.checked,numbness:!!q("painFlagNumbness")?.checked,
  weakness:!!q("painFlagWeakness")?.checked,instability:!!q("painFlagInstability")?.checked,
  cannotUse:!!q("painFlagCannotUse")?.checked,nightRestPain:!!q("painFlagNightRestPain")?.checked
 };
}
function resetForm(){
 if(q("painSeverity"))q("painSeverity").value=0;
 if(q("painDurationDays"))q("painDurationDays").value=0;
 if(q("painNote"))q("painNote").value="";
 if(q("painTriggerExercise"))q("painTriggerExercise").value="";
 ["painFlagSwelling","painFlagNumbness","painFlagWeakness","painFlagInstability","painFlagCannotUse","painFlagNightRestPain"].forEach(x=>{if(q(x))q(x).checked=false});
}
function saveEntry(){
 const date=q("painLogDate")?.value||todayKey(),severity=+q("painSeverity")?.value||0;
 if(severity<=0)return alert("Ağrı şiddetini 1–10 arasında gir.");
 const row={
   id:id(),date,joint:q("painJoint")?.value||"wrist",side:q("painSide")?.value||"left",
   severity:Math.min(10,Math.max(1,severity)),context:q("painContext")?.value||"movement",
   onset:q("painOnset")?.value||"gradual",sensation:q("painSensation")?.value||"ache",
   durationDays:+q("painDurationDays")?.value||0,triggerExercise:q("painTriggerExercise")?.value||"",
   note:q("painNote")?.value||"",redFlags:redFlagsFromUI(),status:"active",
   createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
 };
 db.painLogs[date]=Array.isArray(db.painLogs[date])?db.painLogs[date]:[];
 db.painLogs[date].push(row);save();
 resetForm();refreshAfterChange("pain log added");
 const st=q("painSaveStatus");if(st){st.textContent="✓ Kaydedildi";st.classList.add("ok");setTimeout(()=>{st.textContent="";st.classList.remove("ok")},2200)}
}
function resolveEntry(entryId){
 const r=findEntry(entryId);if(!r)return;
 const original=db.painLogs[r._date]?.[r._index];if(!original)return;
 original.status="resolved";original.resolvedAt=new Date().toISOString();original.updatedAt=original.resolvedAt;save();refreshAfterChange("pain resolved");
}
function deleteEntry(entryId){
 const r=findEntry(entryId);if(!r||!confirm(`${entryLabel(r)} ağrı kaydı silinsin mi?`))return;
 db.painLogs[r._date].splice(r._index,1);if(!db.painLogs[r._date].length)delete db.painLogs[r._date];save();refreshAfterChange("pain deleted");
}
function editEntry(entryId){
 const r=findEntry(entryId);if(!r)return;
 q("painLogDate").value=r._date;q("painJoint").value=r.joint;q("painSide").value=r.side;q("painSeverity").value=r.severity;
 q("painContext").value=r.context||"movement";q("painOnset").value=r.onset||"gradual";q("painSensation").value=r.sensation||"ache";
 q("painDurationDays").value=r.durationDays||0;q("painTriggerExercise").value=r.triggerExercise||"";q("painNote").value=r.note||"";
 Object.entries(r.redFlags||{}).forEach(([k,v])=>{
   const map={swelling:"painFlagSwelling",numbness:"painFlagNumbness",weakness:"painFlagWeakness",instability:"painFlagInstability",cannotUse:"painFlagCannotUse",nightRestPain:"painFlagNightRestPain"};
   if(map[k]&&q(map[k]))q(map[k]).checked=!!v;
 });
 deleteEntrySilent(entryId);
 const b=q("savePainLogBtn");if(b)b.textContent="Ağrı Kaydını Güncelle";
}
function deleteEntrySilent(entryId){
 const r=findEntry(entryId);if(!r)return;
 db.painLogs[r._date].splice(r._index,1);if(!db.painLogs[r._date].length)delete db.painLogs[r._date];save();
}
function jointLoadProfile(name){
 const k=window.movementKnowledge?.(name)||window.EXERCISE_KNOWLEDGE?.[name]||{},s=String(name||"").toLowerCase(),p=String(k.pattern||"").toLowerCase();
 const load={shoulder:1,elbow:1,wrist:1,hand:1,neck:0,upperBack:1,lowBack:1,hip:1,knee:1,ankle:1,foot:1};
 const bump=(j,v)=>load[j]=Math.max(load[j]||0,v);
 if(/planche/.test(s)){bump("shoulder",9);bump("elbow",7);bump("wrist",10);bump("hand",7);bump("upperBack",5)}
 if(/handstand|hspu|pike push/.test(s)){bump("shoulder",8);bump("elbow",6);bump("wrist",9);bump("hand",6);bump("neck",3)}
 if(/dip|push-up|push up|bench|ohp|overhead|triceps/.test(s)||/push/.test(p)){bump("shoulder",7);bump("elbow",7);bump("wrist",5);bump("hand",4)}
 if(/muscle-up|muscle up/.test(s)){bump("shoulder",9);bump("elbow",8);bump("wrist",6);bump("hand",6);bump("upperBack",6)}
 if(/pull-up|pull up|chin-up|chin up|row|curl|lever|pulldown|pull/.test(s)||/pull/.test(p)){bump("shoulder",7);bump("elbow",8);bump("wrist",4);bump("hand",6);bump("upperBack",7)}
 if(/front lever|back lever/.test(s)){bump("shoulder",9);bump("elbow",7);bump("lowBack",4);bump("upperBack",7)}
 if(/rdl|deadlift|good morning|row/.test(s)){bump("lowBack",8);bump("hip",7);bump("upperBack",6)}
 if(/squat|lunge|split squat|step-up|step up|leg press|pistol/.test(s)){bump("hip",7);bump("knee",9);bump("ankle",6);bump("foot",5)}
 if(/run|sprint|jump|calf/.test(s)){bump("hip",6);bump("knee",7);bump("ankle",9);bump("foot",9)}
 if(/l-sit|l sit|compression/.test(s)){bump("hip",7);bump("lowBack",4);bump("wrist",5)}
 if((k.equipment||[]).includes("Rings")){bump("shoulder",(load.shoulder||0)+1);bump("elbow",(load.elbow||0)+1);bump("hand",Math.max(load.hand||0,5))}
 Object.keys(load).forEach(j=>load[j]=Math.min(10,load[j]));
 return load;
}
function movementSide(name){
 const s=String(name||"").toLowerCase();
 if(/\bleft\b|\bsol\b/.test(s))return"left";if(/\bright\b|\bsağ\b/.test(s))return"right";
 return"bilateral";
}
function exerciseAdvice(name,date=todayKey()){
 const active=activeEntries(date),load=jointLoadProfile(name),mSide=movementSide(name),hits=[];
 active.forEach(r=>{
   if(!C.sideCompatible(r.side,mSide))return;
   const j=C.jointKey(r.joint),l=load[j]||0;if(l<3)return;
   const risk=(+r.severity||0)*l/10;
   hits.push({entry:r,load:l,risk,red:C.redFlag(r)});
 });
 if(!hits.length)return {level:0,short:"",detail:"",hits:[]};
 hits.sort((a,b)=>(b.red-a.red)||b.risk-a.risk);
 const top=hits[0],sev=+top.entry.severity||0;
 let level=1,short,detail;
 if(top.red||sev>=7&&top.load>=5){
   level=3;short=`${entryLabel(top.entry)} ${sev}/10 → bu bölgeyi belirgin yükleyen hareketi bugün zorlamadan değiştir/atla`;
   detail="Yüksek ağrı veya red-flag bilgisi var. Ağrıyı provoke eden yükleme yerine değerlendirme ve ağrısız aktivite öncelikli.";
 }else if(sev>=4&&top.load>=5){
   level=2;short=`${entryLabel(top.entry)} ${sev}/10 → hacim/yoğunluğu azalt, yalnız ağrısız ROM/variasyon kullan`;
   detail="Orta düzey ağrı + yüksek joint-load eşleşmesi. Aynı paternde progresyon yerine yük azaltma ve semptom takibi daha uygun.";
 }else{
   level=1;short=`${entryLabel(top.entry)} ${sev}/10 → semptomu izle; artarsa seti sonlandır veya varyasyonu değiştir`;
   detail="Düşük düzey sinyal. Ağrı yükselmeden teknik kaliteyi koru.";
 }
 return {level,short,detail,hits};
}
function activeHotspots(date=todayKey()){
 return activeEntries(date).map(r=>({id:r.id,joint:r.joint,side:r.side,severity:+r.severity||0,label:entryLabel(r),redFlag:C.redFlag(r),date:r._date||r.date}));
}
function primaryRecommendations(){
 const entries=activeEntries(todayKey()).sort((a,b)=>(C.redFlag(b)-C.redFlag(a))||(+b.severity||0)-(+a.severity||0));
 if(!entries.length)return [];
 return entries.slice(0,4).map(r=>{
   const trigger=r.triggerExercise,adv=trigger?exerciseAdvice(trigger,todayKey()):null,red=C.redFlag(r),sev=+r.severity||0;
   if(red)return {class:"bad",title:`${entryLabel(r)} · ${sev}/10`,text:"Travma/red-flag bilgisi işaretli. Ağrıyı provoke eden yüklemeyi zorlamadan bırak ve uygun bir sağlık profesyonelinden değerlendirme al."};
   if(sev>=7)return {class:"bad",title:`${entryLabel(r)} · ${sev}/10`,text:`Yüksek ağrı sinyali. ${trigger?`${trigger} gibi bölgeyi yükleyen hareketlerde`: "İlgili eklemi yükleyen hareketlerde"} bugün progresyon yapma; ağrısız alternatif/recovery düşün.`};
   if(sev>=4)return {class:"warn",title:`${entryLabel(r)} · ${sev}/10`,text:adv?.detail||"Hacim/yoğunluğu azalt; yalnız ağrısız aralıkta çalış ve seans içinde artış olup olmadığını izle."};
   return {class:"good",title:`${entryLabel(r)} · ${sev}/10`,text:"Düşük düzey sinyal. Teknik ve semptom trendini izle; antrenman sırasında belirgin artarsa hareketi değiştir."};
 });
}
function renderActiveList(){
 const el=q("activePainList");if(!el)return;const rows=activeEntries(todayKey()).sort((a,b)=>(+b.severity||0)-(+a.severity||0));
 if(!rows.length){el.innerHTML='<div class="record-empty">Aktif sağ/sol ağrı kaydı yok.</div>';return}
 el.innerHTML=rows.map(r=>`<div class="pain-log-row ${severityClass(r.severity)}">
   <div><strong>${entryLabel(r)} · ${r.severity}/10</strong><span>${CONTEXTS[r.context]||r.context}${r.triggerExercise?` · ${r.triggerExercise}`:""}${r.durationDays?` · ${r.durationDays} gün`:""}</span><small>${SENSATIONS[r.sensation]||r.sensation}${r.note?` · ${r.note}`:""}</small></div>
   <div class="pain-row-actions"><button onclick="PainIntelligence.open3D('${r.id}')">3D'de Göster</button><button onclick="PainIntelligence.editEntry('${r.id}')">Düzenle</button><button onclick="PainIntelligence.resolveEntry('${r.id}')">Düzeldi</button><button class="danger" onclick="PainIntelligence.deleteEntry('${r.id}')">Sil</button></div>
 </div>`).join("");
}
function renderAdvice(){
 const el=q("painMovementAdvice");if(!el)return;const rec=primaryRecommendations();
 el.innerHTML=rec.length?`<div class="section-head"><div><h4>Coach Ağrı Önerileri</h4><p class="hint">Joint-load eşleşmesine göre, tanı değil.</p></div></div>${rec.map(x=>`<div class="rec-card ${x.class}"><strong>${x.title}</strong>${x.text}</div>`).join("")}`:"";
}
function open3D(entryId){
 const r=findEntry(entryId);if(!r)return;
 goToPage("reports");
 setTimeout(()=>{
   document.querySelector('.overlay-mode[data-overlay="pain"]')?.click();
   window.BodyMap3D?.focusPainEntry?.(entryId);
 },120);
}
function refreshAfterChange(reason){
 try{buildFuturePlanV5(14,reason)}catch(e){}
 safeRender(renderPainCoach);safeRender(renderCoachV5);safeRender(renderTodayTrainingPlanV5);safeRender(renderCommandCenter);safeRender(renderMuscleReport);
 renderActiveList();renderAdvice();window.BodyMap3D?.refreshPainHotspots?.();window.RecordManager?.render?.();
}
function recordsHTML(date){
 const rows=entriesForDate(date);if(!rows.length)return "";
 return rows.map(r=>`<div class="record-item"><div class="record-item-main"><strong>${entryLabel(r)} · ${r.severity}/10 <span class="record-meta-chip">${r.status==="resolved"?"çözüldü":"aktif"}</span></strong><span>${CONTEXTS[r.context]||r.context}${r.triggerExercise?` · ${r.triggerExercise}`:""}${r.note?` · ${r.note}`:""}</span></div><div class="record-actions"><button type="button" class="record-action" onclick="PainIntelligence.editEntry('${r.id}')">Düzenle</button>${r.status!=="resolved"?`<button type="button" class="record-action" onclick="PainIntelligence.resolveEntry('${r.id}')">Düzeldi</button>`:""}<button type="button" class="record-action delete" onclick="PainIntelligence.deleteEntry('${r.id}')">Sil</button></div></div>`).join("");
}
function init(){
 db.painLogs=db.painLogs||{};
 if(q("painLogDate"))q("painLogDate").value=todayKey();
 initExerciseSelect();q("savePainLogBtn")?.addEventListener("click",saveEntry);
 renderActiveList();renderAdvice();
 if(activeEntries(todayKey()).length){try{buildFuturePlanV5(14,"pain intelligence startup")}catch(e){}}
}
window.PainIntelligence={activeEntries,entriesForDate,entryLabel,findEntry,saveEntry,resolveEntry,deleteEntry,editEntry,exerciseAdvice,jointLoadProfile,activeHotspots,open3D,recordsHTML,render:()=>{renderActiveList();renderAdvice()},refreshAfterChange};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
