
const DAYS=["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"];
const SHIFT={
  morning:{label:"Sabah",start:"10:00",end:"18:00"},
  mid:{label:"Ara",start:"12:00",end:"20:00"},
  evening:{label:"Akşam",start:"14:00",end:"22:00"}
};
const FOODS=window.NUTRITION_LIBRARY||[];

const NUTRIENT_KEYS=["kcal","p","c","f","fiber","sugar","sodium","potassium","calcium","iron","magnesium","zinc","vitC","vitD","b12","folate","caf","water"];
const MICRO_REFERENCE={
 sodium:{label:"Sodyum",unit:"mg",target:2300,upper:true},
 potassium:{label:"Potasyum",unit:"mg",target:3500},
 calcium:{label:"Kalsiyum",unit:"mg",target:1000},
 iron:{label:"Demir",unit:"mg",target:8},
 magnesium:{label:"Magnezyum",unit:"mg",target:420},
 zinc:{label:"Çinko",unit:"mg",target:11},
 vitC:{label:"C Vitamini",unit:"mg",target:90},
 vitD:{label:"D Vitamini",unit:"µg",target:15},
 b12:{label:"B12",unit:"µg",target:2.4},
 folate:{label:"Folat",unit:"µg",target:400}
};
function foodSnapshot(f,sv=1,meal="",time=""){
 return window.NutritionLedger?.snapshot?.(f,sv,meal,time)||{foodId:f.id||"",name:f.n,cat:f.cat,serv:f.serv,meal,time,servings:Math.max(.01,Number(sv)||1)};
}
function normalizeFoodRow(r){
 return window.NutritionLedger?.normalize?.(r,FOODS)||r||{};
}
function nutrientTotalsForRows(rows){
 return window.NutritionLedger?.totals?.(rows,FOODS)||Object.fromEntries(NUTRIENT_KEYS.map(k=>[k,0]));
}

const EXERCISES=[
 {n:"Full Planche",type:"STATIC"}, {n:"Front Lever",type:"STATIC"}, {n:"Back Lever",type:"STATIC"},
 {n:"Muscle-Up",type:"DYNAMIC"}, {n:"Weighted Pull-Up",type:"WEIGHTED"}, {n:"Weighted Ring Dip",type:"WEIGHTED"},
 {n:"OHP",type:"BARBELL"}, {n:"Squat",type:"BARBELL"}, {n:"RDL",type:"BARBELL"},
 {n:"Planche Push-Up / Lean",type:"DYNAMIC"}, {n:"Front Lever Pull / Raise",type:"DYNAMIC"},
 {n:"Chest-to-Bar",type:"DYNAMIC"}, {n:"Pull-Up",type:"DYNAMIC"}, {n:"Ring Row",type:"DYNAMIC"},
 {n:"Incline DB Press",type:"WEIGHTED"}, {n:"Bulgarian Split Squat",type:"WEIGHTED"},
 {n:"Hanging Leg Raise",type:"DYNAMIC"}, {n:"Dragon Flag",type:"DYNAMIC"}
];

