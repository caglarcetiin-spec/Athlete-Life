
(function(){
"use strict";

// ---------- Persisted settings ----------
db.settings.lateSessionCutoffHour=Number(db.settings.lateSessionCutoffHour??4);
db.settings.measurementMdcCm=Number(db.settings.measurementMdcCm??0.5);
db.photoProgress=db.photoProgress||[];
db.adaptiveModel=db.adaptiveModel||{};

function calKey(now=new Date()){return localDateKey(now)}
function sessionActualKey(now=new Date()){return athleteDayKey(now)}
function autoSessionPlanKey(now=new Date()){
 return window.trainingViewDate?.()||athleteDayKey(now);
}
function planNameFor(k){const c=window.CanonicalSessionEngine?.get?.(k),p=planForDate(k)||db.planHistory[k]?.versions?.at(-1)?.plan;return c?.planName||p?.name||"Plan yok"}
function latestMissedPlans(limit=14){
 const active=athleteDayKey(new Date()),out=[];
 for(let i=1;i<=limit;i++){
   const k=addDaysKey(active,-i),p=planForDate(k)||db.planHistory[k]?.versions?.at(-1)?.plan;
   if(!p||p.type==="recovery")continue;
   const caught=Object.values(db.trainingLogs||{}).flat().some(r=>r?.scheduledFor===k);
   const native=(db.trainingLogs[k]||[]).some(r=>!r.scheduledFor||r.scheduledFor===k);
   const vr=db.gapReconciliation?.[k];
   if(!caught&&!native&&vr?.status!=="rested"&&vr?.status!=="completed")
     out.push({key:k,name:p.name||p.type,status:vr?.status||"unverified"});
 }
 return out;
}
function selectedSessionTargetKey(){
 const sel=q("sessionAttributionMode");if(!sel)return autoSessionPlanKey();
 const v=sel.value;
 if(v==="auto")return autoSessionPlanKey();
 if(v==="athlete")return window.trainingViewDate?.()||athleteDayKey(new Date());
 if(v==="calendar")return calKey(new Date());
 if(v.startsWith("catchup:"))return v.slice(8);
 if(v==="custom")return q("sessionCustomDate")?.value||autoSessionPlanKey();
 return autoSessionPlanKey();
}
function rowsForTarget(target){
 const rows=[];
 Object.entries(db.trainingLogs||{}).forEach(([actual,arr])=>(arr||[]).forEach((r,rowIndex)=>{
   const scheduled=r.scheduledFor||actual;
   if(scheduled===target)rows.push({...r,_actualKey:actual,_rowIndex:rowIndex});
 }));
 return rows;
}
function initSessionRouter(){
 const sel=q("sessionAttributionMode");if(!sel)return;
 const auto=autoSessionPlanKey(),ath=athleteDayKey(new Date()),calendar=calKey(new Date());
 const missed=latestMissedPlans();
 sel.innerHTML=`<option value="auto">Auto · ${auto} · ${planNameFor(auto)}</option>`+
   `<option value="athlete">Aktif spor günü · ${ath} · ${planNameFor(ath)}</option>`+
   `<option value="calendar">Takvim günü · ${calendar} · ${planNameFor(calendar)}</option>`+
   missed.map(x=>`<option value="catchup:${x.key}">${x.status==="missed"?"Telafi":"Geçmiş giriş"} · ${x.key} · ${x.name}</option>`).join("")+
   `<option value="custom">Özel tarih…</option>`;
 sel.onchange=()=>{q("sessionCustomDateWrap").hidden=sel.value!=="custom";renderSessionRouter();renderTrainingAdaptive()};
 if(q("sessionCustomDate")){q("sessionCustomDate").value=auto;q("sessionCustomDate").onchange=()=>{renderSessionRouter();renderTrainingAdaptive()}}
 const cutoff=q("lateSessionCutoff");if(cutoff){cutoff.value=String(db.settings.lateSessionCutoffHour||4);cutoff.onchange=()=>{db.settings.lateSessionCutoffHour=+cutoff.value;save();initSessionRouter();renderSessionRouter()}}
 renderSessionRouter();
}
function renderSessionRouter(){
 if(!q("sessionRouterSummary"))return;
 const now=new Date(),target=selectedSessionTargetKey(),actual=sessionActualKey(now),calendar=calKey(now),late=calendar!==target;
 const c=window.CanonicalSessionEngine?.get?.(target),p=planForDate(target)||db.planHistory[target]?.versions?.at(-1)?.plan,isToday=target===todayKey();
 q("sessionRouterBadge").textContent=late||!isToday?"GECE / TELAFİ":"NORMAL";
 q("sessionRouterSummary").innerHTML=`<strong>Kayıt hedefi: ${target} · ${c?.planName||p?.name||"Serbest seans"}</strong><br>
 Gerçek timestamp: <b>${now.toLocaleString("tr-TR")}</b> · Fizyolojik Athlete Day: <b>${actual}</b> · Takvim günü: <b>${calendar}</b>.<br>
 Canonical Session: <b>${c?.snapshotId||"oluşturuluyor"}</b>${c?.locked?" · LOCKED":""}.<br>
 ${!isToday?`⚠ Guided Runner <b>bugünün değil ${target}</b> planını çalıştıracak. Bu nedenle Bugünün Hazır Antrenmanı ile farklı görünmesi beklenen bir telafi/tarih seçimi farkıdır.`:late?`Bu seans <b>${target}</b> planına bağlanacak; gerçek yapıldığı zaman ayrıca saklanacak.`:`Guided Runner, Haftalık Plan ve Bugünün Hazır Antrenmanı aynı canonical reçeteyi kullanacak.`}`;
 const hint=q("guidedRouterHint");if(hint)hint.textContent=isToday?`Runner kaynağı: ${c?.snapshotId||"canonical today"}`:`Runner hedefi farklı tarih: ${target}`;
}
function renderTrainingAdaptive(){
 const target=selectedSessionTargetKey(),rows=rowsForTarget(target),p=planForDate(target)||db.planHistory[target]?.versions?.at(-1)?.plan;
 if(q("exerciseLog"))q("exerciseLog").innerHTML=rows.length?rows.map(r=>{
   const total=(r.sets||[]).reduce((a,b)=>a+(+b||0),0),best=Math.max(...(r.sets||[0]).map(Number));
   const metric=r.approximateBackfill?`≈ ${(r.sets||[]).length} set · özet backfill`:(typeof window.exerciseMetricText==="function"?window.exerciseMetricText(r):(r.type==="STATIC"?`${best}s best / ${total}s total`:`${total} tekrar`));
   const actualRests=(r.restBetweenSets||[]).filter(x=>+x>0),avgRest=actualRests.length?Math.round(actualRests.reduce((a,b)=>a+(+b||0),0)/actualRests.length):null;
   const restText=`Rest ${avgRest?fmtRestSec(avgRest):"kayıt yok"} · plan ${fmtRestSec(r.plannedRestSec||restIntervalPrescription(r.name).target)}`;
   return `<div class="log-row with-actions"><strong>${r.name}${r.approximateBackfill?` <span class="backfill-note">ORTA GÜVEN</span>`:""}</strong><span>${r.approximateBackfill?"Yük kaydı yok":r.load?`+${r.load} kg`:"Vücut ağırlığı"}</span><span>${metric}</span><span>${r.approximateBackfill?"RIR yaklaşık":`RIR ${r.rir}`} · ${restText} · ${r._actualKey===target?"aynı gün":"gerçek: "+r._actualKey}</span><span class="inline-record-actions"><button type="button" onclick="RecordManager.editTraining('${r._actualKey}',${r._rowIndex})">Düzenle</button><button type="button" class="danger" onclick="RecordManager.deleteTraining('${r._actualKey}',${r._rowIndex})">Sil</button></span></div>`;
 }).join(""):"<p class='hint'>Bu plana bağlı hareket kaydı yok.</p>";
 if(q("planVsActual")){
   const planned=(window.CanonicalSessionEngine?.template?.(target)?.items||[]).map(x=>x.name),actual=rows.filter(r=>(r.sets||[]).some(x=>+x>0)&&r.planContribution!==false&&r.source!=="ad_hoc").map(x=>x.name),done=planned.filter(n=>actual.includes(n)).length;
   q("planVsActual").innerHTML=[["Plan tarihi",target],["Plan",p?.name||"Serbest"],["Gerçek Athlete Day",sessionActualKey()],["Planlanan hareket",planned.length],["Tamamlanan",`${done}/${planned.length}`]].map(x=>`<div class="summary-item"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
 }
 const last=rows.at(-1);if(q("liveAutoregulation"))q("liveAutoregulation").textContent=last?liveSetAdvice(last):"İlk set kaydından sonra canlı öneri burada oluşur.";
}
function addExerciseAdaptive(){
 const e=EXERCISES[Number(q("exerciseSelect").value)],sets=[1,2,3,4,5].map(i=>Number(q("set"+i).value)||0).filter(Boolean);if(!e||!sets.length)return;
 const now=new Date(),actual=sessionActualKey(now),target=selectedSessionTargetKey(),p=planForDate(target)||db.planHistory[target]?.versions?.at(-1)?.plan;
 const rests=[q("rest12"),q("rest23"),q("rest34"),q("rest45")].map(x=>+(x?.value||0)).slice(0,Math.max(0,sets.length-1));
 const plannedRestSec=+q("exerciseRestPlanned")?.value||restIntervalPrescription(e.n,db.daily?.[target]?readiness(db.daily[target]):null).target;
 const mk=window.EXERCISE_KNOWLEDGE?.[e.n];
 const row={name:e.n,type:e.type,load:+q("exerciseLoad").value||0,sets,rir:+q("exerciseRir").value||0,
   metricUnit:mk?.metric||(e.type==="STATIC"?"seconds":"reps"),movementClass:mk?.contraction||null,knowledgeVersion:window.EXERCISE_KNOWLEDGE_META?.version||null,
   executionEquipment:window.MovementIntelligence?.selectedEquipment?.()||mk?.variantEquipment||mk?.equipment?.[0]||null,
   plannedRestSec,restBetweenSets:rests,
   performedAt:now.toISOString(),calendarDate:calKey(now),athleteDay:actual,scheduledFor:target,planType:p?.type||null,planVersion:p?.version||null,lateOrCatchup:actual!==target};
 const canonical=window.CanonicalSessionEngine?.lock?.(target,"manual_first_set",{source:"manual"});
 row.canonicalSnapshotId=canonical?.snapshotId||null;row.planType=canonical?.planType||row.planType;row.planVersion=canonical?.planVersion||row.planVersion;
 db.trainingLogs[actual]=db.trainingLogs[actual]||[];window.AthleteLoadMesh?.stampRow?.(row,actual);db.trainingLogs[actual].push(row);save();
 ["rest12","rest23","rest34","rest45"].forEach(id=>{if(q(id))q(id).value=""});
 renderTrainingAdaptive();safeRender(renderToday);safeRender(renderCharacter);safeRender(renderMuscleReport);safeRender(renderAdaptiveIntelligence);window.MovementIntelligence?.render?.();window.GuidedWorkout?.syncFromLogs?.("manual/adaptive exercise added");
}
function completeSessionAdaptive(context={}){
 const runner=db.activeGuidedWorkout;
 if(runner&&runner.phase!=="complete")return alert("Önce Guided seansını bitir; çalışan seans sonuçları ayrı bir tarihe gönderilemez.");
 const now=new Date(),actual=context.actualAthleteDay||sessionActualKey(now),target=context.targetDate||selectedSessionTargetKey();
 const cs=window.CanonicalSessionEngine?.get?.(target),p=cs?{type:cs.planType,version:cs.planVersion}:planForDate(target),logs=window.TrainingSessionService?.rows(target)||rowsForTarget(target);
 if(!logs.some(r=>(r.sets||[]).some(x=>+x>0))){alert("Kaydedilmiş set yok; yapılmamış antrenman tamamlandı olarak işlenmedi.");return false}
 const completion=window.GuidedWorkout?.completionSummaryForTarget?.(target)||null;
 const completionPct=completion?.completionPct??(logs.length?100:0),planFidelityPct=completion?.planFidelityPct??completionPct,hasSubstitutions=(completion?.substitutionExercises||0)>0,completionStatus=hasSubstitutions?(completionPct>=100?"modified":"partial_modified"):(completionPct>=100?"completed":completionPct>0?"partial":"unperformed");
 db.sessionFeedback[actual]={...(db.sessionFeedback[actual]||{}),type:p?.type||sessionTypeFromLogs(actual)||"training",targetPlanDate:target,planVersion:p?.version||null,rpe:+q("sessionRpe")?.value||0,duration:+q("sessionDuration")?.value||0,note:q("sessionNote")?.value||"",completedAt:now.toISOString(),exerciseCount:logs.length,lateOrCatchup:actual!==target,completionPct,planFidelityPct,exactCompletionPct:completion?.exactCompletionPct??completionPct,completionStatus,plannedSetCount:completion?.plannedSets??null,performedSetCount:completion?.performedSets??null,exactPerformedSetCount:completion?.exactPerformedSets??null,partialExercises:completion?.details?.filter(x=>x.status==="partial")||[],substitutionExercises:completion?.details?.filter(x=>x.status==="substituted")||[],skippedExercises:completion?.details?.filter(x=>x.status==="skipped")||[],closureReason:completion?.sessionClosure?.reason||null};
 db.sessionFeedback[actual].canonicalSnapshotId=cs?.snapshotId||null;
 db.sessionFeedback[actual].guidedSessionId=context.id||null;
 window.AthleteLoadMesh?.restampDay?.(actual);
 db.planHistory[target]=db.planHistory[target]||{versions:[]};db.planHistory[target].performed={at:now.toISOString(),actualAthleteDay:actual,scheduledFor:target,logs:JSON.parse(JSON.stringify(logs)),feedback:db.sessionFeedback[actual],completion,physiology:window.AthleteLoadMesh?.impactForDate?.(actual)||null};
 if(actual!==target){
   const planned=(window.CanonicalSessionEngine?.template?.(target)?.items||[]).map(x=>x.name),actualNames=logs.map(x=>x.name);
   const matched=completion?(completion.planFidelityPct??completion.completionPct)/100:(planned.length?planned.filter(n=>actualNames.includes(n)).length/planned.length:1);
   db.gapReconciliation=db.gapReconciliation||{};
   db.gapReconciliation[target]={...(db.gapReconciliation[target]||{}),status:matched>=.8?"completed":"modified",resolvedAt:now.toISOString(),resolution:"detailed_backfill",dataConfidence:"high",actualAthleteDay:actual};
   if(db.lifecycle?.closedDays?.[target]){db.lifecycle.closedDays[target].completion=matched>=.8?"backfilled":"modified";db.lifecycle.closedDays[target].caughtUpAt=now.toISOString();db.lifecycle.closedDays[target].dataConfidence="high"}
   if(db.lifecycle){db.lifecycle.missedDays=(db.lifecycle.missedDays||[]).filter(x=>x!==target);db.lifecycle.unverifiedDays=(db.lifecycle.unverifiedDays||[]).filter(x=>x!==target)}
 }
 save();buildFuturePlanV5(14,actual!==target?"historical session reconciliation":completionStatus==="partial"?"partial session autoregulation":"post-workout reoptimization");
 renderTrainingAdaptive();safeRender(renderTomorrowCoachV5);safeRender(renderCoachV5);safeRender(renderMuscleReport);safeRender(renderAdaptiveIntelligence);
 const st=q("sessionCompleteStatus");if(st){st.textContent=actual===target?(completionStatus==="modified"?`✓ Modifiye seans kaydedildi · execution %${completionPct} · plan fidelity %${planFidelityPct}; gerçek hareket yükleriyle gelecek plan optimize edildi`:completionStatus==="partial_modified"?`✓ Kısmi/modifiye seans · execution %${completionPct} · plan fidelity %${planFidelityPct}; Coach gerçek hareketleri dikkate alacak`:completionStatus==="partial"?`✓ Kısmi seans (%${completionPct}) kaydedildi; kalan yük eksik olarak işlendi ve gelecek plan optimize edildi`:"✓ Seans işlendi ve gelecek plan optimize edildi"):`✓ ${target} telafi seansı işlendi; gerçek performans günü ${actual} olarak saklandı`;st.classList.add("ok")}
 return true;
}

// ---------- Measurement / MDC ----------
function latestBodyMeasurements(){return (db.bodyMeasurements||[]).slice().sort((a,b)=>a.date.localeCompare(b.date))}
function measurementSignal(field){
 const arr=latestBodyMeasurements().filter(x=>+x[field]>0);if(arr.length<2)return null;
 const a=arr.at(-2),b=arr.at(-1),delta=+b[field]-+a[field],mdc=+db.settings.measurementMdcCm||.5;
 return {delta,mdc,signal:Math.abs(delta)>=mdc,dateA:a.date,dateB:b.date};
}
function asymmetryPair(r,l){if(!(r>0&&l>0))return null;const avgV=(r+l)/2,diff=Math.abs(r-l),pct=avgV?diff/avgV*100:0;return {r,l,diff,pct}}
function renderAsymmetry(){
 const el=q("asymmetryReport");if(!el)return;const b=latestBodyMeasurements().at(-1)||{};
 const pairs=[["Kol",asymmetryPair(+b.armR,+b.armL)],["Uyluk",asymmetryPair(+b.thighR,+b.thighL)],["Baldır",asymmetryPair(+b.calfR,+b.calfL)]];
 el.innerHTML=pairs.map(([n,x])=>`<div class="summary-item"><span>${n}</span><strong>${x?`${x.pct.toFixed(1)}% fark · R ${x.r} / L ${x.l} cm`:"Ölçüm yok"}</strong></div>`).join("");
}
function renderMeasurementScheduler(){
 const el=q("measurementScheduler");if(!el)return;const arr=latestBodyMeasurements(),last=arr.at(-1),interval=14;
 const due=last?addDaysKey(last.date,interval):todayKey(),days=daysBetween(todayKey(),due);
 const mdc=+db.settings.measurementMdcCm||.5;
 el.innerHTML=`<div class="rec-card ${days<=0?"warn":"good"}"><strong>Çevre ölçümü</strong>${last?`Son: ${last.date} · sonraki: ${due} ${days<=0?"(ölçüm zamanı)":`(${days} gün)`}`:"Baseline ölçümü gerekli"}</div><div class="rec-card"><strong>Noise / MDC eşiği</strong>${mdc.toFixed(1)} cm altındaki tek ölçüm farklarını gerçek büyüme diye etiketleme.</div><div class="rec-card"><strong>Protokol</strong>Aynı saat/landmark, pump yok, 3 tekrar → medyan.</div>`;
 if(q("measurementMdcNote"))q("measurementMdcNote").textContent=`Kişisel gürültü eşiği: ${mdc.toFixed(1)} cm. Bu değer ayarlanabilir; kalibre edilmiş ölçüm hatan varsa onu kullan.`;
}

// ---------- Stimulus / Fatigue ----------
function avgSessionRpe(days=7){const keys=lastNDates(days),vals=keys.map(k=>+db.sessionFeedback[k]?.rpe||0).filter(Boolean);return vals.length?avg(vals):7}
function sfrForMuscle(m){const stim=Math.min(100,stimulusScore(m,muscleStimulus(7)[m]||0,7)),fat=100-recoveryReadinessForMuscle(m)+musclePainScore(m)*5+(avgSessionRpe(7)-7)*5;return {stim,fat:clamp(fat,5,100),ratio:clamp(Math.round(stim/Math.max(10,fat)*55),0,100)}}
function renderSFR(){const priority=["chest","lats","frontDelts","biceps","triceps","quads","hamstrings","glutes"],vals=priority.map(m=>[m,sfrForMuscle(m)]),mean=Math.round(avg(vals.map(x=>x[1].ratio)));if(q("adaptiveSFR"))q("adaptiveSFR").textContent=mean+"/100";return vals}

// ---------- Plateau / personal response ----------
function exercisePerformanceIndex(r){const reps=Math.max(...(r.sets||[0]).map(Number));if(r.type==="STATIC")return reps;return ((+r.load||0)+currentBodyWeightScience())*Math.max(1,reps)}
function plateauForExercise(name){
 const t=window.PeriodicTrendEngine?.exerciseTrend?.(name,"monthly");
 if(t&&t.state!=="insufficient")return {state:t.state==="rising"?"progress":t.state,gain:t.delta,count:t.count,confidence:t.confidence};
 const rows=exerciseChrono(name).filter(x=>daysBetween(x.date,todayKey())<=42);if(rows.length<4)return {state:"insufficient",gain:null,count:rows.length};
 const mid=Math.floor(rows.length/2),a=avg(rows.slice(0,mid).map(exercisePerformanceIndex)),b=avg(rows.slice(mid).map(exercisePerformanceIndex)),gain=a?((b-a)/a*100):0;
 return {state:gain>=3?"progress":gain<=-3?"declining":"plateau",gain,count:rows.length,confidence:55}
}
function renderPlateaus(){
 const el=q("plateauDetector");if(!el)return;const names=["Weighted Pull-Up","Weighted Ring Dip","Full Planche","Front Lever","OHP","Bulgarian Split Squat","RDL"];
 el.innerHTML=names.map(n=>{const x=plateauForExercise(n),cls=x.state==="plateau"?"warn":x.state==="progress"?"good":x.state==="declining"?"bad":"";
  const txt=x.state==="insufficient"?`Yetersiz veri (${x.count} kayıt)`:x.state==="plateau"?`Aylık değişim ${x.gain.toFixed(1)}% → plato adayı · güven ${x.confidence||"--"}/100`:x.state==="declining"?`Trend ${x.gain.toFixed(1)}% → düşüş. Recovery/hastalık/yük bağlamını kontrol et.`:`Trend +${x.gain.toFixed(1)}% → yükseliş.`;
  return `<div class="rec-card ${cls}"><strong>${n}</strong>${txt}</div>`}).join("")
}
function weeklyMuscleSeries(m,weeks=8){const out=[];for(let i=weeks-1;i>=0;i--){const end=addDaysKey(todayKey(),-i*7),vol=muscleStimulus(7,end)[m]||0,rec=recoveryReadinessForMuscle(m,end);out.push({end,vol,rec})}return out}
function personalResponse(m){const s=weeklyMuscleSeries(m),valid=s.filter(x=>x.vol>0);if(valid.length<4)return {level:"Öğreniyor",zone:null,confidence:Math.round(valid.length/4*50)};const good=valid.filter(x=>x.rec>=65).sort((a,b)=>b.rec-a.rec);const vols=good.slice(0,Math.max(2,Math.ceil(good.length*.6))).map(x=>x.vol).sort((a,b)=>a-b);if(!vols.length)return {level:"Öğreniyor",zone:null,confidence:40};const lo=vols[Math.floor(vols.length*.2)]||vols[0],hi=vols[Math.floor(vols.length*.8)]||vols.at(-1);return {level:"Kişiselleşiyor",zone:[lo,hi],confidence:clamp(45+valid.length*6,0,90)}}
function renderPersonalModel(){const el=q("personalResponseModel");if(!el)return;const ms=["chest","lats","frontDelts","biceps","triceps","quads","hamstrings","glutes"],models=ms.map(m=>[m,personalResponse(m)]);const conf=Math.round(avg(models.map(x=>x[1].confidence)));if(q("adaptivePersonalModel"))q("adaptivePersonalModel").textContent=conf<35?"Baseline":conf<65?"Öğreniyor":"Kişisel";el.innerHTML=models.map(([m,x])=>`<div class="rec-card ${x.confidence>=65?"good":""}"><strong>${V5_MUSCLES[m].label}</strong>${x.zone?`Şu an tolere edilen kişisel hacim bölgesi ≈ ${x.zone[0].toFixed(1)}–${x.zone[1].toFixed(1)} efektif set/hafta · güven ${x.confidence}/100`:`Daha fazla hafta gerekli · güven ${x.confidence}/100`}</div>`).join("")}

// ---------- Deload ----------
function deloadProbability(){const keys=lastNDates(7),rs=keys.map(k=>readiness(db.daily[k])).filter(x=>x!=null),sleep=keys.map(k=>db.daily[k]).filter(Boolean).map(d=>sleepDuration(d)/60).filter(Boolean),rpes=keys.map(k=>+db.sessionFeedback[k]?.rpe||0).filter(Boolean);let p=10,reasons=[];if(rs.length&&avg(rs)<65){p+=22;reasons.push("readiness düşük")}if(sleep.length&&avg(sleep)<6.7){p+=18;reasons.push("uyku düşük")}if(rpes.length&&avg(rpes)>=9){p+=18;reasons.push("session RPE yüksek")}if(maxPain()>=5){p+=18;reasons.push("eklem yük sinyali")}
 const health=window.HealthStateEngine?.assess?.(db.daily[todayKey()]||{});if(health?.action==="stop_hard_training"){p+=35;reasons.push("hastalık / red-flag sağlık durumu")}else if(health?.action==="recovery"||health?.action==="reduce"){p+=12;reasons.push("halsizlik / hastalık")}
 const states=["Weighted Pull-Up","Weighted Ring Dip","Full Planche","Front Lever","OHP"].map(n=>plateauForExercise(n)),plateaus=states.filter(x=>x.state==="plateau").length,declines=states.filter(x=>x.state==="declining").length;
 if(plateaus>=2){p+=14;reasons.push("çoklu plateau")}if(declines>=2){p+=16;reasons.push("çoklu performans düşüşü")}
 return {p:clamp(p,0,95),reasons}}

// ---------- Goal conflicts / tests ----------
function bodyWeightWeeklyRate(){const arr=latestBodyMeasurements().filter(x=>+x.weight>0).slice(-8);if(arr.length<2)return null;const a=arr[0],b=arr.at(-1),weeks=Math.max(1,daysBetween(a.date,b.date)/7);return (+b.weight-+a.weight)/weeks}
function renderGoalConflicts(){const el=q("goalConflictEngine");if(!el)return;const km=lastNDates(7).reduce((s,k)=>s+(+db.daily[k]?.runKm||0),0),wr=bodyWeightWeeklyRate(),conf=[],mesh=window.AthleteLoadMesh?.rolling?.(7)||{};if(km>20)conf.push(["Running ↔ Leg Mass",`${km.toFixed(1)} km/hafta. Alt-vücut recovery ve hypertrophy sinyalini izle.`]);if((mesh.highSpeedExposureSec||0)>=45)conf.push(["Sprint ↔ Leg Recovery",`${Math.round(mesh.highSpeedExposureSec)} sn high-speed exposure. Hamstring/glute/calf ve nöromüsküler recovery sonraki legs/speed kararına giriyor.`]);if((mesh.neuralDemand||0)>=80)conf.push(["Nöral Yük",`Son antrenman ağı yüksek nöral talep (${Math.round(mesh.neuralDemand)}/100) taşıyor; ağır skill/strength kalitesini recovery ile birlikte değerlendir.`]);if((mesh.mechanicalDemand||0)>=80)conf.push(["Mekanik Yük",`Son antrenman ağı mekanik talebi ${Math.round(mesh.mechanicalDemand)}/100; aynı kas/pattern için ek junk volume'dan kaçın.`]);if((mesh.metabolicDemand||0)>=80)conf.push(["Metabolik Yük",`Metabolik talep ${Math.round(mesh.metabolicDemand)}/100; fueling ve bir sonraki seans density kararına giriyor.`]);if(wr!=null&&wr<.05)conf.push(["76 kg hedefi",`Kilo trendi ${wr.toFixed(2)} kg/hafta; lean-gain için enerji alımı yetersiz olabilir.`]);if(maxPain()>=5)conf.push(["Skill ↔ Joint load",`Pain sinyali ${maxPain()}/10; planche/lever yoğunluğu eklem uyumluluğuna göre azaltılmalı.`]);if(!conf.length)conf.push(["Çakışma düşük","Mevcut hedefler aynı hafta içinde yönetilebilir görünüyor."]);el.innerHTML=conf.map(x=>`<div class="rec-card ${x[0]==="Çakışma düşük"?"good":"warn"}"><strong>${x[0]}</strong>${x[1]}</div>`).join("")}
function renderTestingCalendar(){const el=q("testingCalendar");if(!el)return;const pw=programWeekV5(),next=[4,8,12].find(w=>w>=pw.week)||12,delta=next-pw.week;el.innerHTML=`<div class="rec-card ${delta===0?"warn":"good"}"><strong>12W test checkpoint</strong>Hafta ${next} ${delta===0?"şimdi":"· yaklaşık "+delta+" hafta sonra"}</div><div class="rec-card"><strong>Test bataryası</strong>Weighted pull-up/dip · planche/FL · 5K/Cooper · jump · çevre ölçümü.</div>`}

// ---------- Why / uncertainty ----------
function renderCoachWhy(){const el=q("coachWhyDetail");if(!el)return;const k=todayKey(),p=planForDate(k),r=readiness(db.daily[k]),dl=deloadProbability(),pain=maxPain(k),km=lastNDates(7).reduce((s,x)=>s+(+db.daily[x]?.runKm||0),0),trend=window.PeriodicTrendEngine?.summary?.("monthly"),health=window.HealthStateEngine?.assess?.(db.daily[k]||{});el.innerHTML=`<div class="science-evidence-row"><strong>Plan seçimi</strong>${p?.name||"--"} · readiness ${r??"forecast"} · pain ${pain}/10 · sağlık ${health?.label||"Normal"} · 7g koşu ${km.toFixed(1)} km.</div><div class="science-evidence-row"><strong>Periyodik trend</strong>${trend?`${window.PeriodicTrendEngine.stateLabel(trend.state)} · ${trend.delta==null?"—":(trend.delta>=0?"+":"")+trend.delta.toFixed(1)+"%"} · güven ${trend.confidence}/100`:"Veri bekleniyor"}.</div><div class="science-evidence-row"><strong>Deload modeli</strong>${dl.p}% · ${dl.reasons.length?dl.reasons.join(", "):"belirgin fatigue cluster yok"}.</div><div class="science-evidence-row"><strong>Karar kuralı</strong>Skill kalitesi → ana strength → hipertrofi; düşük recovery, hastalık, ağrı veya çoklu düşüş varsa hacim önce azaltılır.</div>`}
function renderUncertainty(){const el=q("adaptiveUncertainty");if(!el)return;let ver=SCIENCE_LIBRARY?.version||"2026.09",m=selectedMuscleKey||"lats",s=typeof scienceTrendForMuscle==="function"?scienceTrendForMuscle(m):null;const conf=s?.confidence||45,half=Math.round(5+(100-conf)*.18),expected=s?.expected??null;if(q("adaptiveMeasurementConfidence"))q("adaptiveMeasurementConfidence").textContent=latestBodyMeasurements().length>=4?"Orta":"Düşük";el.innerHTML=`<strong>Evidence Library ${ver}</strong><br>${expected!=null?`${V5_MUSCLES[m]?.label||m} expected adaptation ${expected}/100; belirsizlik bandı yaklaşık ${Math.max(0,expected-half)}–${Math.min(100,expected+half)}. `:"Kas seçildiğinde adaptasyon bandı oluşur. "}Bu aralık istatistiksel klinik güven aralığı değildir; veri kapsamına göre model belirsizliğini görünür kılan karar-destek bandıdır.`}

// ---------- Photo progress via IndexedDB ----------
function photoDB(){return new Promise((res,rej)=>{const r=indexedDB.open("AthleteLifeOSPhotos",1);r.onupgradeneeded=()=>r.result.createObjectStore("checkins",{keyPath:"id"});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function compressImage(file){return new Promise((res,rej)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const max=720,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);c.toBlob(b=>{const rr=new FileReader();rr.onload=()=>res(rr.result);rr.onerror=rej;rr.readAsDataURL(b)},"image/jpeg",.78)};img.onerror=rej;img.src=url})}
async function savePhotoProgress(){const inputs=[["front",q("photoFront")],["side",q("photoSide")],["back",q("photoBack")]],photos={};for(const [k,i] of inputs){if(i?.files?.[0])photos[k]=await compressImage(i.files[0])}if(!Object.keys(photos).length)return;const dbp=await photoDB(),tx=dbp.transaction("checkins","readwrite");tx.objectStore("checkins").put({id:Date.now(),date:todayKey(),createdAt:new Date().toISOString(),photos});await new Promise(r=>tx.oncomplete=r);if(q("photoProgressStatus"))q("photoProgressStatus").textContent="✓ Foto check-in kaydedildi";renderPhotoGallery()}
async function renderPhotoGallery(){const el=q("photoProgressGallery");if(!el||!indexedDB)return;try{const dbp=await photoDB(),tx=dbp.transaction("checkins","readonly"),req=tx.objectStore("checkins").getAll();req.onsuccess=()=>{const arr=req.result.sort((a,b)=>b.id-a.id).slice(0,6);el.innerHTML=arr.map(x=>`<div class="photo-checkin"><div class="section-head"><strong>${x.date}</strong><button type="button" class="record-action delete" onclick="RecordManager.deletePhoto(${x.id})">Sil</button></div><div class="photos">${["front","side","back"].map(k=>x.photos[k]?`<img src="${x.photos[k]}" alt="${k}">`:`<span></span>`).join("")}</div></div>`).join("")}}catch(e){console.warn(e)}}

function renderAdaptiveIntelligence(){
 const dl=deloadProbability();if(q("adaptiveDeload"))q("adaptiveDeload").textContent=dl.p+"%";
 renderSFR();renderPersonalModel();renderPlateaus();renderAsymmetry();renderMeasurementScheduler();renderGoalConflicts();renderTestingCalendar();renderUncertainty();renderCoachWhy();renderPhotoGallery();
}
function bindAdaptive(){
 initSessionRouter();renderTrainingAdaptive();
 if(q("addExerciseBtn"))q("addExerciseBtn").onclick=addExerciseAdaptive;
 if(q("completeSessionBtn"))q("completeSessionBtn").onclick=completeSessionAdaptive;
 if(q("saveProgressPhotos"))q("saveProgressPhotos").onclick=savePhotoProgress;
 if(q("settingsLateSessionCutoff")){q("settingsLateSessionCutoff").value=String(db.settings.lateSessionCutoffHour||4);q("settingsLateSessionCutoff").onchange=()=>{db.settings.lateSessionCutoffHour=+q("settingsLateSessionCutoff").value;save();initSessionRouter()}}
 if(q("measurementMdcCm")){q("measurementMdcCm").value=db.settings.measurementMdcCm||.5;q("measurementMdcCm").onchange=()=>{db.settings.measurementMdcCm=+q("measurementMdcCm").value||.5;save();renderAdaptiveIntelligence()}}
 // Re-render after body measurement save without replacing the original logic.
 q("saveBodyBtn")?.addEventListener("click",()=>setTimeout(renderAdaptiveIntelligence,50));
 renderAdaptiveIntelligence();
 setInterval(()=>{renderSessionRouter()},60000);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bindAdaptive);else setTimeout(bindAdaptive,0);
window.renderAdaptiveIntelligence=renderAdaptiveIntelligence;
window.completeSessionAdaptive=completeSessionAdaptive;
window.renderTrainingAdaptive=renderTrainingAdaptive;
window.initSessionRouter=initSessionRouter;
window.syncSessionRouterToTrainingDate=function(key){
 const sel=q("sessionAttributionMode");if(!sel)return;
 initSessionRouter();
 let opt=[...sel.options].find(o=>o.value===`catchup:${key}`);
 if(!opt&&key!==athleteDayKey(new Date())){opt=document.createElement("option");opt.value=`catchup:${key}`;opt.textContent=`Seçili gün · ${key} · ${planNameFor(key)}`;sel.appendChild(opt)}
 if(key===window.trainingViewDate?.() && key===athleteDayKey(new Date()))sel.value="auto";else if(opt)sel.value=opt.value;
 q("sessionCustomDateWrap")&&(q("sessionCustomDateWrap").hidden=sel.value!=="custom");
 renderSessionRouter();renderTrainingAdaptive();
};
window.selectedSessionTargetKey=selectedSessionTargetKey;
window.rowsForTarget=rowsForTarget;
window.sessionActualKey=sessionActualKey;
window.renderTrainingAdaptive=renderTrainingAdaptive;
window.openHistoricalSessionTarget=function(key){
 goToPage("training");
 setTimeout(()=>{
   initSessionRouter();
   const sel=q("sessionAttributionMode");
   if(sel){
     let opt=[...sel.options].find(o=>o.value===`catchup:${key}`);
     if(!opt){opt=document.createElement("option");opt.value=`catchup:${key}`;opt.textContent=`Geçmiş giriş · ${key} · ${planNameFor(key)}`;sel.appendChild(opt)}
     sel.value=`catchup:${key}`;sel.dispatchEvent(new Event("change"));
   }
 },50);
};
})();
