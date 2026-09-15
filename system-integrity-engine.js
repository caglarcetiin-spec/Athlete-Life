(function(){
"use strict";
let lastReport=null;
const MODULES=["AthleteLoadMesh","CanonicalSessionEngine","LoadPrescriptionEngine","HealthStateEngine","NutritionLedger","PeriodicTrendEngine","MovementIntelligence","AdHocSession","PainIntelligence","PainIntelligenceCore","BodyMap3D","AdherenceGuardian","GapReconciliation","AthleteProfile","NutritionImpact","RestIntervalEngine","GuidedWorkout","GuidedWorkoutCore","SubstitutionIntelligenceCore","RecordManager","BackupVault","AthleteEventStore","EngineBus","DataLineage","SchemaMigration","AdaptiveCoachSolver","PersonalCalibration","PerformanceTrendV2","TissueLoadEngine","AdaptiveNutrition","ReleaseIntegrityV8"];
const CRITICAL_DATA=["settings","daily","foodLogs","water","trainingLogs","painLogs","bodyMeasurements","capabilityRecords","futurePlans","sessionPrescriptions","planHistory","sessionFeedback","adherencePlans","gapReconciliation","adHocSessions","guidedWorkoutHistory","lifecycle","adaptiveModel","runs","photoProgress"];
function clone(x){return JSON.parse(JSON.stringify(x))}
function finite(x){return Number.isFinite(Number(x))}
function makeStorageSnapshot(){try{return localStorage.getItem("athleteLifeOS")}catch(e){return null}}
function restoreStorage(v){try{if(v==null)localStorage.removeItem("athleteLifeOS");else localStorage.setItem("athleteLifeOS",v)}catch(e){}}
function result(list,category,name,ok,detail="",level="error"){list.push({category,name,ok:!!ok,detail:String(detail??""),level})}
function sandboxBase(){
 return {
  settings:{targetSleep:8,prep:45,commute:35,targetProtein:150,targetCalories:2850,targetWater:3,targetWeight:76,nutritionGoalMode:"auto",programStartDate:null,dayBoundaryHour:4,lateSessionCutoffHour:4,guidedAutoRest:true,guidedSound:false},
  meta:{version:5},daily:{},week:{},foodLogs:{},trainingLogs:{},painLogs:{},water:{},waterLogs:{},social:{},scheduleByDate:{},planHistory:{},sessionFeedback:{},futurePlans:{},sessionPrescriptions:{},adherencePlans:{},deviationReasons:{},gapReconciliation:{},bodyMeasurements:[],capabilityRecords:[],adHocSessions:[],guidedWorkoutHistory:[],runs:[],photoProgress:[],adaptiveModel:{},lifecycle:{closedDays:{},missedDays:[],unverifiedDays:[]}
 };
}
function fillNutritionAndSleep(t){
 for(let i=13;i>=0;i--){
  const k=addDaysKey(t,-i);
  db.daily[k]={sleepTime:"00:00",wakeTime:"08:00",sleepQuality:4,energy:4,motivation:4,soreness:2,joint:4,stress:2,weight:72+(13-i)*.02,workStatus:"off",shift:"morning"};
  db.water[k]=3000;
  db.foodLogs[k]=[
   {name:"fixture-a",kcal:1400,p:80,c:170,f:40,fiber:15,sugar:10,sodium:1000,potassium:1800,calcium:500,iron:4,magnesium:200,zinc:6,vitC:50,vitD:8,b12:2,folate:200,caf:0,water:500},
   {name:"fixture-b",kcal:1450,p:80,c:180,f:45,fiber:15,sugar:10,sodium:1000,potassium:1800,calcium:500,iron:4,magnesium:200,zinc:6,vitC:50,vitD:8,b12:2,folate:200,caf:0,water:500}
  ];
 }
}
async function run(){
 const tests=[],started=Date.now(),originalRef=db,original=clone(db),stored=makeStorageSnapshot();window.__SYSTEM_INTEGRITY_RUNNING__=true;
 const progress=q("systemIntegrityProgress");if(progress){progress.className="insight-box neutral";progress.textContent="Sandbox hazırlanıyor; motorlar birbirine karşı test ediliyor…"}
 try{
  // Runtime contract
  result(tests,"Runtime","Ana uygulama hazır",!!window.__ATHLETE_LIFE_OS_V5_READY__);
  MODULES.forEach(k=>result(tests,"Runtime",`Motor: ${k}`,!!window[k],window[k]?"loaded":"missing"));
  const runtimeUndefined=MODULES.filter(k=>!window[k]);
  result(tests,"Runtime","Motor ağı eksiksiz",runtimeUndefined.length===0,runtimeUndefined.join(", "));
  result(tests,"Runtime","Adaptive Intelligence API",typeof window.renderAdaptiveIntelligence==="function"&&typeof window.selectedSessionTargetKey==="function"&&typeof window.rowsForTarget==="function");
  result(tests,"Runtime","Session Router API",typeof window.sessionActualKey==="function"&&typeof window.initSessionRouter==="function");
  result(tests,"Data Contract","Kritik veri konteynerleri mevcut",CRITICAL_DATA.every(k=>original[k]!==undefined),CRITICAL_DATA.filter(k=>original[k]===undefined).join(", "));

  // Catalog contract on actual app catalog
  const cat=window.MovementIntelligence?.coachCatalogAudit?.();
  result(tests,"Movement","Coach ↔ hareket kataloğu",!!cat?.ok,cat?.issues?.map(x=>`${x.name}: ${x.reason}`).join(" | ")||`${cat?.valid||0}/${cat?.total||0}`);
  result(tests,"Movement","Front Lever = saniye",window.movementKnowledge?.("Front Lever")?.metric==="seconds");
  result(tests,"Movement","Front Lever Pull / Raise = tekrar",window.movementKnowledge?.("Front Lever Pull / Raise")?.metric==="reps");
  result(tests,"Movement","Weighted Pull-Up = tekrar + dış yük",window.movementKnowledge?.("Weighted Pull-Up")?.metric==="reps"&&window.movementKnowledge?.("Weighted Pull-Up")?.type==="WEIGHTED");
  const bd=window.BodyMap3D?.diagnostics?.();
  result(tests,"3D Body Map","3D motor API",!!bd,JSON.stringify(bd||{}));
  result(tests,"3D Body Map","Eklem anchor kapsamı",["shoulder","elbow","wrist","hip","knee","ankle","foot"].every(x=>bd?.jointAnchors?.includes(x)),(bd?.jointAnchors||[]).join(", "));

  // Sandbox starts here.
  db=sandboxBase();
  const t=todayKey();fillNutritionAndSleep(t);

  // Health / illness / fatigue -> readiness & Coach guard
  const healthy=window.HealthStateEngine?.assess?.({healthStatus:"normal",fatigueLevel:0,illnessSeverity:0});
  const fatigued=window.HealthStateEngine?.assess?.({healthStatus:"fatigued",fatigueLevel:8,illnessSeverity:0});
  const sick=window.HealthStateEngine?.assess?.({healthStatus:"sick",illnessSeverity:8,healthFever:true});
  result(tests,"Health State","Normal sağlık yük azaltmıyor",healthy?.action==="normal"&&healthy?.readinessPenalty===0,JSON.stringify(healthy));
  result(tests,"Health State","Halsizlik hacmi azaltıyor",fatigued?.volumeFactor<1&&fatigued?.readinessPenalty>=20,JSON.stringify(fatigued));
  result(tests,"Health State","Ateş/hastalık hard training'i durduruyor",sick?.action==="stop_hard_training"&&sick?.volumeFactor===0,JSON.stringify(sick));

  // Nutrition ledger append/persistence semantics
  const nf1=window.NutritionLedger?.snapshot?.({id:"water",n:"Maden suyu",cat:"İçecek",serv:"200 ml",kcal:0,p:0,c:0,f:0,water:200,calcium:100,magnesium:30,sodium:120},1,"Ara","12:00");
  const nf2=window.NutritionLedger?.snapshot?.({id:"meatball",n:"Köfte, dana",cat:"Et",serv:"150 g",kcal:330,p:30,c:8,f:20,iron:3,zinc:5},1,"Öğle","13:00");
  db.foodLogs[t]=[];const a1=window.NutritionLedger?.append?.(db,t,nf1),a2=window.NutritionLedger?.append?.(db,t,nf2),nt=window.NutritionLedger?.totals?.(db.foodLogs[t],[]);
  result(tests,"Nutrition Ledger","İkinci besin ilkini silmiyor",a1?.ok&&a2?.ok&&db.foodLogs[t].length===2,db.foodLogs[t].map(x=>x.name).join(" + "));
  result(tests,"Nutrition Ledger","Besin snapshot değerleri okunuyor",nt.water===200&&nt.kcal===330&&nt.p===30&&nt.calcium===100,JSON.stringify(nt));

  // Periodic trend classification
  db.trainingLogs={};
  for(let i=55;i>=28;i-=7){const k=addDaysKey(t,-i);db.trainingLogs[k]=[{name:"Weighted Pull-Up",type:"WEIGHTED",load:25,sets:[5,5,5],rir:2}]}
  for(let i=27;i>=0;i-=7){const k=addDaysKey(t,-i);db.trainingLogs[k]=[{name:"Weighted Pull-Up",type:"WEIGHTED",load:35,sets:[5,5,5],rir:2}]}
  const pt=window.PeriodicTrendEngine?.exerciseTrend?.("Weighted Pull-Up","monthly",t);
  result(tests,"Periodic Trend","Aylık yükseliş algılanıyor",pt?.state==="rising"&&pt?.delta>3,JSON.stringify(pt));

  // Restore nutrition fixtures before Nutrition Impact
  db.foodLogs={};db.trainingLogs={};fillNutritionAndSleep(t);

  // Nutrition -> adaptation
  const ni=window.NutritionImpact?.build?.();
  result(tests,"Nutrition","14G beslenme coverage",ni?.n?.days>=10,ni?.n?.days);
  result(tests,"Nutrition","Protein adequacy",finite(ni?.protein?.score)&&ni.protein.score>=85,ni?.protein?.score);
  result(tests,"Nutrition","Nutrition Impact skorları sonlu",[ni?.hyper,ni?.fuel,ni?.retain,ni?.phase?.score,ni?.conf].every(finite),JSON.stringify({hyper:ni?.hyper,fuel:ni?.fuel,retain:ni?.retain,phase:ni?.phase?.score,confidence:ni?.conf}));

  // Load Prescription: history-first; otherwise bodyweight/profile baseline.
  const hammerBase=window.LoadPrescriptionEngine?.recommend?.("DB Hammer Curl","2×10–15",t,{readinessScore:80});
  result(tests,"Load Prescription","DB Hammer Curl başlangıç yükü",hammerBase?.applicable&&hammerBase?.value===8&&hammerBase?.unit==="per_dumbbell",JSON.stringify(hammerBase));
  db.trainingLogs[t]=[{name:"DB Hammer Curl",type:"WEIGHTED",load:8,sets:[15,15],rir:2,metricUnit:"reps"}];
  const hammerProg=window.LoadPrescriptionEngine?.recommend?.("DB Hammer Curl","2×10–15",t,{readinessScore:80});
  result(tests,"Load Prescription","DB Hammer üst sınır → yük artışı",hammerProg?.value===10&&hammerProg?.source==="history",JSON.stringify(hammerProg));
  db.trainingLogs[t]=[];

  // Training -> muscle -> science
  db.trainingLogs[t]=[
   {name:"Front Lever",type:"STATIC",sets:[8,8,7,7],rir:2,metricUnit:"seconds",executionEquipment:"Pull-Up Bar"},
   {name:"Weighted Pull-Up",type:"WEIGHTED",load:35,sets:[5,5,5,5,5],rir:2,metricUnit:"reps",executionEquipment:"Pull-Up Bar",plannedRestSec:180,restBetweenSets:[180,175,185,180]}
  ];
  const staticDose=window.exerciseDoseUnits?.(db.trainingLogs[t][0]);
  result(tests,"Training","Statik saniye bounded stimulus",finite(staticDose)&&staticDose>2&&staticDose<6,staticDose);
  const stim=muscleStimulus(7,t);
  result(tests,"Training","Antrenman → lat stimulus",stim.lats>5,stim.lats);
  result(tests,"Training","Antrenman → biceps stimulus",stim.biceps>2,stim.biceps);
  const sci=scienceTrendForMuscle("lats",t);
  result(tests,"Science","Kas stimulus → Science Trend",finite(sci.expected)&&finite(sci.recovery),JSON.stringify({expected:sci.expected,recovery:sci.recovery,protein:sci.protein?.score}));

  // Rest -> performance interpretation
  const rest=window.RestIntervalEngine?.assessRow?.({name:"Weighted Pull-Up",sets:[5,4,3],rir:1,plannedRestSec:180,restBetweenSets:[70,65]});
  const restAdvice=window.RestIntervalEngine?.rowAdvice?.({name:"Weighted Pull-Up",sets:[5,4,3],rir:1,plannedRestSec:180,restBetweenSets:[70,65]});
  result(tests,"Rest","Kısa dinlenme algılanıyor",rest?.shortCount===2,JSON.stringify(rest));
  result(tests,"Rest","Rest → set kalite önerisi",typeof restAdvice==="string"&&restAdvice.length>20,restAdvice);

  // Pain -> coach -> 3D
  db.painLogs[t]=[{id:"test_wrist",date:t,joint:"wrist",side:"left",severity:6,context:"movement",onset:"gradual",sensation:"ache",durationDays:2,triggerExercise:"Full Planche",redFlags:{},status:"active"}];
  const pa=window.PainIntelligence?.exerciseAdvice?.("Full Planche",t),hot=window.PainIntelligence?.activeHotspots?.(t)||[];
  result(tests,"Pain","Sol bilek → Planche risk",pa?.level>=2,pa?.short);
  result(tests,"Pain","Pain → legacy/Coach bridge",painForDate(t).wrist===6,painForDate(t).wrist);
  result(tests,"Pain","Pain → 3D side hotspot",hot.some(x=>x.joint==="wrist"&&x.side==="left"&&x.severity===6),JSON.stringify(hot));
  db.painLogs[t].push({id:"red",date:t,joint:"shoulder",side:"right",severity:5,onset:"trauma",redFlags:{weakness:true},status:"active"});
  const redAdvice=window.PainIntelligence?.exerciseAdvice?.("OHP",t);result(tests,"Pain","Red flag → yüksek güvenlik seviyesi",redAdvice?.level===3,redAdvice?.short);

  // Readiness -> coach modifier
  db.futurePlans[t]={key:t,type:"pull",name:"Pull + Front Lever",window:"11:00–12:15",status:"off",shift:"morning",predictedReadiness:90,version:1};
  db.painLogs={};
  db.daily[t]={sleepTime:"00:00",wakeTime:"08:00",sleepQuality:5,energy:5,motivation:5,soreness:1,joint:5,stress:1,workStatus:"off",shift:"morning"};
  const high=resolvedTemplate(t),highR=readiness(db.daily[t]);
  db.daily[t]={sleepTime:"03:30",wakeTime:"08:00",sleepQuality:1,energy:1,motivation:1,soreness:5,joint:1,stress:5,workStatus:"off",shift:"morning"};
  const low=resolvedTemplate(t),lowR=readiness(db.daily[t]);
  result(tests,"Coach","Readiness değişiyor",highR>lowR,`${highR} → ${lowR}`);
  result(tests,"Coach","Düşük readiness → hacim azaltımı",low.modifier.volume<high.modifier.volume,`${high.modifier.volume} → ${low.modifier.volume}`);
  result(tests,"Coach","Coach reçeteleri Guided parser ile uyumlu",high.items.every(x=>GuidedWorkoutCore.parsePrescription(x.prescription,movementKnowledge(x.name)?.metric||"reps").setCount>=1));

  // Guided core and manual reconciliation
  const gc=window.GuidedWorkoutCore;
  const row={sets:[],guidedTiming:[],restBetweenSets:[],setDurationsSec:[]};
  gc.writeSet(row,0,{value:4,workSec:8,workScore:95,metric:"reps"});gc.writeRest(row,0,180,{target:180,score:100,status:"target"});gc.writeSet(row,1,{value:4,workSec:8.5,workScore:96,metric:"reps"});
  result(tests,"Guided Runner","Set1 → Rest → Set2 persist",gc.savedSetCount(row)===2&&row.restBetweenSets[0]===180,JSON.stringify(row));
  const prog=gc.firstIncompleteByCount([{setCount:3},{setCount:4}],i=>i===0?3:2);
  result(tests,"Guided Runner","Manuel kayıt → kaldığı yer",prog.exerciseIndex===1&&prog.setIndex===2,JSON.stringify(prog));
  result(tests,"Guided Runner","NaN progress guard",gc.safeProgress(NaN,NaN)==="—"&&gc.safeProgress(2,4)==="2/4");
  const partialItems=[{name:"A",setCount:5},{name:"B",setCount:3}],counts=[2,0],closures={0:{status:"partial",reason:"fatigue"}};
  const partialProgress=gc.firstUnresolved(partialItems,i=>counts[i],i=>closures[i]||null),partialSummary=gc.completionSummary(partialItems,i=>counts[i],i=>closures[i]||null);
  result(tests,"Guided Runner","2/5 sette hareketi kapat → sonraki hareket",partialProgress.exerciseIndex===1&&partialProgress.setIndex===0,JSON.stringify(partialProgress));
  result(tests,"Guided Runner","Kısmi setler completion yüzdesine işleniyor",partialSummary.status==="partial"&&partialSummary.performedSets===2&&partialSummary.plannedSets===8&&partialSummary.completionPct===25,JSON.stringify(partialSummary));
  const subCore=window.SubstitutionIntelligenceCore;
  const subBad=subCore?.score?.({name:"Ring Row",pattern:"Horizontal pull",muscles:{upperBack:1,lats:.8,biceps:.7},qualities:{strength:6,hypertrophy:9,stability:8}},{name:"Ring Dip",pattern:"Vertical push",muscles:{chest:1,triceps:.9,frontDelts:.7},qualities:{strength:7,hypertrophy:9,stability:9}});
  result(tests,"Substitution","Ring Row → Ring Dip düşük eşleşme",!!subBad&&subBad.score<40&&subBad.plannedAction==="pull"&&subBad.actualAction==="push",JSON.stringify(subBad));
  const subSummary=gc.completionSummary([{name:"Ring Row",setCount:3},{name:"Curl",setCount:3}],()=>0,i=>i===0?{status:"substituted",replacementSets:3,similarityPct:20,actualMovement:"Ring Dip"}:null);
  result(tests,"Substitution","Kabul edilen farklı hareket Runner slotunu çözer ama fidelity düşer",subSummary.substitutionExercises===1&&subSummary.completionPct===50&&subSummary.planFidelityPct<20,JSON.stringify(subSummary));

  // Ad hoc -> muscle/recovery, but NOT planned completion/adherence/lifecycle
  const past=addDaysKey(t,-1);
  db.futurePlans[past]={key:past,type:"pull",name:"Pull",status:"off",shift:"morning",window:"11:00–12:00",predictedReadiness:80,version:1};
  db.daily[past]={sleepTime:"00:00",wakeTime:"08:00",sleepQuality:4,energy:4,motivation:4,soreness:2,joint:4,stress:2};
  const adHocFixtureRows=[
   {name:"Push-Up",type:"DYNAMIC",sets:[15,15,15],rir:2,source:"ad_hoc",planContribution:false,scheduledFor:past},
   {name:"Bodyweight Squat",type:"DYNAMIC",sets:[20,20,20],rir:2,source:"ad_hoc",planContribution:false,scheduledFor:past}
  ];
  db.trainingLogs[past]=clone(adHocFixtureRows);
  const adh=window.AdherenceGuardian?.dailyAdherence?.(past),close=summarizeDayClose(past),adhRows=window.AdherenceGuardian?.rowsForPlan?.(past)||[],adhStim=muscleStimulus(2,t);
  result(tests,"Ad Hoc","Plan uyumundan hariç",adhRows.length===0&&(adh?.complete==null||adh.complete===0),JSON.stringify({rows:adhRows.length,complete:adh?.complete}));
  result(tests,"Ad Hoc","Lifecycle planı yanlış tamamlamıyor",close.completion==="extra_training",JSON.stringify(close));
  db.sessionFeedback[past]={targetPlanDate:past,completionPct:40,completionStatus:"partial",completedAt:new Date().toISOString()};db.trainingLogs[past]=[{name:"Muscle-Up",sets:[3,3],scheduledFor:past,planContribution:true}];const partialClose=summarizeDayClose(past);result(tests,"Lifecycle","Kısmi plan günü completed değil modified kapanıyor",partialClose.completion==="modified",JSON.stringify(partialClose));
  result(tests,"Ad Hoc","Ek seans kas yüküne dahil",adhStim.chest>0&&adhStim.quads>0,JSON.stringify({chest:adhStim.chest,quads:adhStim.quads}));
  const dense=window.AdHocSession?.densityClass?.({structure:"continuous",exerciseRest:0,roundRest:20,duration:12,rpe:8});
  // Use the dedicated circuit fixture: lifecycle assertions above intentionally mutate db.trainingLogs[past].
  const adhAnalysis=window.AdHocSession?.summarizeRows?.(clone(adHocFixtureRows),{duration:12,rpe:8,density:dense});
  result(tests,"Ad Hoc","Circuit density sınıflandırması",dense?.key==="very_high"&&dense.score>=90,JSON.stringify(dense));
  result(tests,"Ad Hoc","Ad Hoc → work capacity / recovery cost",finite(adhAnalysis?.workCapacity)&&finite(adhAnalysis?.fatigue)&&adhAnalysis.workCapacity>50,JSON.stringify({work:adhAnalysis?.workCapacity,fatigue:adhAnalysis?.fatigue}));
  // Universal Physiology: every movement class gets its own model and common output schema.
  const modelFixtures=[
   [{name:"Front Lever",type:"STATIC",sets:[8,8,7,7],rir:2,restBetweenSets:[180,180,180]},"static_isometric"],
   [{name:"Weighted Pull-Up",type:"WEIGHTED",load:35,sets:[5,5,5,5,5],rir:2,restBetweenSets:[180,180,180,180]},"loaded_dynamic"],
   [{name:"Muscle-Up",type:"DYNAMIC",sets:[3,3,3],rir:2,restBetweenSets:[180,180]},"explosive_skill"],
   [{name:"Ring Row",type:"DYNAMIC",sets:[12,12,10],rir:2,restBetweenSets:[90,90]},"bodyweight_dynamic"],
   [{name:"Zone 2 Run",type:"RUN",sets:[5.7],metricUnit:"km",sessionDurationMin:39,sessionRpe:4},"continuous_aerobic"],
   [{name:"Mobility",type:"MOBILITY",sets:[15],metricUnit:"minutes",sessionRpe:2},"mobility_recovery"]
  ];
  modelFixtures.forEach(([row,expected])=>{
   const im=window.AthleteLoadMesh?.movementImpact?.(row,{date:past,rpe:row.sessionRpe||7,duration:row.sessionDurationMin||0});
   result(tests,"Universal Physiology",`${row.name} → ${expected}`,im?.mode===expected&&["mechanical","metabolic","neural","skill","cardiovascular","stability"].every(k=>finite(im?.demands?.[k]))&&finite(im?.loads?.recoveryCost),JSON.stringify({mode:im?.mode,demands:im?.demands,recovery:im?.loads?.recoveryCost}));
  });
  const stamped={name:"Weighted Pull-Up",type:"WEIGHTED",load:35,sets:[5,5,5],rir:2,restBetweenSets:[180,180]};
  window.AthleteLoadMesh?.stampRow?.(stamped,past);
  result(tests,"Universal Physiology","Training row → physiology snapshot",stamped?.physiologySnapshot?.version==="7.14"&&stamped?.physiologySnapshot?.mode==="loaded_dynamic",JSON.stringify(stamped.physiologySnapshot));

  // Sprint / Physiology Mesh: duration + rounds + rest + RPE must propagate across engines.
  const sprintSession={id:"sprint_fixture",date:past,structure:"straight_sets",rounds:6,duration:12,rpe:9,exerciseRest:0,roundRest:60,density:{key:"moderate",label:"Orta",score:62}};
  const sprintRow={name:"Sprint",type:"RUN",sets:[8,8,8,8,8,8],metricUnit:"seconds",restBetweenSets:[60,60,60,60,60],plannedRestSec:60,sessionRpe:9,sessionDurationMin:12,sprintDistanceM:50,source:"ad_hoc",planContribution:false};
  const sprintImpact=window.AthleteLoadMesh?.sessionImpact?.(sprintSession,[sprintRow]);
  result(tests,"Physiology Mesh","Sprint metric = çalışma saniyesi",window.movementKnowledge?.("Sprint")?.metric==="seconds"&&window.movementKnowledge?.("Sprint")?.doseModel==="sprint_work_seconds",JSON.stringify(window.movementKnowledge?.("Sprint")));
  result(tests,"Physiology Mesh","6×8 sn sprint → 48 sn work",Math.round(sprintImpact?.movementImpacts?.[0]?.totalWorkSec||0)===48,JSON.stringify(sprintImpact?.movementImpacts?.[0]));
  result(tests,"Physiology Mesh","Sprint → phosphagen/power signal",(sprintImpact?.energySystems?.phosphagen||0)>=70&&(sprintImpact?.adaptation?.neuromuscularPower||0)>=70,JSON.stringify({energy:sprintImpact?.energySystems,adapt:sprintImpact?.adaptation}));
  result(tests,"Physiology Mesh","Sprint → high-speed exposure",(sprintImpact?.loads?.highSpeedExposureSec||0)>=40&&sprintImpact?.loads?.totalSprintDistanceM===300,JSON.stringify(sprintImpact?.loads));
  const sprintAnalysis=window.AdHocSession?.analyzeSession?.(sprintSession,[sprintRow]);
  result(tests,"Physiology Mesh","Ad Hoc → shared physiology analysis",!!sprintAnalysis?.physiology&&finite(sprintAnalysis?.physiology?.loads?.recoveryCost),JSON.stringify({recovery:sprintAnalysis?.physiology?.loads?.recoveryCost,confidence:sprintAnalysis?.physiology?.confidence}));
  // Keep the sprint fixture active while all downstream contracts are checked.
  db.adHocSessions=[{...sprintSession,analysis:{physiology:sprintImpact,mesh:sprintImpact}}];db.trainingLogs[past]=[clone(sprintRow)];
  const rollingMesh=window.AthleteLoadMesh?.rolling?.(7,t);
  result(tests,"Physiology Mesh","Saved Ad Hoc → rolling load mesh",(rollingMesh?.highSpeedExposureSec||0)>=40&&(rollingMesh?.sessionRpeAU||0)>0,JSON.stringify(rollingMesh));
  const sprintStim=muscleStimulus(7,t);result(tests,"Physiology Mesh","Sprint → muscle map hamstring/glute",(sprintStim.hamstrings||0)>0&&(sprintStim.glutes||0)>0,JSON.stringify({ham:sprintStim.hamstrings,glute:sprintStim.glutes}));
  const sprintInter=interferenceScience("hamstrings",t);result(tests,"Physiology Mesh","Sprint → Science interference context",(sprintInter.highSpeedSec||0)>=40,JSON.stringify(sprintInter));
  const sprintNut=window.NutritionImpact?.build?.();result(tests,"Physiology Mesh","Sprint → Nutrition load context",(sprintNut?.load?.highIntensitySec||0)>=40,JSON.stringify(sprintNut?.load));

  // Now switch to a planned strength fixture for planned/manual contracts.
  db.trainingLogs[past]=[{name:"Weighted Pull-Up",type:"WEIGHTED",load:35,sets:[5,5,5,5,5],rir:2,restBetweenSets:[180,180,180,180],scheduledFor:past,planContribution:true}];
  db.adHocSessions=[];
  db.sessionFeedback[past]={duration:55,rpe:8,completionPct:100,completionStatus:"completed"};
  const plannedMesh=window.AthleteLoadMesh?.rolling?.(7,t);
  result(tests,"Universal Physiology","Planlı/manuel kayıt → shared rolling mesh",plannedMesh?.sessions>=1&&(plannedMesh?.mechanicalDemand||0)>0&&(plannedMesh?.neuralDemand||0)>0,JSON.stringify(plannedMesh));
  const pen=window.AthleteLoadMesh?.systemicPenalty?.(t,"pull");
  result(tests,"Universal Physiology","Shared mesh → Coach systemic context",finite(pen?.mechanicalDemand)&&finite(pen?.neuralDemand),JSON.stringify(pen));
  db.trainingLogs[past]=[{name:"Muscle-Up",type:"DYNAMIC",sets:[3,3,3],rir:2,scheduledFor:past,planContribution:true},{name:"Front Lever",type:"STATIC",sets:[8,8,8,8],rir:2,scheduledFor:past,planContribution:true}];
  const plannedRows=window.AdherenceGuardian?.rowsForPlan?.(past)||[];const adh2=window.AdherenceGuardian?.dailyAdherence?.(past);
  result(tests,"Adherence","Plan-contributing kayıtlar görülüyor",plannedRows.length===2&&adh2?.complete>0,JSON.stringify({rows:plannedRows.length,complete:adh2?.complete}));

  // Adaptive attribution: actual date and scheduled plan date remain separate.
  const targetPast=addDaysKey(t,-2);db.trainingLogs[t]=[{name:"Pull-Up",type:"DYNAMIC",sets:[8,8,8],rir:2,scheduledFor:targetPast,performedAt:new Date().toISOString()}];
  const attributed=window.rowsForTarget?.(targetPast)||[];
  result(tests,"Adaptive","Gerçek gün ↔ plan tarihi attribution",attributed.length===1&&attributed[0]._actualKey===t,JSON.stringify(attributed));
  result(tests,"Adaptive","Backfill confidence stimulus azaltıyor",effectiveSetFactor({rir:2,dataConfidence:"medium"})<effectiveSetFactor({rir:2,dataConfidence:"high"}),`${effectiveSetFactor({rir:2,dataConfidence:"medium"})} < ${effectiveSetFactor({rir:2,dataConfidence:"high"})}`);

  // Measurement evidence and running interference feed Science Trend.
  db.bodyMeasurements=[{date:addDaysKey(t,-56),weight:71,armR:34,thighR:51,waist:82},{date:t,weight:72,armR:35,thighR:52,waist:81}];
  const growth=growthMetricForMuscle("biceps",56);result(tests,"Science","Çevre ölçümü → measured growth evidence",!!growth&&growth.pct>0,JSON.stringify(growth));
  for(let i=0;i<7;i++){const k=addDaysKey(t,-i);db.daily[k]=db.daily[k]||{};db.daily[k].runKm=4;}
  const inter=interferenceScience("quads",t);result(tests,"Science","Koşu yükü → leg interference context",finite(inter.score)&&inter.runKm>=20,JSON.stringify(inter));

  // Capability -> identity
  db.bodyMeasurements=[{date:t,weight:72,waist:81}];
  db.capabilityRecords=[
   {id:1,domain:"calisthenics",testId:"full_planche",value:5,date:t,dataConfidence:"high"},
   {id:2,domain:"calisthenics",testId:"front_lever",value:15,date:t,dataConfidence:"high"},
   {id:3,domain:"strength",testId:"weighted_pullup",load:35,reps:5,bodyweight:72,date:t,dataConfidence:"high"},
   {id:4,domain:"running",testId:"5k",distanceKm:5,minutes:30,date:t,dataConfidence:"high"},
   {id:5,domain:"power",testId:"vertical_jump",value:45,date:t,dataConfidence:"high"},
   {id:6,domain:"power",testId:"max_pullups",value:18,date:t,dataConfidence:"high"}
  ];
  const dom=window.AthleteProfile?.domainSummary?.(),ident=window.AthleteProfile?.identity?.(dom);
  result(tests,"Athlete Identity","Capability → domain scores",Object.values(dom||{}).filter(x=>x.score!=null).length>=4,JSON.stringify(dom));
  result(tests,"Athlete Identity","Domain scores → athlete identity",!!ident?.name&&finite(ident.coverage),JSON.stringify(ident));

  // Gap reconciliation: no log remains pending, not silently missed.
  const gapDate=addDaysKey(t,-3);db.futurePlans[gapDate]={key:gapDate,type:"push",name:"Push",status:"off",shift:"morning",window:"11:00–12:00",predictedReadiness:80,version:1};delete db.trainingLogs[gapDate];delete db.gapReconciliation[gapDate];
  const pending=window.GapReconciliation?.scanPending?.()||[];
  result(tests,"Gap Reconciliation","Kayıtsız plan → doğrulama bekliyor",pending.some(x=>x.key===gapDate),pending.map(x=>x.key).join(", "));

  // Backup payload: all data survives portable serialization.
  const payload=await window.BackupVault?.selfTestPayload?.();
  const pData=payload?.data||{};
  const backupCritical=["daily","trainingLogs","foodLogs","water","painLogs","adHocSessions","capabilityRecords","futurePlans","planHistory","adherencePlans","gapReconciliation","lifecycle","adaptiveModel","guidedWorkoutHistory"];
  result(tests,"Data Vault","Portable payload oluşturuluyor",!!payload&&payload.format==="alos-portable-backup",payload?.appVersion);
  result(tests,"Data Vault","Kritik veri alanları payload içinde",backupCritical.every(k=>pData[k]!==undefined),backupCritical.filter(k=>pData[k]===undefined).join(", "));
  const merged=window.BackupVault?.mergeDB?.({lifecycle:{closedDays:{a:{completion:"completed"}},missedDays:["m1"],unverifiedDays:[]},guidedWorkoutHistory:[{id:"g1"}],adaptiveModel:{a:1},runs:[{id:"r1"}]},{lifecycle:{closedDays:{b:{completion:"rested"}},missedDays:["m2"],unverifiedDays:["u1"]},guidedWorkoutHistory:[{id:"g2"}],adaptiveModel:{b:2},runs:[{id:"r2"}]});
  result(tests,"Data Vault","Merge lifecycle geçmişini koruyor",!!merged?.lifecycle?.closedDays?.a&&!!merged?.lifecycle?.closedDays?.b&&merged.lifecycle.missedDays.includes("m1")&&merged.lifecycle.missedDays.includes("m2"),JSON.stringify(merged?.lifecycle));
  result(tests,"Data Vault","Merge guided/adaptive/runs koruyor",merged?.guidedWorkoutHistory?.length===2&&merged?.adaptiveModel?.a===1&&merged?.adaptiveModel?.b===2&&merged?.runs?.length===2,JSON.stringify({guided:merged?.guidedWorkoutHistory?.length,adaptive:merged?.adaptiveModel,runs:merged?.runs?.length}));
  const merged2=window.BackupVault?.mergeDB?.({photoProgress:[{id:"p1"}],generatedWeekPlan:[{key:"a"}],adHocSessions:[{id:"a1"}]},{photoProgress:[{id:"p2"}],generatedWeekPlan:[{key:"b"}],adHocSessions:[{id:"a2"}]});
  result(tests,"Data Vault","Merge photo/ad-hoc/generated plan koruyor",merged2?.photoProgress?.length===2&&merged2?.adHocSessions?.length===2&&merged2?.generatedWeekPlan?.[0]?.key==="b",JSON.stringify({photos:merged2?.photoProgress?.length,adhoc:merged2?.adHocSessions?.length,week:merged2?.generatedWeekPlan}));
  const norm=window.BackupVault?.normalizeForApp?.({});
  result(tests,"Data Vault","Normalize tüm yeni konteynerleri kuruyor",Array.isArray(norm?.guidedWorkoutHistory)&&Array.isArray(norm?.adHocSessions)&&Array.isArray(norm?.runs)&&Array.isArray(norm?.photoProgress)&&typeof norm?.adaptiveModel==="object"&&typeof norm?.lifecycle==="object");

  // Data semantics: plan metrics and body map muscle keys are coherent.
  const badMuscles=[];Object.entries(window.EXERCISE_KNOWLEDGE||{}).forEach(([name,k])=>Object.keys(k.muscles||{}).forEach(m=>{if(!V5_MUSCLES[m])badMuscles.push(`${name}:${m}`)}));
  result(tests,"Data Contract","Movement muscle keys geçerli",badMuscles.length===0,badMuscles.join(", "));
  const badMetric=[];Object.entries(window.EXERCISE_KNOWLEDGE||{}).forEach(([name,k])=>{if(!["seconds","reps","minutes","km"].includes(k.metric))badMetric.push(`${name}:${k.metric}`)});
  result(tests,"Data Contract","Movement metric vocabulary geçerli",badMetric.length===0,badMetric.join(", "));

 }catch(err){result(tests,"System","Test motoru exception",false,err?.stack||err)}
 finally{
  db=originalRef;
  Object.keys(db).forEach(k=>delete db[k]);Object.assign(db,original);
  restoreStorage(stored);window.__SYSTEM_INTEGRITY_RUNNING__=false;
  try{safeRender(renderToday);safeRender(renderCoachV5);safeRender(renderMuscleReport);window.AdherenceGuardian?.render?.();window.MovementIntelligence?.render?.();window.PainIntelligence?.render?.()}catch(e){}
 }
 const failed=tests.filter(x=>!x.ok),warn=tests.filter(x=>!x.ok&&x.level==="warn"),passed=tests.length-failed.length;
 lastReport={version:"9.2.1",at:new Date().toISOString(),durationMs:Date.now()-started,total:tests.length,passed,failed:failed.length,tests};
 render(lastReport);return lastReport;
}
function render(r){
 const badge=q("systemIntegrityBadge"),sum=q("systemIntegritySummary"),out=q("systemIntegrityResults"),progress=q("systemIntegrityProgress");if(!r)return;
 if(badge){badge.textContent=r.failed?`${r.failed} HATA`:`${r.passed}/${r.total} PASS`;badge.className=`plan-badge ${r.failed?"bad":""}`}
 if(sum)sum.innerHTML=[["Toplam",r.total],["PASS",r.passed],["FAIL",r.failed],["Süre",`${r.durationMs} ms`]].map(x=>`<div class="mini"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
 if(progress){progress.className=`insight-box ${r.failed?"bad":"good"}`;progress.innerHTML=r.failed?`<strong>${r.failed} entegrasyon sorunu bulundu.</strong> Fail olan kontratları aşağıda gör.`:`<strong>Tüm otomatik motor-kontrat testleri geçti.</strong> Bu test matematiksel/logic entegrasyonunu doğrular; gerçek cihaz sensörü, WebGL GPU görüntüsü ve klinik doğruluk testi değildir.`}
 if(out){const groups={};r.tests.forEach(t=>(groups[t.category]=groups[t.category]||[]).push(t));out.innerHTML=Object.entries(groups).map(([cat,rows])=>`<div class="integrity-group"><h4>${cat}</h4>${rows.map(t=>`<div class="integrity-row ${t.ok?"pass":"fail"}"><span>${t.ok?"✓":"×"}</span><div><strong>${t.name}</strong>${t.detail?`<small>${String(t.detail).replace(/[<>]/g,"")}</small>`:""}</div></div>`).join("")}</div>`).join("")}
}
function summaryText(){if(!lastReport)return "System Integrity testi henüz çalıştırılmadı.";const fails=lastReport.tests.filter(x=>!x.ok);return `Athlete Life OS v${lastReport.version} System Integrity: ${lastReport.passed}/${lastReport.total} PASS, ${lastReport.failed} FAIL.${fails.length?" Fail: "+fails.map(x=>x.category+" / "+x.name+" — "+x.detail).join(" | "):" Tüm otomatik kontratlar geçti."}`}
async function copySummary(){const txt=summaryText();try{await navigator.clipboard.writeText(txt);q("systemIntegrityProgress").textContent="Rapor özeti panoya kopyalandı."}catch(e){q("systemIntegrityProgress").textContent=txt}}
function init(){q("runSystemIntegrity")?.addEventListener("click",run);q("copySystemIntegrity")?.addEventListener("click",copySummary)}
window.SystemIntegrity={run,getLastReport:()=>lastReport,summaryText};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