const ALOS_LKG_KEY="athleteLifeOSLastKnownGood";
function __alosSafeParse(raw,fallback=null){try{return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
function __alosDataWeight(x){return window.ALOSDurablePersistence?.weight?.(x)||0}
function __alosBootState(){
 if(window.ALOSDurablePersistence?.bootstrap)return window.ALOSDurablePersistence.bootstrap();
 return __alosSafeParse(localStorage.getItem("athleteLifeOS"),{})||{};
}
function __alosPersistSnapshot(data,reason="save"){
 if(window.ALOSDurablePersistence?.save){
  const result=window.ALOSDurablePersistence.save(data,reason);
  // Keep the in-memory object metadata aligned with the committed revision.
  if(result?.data?.meta)data.meta={...(data.meta||{}),...result.data.meta};
  return result?.savedAt||new Date().toISOString();
 }
 const now=new Date().toISOString();data.meta={...(data.meta||{}),lastSavedAt:now,lastSaveReason:reason};localStorage.setItem("athleteLifeOS",JSON.stringify(data));return now;
}
window.ALOSPersistence={
 saveSnapshot:(data,reason)=>__alosPersistSnapshot(data,reason),
 getLastKnownGood:()=>__alosSafeParse(localStorage.getItem(ALOS_LKG_KEY),null),
 dataWeight:__alosDataWeight,
 health:()=>window.ALOSDurablePersistence?.health?.()||{ok:true}
};
let db=__alosBootState();
// Compatibility bridge: legacy engines read window.db, while app state is lexical.
// A getter also survives backup imports which replace the entire db object.
Object.defineProperty(window,"db",{configurable:true,get:()=>db});
db.settings=db.settings||{targetSleep:8,prep:45,commute:35,targetProtein:150,targetCalories:2850,targetWater:3};
db.settings={targetSleep:8,prep:45,commute:35,targetProtein:150,targetCalories:2850,targetWater:3,targetWeight:76,nutritionGoalMode:"auto",guidedAutoRest:true,guidedSound:true,programStartDate:null,dayBoundaryHour:4,...db.settings};
db.meta={version:5,...(db.meta||{})};
// v9.1 UI/data day rollover requested at local 00:00. Late/catch-up attribution remains available through Session Router.
if(!db.meta.midnightUiRolloverV91){db.settings.dayBoundaryHour=0;db.meta.midnightUiRolloverV91=true;}
db.scheduleByDate=db.scheduleByDate||{};db.planHistory=db.planHistory||{};db.sessionFeedback=db.sessionFeedback||{};db.painLogs=db.painLogs||{};db.futurePlans=db.futurePlans||{};
db.daily=db.daily||{};
db.week=db.week||{};
db.weekOptimizations=db.weekOptimizations||{};
db.foodLogs=db.foodLogs||{};
db.trainingLogs=db.trainingLogs||{};
db.gapReconciliation=db.gapReconciliation||{};
db.social=db.social||{};
db.water=db.water||{};
db.waterLogs=db.waterLogs||{};
db.sessionPrescriptions=db.sessionPrescriptions||{};
db.adHocSessions=Array.isArray(db.adHocSessions)?db.adHocSessions:[];
try{const __mig=window.SchemaMigration?.migrate?.(db);if(__mig?.db)db=__mig.db}catch(e){console.error("Schema migration failed",e)}
function save(){
 try{window.AthleteEventStore?.bootstrapFromLegacy?.(db)}catch(e){console.warn("EventStore reconcile",e)}
 __alosPersistSnapshot(db,"app-save");
 __alosLastContentChecksum=window.ALOSDurablePersistence?.contentChecksum?.(db)||__alosLastContentChecksum;
 window.AthleteCoordinator?.schedule?.("save");
 try{if(window.ALOSArchitecture?.modelSnapshot){window.ALOSArchitecture.modelSnapshot();__alosPersistSnapshot(db,"architecture-snapshot")}}catch(e){}
 try{if(!window.__SYSTEM_INTEGRITY_RUNNING__)window.BackupVault?.noteSave?.()}catch(e){}
}
// v9.3 durability guard: persist any in-memory mutation even if a feature forgot to call save().
let __alosLastContentChecksum=window.ALOSDurablePersistence?.contentChecksum?.(db)||null;
function __alosAutosaveIfDirty(reason="dirty-guard"){
 try{
  const sum=window.ALOSDurablePersistence?.contentChecksum?.(db);
  if(sum&&sum!==__alosLastContentChecksum){__alosPersistSnapshot(db,reason);__alosLastContentChecksum=window.ALOSDurablePersistence?.contentChecksum?.(db)||sum;return true}
 }catch(e){console.error("Durability guard save failed",e)}
 return false;
}
if(typeof setInterval==="function")setInterval(()=>__alosAutosaveIfDirty("dirty-guard"),2000);
if(typeof window!=="undefined"&&window.addEventListener){
 window.addEventListener("pagehide",()=>__alosAutosaveIfDirty("pagehide-global"));
 window.addEventListener("beforeunload",()=>__alosAutosaveIfDirty("beforeunload-global"));
}
window.ALOSDurabilityFlush=__alosAutosaveIfDirty;
function todayKey(){return athleteDayKey(new Date())}
function calendarTodayKey(){return localDateKey(new Date())}
function trainingViewDate(){
 db.uiState=db.uiState||{};
 const t=todayKey(),v=db.uiState.trainingSelectedDate;
 return /^\d{4}-\d{2}-\d{2}$/.test(v||"")?v:t;
}
function setTrainingViewDate(key,{syncRouter=true,saveState=true}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(key||""))return trainingViewDate();
 db.uiState=db.uiState||{};db.uiState.trainingSelectedDate=key;
 if(saveState)save();
 if(syncRouter&&typeof window.syncSessionRouterToTrainingDate==="function")window.syncSessionRouterToTrainingDate(key);
 safeRender(renderWeeklyTrainingPlanV5);safeRender(renderTodayTrainingPlanV5);safeRender(renderTrainingPlanSyncV81);
 if(typeof window.renderTrainingAdaptive==="function")safeRender(window.renderTrainingAdaptive);
 if(typeof window.GuidedWorkout?.previewTarget==="function")window.GuidedWorkout.previewTarget(key);
 return key;
}
function resetTrainingViewToToday(){return setTrainingViewDate(todayKey())}
function q(id){return document.getElementById(id)}
function safeValue(id, fallback=""){const el=q(id); return el?el.value:fallback}
function safeRender(fn){try{fn()}catch(err){console.error("Athlete Life OS render error:",err)}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function mins(t){if(!t||!String(t).includes(":"))return 0;let [h,m]=String(t).split(":").map(Number);return (Number.isFinite(h)?h:0)*60+(Number.isFinite(m)?m:0)}
function fmtMin(x){x=(x+1440)%1440;return String(Math.floor(x/60)).padStart(2,"0")+":"+String(x%60).padStart(2,"0")}
function duration(a,b){let x=mins(b)-mins(a); if(x<0)x+=1440; return x}
function sleepDuration(d){if(!d||!d.sleepTime||!d.wakeTime)return 0; return Math.max(0,duration(d.sleepTime,d.wakeTime)-(Number(d.nightAwake)||0))}
function readiness(d){
 if(!d||!d.sleepTime||!d.wakeTime)return null;
 const sh=sleepDuration(d)/60, ts=db.settings.targetSleep||8;
 const sleepDur=clamp(sh/ts*100,0,100);
 const score= sleepDur*.28 + (d.sleepQuality||3)/5*100*.18 + (d.energy||3)/5*100*.16 + (d.motivation||3)/5*100*.10 +
  (6-(d.soreness||3))/5*100*.08 + (d.joint||3)/5*100*.12 + (6-(d.stress||3))/5*100*.08;
 const healthPenalty=window.HealthStateEngine?.readinessPenalty?.(d)||0;
 return Math.round(clamp(score-healthPenalty,0,100))
}
function renderNav(){
 document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{
   document.querySelectorAll(".nav-btn,.page").forEach(x=>x.classList.remove("active"));
   b.classList.add("active"); q(b.dataset.page).classList.add("active"); q("pageTitle").textContent=b.textContent;
   if(b.dataset.page==="analytics") renderAnalytics();
 });
}
function initDate(){q("dateLabel").textContent=new Intl.DateTimeFormat("tr-TR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date())}
function loadToday(){
 const d=db.daily[todayKey()]||{};
 ["bedTime","sleepTime","wakeTime","nightAwake","sleepQuality","energy","motivation","soreness","joint","stress","weight","waist","runKm","runMinutes","runRpe","workIntensity","steps","painShoulder","painElbow","painWrist","painBack","painHip","painKnee","painAnkle","healthStatus","fatigueLevel","illnessSeverity","healthNote"].forEach(k=>{
   if(d[k]!==undefined && q(k))q(k).value=d[k]
 });
 ["healthFever","healthCough","healthSoreThroat","healthHeadache","healthGI","healthDizziness","healthChestBreathing"].forEach(k=>{if(q(k))q(k).checked=!!d[k]});
 if(d.workStatus)q("todayWorkStatus").value=d.workStatus;
 if(d.shift)q("todayShift").value=d.shift;
 renderToday();safeRender(renderPainCoach);safeRender(renderCommandCenter);
}
function renderToday(){
 const d=db.daily[todayKey()];
 const r=readiness(d);
 q("readinessScore").textContent=r==null?"--":r+"/100";
 q("readinessText").textContent=r==null?"Veri bekleniyor":r>=85?"Yüksek":r>=70?"İyi":r>=55?"Orta":"Düşük";
 const sl=d?sleepDuration(d)/60:0;
 q("sleepHours").textContent=d?sl.toFixed(1)+"h":"--";
 q("sleepText").textContent=d?`Hedef ${db.settings.targetSleep}h`:"Saat";
 const workLoad=d&&d.workStatus==="work"?((Number(d.workIntensity)||3)*12 + Math.min((Number(d.steps)||0)/500,20)):0;
 const train=(db.trainingLogs[todayKey()]||[]).length*8;
 const stress=d?(Number(d.stress)||0)*4:0;
 const load=Math.round(clamp(workLoad+train+stress,0,100));
 q("dailyLoad").textContent=d?load+"/100":"--";
 q("lifeBalance").textContent=d?Math.round(clamp((r||50)*.55+(100-load)*.25+80*.2,0,100))+"/100":"--";
 const hs=window.HealthStateEngine?.assess?.(d||{})||null, hb=q("healthStateBadge"),ha=q("healthStateAdvice");
 if(hs&&hb){hb.textContent=hs.label.toUpperCase();hb.className=`plan-badge ${hs.action==="stop_hard_training"?"bad":hs.action==="recovery"||hs.action==="reduce"?"warn":"good"}`;}
 if(hs&&ha){ha.className=`insight-box ${hs.action==="stop_hard_training"?"bad":hs.action==="recovery"||hs.action==="reduce"?"warn":"good"}`;ha.innerHTML=`<strong>${hs.label}</strong><br>${hs.reason}<br><small>Readiness etkisi −${hs.readinessPenalty} puan · hacim ×${hs.volumeFactor.toFixed(2)} · yoğunluk ×${hs.intensityFactor.toFixed(2)}</small>`;}
 renderTodayPlan();
 renderTradeoff();
}
function saveDaily(){
 try{
  const keys=["bedTime","sleepTime","wakeTime","nightAwake","sleepQuality","energy","motivation","soreness","joint","stress","weight","waist","runKm","runMinutes","runRpe","workIntensity","steps","painShoulder","painElbow","painWrist","painBack","painHip","painKnee","painAnkle","healthStatus","fatigueLevel","illnessSeverity","healthNote"];
  let d=db.daily[todayKey()]||{};
  keys.forEach(k=>{
    const el=q(k); if(!el) return;
    d[k]=el.type==="number" ? (el.value===""?0:Number(el.value)) : el.value;
  });
  ["healthFever","healthCough","healthSoreThroat","healthHeadache","healthGI","healthDizziness","healthChestBreathing"].forEach(k=>{d[k]=!!q(k)?.checked});
  d.workStatus=safeValue("todayWorkStatus","off");
  d.shift=safeValue("todayShift","morning");
  const __day=todayKey();
  db.daily[__day]=d;
  window.AthleteEventStore?.append?.("DAILY_CHECKIN_RECORDED",{...d},{id:`daily_${__day}`,domain:"recovery",athleteDay:__day,source:"ui",kind:"measured",confidence:100});
  save();
  const st=q("dailySaveStatus");
  if(st){st.textContent="✓ Kaydedildi"; st.classList.add("ok"); setTimeout(()=>{st.textContent="";st.classList.remove("ok")},2200)}
  safeRender(renderToday); safeRender(renderAnalytics); safeRender(renderReports); safeRender(renderCoach); safeRender(renderCoachMonth); safeRender(renderCoachTwelve); safeRender(renderCharacter); buildFuturePlan(14); refreshLifeOS(true);
 }catch(err){
  console.error(err);
  const st=q("dailySaveStatus"); if(st){st.textContent="Kayıt hatası";st.classList.add("bad")}
 }
}
function saveTodayShift(){
 try{
  const k=todayKey();
  const d=db.daily[k]||{};
  d.workStatus=safeValue("todayWorkStatus","off");
  d.shift=safeValue("todayShift","morning");
  const wi=q("workIntensity"),stp=q("steps");
  if(wi)d.workIntensity=wi.value===""?0:Number(wi.value);
  if(stp)d.steps=stp.value===""?0:Number(stp.value);
  db.daily[k]=d;
  db.scheduleByDate=db.scheduleByDate||{};
  db.scheduleByDate[k]={...(db.scheduleByDate[k]||{}),status:d.workStatus,workStatus:d.workStatus,shift:d.shift,shiftType:d.shift};
  window.AthleteEventStore?.append?.("SHIFT_RECORDED",{workStatus:d.workStatus,shift:d.shift,workIntensity:d.workIntensity||0,steps:d.steps||0},{id:`shift_${k}`,domain:"lifestyle",athleteDay:k,source:"ui",kind:"measured",confidence:100});
  save();
  // Shift changes the training time/window, not the planned session identity. Rebuild only unlocked projections.
  buildFuturePlanV5(14,"today shift update");
  refreshLifeOSV5(false);
  safeRender(renderToday);safeRender(renderAnalytics);safeRender(renderReports);safeRender(renderCoach);safeRender(renderCoachWeek);
  const el=q("shiftSaveStatus");
  if(el){el.textContent="✓ Kaydedildi";el.classList.remove("bad");el.classList.add("ok");setTimeout(()=>{el.textContent="";el.classList.remove("ok")},2200)}
 }catch(err){
  console.error(err);
  const el=q("shiftSaveStatus");if(el){el.textContent="Kayıt hatası";el.classList.remove("ok");el.classList.add("bad")}
 }
}

function recommendWorkout(d){
 const r=readiness(d)||70;
 if(r<55)return "Recovery / yürüyüş / mobilite";
 if(r<70)return "Kısaltılmış güç veya Zone 2";
 if(d?.workStatus==="off"||d?.workStatus==="annual")return "Ağır Skill + Strength";
 if(d?.shift==="evening")return "İş öncesi Skill + Strength";
 if(d?.shift==="mid")return "İş öncesi ana antrenman";
 return "İş sonrası kontrollü Strength / Hypertrophy";
}
function renderTodayPlan(){
 const d=db.daily[todayKey()]||{workStatus:"off",shift:"morning",wakeTime:"08:45"};
 const s=SHIFT[d.shift||"morning"], target=db.settings.targetSleep*60, prep=db.settings.prep, com=db.settings.commute;
 let items=[];
 if(d.workStatus==="work"){
   const wake=mins(s.start)-com-prep;
   const workout = d.shift==="morning" ? mins(s.end)+75 : wake+75;
   const bedtime = wake-target-20;
   items=[
     [fmtMin(wake),"Uyanış","Hazırlanma ve kahvaltı için önerilen saat"],
     [fmtMin(workout),recommendWorkout(d),"Bugünün en uygun antrenman penceresi"],
     [s.start+"–"+s.end,`${s.label} vardiya`,"8 saat mesai · yaklaşık 1 saat yemek molası"],
     [fmtMin(bedtime),"Yatak hazırlığı",`${db.settings.targetSleep} saat uyku hedefini koru`]
   ];
 }else{
   const wake=mins(d.wakeTime||"08:45");
   items=[
     [fmtMin(wake),"Uyanış","İzin günü ritmini koru"],
     [fmtMin(wake+120),recommendWorkout(d),"Haftanın kaliteli antrenman penceresi"],
     ["Gün içi","Recovery / sosyal yaşam","Esnek pencere"],
     [fmtMin(wake+16*60),"Yatak hazırlığı","Uyku düzenini çok kaydırma"]
   ];
 }
 q("todayPlan").innerHTML=items.map(x=>`<div class="timeline-item"><div class="timeline-time">${x[0]}</div><div class="timeline-content"><strong>${x[1]}</strong><span>${x[2]}</span></div></div>`).join("");
}
function renderTradeoff(){
 const s=db.social[todayKey()];
 if(!s){q("tradeoffBox").className="insight-box neutral";q("tradeoffBox").textContent="Henüz sürpriz plan eklenmedi.";return}
 const d=db.daily[todayKey()]||{};
 const originalBed=d.bedTime||"00:30";
 const end=mins(s.end), bed=mins(originalBed);
 let delay=end-bed; if(delay< -720)delay+=1440; if(delay<0)delay=0;
 const r=readiness(d)||75;
 const projected=Math.max(40,Math.round(r-delay/12));
 q("tradeoffBox").className="insight-box "+(delay>90?"bad":delay>30?"warn":"good");
 q("tradeoffBox").innerHTML=`<strong>${s.type}</strong><br>Plan ${s.start}–${s.end}. Tahmini uyku gecikmesi: <b>${delay} dk</b>.<br>Yarınki readiness yaklaşık <b>${projected}/100</b> olabilir. ${delay>60?"Ağır antrenmanı taşımak veya hacmi azaltmak mantıklı olabilir.":"Planın etkisi yönetilebilir görünüyor."}`;
}
function persistWeeklyScheduleFromUI(reason="weekly-autosave",{rebuild=false}={}){
 const root=q("weekPlanner");if(!root)return false;
 const keys=weekKeysFor(todayKey());db.week=db.week||{};db.scheduleByDate=db.scheduleByDate||{};
 let touched=false;
 DAYS.forEach((day,i)=>{
  const se=q(`ws${i}`),sh=q(`wsh${i}`),so=q(`wso${i}`);if(!se||!sh||!so)return;
  const row={status:se.value||"off",shift:sh.value||"morning",social:so.value||""};
  db.week[i]={...(db.week[i]||{}),...row,date:keys[i]};
  db.scheduleByDate[keys[i]]={...(db.scheduleByDate[keys[i]]||{}),...row};
  touched=true;
 });
 if(!touched)return false;
 __alosPersistSnapshot(db,reason);
 const st=q("weekSaveStatus");if(st){st.textContent="✓ Vardiya planı kaydedildi";st.classList.add("ok");clearTimeout(window.__weekSaveTimer);window.__weekSaveTimer=setTimeout(()=>{st.textContent="";st.classList.remove("ok")},1800)}
 if(rebuild){buildFuturePlanV5(14,"weekly schedule saved");refreshLifeOSV5(false)}
 return true;
}
window.ALOSFlushPendingUIState=function(reason="ui-flush"){
 try{persistWeeklyScheduleFromUI(reason,{rebuild:false})}catch(e){console.warn("Weekly UI flush failed",e)}
 return db;
};
function weekOptimizationKey(baseKey=todayKey()){return weekKeysFor(baseKey)[0]}
function computeWeekOptimizationRows(keys=weekKeysFor(todayKey())){
 return DAYS.map((day,i)=>{
  const status=q(`ws${i}`)?.value||db.scheduleByDate[keys[i]]?.status||"off",shift=q(`wsh${i}`)?.value||db.scheduleByDate[keys[i]]?.shift||"morning",social=q(`wso${i}`)?.value||db.scheduleByDate[keys[i]]?.social||"";
  let wake,train,sleep,work;
  if(status==="work"){
   const s=SHIFT[shift]||SHIFT.morning;wake=mins(s.start)-db.settings.commute-db.settings.prep;train=shift==="morning"?mins(s.end)+75:wake+75;sleep=wake-db.settings.targetSleep*60-20;work=`${s.start}–${s.end}`;
  }else{wake=8*60+45;train=wake+120;sleep=30;work=status==="annual"?"Yıllık izin":"İzin"}
  return {day,date:keys[i],status,shift,social,work,trainMin:train,wakeMin:wake,sleepMin:sleep,window:fmtMin(train),sleepTarget:`${fmtMin(sleep)} → ${fmtMin(wake)}`};
 });
}
function renderSavedWeekOptimization(){
 const out=q("weekOutput");if(!out)return;
 const key=weekOptimizationKey(),saved=db.weekOptimizations?.[key];
 if(!saved?.rows?.length){out.innerHTML="";return}
 out.innerHTML=`<div class="week-output-meta">✓ Son optimize edilmiş hafta · ${new Date(saved.generatedAt||Date.now()).toLocaleString("tr-TR")}</div>`+saved.rows.map(r=>`<div class="week-row"><strong>${r.day} · ${r.date.slice(5)}</strong><span>İş: ${r.work}</span><span>Önerilen pencere: ${r.window}</span><span>Uyku hedefi: ${r.sleepTarget}${r.social?` · Sosyal: ${r.social}`:""}</span></div>`).join("");
}
function initWeek(){
 const root=q("weekPlanner");root.innerHTML="";const keys=weekKeysFor(todayKey());DAYS.forEach((day,i)=>{const def=i===0?{status:"off",shift:"morning"}:i===1?{status:"work",shift:"evening"}:{status:"work",shift:["mid","morning","evening"][i%3]};const w=db.scheduleByDate[keys[i]]||db.week[i]||def;const el=document.createElement("div");el.className="day-card";el.innerHTML=`<h4>${day}<small>${keys[i].slice(5)}</small></h4><label>Durum<select id="ws${i}"><option value="work">Çalışma</option><option value="off">İzin</option><option value="annual">Yıllık izin</option></select></label><label>Vardiya<select id="wsh${i}"><option value="morning">10–18</option><option value="mid">12–20</option><option value="evening">14–22</option></select></label><label>Sosyal plan<input id="wso${i}" placeholder="örn. 21:00–00:30"></label>`;root.appendChild(el);q(`ws${i}`).value=w.status;q(`wsh${i}`).value=w.shift;q(`wso${i}`).value=w.social||"";
  [q(`ws${i}`),q(`wsh${i}`)].forEach(x=>x?.addEventListener("change",()=>persistWeeklyScheduleFromUI("weekly-autosave",{rebuild:false})));
  q(`wso${i}`)?.addEventListener("change",()=>persistWeeklyScheduleFromUI("weekly-autosave",{rebuild:false}));
 });
 renderSavedWeekOptimization();
}
function optimizeWeek(){
 persistWeeklyScheduleFromUI("weekly-optimize",{rebuild:false});
 const keys=weekKeysFor(todayKey()),rows=computeWeekOptimizationRows(keys);
 rows.forEach((r,i)=>{db.week[i]={...(db.week[i]||{}),status:r.status,shift:r.shift,social:r.social,date:r.date};db.scheduleByDate[r.date]={...(db.scheduleByDate[r.date]||{}),status:r.status,shift:r.shift,social:r.social};});
 db.weekOptimizations=db.weekOptimizations||{};db.weekOptimizations[keys[0]]={weekStart:keys[0],weekEnd:keys[6],generatedAt:new Date().toISOString(),rows};
 save();renderSavedWeekOptimization();buildFuturePlanV5(14,"weekly schedule update");refreshLifeOSV5(false);
}
function initTraining(){
 q("exerciseSelect").innerHTML=EXERCISES.map((x,i)=>`<option value="${i}">${x.n}</option>`).join("");
 q("addExerciseBtn").onclick=()=>{
  const e=EXERCISES[Number(q("exerciseSelect").value)], sets=[1,2,3,4,5].map(i=>Number(q("set"+i).value)||0).filter(Boolean);
  if(!sets.length)return;
  const mk=window.EXERCISE_KNOWLEDGE?.[e.n];
  const row={name:e.n,type:e.type,load:Number(q("exerciseLoad").value)||0,sets,rir:Number(q("exerciseRir").value)||0,recordedAt:new Date().toISOString(),
    executionEquipment:window.MovementIntelligence?.selectedEquipment?.()||mk?.variantEquipment||mk?.equipment?.[0]||null};
  db.trainingLogs[todayKey()]=db.trainingLogs[todayKey()]||[];db.trainingLogs[todayKey()].push(row);save();renderTraining();renderToday();
 };
 renderTraining();
}
function renderTraining(){
 const rows=db.trainingLogs[todayKey()]||[];
 q("exerciseLog").innerHTML=rows.length?rows.map(r=>{
  const total=r.sets.reduce((a,b)=>a+b,0), best=Math.max(...r.sets), metric=typeof window.exerciseMetricText==="function"?window.exerciseMetricText(r):(r.type==="STATIC"?`${best}s best / ${total}s total`:`${total} tekrar`);
  return `<div class="log-row"><strong>${r.name}</strong><span>${r.load?`+${r.load} kg`:"Vücut ağırlığı"}</span><span>${metric}</span><span>RIR ${r.rir}</span></div>`
 }).join(""):"<p class='hint'>Henüz hareket eklenmedi.</p>";
}
function filteredFoods(){
 const search=(q("foodSearch")?.value||"").trim().toLocaleLowerCase("tr-TR");
 const cat=q("foodCategory")?.value||"Tümü";
 return FOODS.map((f,i)=>({...f,_index:i})).filter(f=>(cat==="Tümü"||f.cat===cat)&&(!search||`${f.n} ${f.cat}`.toLocaleLowerCase("tr-TR").includes(search)));
}
function refreshFoodSelect(){
 const select=q("foodSelect");if(!select)return;
 const previous=select.value,arr=filteredFoods();
 select.innerHTML=arr.length?arr.map(f=>`<option value="${f._index}">${f.n} · ${f.serv}</option>`).join(""):`<option value="">Eşleşen besin yok</option>`;
 if(arr.some(f=>String(f._index)===previous))select.value=previous;
 previewFood();
}
function initNutrition(){
 const cats=["Tümü",...new Set(FOODS.map(f=>f.cat))];
 q("foodCategory").innerHTML=cats.map(x=>`<option>${x}</option>`).join("");
 q("foodSearch").oninput=refreshFoodSelect;q("foodCategory").onchange=refreshFoodSelect;
 q("foodSelect").onchange=previewFood;q("servings").oninput=previewFood;
 const repair=window.NutritionLedger?.repairDay?.(db,todayKey(),FOODS);if(repair?.changed)save();
 if(q("nutritionLibraryBadge"))q("nutritionLibraryBadge").textContent=`${FOODS.length} besin · snapshot v2`;
 refreshFoodSelect();
 q("addFoodBtn").onclick=()=>{
  const idx=Number(q("foodSelect").value);if(!Number.isFinite(idx)||!FOODS[idx])return;
  const f=FOODS[idx],sv=Number(q("servings").value)||1,row=foodSnapshot(f,sv,q("mealType").value,q("foodTime").value),date=todayKey();
  const result=window.NutritionLedger?.append?.(db,date,row);
  if(!result?.ok)return alert("Besin kaydı eklenemedi; mevcut kayıtlar korunuyor.");
  window.AthleteEventStore?.append?.("FOOD_LOGGED",row,{id:`food_${row.logId}`,domain:"nutrition",athleteDay:date,source:"ui",kind:"measured",confidence:100});
  save();
  const verify=window.NutritionLedger?.verifyPersistent?.("athleteLifeOS",date,[row.logId]);
  const st=q("nutritionSaveStatus");if(st){st.textContent=verify?.ok?`✓ Eklendi · ${result.after} kayıt`:"⚠ Kayıt doğrulanamadı";st.classList.toggle("ok",!!verify?.ok)}
  renderNutrition();renderAnalytics();renderReports();
 };
 document.querySelectorAll(".water-btn").forEach(b=>b.onclick=()=>{
   const date=todayKey(),result=window.WaterLedger?.append?.(db,date,Number(b.dataset.ml)||0,{source:"quick_add"});
   if(!result?.ok)return alert("Su kaydı eklenemedi.");
   window.AthleteEventStore?.append?.("WATER_LOGGED",result.row,{id:`water_${result.row.id}`,domain:"nutrition",athleteDay:date,source:"ui",kind:"measured",confidence:100});
   save();renderNutrition();renderReports();renderAnalytics();window.NutritionImpact?.render?.();
 });
 try{window.WaterLedger?.migrateAll?.(db)}catch(e){}
 renderNutrition();
}
function previewFood(){
 const idx=Number(q("foodSelect")?.value),f=FOODS[idx],el=q("foodPreview");if(!el)return;
 if(!f){el.innerHTML="<span class='hint'>Besin seç.</span>";return}
 const s=Number(q("servings").value)||1,n=foodSnapshot(f,s);
 el.innerHTML=`<div class="food-preview-head"><strong>${f.n}</strong><span>${f.cat} · ${s} × ${f.serv}</span></div>
 <div class="food-preview-macros">
   <b>${Math.round(n.kcal)} kcal</b><span>${n.p.toFixed(1)}g P</span><span>${n.c.toFixed(1)}g K</span><span>${n.f.toFixed(1)}g Y</span><span>${n.fiber.toFixed(1)}g lif</span>
 </div>
 <div class="food-preview-micros">
   <span>Potasyum ${Math.round(n.potassium)}mg</span><span>Magnezyum ${Math.round(n.magnesium)}mg</span><span>Kalsiyum ${Math.round(n.calcium)}mg</span><span>Demir ${n.iron.toFixed(1)}mg</span>
 </div>`;
}
function renderMicronutrients(t){
 const el=q("micronutrientGrid");if(!el)return;
 el.innerHTML=Object.entries(MICRO_REFERENCE).map(([k,m])=>{
   const val=Number(t[k])||0,pct=Math.round(val/m.target*100),bar=Math.min(100,Math.max(0,pct));
   const state=m.upper?(pct>120?"warn":"good"):(pct>=80?"good":pct>=50?"neutral":"warn");
   return `<div class="micro-item ${state}"><div><strong>${m.label}</strong><span>${val<10?val.toFixed(1):Math.round(val)} ${m.unit}</span></div><div class="micro-bar"><i style="width:${bar}%"></i></div><small>${m.upper?"üst referans":"referans"} ${m.target} ${m.unit} · ${pct}%</small></div>`;
 }).join("");
}
function renderNutrition(){
 const k=todayKey(),rows=(db.foodLogs[k]||[]).map(normalizeFoodRow),t=nutrientTotalsForRows(rows),water=(window.WaterLedger?.total?.(db,k)??(db.water[k]||0))+t.water;
 q("caloriesTotal").textContent=Math.round(t.kcal);q("proteinTotal").textContent=Math.round(t.p)+" g";q("carbsTotal").textContent=Math.round(t.c)+" g";q("fatTotal").textContent=Math.round(t.f)+" g";
 q("fiberTotal").textContent=t.fiber.toFixed(1)+" g";q("waterTotal").textContent=(water/1000).toFixed(1)+" L";q("caffeineTotal").textContent=Math.round(t.caf)+" mg";q("foodCountTotal").textContent=rows.length;
 q("foodLog").innerHTML=rows.length?rows.map((r,i)=>`<div class="log-row with-actions"><strong>${r.meal}: ${r.name}</strong><span>${r.servings} porsiyon${r.time?` · ${r.time}`:""}</span><span>${Math.round(r.kcal)} kcal · ${Math.round(r.c)}g K · ${Math.round(r.f)}g Y</span><span>${Math.round(r.p)}g P · ${r.fiber.toFixed(1)}g lif</span><span class="inline-record-actions"><button type="button" onclick="NutritionRecordEngine.open('${todayKey()}','${r.logId}')">Düzenle</button><button type="button" onclick="NutritionRecordEngine.duplicate('${todayKey()}','${r.logId}')">Kopyala</button><button type="button" class="danger" onclick="NutritionRecordEngine.remove('${todayKey()}','${r.logId}')">Sil</button></span></div>`).join(""):"<p class='hint'>Henüz öğün eklenmedi.</p>";
 renderMicronutrients(t);
 if(q("nutritionAdvice")) renderNutritionAdvice();
 const waterBox=q("waterLedgerList"),waterRows=window.WaterLedger?.entries?.(db,k)||[];
 if(waterBox)waterBox.innerHTML=waterRows.length
   ?waterRows.map(r=>`<div class="water-log-row"><span><strong>${Math.round(r.ml)} ml</strong>${r.source==="legacy_total"?" · eski toplam":""}</span><button type="button" class="danger" onclick="removeWaterLog('${k}','${r.id}')">Sil</button></div>`).join("")
   :`<p class="hint">Bugün su kaydı yok.</p>`;
 try{window.NutritionImpact?.render?.()}catch(e){}
}
function socialDialog(){
 const dlg=q("socialDialog"); q("quickSocialBtn").onclick=()=>dlg.showModal();
 q("saveSocialBtn").onclick=(ev)=>{ev.preventDefault();db.social[todayKey()]={type:q("socialType").value,start:q("socialStart").value,end:q("socialEnd").value,priority:q("socialPriority").value};save();dlg.close();renderTradeoff();renderTodayPlan();renderAnalytics();renderReports()}
}
function renderAnalytics(){
 const dates=Object.keys(db.daily).sort().slice(-7), ds=dates.map(k=>db.daily[k]);
 const sleepDebt=ds.reduce((a,d)=>a+Math.max(0,db.settings.targetSleep*60-sleepDuration(d)),0);
 const avgR=ds.length?Math.round(ds.reduce((a,d)=>a+(readiness(d)||0),0)/ds.length):0;
 const foodDates=Object.keys(db.foodLogs).sort().slice(-7);
 let pDays=0,kDays=0,n=0;
 foodDates.forEach(k=>{let rows=(db.foodLogs[k]||[]).map(normalizeFoodRow),p=rows.reduce((a,r)=>a+(+r.p||0),0),cal=rows.reduce((a,r)=>a+(+r.kcal||0),0); if(p>=db.settings.targetProtein*.9)pDays++; if(cal>=db.settings.targetCalories*.85&&cal<=db.settings.targetCalories*1.15)kDays++; n++});
 const nut=n?Math.round((pDays/n*.55+kDays/n*.45)*100):0;
 const socialCount=Object.keys(db.social).slice(-7).length;
 const trainCount=Object.keys(db.trainingLogs).slice(-7).reduce((a,k)=>a+(db.trainingLogs[k]?.length?1:0),0);
 const adherence=Math.round(clamp(70+trainCount*4-socialCount*2,0,100));
 const adaptation=Math.round(clamp(80+Math.min(trainCount,5)*3-socialCount,0,100));
 q("adherenceScore").textContent=adherence+"/100";q("adaptationScore").textContent=adaptation+"/100";q("sleepDebt").textContent=`${Math.floor(sleepDebt/60)}s ${sleepDebt%60}dk`;q("nutritionScore").textContent=nut+"/100";
 q("weeklySummary").innerHTML=[
  ["Ortalama readiness",avgR?avgR+"/100":"Veri yok"],["Kayıtlı antrenman günü",trainCount],["Sürpriz sosyal plan",socialCount],["Uyku borcu",`${Math.floor(sleepDebt/60)} saat ${sleepDebt%60} dk`],["Beslenme uyumu",nut+"/100"]
 ].map(x=>`<div class="summary-item"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
 let insight="Daha fazla günlük veri toplandıkça kişisel örüntüler burada güçlenecek.";
 if(ds.length>=3){
   insight=avgR>=80?"Son günlerde recovery ve readiness iyi görünüyor. Ağır skill/strength seanslarını yüksek readiness günlerine yerleştirmek mantıklı.":"Son günlerde readiness orta seviyede. Uyku borcu ve iş yükünü azaltmak performans açısından en yüksek getiriyi sağlayabilir.";
   if(socialCount>=2) insight+=" Bu hafta birden fazla sürpriz sosyal plan var; özellikle sabah vardiyalarından önce yatış gecikmesini sınırla.";
 }
 q("personalInsight").textContent=insight;
 try{window.PeriodicTrendEngine?.render?.()}catch(e){} try{renderArchitectureV8()}catch(e){}
}
function initSettings(){
 const s=db.settings;q("targetSleep").value=s.targetSleep;q("prepMinutes").value=s.prep;q("commuteMinutes").value=s.commute;q("targetProtein").value=s.targetProtein;q("targetCalories").value=s.targetCalories;q("targetWater").value=s.targetWater;if(q("targetWeight"))q("targetWeight").value=s.targetWeight||76;if(q("nutritionGoalMode"))q("nutritionGoalMode").value=s.nutritionGoalMode||"auto";if(q("programStartDate"))q("programStartDate").value=s.programStartDate||todayKey();if(q("dayBoundaryHour"))q("dayBoundaryHour").value=String(s.dayBoundaryHour??4);
 q("saveSettingsBtn").onclick=()=>{db.settings={...db.settings,targetSleep:Number(q("targetSleep").value),prep:Number(q("prepMinutes").value),commute:Number(q("commuteMinutes").value),targetProtein:Number(q("targetProtein").value),targetCalories:Number(q("targetCalories").value),targetWater:Number(q("targetWater").value),targetWeight:Number(q("targetWeight")?.value)||76,nutritionGoalMode:q("nutritionGoalMode")?.value||"auto",programStartDate:q("programStartDate")?.value||todayKey(),dayBoundaryHour:Number.isFinite(Number(q("dayBoundaryHour")?.value))?Number(q("dayBoundaryHour")?.value):0};save();lifecycleTick(true);buildFuturePlanV5(14,"settings update");renderToday();renderAnalytics();renderV5All();alert("Ayarlar kaydedildi; plan yeniden optimize edildi.")};
}

db.bodyMeasurements=db.bodyMeasurements||[];
db.runs=db.runs||[];

const MUSCLE_MAP={
 "Full Planche":["Omuz","Göğüs","Core"],"Front Lever":["Sırt","Core","Kol"],"Back Lever":["Omuz","Sırt","Core"],
 "Muscle-Up":["Sırt","Kol","Göğüs"],"Weighted Pull-Up":["Sırt","Kol"],"Weighted Ring Dip":["Göğüs","Omuz","Kol"],
 "OHP":["Omuz","Kol"],"Squat":["Bacak","Core"],"RDL":["Bacak","Sırt"],"Planche Push-Up / Lean":["Omuz","Göğüs","Core"],
 "Front Lever Pull / Raise":["Sırt","Kol","Core"],"Chest-to-Bar":["Sırt","Kol"],"Pull-Up":["Sırt","Kol"],"Ring Row":["Sırt","Kol"],
 "Incline DB Press":["Göğüs","Omuz","Kol"],"Bulgarian Split Squat":["Bacak","Core"],"Hanging Leg Raise":["Core"],"Dragon Flag":["Core"]
};
const CRITICAL=["Full Planche","Front Lever","Back Lever","Muscle-Up","Weighted Pull-Up","Weighted Ring Dip","OHP","Squat","RDL","Planche Push-Up / Lean","Front Lever Pull / Raise"];

function lastNDates(n){
 const arr=[]; const base=athleteDayDate(new Date());
 for(let i=n-1;i>=0;i--){const x=new Date(base);x.setDate(base.getDate()-i);arr.push(localDateKey(x))}
 return arr;
}
function avg(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0}
function initDetailedTabs(){
 document.querySelectorAll(".analysis-tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".analysis-tab,.detail-panel").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); q(b.dataset.detail).classList.add("active"); renderDetailed();
 });
}
function saveBodyMeasurement(){
 const rec={
   date:q("bodyDate").value||todayKey(), weight:Number(q("bodyWeight").value)||0, shoulders:Number(q("bodyShoulders").value)||0,
   chest:Number(q("bodyChest").value)||0, waist:Number(q("bodyWaist").value)||0, hips:Number(q("bodyHips").value)||0,
   armR:Number(q("bodyArmR").value)||0, armL:Number(q("bodyArmL").value)||0, thighR:Number(q("bodyThighR").value)||0,
   thighL:Number(q("bodyThighL").value)||0, calfR:Number(q("bodyCalfR").value)||0, calfL:Number(q("bodyCalfL").value)||0
 };
 db.bodyMeasurements.push(rec); save(); renderDetailed();
}
function exerciseBest(name, days=9999){
 const keys=Object.keys(db.trainingLogs).sort().slice(-days);
 let rows=[];
 keys.forEach(k=>(db.trainingLogs[k]||[]).filter(r=>r.name===name&&!r.approximateBackfill).forEach(r=>rows.push({date:k,...r})));
 if(!rows.length)return null;
 return rows.map(r=>({
  ...r, best:Math.max(...r.sets), total:r.sets.reduce((a,b)=>a+b,0),
  score:r.type==="STATIC"?Math.max(...r.sets):(r.load||0)*Math.max(...r.sets)
 })).sort((a,b)=>b.score-a.score)[0];
}
function exerciseChrono(name){
 let rows=[]; Object.keys(db.trainingLogs).sort().forEach(k=>(db.trainingLogs[k]||[]).filter(r=>r.name===name&&!r.approximateBackfill).forEach(r=>rows.push({date:k,...r})));
 return rows;
}
function weeklyBuckets(){
 const allDates=[...new Set([...Object.keys(db.daily),...Object.keys(db.trainingLogs),...Object.keys(db.foodLogs)])].sort();
 if(!allDates.length)return [];
 const last12=allDates.slice(-84);
 const chunks=[];
 for(let i=0;i<12;i++){chunks.push(last12.slice(i*7,(i+1)*7))}
 return chunks;
}
function renderProgression(){
 const body=q("progressionTable").querySelector("tbody"); const weeks=weeklyBuckets();
 body.innerHTML=weeks.map((dates,i)=>{
  const dlogs=dates.map(k=>db.daily[k]).filter(Boolean); const weights=dlogs.map(d=>Number(d.weight)).filter(Boolean);
  const rs=dlogs.map(readiness).filter(x=>x!=null); const trainDays=dates.filter(k=>(db.trainingLogs[k]||[]).length).length;
  function bestIn(name){
    let vals=[]; dates.forEach(k=>(db.trainingLogs[k]||[]).filter(r=>r.name===name).forEach(r=>{
      if(r.type==="STATIC") vals.push(Math.max(...r.sets)); else vals.push((r.load||0));
    })); return vals.length?Math.max(...vals):0;
  }
  const runKm=dates.reduce((a,k)=>a+(db.daily[k]?.runKm||0),0);
  return `<tr><td>${i+1}</td><td>${weights.length?avg(weights).toFixed(1):"-"}</td><td>${rs.length?Math.round(avg(rs)):"-"}</td><td>${trainDays}</td><td>${bestIn("Full Planche")||"-"}</td><td>${bestIn("Front Lever")||"-"}</td><td>${bestIn("Weighted Pull-Up")||"-"}</td><td>${runKm||"-"}</td></tr>`;
 }).join("");
}
function renderBodyDevelopment(){
 const arr=db.bodyMeasurements.slice().sort((a,b)=>a.date.localeCompare(b.date));
 if(!arr.length){q("bodyDevelopment").innerHTML="<div class='hint'>Henüz ölçüm yok.</div>";return}
 const first=arr[0], last=arr[arr.length-1];
 const items=[["Kilo",first.weight,last.weight,"kg"],["Bel",first.waist,last.waist,"cm"],["Göğüs",first.chest,last.chest,"cm"],["Sağ Kol",first.armR,last.armR,"cm"],["Sağ Uyluk",first.thighR,last.thighR,"cm"]];
 q("bodyDevelopment").innerHTML=items.map(([n,a,b,u])=>`<div class="summary-item"><span>${n}</span><strong>${a&&b?`${(b-a).toFixed(1)} ${u}`:"-"}</strong></div>`).join("");
}
function calcMuscleVolume(){
 const dates=lastNDates(7); const vols={"Göğüs":0,"Omuz":0,"Kol":0,"Sırt":0,"Core":0,"Bacak":0};
 dates.forEach(k=>(db.trainingLogs[k]||[]).forEach(r=>{
   const ms=MUSCLE_MAP[r.name]||[]; const sets=r.sets.filter(Boolean).length;
   ms.forEach((m,i)=>vols[m]+=sets*(i===0?1:0.5))
 }));
 return vols;
}
function renderMuscleVolume(){
 const vols=calcMuscleVolume();
 q("muscleVolumeGrid").innerHTML=Object.entries(vols).map(([m,v])=>`<div class="muscle-card"><span>${m}</span><strong>${v.toFixed(1)}</strong><small>efektif set / 7 gün</small></div>`).join("");
 return vols;
}
function renderRecoveryDetail(){
 const dates=lastNDates(7), logs=dates.map(k=>db.daily[k]).filter(Boolean);
 if(!logs.length){["recSleep","recEnergy","recStress","recScore"].forEach(id=>q(id).textContent="--");q("recoveryAdvice").textContent="Henüz veri yok.";return 0}
 const sleep=avg(logs.map(d=>sleepDuration(d)/60)), energy=avg(logs.map(d=>Number(d.energy)||0)), stress=avg(logs.map(d=>Number(d.stress)||0));
 const score=Math.round(avg(logs.map(d=>readiness(d)||0)));
 q("recSleep").textContent=sleep.toFixed(1)+"h";q("recEnergy").textContent=energy.toFixed(1)+"/5";q("recStress").textContent=stress.toFixed(1)+"/5";q("recScore").textContent=score+"/100";
 q("recoveryAdvice").textContent=score>=80?"Recovery iyi. Planlanan ana kuvvet/skill hacmini sürdürebilirsin.":score>=65?"Recovery orta. Ağır setleri koruyup aksesuar hacmini %10–20 azaltmak mantıklı olabilir.":"Recovery düşük. Deload, kısa seans veya aktif dinlenme değerlendir.";
 return score;
}
function renderStrength(){
 const body=q("strengthTable").querySelector("tbody");
 const names=["Weighted Pull-Up","Weighted Ring Dip","OHP","Squat","RDL","Muscle-Up"];
 body.innerHTML=names.map(n=>{
   const rows=exerciseChrono(n); if(!rows.length)return `<tr><td>${n}</td><td>-</td><td>-</td><td>-</td><td>Veri yok</td></tr>`;
   const bestLoad=Math.max(...rows.map(r=>r.load||0)), bestSet=Math.max(...rows.map(r=>Math.max(...r.sets))), vol=rows.reduce((a,r)=>a+(r.load||0)*r.sets.reduce((x,y)=>x+y,0),0);
   const latest=rows[rows.length-1], prev=rows.length>1?rows[rows.length-2]:null;
   const pr=!prev||((latest.load||0)*Math.max(...latest.sets))>((prev.load||0)*Math.max(...prev.sets));
   return `<tr><td>${n}</td><td>${bestLoad||"-"}</td><td>${bestSet}</td><td>${Math.round(vol)}</td><td class="${pr?'status-good':''}">${pr?'PR / gelişim':'Stabil'}</td></tr>`;
 }).join("");
}
function renderRunning(){
 const dates=lastNDates(7); let km=0,count=0,minsTotal=0,rpe=0;
 dates.forEach(k=>{const d=db.daily[k]; if(d&&Number(d.runKm)>0){km+=Number(d.runKm);count++;minsTotal+=Number(d.runMinutes)||0;rpe+=Number(d.runRpe)||0}});
 q("runKm7").textContent=km.toFixed(1);q("runCount").textContent=count;
 q("runPace").textContent=km&&minsTotal?(minsTotal/km).toFixed(2):"--";
 q("runLoad").textContent=count?Math.round(km*(rpe/count||5)):"--";
 const mesh=window.AthleteLoadMesh?.rolling?.(7)||{};q("runAdvice").textContent=(mesh.highSpeedExposureSec||0)>=30?`Bu hafta ayrıca ${Math.round(mesh.highSpeedExposureSec)} sn high-speed/sprint exposure var. Leg recovery ve sonraki speed/strength kalitesini birlikte izle.`:km>20?"Koşu hacmi yüksek. Alt vücut strength günleriyle çakışmayı ve recovery düşüşünü izle.":km>0?"Koşu hacmi kontrollü görünüyor. Zone 2 ağırlığını korumak strength/skill hedeflerinle daha uyumlu.":"Bu hafta koşu kaydı yok.";
}
function renderBodyMap(){
 const vols=renderMuscleVolume();
 document.querySelectorAll(".muscle").forEach(el=>{
   el.classList.remove("low","medium","high","veryhigh"); const v=vols[el.dataset.muscle]||0;
   el.classList.add(v>=16?"veryhigh":v>=10?"high":v>=6?"medium":"low");
 });
 q("bodyMapLegend").innerHTML=Object.entries(vols).map(([m,v])=>`<div class="summary-item"><span>${m}</span><strong>${v.toFixed(1)} set</strong></div>`).join("");
}
function renderCritical(){
 const body=q("criticalTable").querySelector("tbody");
 body.innerHTML=CRITICAL.map(n=>{
  const rows=exerciseChrono(n); if(!rows.length)return `<tr><td>${n}</td><td>-</td><td>-</td><td>-</td><td>Veri yok</td><td>Önce kayıt oluştur</td></tr>`;
  const latest=rows[rows.length-1], prev=rows.length>1?rows[rows.length-2]:null;
  const metric=r=>r.type==="STATIC"?Math.max(...r.sets):((r.load||0)>0?(r.load||0)*Math.max(...r.sets):Math.max(...r.sets));
  const cur=metric(latest), pre=prev?metric(prev):0, ch=prev?((cur-pre)/Math.max(pre,1)*100):0;
  const status=!prev?"Başlangıç":ch>3?"Gelişiyor":ch<-3?"Geriliyor":"Stabil";
  const advice=status==="Geriliyor"?"Recovery, RIR ve haftalık hacmi kontrol et.":status==="Stabil"?"Küçük progresyon ekle veya kaliteyi artır.":"Mevcut progresyonu sürdür.";
  return `<tr><td>${n}</td><td>${cur.toFixed(1)}</td><td>${prev?pre.toFixed(1):"-"}</td><td>${prev?ch.toFixed(1)+"%":"-"}</td><td>${status}</td><td>${advice}</td></tr>`;
 }).join("");
}
function renderPortal(){
 const d=db.daily[todayKey()]||{}, foods=db.foodLogs[todayKey()]||[], trains=db.trainingLogs[todayKey()]||[];
 const kcal=Math.round(foods.reduce((a,r)=>a+r.kcal,0)), protein=Math.round(foods.reduce((a,r)=>a+r.p,0));
 q("portalSummary").innerHTML=[
  ["Bugünkü uyku",d.sleepTime&&d.wakeTime?(sleepDuration(d)/60).toFixed(1)+" saat":"-"],
  ["Readiness",readiness(d)?readiness(d)+"/100":"-"],
  ["Vardiya",d.workStatus==="work"?(SHIFT[d.shift]?.start+"–"+SHIFT[d.shift]?.end):"İzin / kayıt yok"],
  ["Antrenman hareketi",trains.length],["Kalori",kcal],["Protein",protein+" g"],["Su",(nutritionMetricsForDate(todayKey()).water/1000).toFixed(1)+" L"],["Sosyal plan",db.social[todayKey()]?db.social[todayKey()].type:"Yok"]
 ].map(x=>`<div class="summary-item"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
}
function renderRecommendation(){
 const d=db.daily[todayKey()]||{}, r=readiness(d)||70, load=calcMuscleVolume();
 let rec=recommendWorkout(d);
 let extra="";
 if(r<55)extra=" Bugün yüksek skill/strength yerine recovery odaklı çalış.";
 else if((load["Sırt"]||0)>14)extra=" Sırt hacmi yüksek; pull aksesuarlarını azalt.";
 else if((load["Göğüs"]||0)>14)extra=" Push hacmi yüksek; ek press setlerini azalt.";
 else extra=" Skill → ana kuvvet → hipertrofi sırasını koru.";
 q("trainingRecommendation").innerHTML=`<strong>${rec}</strong><br>Readiness: ${r}/100.${extra}`;
}
function renderDetailedDashboard(){
 const r=renderRecoveryDetail(); const vols=calcMuscleVolume(); const trainDays=lastNDates(7).filter(k=>(db.trainingLogs[k]||[]).length).length;
 const weights=lastNDates(7).map(k=>db.daily[k]?.weight).filter(Boolean).map(Number);
 const trend=weights.length>1?(weights[weights.length-1]-weights[0]):0;
 const skill=["Full Planche","Front Lever","Back Lever"].filter(n=>exerciseChrono(n).length).length;
 const strength=["Weighted Pull-Up","Weighted Ring Dip","OHP"].filter(n=>exerciseChrono(n).length).length;
 const athlete=Math.round(clamp((r||60)*.35 + Math.min(trainDays/5*100,100)*.25 + skill/3*100*.2 + strength/3*100*.2,0,100));
 q("athleteScore").textContent=athlete+"/100";q("detailRecoveryScore").textContent=(r||0)+"/100";q("detailTrainingLoad").textContent=trainDays+"/7 gün";q("detailBodyTrend").textContent=weights.length>1?`${trend>=0?"+":""}${trend.toFixed(1)} kg`:"--";
 q("detailDashboardSummary").innerHTML=[
  ["Son 7 gün antrenman",trainDays+" gün"],["Aktif kritik skill",skill+"/3"],["Aktif strength metriği",strength+"/3"],["Toplam efektif set",Object.values(vols).reduce((a,b)=>a+b,0).toFixed(1)]
 ].map(x=>`<div class="summary-item"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
 q("detailPriority").textContent=r<65?"Öncelik: recovery ve uyku. Ana hareketleri koru, aksesuar hacmini düşür.":trainDays<3?"Öncelik: antrenman devamlılığı. Haftalık ana skill/strength temaslarını tamamla.":"Öncelik: kaliteli progresyon. Kritik hareketlerde küçük ve sürdürülebilir artış hedefle.";
}
function renderDetailed(){
 renderDetailedDashboard();renderProgression();renderBodyDevelopment();renderMuscleVolume();renderStrength();renderRunning();renderBodyMap();renderCritical();renderPortal();renderRecommendation();
}


function initReportTabs(){
 document.querySelectorAll(".report-tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".report-tab,.report-panel").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); q(b.dataset.report).classList.add("active"); renderReports();
 });
}

function nutritionMetricsForDate(k){
 const rows=(db.foodLogs[k]||[]).map(normalizeFoodRow),t=nutrientTotalsForRows(rows),direct=window.WaterLedger?.total?.(db,k)??(db.water[k]||0);
 const hydr=window.HydrationIntelligence?.context?.(db,k,{foodWaterMl:t.water,directWaterMl:direct})||{score:0,totalWaterMl:direct+t.water,lowL:db.settings.targetWater||3,highL:db.settings.targetWater||3,status:"unknown"};
 const kcalScore=db.settings.targetCalories?clamp(100-Math.abs(t.kcal-db.settings.targetCalories)/db.settings.targetCalories*100,0,100):0;
 const proteinScore=db.settings.targetProtein?clamp(t.p/db.settings.targetProtein*100,0,100):0;
 const waterScore=hydr.score||0;
 const fiberScore=clamp(t.fiber/30*100,0,100);
 const microKeys=["potassium","calcium","iron","magnesium","zinc","vitC","vitD","b12","folate"];
 const microScore=Math.round(avg(microKeys.map(x=>clamp((t[x]||0)/MICRO_REFERENCE[x].target*100,0,100))));
 const score=Math.round(kcalScore*.30+proteinScore*.30+waterScore*.20+fiberScore*.10+microScore*.10);
 return {kcal:t.kcal,protein:t.p,carbs:t.c,fat:t.f,fiber:t.fiber,caffeine:t.caf,water:hydr.totalWaterMl,hydration:hydr,score,kcalScore,proteinScore,waterScore,microScore,...t};
}

function dailyEfficiencyScore(k){
 const d=db.daily[k]; if(!d)return 0;
 const r=readiness(d)||0;
 const nut=nutritionMetricsForDate(k).score;
 const train=(db.trainingLogs[k]||[]).length?100:65;
 const workBalance=d.workStatus==="work"?clamp(100-(Number(d.workIntensity||3)-3)*8,70,100):95;
 const socialPenalty=db.social[k]?8:0;
 return Math.round(clamp(r*.4+nut*.25+train*.2+workBalance*.15-socialPenalty,0,100));
}

function renderNutritionAdvice(){
 const m=nutritionMetricsForDate(todayKey());
 const tCal=db.settings.targetCalories||0, tP=db.settings.targetProtein||0;
 let lines=[];
 const adaptiveTarget=window.AdaptiveNutrition?.targets?.(todayKey());
 if(adaptiveTarget)lines.push({c:"good",t:"Adaptif günlük hedef",x:`${adaptiveTarget.kcal} kcal · ${adaptiveTarget.proteinG} g protein · ${adaptiveTarget.carbsG} g karbonhidrat · ${adaptiveTarget.fatG} g yağ. ${adaptiveTarget.rationale} · calibration güven ${adaptiveTarget.calibrationConfidence}/100.`});
 const calDiff=Math.round(tCal-m.kcal);
 if(calDiff>350) lines.push({c:"warn",t:"Kalori düşük",x:`Yaklaşık ${calDiff} kcal hedefin altında görünüyorsun. Gün bitmediyse dengeli bir ana öğün veya ara öğün ekleyebilirsin.`});
 else if(calDiff>100) lines.push({c:"warn",t:"Kalori hedefinin biraz altındasın",x:`Yaklaşık ${calDiff} kcal alanın var.`});
 else if(calDiff<-300) lines.push({c:"warn",t:"Kalori hedefini aştın",x:`Yaklaşık ${Math.abs(calDiff)} kcal üzerindesin. Tek güne değil haftalık trende bak.`});
 else lines.push({c:"good",t:"Kalori",x:"Günlük kalori hedefinle uyumlu görünüyorsun."});

 const pDiff=Math.round(tP-m.protein);
 if(pDiff>20) lines.push({c:"warn",t:"Protein eksiği",x:`Yaklaşık ${pDiff} g protein eksik. Tavuk, yumurta, yoğurt, ton balığı veya benzeri bir protein kaynağı ekleyebilirsin.`});
 else lines.push({c:"good",t:"Protein",x:"Protein hedefin iyi görünüyor."});
 if(m.fiber<20) lines.push({c:"warn",t:"Lif düşük",x:`Bugün ${m.fiber.toFixed(1)} g lif kaydettin. Sebze, meyve, yulaf veya bakliyat eklemek günlük çeşitliliği artırabilir.`});
 else if(m.fiber>=30) lines.push({c:"good",t:"Lif",x:`${m.fiber.toFixed(1)} g lif ile referans düzey iyi görünüyor.`});

 const h=m.hydration;
 if(h){
   const cls=["low_recorded","below_range","high_recorded"].includes(h.status)?"warn":"good";
   lines.push({c:cls,t:h.title,x:`${h.message} Kayıt: ${(h.directWaterMl/1000).toFixed(1)} L doğrudan su + ${(h.foodWaterMl/1000).toFixed(1)} L besin/içecek suyu. Güven ${h.confidence}/100.${h.customMismatch?` Manuel ${h.manualTargetL.toFixed(1)} L hedefin model aralığından belirgin farklı; sistem bunu zorunlu fizyolojik ihtiyaç olarak kullanmıyor.`:""}`});
 }

 if(m.caffeine>350) lines.push({c:"warn",t:"Kafein yüksek",x:`Bugün yaklaşık ${Math.round(m.caffeine)} mg kafein kaydedildi. Özellikle yatışa yakın saatlerde yeni kafein eklememek uyku planını korumaya yardımcı olabilir.`});

 q("nutritionAdvice").innerHTML=lines.map(r=>`<div class="rec-card ${r.c}"><strong>${r.t}</strong>${r.x}</div>`).join("");
}

function renderDailyReport(){
 const k=todayKey(), d=db.daily[k], eff=dailyEfficiencyScore(k), n=nutritionMetricsForDate(k);
 const sl=d?sleepDuration(d)/60:0, r=readiness(d)||0, trains=(db.trainingLogs[k]||[]);
 q("dailyEfficiency").textContent=d?(eff/10).toFixed(1)+"/10":"--";
 q("dailyReadinessReport").textContent=d?r+"/100":"--";
 q("dailyNutritionReport").textContent=n.score+"/100";
 q("dailySleepReport").textContent=d?sl.toFixed(1)+"h":"--";

 const summary=[
  ["Uyku",d?sl.toFixed(1)+" saat":"Veri yok"],
  ["Readiness",d?r+"/100":"Veri yok"],
  ["Antrenman",trains.length?trains.length+" hareket":"Kayıt yok"],
  ["Kalori",Math.round(n.kcal)+" / "+db.settings.targetCalories],
  ["Protein",Math.round(n.protein)+" / "+db.settings.targetProtein+" g"],
  ["Su",`${(n.water/1000).toFixed(1)} L · model ${n.hydration?.lowL?.toFixed(1)||"—"}–${n.hydration?.highL?.toFixed(1)||"—"} L`],
  ["Vardiya",d?.workStatus==="work"?(SHIFT[d.shift]?.start+"–"+SHIFT[d.shift]?.end):"İzin / kayıt yok"]
 ];
 q("dailyReportSummary").innerHTML=summary.map(x=>`<div class="summary-item"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");

 let advice=[];
 if(d){
  if(r<60) advice.push("Readiness düşük. Bugün ağır skill/strength yerine hacmi azaltılmış seans veya recovery daha mantıklı.");
  else if(r>=80) advice.push("Readiness yüksek. Ana skill ve kuvvet hareketlerini kaliteli şekilde uygulamak için iyi bir gün.");
  if(sl<db.settings.targetSleep-.75) advice.push(`Uyku hedefinin yaklaşık ${(db.settings.targetSleep-sl).toFixed(1)} saat altındasın. Bu gece uyku fırsatını artır.`);
 }
 if(n.kcal<db.settings.targetCalories-300) advice.push("Kalori hedefinde belirgin açık var. Gün bitmediyse bir ana öğün veya dengeli ara öğün ekle.");
 if(n.protein<db.settings.targetProtein-20) advice.push("Protein hedefin eksik. Protein ağırlıklı bir öğün ekle.");
 if(["low_recorded","below_range"].includes(n.hydration?.status)) advice.push(`${n.hydration.title}. ${n.hydration.message}`);
 if(n.hydration?.status==="high_recorded") advice.push("Kayıtlı su model aralığının belirgin üstünde. Sweat-rate/ısı verisi yoksa yalnız hedef tutturmak için ekstra su zorlama.");
 if(!advice.length) advice.push("Bugünkü ana göstergeler dengeli görünüyor. Planı koru ve gereksiz ek hacim ekleme.");
 q("dailyReportAdvice").innerHTML=advice.map((x,i)=>`<div class="rec-card ${i===0?'good':''}"><strong>${i+1}. öneri</strong>${x}</div>`).join("");
}

function renderWeeklyReport(){
 const dates=lastNDates(7), dlogs=dates.map(k=>db.daily[k]).filter(Boolean);
 const effs=dates.map(dailyEfficiencyScore).filter(x=>x>0);
 const weeklyEff=effs.length?avg(effs):0;
 const sleeps=dlogs.map(d=>sleepDuration(d)/60);
 const sleepScore=sleeps.length?Math.round(avg(sleeps.map(x=>clamp(x/db.settings.targetSleep*100,0,100)))):0;
 const trainDays=dates.filter(k=>(db.trainingLogs[k]||[]).length).length;
 const trainingScore=Math.round(clamp(trainDays/5*100,0,100));
 const nuts=dates.map(k=>nutritionMetricsForDate(k).score).filter(x=>x>0);
 const nutScore=nuts.length?Math.round(avg(nuts)):0;
 const avgRead=dlogs.length?Math.round(avg(dlogs.map(d=>readiness(d)||0))):0;
 const debt=Math.round(dlogs.reduce((a,d)=>a+Math.max(0,db.settings.targetSleep*60-sleepDuration(d)),0));
 const periodTrend=window.PeriodicTrendEngine?.summary?.("weekly");

 q("weeklyEfficiency10").textContent=effs.length?(weeklyEff/10).toFixed(1)+"/10":"--";
 q("weeklySleepScore").textContent=sleepScore+"/100";
 q("weeklyTrainingScore").textContent=trainingScore+"/100";
 q("weeklyNutritionScore2").textContent=nutScore+"/100";

 const socials=dates.filter(k=>db.social[k]).length;
 q("weeklyReportSummary2").innerHTML=[
  ["Ortalama readiness",avgRead+"/100"],["Antrenman günü",trainDays],["Ortalama uyku",sleeps.length?avg(sleeps).toFixed(1)+" saat":"-"],
  ["Uyku borcu",`${Math.floor(debt/60)}s ${debt%60}dk`],["Sosyal plan",socials],["Beslenme uyumu",nutScore+"/100"],["Performans trendi",periodTrend?window.PeriodicTrendEngine.stateLabel(periodTrend.state):"—"]
 ].map(x=>`<div class="summary-item"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");

 let rec=[];
 if(sleepScore<85) rec.push({t:"Uyku",x:"Yeni haftada toplam uyku fırsatını artır. Özellikle sabah vardiyalarından önce sosyal plan bitişini daha erken tut.",c:"warn"});
 if(trainingScore<80) rec.push({t:"Antrenman devamlılığı",x:"Ana 3 strength/skill seansını önce takvime yerleştir, koşuları ve sosyal planları bunun çevresine yerleştir.",c:"warn"});
 if(nutScore<85) rec.push({t:"Beslenme",x:"Protein, kalori ve su hedeflerini haftanın daha fazla gününde tamamlamaya odaklan.",c:"warn"});
 if(avgRead<70) rec.push({t:"Recovery",x:"Yeni haftanın ilk yarısında toplam hacmi %10–20 azaltıp ana hareket kalitesini koru.",c:"bad"});
 if(periodTrend?.state==="declining")rec.push({t:"Performans düşüşü",x:periodTrend.comment,c:"bad"});
 if(periodTrend?.state==="plateau")rec.push({t:"Plato adayı",x:periodTrend.comment,c:"warn"});
 if(socials>=3) rec.push({t:"Sosyal denge",x:"Sosyal yaşamı koru; ancak 10:00 vardiyasından önce gece geç biten planların sayısını sınırlandır.",c:"warn"});
 if(!rec.length) rec.push({t:"Mevcut düzeni koru",x:"Bu hafta dengeli görünüyor. Yeni haftada küçük progresyon yap; antrenman hacmini bir anda artırma.",c:"good"});
 q("nextWeekAdvice").innerHTML=rec.map(r=>`<div class="rec-card ${r.c}"><strong>${r.t}</strong>${r.x}</div>`).join("");
}

function renderMonthlyReport(){
 const dates=lastNDates(30), dlogs=dates.map(k=>db.daily[k]).filter(Boolean);
 const effs=dates.map(dailyEfficiencyScore).filter(x=>x>0);
 const e=effs.length?avg(effs):0;
 const rs=dlogs.map(d=>readiness(d)||0).filter(Boolean);
 const trainDays=dates.filter(k=>(db.trainingLogs[k]||[]).length).length;
 const debt=Math.round(dlogs.reduce((a,d)=>a+Math.max(0,db.settings.targetSleep*60-sleepDuration(d)),0));
 const weights=dlogs.map(d=>Number(d.weight)).filter(Boolean);
 const avgNut=avg(dates.map(k=>nutritionMetricsForDate(k).score).filter(Boolean));
 const socialCount=dates.filter(k=>db.social[k]).length,periodTrend=window.PeriodicTrendEngine?.summary?.("monthly");

 q("monthlyEfficiency10").textContent=effs.length?(e/10).toFixed(1)+"/10":"--";
 q("monthlyReadiness").textContent=rs.length?Math.round(avg(rs))+"/100":"--";
 q("monthlyTrainingDays").textContent=trainDays;
 q("monthlySleepDebt").textContent=`${Math.floor(debt/60)}s`;

 q("monthlyReportSummary").innerHTML=[
  ["Toplam antrenman günü",trainDays],["Ort. readiness",rs.length?Math.round(avg(rs))+"/100":"-"],
  ["Ort. beslenme uyumu",avgNut?Math.round(avgNut)+"/100":"-"],["Sosyal plan sayısı",socialCount],
  ["Kilo değişimi",weights.length>1?`${(weights[weights.length-1]-weights[0]).toFixed(1)} kg`:"-"],
  ["Performans trendi",periodTrend?`${window.PeriodicTrendEngine.stateLabel(periodTrend.state)}${periodTrend.delta==null?"":` · ${periodTrend.delta>=0?"+":""}${periodTrend.delta.toFixed(1)}%`}`:"-"],
  ["Toplam uyku borcu",`${Math.floor(debt/60)} saat ${debt%60} dk`]
 ].map(x=>`<div class="summary-item"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");

 let rec=[];
 if(trainDays<12) rec.push({t:"Antrenman sıklığı",x:"Önümüzdeki ay ana strength/skill seanslarında daha yüksek devamlılık hedefle.",c:"warn"});
 if(debt>8*60) rec.push({t:"Uyku",x:"Aylık uyku borcu yüksek. Yeni ayda vardiyaya göre yatış saatlerini daha sık korumaya çalış.",c:"bad"});
 if(avgNut<80) rec.push({t:"Beslenme",x:"Kalori, protein ve su hedeflerini daha tutarlı tamamla. Günlük büyük dalgalanmaları azalt.",c:"warn"});
 if(rs.length&&avg(rs)<70) rec.push({t:"Recovery",x:"Readiness ortalaman düşük. Hacim artışı yerine recovery ve uyku düzenine öncelik ver.",c:"bad"});
 if(periodTrend?.state==="rising")rec.push({t:"Yükseliş",x:periodTrend.comment,c:"good"});
 if(periodTrend?.state==="plateau")rec.push({t:"Plato",x:periodTrend.comment,c:"warn"});
 if(periodTrend?.state==="declining")rec.push({t:"Düşüş",x:periodTrend.comment,c:"bad"});
 if(weights.length>1 && weights[weights.length-1]-weights[0]<0.2) rec.push({t:"Kilo artışı",x:"Kas kazanımı hedefin devam ediyorsa günlük enerji alımını küçük miktarda artırmayı değerlendirebilirsin.",c:"warn"});
 if(!rec.length) rec.push({t:"İlerleme",x:"Ay genelinde denge iyi. Bir sonraki ay yalnızca 1–2 ana metriği progresif artır.",c:"good"});
 q("monthlyAdvice").innerHTML=rec.map(r=>`<div class="rec-card ${r.c}"><strong>${r.t}</strong>${r.x}</div>`).join("");
}

function renderReports(){
 renderDailyReport();renderWeeklyReport();renderMonthlyReport();renderNutritionAdvice();
}


const EXERCISE_SCIENCE = {
 "Muscle-Up":{discipline:"Calisthenics",pattern:"Vertical Pull + Transition",primary:"Sırt",secondary:"Kol",skill:9,strength:8,hypertrophy:6,endurance:5,power:8,speed:6,fatigue:7,equipment:["Pull-Up Bar"]},
 "Full Planche":{discipline:"Calisthenics",pattern:"Straight-Arm Push",primary:"Omuz",secondary:"Core",skill:10,strength:9,hypertrophy:5,endurance:4,power:3,speed:1,fatigue:8,equipment:["Parallettes"]},
 "Front Lever":{discipline:"Calisthenics",pattern:"Straight-Arm Pull",primary:"Sırt",secondary:"Core",skill:10,strength:9,hypertrophy:6,endurance:5,power:3,speed:1,fatigue:7,equipment:["Pull-Up Bar"]},
 "Back Lever":{discipline:"Calisthenics",pattern:"Straight-Arm Hold",primary:"Omuz",secondary:"Sırt",skill:8,strength:7,hypertrophy:4,endurance:5,power:2,speed:1,fatigue:6,equipment:["Rings"]},
 "Weighted Pull-Up":{discipline:"Strength/Calisthenics",pattern:"Vertical Pull",primary:"Sırt",secondary:"Kol",skill:5,strength:10,hypertrophy:9,endurance:5,power:7,speed:3,fatigue:8,equipment:["Pull-Up Bar","Weight Belt"]},
 "Weighted Ring Dip":{discipline:"Strength/Calisthenics",pattern:"Vertical Push",primary:"Göğüs",secondary:"Omuz",skill:6,strength:9,hypertrophy:9,endurance:5,power:6,speed:3,fatigue:8,equipment:["Rings","Weight Belt"]},
 "OHP":{discipline:"Strength",pattern:"Vertical Push",primary:"Omuz",secondary:"Kol",skill:4,strength:9,hypertrophy:8,endurance:4,power:7,speed:3,fatigue:7,equipment:["EZ Bar/Dumbbell"]},
 "Bulgarian Split Squat":{discipline:"Strength/Hypertrophy",pattern:"Single Leg Squat",primary:"Bacak",secondary:"Core",skill:4,strength:8,hypertrophy:10,endurance:6,power:5,speed:2,fatigue:8,equipment:["Dumbbell/Backpack"]},
 "RDL":{discipline:"Strength/Hypertrophy",pattern:"Hip Hinge",primary:"Bacak",secondary:"Sırt",skill:4,strength:9,hypertrophy:9,endurance:4,power:6,speed:2,fatigue:8,equipment:["EZ Bar/Dumbbell"]},
 "Ring Push-Up":{discipline:"Calisthenics/Hypertrophy",pattern:"Horizontal Push",primary:"Göğüs",secondary:"Omuz",skill:5,strength:6,hypertrophy:9,endurance:7,power:4,speed:3,fatigue:5,equipment:["Rings"]},
 "Ring Row":{discipline:"Calisthenics/Hypertrophy",pattern:"Horizontal Pull",primary:"Sırt",secondary:"Kol",skill:3,strength:6,hypertrophy:9,endurance:7,power:3,speed:2,fatigue:5,equipment:["Rings"]},
 "DB Lateral Raise":{discipline:"Bodybuilding",pattern:"Shoulder Abduction",primary:"Omuz",secondary:"",skill:1,strength:3,hypertrophy:9,endurance:7,power:1,speed:1,fatigue:3,equipment:["Dumbbell"]},
 "EZ-Bar Curl":{discipline:"Bodybuilding",pattern:"Elbow Flexion",primary:"Kol",secondary:"",skill:1,strength:5,hypertrophy:9,endurance:7,power:2,speed:1,fatigue:3,equipment:["EZ Bar"]},
 "Dragon Flag":{discipline:"Calisthenics",pattern:"Core Anti-Extension",primary:"Core",secondary:"",skill:7,strength:7,hypertrophy:6,endurance:7,power:2,speed:1,fatigue:5,equipment:["Bodyweight"]},
 "Zone 2 Run":{discipline:"Running",pattern:"Locomotion",primary:"Bacak",secondary:"Cardio",skill:2,strength:2,hypertrophy:1,endurance:10,power:2,speed:3,fatigue:5,equipment:["Outdoor"]},
 "Tempo Run":{discipline:"Running",pattern:"Locomotion",primary:"Bacak",secondary:"Cardio",skill:3,strength:2,hypertrophy:1,endurance:9,power:4,speed:6,fatigue:7,equipment:["Outdoor"]}
};

const HYBRID_TEMPLATES={
 pull:{name:"Pull + Front Lever",duration:75,items:[
  ["Muscle-Up","3×2–4","Temiz tekrar"],["Front Lever","4×5–10 sn","Kaliteli hold"],["Front Lever Pull / Raise","3×4–8","Kontrollü"],
  ["Weighted Pull-Up","5×5","+35 kg başlangıç"],["Ring Row","3×8–12","Tam ROM"],["EZ-Bar Curl","3×8–12","RIR 1–2"],["DB Hammer Curl","2×10–15","Kontrollü"]
 ]},
 push:{name:"Push + Planche",duration:75,items:[
  ["Full Planche","5×5–8 sn","Kaliteli hold"],["Planche Push-Up","3×3–6","Tekrar bazlı · teknik öncelik"],["Weighted Ring Dip","5×5","RIR 1–2"],
  ["OHP","3×5–8","Ağır kontrollü"],["Ring Push-Up","3×8–15","Derin ROM"],["DB Lateral Raise","4×12–20","Hipertrofi"],["Triceps Extension","3×10–15","RIR 1–2"]
 ]},
 legs:{name:"Legs + Hybrid",duration:70,items:[
  ["Back Lever","3×5–10 sn","Skill primer"],["Bulgarian Split Squat","4×6–10","DB / backpack"],["RDL","4×6–10","EZ bar / DB"],
  ["Backpack/Goblet Squat","3×10–15","Kontrollü"],["Single-Leg RDL","3×8–12","Denge"],["Calf Raise","4×10–20","Tam ROM"],["Dragon Flag","3×4–8","Core"]
 ]},
 run:{name:"Easy / Long Run",duration:45,items:[["Zone 2 Run","5.5–8 km","Konuşma temposu / kontrollü RPE"],["Mobility","8–10 dk","Koşu sonrası"]]},
 recovery:{name:"Recovery / Minimum Day",duration:30,items:[["Walk","20–30 dk","Kolay"],["Mobility","10 dk","Omuz/kalça/bilek"],["Hydration + Sleep","—","Recovery önceliği"]]}
};

function coachTypeForToday(){
 const d=db.daily[todayKey()]||{};
 const r=readiness(d);
 const ready=r==null?75:r;
 if(ready<58 || Number(d.joint||5)<=2 || Number(d.soreness||1)>=5) return "recovery";

 // Pazartesi=Pull, Salı=Run, Çarşamba=Push, Perşembe=Recovery, Cuma=Legs, Cumartesi=Run, Pazar=Recovery.
 // Vardiya günün türünü değil, önerilen saat/yoğunluğu değiştirir.
 const weekday=new Date().getDay();
 const map={1:"pull",2:"run",3:"push",4:"recovery",5:"legs",6:"run",0:"recovery"};
 let type=map[weekday]||"recovery";
 type=window.HealthStateEngine?.coachTypeOverride?.(d,type)||type;

 // Orta recovery: ağır bacak gününde gerektiğinde daha düşük maliyetli seansa geç.
 if(ready<68 && type==="legs") type="recovery";
 return type;
}
function progressionAdvice(name){
 const rows=exerciseChrono(name);
 if(!rows.length) return "İlk referans seansını kaydet.";
 const last=rows[rows.length-1]||{};
 const sets=Array.isArray(last.sets)?last.sets.map(Number).filter(Number.isFinite):[];
 if(!sets.length) return "Geçmiş kayıt bulundu ancak set verisi eksik; yeni seans kaydıyla progresyon başlayacak.";
 const best=Math.max(...sets), total=sets.reduce((a,b)=>a+b,0), rir=Number(last.rir??2);
 if(name==="Weighted Pull-Up"){
   if((last.load||0)>=35 && sets.filter(x=>x>=5).length>=5 && rir>=2) return `5×5 kaliteli tamamlandıysa sonraki Pull seansında ${(Number(last.load)+2.5).toFixed(1)} kg değerlendir.`;
   return "Aynı yükte 5×5 ve RIR 1–2 kalitesini tamamla; sonra yük artır.";
 }
 if(name==="Weighted Ring Dip"){
   if(sets.filter(x=>x>=5).length>=5 && rir>=2) return "Bir sonraki seans küçük yük artışı veya 1 tekrar/set progresyonu değerlendir.";
   return "Önce mevcut yükte kaliteli toplam hacmi tamamla.";
 }
 if(["Full Planche","Front Lever","Back Lever"].includes(name)) return `Son toplam kaliteli süre ${total} sn. Sonraki hedefi yaklaşık ${Math.ceil(total*1.05)}–${Math.ceil(total*1.12)} sn toplam kalite bandına taşı.`;
 return "RIR 1–2 ile üst tekrar sınırına ulaştığında küçük progresyon yap.";
}
function renderCoach(){
 const d=db.daily[todayKey()]||{}, raw=readiness(d), r=raw==null?75:raw, type=coachTypeForToday(), t=HYBRID_TEMPLATES[type]||HYBRID_TEMPLATES.recovery;
 if(!q("coachReadiness")) return;
 q("coachReadiness").textContent=(raw==null?"75*":r)+"/100";
 q("coachSession").textContent=t.name;
 q("coachIntensity").textContent=r>=85?"%95–100":r>=70?"%85–95":r>=60?"%70–85":"Recovery";
 q("coachDuration").textContent=t.duration+" dk";
 q("coachWorkout").innerHTML=t.items.map(x=>{const lr=window.LoadPrescriptionEngine?.recommend?.(x[0],x[1],todayKey(),{readinessScore:r,templateNote:x[2]});return `<div class="coach-row"><strong>${x[0]}</strong><span>${x[1]}</span><span>${lr?.applicable&&lr.display?`Yük: ${lr.display}`:x[2]}</span></div>`}).join("");

 const shift=d.shift||"morning", status=d.workStatus||"off";
 let windowText=status!=="work"?"İzin günü: uyanıştan yaklaşık 2 saat sonra ana pencere.":
   shift==="evening"?"14–22 vardiya: ana seansı iş öncesine yerleştir.":
   shift==="mid"?"12–20 vardiya: mümkünse iş öncesi ana seans.":
   "10–18 vardiya: uykuyu bozmadan iş sonrası kontrollü seans.";
 let why=raw==null
   ?`Henüz bugünün check-in verisi yok. Geçici 75/100 readiness ile ${t.name} önerildi. Check-in kaydedildiğinde karar otomatik güncellenecek. ${windowText}`
   :r<58
   ?`Readiness ${r}/100. Ağır skill/strength yerine recovery/minimum day seçildi. ${windowText}`
   :`Readiness ${r}/100. Haftalık Çağlar Hybrid Mass 12W omurgasına göre ${t.name} seçildi. ${windowText}`;
 q("coachDecision").textContent=why;

 const focus=type==="pull"?["Weighted Pull-Up","Front Lever","Muscle-Up"]:
             type==="push"?["Weighted Ring Dip","Full Planche","OHP"]:
             type==="legs"?["RDL","Bulgarian Split Squat","Back Lever"]:["Zone 2 Run"];
 q("coachProgression").innerHTML=focus.map(n=>`<div class="rec-card good"><strong>${n}</strong>${progressionAdvice(n)}</div>`).join("");
 q("blockPlan").innerHTML=[
  ["1–3. hafta","Base + Hypertrophy","Skill kalite + hacim + baseline"],
  ["4. hafta","Deload","Set hacmi yaklaşık %30–40 azalt"],
  ["5–7. hafta","Strength + Mass","Ana hareketlerde daha ağır progresyon"],
  ["8. hafta","Deload + Test","Kısa değerlendirme"],
  ["9–11. hafta","Performance","Skill + relative strength + kas hacmi"],
  ["12. hafta","Test","PR, ölçüm, koşu ve Character güncelle"]
 ].map(x=>`<div class="block-card"><strong>${x[0]} • ${x[1]}</strong><span>${x[2]}</span></div>`).join("");
}

const CHARACTER_SCORE_KEYS=["Strength","Relative Strength","Power","Speed","Endurance","Work Capacity","Mobility","Balance & Control","Skill","Recovery"];
const CHARACTER_FIELDS={
 charPlanche:"plancheSec",charFrontLever:"frontLeverSec",charBackLever:"backLeverSec",charMuscleUp:"muscleUpReps",charLSit:"lSitSec",
 charBodyweight:"bodyweight",charWpuLoad:"wpuLoad",charWpuReps:"wpuReps",charDipLoad:"dipLoad",charDipReps:"dipReps",charOHP:"ohpKg",
 char5k:"run5kMin",charLongRun:"longRunKm",charCooper:"cooperM",charWeeklyKm:"weeklyKm",
 charVJump:"verticalJumpCm",charBroadJump:"broadJumpCm",charSprint10:"sprint10Sec",charSprint30:"sprint30Sec",
 charMaxPullups:"maxPullups",charMaxPushups:"maxPushups",charBurpee5:"burpee5",charPlank:"plankSec",
 charShoulderMob:"shoulderMobility",charHipMob:"hipMobility",charAnkleMob:"ankleMobility",charBalance:"balanceControl"
};
function initCharacterInputs(){
 db.characterData=db.characterData||{};
 db.characterOverrides=db.characterOverrides||{};
 Object.entries(CHARACTER_FIELDS).forEach(([id,key])=>{if(q(id)) q(id).value=db.characterData[key]??""});
 const box=q("manualCharacterScores");
 if(box){
  box.innerHTML=CHARACTER_SCORE_KEYS.map((k,i)=>`<div class="manual-score-item"><label>${k}<input id="charOverride${i}" type="number" min="0" max="100" step="1" value="${db.characterOverrides[k]??""}"></label></div>`).join("");
 }
 if(q("saveCharacterDataBtn")) q("saveCharacterDataBtn").onclick=saveCharacterData;
}
function saveCharacterData(){
 db.characterData=db.characterData||{};
 Object.entries(CHARACTER_FIELDS).forEach(([id,key])=>{
   const el=q(id); if(!el) return;
   if(el.value==="") delete db.characterData[key]; else db.characterData[key]=Number(el.value);
 });
 db.characterOverrides=db.characterOverrides||{};
 CHARACTER_SCORE_KEYS.forEach((k,i)=>{
   const el=q("charOverride"+i); if(!el) return;
   if(el.value==="") delete db.characterOverrides[k]; else db.characterOverrides[k]=clamp(Number(el.value),0,100);
 });
 db.characterData.updatedAt=new Date().toISOString();
 save(); safeRender(renderCharacter); safeRender(renderCharacterConfidence);
 const st=q("characterSaveStatus"); if(st){st.textContent="✓ Karakter verisi kaydedildi";st.classList.add("ok");setTimeout(()=>{st.textContent="";st.classList.remove("ok")},2200)}
}
function manualCharacterContribution(base){
 const d=db.characterData||{};
 let s={...base};
 // Skill: direct calisthenics test data
 const skillTests=[];
 if(d.plancheSec!=null) skillTests.push(clamp(45+d.plancheSec*6,0,100));
 if(d.frontLeverSec!=null) skillTests.push(clamp(40+d.frontLeverSec*3,0,100));
 if(d.backLeverSec!=null) skillTests.push(clamp(40+d.backLeverSec*2.5,0,100));
 if(d.muscleUpReps!=null) skillTests.push(clamp(40+d.muscleUpReps*5,0,100));
 if(d.lSitSec!=null) skillTests.push(clamp(35+d.lSitSec*2,0,100));
 if(skillTests.length) s["Skill"]=Math.round(avg(skillTests));

 // Relative strength uses system load / BW where possible
 if(d.bodyweight>0){
   const rel=[];
   if(d.wpuLoad!=null) rel.push(clamp(45+((d.bodyweight+d.wpuLoad)/d.bodyweight-1)*80 + Math.min(15,(d.wpuReps||1)*2),0,100));
   if(d.dipLoad!=null) rel.push(clamp(45+((d.bodyweight+d.dipLoad)/d.bodyweight-1)*60 + Math.min(15,(d.dipReps||1)*2),0,100));
   if(rel.length) s["Relative Strength"]=Math.round(avg(rel));
   if(d.ohpKg!=null) s["Strength"]=Math.round(clamp(45+(d.ohpKg/d.bodyweight)*45,0,100));
 }

 // Endurance from direct running tests; deliberately broad heuristic, not population percentile
 const end=[];
 if(d.run5kMin>0) end.push(clamp(110-d.run5kMin*1.7,20,100));
 if(d.cooperM>0) end.push(clamp((d.cooperM-1400)/16,20,100));
 if(d.longRunKm>0) end.push(clamp(35+d.longRunKm*4,20,100));
 if(d.weeklyKm>0) end.push(clamp(35+d.weeklyKm*2,20,100));
 if(end.length) s["Endurance"]=Math.round(avg(end));

 const pow=[];
 if(d.verticalJumpCm>0) pow.push(clamp(20+d.verticalJumpCm,20,100));
 if(d.broadJumpCm>0) pow.push(clamp((d.broadJumpCm-100)/2,20,100));
 if(pow.length) s["Power"]=Math.round(avg(pow));

 const speed=[];
 if(d.sprint10Sec>0) speed.push(clamp(125-d.sprint10Sec*28,15,100));
 if(d.sprint30Sec>0) speed.push(clamp(130-d.sprint30Sec*14,15,100));
 if(speed.length) s["Speed"]=Math.round(avg(speed));

 const wc=[];
 if(d.maxPullups!=null) wc.push(clamp(30+d.maxPullups*2.5,20,100));
 if(d.maxPushups!=null) wc.push(clamp(25+d.maxPushups*1.2,20,100));
 if(d.burpee5!=null) wc.push(clamp(20+d.burpee5,20,100));
 if(d.plankSec!=null) wc.push(clamp(30+d.plankSec/3,20,100));
 if(wc.length) s["Work Capacity"]=Math.round(avg(wc));

 const mob=[d.shoulderMobility,d.hipMobility,d.ankleMobility].filter(v=>v!=null);
 if(mob.length) s["Mobility"]=Math.round(avg(mob));
 if(d.balanceControl!=null) s["Balance & Control"]=Math.round(d.balanceControl);

 // Explicit manual score override is last and transparent.
 Object.entries(db.characterOverrides||{}).forEach(([k,v])=>{if(CHARACTER_SCORE_KEYS.includes(k)) s[k]=clamp(Number(v),0,100)});
 return s;
}

function characterMetrics(){
 const recent=lastNDates(7).map(k=>db.daily[k]).filter(Boolean);
 const r=recent.length?Math.round(avg(recent.map(d=>readiness(d)||0))):60;
 const has=(n)=>exerciseChrono(n).length>0;
 const fl=exerciseBest("Front Lever"), pl=exerciseBest("Full Planche"), wp=exerciseBest("Weighted Pull-Up"), dip=exerciseBest("Weighted Ring Dip");
 const skill=clamp(55+(has("Full Planche")?15:0)+(has("Front Lever")?15:0)+(has("Muscle-Up")?10:0)+(has("Back Lever")?5:0),0,100);
 const rel=clamp(55+(wp?Math.min(30,(wp.load||0)/35*25):0)+(dip?10:0),0,100);
 const strength=clamp(50+(wp?20:0)+(dip?15:0)+(has("OHP")?15:0),0,100);
 const runDates=lastNDates(30); const km=runDates.reduce((a,k)=>a+(Number(db.daily[k]?.runKm)||0),0);
 const endurance=clamp(45+Math.min(45,km*1.8),0,100);
 const workcap=clamp((strength+endurance)/2,0,100);
 const control=clamp(50+(pl?15:0)+(fl?15:0)+(has("Back Lever")?10:0),0,100);
 const power=clamp(45+(has("Muscle-Up")?20:0)+(has("OHP")?10:0),0,100);
 const autoScores={
  "Strength":Math.round(strength),"Relative Strength":Math.round(rel),"Power":Math.round(power),"Speed":45,
  "Endurance":Math.round(endurance),"Work Capacity":Math.round(workcap),"Mobility":60,"Balance & Control":Math.round(control),
  "Skill":Math.round(skill),"Recovery":Math.round(r)
 };
 return manualCharacterContribution(autoScores);
}
function drawRadar(scores){
 const svg=q("athleteRadar"), labels=Object.keys(scores), vals=Object.values(scores), cx=210,cy=210,R=145,n=labels.length;
 const pt=(i,rad)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [cx+Math.cos(a)*rad,cy+Math.sin(a)*rad]};
 let out="";
 for(let ring=1;ring<=5;ring++){let pts=labels.map((_,i)=>pt(i,R*ring/5).join(",")).join(" ");out+=`<polygon class="radar-grid" points="${pts}"/>`}
 labels.forEach((l,i)=>{const p=pt(i,R), lp=pt(i,R+38);out+=`<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}"/>`;out+=`<text class="radar-label" text-anchor="middle" x="${lp[0]}" y="${lp[1]}">${l}</text>`});
 const shape=vals.map((v,i)=>pt(i,R*v/100).join(",")).join(" ");out+=`<polygon class="radar-shape" points="${shape}"/>`;
 vals.forEach((v,i)=>{const p=pt(i,R*v/100);out+=`<circle class="radar-dot" cx="${p[0]}" cy="${p[1]}" r="4"/><text class="radar-score" x="${p[0]+6}" y="${p[1]-6}">${v}</text>`});
 svg.innerHTML=out;
}
function renderCharacter(){
 const s=characterMetrics();drawRadar(s);
 q("characterScores").innerHTML=Object.entries(s).map(([k,v])=>`<div class="summary-item"><span>${k}</span><strong>${v}/100</strong></div>`).join("");
 const sorted=Object.entries(s).sort((a,b)=>b[1]-a[1]);
 const manualCount=Object.keys(db.characterData||{}).filter(k=>k!=="updatedAt").length;
 q("characterInsight").textContent=`En güçlü mevcut alan: ${sorted[0][0]} (${sorted[0][1]}). En düşük/az ölçülen alan: ${sorted[sorted.length-1][0]} (${sorted[sorted.length-1][1]}). ${manualCount} adet manuel test/performans verisi karakter modeline dahil edildi. Manuel override girilen başlıklar otomatik skorun yerine geçer.`;
}



const ATHLETE_DAY_BOUNDARY_HOUR_DEFAULT=4;

function localDateKey(d=new Date()){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),da=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}
function athleteDayDate(now=new Date()){
  const d=new Date(now);
  const boundary=Number(db?.settings?.dayBoundaryHour ?? ATHLETE_DAY_BOUNDARY_HOUR_DEFAULT);
  if(d.getHours()<boundary) d.setDate(d.getDate()-1);
  d.setHours(12,0,0,0);
  return d;
}
function athleteDayKey(now=new Date()){ return localDateKey(athleteDayDate(now)); }
function addDaysKey(key,n){
  const d=new Date(key+"T12:00:00"); d.setDate(d.getDate()+n); return localDateKey(d);
}
function ensureLifecycle(){
  db.lifecycle=db.lifecycle||{
    boundaryHour:Number(db?.settings?.dayBoundaryHour ?? ATHLETE_DAY_BOUNDARY_HOUR_DEFAULT),
    activeDay:null,lastClosedDay:null,lastSeenAt:null,closedDays:{},missedDays:[],unverifiedDays:[],futurePlanGeneratedAt:null
  };
  db.lifecycle.closedDays=db.lifecycle.closedDays||{};
  db.lifecycle.missedDays=db.lifecycle.missedDays||[];
  db.lifecycle.unverifiedDays=db.lifecycle.unverifiedDays||[];
  return db.lifecycle;
}
function planContributingRow(r){return !!r && r.planContribution!==false && r.source!=="ad_hoc"}
function hasTrainingOnDate(key,planOnly=false){
  // trainingLogs can distinguish plan-contributing work from extra/ad-hoc work.
  const direct=(db.trainingLogs?.[key]||[]);
  if(direct.some(r=>planOnly?planContributingRow(r):true))return true;
  // Generic legacy scan: old containers do not have source metadata, so treat them as plan-capable historical data.
  const buckets=[db.training,db.workouts,db.exerciseLogs,db.sessions].filter(Boolean);
  let found=false;
  buckets.forEach(b=>{
    if(Array.isArray(b)) found = found || b.some(x=>(x.date||x.day||x.key)===key);
    else if(typeof b==="object") found = found || !!b[key];
  });
  return found;
}
function feedbackForPlanDate(key){
 const rows=Object.entries(db.sessionFeedback||{}).map(([actual,fb])=>({...fb,_actual:actual})).filter(f=>(f.targetPlanDate||f._actual)===key);
 return rows.sort((a,b)=>String(a.completedAt||"").localeCompare(String(b.completedAt||""))).at(-1)||null;
}
function summarizeDayClose(key){
  const daily=(db.daily||{})[key]||{};
  const hadCheckin=Object.keys(daily).length>0;
  const hadTraining=hasTrainingOnDate(key,false),hadPlanTraining=hasTrainingOnDate(key,true);
  const planned=(db.futurePlans||{})[key] || db.planHistory?.[key]?.versions?.at(-1)?.plan || (db.generatedWeekPlan||[]).find(x=>x.key===key);
  const verified=db.gapReconciliation?.[key],feedback=feedbackForPlanDate(key);
  let completion="no_training";
  if(feedback?.completionStatus==="partial"||(+feedback?.completionPct>0&&+feedback.completionPct<100)) completion="modified";
  else if(hadPlanTraining) completion=verified?.status==="modified"?"modified":"completed";
  else if(verified?.status==="missed") completion="missed";
  else if(verified?.status==="rested") completion="rested";
  else if(hadTraining && planned && planned.type!=="recovery") completion="extra_training";
  else if(planned && planned.type!=="recovery") completion="unverified";
  return {
    key,closedAt:new Date().toISOString(),hadCheckin,hadTraining,hadPlanTraining,
    plannedType:planned?.type||null,plannedName:planned?.name||null,
    completion,verificationStatus:verified?.status||null,
    dataConfidence:verified?.dataConfidence||null
  };
}
function closeElapsedDays(prevKey,newKey){
  const lc=ensureLifecycle();
  let cursor=prevKey;
  let guard=0;
  while(cursor && cursor!==newKey && guard<31){
    lc.closedDays[cursor]=lc.closedDays[cursor]||summarizeDayClose(cursor);
    if(lc.closedDays[cursor].completion==="missed" && !lc.missedDays.includes(cursor)) lc.missedDays.push(cursor);
    if(lc.closedDays[cursor].completion==="unverified" && !lc.unverifiedDays.includes(cursor)) lc.unverifiedDays.push(cursor);
    lc.lastClosedDay=cursor;
    cursor=addDaysKey(cursor,1); guard++;
  }
}
function currentWeekMondayKey(baseKey=athleteDayKey()){
  const d=new Date(baseKey+"T12:00:00");
  const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day);
  return localDateKey(d);
}
function futureDateKeys(days=14,baseKey=athleteDayKey()){
  return Array.from({length:days},(_,i)=>addDaysKey(baseKey,i));
}
function estimateFutureReadiness(key,index){
  const daily=(db.daily||{})[key]||{};
  const actual=readiness(daily);
  if(actual!=null) return actual;
  const today=(db.daily||{})[athleteDayKey()]||{};
  const base=readiness(today) ?? 76;
  let value=base-Math.min(10,index*2);
  const previous=(db.futurePlans||{})[addDaysKey(key,-1)];
  if(previous?.type==="recovery") value+=5;
  if(previous?.type==="legs") value-=4;
  return clamp(Math.round(value),45,95);
}
function shiftDataForKey(key){
  const daily=(db.daily||{})[key]||{}, dated=(db.scheduleByDate||{})[key]||{};
  let indexed={}; const wk=weekKeysFor(key),i=wk.indexOf(key); if(i>=0) indexed=(db.week||{})[i]||{};
  return {status:daily.workStatus||dated.status||dated.workStatus||indexed.status||indexed.workStatus||"work",shift:daily.shift||dated.shift||dated.shiftType||indexed.shift||indexed.shiftType||"morning"};
}
function scoreFutureDay(key,type,index){
  const sh=shiftDataForKey(key);
  const r=estimateFutureReadiness(key,index);
  let s=50+(r-70)*0.5;
  if(sh.status!=="work") s+=16;
  if(sh.shift==="evening"||sh.shift==="mid") s+=7;
  if(type==="legs"&&r<70) s-=10;
  return s;
}
function buildFuturePlan(days=14){
  ensureLifecycle();
  db.futurePlans=db.futurePlans||{};
  const keys=futureDateKeys(days);
  const existingCompleted=new Set();
  Object.entries(db.lifecycle.closedDays||{}).forEach(([k,v])=>{if(v.completion==="completed") existingCompleted.add(k)});

  // Base repeating hybrid structure, then optimize per 7-day window.
  const weeklySessions=[
    {type:"pull",name:"Pull + Front Lever"},
    {type:"push",name:"Push + Planche"},
    {type:"legs",name:"Legs + Hybrid"},
    {type:"run",name:"Easy / Long Run"},
    {type:"run",name:"Easy / Aerobic Run"}
  ];

  for(let w=0;w<Math.ceil(days/7);w++){
    const windowKeys=keys.slice(w*7,w*7+7);
    const assigned=new Set();
    weeklySessions.forEach(sess=>{
      let candidates=windowKeys.map((k,i)=>({k,i,score:scoreFutureDay(k,sess.type,w*7+i)}))
        .filter(x=>!assigned.has(x.k)&&!existingCompleted.has(x.k));
      candidates.sort((a,b)=>b.score-a.score);
      const c=candidates[0]; if(!c) return;
      const sh=shiftDataForKey(c.k);
      db.futurePlans[c.k]={
        key:c.k,type:sess.type,name:sess.name,
        window:recommendedWindow(sh.shift,sh.status),status:sh.status,shift:sh.shift,
        predictedReadiness:estimateFutureReadiness(c.k,w*7+c.i),
        state:c.k===athleteDayKey()?"today":"forecast",
        generatedAt:new Date().toISOString()
      };
      assigned.add(c.k);
    });
    windowKeys.forEach((k,i)=>{
      if(!assigned.has(k)){
        const sh=shiftDataForKey(k);
        db.futurePlans[k]={
          key:k,type:"recovery",name:"Recovery / Rest",
          window:recommendedWindow(sh.shift,sh.status),status:sh.status,shift:sh.shift,
          predictedReadiness:estimateFutureReadiness(k,w*7+i),
          state:k===athleteDayKey()?"today":"forecast",generatedAt:new Date().toISOString()
        };
      }
    });
  }
  db.lifecycle.futurePlanGeneratedAt=new Date().toISOString();
  save();
  return db.futurePlans;
}
function lifecycleTick(force=false){
  const lc=ensureLifecycle();
  const current=athleteDayKey();
  if(!lc.activeDay){ lc.activeDay=current; }
  else if(lc.activeDay!==current){
    closeElapsedDays(lc.activeDay,current);
    lc.activeDay=current;
    buildFuturePlan(14);
  } else if(force || !db.futurePlans || !db.futurePlans[current]){
    buildFuturePlan(14);
  }
  lc.lastSeenAt=new Date().toISOString();
  save();
  return lc;
}
function getPlanForKey(key){
  lifecycleTick(false);
 if(!Object.keys(db.futurePlans||{}).some(k=>k>=todayKey())) buildFuturePlanV5(14,"startup");
  return (db.futurePlans||{})[key] || null;
}
function getTomorrowPlan(){ return getPlanForKey(addDaysKey(athleteDayKey(),1)); }
function renderLifecycleStatus(){
  if(!q("activeAthleteDay")) return;
  const lc=lifecycleTick(false), tomorrow=getTomorrowPlan();
  q("activeAthleteDay").textContent=lc.activeDay||"--";
  q("lastClosedDay").textContent=lc.lastClosedDay||"Henüz yok";
  q("todayTomorrowSession").textContent=tomorrow?.name||"--";
  q("futurePlanState").textContent=(db.futurePlans&&Object.keys(db.futurePlans).length)?"14 gün hazır":"Oluşturuluyor";
  if(q("athleteDayBadge")) q("athleteDayBadge").textContent=`Sınır ${String(Number(db.settings.dayBoundaryHour??ATHLETE_DAY_BOUNDARY_HOUR_DEFAULT)).padStart(2,"0")}:00`;
}
function renderTomorrowCoach(){
  if(!q("tomorrowWorkoutPlan")) return;
  const p=getTomorrowPlan();
  if(!p){ q("tomorrowWorkoutPlan").innerHTML="Plan bulunamadı."; return; }
  const t=templateForType(p.type);
  q("tomorrowStatusBadge").textContent=p.name;
  q("tomorrowWorkoutSummary").innerHTML=[
    ["Tarih",p.key],
    ["Tahmini readiness",`≈ ${p.predictedReadiness}/100`],
    ["Önerilen saat",p.window],
    ["Vardiya",p.status==="work"?shiftLabel(p.shift):"İzin / Serbest"]
  ].map(x=>`<div class="mini-box"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
  q("tomorrowWorkoutPlan").innerHTML=t.items.map((x,idx)=>{
    const rest=restIntervalPrescription(x[0],p.predictedReadiness);
    return `<div class="today-plan-row"><strong>${idx+1}. ${x[0]}</strong><span>${x[1]}</span><span>${x[2]}</span><span class="rest-plan-label">Dinlenme ${fmtRestSec(rest.target)} · ${fmtRestSec(rest.min)}–${fmtRestSec(rest.max)}</span><span class="tag">${p.type}</span></div>`;
  }).join("");
  q("tomorrowWorkoutReason").textContent=`Bu, mevcut vardiya planın, bugünkü/son readiness verin, haftalık 3 strength/calisthenics + 2 koşu hedefi ve recovery dağılımına göre yarın için oluşturulan nihai plandır. Yarın sabah check-in geldiğinde readiness beklenenden farklıysa sistem planı tekrar optimize eder.`;
}
function refreshLifeOS(force=false){
  lifecycleTick(force);
  safeRender(renderLifecycleStatus);
  safeRender(renderTomorrowCoach);
  safeRender(renderCoachWeek);
  safeRender(renderWeeklyTrainingPlan);
  safeRender(renderTodayTrainingPlan);
}

function parseTimeToMinutes(t){
  if(!t || !String(t).includes(":")) return null;
  const [h,m]=String(t).split(":").map(Number);
  if(!Number.isFinite(h)||!Number.isFinite(m)) return null;
  return h*60+m;
}
function shiftLabel(shift){
  return shift==="evening"?"14:00–22:00":shift==="mid"?"12:00–20:00":shift==="morning"?"10:00–18:00":"İzin / Serbest";
}
function recommendedWindow(shift,status){
  if(status!=="work") return "11:00–13:00";
  if(shift==="evening") return "10:00–11:30";
  if(shift==="mid") return "09:30–10:45";
  return "19:15–20:30";
}
function weekDatesFromToday(){
  const now=new Date();
  const day=(now.getDay()+6)%7; // Monday=0
  const mon=new Date(now); mon.setDate(now.getDate()-day);
  return Array.from({length:7},(_,i)=>{
    const d=new Date(mon); d.setDate(mon.getDate()+i); return d;
  });
}
function dateKeyObj(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), da=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}
function dayNameTr(d){
  return ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"][d.getDay()];
}
function weekPlanInputs(){
  return weekDatesFromToday().map((d,i)=>{
    const k=dateKeyObj(d), daily=db.daily[k]||{};
    const savedWeek=(db.week||[]).find?.(x=>x.date===k) || {};
    return {
      date:d,key:k,
      status: daily.workStatus || savedWeek.status || savedWeek.workStatus || (d.getDay()===1?"off":"work"),
      shift: daily.shift || savedWeek.shift || savedWeek.shiftType || (d.getDay()===1?"off":"morning"),
      readiness: readiness(daily),
      sleepHours: Number(daily.sleepHours||daily.sleepDuration||0),
      joint:Number(daily.joint||5),
      soreness:Number(daily.soreness||1)
    };
  });
}
function scoreDayForSession(day,type){
  let s=50;
  if(day.status!=="work") s+=18;
  if(day.shift==="evening" || day.shift==="mid") s+=8;
  if(day.shift==="morning") s+=2;
  if(day.readiness!=null) s += (day.readiness-70)*0.45;
  if(day.joint<=2) s-=25;
  if(day.soreness>=5) s-=20;

  if(type==="run"){
    if(day.status!=="work") s+=6;
    if(day.readiness!=null && day.readiness<62) s-=12;
  }
  if(type==="legs" && day.readiness!=null && day.readiness<70) s-=12;
  return s;
}
function buildAdaptiveWeekPlan(){
  const days=weekPlanInputs();
  const result=days.map(d=>({...d,type:"recovery",name:"Recovery / Rest"}));

  // Maintain user's hybrid weekly targets: 3 resistance/calisthenics + 2 runs.
  const sessions=[
    {type:"pull",name:"Pull + Front Lever"},
    {type:"push",name:"Push + Planche"},
    {type:"legs",name:"Legs + Hybrid"},
    {type:"run",name:"Easy / Long Run"},
    {type:"run",name:"Easy / Aerobic Run"}
  ];

  const used=new Set();
  let lastStrengthIndex=-10;
  let runCount=0;

  sessions.forEach(sess=>{
    let candidates=result.map((d,i)=>({i,d,score:scoreDayForSession(d,sess.type)}))
      .filter(x=>!used.has(x.i));

    // Spacing logic
    candidates=candidates.map(x=>{
      let sc=x.score;
      if(["pull","push","legs"].includes(sess.type) && Math.abs(x.i-lastStrengthIndex)<1) sc-=8;
      if(sess.type==="run"){
        // avoid directly after legs when possible
        const prev=result[x.i-1];
        if(prev?.type==="legs") sc-=10;
        if(runCount===1 && x.i<3) sc-=4;
      }
      return {...x,score:sc};
    }).sort((a,b)=>b.score-a.score);

    const chosen=candidates[0];
    if(chosen){
      result[chosen.i].type=sess.type;
      result[chosen.i].name=sess.name;
      result[chosen.i].window=recommendedWindow(result[chosen.i].shift,result[chosen.i].status);
      used.add(chosen.i);
      if(["pull","push","legs"].includes(sess.type)) lastStrengthIndex=chosen.i;
      if(sess.type==="run") runCount++;
    }
  });

  result.forEach(d=>{
    d.window=d.window||recommendedWindow(d.shift,d.status);
    d.readinessLabel=d.readiness==null?"Check-in bekleniyor":`${d.readiness}/100`;
  });

  db.generatedWeekPlan=result.map(x=>({
    key:x.key,type:x.type,name:x.name,window:x.window,status:x.status,shift:x.shift,readiness:x.readiness
  }));
  save();
  return result;
}
function getGeneratedWeekPlan(){
  lifecycleTick(false);
  const keys=weekDatesFromToday().map(dateKeyObj);
  const hasFuture=keys.every(k=>(db.futurePlans||{})[k]);
  if(hasFuture){
    return keys.map(k=>{
      const x=db.futurePlans[k], d=new Date(k+"T12:00:00");
      return {...x,date:d,readiness:x.predictedReadiness,readinessLabel:(db.daily[k]&&readiness(db.daily[k])!=null)?`${readiness(db.daily[k])}/100`:`≈ ${x.predictedReadiness}/100`};
    });
  }
  if(!Array.isArray(db.generatedWeekPlan) || db.generatedWeekPlan.length!==7 || !db.generatedWeekPlan.every(x=>keys.includes(x.key))){
    return buildAdaptiveWeekPlan();
  }
  return db.generatedWeekPlan.map(x=>{
    const d=new Date(x.key+"T12:00:00");
    return {...x,date:d,readinessLabel:x.readiness==null?"Check-in bekleniyor":`${x.readiness}/100`};
  });
}
function templateForType(type){
  return HYBRID_TEMPLATES[type]||HYBRID_TEMPLATES.recovery;
}

const REST_INTERVAL_PRESETS={
  "Muscle-Up":{target:180,min:150,max:300,kind:"power/skill"},
  "Full Planche":{target:180,min:150,max:240,kind:"advanced static skill"},
  "Front Lever":{target:180,min:150,max:240,kind:"advanced static skill"},
  "Back Lever":{target:150,min:120,max:210,kind:"static skill"},
  "Front Lever Pull / Raise":{target:150,min:120,max:240,kind:"strength skill"},
  "Planche Push-Up / Lean":{target:150,min:120,max:240,kind:"legacy strength skill"},
  "Planche Push-Up":{target:150,min:120,max:240,kind:"strength skill"},
  "Planche Lean":{target:150,min:120,max:240,kind:"static strength skill"},
  "Weighted Pull-Up":{target:180,min:150,max:300,kind:"heavy strength"},
  "Weighted Ring Dip":{target:180,min:150,max:300,kind:"heavy strength"},
  "OHP":{target:180,min:150,max:300,kind:"heavy strength"},
  "Bulgarian Split Squat":{target:150,min:120,max:240,kind:"compound strength"},
  "RDL":{target:180,min:150,max:300,kind:"heavy compound"},
  "Backpack/Goblet Squat":{target:120,min:90,max:180,kind:"hypertrophy compound"},
  "Single-Leg RDL":{target:120,min:90,max:180,kind:"hypertrophy compound"},
  "Ring Row":{target:120,min:90,max:180,kind:"hypertrophy compound"},
  "Ring Push-Up":{target:120,min:90,max:180,kind:"hypertrophy compound"},
  "DB Lateral Raise":{target:75,min:60,max:120,kind:"accessory"},
  "EZ-Bar Curl":{target:90,min:60,max:120,kind:"accessory"},
  "DB Hammer Curl":{target:75,min:60,max:120,kind:"accessory"},
  "Triceps Extension":{target:75,min:60,max:120,kind:"accessory"},
  "Calf Raise":{target:75,min:60,max:120,kind:"accessory"},
  "Dragon Flag":{target:120,min:90,max:180,kind:"core strength"}
};
function restIntervalPrescription(name,readinessScore=null){
  const preset=REST_INTERVAL_PRESETS[name];
  if(preset)return {...preset};
  const sci=EXERCISE_SCIENCE[name]||{};
  let target=90,min=60,max=150,kind="general";
  if((sci.skill||0)>=8 || (sci.power||0)>=8){target=180;min=150;max=300;kind="skill/power"}
  else if((sci.strength||0)>=9){target=180;min=150;max=300;kind="heavy strength"}
  else if((sci.hypertrophy||0)>=8 && (sci.fatigue||0)>=7){target=120;min=90;max=180;kind="compound hypertrophy"}
  else if((sci.hypertrophy||0)>=8){target=90;min=60;max=150;kind="hypertrophy"}
  if(readinessScore!=null && readinessScore<70 && target>=120){target+=30;max+=30}
  return {target,min,max,kind};
}
function fmtRestSec(sec){
  sec=Math.max(0,Math.round(+sec||0));
  if(!sec)return "—";
  const m=Math.floor(sec/60),s=sec%60;
  return m?`${m}:${String(s).padStart(2,"0")} dk`:`${s} sn`;
}

function renderWeeklyTrainingPlan(){
  const el=q("weeklyTrainingPlan"); if(!el) return;
  const plan=getGeneratedWeekPlan(), today=todayKey();
  el.innerHTML=plan.map(d=>{
    const cls=d.key===today?"plan-day today":"plan-day";
    const statusClass=d.type==="recovery"?"rest":(d.readiness!=null && d.readiness<65?"warn":"good");
    return `<div class="${cls}">
      <div class="date">${dayNameTr(d.date)} • ${d.key.slice(5)}</div>
      <h4>${d.name}</h4>
      <div class="shift">${d.status==="work"?"Vardiya "+shiftLabel(d.shift):"İzin / serbest gün"}</div>
      <div class="time">Önerilen saat: ${d.window}</div>
      <div class="status ${statusClass}">${d.readinessLabel}</div>
    </div>`;
  }).join("");
}
function currentTodayPlan(){
  const plan=getGeneratedWeekPlan();
  return plan.find(x=>x.key===todayKey()) || plan[0];
}
function renderTodayTrainingPlan(){
  const el=q("todayTrainingPlan"); if(!el) return;
  const p=currentTodayPlan(), t=templateForType(p.type);
  q("todayPlanBadge").textContent=p.name;
  el.innerHTML=t.items.map((x,idx)=>{
    const sci=EXERCISE_SCI[x[0]]||{};
    const tag=sci.discipline|| (p.type==="run"?"Running":"Training");
    const rest=restIntervalPrescription(x[0],rr);
    return `<div class="today-plan-row">
      <strong>${idx+1}. ${x[0]}</strong>
      <span>${x[1]}</span>
      <span>${x[2]}</span>
      <span class="rest-plan-label">Dinlenme ${fmtRestSec(rest.target)} · band ${fmtRestSec(rest.min)}–${fmtRestSec(rest.max)}</span>
      <span class="tag">${tag}</span>
    </div>`;
  }).join("");

  const input=(db.daily[todayKey()]||{});
  const rr=readiness(input);
  let reason=`${p.status==="work" ? "Bugünkü vardiya "+shiftLabel(p.shift) : "Bugün izin/serbest gün"}. Önerilen pencere ${p.window}. `;
  if(rr==null) reason+="Sabah check-in henüz yok; plan haftalık vardiya dağılımına göre oluşturuldu. Check-in sonrası plan yeniden optimize edilebilir.";
  else if(rr<60) reason+=`Readiness ${rr}/100 olduğu için ağır çalışma yerine recovery seçimi yapılabilir.`;
  else reason+=`Readiness ${rr}/100; plan bugün uygulanabilir görünüyor.`;
  q("todayPlanReason").textContent=reason;
}
function refreshTrainingPlanner(force=false){
  if(force || !db.generatedWeekPlan) buildAdaptiveWeekPlan();
  safeRender(renderWeeklyTrainingPlan);
  safeRender(renderTodayTrainingPlan);
}


function predictedReadinessForDay(day,index){
  const base = day.readiness!=null ? Number(day.readiness) : 76;
  let pred=base;
  if(index>0){
    // conservative forecast: small uncertainty around baseline and planned training load
    pred = Math.round(base - Math.min(8,index*1.5));
    if(day.type==="recovery") pred += 4;
    if(day.type==="run") pred -= 1;
    if(["pull","push","legs"].includes(day.type)) pred -= 2;
  }
  return clamp(pred,45,95);
}
function renderCoachWeek(){
  const el=q("coach7DayForecast"); if(!el) return;
  const plan=getGeneratedWeekPlan();
  el.innerHTML=plan.map((d,i)=>{
    const pr=forecastReadinessV5(d.key||dateKeyObj(d.date),i);
    return `<div class="forecast-day ${d.key===todayKey()?'today':''}">
      <strong>${dayNameTr(d.date)}</strong>
      <span>${d.name}</span>
      <span>${d.window}</span>
      <span>${d.key===todayKey()?(d.readinessLabel||'Bugün'):'≈ '+pr+'/100'}</span>
    </div>`;
  }).join("");

  const strength=plan.filter(x=>["pull","push","legs"].includes(x.type)).length;
  const runs=plan.filter(x=>x.type==="run").length;
  const recovery=plan.filter(x=>x.type==="recovery").length;
  q("coachWeekSummary").textContent=`Bu hafta ${strength} strength/calisthenics, ${runs} koşu ve ${recovery} recovery günü planlandı. Günlük check-in geldikçe gelecek günlerin tahmini yeniden hesaplanır.`;
  q("coachWeekTargets").innerHTML=[
    `<div class="rec-card good"><strong>Ana hedef</strong>3 kaliteli resistance/calisthenics stimulusunu tamamla.</div>`,
    `<div class="rec-card good"><strong>Koşu</strong>2 koşunun en az birini kolay/aerobik tut.</div>`,
    `<div class="rec-card good"><strong>Recovery</strong>Düşük readiness gününde hacmi korumak yerine kaliteyi koru.</div>`
  ].join("");
}
function currentProgramWeek(){
  // MVP: stored manual programWeek if available, otherwise derive from first data date
  if(Number(db.programWeek)>=1) return clamp(Number(db.programWeek),1,12);
  const dates=Object.keys(db.daily||{}).sort();
  if(!dates.length) return 1;
  const start=new Date(dates[0]+"T12:00:00"), now=new Date();
  return clamp(Math.floor((now-start)/(7*86400000))+1,1,12);
}
function phaseForWeek(w){
  if(w<=3) return {name:"Base + Hypertrophy",focus:"Kas hacmi, teknik kalite, çalışma kapasitesi"};
  if(w===4) return {name:"Deload",focus:"Hacmi %30–40 azalt, skill kalitesini koru"};
  if(w<=7) return {name:"Strength + Mass",focus:"Weighted pull/dip/OHP progresyonu + hipertrofi"};
  if(w===8) return {name:"Deload + Test",focus:"Kısa testler ve yorgunluk boşaltma"};
  if(w<=11) return {name:"Performance",focus:"Planche/FL performansı + relative strength + kas"};
  return {name:"Test / Realization",focus:"PR, ölçüm, koşu ve Character değerlendirmesi"};
}
function renderCoachMonth(){
  if(!q("monthTarget")) return;
  const w=currentProgramWeek(), p=phaseForWeek(w);
  q("monthTarget").textContent=p.name;
  q("monthStrengthDays").textContent="12";
  q("monthRunDays").textContent="8";
  q("monthDeload").textContent=([4,8,12].includes(w)?"Bu hafta":"Planlı");
  const weeks=[w,w+1,w+2,w+3].map(x=>clamp(x,1,12));
  q("coachMonthRoadmap").innerHTML=weeks.map(x=>{
    const ph=phaseForWeek(x);
    return `<div class="block-card"><strong>Hafta ${x} • ${ph.name}</strong><span>${ph.focus}</span></div>`;
  }).join("");
  q("coachMonthDecision").textContent=`Şu anda 12 haftalık sistemin ${w}. haftasındasın: ${p.name}. Önümüzdeki 4 haftada amaç, 76 kg hedefi için kontrollü kilo artışını sürdürürken planche/front lever/muscle-up seviyesini korumak ve ana strength hareketlerinde progresyon üretmek.`;
}
function renderCoachTwelve(){
  if(!q("coach12WeekRoadmap")) return;
  const phases=[
    ["1–3","Base + Hypertrophy","Hacim, teknik kalite, 76 kg hedefi için lean-gain başlangıcı"],
    ["4","Deload","Yorgunluğu azalt, hareket kalitesini koru"],
    ["5–7","Strength + Mass","Weighted Pull-Up/Dip/OHP ve alt vücut progresyonu"],
    ["8","Deload + Test","Ara test ve toparlanma"],
    ["9–11","Performance","Skill + relative strength + hipertrofi entegrasyonu"],
    ["12","Test","PR, vücut ölçümleri, koşu ve Character yeniden skorlanır"]
  ];
  q("coach12WeekRoadmap").innerHTML=phases.map(x=>`<div class="phase"><strong>Hafta ${x[0]}</strong><h4>${x[1]}</h4><span>${x[2]}</span></div>`).join("");
  q("coach12Criteria").innerHTML=[
    ["Vücut Ağırlığı","Kontrollü artış; 76 kg hedefi gerektiğinde 12 hafta sonrasına taşabilir"],
    ["Bel","Kilo artışına göre kontrollü trend"],
    ["Weighted Pull-Up","Performans/relative strength korunmalı veya artmalı"],
    ["Planche + Front Lever","Kaliteli hold süresi korunmalı veya gelişmeli"],
    ["Koşu","Aerobik kapasiteyi koru; çoğu koşu kolay karakterde"],
    ["Recovery","Deload ihtiyacı trendlerle belirlenir"]
  ].map(x=>`<div class="summary-item"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
  q("coach12Strategy").textContent="Ana strateji: sabit mikrocycle korunur (Pzt Pull, Salı Run, Çrş Push, Prş Recovery, Cuma Legs, Cts Run, Paz Recovery). Vardiya yalnızca saat penceresini değiştirir; readiness, recovery ve ağrı günlük hacim/yük/RIR dozunu ayarlar. Yalnızca sert sağlık veya ağrı kısıtı varsa seans en yakın recovery gününe kontrollü ertelenir. Skill → ana strength → hipertrofi sırası korunur.";
}
function initCoachTabs(){
  document.querySelectorAll(".coach-tab").forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll(".coach-tab").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".coach-pane").forEach(p=>p.classList.remove("active"));
      btn.classList.add("active");
      const map={today:"coachTodayPane",week:"coachWeekPane",month:"coachMonthPane",twelve:"coachTwelvePane"};
      q(map[btn.dataset.coachtab])?.classList.add("active");
    };
  });
}
function goToPage(page){
  const btn=document.querySelector(`.nav-btn[data-page="${page}"]`);
  if(btn){btn.click();window.scrollTo({top:0,behavior:"smooth"});return;}
  const sec=q(page); if(sec){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));sec.classList.add("active");}
}
function initQuickNav(){
  document.querySelectorAll(".quick-nav button").forEach(b=>b.onclick=()=>goToPage(b.dataset.goto));
  if(!document.body.dataset.quickNavDelegated){
    document.body.dataset.quickNavDelegated="1";
    document.addEventListener("click",ev=>{
      const b=ev.target.closest?.(".quick-nav button[data-goto]");
      if(b){ev.preventDefault();goToPage(b.dataset.goto)}
    });
  }
}


