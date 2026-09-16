
(function(){
"use strict";

const DAILY_FIELDS=[
 ["bedTime","Yatış","time"],["sleepTime","Uykuya dalış","time"],["wakeTime","Uyanış","time"],
 ["nightAwake","Gece uyanıklığı (dk)","number"],["sleepQuality","Uyku kalitesi (1–5)","number"],
 ["energy","Enerji (1–5)","number"],["motivation","Motivasyon (1–5)","number"],["soreness","Kas ağrısı (1–5)","number"],
 ["joint","Eklem rahatlığı (1–5)","number"],["stress","Stres (1–5)","number"],["weight","Kilo (kg)","number"],
 ["waist","Bel (cm)","number"],["runKm","Koşu km","number"],["runMinutes","Koşu süre dk","number"],
 ["runRpe","Koşu RPE","number"],["workIntensity","İş yoğunluğu","number"],["steps","Adım","number"],
 ["fatigueLevel","Halsizlik (0–10)","number"],["illnessSeverity","Hastalık şiddeti (0–10)","number"],["healthNote","Sağlık notu","text"],
 ["painShoulder","Omuz pain","number"],["painElbow","Dirsek pain","number"],["painWrist","El bileği pain","number"],
 ["painBack","Bel pain","number"],["painHip","Kalça pain","number"],["painKnee","Diz pain","number"],["painAnkle","Ayak bileği pain","number"]
];

const BODY_FIELDS=[
 ["weight","Kilo","number"],["shoulders","Omuz","number"],["chest","Göğüs","number"],["waist","Bel","number"],["hips","Kalça","number"],
 ["armR","Sağ kol","number"],["armL","Sol kol","number"],["thighR","Sağ uyluk","number"],["thighL","Sol uyluk","number"],
 ["calfR","Sağ baldır","number"],["calfL","Sol baldır","number"]
];

const CHARACTER_LABELS={
 plancheSec:"Full Planche (sn)",frontLeverSec:"Front Lever (sn)",backLeverSec:"Back Lever (sn)",muscleUpReps:"Muscle-Up tekrar",lSitSec:"L-Sit (sn)",
 bodyweight:"Vücut ağırlığı",wpuLoad:"Weighted Pull-Up yük",wpuReps:"Weighted Pull-Up tekrar",dipLoad:"Weighted Dip yük",dipReps:"Weighted Dip tekrar",ohpKg:"OHP kg",
 run5kMin:"5K dakika",longRunKm:"En uzun koşu km",cooperM:"Cooper metre",weeklyKm:"Haftalık km",
 verticalJumpCm:"Vertical Jump cm",broadJumpCm:"Broad Jump cm",sprint10Sec:"10m sprint",sprint30Sec:"30m sprint",
 maxPullups:"Max Pull-Up",maxPushups:"Max Push-Up",burpee5:"5dk Burpee",plankSec:"Plank sn",
 shoulderMobility:"Omuz mobility",hipMobility:"Kalça mobility",ankleMobility:"Ayak bileği mobility",balanceControl:"Balance/Control"
};

let currentDate=todayKey(), editContext=null, toastTimer=null;
let undoStack=[];
let pendingPhotoUndo=null;
try{undoStack=JSON.parse(sessionStorage.getItem("athleteRecordUndo")||"[]")}catch(e){undoStack=[]}

function cloneDB(){return JSON.parse(JSON.stringify(db))}
function pushUndo(label){
 pendingPhotoUndo=null;
 undoStack.push({label,db:cloneDB(),at:new Date().toISOString()});
 if(undoStack.length>5)undoStack=undoStack.slice(-5);
 try{sessionStorage.setItem("athleteRecordUndo",JSON.stringify(undoStack))}catch(e){}
 updateUndoButton();
}
function updateUndoButton(){
 const b=q("recordUndoBtn");if(b){
   const has=!!pendingPhotoUndo||!!undoStack.length;
   b.disabled=!has;
   b.textContent=pendingPhotoUndo?`Geri Al · foto progress`:undoStack.length?`Geri Al · ${undoStack.at(-1).label}`:"Son İşlemi Geri Al";
 }
}
function toast(text){
 const el=q("recordUndoToast"),t=q("recordUndoText");if(!el||!t)return;
 t.textContent=text;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,6500);
}
async function undo(){
 if(pendingPhotoUndo){
   try{
     const rec=pendingPhotoUndo;pendingPhotoUndo=null;
     const dbp=await new Promise((res,rej)=>{const r=indexedDB.open("AthleteLifeOSPhotos",1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
     const tx=dbp.transaction("checkins","readwrite");tx.objectStore("checkins").put(rec);
     tx.oncomplete=()=>{window.AccountPhotos?.restored?.(rec.id);updateUndoButton();toast("Foto progress geri alındı.");window.renderAdaptiveIntelligence?.()};
     return;
   }catch(e){console.error(e)}
 }
 const snap=undoStack.pop();if(!snap)return;
 const restored=JSON.parse(JSON.stringify(snap.db));
 Object.keys(db).forEach(k=>delete db[k]);Object.assign(db,restored);save();
 try{sessionStorage.setItem("athleteRecordUndo",JSON.stringify(undoStack))}catch(e){}
 updateUndoButton();afterMutation(true);toast(`Geri alındı: ${snap.label}`);
}
function confirmDelete(label){return confirm(`${label} silinsin mi?\n\nBu işlem hemen uygulanır; ardından Geri Al ile kurtarabilirsin.`)}

function inputHTML(name,label,type,value="",extra=""){
 const val=value??"";
 return `<label>${label}<input data-edit="${name}" type="${type}" value="${String(val).replace(/"/g,"&quot;")}" ${extra}></label>`;
}
function selectHTML(name,label,value,options){
 return `<label>${label}<select data-edit="${name}">${options.map(x=>`<option value="${x[0]}" ${String(value)===String(x[0])?"selected":""}>${x[1]}</option>`).join("")}</select></label>`;
}
function checkboxHTML(name,label,value){return `<label class="record-check"><input data-edit="${name}" type="checkbox" ${value?"checked":""}> ${label}</label>`}
function openEditor(title,subtitle,fields,onSave,warning=""){
 editContext={onSave};
 q("recordEditTitle").textContent=title;q("recordEditSubtitle").textContent=subtitle||"";
 q("recordEditFields").innerHTML=fields;
 const w=q("recordEditWarning");w.hidden=!warning;w.textContent=warning||"";
 q("recordEditDialog").showModal();
}
function valuesFromDialog(){
 const out={};q("recordEditFields").querySelectorAll("[data-edit]").forEach(el=>out[el.dataset.edit]=el.type==="checkbox"?!!el.checked:el.type==="number"?(el.value===""?0:Number(el.value)):el.value);return out;
}
function saveEditor(){
 if(!editContext?.onSave)return;
 editContext.onSave(valuesFromDialog());q("recordEditDialog").close();editContext=null;
}
function afterMutation(reloadInputs=false){
 save();
 try{Object.keys(db.trainingLogs||{}).forEach(k=>window.AthleteLoadMesh?.restampDay?.(k))}catch(e){}
 try{if(typeof syncPerformedSnapshots==="function")syncPerformedSnapshots()}catch(e){}
 try{if(typeof buildFuturePlanV5==="function")buildFuturePlanV5(14,"record correction")}catch(e){}
 safeRender(renderToday);safeRender(renderNutrition);safeRender(renderAnalytics);safeRender(renderReports);safeRender(renderDetailed);
 safeRender(renderCharacter);safeRender(renderMuscleReport);safeRender(renderCoach);safeRender(renderCommandCenter);
 if(window.renderTrainingAdaptive)safeRender(window.renderTrainingAdaptive);else safeRender(renderTraining);
 if(window.renderAdaptiveIntelligence)safeRender(window.renderAdaptiveIntelligence);
 window.GuidedWorkout?.syncFromLogs?.("record manager mutation");
 if(reloadInputs)safeRender(loadToday);
 renderRecordCenter();
}
function syncPerformedSnapshots(){
 Object.entries(db.planHistory||{}).forEach(([target,h])=>{
   if(!h?.performed)return;
   const rows=[];
   Object.entries(db.trainingLogs||{}).forEach(([actual,arr])=>(arr||[]).forEach(r=>{
     if((r.scheduledFor||actual)===target)rows.push({...r,_actualKey:actual});
   }));
   h.performed.logs=JSON.parse(JSON.stringify(rows));
   h.performed.amendedAt=new Date().toISOString();
 });
}

function editDaily(date){
 const d=db.daily[date]||{};
 let fields=DAILY_FIELDS.map(([k,l,t])=>inputHTML(k,l,t,d[k]??"",t==="number"?'step="0.1"':"")).join("");
 fields+=selectHTML("healthStatus","Sağlık durumu",d.healthStatus||"normal",[["normal","Normal"],["fatigued","Halsiz / yorgun"],["mild_illness","Hafif hastalık"],["sick","Hastayım"],["recovering","Toparlanıyorum"]]);
 fields+=checkboxHTML("healthFever","Ateş / ateş hissi",d.healthFever)+checkboxHTML("healthCough","Öksürük",d.healthCough)+checkboxHTML("healthSoreThroat","Boğaz ağrısı",d.healthSoreThroat)+checkboxHTML("healthHeadache","Baş ağrısı",d.healthHeadache)+checkboxHTML("healthGI","Mide-bağırsak",d.healthGI)+checkboxHTML("healthDizziness","Baş dönmesi",d.healthDizziness)+checkboxHTML("healthChestBreathing","Göğüs / nefes sorunu",d.healthChestBreathing);
 fields+=selectHTML("workStatus","Durum",d.workStatus||"off",[["off","İzin"],["work","Çalışma"],["annual","Yıllık izin"]]);
 fields+=selectHTML("shift","Vardiya",d.shift||"morning",[["morning","10–18"],["mid","12–20"],["evening","14–22"]]);
 openEditor("Check-in Düzenle",date,fields,vals=>{
   pushUndo(`${date} check-in düzenleme`);db.daily[date]={...d,...vals};afterMutation(date===todayKey());toast("Check-in güncellendi.");
 });
}
function deleteDaily(date){
 if(!db.daily[date]||!confirmDelete(`${date} check-in`))return;
 pushUndo(`${date} check-in silme`);delete db.daily[date];afterMutation(date===todayKey());toast("Check-in silindi.");
}

function editTraining(date,index){
 const r=db.trainingLogs?.[date]?.[index];if(!r)return;
 if(window.ALOSAccount&&r.source==='sport_program')return window.AthleteSports?.openSession(r.sportSessionId);
 const sets=[...(r.sets||[])];while(sets.length<5)sets.push("");
 let fields=selectHTML("name","Hareket",r.name,EXERCISES.map(x=>[x.n,x.n]));
 fields+=inputHTML("load","Ek yük (kg)","number",r.load||0,'step="0.5"');
 const setUnit=(r.metricUnit==="seconds"||r.type==="STATIC")?"sn":"tekrar";
 sets.forEach((v,i)=>fields+=inputHTML(`set${i+1}`,`${setUnit==="sn"?"Hold":"Set"} ${i+1} (${setUnit})`,"number",v,'step="0.1"'));
 fields+=inputHTML("rir","RIR","number",r.rir??2,'min="0" max="5" step="0.5"');
 fields+=inputHTML("plannedRestSec","Planlanan dinlenme (sn)","number",r.plannedRestSec||restIntervalPrescription(r.name).target,'min="0" step="15"');
 const rests=[...(r.restBetweenSets||[])];while(rests.length<4)rests.push("");
 rests.forEach((v,i)=>fields+=inputHTML(`rest${i+1}`,`${i+1}→${i+2} set dinlenme (sn)`,"number",v,'min="0" step="5"'));
 fields+=inputHTML("actualDate","Gerçek Athlete Day","date",date);
 fields+=inputHTML("scheduledFor","Bağlı plan tarihi","date",r.scheduledFor||date);
 openEditor("Antrenman Kaydını Düzenle",`${r.name} · ${date}`,fields,vals=>{
   pushUndo(`${r.name} antrenman düzenleme`);
   const newActual=vals.actualDate||date,newName=vals.name;
   const ex=EXERCISES.find(x=>x.n===newName);
   const newSets=[1,2,3,4,5].map(i=>+vals[`set${i}`]||0).filter(v=>v>0);
   const mk=window.EXERCISE_KNOWLEDGE?.[newName];
   const nr={...r,name:newName,type:ex?.type||r.type,load:+vals.load||0,rir:+vals.rir||0,
     sets:newSets,metricUnit:mk?.metric||((ex?.type||r.type)==="STATIC"?"seconds":"reps"),movementClass:mk?.contraction||r.movementClass||null,knowledgeVersion:window.EXERCISE_KNOWLEDGE_META?.version||r.knowledgeVersion||null,
     plannedRestSec:+vals.plannedRestSec||restIntervalPrescription(newName).target,
     restBetweenSets:[1,2,3,4].map(i=>+vals[`rest${i}`]||0).slice(0,Math.max(0,newSets.length-1)),
     scheduledFor:vals.scheduledFor||newActual,athleteDay:newActual};
   db.trainingLogs[date].splice(index,1);if(!db.trainingLogs[date].length)delete db.trainingLogs[date];
   db.trainingLogs[newActual]=db.trainingLogs[newActual]||[];db.trainingLogs[newActual].push(nr);
   afterMutation();toast("Antrenman kaydı güncellendi.");
 }, "Gerçek Athlete Day'i değiştirirsen kayıt farklı tarihe taşınır; plan tarihi ayrı korunabilir.");
}
function deleteTraining(date,index){
 const r=db.trainingLogs?.[date]?.[index];if(window.ALOSAccount&&r?.source==='sport_program')return window.AthleteSports?.openSession(r.sportSessionId);if(!r||!confirmDelete(`${r.name} antrenman kaydı`))return;
 pushUndo(`${r.name} antrenman silme`);db.trainingLogs[date].splice(index,1);if(!db.trainingLogs[date].length)delete db.trainingLogs[date];afterMutation();toast("Antrenman kaydı silindi.");
}

function editFood(date,index){
 const r=db.foodLogs?.[date]?.[index];if(!r)return;
 const foodIndex=Math.max(0,FOODS.findIndex(f=>f.n===r.name));
 let fields=selectHTML("meal","Öğün",r.meal,[["Kahvaltı","Kahvaltı"],["Öğle","Öğle"],["Akşam","Akşam"],["Antrenman Öncesi","Antrenman Öncesi"],["Antrenman Sonrası","Antrenman Sonrası"],["Atıştırmalık","Atıştırmalık"],["İş Molası","İş Molası"]]);
 fields+=selectHTML("foodIndex","Besin",foodIndex,FOODS.map((f,i)=>[i,`${f.n} · ${f.serv}`]));
 fields+=inputHTML("servings","Porsiyon","number",r.servings||1,'min="0.25" step="0.25"');
 fields+=inputHTML("time","Saat","time",r.time||"");
 openEditor("Besin Kaydını Düzenle",`${r.name} · ${date}`,fields,vals=>{
   pushUndo(`${r.name} besin düzenleme`);const f=FOODS[+vals.foodIndex]||FOODS[foodIndex],sv=Math.max(.01,+vals.servings||1),snap=foodSnapshot(f,sv,vals.meal,vals.time);
   const id=r.logId||window.NutritionLedger?.normalize?.(r,FOODS)?.logId;
   if(id&&!r.logId)r.logId=id;
   const result=id?window.NutritionLedger?.updateById?.(db,date,id,snap):null;
   if(!result?.ok)db.foodLogs[date][index]={...snap,logId:r.logId||snap.logId};
   afterMutation();toast("Besin kaydı güncellendi.");
 });
}
function deleteFood(date,index){
 const r=db.foodLogs?.[date]?.[index];if(!r||!confirmDelete(`${r.name} besin kaydı`))return;
 pushUndo(`${r.name} besin silme`);
 const id=r.logId;
 const result=id?window.NutritionLedger?.removeById?.(db,date,id):null;
 if(!result?.ok){db.foodLogs[date].splice(index,1);if(!db.foodLogs[date].length)delete db.foodLogs[date]}
 afterMutation();toast("Besin kaydı silindi.");
}
function editWater(date){
 const ml=+db.water?.[date]||0;
 openEditor("Su Kaydını Düzenle",date,inputHTML("ml","Toplam su (ml)","number",ml,'min="0" step="50"'),vals=>{
   pushUndo(`${date} su düzenleme`);db.water[date]=Math.max(0,+vals.ml||0);afterMutation();toast("Su kaydı güncellendi.");
 });
}
function deleteWater(date){
 if(!db.water?.[date]||!confirmDelete(`${date} su kaydı`))return;pushUndo(`${date} su silme`);delete db.water[date];afterMutation();toast("Su kaydı silindi.");
}

function editBody(index){
 const r=db.bodyMeasurements?.[index];if(!r)return;
 let fields=inputHTML("date","Tarih","date",r.date||todayKey());
 BODY_FIELDS.forEach(([k,l,t])=>fields+=inputHTML(k,`${l} (cm/kg)`,"number",r[k]||0,'step="0.1"'));
 openEditor("Vücut Ölçümünü Düzenle",r.date,fields,vals=>{
   pushUndo(`${r.date} vücut ölçümü düzenleme`);db.bodyMeasurements[index]={...r,...vals};afterMutation();toast("Vücut ölçümü güncellendi.");
 });
}
function deleteBody(index){
 const r=db.bodyMeasurements?.[index];if(!r||!confirmDelete(`${r.date} vücut ölçümü`))return;pushUndo(`${r.date} vücut ölçümü silme`);db.bodyMeasurements.splice(index,1);afterMutation();toast("Vücut ölçümü silindi.");
}

function editSession(date){
 const r=db.sessionFeedback?.[date];if(!r)return;
 let fields=inputHTML("rpe","Session RPE","number",r.rpe||0,'min="0" max="10" step="0.5"');
 fields+=inputHTML("duration","Süre (dk)","number",r.duration||0,'min="0" step="5"');
 fields+=inputHTML("targetPlanDate","Plan tarihi","date",r.targetPlanDate||date);
 fields+=inputHTML("note","Not","text",r.note||"");
 openEditor("Seans Geri Bildirimini Düzenle",date,fields,vals=>{
   pushUndo(`${date} seans feedback düzenleme`);db.sessionFeedback[date]={...r,...vals,rpe:+vals.rpe||0,duration:+vals.duration||0};afterMutation();toast("Seans geri bildirimi güncellendi.");
 });
}
function deleteSession(date){
 if(!db.sessionFeedback?.[date]||!confirmDelete(`${date} seans geri bildirimi`))return;pushUndo(`${date} seans feedback silme`);delete db.sessionFeedback[date];afterMutation();toast("Seans geri bildirimi silindi.");
}
function editSocial(date){
 const r=db.social?.[date];if(!r)return;
 let fields=inputHTML("type","Plan türü","text",r.type||"");
 fields+=inputHTML("start","Başlangıç","time",r.start||"");
 fields+=inputHTML("end","Bitiş","time",r.end||"");
 fields+=inputHTML("priority","Öncelik","text",r.priority||"");
 openEditor("Sosyal Planı Düzenle",date,fields,vals=>{pushUndo(`${date} sosyal plan düzenleme`);db.social[date]={...r,...vals};afterMutation();toast("Sosyal plan güncellendi.");});
}
function deleteSocial(date){
 if(!db.social?.[date]||!confirmDelete(`${date} sosyal plan`))return;pushUndo(`${date} sosyal plan silme`);delete db.social[date];afterMutation();toast("Sosyal plan silindi.");
}

function editCharacter(){
 const d=db.characterData||{};let fields="";
 Object.entries(CHARACTER_LABELS).forEach(([k,l])=>fields+=inputHTML(k,l,"number",d[k]??"",'step="0.1"'));
 openEditor("Karakter Test Verilerini Düzenle","Boş bıraktığın değerler veri setinden kaldırılır.",fields,vals=>{
   pushUndo("Karakter test verisi düzenleme");db.characterData=db.characterData||{};
   Object.keys(CHARACTER_LABELS).forEach(k=>{const raw=q("recordEditFields").querySelector(`[data-edit="${k}"]`).value;if(raw==="")delete db.characterData[k];else db.characterData[k]=+vals[k]||0});
   db.characterData.updatedAt=new Date().toISOString();afterMutation();toast("Karakter test verileri güncellendi.");
 });
}
function clearCharacter(){
 if(!confirmDelete("Tüm manuel Karakter test verileri"))return;pushUndo("Karakter test verilerini silme");db.characterData={};db.characterOverrides={};afterMutation();toast("Karakter test verileri temizlendi.");
}

function listItem(title,meta,editFn,deleteFn,chip=""){
 return `<div class="record-item"><div class="record-item-main"><strong>${title} ${chip?`<span class="record-meta-chip">${chip}</span>`:""}</strong><span>${meta}</span></div><div class="record-actions">${editFn?`<button type="button" class="record-action" onclick="${editFn}">Düzenle</button>`:""}${deleteFn?`<button type="button" class="record-action delete" onclick="${deleteFn}">Sil</button>`:""}</div></div>`;
}
function empty(text){return `<div class="record-empty">${text}</div>`}

function renderRecordCenter(){
 const date=q("recordManagerDate")?.value||currentDate;currentDate=date;
 const daily=db.daily[date],food=db.foodLogs[date]||[],water=+db.water[date]||0;
 const train=[];
 Object.entries(db.trainingLogs||{}).forEach(([actual,arr])=>(arr||[]).forEach((r,i)=>{
   if(actual===date || (r.scheduledFor||actual)===date)train.push({...r,_actualKey:actual,_index:i});
 }));
 const body=(db.bodyMeasurements||[]).map((r,i)=>({...r,_index:i})).filter(r=>r.date===date);
 const painRows=window.PainIntelligence?.entriesForDate?.(date)||[];
 const feedback=db.sessionFeedback[date],social=db.social[date];

 if(q("recordManagerSummary"))q("recordManagerSummary").innerHTML=[
  ["Check-in",daily?"Var":"—"],["Antrenman",train.length],["Pain",painRows.length],["Besin",food.length],["Vücut ölçümü",body.length]
 ].map(x=>`<div class="mini"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");

 if(q("recordDailyList"))q("recordDailyList").innerHTML=daily?`<div class="record-list">${listItem("Günlük check-in",`Uyku ${daily.sleepTime||"?"}→${daily.wakeTime||"?"} · enerji ${daily.energy??"—"}/5 · sağlık ${window.HealthStateEngine?.assess?.(daily)?.label||"Normal"} · pain max ${Math.max(+daily.painShoulder||0,+daily.painElbow||0,+daily.painWrist||0,+daily.painBack||0,+daily.painHip||0,+daily.painKnee||0,+daily.painAnkle||0)}/10`,`RecordManager.editDaily('${date}')`,`RecordManager.deleteDaily('${date}')`)}</div>`:empty("Bu tarihte check-in yok.");

 if(q("recordTrainingList"))q("recordTrainingList").innerHTML=train.length?`<div class="record-list">${train.map(r=>{
   const rr=(r.restBetweenSets||[]).filter(x=>+x>0),avgR=rr.length?Math.round(rr.reduce((a,b)=>a+(+b||0),0)/rr.length):null;
   return listItem(r.name,`${r.load?`+${r.load} kg · `:""}${(r.sets||[]).join("/")} · RIR ${r.rir??"—"} · rest ${avgR?fmtRestSec(avgR):"—"} / plan ${fmtRestSec(r.plannedRestSec||restIntervalPrescription(r.name).target)} · gerçek ${r._actualKey} · plan ${r.scheduledFor||r._actualKey}`,`RecordManager.editTraining('${r._actualKey}',${r._index})`,(window.ALOSAccount&&r.source==='sport_program')?null:`RecordManager.deleteTraining('${r._actualKey}',${r._index})`,r.lateOrCatchup||r._actualKey!==date?"telafi":"");
 }).join("")}</div>`:empty("Bu tarihle ilişkili antrenman kaydı yok.");

 if(q("recordPainList"))q("recordPainList").innerHTML=painRows.length?`<div class="record-list">${window.PainIntelligence.recordsHTML(date)}</div>`:empty("Bu tarihte pain/joint kaydı yok.");

  let nut=[];
 food.map(normalizeFoodRow).forEach((r,i)=>nut.push(listItem(`${r.meal}: ${r.name}`,`${r.servings} porsiyon · ${Math.round(r.kcal)} kcal · P ${Math.round(r.p)}g · K ${Math.round(r.c)}g · Y ${Math.round(r.f)}g · lif ${r.fiber.toFixed(1)}g`, `RecordManager.editFood('${date}',${i})`,`RecordManager.deleteFood('${date}',${i})`)));
 if(water)nut.push(listItem("Su",`${water} ml`,`RecordManager.editWater('${date}')`,`RecordManager.deleteWater('${date}')`));
 if(q("recordNutritionList"))q("recordNutritionList").innerHTML=nut.length?`<div class="record-list">${nut.join("")}</div>`:empty("Bu tarihte beslenme/su kaydı yok.");

 if(q("recordBodyList"))q("recordBodyList").innerHTML=body.length?`<div class="record-list">${body.map(r=>listItem("Vücut ölçümü",`Kilo ${r.weight||"—"} kg · bel ${r.waist||"—"} · göğüs ${r.chest||"—"} · kol R/L ${r.armR||"—"}/${r.armL||"—"}`,`RecordManager.editBody(${r._index})`,`RecordManager.deleteBody(${r._index})`)).join("")}</div>`:empty("Bu tarihte çevre ölçümü yok.");

 let sess=[];
 if(feedback)sess.push(listItem("Session feedback",`RPE ${feedback.rpe||"—"} · ${feedback.duration||0} dk · ${feedback.note||"not yok"}`,`RecordManager.editSession('${date}')`,`RecordManager.deleteSession('${date}')`));
 if(social)sess.push(listItem(`Sosyal: ${social.type}`,`${social.start||"?"}–${social.end||"?"} · ${social.priority||""}`,`RecordManager.editSocial('${date}')`,`RecordManager.deleteSocial('${date}')`));
 if(q("recordSessionList"))q("recordSessionList").innerHTML=sess.length?`<div class="record-list">${sess.join("")}</div>`:empty("Bu tarihte seans feedback veya sosyal plan yok.");

 const caps=(db.capabilityRecords||[]).filter(x=>x.date===date);
 if(q("recordCapabilityList"))q("recordCapabilityList").innerHTML=caps.length?`<div class="record-list">${caps.map(r=>{
   const label=r.domain==="calisthenics"?"Calisthenics":r.domain==="strength"?"Strength":r.domain==="running"?"Running":"Power/Test";
   return listItem(`${label}: ${r.testId}`,r.domain==="strength"?`${r.load} kg × ${r.reps}`:r.domain==="running"?`${r.distanceKm} km · ${r.minutes} dk`:`${r.value}`,`AthleteProfile.edit(${r.id})`,`AthleteProfile.delete(${r.id})`);
 }).join("")}</div>`:empty("Bu tarihte capability kaydı yok.");

 const c=db.characterData||{},count=Object.keys(c).filter(k=>k!=="updatedAt").length;
 if(q("recordCharacterList"))q("recordCharacterList").innerHTML=count?`<div class="record-list">${listItem("Manuel Character Test Lab",`${count} veri noktası · son güncelleme ${c.updatedAt?new Date(c.updatedAt).toLocaleString("tr-TR"):"—"}`,"RecordManager.editCharacter()","RecordManager.clearCharacter()")}</div>`:empty("Manuel karakter test verisi yok.");
 updateUndoButton();
}
async function deletePhoto(id){
 if(!confirmDelete("Foto progress kaydı"))return;
 try{
   const dbp=await new Promise((res,rej)=>{const r=indexedDB.open("AthleteLifeOSPhotos",1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
   const tx=dbp.transaction("checkins","readwrite"),store=tx.objectStore("checkins"),get=store.get(id);
   get.onsuccess=()=>{
     const rec=get.result;if(!rec)return;
     store.delete(id);
     pendingPhotoUndo=rec;
     updateUndoButton();
   };
   tx.oncomplete=()=>{window.AccountPhotos?.removed?.(id);toast("Foto progress silindi. Geri Al ile kurtarabilirsin.");window.renderAdaptiveIntelligence?.()};
 }catch(e){console.error(e)}
}

function init(){
 const dateInput=q("recordManagerDate");if(dateInput){dateInput.value=currentDate;dateInput.onchange=()=>{currentDate=dateInput.value;renderRecordCenter()}}
 q("recordPrevDay")?.addEventListener("click",()=>{currentDate=addDaysKey(currentDate,-1);dateInput.value=currentDate;renderRecordCenter()});
 q("recordNextDay")?.addEventListener("click",()=>{currentDate=addDaysKey(currentDate,1);dateInput.value=currentDate;renderRecordCenter()});
 q("recordTodayBtn")?.addEventListener("click",()=>{currentDate=todayKey();dateInput.value=currentDate;renderRecordCenter()});
 q("recordUndoBtn")?.addEventListener("click",undo);q("recordToastUndo")?.addEventListener("click",undo);q("recordEditSaveBtn")?.addEventListener("click",saveEditor);
 document.querySelector('.nav-btn[data-page="records"]')?.addEventListener("click",renderRecordCenter);
 renderRecordCenter();
}

window.RecordManager={editDaily,deleteDaily,editTraining,deleteTraining,editFood,deleteFood,editWater,deleteWater,editBody,deleteBody,editSession,deleteSession,editSocial,deleteSocial,editCharacter,clearCharacter,deletePhoto,render:renderRecordCenter,undo};

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else setTimeout(init,0);
})();