// =============================
// Athlete Life OS v5 Core Engine
// =============================
const V5_MUSCLES={
 chest:{label:"Göğüs",side:"front",target:10},frontDelts:{label:"Ön Omuz",side:"front",target:8},sideDelts:{label:"Yan Omuz",side:"both",target:10},rearDelts:{label:"Arka Omuz",side:"back",target:8},
 triceps:{label:"Triceps",side:"both",target:9},biceps:{label:"Biceps",side:"front",target:9},forearms:{label:"Önkol / Grip",side:"both",target:7},lats:{label:"Lat",side:"back",target:10},upperBack:{label:"Üst Sırt / Rhomboid",side:"back",target:10},traps:{label:"Trapez",side:"back",target:8},
 spinalErectors:{label:"Erector Spinae",side:"back",target:7},abs:{label:"Rectus Abdominis",side:"front",target:8},obliques:{label:"Oblique",side:"both",target:6},glutes:{label:"Glute",side:"back",target:10},quads:{label:"Quadriceps",side:"front",target:10},hamstrings:{label:"Hamstring",side:"back",target:10},adductors:{label:"Adductor",side:"front",target:6},calves:{label:"Calf",side:"back",target:8},hipFlexors:{label:"Hip Flexor",side:"front",target:5},scapular:{label:"Scapular Stabilizer",side:"back",target:7}
};
const V5_EXERCISE_MUSCLES={
 "Full Planche":{frontDelts:1,chest:.7,triceps:.65,abs:.65,scapular:.45,biceps:.25},"Planche Push-Up / Lean":{frontDelts:1,chest:.85,triceps:.75,abs:.55,scapular:.35},
 "Front Lever":{lats:1,abs:.75,upperBack:.65,biceps:.4,forearms:.35,scapular:.6},"Front Lever Pull / Raise":{lats:1,upperBack:.75,biceps:.65,abs:.6,forearms:.3},
 "Back Lever":{frontDelts:.65,chest:.55,biceps:.55,lats:.55,abs:.45,scapular:.5},"Muscle-Up":{lats:1,biceps:.75,upperBack:.6,chest:.55,triceps:.55,forearms:.55,frontDelts:.35},
 "Weighted Pull-Up":{lats:1,biceps:.75,upperBack:.65,forearms:.5,rearDelts:.3},"Pull-Up":{lats:1,biceps:.7,upperBack:.65,forearms:.45},"Chest-to-Bar":{upperBack:1,lats:.9,biceps:.7,rearDelts:.4,forearms:.4},"Ring Row":{upperBack:1,lats:.75,biceps:.65,rearDelts:.55,forearms:.25},
 "Weighted Ring Dip":{chest:1,triceps:.9,frontDelts:.7,scapular:.3},"Ring Push-Up":{chest:1,triceps:.7,frontDelts:.6,abs:.3},"Incline DB Press":{chest:1,frontDelts:.75,triceps:.65},"OHP":{frontDelts:1,sideDelts:.75,triceps:.75,traps:.35,abs:.25},"DB Lateral Raise":{sideDelts:1,traps:.2},"Triceps Extension":{triceps:1},
 "EZ-Bar Curl":{biceps:1,forearms:.35},"DB Hammer Curl":{biceps:.8,forearms:.75},
 "Bulgarian Split Squat":{quads:1,glutes:.9,adductors:.45,hamstrings:.35,abs:.25},"Squat":{quads:1,glutes:.85,adductors:.5,spinalErectors:.35,abs:.25},"Backpack/Goblet Squat":{quads:1,glutes:.75,adductors:.45,abs:.35},
 "RDL":{hamstrings:1,glutes:.85,spinalErectors:.55,forearms:.3},"Single-Leg RDL":{hamstrings:1,glutes:.9,spinalErectors:.35,obliques:.25},"Nordic Curl":{hamstrings:1,calves:.2},"Calf Raise":{calves:1},
 "Dragon Flag":{abs:1,hipFlexors:.55,lats:.3},"Hanging Leg Raise":{abs:1,hipFlexors:.7,forearms:.3},"L-Sit":{abs:1,hipFlexors:.85,triceps:.25},
 "Zone 2 Run":{quads:.35,hamstrings:.35,glutes:.35,calves:.55,hipFlexors:.25},"Tempo Run":{quads:.45,hamstrings:.45,glutes:.4,calves:.6,hipFlexors:.3},"Intervals":{quads:.55,hamstrings:.55,glutes:.55,calves:.65,hipFlexors:.35},"Hill Sprint":{glutes:.7,hamstrings:.7,quads:.55,calves:.7},
 "Walk":{calves:.15,quads:.1,glutes:.1},"Mobility":{},"Hydration + Sleep":{}
};
window.V5_EXERCISE_MUSCLES=V5_EXERCISE_MUSCLES;window.EXERCISE_SCIENCE=EXERCISE_SCIENCE;
const V5_EXTRA_EXERCISES=[
 ["Ring Push-Up","DYNAMIC"],["DB Lateral Raise","WEIGHTED"],["EZ-Bar Curl","WEIGHTED"],["DB Hammer Curl","WEIGHTED"],["Triceps Extension","WEIGHTED"],["Backpack/Goblet Squat","WEIGHTED"],["Single-Leg RDL","WEIGHTED"],["Calf Raise","WEIGHTED"],["Nordic Curl","DYNAMIC"],["L-Sit","STATIC"],["Zone 2 Run","RUN"],["Tempo Run","RUN"],["Intervals","RUN"],["Hill Sprint","RUN"],["Walk","RUN"],["Mobility","MOBILITY"]
];
V5_EXTRA_EXERCISES.forEach(([n,type])=>{if(!EXERCISES.some(x=>x.n===n))EXERCISES.push({n,type})});

const V5_LIBRARY_EXTRA=[
 ["Handstand","STATIC"],["Handstand Push-Up","DYNAMIC"],["Pike Push-Up","DYNAMIC"],["Push-Up","DYNAMIC"],["Ring Dip","DYNAMIC"],["Chin-Up","DYNAMIC"],["One-Arm Pull-Up","DYNAMIC"],["Archer Pull-Up","DYNAMIC"],["Tuck Planche","STATIC"],["Straddle Planche","STATIC"],["Tuck Front Lever","STATIC"],["Straddle Front Lever","STATIC"],["Human Flag","STATIC"],["Pistol Squat","DYNAMIC"],
 ["Walking Lunge","WEIGHTED"],["Step-Up","WEIGHTED"],["Hip Thrust","WEIGHTED"],["Glute Bridge","WEIGHTED"],["Deadlift","BARBELL"],["Bench Press","BARBELL"],["Incline Bench Press","BARBELL"],["Barbell Row","BARBELL"],["Lat Pulldown","WEIGHTED"],["Seated Cable Row","WEIGHTED"],["Face Pull","WEIGHTED"],["Rear Delt Fly","WEIGHTED"],["Biceps Curl","WEIGHTED"],["Skull Crusher","WEIGHTED"],["Leg Press","WEIGHTED"],["Leg Extension","WEIGHTED"],["Leg Curl","WEIGHTED"],["Hip Abduction","WEIGHTED"],["Hip Adduction","WEIGHTED"],["Seated Calf Raise","WEIGHTED"],
 ["Plank","STATIC"],["Side Plank","STATIC"],["Ab Wheel","DYNAMIC"],["Farmer Carry","WEIGHTED"],["Push Press","BARBELL"],["Power Clean","BARBELL"],["Box Jump","DYNAMIC"],["Broad Jump","DYNAMIC"],["Sprint","RUN"],["Long Run","RUN"],["Threshold Run","RUN"],["VO2 Intervals","RUN"]
];
Object.assign(V5_EXERCISE_MUSCLES,{
 "Handstand":{frontDelts:.7,sideDelts:.55,triceps:.45,traps:.45,abs:.4},"Handstand Push-Up":{frontDelts:1,sideDelts:.75,triceps:.8,traps:.4},"Pike Push-Up":{frontDelts:1,triceps:.7,chest:.4},"Push-Up":{chest:1,triceps:.7,frontDelts:.55,abs:.25},"Ring Dip":{chest:1,triceps:.85,frontDelts:.65},"Chin-Up":{lats:1,biceps:.9,upperBack:.55,forearms:.45},"One-Arm Pull-Up":{lats:1,biceps:1,forearms:.7,upperBack:.6,obliques:.3},"Archer Pull-Up":{lats:1,biceps:.8,upperBack:.65,forearms:.45},"Tuck Planche":{frontDelts:1,chest:.6,triceps:.6,abs:.6},"Straddle Planche":{frontDelts:1,chest:.7,triceps:.65,abs:.7},"Tuck Front Lever":{lats:1,upperBack:.6,abs:.6,biceps:.35},"Straddle Front Lever":{lats:1,upperBack:.7,abs:.7,biceps:.4},"Human Flag":{obliques:1,lats:.7,sideDelts:.65,abs:.65,forearms:.35},"Pistol Squat":{quads:1,glutes:.8,adductors:.4,calves:.25},
 "Walking Lunge":{quads:1,glutes:.9,hamstrings:.35,adductors:.4},"Step-Up":{quads:.9,glutes:1,hamstrings:.3},"Hip Thrust":{glutes:1,hamstrings:.45,quads:.25},"Glute Bridge":{glutes:1,hamstrings:.4},"Deadlift":{glutes:1,hamstrings:.9,spinalErectors:.8,upperBack:.45,forearms:.55},"Bench Press":{chest:1,triceps:.75,frontDelts:.65},"Incline Bench Press":{chest:1,frontDelts:.8,triceps:.65},"Barbell Row":{upperBack:1,lats:.85,biceps:.65,rearDelts:.5,forearms:.45},"Lat Pulldown":{lats:1,biceps:.65,upperBack:.5},"Seated Cable Row":{upperBack:1,lats:.8,biceps:.6,rearDelts:.45},"Face Pull":{rearDelts:1,upperBack:.75,traps:.45},"Rear Delt Fly":{rearDelts:1,upperBack:.45},"Biceps Curl":{biceps:1,forearms:.3},"Skull Crusher":{triceps:1},"Leg Press":{quads:1,glutes:.65,adductors:.35},"Leg Extension":{quads:1},"Leg Curl":{hamstrings:1,calves:.15},"Hip Abduction":{glutes:1},"Hip Adduction":{adductors:1},"Seated Calf Raise":{calves:1},
 "Plank":{abs:1,obliques:.45,glutes:.2},"Side Plank":{obliques:1,abs:.55,sideDelts:.25},"Ab Wheel":{abs:1,lats:.35,frontDelts:.25},"Farmer Carry":{forearms:1,traps:.8,obliques:.55,spinalErectors:.4},"Push Press":{frontDelts:1,triceps:.7,quads:.35,glutes:.35,traps:.4},"Power Clean":{glutes:1,hamstrings:.8,quads:.7,traps:.8,spinalErectors:.55,forearms:.45},"Box Jump":{quads:.75,glutes:1,hamstrings:.6,calves:.55},"Broad Jump":{glutes:1,hamstrings:.8,quads:.65,calves:.45},"Sprint":{glutes:1,hamstrings:1,quads:.75,calves:.75,hipFlexors:.5},"Long Run":{quads:.35,hamstrings:.35,glutes:.35,calves:.55},"Threshold Run":{quads:.5,hamstrings:.5,glutes:.45,calves:.6},"VO2 Intervals":{quads:.6,hamstrings:.6,glutes:.55,calves:.65}
});
V5_LIBRARY_EXTRA.forEach(([n,type])=>{if(!EXERCISES.some(x=>x.n===n))EXERCISES.push({n,type})});

// v7.2: Movement Intelligence Library is the canonical metadata layer.
// Curated entries override generic muscle/effect metadata; legacy exercises remain supported.
Object.values(window.EXERCISE_KNOWLEDGE||{}).forEach(k=>{
 if(!EXERCISES.some(x=>x.n===k.name))EXERCISES.push({n:k.name,type:k.type||"DYNAMIC"});
 if(k.muscles)V5_EXERCISE_MUSCLES[k.name]={...k.muscles};
 const q=k.qualities||{};
 EXERCISE_SCIENCE[k.name]={
   ...(EXERCISE_SCIENCE[k.name]||{}),
   discipline:(k.equipment||[]).includes("Rings")?"Gymnastics Rings":(EXERCISE_SCIENCE[k.name]?.discipline||"Calisthenics"),
   pattern:k.pattern||EXERCISE_SCIENCE[k.name]?.pattern||"",
   primary:Object.entries(k.muscles||{}).sort((a,b)=>b[1]-a[1])[0]?.[0]||"",
   secondary:Object.entries(k.muscles||{}).sort((a,b)=>b[1]-a[1])[1]?.[0]||"",
   skill:q.skill||0,strength:q.strength||0,hypertrophy:q.hypertrophy||0,endurance:q.endurance||0,
   power:q.power||0,speed:q.power?Math.max(1,q.power-2):1,fatigue:Math.round(((q.strength||0)+(q.stability||0)+(q.core||0))/3),
   equipment:k.equipment||[]
 };
});

function v5DateKey(d=new Date()){return localDateKey(d)}
function daysBetween(a,b){return Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000)}
function weekKeysFor(baseKey=todayKey()){
 const d=new Date(baseKey+"T12:00:00"), shift=(d.getDay()+6)%7; d.setDate(d.getDate()-shift);
 return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return localDateKey(x)});
}
function painLogRowsActiveAt(k){
 const core=window.PainIntelligenceCore,rows=[];
 Object.entries(db.painLogs||{}).forEach(([date,arr])=>(Array.isArray(arr)?arr:[]).forEach(r=>{
   const active=core?core.activeAtDate(r,k):((r.status!=="resolved")&&date<=k);
   if(active)rows.push({...r,_logDate:date});
 }));
 return rows;
}
function painForDate(k){
 const d=db.daily[k]||{};
 const out={shoulder:+d.painShoulder||0,elbow:+d.painElbow||0,wrist:+d.painWrist||0,back:+d.painBack||0,hip:+d.painHip||0,knee:+d.painKnee||0,ankle:+d.painAnkle||0};
 painLogRowsActiveAt(k).forEach(r=>{
   const j=r.joint==="lowBack"||r.joint==="upperBack"?"back":r.joint==="hand"?"wrist":r.joint==="foot"?"ankle":r.joint==="neck"?"shoulder":r.joint;
   if(j in out)out[j]=Math.max(out[j],+r.severity||0);
 });
 return out;
}
function maxPain(k=todayKey()){return Math.max(...Object.values(painForDate(k)),0)}
function painConflicts(type,k=todayKey()){
 const p=painForDate(k), out=[];
 if((type==="push"||type==="pull")&&p.shoulder>=5)out.push("omuz");
 if((type==="push"||type==="pull")&&p.elbow>=5)out.push("dirsek");
 if(type==="push"&&p.wrist>=5)out.push("el bileği");
 if(type==="legs"&&(p.knee>=5||p.hip>=5||p.back>=5))out.push(p.knee>=5?"diz":p.hip>=5?"kalça":"bel");
 if(type==="run"&&(p.knee>=5||p.ankle>=5||p.hip>=5))out.push(p.knee>=5?"diz":p.ankle>=5?"ayak bileği":"kalça");
 return [...new Set(out)];
}
function readinessTrend(days=7){const vals=lastNDates(days).map(k=>readiness(db.daily[k])).filter(v=>v!=null);return vals.length?Math.round(avg(vals)):76}
function bodyweightNow(){
 const daily=lastNDates(30).map(k=>+db.daily[k]?.weight||0).filter(Boolean); if(daily.length)return daily[daily.length-1];
 const arr=(db.bodyMeasurements||[]).filter(x=>x.weight).sort((a,b)=>a.date.localeCompare(b.date)); return arr.length?+arr[arr.length-1].weight:72;
}
function bodyweightWeeklyRate(){
 const vals=lastNDates(21).map(k=>({k,v:+db.daily[k]?.weight||0})).filter(x=>x.v);
 if(vals.length<4)return null; const span=Math.max(1,daysBetween(vals[0].k,vals.at(-1).k)); return (vals.at(-1).v-vals[0].v)/span*7;
}
function nutritionGoalAdvice(){
 const rate=bodyweightWeeklyRate(), bw=bodyweightNow(), target=+db.settings.targetWeight||76;
 if(rate==null)return {status:"collect",text:`${target} kg hedefi için en az 4 kilo kaydıyla 3 haftalık trend oluştur.`};
 if(bw>=target)return {status:"good",text:`Hedef kiloya ulaştın (${bw.toFixed(1)} kg). Artık performans ve bel trendine göre kalori ayarla.`};
 if(rate<.10)return {status:"warn",text:`Kilo trendi ${rate.toFixed(2)} kg/hafta. Lean-gain için enerji alımını yaklaşık +100–150 kcal/gün artırmayı değerlendir.`};
 if(rate>.35)return {status:"warn",text:`Kilo trendi +${rate.toFixed(2)} kg/hafta. Bel de hızlı artıyorsa kaloriyi yaklaşık 100–150 kcal azalt.`};
 return {status:"good",text:`Kilo trendi +${rate.toFixed(2)} kg/hafta; kontrollü artış bandında.`};
}
function sessionTypeFromLogs(k){
 const names=(db.trainingLogs[k]||[]).filter(planContributingRow).map(x=>x.name);
 if(names.some(n=>["Bulgarian Split Squat","RDL","Squat","Backpack/Goblet Squat"].includes(n)))return "legs";
 if(names.some(n=>["Full Planche","Weighted Ring Dip","OHP","Ring Push-Up"].includes(n)))return "push";
 if(names.some(n=>["Front Lever","Weighted Pull-Up","Muscle-Up","Ring Row"].includes(n)))return "pull";
 const d=db.daily[k]||{}; if(+d.runKm>0)return "run";
 return names.length?"strength":null;
}
function completedSessionType(k){return db.sessionFeedback[k]?.type||sessionTypeFromLogs(k)}
function effectiveSetFactor(r){
 const rir=Number(r.rir),base=!Number.isFinite(rir)?.85:rir<=1?1:rir===2?.9:rir===3?.75:.6;
 const confidence=r?.dataConfidence==="medium"?.65:r?.dataConfidence==="low"?.40:1;
 return base*confidence;
}
function muscleSetsForRow(r){
 const map=V5_EXERCISE_MUSCLES[r.name]||{};
 const fallback=(r.sets||[]).filter(x=>+x>0).length*effectiveSetFactor(r);
 const dose=typeof window.exerciseDoseUnits==="function"?window.exerciseDoseUnits(r):fallback;
 const out={};Object.entries(map).forEach(([m,c])=>out[m]=dose*c);return out;
}
function muscleStimulus(days=7,endKey=todayKey()){
 const keys=Array.from({length:days},(_,i)=>addDaysKey(endKey,-(days-1-i))), totals={}; Object.keys(V5_MUSCLES).forEach(k=>totals[k]=0);
 keys.forEach(k=>(db.trainingLogs[k]||[]).forEach(r=>Object.entries(muscleSetsForRow(r)).forEach(([m,v])=>totals[m]=(totals[m]||0)+v)));
 // running entered via check-in also contributes if not logged as explicit run exercise
 keys.forEach(k=>{const d=db.daily[k]||{};if(+d.runKm>0 && !(db.trainingLogs[k]||[]).some(r=>String(r.type).includes("RUN"))){const dose=clamp(+d.runKm/6,.5,1.5);Object.entries(V5_EXERCISE_MUSCLES["Zone 2 Run"]).forEach(([m,c])=>totals[m]+=c*dose*3)}});
 return totals;
}
function recoveryReferenceTime(k=todayKey()){
 if(k===todayKey())return new Date();
 return new Date(k+"T23:59:59");
}
function trainingRowTime(key,row){
 const raw=row?.performedAt||row?.recordedAt||row?.completedAt||db.sessionFeedback?.[key]?.completedAt;
 const t=raw?new Date(raw):new Date(key+"T18:00:00");
 return Number.isNaN(+t)?new Date(key+"T18:00:00"):t;
}
function rowRecoveryHalfLifeHours(row){
 const rir=Number(row?.rir),nearFailure=Number.isFinite(rir)?clamp((3-rir)/3,0,1):.45;
 const impact=window.AthleteLoadMesh?.movementImpact?.(row,{})||window.PhysiologicalImpactEngine?.movementImpact?.(row,{})||{};
 const cost=+impact?.loads?.recoveryCost||50,mechanical=+impact?.loads?.mechanicalDemand||50,neural=+impact?.loads?.neuralDemand||50;
 // Engineering estimate, not a biological assay: typical resistance-session recovery often spans ~24–72 h,
 // with failure/high mechanical-neural demand toward the slower end.
 return clamp(22 + cost*.16 + mechanical*.07 + neural*.05 + nearFailure*9,24,60);
}
function recoveryEnvironmentBetween(startKey,endKey){
 let vals=[],cursor=startKey,guard=0;
 while(cursor<=endKey&&guard<8){const e=window.SportsSciencePolicy?.recoveryEnvironment?.(cursor);if(e?.score)vals.push(e.score);cursor=addDaysKey(cursor,1);guard++;}
 return vals.length?clamp(avg(vals),.50,1.05):.78;
}
function muscleRecoveryLedger(k=todayKey()){
 const out={}; Object.keys(V5_MUSCLES).forEach(m=>out[m]=0);
 const ref=recoveryReferenceTime(k),startKey=addDaysKey(k,-7);
 for(let back=0;back<8;back++){
  const key=addDaysKey(k,-back);if(key<startKey)continue;
  (db.trainingLogs[key]||[]).forEach(r=>{
   const at=trainingRowTime(key,r),hours=Math.max(0,(ref-at)/3600000);if(hours<0)return;
   const env=recoveryEnvironmentBetween(key,k),halfLife=rowRecoveryHalfLifeHours(r),effectiveHalfLife=halfLife/clamp(.82+env*.23,.92,1.06);
   const retention=Math.pow(.5,hours/Math.max(12,effectiveHalfLife));
   Object.entries(muscleSetsForRow(r)).forEach(([m,v])=>out[m]+=v*retention);
  });
 }
 return out;
}
function muscleRecoveryDetail(m,k=todayKey()){
 const ref=recoveryReferenceTime(k),entries=[];
 for(let back=0;back<8;back++){
  const key=addDaysKey(k,-back);(db.trainingLogs[key]||[]).forEach(r=>{
   const dose=muscleSetsForRow(r)[m]||0;if(!dose)return;
   const at=trainingRowTime(key,r),hours=Math.max(0,(ref-at)/3600000),env=recoveryEnvironmentBetween(key,k),halfLife=rowRecoveryHalfLifeHours(r),effectiveHalfLife=halfLife/clamp(.82+env*.23,.92,1.06),remaining=dose*Math.pow(.5,hours/Math.max(12,effectiveHalfLife));
   entries.push({key,name:r.name,at:at.toISOString(),hours,initial:dose,remaining,halfLife:effectiveHalfLife});
  });
 }
 const load=entries.reduce((a,x)=>a+x.remaining,0),readiness=clamp(Math.round(100-load*7.5),0,100),latest=entries.sort((a,b)=>b.at.localeCompare(a.at))[0]||null;
 const targetLoad=(100-85)/7.5;let etaHours=0;
 if(load>targetLoad&&load>0){const weightedHalf=entries.length?entries.reduce((a,x)=>a+x.halfLife*x.remaining,0)/Math.max(.001,load):36;etaHours=Math.max(0,weightedHalf*Math.log2(load/targetLoad));}
 return {load,readiness,latest,etaHours,entries};
}
function sessionMuscleKeys(type){return type==="pull"?["lats","upperBack","biceps","forearms","rearDelts","scapular"]:type==="push"?["chest","frontDelts","sideDelts","triceps","scapular"]:type==="legs"?["quads","glutes","hamstrings","adductors","calves","spinalErectors"]:type==="run"?["quads","hamstrings","glutes","calves"]:[]}
function muscleRecoveryPenalty(type,k=todayKey()){
 const ledger=muscleRecoveryLedger(k), vals=sessionMuscleKeys(type).map(m=>ledger[m]||0); if(!vals.length)return 0; const peak=Math.max(...vals), mean=avg(vals); return clamp((mean-4)*2+(peak-8)*1.5,0,22);
}
function forecastReadinessV5(k,index=0){
 const actual=readiness(db.daily[k]); if(actual!=null)return actual;
 let score=readinessTrend(7)-Math.min(5,index*.5);
 const sh=shiftDataForKey(k); if(sh.status==="work"&&sh.shift==="morning")score-=2;
 const soc=db.social[k]; if(soc){const en=parseTimeToMinutes(soc.end); if(en!=null&&(en<240||en>1380))score-=5}
 score-=Math.round(maxPain(addDaysKey(k,-1))*1.2);
 return clamp(Math.round(score),45,95);
}
function scoreSessionDayV5(k,type,index){
 const sh=shiftDataForKey(k), r=forecastReadinessV5(k,index); let s=50+(r-70)*.7;
 const extra=window.AthleteLoadMesh?.systemicPenalty?.(k,type);if(extra?.penalty)s-=extra.penalty;
 if(sh.status!=="work")s+=16; else if(sh.shift==="evening")s+=8; else if(sh.shift==="mid")s+=5;
 s-=muscleRecoveryPenalty(type,k);
 const conflicts=painConflicts(type,k); s-=conflicts.length*18;
 const prev=(db.futurePlans||{})[addDaysKey(k,-1)]?.type || completedSessionType(addDaysKey(k,-1));
 if((type==="run"&&prev==="legs")||(type==="legs"&&prev==="run"))s-=12;
  if(["pull","push","legs"].includes(type)&&["pull","push","legs"].includes(prev))s-=8;
 if(type==="legs"&&r<68)s-=10;
 return s;
}
function planSignature(p){return p?`${p.type}|${p.name}|${p.window}|${p.predictedReadiness}`:""}
function savePlanVersion(k,p,reason="optimizer"){
 db.planHistory[k]=db.planHistory[k]||{versions:[]}; const h=db.planHistory[k]; const sig=planSignature(p), last=h.versions.at(-1);
 if(!last||last.signature!==sig){h.versions.push({at:new Date().toISOString(),signature:sig,reason,plan:JSON.parse(JSON.stringify(p))});h.currentVersion=h.versions.length}
 return h.currentVersion||1;
}
const ATHLETE_PROGRAM_MICROCYCLE_V92={
  1:{type:"pull",name:"Pull + Front Lever"},
  2:{type:"run",name:"Easy / Aerobic Run"},
  3:{type:"push",name:"Push + Planche"},
  4:{type:"recovery",name:"Recovery / Rest"},
  5:{type:"legs",name:"Legs + Hybrid"},
  6:{type:"run",name:"Easy / Long Run"},
  0:{type:"recovery",name:"Recovery / Rest"}
};
function programBaseSlotV92(k){
 const wd=new Date(k+"T12:00:00").getDay(),slot=ATHLETE_PROGRAM_MICROCYCLE_V92[wd]||ATHLETE_PROGRAM_MICROCYCLE_V92[0];
 return {...slot,baseDate:k,weekday:wd};
}
function hardConstraintForProgramV92(k,type){
 const d=db.daily[k]||{},actual=readiness(d),health=window.HealthStateEngine?.assess?.(d)||{action:"normal",label:"Normal"},conflicts=painConflicts(type,k),pain=maxPain(k);
 const hardHealth=["recovery","stop_hard_training"].includes(health.action);
 const lowReadiness=actual!=null&&actual<55;
 const hardPain=pain>=7||conflicts.length>=2;
 return {defer:hardHealth||lowReadiness||hardPain,actualReadiness:actual,health,conflicts,pain,
  reason:hardHealth?`Sağlık: ${health.label}`:lowReadiness?`Readiness ${actual}/100`:hardPain?`Ağrı/eklem: ${conflicts.join(", ")||pain+"/10"}`:""};
}
function programPhaseLoadV92(k){
 const pw=programWeekV5(k),phase=phaseForWeekV5(pw.week);
 if([4,8].includes(pw.week))return {volume:.65,intensity:.88,label:`${phase.name} · planlı deload`};
 if(pw.week===12)return {volume:.70,intensity:.92,label:`${phase.name} · realization`};
 if(pw.week>=9)return {volume:.85,intensity:1,label:`${phase.name} · kalite önceliği`};
 if(pw.week>=5)return {volume:.95,intensity:1,label:`${phase.name}`};
 return {volume:1,intensity:.97,label:`${phase.name}`};
}
function buildFuturePlanV5(days=14,reason="program_engine_v9.2"){
 ensureLifecycle();db.futurePlans=db.futurePlans||{};db.programEngine=db.programEngine||{version:"9.2.8",assignments:{},history:[]};
 db.programEngine.version="9.2";db.programEngine.assignments=db.programEngine.assignments||{};
 const start=todayKey(),end=addDaysKey(start,days-1),all=futureDateKeys(days,start);
 // Only unlocked today/future projections may be rebuilt. Started canonical sessions are immutable.
 all.forEach(k=>{if(!window.CanonicalSessionEngine?.isLocked?.(k))delete db.futurePlans[k]});
 const mondays=[...new Set(all.map(k=>currentWeekMondayKey(k)))];
 mondays.forEach(monday=>{
   const wk=Array.from({length:7},(_,i)=>addDaysKey(monday,i));
   const occupied=new Set();
   // Keep persisted, valid deferrals stable. This prevents daily readiness changes from shuffling the week.
   wk.forEach(base=>{
     const a=db.programEngine.assignments[base];
     if(a&&a.targetDate>=start&&a.targetDate<=end&&daysBetween(base,a.targetDate)>=0&&daysBetween(base,a.targetDate)<=3)occupied.add(a.targetDate);
     else if(a&&a.targetDate<start&&!completedSessionType(a.targetDate))delete db.programEngine.assignments[base];
   });
   wk.forEach(base=>{
     const slot=programBaseSlotV92(base);if(slot.type==="recovery"||base>end)return;
     let a=db.programEngine.assignments[base];
     if(!a)a=db.programEngine.assignments[base]={baseDate:base,targetDate:base,type:slot.type,name:slot.name,createdAt:new Date().toISOString(),reason:"Ana mikrocycle"};
     if(a.targetDate===base&&base>=start&&!window.CanonicalSessionEngine?.isLocked?.(base)){
       const hard=hardConstraintForProgramV92(base,slot.type);
       if(hard.defer){
         const candidate=wk.find(k=>k>base&&k<=end&&daysBetween(base,k)<=3&&programBaseSlotV92(k).type==="recovery"&&!occupied.has(k)&&!window.CanonicalSessionEngine?.isLocked?.(k));
         if(candidate){
           a.targetDate=candidate;a.reason=`Kontrollü erteleme · ${hard.reason}`;a.deferredAt=new Date().toISOString();a.hardConstraint=hard.reason;occupied.add(candidate);
         }
       }
     }
     occupied.add(a.targetDate);
   });
   wk.filter(k=>k>=start&&k<=end).forEach((k,i)=>{
     if(window.CanonicalSessionEngine?.isLocked?.(k))return;
     const base=programBaseSlotV92(k),incoming=Object.values(db.programEngine.assignments).find(a=>a?.targetDate===k&&a.baseDate!==k&&a.type!=="recovery");
     const own=db.programEngine.assignments[k];
     let type=base.type,name=base.name,adaptation="Ana mikrocycle",baseDate=k;
     if(incoming){type=incoming.type;name=incoming.name;baseDate=incoming.baseDate;adaptation=incoming.reason||"Kontrollü erteleme"}
     else if(own&&own.targetDate!==k){type="recovery";name="Recovery / Deferred Session";adaptation=`${own.name} → ${own.targetDate} tarihine ertelendi`}
     const sh=shiftDataForKey(k),r=forecastReadinessV5(k,i),pw=programWeekV5(k),phase=phaseForWeekV5(pw.week);
     const p={key:k,type,name,baseDate,baseType:programBaseSlotV92(baseDate).type,window:recommendedWindow(sh.shift,sh.status),status:sh.status,shift:sh.shift,predictedReadiness:r,state:k===start?"today":"forecast",
       reason:`Program Engine v9.2 · ${adaptation}. Vardiya yalnızca saat penceresini; readiness/recovery ise hacim-yük-RIR modifikasyonunu etkiler.`,generatedAt:new Date().toISOString(),programEngineVersion:"9.2",programWeek:pw.week,programCycle:pw.cycle,phase:phase.name,adaptation};
     p.version=savePlanVersion(k,p,reason);db.futurePlans[k]=p;
   });
 });
 db.programEngine.lastBuiltAt=new Date().toISOString();db.programEngine.history.push({at:db.programEngine.lastBuiltAt,reason,start,end});
 if(db.programEngine.history.length>50)db.programEngine.history=db.programEngine.history.slice(-50);
 db.lifecycle.futurePlanGeneratedAt=new Date().toISOString();save();return db.futurePlans;
}
window.AthleteProgramEngine={version:"9.2.8",microcycle:ATHLETE_PROGRAM_MICROCYCLE_V92,baseSlot:programBaseSlotV92,hardConstraint:hardConstraintForProgramV92,phaseLoad:programPhaseLoadV92,build:buildFuturePlanV5,
 explain:(k)=>{const p=planForDate(k),b=programBaseSlotV92(k);return {date:k,base:b,plan:p,assignment:db.programEngine?.assignments?.[k]||null,principle:"Program sabit; günlük veriler kontrollü doz ayarı yapar."}}};

// v5 replaces the old planner entry point
buildFuturePlan=buildFuturePlanV5;

function planForDate(k){return (db.futurePlans||{})[k]||null}
function programWeekV5(k=todayKey()){
 let start=db.settings.programStartDate; if(!start){start=k;db.settings.programStartDate=start;save()}
 const raw=Math.floor(daysBetween(start,k)/7)+1; return {week:((Math.max(1,raw)-1)%12)+1,cycle:Math.floor((Math.max(1,raw)-1)/12)+1,raw};
}
function currentProgramWeek(){return programWeekV5().week}
function phaseForWeekV5(w){return phaseForWeek(w)}
function planLoadModifier(k,type){
 const d=db.daily[k]||{},r=readiness(d)??forecastReadinessV5(k,0), pain=maxPain(k), recovery=muscleRecoveryPenalty(type,k),health=window.HealthStateEngine?.assess?.(d)||{volumeFactor:1,intensityFactor:1,action:"normal",label:"Normal"};
 let base;
 if(r<55||pain>=7)base={volume:.5,intensity:.75,label:"Minimum / Recovery"};
 else if(r<68||pain>=5||recovery>14)base={volume:.8,intensity:.9,label:"Kısaltılmış"};
 else if(r>=85&&pain<=2&&recovery<8)base={volume:1,intensity:1.02,label:"Tam + progresyon"};
 else base={volume:1,intensity:1,label:"Tam"};
 const phase=programPhaseLoadV92(k);
 const volume=Math.min(base.volume*phase.volume,health.volumeFactor??1),intensity=Math.min(base.intensity*phase.intensity,health.intensityFactor??1);
 const dayLabel=health.action!=="normal"?`${base.label} · ${health.label}`:base.label;
 return {volume,intensity,label:`${dayLabel} · ${phase.label}`,health,phase};
}
function parseSetCount(text){const m=String(text).match(/(\d+)×/);return m?+m[1]:null}
function adjustPrescription(text,volume){const n=parseSetCount(text);if(!n||volume===1)return text;return String(text).replace(/^\d+×/,Math.max(1,Math.round(n*volume))+"×")}
function smartProgressionNote(name){
 const rows=exerciseChrono(name);if(!rows.length)return "Baseline oluştur";const last=rows.at(-1),sets=(last.sets||[]).map(Number).filter(Boolean),rir=+last.rir;
 if(!sets.length)return "Yeni referans kayıt gerekli";
 const stable=sets.length>=3 && Math.min(...sets)>=Math.max(...sets)*.8;
 if(["Weighted Pull-Up","Weighted Ring Dip","OHP","RDL","Bulgarian Split Squat"].includes(name)){
   if(stable&&rir>=2)return `Son seans kaliteli → ${last.load?`+${(+last.load+2.5).toFixed(1)} kg değerlendir`:`küçük yük/tekrar artışı`}`;
   if(rir<=0||!stable)return "Aynı yükü koru veya %5 azalt; kaliteyi toparla";
   return "Aynı yükte üst tekrar sınırını tamamla";
 }
 if(["Full Planche","Front Lever","Back Lever","L-Sit"].includes(name)){const total=sets.reduce((a,b)=>a+b,0);return `Toplam kaliteli süre ${total.toFixed(0)} sn → hedef ${Math.ceil(total*1.05)}–${Math.ceil(total*1.10)} sn`}
 return stable&&rir>=2?"Bir sonraki seans küçük progresyon":"Kaliteyi koru";
}
function resolvedTemplate(k){
 const plan=planForDate(k)||{type:"recovery",name:"Recovery / Rest"},health=window.HealthStateEngine?.assess?.(db.daily[k]||{})||{action:"normal"};
 const effectivePlan=["recovery","stop_hard_training"].includes(health.action)?{...plan,type:"recovery",name:health.action==="stop_hard_training"?"Health Recovery / Rest":"Recovery / Minimum Day",reason:`Sağlık durumu: ${health.label}`} : plan;
 const rawBase=templateForType(effectivePlan.type), base=window.SportsSciencePolicy?.optimizeTemplate?.(k,effectivePlan.type,rawBase)||rawBase, mod=planLoadModifier(k,effectivePlan.type), pain=painForDate(k);
 const readinessScore=db.daily?.[k]?readiness(db.daily[k]):null;
 const items=(base.items||[]).map(x=>{
   const rest=restIntervalPrescription(x[0],readinessScore),prescription=adjustPrescription(x[1],mod.volume);
   const loadRecommendation=window.LoadPrescriptionEngine?.recommend?.(x[0],prescription,k,{readinessScore,templateNote:x[2],modifier:mod})||{applicable:false};
   return {name:x[0],prescription,note:x[2],progression:smartProgressionNote(x[0]),loadRecommendation,restTargetSec:rest.target,restMinSec:rest.min,restMaxSec:rest.max,restKind:rest.kind};
 });
 const filtered=items.map(it=>{
   let risk="";
   const painAdvice=window.PainIntelligence?.exerciseAdvice?.(it.name,k);
   if(painAdvice?.level>0)risk=painAdvice.short;
   else{
     if((it.name.includes("Planche")||it.name.includes("Dip")||it.name==="OHP")&&(pain.shoulder>=6||pain.wrist>=6))risk="Eklem verisi nedeniyle ağrısız varyasyon / düşük hacim";
     if((it.name.includes("Pull")||it.name.includes("Lever")||it.name==="Muscle-Up")&&pain.elbow>=6)risk="Dirsek nedeniyle yoğunluğu azalt / ağrısız varyasyon";
     if(["RDL","Bulgarian Split Squat","Backpack/Goblet Squat","Single-Leg RDL"].includes(it.name)&&(pain.knee>=6||pain.back>=6||pain.hip>=6))risk="Alt vücut eklem verisi nedeniyle hareketi değiştir";
   }
   return {...it,risk,painAdvice:painAdvice||null};
 });
 return {...base,...effectivePlan,items:filtered,modifier:mod,health};
}
function canonicalTemplate(k){return window.CanonicalSessionEngine?.template?.(k)||resolvedTemplate(k)}
function liveSetAdvice(row){
 const sets=(row?.sets||[]).map(Number).filter(Boolean);if(!sets.length)return "İlk çalışma setini kaydet.";
 const first=sets[0],last=sets.at(-1),drop=first?((first-last)/first*100):0,rir=+row.rir;
 if(row?.type==="STATIC" || row?.metricUnit==="seconds"){
   const total=sets.reduce((a,b)=>a+b,0),best=Math.max(...sets);
   if(drop>=30)return `Statik hold süresi ilk setten son sete yaklaşık %${drop.toFixed(0)} düştü. Toplam ${total.toFixed(0)} sn, best ${best.toFixed(1)} sn. Dinlenmeyi uzat veya kaliteli hold burada bitir; saniyeyi zorlayarak form bozma.`;
   if(drop>=15)return `Statik kalite düşmeye başladı (%${drop.toFixed(0)}). Hold süresini değil pozisyon kalitesini önceliklendir.`;
   return `Statik hold süreleri stabil. Toplam ${total.toFixed(0)} sn kaliteli izometrik çalışma; planlanan holdları form bozulmadan tamamla.`;
 }
 if(rir===0||drop>=25)return `Performans düşüşü ${Math.max(0,drop).toFixed(0)}% ve/veya RIR 0. Bir sonraki sette yükü yaklaşık %5–10 azalt veya ana kaliteli setleri burada bitir.`;
 if(drop>=15||rir<=1)return "Set kalitesi düşmeye başladı. Sonraki sette aynı yükü zorlamak yerine 1 set azaltmak veya küçük load drop kullanmak daha uygun.";
 if(drop<10&&rir>=2)return "Setler stabil ve rezerv korunuyor. Planlanan setleri aynı kaliteyle tamamla; ek junk volume ekleme.";
 return "Performans kabul edilebilir. Tekniği ve hedef RIR’ı koru.";
}
function completeSessionV5(){
 const k=todayKey(),p=planForDate(k),logs=db.trainingLogs[k]||[];
 const completion=window.GuidedWorkout?.completionSummaryForTarget?.(k)||null,completionPct=completion?.completionPct??(logs.length?100:0);
 db.sessionFeedback[k]={type:p?.type||sessionTypeFromLogs(k)||"training",planVersion:p?.version||null,rpe:+q("sessionRpe")?.value||0,duration:+q("sessionDuration")?.value||0,note:q("sessionNote")?.value||"",completedAt:new Date().toISOString(),exerciseCount:logs.length,completionPct,completionStatus:completionPct>=100?"completed":completionPct>0?"partial":"unperformed",plannedSetCount:completion?.plannedSets??null,performedSetCount:completion?.performedSets??null};
 window.AthleteLoadMesh?.restampDay?.(k);
 db.planHistory[k]=db.planHistory[k]||{versions:[]}; db.planHistory[k].performed={at:new Date().toISOString(),logs:JSON.parse(JSON.stringify(logs)),feedback:db.sessionFeedback[k],completion,physiology:window.AthleteLoadMesh?.impactForDate?.(k)||null};
 save(); buildFuturePlanV5(14,"post-workout reoptimization"); renderTrainingV5(); renderTomorrowCoachV5(); renderCoachV5(); renderMuscleReport();
 const st=q("sessionCompleteStatus");if(st){st.textContent="✓ Seans işlendi; sabit program korunarak gelecek dozlar güncellendi";st.classList.add("ok")}
}
function renderPlanVsActual(){
 const el=q("planVsActual");if(!el)return;const k=todayKey(),p=planForDate(k),resolved=canonicalTemplate(k),logs=db.trainingLogs[k]||[],planned=(resolved?.items||[]).map(x=>x.name),actual=logs.map(x=>x.name),done=planned.filter(n=>actual.includes(n)).length,extra=actual.filter(n=>!planned.includes(n));
 const pct=planned.length?Math.round(done/planned.length*100):100;const version=(db.planHistory[k]?.currentVersion||p?.version||1);
 el.innerHTML=[["Plan",p?.name||"--"],["Plan versiyonu","v"+version],["Planlanan hareket",planned.length],["Tamamlanan",`${done}/${planned.length} · %${pct}`],["Ek hareket",extra.length?extra.join(", "):"Yok"]].map(x=>`<div class="summary-item"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
}
function renderTrainingV5(){
 renderTraining();renderPlanVsActual();const rows=db.trainingLogs[todayKey()]||[],last=rows.at(-1);const el=q("liveAutoregulation");if(el)el.textContent=last?liveSetAdvice(last):"İlk set kaydından sonra canlı öneri burada oluşur.";
}
function addExerciseV5(){
 const e=EXERCISES[Number(q("exerciseSelect").value)],sets=[1,2,3,4,5].map(i=>Number(q("set"+i).value)||0).filter(Boolean);if(!e||!sets.length)return;
 const k=todayKey(),p=planForDate(k);
 const rests=[q("rest12"),q("rest23"),q("rest34"),q("rest45")].map(x=>+(x?.value||0)).slice(0,Math.max(0,sets.length-1));
 const mk=window.EXERCISE_KNOWLEDGE?.[e.n];
 const row={name:e.n,type:e.type,load:Number(q("exerciseLoad").value)||0,sets,rir:Number(q("exerciseRir").value)||0,
   metricUnit:mk?.metric||(e.type==="STATIC"?"seconds":"reps"),movementClass:mk?.contraction||null,knowledgeVersion:window.EXERCISE_KNOWLEDGE_META?.version||null,
   executionEquipment:window.MovementIntelligence?.selectedEquipment?.()||mk?.variantEquipment||mk?.equipment?.[0]||null,
   plannedRestSec:+q("exerciseRestPlanned")?.value||restIntervalPrescription(e.n).target,restBetweenSets:rests,
   recordedAt:new Date().toISOString(),planType:p?.type||null,planVersion:p?.version||null};
 db.trainingLogs[k]=db.trainingLogs[k]||[];window.CanonicalSessionEngine?.lock?.(k,"manual_first_set",{source:"manual"});window.AthleteLoadMesh?.stampRow?.(row,k);db.trainingLogs[k].push(row);window.AthleteEventStore?.append?.("TRAINING_ROW_RECORDED",row,{domain:"training",athleteDay:k,source:"manual",kind:"measured",confidence:100});window.PersonalCalibration?.updateLoadResponse?.(row.name,row);save();renderTrainingV5();renderToday();renderCharacter();renderMuscleReport();window.GuidedWorkout?.syncFromLogs?.("manual exercise added");
}
function bindTrainingV5(){
 q("exerciseSelect").innerHTML=EXERCISES.map((x,i)=>`<option value="${i}">${x.n}</option>`).join("");if(q("addExerciseBtn"))q("addExerciseBtn").onclick=addExerciseV5;if(q("completeSessionBtn"))q("completeSessionBtn").onclick=completeSessionV5;renderTrainingV5();
}
function planAdherenceFor(k){
 const h=db.planHistory[k],p=(db.futurePlans||{})[k]||h?.versions?.at(-1)?.plan,cs=window.CanonicalSessionEngine?.get?.(k);if(!p&&!cs)return null;
 const summary=window.GuidedWorkout?.completionSummaryForTarget?.(k);if(summary&&summary.performedSets>0)return {score:summary.completionPct,plannedSets:summary.plannedSets,performedSets:summary.performedSets,details:summary.details};
 const planned=cs?.items?.map(x=>x.name)||templateForType(p.type).items.map(x=>x[0]),actual=(db.trainingLogs[k]||[]).filter(planContributingRow).map(x=>x.name);if(!planned.length)return {score:100};return {score:Math.round(planned.filter(n=>actual.includes(n)).length/planned.length*100),planned,actual};
}
function adaptationSuccessFor(k){
 const cs=window.CanonicalSessionEngine?.get?.(k),p=cs?{type:cs.planType,name:cs.planName,version:cs.planVersion}:((db.futurePlans||{})[k]||db.planHistory[k]?.versions?.at(-1)?.plan),fb=db.sessionFeedback[k];if(!fb)return null;const r=readiness(db.daily[k]);let s=80;if(p?.type==="recovery"&&r!=null&&r<60)s+=15;if(+fb.rpe>=9.5)s-=10;if(maxPain(k)>=6)s-=10;return clamp(s,0,100);
}
function measurementChangeForMuscle(m,days){
 const map={chest:"chest",frontDelts:"shoulders",sideDelts:"shoulders",rearDelts:"shoulders",biceps:"armR",triceps:"armR",forearms:null,lats:"chest",upperBack:"chest",traps:"shoulders",glutes:"hips",quads:"thighR",hamstrings:"thighR",adductors:"thighR",calves:"calfR",abs:"waist",obliques:"waist"};
 const field=map[m];if(!field)return null;const arr=(db.bodyMeasurements||[]).filter(x=>+x[field]>0).sort((a,b)=>a.date.localeCompare(b.date));if(arr.length<2)return null;const end=arr.at(-1),threshold=addDaysKey(end.date,-days),start=[...arr].reverse().find(x=>x.date<=threshold)||arr[0];if(start.date===end.date)return null;const pct=(+end[field]-+start[field])/(+start[field])*100;return {from:+start[field],to:+end[field],pct,unit:"cm",field};
}
function stimulusScore(m,sets,days){const weeklyTarget=V5_MUSCLES[m]?.target||8,target=weeklyTarget*(days/7);return clamp(Math.round(sets/Math.max(1,target)*100),0,120)}
function exercisesForMuscle(m,days){
 const keys=lastNDates(days),out={};keys.forEach(k=>(db.trainingLogs[k]||[]).forEach(r=>{const c=V5_EXERCISE_MUSCLES[r.name]?.[m]||0;if(c){out[r.name]=(out[r.name]||0)+(r.sets||[]).filter(Boolean).length*c*effectiveSetFactor(r)}}));return Object.entries(out).sort((a,b)=>b[1]-a[1]);
}
function anatomySVG(side,stim,days){
 const z=(m,shape)=>`<g class="muscle-zone heat-${Math.min(5,Math.max(0,Math.ceil(stimulusScore(m,stim[m]||0,days)/20)))}" data-muscle-key="${m}" title="${V5_MUSCLES[m]?.label||m}">${shape}</g>`;
 const base=`<circle class="body-base" cx="130" cy="45" r="28"/><rect class="body-base" x="92" y="78" width="76" height="185" rx="34"/><rect class="body-base" x="55" y="92" width="34" height="185" rx="16"/><rect class="body-base" x="171" y="92" width="34" height="185" rx="16"/><rect class="body-base" x="91" y="250" width="35" height="220" rx="18"/><rect class="body-base" x="134" y="250" width="35" height="220" rx="18"/><rect class="body-base" x="94" y="455" width="30" height="85" rx="15"/><rect class="body-base" x="136" y="455" width="30" height="85" rx="15"/>`;
 if(side==="front")return base+
   z("chest",`<path d="M100 108 Q130 92 160 108 L158 165 Q130 178 102 165Z"/>`)+z("frontDelts",`<ellipse cx="91" cy="116" rx="18" ry="25"/><ellipse cx="169" cy="116" rx="18" ry="25"/>`)+z("sideDelts",`<ellipse cx="82" cy="126" rx="11" ry="24"/><ellipse cx="178" cy="126" rx="11" ry="24"/>`)+z("biceps",`<rect x="61" y="143" width="22" height="63" rx="11"/><rect x="177" y="143" width="22" height="63" rx="11"/>`)+z("forearms",`<rect x="62" y="208" width="20" height="58" rx="10"/><rect x="178" y="208" width="20" height="58" rx="10"/>`)+z("abs",`<rect x="112" y="167" width="36" height="80" rx="12"/>`)+z("obliques",`<path d="M101 170 L113 170 L110 247 L99 235Z"/><path d="M159 170 L147 170 L150 247 L161 235Z"/>`)+z("hipFlexors",`<path d="M105 244 L128 250 L121 284 L101 270Z"/><path d="M155 244 L132 250 L139 284 L159 270Z"/>`)+z("quads",`<rect x="96" y="272" width="28" height="150" rx="14"/><rect x="136" y="272" width="28" height="150" rx="14"/>`)+z("adductors",`<path d="M119 276 L129 280 L124 390 L116 380Z"/><path d="M141 276 L131 280 L136 390 L144 380Z"/>`)+z("calves",`<rect x="98" y="430" width="24" height="88" rx="12"/><rect x="138" y="430" width="24" height="88" rx="12"/>`);
 return base+z("traps",`<path d="M102 90 L130 75 L158 90 L150 119 L110 119Z"/>`)+z("rearDelts",`<ellipse cx="91" cy="116" rx="18" ry="25"/><ellipse cx="169" cy="116" rx="18" ry="25"/>`)+z("upperBack",`<path d="M102 116 L158 116 L154 184 L106 184Z"/>`)+z("lats",`<path d="M100 132 L118 154 L112 224 L96 207Z"/><path d="M160 132 L142 154 L148 224 L164 207Z"/>`)+z("scapular",`<ellipse cx="115" cy="142" rx="15" ry="28"/><ellipse cx="145" cy="142" rx="15" ry="28"/>`)+z("triceps",`<rect x="61" y="143" width="22" height="63" rx="11"/><rect x="177" y="143" width="22" height="63" rx="11"/>`)+z("forearms",`<rect x="62" y="208" width="20" height="58" rx="10"/><rect x="178" y="208" width="20" height="58" rx="10"/>`)+z("spinalErectors",`<rect x="119" y="179" width="10" height="70" rx="5"/><rect x="131" y="179" width="10" height="70" rx="5"/>`)+z("glutes",`<ellipse cx="111" cy="263" rx="24" ry="30"/><ellipse cx="149" cy="263" rx="24" ry="30"/>`)+z("hamstrings",`<rect x="96" y="293" width="28" height="130" rx="14"/><rect x="136" y="293" width="28" height="130" rx="14"/>`)+z("calves",`<rect x="98" y="430" width="24" height="88" rx="12"/><rect x="138" y="430" width="24" height="88" rx="12"/>`);
}




const BODYMAP_GEOMETRY = {
  front: {
    size: {w:410, h:1086},
    image: "assets/caglar-anatomy-front.png",
    shapes: {
      chest: [
        "112,96 149,82 177,95 183,126 161,144 124,140 103,121",
        "232,96 269,82 297,95 303,126 281,144 244,140 223,121"
      ],
      frontDelts: [
        "77,76 102,67 118,77 114,100 96,109 79,98",
        "286,77 302,67 327,76 325,98 308,109 290,100"
      ],
      sideDelts: [
        "59,88 76,76 91,92 85,118 66,121 56,105",
        "319,92 334,76 351,88 354,105 344,121 325,118"
      ],
      biceps: [
        "63,118 87,116 98,149 95,184 74,202 56,175 55,142",
        "314,149 325,116 349,118 357,142 356,175 338,202 317,184"
      ],
      forearms: [
        "54,181 75,201 72,248 60,288 44,291 39,251 46,209",
        "340,201 361,181 369,209 376,251 371,291 355,288 343,248"
      ],
      abs: [
        "163,140 217,140 228,190 221,261 158,261 151,189"
      ],
      obliques: [
        "132,145 151,145 158,258 135,237 123,191",
        "228,145 247,145 256,191 244,237 221,258"
      ],
      hipFlexors: [
        "158,259 185,252 222,259 214,281 167,281",
        "169,281 213,281 219,301 162,301"
      ],
      quads: [
        "146,300 174,297 184,399 177,485 140,486 131,396",
        "206,297 234,300 249,396 240,486 203,485 196,399"
      ],
      adductors: [
        "175,302 193,302 196,395 182,454 166,393",
        "186,302 205,302 214,393 198,454 184,395"
      ],
      calves: [
        "141,487 177,487 181,625 149,668 129,620",
        "204,487 240,487 252,620 232,668 200,625"
      ]
    },
    labels: {
      chest:[203,117], abs:[189,206], quads:[188,388], calves:[190,574]
    }
  },
  back: {
    size: {w:370, h:1086},
    image: "assets/caglar-anatomy-back.png",
    shapes: {
      traps: [
        "145,76 188,62 228,62 270,76 250,101 166,101"
      ],
      rearDelts: [
        "102,88 126,77 144,92 138,114 117,124 100,109",
        "274,92 292,77 316,88 318,109 301,124 280,114"
      ],
      upperBack: [
        "143,101 188,88 228,88 275,101 259,157 159,157"
      ],
      lats: [
        "132,141 160,152 168,255 133,268 109,219 109,171",
        "248,152 276,141 299,171 299,219 275,268 240,255"
      ],
      scapular: [
        "161,113 187,103 200,149 170,162",
        "216,103 242,113 233,162 203,149"
      ],
      triceps: [
        "82,118 105,119 118,162 113,196 92,208 74,180 74,141",
        "301,162 314,119 337,118 345,141 345,180 327,208 306,196"
      ],
      forearms: [
        "73,181 92,206 88,255 76,294 58,296 52,255 61,213",
        "327,206 346,181 358,213 367,255 361,296 343,294 331,255"
      ],
      spinalErectors: [
        "185,102 200,102 206,271 188,271",
        "204,102 219,102 216,271 199,271"
      ],
      glutes: [
        "151,267 188,257 204,308 179,336 145,324",
        "200,257 237,267 243,324 209,336 184,308"
      ],
      hamstrings: [
        "147,325 182,333 182,480 155,547 131,475",
        "206,333 241,325 257,475 233,547 206,480"
      ],
      calves: [
        "145,480 174,479 180,615 160,660 139,617",
        "215,479 244,480 250,617 229,660 209,615"
      ]
    },
    labels: {
      traps:[207,82], upperBack:[208,131], lats:[206,205], glutes:[194,299], hamstrings:[194,431], calves:[194,561]
    }
  }
};


let bodymapOverlayMode="stimulus";

function growthMetricForMuscle(m,days=muscleReportDays){
 const directFields={
   chest:"chest",frontDelts:"shoulders",sideDelts:"shoulders",rearDelts:"shoulders",
   biceps:"armR",triceps:"armR",glutes:"hips",quads:"thighR",hamstrings:"thighR",
   adductors:"thighR",calves:"calfR"
 };
 const proxyFields={lats:"chest",upperBack:"chest",traps:"shoulders"};
 const field=directFields[m]||proxyFields[m];
 if(!field)return null;
 const arr=(db.bodyMeasurements||[]).filter(x=>+x[field]>0).sort((a,b)=>a.date.localeCompare(b.date));
 if(arr.length<2)return null;
 const end=arr.at(-1),threshold=addDaysKey(end.date,-days);
 const start=[...arr].reverse().find(x=>x.date<=threshold)||arr[0];
 if(start.date===end.date)return null;
 const pct=((+end[field]-+start[field])/(+start[field]))*100;
 return {pct,from:+start[field],to:+end[field],field,confidence:directFields[m]?"direct":"proxy"};
}

function musclePainScore(m,k=todayKey()){
 const p=painForDate(k);
 const links={
   chest:["shoulder","wrist"],
   frontDelts:["shoulder","wrist"],sideDelts:["shoulder"],rearDelts:["shoulder"],
   biceps:["elbow","shoulder","wrist"],triceps:["elbow","shoulder","wrist"],forearms:["elbow","wrist"],
   lats:["shoulder","elbow","back"],upperBack:["shoulder","back"],traps:["shoulder","back"],scapular:["shoulder","back"],
   spinalErectors:["back","hip"],abs:["back","hip"],obliques:["back","hip"],
   glutes:["hip","back"],quads:["knee","hip"],hamstrings:["knee","hip","back"],adductors:["hip","knee"],
   hipFlexors:["hip","back"],calves:["ankle","knee"]
 };
 const vals=(links[m]||[]).map(j=>p[j]||0);
 return vals.length?Math.max(...vals):0;
}

function recoveryReadinessForMuscle(m,k=todayKey()){
 return muscleRecoveryDetail(m,k).readiness;
}

window.ALOSRecovery={
 version:"9.2.8",
 ledger:(k=todayKey())=>muscleRecoveryLedger(k),
 detail:(m,k=todayKey())=>muscleRecoveryDetail(m,k),
 readiness:(m,k=todayKey())=>recoveryReadinessForMuscle(m,k),
 rowTime:(k,r)=>trainingRowTime(k,r),
 halfLife:r=>rowRecoveryHalfLifeHours(r)
};

function overlayMetric(m,stim){
 const sets=stim[m]||0;
 if(bodymapOverlayMode==="stimulus"){
   const value=Math.min(100,stimulusScore(m,sets,muscleReportDays));
   return {available:true,value,label:`${value}%`,sub:`${sets.toFixed(1)} efektif set`,color:overlayColor("stimulus",value)};
 }
 if(bodymapOverlayMode==="growth"){
   const g=growthMetricForMuscle(m,muscleReportDays);
   if(!g)return {available:false,value:null,label:"Veri yok",sub:"Ölçüm gerekli",color:"rgba(130,130,130,.18)"};
   const display=(g.pct>=0?"+":"")+g.pct.toFixed(2)+"%";
   return {available:true,value:g.pct,label:display,sub:`${g.from}→${g.to} cm · ${g.confidence==="direct"?"doğrudan":"proxy"}`,color:overlayColor("growth",g.pct)};
 }
 if(bodymapOverlayMode==="recovery"){
   const value=recoveryReadinessForMuscle(m);
   return {available:true,value,label:`${value}%`,sub:value>=75?"Hazır":value>=50?"Orta":"Yorgun",color:overlayColor("recovery",value)};
 }
 const pain=musclePainScore(m);
 const value=pain*10;
 return {available:true,value,label:`${pain}/10`,sub:pain>=7?"Yüksek":pain>=4?"Dikkat":"Düşük",color:overlayColor("pain",value)};
}

function overlayColor(mode,value){
 if(mode==="stimulus"){
   if(value<=0)return "rgba(130,130,130,.28)";
   if(value<25)return "rgba(91,192,222,.58)";
   if(value<50)return "rgba(52,152,219,.65)";
   if(value<75)return "rgba(255,193,7,.65)";
   if(value<95)return "rgba(255,140,0,.70)";
   return "rgba(244,67,54,.72)";
 }
 if(mode==="growth"){
   if(value<-.5)return "rgba(47,129,247,.68)";
   if(value<0)return "rgba(88,166,255,.55)";
   if(value<.25)return "rgba(130,130,130,.35)";
   if(value<.75)return "rgba(63,185,80,.52)";
   if(value<1.5)return "rgba(46,160,67,.65)";
   return "rgba(35,134,54,.76)";
 }
 if(mode==="recovery"){
   if(value>=80)return "rgba(63,185,80,.70)";
   if(value>=60)return "rgba(210,153,34,.66)";
   if(value>=40)return "rgba(255,140,0,.70)";
   return "rgba(248,81,73,.75)";
 }
 if(value<20)return "rgba(63,185,80,.54)";
 if(value<40)return "rgba(210,153,34,.60)";
 if(value<70)return "rgba(255,140,0,.68)";
 return "rgba(248,81,73,.78)";
}

function overlayModeDescription(){
 if(bodymapOverlayMode==="stimulus")return "Stimulus: seçili dönemdeki efektif set ve egzersiz kas katkısından hesaplanan antrenman uyaranı. Gerçek kas büyüme yüzdesi değildir.";
 if(bodymapOverlayMode==="growth")return "Measured Growth: yalnızca çevre ölçümü bulunan bölgelerde ölçülen değişimi gösterir. Bazı sırt/omuz bölgeleri yakın çevre ölçümünü proxy olarak kullanır.";
 if(bodymapOverlayMode==="recovery")return "Recovery: tarih+saat damgalı kas yükünün saat bazında üstel azalmasından türetilen tahmini readiness değeridir. Uyku, protein, enerji ve hidrasyon iyileşme hızını sınırlı ölçüde modüle eder; bu gerçek kas hasarı yüzdesi veya klinik ölçüm değildir.";
 return "Pain: günlük eklem/ağrı girişlerini ilgili kas zincirlerine yansıtır. Tanı değildir; yalnızca yük yönetimi sinyalidir.";
}


function buildShapeElement(side, muscleKey, poly, metric){
  const active = selectedMuscleKey===muscleKey ? " active" : "";
  const na = metric.available ? "" : " metric-na";
  const label = V5_MUSCLES[muscleKey]?.label || muscleKey;
  return `<polygon class="muscle-shape${active}${na}" data-side="${side}" data-muscle="${muscleKey}" data-label="${metric.label}" data-sub="${metric.sub}" points="${poly}" fill="${metric.color}" opacity=".92" aria-label="${label}"></polygon>`;
}

function buildSVGHeatmap(side, stim){
  const geo = BODYMAP_GEOMETRY[side];
  const w = geo.size.w, h = geo.size.h;
  let out = [`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${side==="front"?"Ön":"Arka"} 3D kas anatomisi">`,
             `<image href="${geo.image}" x="0" y="0" width="${w}" height="${h}"></image>`];
  Object.entries(geo.shapes).forEach(([k, polys])=>{
    const metric = overlayMetric(k, stim);
    polys.forEach(poly=> out.push(buildShapeElement(side, k, poly, metric)));
  });
  Object.entries(geo.labels||{}).forEach(([k,pos])=>{
    out.push(`<text class="svg-label" x="${pos[0]}" y="${pos[1]}">${V5_MUSCLES[k]?.label||k}</text>`);
  });
  out.push(`</svg>`);
  return out.join("");
}

function renderInteractiveHeatmap(stim){
 if(!q("frontHeatmap")||!q("backHeatmap"))return;
 q("frontHeatmap").innerHTML=buildSVGHeatmap("front",stim);
 q("backHeatmap").innerHTML=buildSVGHeatmap("back",stim);
 if(q("overlayModeNote"))q("overlayModeNote").textContent=overlayModeDescription();
 const tooltip=q("anatomyTooltip");
 document.querySelectorAll(".muscle-shape").forEach(el=>{
   const muscleKey=el.dataset.muscle,label=V5_MUSCLES[muscleKey]?.label||muscleKey;
   el.onmouseenter=(ev)=>{
     if(!tooltip)return;
     tooltip.hidden=false;
     tooltip.innerHTML=`<strong>${label}</strong>${el.dataset.label}<br><span>${el.dataset.sub}</span><small>Tıklayarak detay ve trend grafiğini aç</small>`;
     moveTooltip(ev);
   };
   el.onmousemove=moveTooltip;
   el.onmouseleave=()=>{if(tooltip)tooltip.hidden=true};
   el.onclick=()=>{selectedMuscleKey=muscleKey;renderMuscleReport()};
 });
}

function moveTooltip(ev){
 const tooltip=q("anatomyTooltip");if(!tooltip)return;
 const pad=14,tw=260,th=110;
 let x=ev.clientX+pad,y=ev.clientY+pad;
 if(x+tw>window.innerWidth)x=ev.clientX-tw-pad;
 if(y+th>window.innerHeight)y=ev.clientY-th-pad;
 tooltip.style.left=x+"px";tooltip.style.top=y+"px";
}

function initHeatmapViewToggle(){
 document.querySelectorAll(".heatmap-view").forEach(btn=>{
   btn.onclick=()=>{
     document.querySelectorAll(".heatmap-view").forEach(b=>b.classList.remove("active"));
     btn.classList.add("active");
     document.querySelectorAll(".svg-heatmap-stage").forEach(c=>c.classList.remove("active"));
     q(btn.dataset.view==="front"?"frontHeatmap":"backHeatmap")?.classList.add("active");
   };
 });
 document.querySelectorAll(".overlay-mode").forEach(btn=>{
   btn.onclick=()=>{
     bodymapOverlayMode=btn.dataset.overlay;
     document.querySelectorAll(".overlay-mode").forEach(b=>b.classList.toggle("active",b.dataset.overlay===bodymapOverlayMode));
     renderMuscleReport();
   };
 });
}

function growthFieldForMuscle(m){
 const direct={chest:"chest",frontDelts:"shoulders",sideDelts:"shoulders",rearDelts:"shoulders",biceps:"armR",triceps:"armR",glutes:"hips",quads:"thighR",hamstrings:"thighR",adductors:"thighR",calves:"calfR"};
 const proxy={lats:"chest",upperBack:"chest",traps:"shoulders"};
 return {field:direct[m]||proxy[m]||null,confidence:direct[m]?"direct":proxy[m]?"proxy":null};
}
function trendSeriesForMuscle(m){
 if(bodymapOverlayMode==="growth"){
   const gf=growthFieldForMuscle(m);if(!gf.field)return [];
   return (db.bodyMeasurements||[]).filter(x=>+x[gf.field]>0).sort((a,b)=>a.date.localeCompare(b.date)).slice(-12).map(x=>({date:x.date,value:+x[gf.field],unit:"cm"}));
 }
 const days=bodymapOverlayMode==="stimulus"?56:28;
 const keys=lastNDates(days);
 if(bodymapOverlayMode==="stimulus"){
   return keys.filter((_,i)=>i%7===6||i===keys.length-1).map(k=>({date:k,value:Math.min(100,stimulusScore(m,muscleStimulus(7,k)[m]||0,7)),unit:"%"}));
 }
 if(bodymapOverlayMode==="recovery"){
   return keys.map(k=>({date:k,value:recoveryReadinessForMuscle(m,k),unit:"%"}));
 }
 return keys.map(k=>({date:k,value:musclePainScore(m,k)*10,unit:"%"}));
}
function renderMuscleTrend(m){
 const root=q("muscleTrendChart"),title=q("muscleTrendTitle"),sub=q("muscleTrendSubtitle");
 if(!root||!m)return;
 const label=V5_MUSCLES[m]?.label||m,series=trendSeriesForMuscle(m);
 const modeLabel=bodymapOverlayMode==="stimulus"?"Stimulus":bodymapOverlayMode==="growth"?"Measured Growth":bodymapOverlayMode==="recovery"?"Recovery":"Pain";
 if(title)title.textContent=`${label} · ${modeLabel} Trendi`;
 if(sub)sub.textContent=bodymapOverlayMode==="growth"?"Çevre ölçümü zaman serisi.":"Son dönem kas-bazlı gelişim/yük trendi.";
 if(series.length<2){
   root.innerHTML=`<div class="chart-empty">${bodymapOverlayMode==="growth"?"Bu kas için en az iki uyumlu çevre ölçümü gerekli.":"Trend oluşturmak için yeterli geçmiş veri yok."}</div>`;
   return;
 }
 const values=series.map(x=>x.value),minRaw=Math.min(...values),maxRaw=Math.max(...values);
 let min=minRaw,max=maxRaw;
 if(bodymapOverlayMode!=="growth"){min=0;max=100}else{
   const pad=Math.max(.5,(max-min)*.2);min=Math.max(0,min-pad);max=max+pad;if(max===min)max=min+1;
 }
 const W=520,H=220,L=42,R=16,T=18,B=34,plotW=W-L-R,plotH=H-T-B;
 const x=i=>L+(series.length===1?plotW/2:i/(series.length-1)*plotW);
 const y=v=>T+(max-v)/(max-min)*plotH;
 const pts=series.map((p,i)=>`${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
 const klass=`chart-${bodymapOverlayMode}`;
 const grid=[0,.25,.5,.75,1].map(t=>{
   const gy=T+t*plotH,val=max-t*(max-min);
   return `<line class="chart-grid" x1="${L}" y1="${gy}" x2="${W-R}" y2="${gy}"/><text class="chart-label" x="4" y="${gy+3}">${bodymapOverlayMode==="growth"?val.toFixed(1):Math.round(val)}${bodymapOverlayMode==="growth"?"":"%"}</text>`;
 }).join("");
 const dots=series.map((p,i)=>{
   const show=i===0||i===series.length-1||series.length<=8||i%Math.ceil(series.length/6)===0;
   return `<circle class="chart-dot" cx="${x(i)}" cy="${y(p.value)}" r="4" fill="currentColor"/>${show?`<text class="chart-label" x="${x(i)}" y="${H-10}" text-anchor="middle">${p.date.slice(5)}</text>`:""}`;
 }).join("");
 const latest=series.at(-1);
 root.innerHTML=`<svg viewBox="0 0 ${W} ${H}" class="${klass}" role="img" aria-label="${label} trend grafiği">
   ${grid}
   <line class="chart-axis" x1="${L}" y1="${T}" x2="${L}" y2="${H-B}"/>
   <line class="chart-axis" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/>
   <polyline class="chart-line" points="${pts}"/>
   ${dots}
   <text class="chart-value" x="${W-R}" y="13" text-anchor="end">Son: ${bodymapOverlayMode==="growth"?latest.value.toFixed(1)+" cm":Math.round(latest.value)+"%"}</text>
 </svg>`;
}


let SCIENCE_LIBRARY=null;
fetch("science-library.json").then(r=>r.json()).then(x=>{SCIENCE_LIBRARY=x;safeRender(renderScienceMethodology)}).catch(()=>{});

function nutritionForKey(k){
 const rows=(db.foodLogs||{})[k]||[];
 return {
   kcal:rows.reduce((a,r)=>a+(+r.kcal||0),0),
   protein:rows.reduce((a,r)=>a+(+r.p||0),0)
 };
}
function currentBodyWeightScience(){
 const arr=(db.bodyMeasurements||[]).filter(x=>+x.weight>0).sort((a,b)=>a.date.localeCompare(b.date));
 if(arr.length)return +arr.at(-1).weight;
 const daily=Object.entries(db.daily||{}).filter(([,d])=>+d.weight>0).sort((a,b)=>a[0].localeCompare(b[0]));
 return daily.length?+daily.at(-1)[1].weight:72;
}
function avgProteinAdequacy(days=14,endKey=todayKey()){
 const bw=currentBodyWeightScience(),ref=Math.max(1,bw*1.6);
 const keys=Array.from({length:days},(_,i)=>addDaysKey(endKey,-i));
 const vals=keys.map(k=>nutritionForKey(k).protein).filter(v=>v>0);
 if(!vals.length)return {score:70,coverage:0,avg:0,ref};
 const ratios=vals.map(v=>clamp(v/ref,0,1.15));
 return {score:Math.round(avg(ratios)*100),coverage:vals.length/days,avg:avg(vals),ref};
}
function avgSleepScience(days=14,endKey=todayKey()){
 const keys=Array.from({length:days},(_,i)=>addDaysKey(endKey,-i)),target=db.settings.targetSleep||8;
 const vals=keys.map(k=>db.daily[k]).filter(d=>d&&d.sleepTime&&d.wakeTime).map(d=>sleepDuration(d)/60);
 if(!vals.length)return {score:72,coverage:0,avg:0};
 const score=Math.round(avg(vals.map(h=>clamp(h/target*100,0,105))));
 return {score,coverage:vals.length/days,avg:avg(vals)};
}
function bodyWeightRateScience(){
 const arr=(db.bodyMeasurements||[]).filter(x=>+x.weight>0).sort((a,b)=>a.date.localeCompare(b.date)).slice(-12);
 if(arr.length<4)return {rate:null,score:75,coverage:0};
 const first=arr[0],last=arr.at(-1),days=Math.max(1,daysBetween(first.date,last.date));
 const rate=(+last.weight-+first.weight)/(days/7);
 // For lean-gain: under-fuelling is penalized; aggressive gain does not get a hypertrophy bonus.
 let score=82;
 if(rate<-.15)score=55;
 else if(rate<0)score=68;
 else if(rate<=.35)score=88;
 else if(rate<=.55)score=78;
 else score=65;
 return {rate,score,coverage:Math.min(1,arr.length/8)};
}
function recentRunKmScience(days=7,endKey=todayKey()){
 return Array.from({length:days},(_,i)=>addDaysKey(endKey,-i)).reduce((sum,k)=>sum+(+db.daily[k]?.runKm||0),0);
}
function muscleProgressionScience(m,endKey=todayKey()){
 const ex=Object.entries(V5_EXERCISE_MUSCLES).filter(([,map])=>(map[m]||0)>=.5).map(([name])=>name);
 let recent=[],prior=[];
 Object.entries(db.trainingLogs||{}).forEach(([k,rows])=>{
   const age=daysBetween(k,endKey);
   rows.filter(r=>ex.includes(r.name)).forEach(r=>{
     const best=Math.max(...(r.sets||[0]).map(Number));
     const score=r.type==="STATIC"?best:((+r.load||currentBodyWeightScience())*best);
     if(age>=0&&age<28)recent.push(score);
     else if(age>=28&&age<56)prior.push(score);
   });
 });
 if(!recent.length||!prior.length)return {score:75,coverage:0,delta:null};
 const a=avg(recent),b=avg(prior),delta=b?((a-b)/b)*100:0;
 return {score:clamp(Math.round(75+delta*1.5),50,100),coverage:1,delta};
}
function muscleTrainingScience(m,endKey=todayKey()){
 const sets28=muscleStimulus(28,endKey)[m]||0,weekly=sets28/4,target=V5_MUSCLES[m]?.target||10;
 // saturating response: target volume is a reference, not a biological optimum.
 const ratio=weekly/Math.max(1,target);
 const score=Math.round(100*(1-Math.exp(-1.55*ratio))/(1-Math.exp(-1.55)));
 return {score:clamp(score,0,100),sets28,weekly,target};
}
function interferenceScience(m,endKey=todayKey()){
 const leg=["glutes","quads","hamstrings","adductors","calves","hipFlexors"].includes(m),km=recentRunKmScience(7,endKey),rec=recoveryReadinessForMuscle(m,endKey),mesh=window.AthleteLoadMesh?.rolling?.(7,endKey)||{};
 const localVals=(mesh.parts||[]).map(x=>+x.impact?.localRecovery?.[m]||0).filter(Boolean),localLoad=localVals.length?avg(localVals):0;
 let score=97;
 if(localLoad>=75&&rec<75)score-=8;
 if(localLoad>=85&&rec<65)score-=8;
 if((mesh.neuralDemand||0)>=80&&rec<65)score-=4;
 if(leg){
   if(km>15&&rec<70)score-=8;
   if(km>25&&rec<60)score-=10;
   if((mesh.highSpeedExposureSec||0)>=30&&rec<75)score-=6;
   if((mesh.highSpeedExposureSec||0)>=70&&rec<65)score-=6;
 }
 return {score:clamp(score,50,100),runKm:km,highSpeedSec:mesh.highSpeedExposureSec||0,extraMetabolic:mesh.metabolicDemand||0,localLoad,neuralDemand:mesh.neuralDemand||0,note:score<90?"Gerçek training load + recovery çakışması":"Yönetilebilir"};
}
function measuredEvidenceScience(m,days=56){
 const g=growthMetricForMuscle(m,days);
 if(!g)return {label:"Yok",score:0,growth:null};
 const arr=(db.bodyMeasurements||[]).filter(x=>+x[g.field]>0);
 return {label:(g.confidence==="direct"?"Çevre ölçümü":"Proxy ölçüm"),score:arr.length>=4?65:45,growth:g};
}
function scienceTrendForMuscle(m,endKey=todayKey()){
 const tr=muscleTrainingScience(m,endKey),protein=avgProteinAdequacy(14,endKey),sleep=avgSleepScience(14,endKey),energy=bodyWeightRateScience();
 const prog=muscleProgressionScience(m,endKey),inter=interferenceScience(m,endKey),rec=recoveryReadinessForMuscle(m,endKey),pain=musclePainScore(m,endKey);
 // Environment weights are explicit engineering heuristics, not validated biological conversion coefficients.
 const environment=Math.round(
   protein.score*.30 + sleep.score*.25 + energy.score*.15 + rec*.20 + inter.score*.10
 );
 const modifier=.70+.30*(environment/100);
 const progressionAdjust=(prog.score-75)*.12;
 const painPenalty=pain>=7?10:pain>=4?4:0;
 const expected=clamp(Math.round(tr.score*modifier+progressionAdjust-painPenalty),0,100);
 const coverage=clamp(
   .40 + protein.coverage*.14 + sleep.coverage*.14 + energy.coverage*.08 + prog.coverage*.10 +
   Math.min(1,tr.sets28/Math.max(1,tr.target*2))*.14,0,1
 );
 const measured=measuredEvidenceScience(m,56);
 let confidence=Math.round(coverage*75+measured.score*.25);
 confidence=clamp(confidence,10,100);
 let label=expected<35?"Düşük stimulus / gelişim riski":expected<55?"Koruma / belirsiz":expected<72?"Pozitif adaptasyon":expected<86?"Güçlü pozitif adaptasyon":"Çok yüksek stimulus — recovery kontrolü";
 return {expected,label,confidence,training:tr,environment,protein,sleep,energy,prog,inter,recovery:rec,pain,measured};
}
function renderScienceMethodology(){
 const el=q("scienceMethodologyBody");if(!el)return;
 if(!SCIENCE_LIBRARY){el.innerHTML="<p class='hint'>Bilim kütüphanesi yükleniyor…</p>";return}
 el.innerHTML=`
   <div class="science-evidence-row"><strong>Model prensibi</strong><small>${SCIENCE_LIBRARY.engine.important}</small></div>
   ${SCIENCE_LIBRARY.principles.slice(0,6).map(x=>`<div class="science-evidence-row"><strong>${x.topic} · Kanıt ${x.evidence_level}</strong><span>${x.rule}</span><small>PMID ${x.source.pmid||"-"} · ${x.source.year}</small></div>`).join("")}
   <div class="science-evidence-row"><strong>Ölçüm protokolü</strong><span>Çevre ölçümünü aynı anatomik noktada, benzer hidrasyon/saatte, antrenman pump'ı olmadan 3 kez al; medyanı kaydet. Günlük değişim yerine 4–8 haftalık trendi yorumla.</span></div>`;
}
function renderScienceTrend(m){
 if(!q("scienceTrendScore")||!m)return;
 const s=scienceTrendForMuscle(m);
 q("scienceTrendScore").textContent=s.expected+"/100";
 q("scienceTrendLabel").textContent=s.label;
 q("scienceStimulusScore").textContent=s.training.score+"/100";
 q("scienceEnvironmentScore").textContent=s.environment+"/100";
 q("scienceMeasuredEvidence").textContent=s.measured.label;
 q("scienceTrendConfidence").textContent=`Güven ${s.confidence}/100`;
 const growth=s.measured.growth;
 q("scienceTrendExplanation").className="insight-box "+(s.expected>=72?"good":s.expected>=50?"neutral":"warn");
 q("scienceTrendExplanation").innerHTML=`<strong>${V5_MUSCLES[m]?.label||m}</strong> için beklenen adaptasyon <b>${s.expected}/100</b>. Bu bir kas büyüme yüzdesi değildir.
 <div class="science-factor-grid">
   <div class="science-factor"><span>28g efektif hacim</span><strong>${s.training.sets28.toFixed(1)} set · ${s.training.weekly.toFixed(1)}/hafta</strong></div>
   <div class="science-factor"><span>Protein ortamı</span><strong>${s.protein.coverage?`${Math.round(s.protein.avg)} g/gün · ${s.protein.score}/100`:"veri az"}</strong></div>
   <div class="science-factor"><span>Uyku ortamı</span><strong>${s.sleep.coverage?`${s.sleep.avg.toFixed(1)} saat · ${s.sleep.score}/100`:"veri az"}</strong></div>
   <div class="science-factor"><span>Recovery</span><strong>${s.recovery}/100 · pain ${s.pain}/10</strong></div>
   <div class="science-factor"><span>Performans trendi</span><strong>${s.prog.delta==null?"baseline yok":`${s.prog.delta>=0?"+":""}${s.prog.delta.toFixed(1)}%`}</strong></div>
   <div class="science-factor"><span>Ölçülmüş büyüme</span><strong>${growth?`${growth.pct>=0?"+":""}${growth.pct.toFixed(2)}% (${growth.from}→${growth.to} cm)`:"yeterli ölçüm yok"}</strong></div>
 </div>`;
}

let muscleReportDays=7,selectedMuscleKey=null;
function renderMuscleReport(){
 const stim=muscleStimulus(muscleReportDays);
 const total=Object.values(stim).reduce((a,b)=>a+b,0);
 const top=Object.entries(stim).sort((a,b)=>b[1]-a[1])[0];
 if(q("muscleTotalSets"))q("muscleTotalSets").textContent=total.toFixed(1);
 if(q("topStimulusMuscle"))q("topStimulusMuscle").textContent=top&&top[1]>0?V5_MUSCLES[top[0]].label:"--";

 if(!selectedMuscleKey)selectedMuscleKey=top&&top[0]||"chest";

 if(window.BodyMap3D){ window.BodyMap3D.setOverlayMode(bodymapOverlayMode); window.BodyMap3D.update(stim); }

 if(q("muscleRegionGrid")){
  q("muscleRegionGrid").innerHTML=Object.entries(V5_MUSCLES).map(([k,m])=>{
    const metric=overlayMetric(k,stim);
    const active=selectedMuscleKey===k?" active":"";
    const sideLabel=m.side==="front"?"Ön":m.side==="back"?"Arka":"Ön + Arka";
    return `<button type="button" class="muscle-chip${active}" data-muscle-chip="${k}" style="box-shadow:inset 5px 0 0 ${metric.color}">
      <span class="chip-main"><strong>${m.label}</strong><small>${sideLabel} • hedef ${m.target} set</small></span>
      <span class="chip-score">${metric.label}</span>
    </button>`;
  }).join("");
  document.querySelectorAll("[data-muscle-chip]").forEach(btn=>btn.onclick=()=>{selectedMuscleKey=btn.dataset.muscleChip;renderMuscleReport()});
 }

 if(q("muscleStimulusTable")){
   q("muscleStimulusTable").innerHTML=Object.entries(V5_MUSCLES)
    .map(([k,m])=>({k,m,metric:overlayMetric(k,stim),sets:stim[k]||0}))
    .sort((a,b)=>{
      const av=typeof a.metric.value==="number"?a.metric.value:-999,bv=typeof b.metric.value==="number"?b.metric.value:-999;
      return bv-av;
    })
    .map(x=>`<div class="muscle-row"><span>${x.m.label}<br><small>${x.metric.sub}</small></span><strong>${x.metric.label}</strong></div>`).join("");
 }

 renderMuscleDetail(selectedMuscleKey,stim);
 renderMuscleTrend(selectedMuscleKey);
 renderScienceTrend(selectedMuscleKey);
}
function renderMuscleDetail(m,stim=muscleStimulus(muscleReportDays)){
 const el=q("muscleDetailCard");if(!el||!V5_MUSCLES[m])return;
 const sets=stim[m]||0,score=stimulusScore(m,sets,muscleReportDays),ex=exercisesForMuscle(m,muscleReportDays).slice(0,5);
 const measured=growthMetricForMuscle(m,muscleReportDays),recDetail=muscleRecoveryDetail(m),recLoad=recDetail.load,recReady=recDetail.readiness,pain=musclePainScore(m);
 const face=V5_MUSCLES[m].side==="front"?"Ön görünüm":V5_MUSCLES[m].side==="back"?"Arka görünüm":"Ön + arka görünüm";
 let env=score>=70&&score<=110?"İyi":score<40?"Düşük":"Yüksek yük / recovery izle";
 el.innerHTML=`<div class="section-head"><div><h3>${V5_MUSCLES[m].label}</h3><span class="metric-mode-chip">${bodymapOverlayMode.toUpperCase()}</span></div></div>
 <div class="summary-list">
   <div class="summary-item"><span>Anatomik bölge</span><strong>${face}</strong></div>
   <div class="summary-item"><span>Training Stimulus</span><strong>${Math.min(100,score)}%</strong></div>
   <div class="summary-item"><span>Efektif set</span><strong>${sets.toFixed(1)}</strong></div>
   <div class="summary-item"><span>Recovery readiness</span><strong>${recReady}%</strong></div>
   <div class="summary-item"><span>Recovery yükü</span><strong>${recLoad.toFixed(1)}</strong></div>
   <div class="summary-item"><span>Son kas yükü</span><strong>${recDetail.latest?`${new Date(recDetail.latest.at).toLocaleString("tr-TR")} · ${recDetail.latest.name}`:"Kayıt yok"}</strong></div>
   <div class="summary-item"><span>≈ %85 readiness ETA</span><strong>${recDetail.etaHours>1?`${Math.round(recDetail.etaHours)} saat`:"Hazır / çok yakın"}</strong></div>
   <div class="summary-item"><span>Pain / yük sinyali</span><strong>${pain}/10</strong></div>
   <div class="summary-item"><span>Hipertrofi ortamı</span><strong>${env}</strong></div>
   <div class="summary-item"><span>Measured Growth</span><strong>${measured?`${measured.pct>=0?"+":""}${measured.pct.toFixed(2)}% (${measured.from}→${measured.to} cm) · ${measured.confidence==="direct"?"doğrudan":"proxy"}`:"Ölçüm yok / uygun ölçüm alanı yok"}</strong></div>
 </div>
 <p class="hint">Ana kaynaklar: ${ex.length?ex.map(x=>`${x[0]} (${x[1].toFixed(1)})`).join(", "):"Bu dönemde kayıt yok"}. Stimulus bir antrenman uyaran skorudur; measured growth ise yalnızca çevre ölçümlerinden gelir.</p>`;
}
function initMuscleReport(){
 document.querySelectorAll(".muscle-period").forEach(b=>b.onclick=()=>{document.querySelectorAll(".muscle-period").forEach(x=>x.classList.remove("active"));b.classList.add("active");muscleReportDays=+b.dataset.days;renderMuscleReport()});
 document.querySelectorAll(".overlay-mode").forEach(b=>b.onclick=()=>{bodymapOverlayMode=b.dataset.overlay;document.querySelectorAll(".overlay-mode").forEach(x=>x.classList.toggle("active",x.dataset.overlay===bodymapOverlayMode));renderMuscleReport()});
 renderMuscleReport();
}
function characterConfidenceModel(){
 const d=db.characterData||{},has=(...ks)=>ks.some(k=>d[k]!=null),logs=n=>exerciseChrono(n).length>0;return {
  "Strength":has("ohpKg")||logs("OHP")?"Yüksek":"Orta","Relative Strength":has("wpuLoad","dipLoad")||logs("Weighted Pull-Up")?"Yüksek":"Orta","Power":has("verticalJumpCm","broadJumpCm")?"Yüksek":logs("Muscle-Up")?"Orta":"Düşük","Speed":has("sprint10Sec","sprint30Sec")?"Yüksek":"Düşük","Endurance":has("run5kMin","cooperM")||lastNDates(30).some(k=>+db.daily[k]?.runKm>0)?"Yüksek":"Orta","Work Capacity":has("maxPullups","maxPushups","burpee5")?"Yüksek":"Orta","Mobility":has("shoulderMobility","hipMobility","ankleMobility")?"Yüksek":"Düşük","Balance & Control":has("balanceControl")||has("plancheSec","frontLeverSec")?"Orta":"Düşük","Skill":has("plancheSec","frontLeverSec","backLeverSec","muscleUpReps")?"Yüksek":logs("Full Planche")?"Orta":"Düşük","Recovery":lastNDates(7).filter(k=>db.daily[k]).length>=5?"Yüksek":"Orta"};
}
function renderCharacterConfidence(){
 if(!q("characterConfidence"))return;const c=characterConfidenceModel();q("characterConfidence").innerHTML=Object.entries(c).map(([k,v])=>`<div class="confidence-item confidence-${v==="Yüksek"?"high":v==="Orta"?"medium":"low"}"><span>${k}</span><strong>${v}</strong></div>`).join("");
 const d=db.characterData||{},tests=[];if(d.sprint10Sec==null&&d.sprint30Sec==null)tests.push(["Speed","10 m veya 30 m sprint testi"]);if(d.verticalJumpCm==null&&d.broadJumpCm==null)tests.push(["Power","Vertical jump veya broad jump"]);if(d.shoulderMobility==null||d.hipMobility==null||d.ankleMobility==null)tests.push(["Mobility","Omuz + kalça + ayak bileği mobilite testi"]);if(d.run5kMin==null&&d.cooperM==null)tests.push(["Endurance","5K veya Cooper 12 dk testi"]);if(!tests.length)tests.push(["Test kapsamı","Ana özelliklerin doğrudan test verileri mevcut"]);q("testingEngine").innerHTML=tests.map(x=>`<div class="rec-card ${x[0]==="Test kapsamı"?"good":"warn"}"><strong>${x[0]}</strong>${x[1]}</div>`).join("");
}
function renderPainCoach(){
 const p=painForDate(todayKey()),peak=Math.max(...Object.values(p));if(q("painRiskBadge"))q("painRiskBadge").textContent=peak+"/10";
 const el=q("painCoachNote");if(!el)return;
 const entries=window.PainIntelligence?.activeEntries?.(todayKey())||[];
 if(entries.length){
   const top=[...entries].sort((a,b)=>(+b.severity||0)-(+a.severity||0))[0],label=window.PainIntelligence?.entryLabel?.(top)||`${top.side||""} ${top.joint||""}`;
   const red=window.PainIntelligenceCore?.redFlag?.(top);
   el.className="insight-box "+(red||peak>=7?"bad":peak>=4?"warn":"good");
   el.innerHTML=red?`<strong>${label} · ${top.severity}/10</strong><br>Red-flag niteliğinde bir bilgi işaretlendi. İlgili bölgeyi zorlayan antrenmanı önceliklendirme; klinik değerlendirme uygun olabilir.`:
    `<strong>${label} · ${top.severity}/10</strong><br>Coach hareket bazında joint-load uyumluluğunu kontrol edecek. Ağrı artıyorsa hareketi zorlayarak progresyon önerilmeyecek.`;
   return;
 }
 const pairs=Object.entries(p).filter(x=>x[1]>=4).sort((a,b)=>b[1]-a[1]);
 if(!pairs.length){el.className="insight-box good";el.textContent="Belirgin eklem yük sinyali yok. Teknik kalite ve normal progresyon uygulanabilir.";return}
 el.className="insight-box "+(peak>=7?"bad":"warn");el.textContent=`Legacy yük sinyali: ${pairs.map(x=>x[0]+" "+x[1]+"/10").join(", ")}.`;
}
function renderCommandCenter(){
 if(!q("cmdTodayTraining"))return;const t=planForDate(todayKey()),tm=planForDate(addDaysKey(todayKey(),1)),pw=programWeekV5(),r=readiness(db.daily[todayKey()])??forecastReadinessV5(todayKey());q("cmdTodayTraining").textContent=t?.name||"Plan hazırlanıyor";q("cmdTodayTime").textContent=t?.window||"--";q("cmdTomorrowTraining").textContent=tm?.name||"--";q("cmdTomorrowReadiness").textContent=tm?`≈ ${tm.predictedReadiness}/100 · ${tm.window}`:"--";q("cmdProgramWeek").textContent=`Döngü ${pw.cycle} · Hafta ${pw.week}/12`;q("cmdProgramPhase").textContent=phaseForWeekV5(pw.week).name;q("cmdRecovery").textContent=`${r}/100`;q("cmdRecoveryNote").textContent=maxPain()>=5?"Eklem yükünü izle":"Güncel readiness";q("engineStatus").textContent=`Aktif · Athlete Day ${todayKey()} · ${String(Number.isFinite(+db.settings.dayBoundaryHour)?+db.settings.dayBoundaryHour:0).padStart(2,"0")}:00 sınırı`;document.querySelectorAll(".command-tile").forEach(b=>b.onclick=()=>goToPage(b.dataset.command));
}
function renderCoachV5(){
 if(!q("coachReadiness"))return;const k=todayKey(),p=planForDate(k)||buildFuturePlanV5(14)[k],cs=window.CanonicalSessionEngine?.get?.(k),t=canonicalTemplate(k),raw=readiness(db.daily[k]),r=raw??(cs?.predictedReadiness??p.predictedReadiness),mod=t.modifier,health=window.HealthStateEngine?.assess?.(db.daily[k]||{});q("coachReadiness").textContent=(raw==null?"≈ ":"")+r+"/100";q("coachSession").textContent=t.name||p.name;q("coachIntensity").textContent=mod.label;q("coachDuration").textContent=Math.round((t.duration||45)*mod.volume)+" dk";q("coachWorkout").innerHTML=t.items.map(x=>`<div class="coach-row"><strong>${x.name}</strong><span>${x.prescription}${x.loadRecommendation?.applicable&&x.loadRecommendation?.display?` · <b>${x.loadRecommendation.display}</b>`:""}</span><span>${x.risk||x.progression||x.loadRecommendation?.rationale||x.note}</span></div>`).join("");const conflicts=painConflicts(cs?.planType||p.type,k),pw=programWeekV5(k);q("coachDecision").textContent=`Döngü ${pw.cycle}, hafta ${pw.week}/12 (${phaseForWeekV5(pw.week).name}). Canonical ${cs?.snapshotId||"—"} · Plan v${cs?.planVersion||p.version||1}; ${cs?.reason||p.reason}. ${health&&health.action!=="normal"?`Sağlık durumu: ${health.label} — ${health.reason} `:""}${conflicts.length?`Eklem uyumluluğu nedeniyle ${conflicts.join(", ")} yükü azaltıldı.`:"Belirgin eklem çakışması yok."} ${window.PeriodicTrendEngine?.summary?.("monthly")?.comment||""} ${nutritionGoalAdvice().text}`;const focus=t.items.slice(0,3).map(x=>x.name);q("coachProgression").innerHTML=focus.map(n=>`<div class="rec-card good"><strong>${n}</strong>${smartProgressionNote(n)}</div>`).join("");
}
renderCoach=renderCoachV5;
function renderTomorrowCoachV5(){
 if(!q("tomorrowWorkoutPlan"))return;const k=addDaysKey(todayKey(),1),p=planForDate(k)||buildFuturePlanV5(14)[k],t=canonicalTemplate(k);q("tomorrowStatusBadge").textContent=p.name;q("tomorrowWorkoutSummary").innerHTML=[["Tarih",p.key],["Forecast readiness",`≈ ${p.predictedReadiness}/100`],["Önerilen saat",p.window],["Plan versiyonu","v"+(p.version||1)]].map(x=>`<div class="mini-box"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");q("tomorrowWorkoutPlan").innerHTML=t.items.map((x,i)=>`<div class="today-plan-row"><strong>${i+1}. ${x.name}</strong><span>${x.prescription}${x.loadRecommendation?.applicable&&x.loadRecommendation?.display?` · Yük ${x.loadRecommendation.display}`:""}</span><span>${x.risk||x.progression||x.loadRecommendation?.rationale||""}</span><span class="tag">${p.type}</span></div>`).join("");q("tomorrowWorkoutReason").textContent=`Yarınki seans Program Engine v9.2 ana mikrocycle slotudur. Check-in programın kimliğini rastgele değiştirmez; yalnızca hacim, yük, RIR ve gerekli ise kontrollü erteleme uygulanır. ${p.adaptation||"Ana mikrocycle"}.`;
}
renderTomorrowCoach=renderTomorrowCoachV5;
function renderTodayTrainingPlanV5(){
 const el=q("todayTrainingPlan");if(!el)return;const k=trainingViewDate(),p=planForDate(k)||buildFuturePlanV5(14)[k],t=canonicalTemplate(k);const cs=window.CanonicalSessionEngine?.get?.(k);q("todayPlanBadge").textContent=`${t.name||p.name} · v${cs?.planVersion||p.version||1}${cs?.locked?" · LOCK":""}`;
 const kd=new Date(k+"T12:00:00");if(q("trainingSelectedDateLabel"))q("trainingSelectedDateLabel").textContent=new Intl.DateTimeFormat("tr-TR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(kd);
 if(q("selectedWorkoutHeading"))q("selectedWorkoutHeading").textContent=(k===todayKey()?"Bugünün":"Seçili Günün")+" Hazır Antrenmanı";el.innerHTML=(t.items||[]).map((x,i)=>`<div class="today-plan-row"><strong>${i+1}. ${x.name}</strong><span>${x.prescription}${x.loadRecommendation?.applicable&&x.loadRecommendation?.display?` · Yük ${x.loadRecommendation.display}`:""}</span><span>${x.risk||x.progression||x.loadRecommendation?.rationale||""}</span><span class="tag">${t.modifier.label}</span></div>`).join("");const rr=readiness(db.daily[k]);q("todayPlanReason").textContent=`Program Engine v9.2 · ${p.phase||phaseForWeekV5(programWeekV5(k).week).name}. ${p.adaptation||"Ana mikrocycle"}. ${p.status==="work"?"Vardiya "+shiftLabel(p.shift):"İzin/serbest gün"} · ${p.window}. ${rr==null?`Readiness forecast ≈ ${p.predictedReadiness}/100.`:`Readiness ${rr}/100.`} Recovery cezası ${muscleRecoveryPenalty(p.type,k).toFixed(0)}. ${painConflicts(p.type,k).length?`Eklem sinyali: ${painConflicts(p.type,k).join(", ")}.`:"Eklem çakışması yok."} Günlük veri programın hareket kimliğini değiştirmez; doz ayarı yapar. Canonical: ${cs?.snapshotId||"oluşturuluyor"}${cs?.locked?` · kilit: ${cs.lockReason}`:""}`;
}
renderTodayTrainingPlan=renderTodayTrainingPlanV5;
function renderWeeklyTrainingPlanV5(){
 const el=q("weeklyTrainingPlan");if(!el)return;const keys=weekKeysFor(trainingViewDate()),today=todayKey();
 el.innerHTML=keys.map(k=>{
   const p=planForDate(k)||db.planHistory[k]?.versions?.at(-1)?.plan,cs=window.CanonicalSessionEngine?.get?.(k);
   const d=new Date(k+"T12:00:00");if(!p&&!cs)return `<div class="plan-day"><div class="date">${dayNameTr(d)} • ${k.slice(5)}</div><h4>Plan yok</h4></div>`;
   const actual=completedSessionType(k),past=k<today,vr=db.gapReconciliation?.[k],type=cs?.planType||p?.type||"recovery";
   const status=past?(actual?(vr?.dataConfidence==="medium"?"Tamamlandı · Backfill":"Tamamlandı"):vr?.status==="missed"?"Kaçırıldı":vr?.status==="rested"?"Dinlenme seçildi":type==="recovery"?"Recovery":"Doğrulanmamış"):(k===today?"Bugün":"Forecast");
   const statusClass=actual?"good":vr?.status==="missed"?"bad":past?"warn":type==="recovery"?"rest":"good";
   const preview=(cs?.items||[]).map(x=>x.name).slice(0,4).join(" · ");
   return `<div class="plan-day ${k===today?"today":""} ${k===trainingViewDate()?"selected":""}" role="button" tabindex="0" data-training-date="${k}" onclick="setTrainingViewDate('${k}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();setTrainingViewDate('${k}')}"><div class="date">${dayNameTr(d)} • ${k.slice(5)}</div><h4>${cs?.planName||p?.name||type}</h4><div class="shift">${(cs?.status||p?.status)==="work"?"Vardiya "+shiftLabel(cs?.shift||p?.shift):"İzin / serbest"}</div><div class="time">${cs?.window||p?.window||"—"}</div><div class="status ${statusClass}">${status} · ${(cs?.predictedReadiness??p?.predictedReadiness)?`≈${cs?.predictedReadiness??p?.predictedReadiness}/100`:""}</div><div class="session-version">canonical ${cs?.snapshotId?cs.snapshotId.split("_").slice(-1)[0]:"—"} · plan v${cs?.planVersion||p?.version||1}${cs?.locked?" · LOCK":""}</div>${preview?`<div class="canonical-preview">${preview}${(cs?.items||[]).length>4?" …":""}</div>`:""}<small class="edit-hint">Günü aç · kayıtları düzenle</small></div>`;
 }).join("");
}
renderWeeklyTrainingPlan=renderWeeklyTrainingPlanV5;
window.renderTrainingPlanSyncV81=function renderTrainingPlanSyncV81(){
 const badge=q("trainingPlanSyncBadge"),detail=q("trainingPlanSyncDetail");if(!badge||!detail)return;
 const date=trainingViewDate(),audit=window.TrainingSessionService?.audit?.(date),p=window.CanonicalSessionEngine?.get?.(date);
 const preview=q("guidedPrescriptionPreview"),identity=q("guidedPreviewIdentity"),today=q("todayTrainingPlan");
 // One rendered projection: same names, order, sets, rest and load, no second recommendation.
 if(preview&&today){preview.innerHTML=today.innerHTML;preview.dataset.snapshotId=p?.snapshotId||"";today.dataset.snapshotId=p?.snapshotId||""}
 if(identity)identity.textContent=`${date} · ${p?.planName||""} · ${p?.snapshotId||""}`;
 const ok=!!audit?.ok;
 badge.textContent=ok?"ORTAK REÇETE":"OTURUM ÇAKIŞMASI";badge.className=`plan-badge ${ok?"good":"bad"}`;
 detail.textContent=`${date} · ${p?.snapshotId||"—"} · Hareket, sıra, set/tekrar, yük ve dinlenme aynı kaynaktan. `+
   (audit?.runnerMode==="separate_session"?`Açık eski/telafi oturumu ayrı: ${audit.runnerTarget}. Bugünün başlatıcısı bu oturuma yönlendirmez.`:
    ok?(p?.locked?"Başlanmış reçete korunuyor.":"İlk sete kadar güncel verilerle yenilenir."):"Eski oturumun yeni set kaydı engellendi; kayıtlar korunarak uzlaştırma gerekiyor.");
}
function renderLifecycleStatusV5(){
 if(!q("activeAthleteDay"))return;const lc=lifecycleTick(false),tm=planForDate(addDaysKey(todayKey(),1));q("activeAthleteDay").textContent=lc.activeDay||todayKey();q("lastClosedDay").textContent=lc.lastClosedDay||"Henüz yok";q("todayTomorrowSession").textContent=tm?.name||"--";q("futurePlanState").textContent=`${Object.keys(db.futurePlans||{}).filter(k=>k>=todayKey()).length} gün planlı`;if(q("athleteDayBadge"))q("athleteDayBadge").textContent=`Sınır ${String(Number.isFinite(+db.settings.dayBoundaryHour)?+db.settings.dayBoundaryHour:0).padStart(2,"0")}:00`;
}
renderLifecycleStatus=renderLifecycleStatusV5;
function closeElapsedDaysV5(prevKey,newKey){
 const lc=ensureLifecycle();let cursor=prevKey,guard=0;
 while(cursor&&cursor!==newKey&&guard<60){
   const sum=summarizeDayClose(cursor);
   sum.adherence=sum.completion==="unverified"?null:(planAdherenceFor(cursor)?.score??null);
   sum.adaptation=sum.completion==="unverified"?null:adaptationSuccessFor(cursor);
   lc.closedDays[cursor]=lc.closedDays[cursor]||sum;
   if(sum.completion==="missed"&&!lc.missedDays.includes(cursor))lc.missedDays.push(cursor);
   if(sum.completion==="unverified"&&!lc.unverifiedDays.includes(cursor))lc.unverifiedDays.push(cursor);
   lc.lastClosedDay=cursor;cursor=addDaysKey(cursor,1);guard++;
 }
}
closeElapsedDays=closeElapsedDaysV5;
function renderCharacterV5(){renderCharacter();renderCharacterConfidence()}
function renderReportsV5(){renderDailyReport();renderWeeklyReport();renderMonthlyReport();renderNutritionAdvice();renderMuscleReport()}
renderReports=renderReportsV5;
function renderV5All(){safeRender(renderPainCoach);safeRender(renderCommandCenter);safeRender(renderPlanVsActual);safeRender(renderCharacterConfidence);safeRender(renderMuscleReport)}
function initTrainingDateNavigation(){
 q("trainingPrevDay")?.addEventListener("click",()=>setTrainingViewDate(addDaysKey(trainingViewDate(),-1)));
 q("trainingNextDay")?.addEventListener("click",()=>setTrainingViewDate(addDaysKey(trainingViewDate(),1)));
 q("trainingTodayDay")?.addEventListener("click",()=>resetTrainingViewToToday());
 let lastCalendar=calendarTodayKey();
 setInterval(()=>{
  const nowCalendar=calendarTodayKey();
  if(nowCalendar!==lastCalendar){
   lastCalendar=nowCalendar;db.uiState=db.uiState||{};db.uiState.trainingSelectedDate=calendarTodayKey();save();
   // UI rollover: records stay in dated stores, visible daily surfaces switch to the new day.
   safeRender(loadToday);safeRender(()=>window.renderTrainingAdaptive?.());safeRender(renderNutrition);safeRender(renderMuscleReport);safeRender(()=>refreshTrainingPlanner(false));
  }else if(q("muscleReport")||q("frontHeatmap")){safeRender(renderMuscleReport)}
 },60000);
}
window.trainingViewDate=trainingViewDate;window.setTrainingViewDate=setTrainingViewDate;window.resetTrainingViewToToday=resetTrainingViewToToday;window.calendarTodayKey=calendarTodayKey;

function refreshLifeOSV5(force=false){lifecycleTick(force);if(force)buildFuturePlanV5(14,"manual/data refresh");safeRender(renderLifecycleStatusV5);safeRender(renderTomorrowCoachV5);safeRender(renderCoachWeek);safeRender(renderWeeklyTrainingPlanV5);safeRender(renderTodayTrainingPlanV5);safeRender(renderTrainingPlanSyncV81);safeRender(renderCoachV5);safeRender(renderCommandCenter);safeRender(renderPainCoach)}
refreshTrainingPlanner=function(force=false){if(force)buildFuturePlanV5(14,"training planner refresh");safeRender(renderWeeklyTrainingPlanV5);safeRender(renderTodayTrainingPlanV5);safeRender(renderTrainingPlanSyncV81);};
window.refreshTrainingPlanner=refreshTrainingPlanner;
refreshLifeOS=refreshLifeOSV5;


function initBackupTools(){ /* v6.7: handled by backup-vault.js */ }


// v7.17: Safe bridge for scripts that must access lexical app state.
// `db` is declared with `let` and `FOODS` with `const`, so they are not window properties.
window.ALOSRuntime={
 version:"9.2.8",
 getDb:()=>db,
 getFoods:()=>FOODS,
 save:()=>save(),
 renderNutrition:()=>renderNutrition(),
 renderAnalytics:()=>renderAnalytics(),
 renderReports:()=>renderReports(),
 todayKey:()=>todayKey(),
 normalizeFoodRow:r=>normalizeFoodRow(r),
 foodSnapshot:(f,sv,meal,time)=>foodSnapshot(f,sv,meal,time),
 getPlan:k=>planForDate(k),
 getResolvedTemplate:k=>resolvedTemplate(k),
 getCanonicalTemplate:k=>canonicalTemplate(k),
 buildFuturePlan:(days=14,reason="runtime")=>buildFuturePlanV5(days,reason),
 getReadiness:k=>readiness(db.daily[k])
};
window.removeWaterLog=function(date,id){
 const row=(window.WaterLedger?.entries?.(db,date)||[]).find(x=>x.id===id);if(!row)return;
 if(!confirm(`${Math.round(row.ml)} ml su kaydı silinsin mi?`))return;
 const result=window.WaterLedger?.removeById?.(db,date,id);if(!result?.ok)return alert("Su kaydı silinemedi.");
 window.AthleteEventStore?.append?.("WATER_DELETED",{id,ml:row.ml},{id:`water_delete_${id}_${Date.now()}`,domain:"nutrition",athleteDay:date,source:"ui",kind:"measured",confidence:100});
 save();renderNutrition();renderReports();renderAnalytics();window.NutritionImpact?.render?.();
 const st=q("nutritionSaveStatus");if(st){st.textContent=`✓ ${Math.round(row.ml)} ml su silindi`;st.classList.add("ok")}
};



window.renderArchitectureV8=function renderArchitectureV8(){
 const grid=q("architectureCoreGrid"),decision=q("architectureDecisionPreview"),badge=q("architectureHealthBadge");if(!grid)return;
 const ev=window.AthleteEventStore?.health?.()||{},graph=window.EngineBus?.graph?.()||{engines:[],edges:[]},schema=window.SchemaMigration?.validate?.(db)||{},release=window.ReleaseIntegrityV8?.run?.()||{};
 const cal=window.PersonalCalibration?.nutritionMaintenance?.()||{},tissues=window.TissueLoadEngine?.rolling?.(14)||{},trend=window.PerformanceTrendV2?.summary?.("monthly")||{},solver=window.AdaptiveCoachSolver?.solve?.(todayKey(),planForDate(todayKey())?.type||"recovery");
 const highTissue=Object.entries(tissues).sort((a,b)=>(b[1].load||0)-(a[1].load||0))[0];
 grid.innerHTML=[
  ["Events",ev.eventCount||0],["Engines",graph.engines?.length||0],["Schema",schema.ok?"v9 OK":"Kontrol"],["Release",`${release.passed||0}/${release.total||0}`],
  ["Trend",trend.state||"—"],["Calib.",cal.confidence?`${cal.confidence}/100`:"öğreniyor"]
 ].map(([n,v])=>`<div class="mesh-metric"><span>${n}</span><strong>${v}</strong></div>`).join("");
 if(badge){badge.textContent=schema.ok&&release.passed===release.total?"CORE OK":"CHECK";badge.className=`plan-badge ${schema.ok&&release.passed===release.total?"good":"warn"}`;}
 if(decision)decision.textContent=`Aktif karar: ${window.CanonicalSessionEngine?.get?.(todayKey())?.planName||"—"}. `+
  `Tek reçete planlayıcısı kullanılır. Bağımsız solver senaryosu (${solver?.best?.type||"—"}) yürütülen antrenman değildir. `+
  `Trend: ${trend.comment||"Veri yetersiz"}. Doku yükü ve bakım kalorisi model tahminidir; klinik doğruluk yüzdesi değildir.`;
}

function init(){
 // Critical controls first: even if a secondary analysis widget fails, data entry remains usable.
 lifecycleTick(false);
 if(q("saveDailyBtn")) q("saveDailyBtn").onclick=saveDaily;
 if(q("saveShiftBtn")) q("saveShiftBtn").onclick=saveTodayShift;
 if(q("optimizeTodayBtn")) q("optimizeTodayBtn").onclick=()=>{safeRender(renderToday);safeRender(renderCoach)};
 if(q("saveWeekBtn")) q("saveWeekBtn").onclick=()=>persistWeeklyScheduleFromUI("weekly-manual-save",{rebuild:true});
 if(q("optimizeWeekBtn")) q("optimizeWeekBtn").onclick=()=>{optimizeWeek();buildFuturePlan(14);refreshLifeOS(true)};
 if(q("rebuildTrainingPlanBtn")) q("rebuildTrainingPlanBtn").onclick=()=>{buildFuturePlan(14);refreshLifeOS(true);safeRender(renderCoachMonth);safeRender(renderCoachTwelve)};
 if(q("bodyDate")) q("bodyDate").value=todayKey();
 if(q("saveBodyBtn")) q("saveBodyBtn").onclick=saveBodyMeasurement;

 safeRender(renderNav);safeRender(initDate);safeRender(initWeek);safeRender(initTraining);safeRender(bindTrainingV5);safeRender(initNutrition);
 safeRender(socialDialog);safeRender(initSettings);safeRender(initDetailedTabs);safeRender(initReportTabs);
 safeRender(loadToday);safeRender(renderAnalytics);safeRender(renderDetailed);safeRender(renderReports);
 safeRender(renderCoachV5);safeRender(renderCoachWeek);safeRender(renderCoachMonth);safeRender(renderCoachTwelve);safeRender(renderTomorrowCoachV5);safeRender(renderLifecycleStatusV5);safeRender(initTrainingDateNavigation);safeRender(initCharacterInputs);safeRender(renderCharacter);safeRender(renderCharacterConfidence);safeRender(()=>refreshTrainingPlanner(false));safeRender(initCoachTabs);safeRender(initQuickNav);safeRender(initMuscleReport);safeRender(initBackupTools);safeRender(renderPainCoach);safeRender(renderCommandCenter);
}
// Load all engines before the first planner/render pass.
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
window.addEventListener("beforeunload",()=>{try{window.ALOSFlushPendingUIState?.("beforeunload")}catch(e){}});
window.addEventListener("pagehide",()=>{try{window.ALOSFlushPendingUIState?.("pagehide")}catch(e){}});

setInterval(()=>refreshLifeOS(false),60000);

window.__ATHLETE_LIFE_OS_V5_READY__=true;
if("serviceWorker" in navigator && location.protocol.startsWith("http")){navigator.serviceWorker.register("service-worker.js").catch(()=>{});}
