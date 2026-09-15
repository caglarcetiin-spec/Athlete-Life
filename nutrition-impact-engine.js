
(function(){
"use strict";

let EVIDENCE=null;
fetch("nutrition-impact-evidence.json").then(r=>r.json()).then(x=>{EVIDENCE=x;renderEvidence();}).catch(()=>{});

const dayKeys=(days,end=todayKey())=>Array.from({length:days},(_,i)=>addDaysKey(end,-i));
const hasWaterRecord=k=>(db.waterLogs?.[k]||[]).some(x=>(+x.ml||0)>0) || (+db.water?.[k]||0)>0;
const hasNutrition=k=>(db.foodLogs?.[k]||[]).length>0 || hasWaterRecord(k);
const clamp01=x=>Math.max(0,Math.min(1,x));

function currentBW(){
 try{return currentBodyWeightScience()}catch(e){}
 const b=(db.bodyMeasurements||[]).filter(x=>+x.weight>0).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
 return b?+b.weight:72;
}
function rollingNutrition(days=14){
 const keys=dayKeys(days),vals=keys.filter(hasNutrition).map(k=>({k,...nutritionMetricsForDate(k)}));
 if(!vals.length)return {coverage:0,days:0};
 const mean=key=>avg(vals.map(x=>+x[key]||0));
 return {
   coverage:vals.length/days,days:vals.length,
   kcal:mean("kcal"),protein:mean("protein"),carbs:mean("carbs"),fat:mean("fat"),fiber:mean("fiber"),
   water:mean("water"),caffeine:mean("caffeine"),microScore:mean("microScore"),
   sodium:mean("sodium"),potassium:mean("potassium"),calcium:mean("calcium"),iron:mean("iron"),
   magnesium:mean("magnesium"),zinc:mean("zinc"),vitC:mean("vitC"),vitD:mean("vitD"),b12:mean("b12"),folate:mean("folate")
 };
}

function rollingHydration(days=14){
 const keys=dayKeys(days),logged=keys.filter(hasWaterRecord);
 if(!logged.length)return {days:0,coverage:0,avgTotalL:null,avgDirectL:null,avgFoodL:null};
 const vals=logged.map(k=>{
   const m=nutritionMetricsForDate(k),h=m.hydration||{};
   return {date:k,total:+h.totalWaterL||(+m.water||0)/1000,direct:(+h.directWaterMl||0)/1000,food:(+h.foodWaterMl||0)/1000,score:+h.score||0};
 });
 return {
   days:vals.length,coverage:vals.length/days,
   avgTotalL:avg(vals.map(x=>x.total)),avgDirectL:avg(vals.map(x=>x.direct)),avgFoodL:avg(vals.map(x=>x.food)),
   avgScore:avg(vals.map(x=>x.score)),values:vals
 };
}

function linearTrend(field,days=42,source="body"){
 const end=todayKey(),start=addDaysKey(end,-days);
 let rows=[];
 if(source==="body")rows=(db.bodyMeasurements||[]).filter(x=>x.date>=start&&x.date<=end&&+x[field]>0).map(x=>({date:x.date,value:+x[field]}));
 if(field==="weight"){
   Object.entries(db.daily||{}).forEach(([k,d])=>{if(k>=start&&k<=end&&+d.weight>0)rows.push({date:k,value:+d.weight})});
 }
 const byDate={};rows.forEach(x=>byDate[x.date]=x.value);
 rows=Object.entries(byDate).map(([date,value])=>({date,value})).sort((a,b)=>a.date.localeCompare(b.date));
 if(rows.length<3)return {rate:null,count:rows.length,coverage:0};
 const x0=new Date(rows[0].date+"T12:00:00").getTime(),xs=rows.map(r=>(new Date(r.date+"T12:00:00").getTime()-x0)/86400000),ys=rows.map(r=>r.value);
 const xm=avg(xs),ym=avg(ys),num=xs.reduce((s,x,i)=>s+(x-xm)*(ys[i]-ym),0),den=xs.reduce((s,x)=>s+(x-xm)**2,0)||1;
 const perDay=num/den;
 return {rate:perDay*7,count:rows.length,coverage:Math.min(1,rows.length/8),first:rows[0].value,last:rows.at(-1).value};
}
function waistTrend(){
 const t=linearTrend("waist",56,"body");
 return {...t,per4w:t.rate==null?null:t.rate*4};
}
function roughPerformanceTrend(days=21){
 const end=todayKey(),recentStart=addDaysKey(end,-days),priorStart=addDaysKey(end,-days*2);
 const per={};
 Object.entries(db.trainingLogs||{}).forEach(([k,rows])=>{
   if(k<priorStart||k>end)return;
   (rows||[]).filter(r=>!r.approximateBackfill).forEach(r=>{
     const best=Math.max(...(r.sets||[0]).map(Number));
     if(!best)return;
     let score;
     if(r.type==="STATIC")score=best;
     else{
       const bw=currentBW(),systemLoad=["Weighted Pull-Up","Weighted Ring Dip","Weighted Dip"].includes(r.name)?bw+(+r.load||0):(+r.load||0)>0?(+r.load||0):bw;
       score=systemLoad*best;
     }
     per[r.name]=per[r.name]||{recent:[],prior:[]};
     (k>=recentStart?per[r.name].recent:per[r.name].prior).push(score);
   });
 });
 const deltas=[];
 Object.values(per).forEach(v=>{
   if(v.recent.length&&v.prior.length){
     const a=Math.max(...v.recent),b=Math.max(...v.prior);if(b>0)deltas.push((a-b)/b*100);
   }
 });
 if(!deltas.length)return {delta:null,score:70,coverage:0};
 const delta=avg(deltas),score=clamp(Math.round(70+delta*2),35,100);
 return {delta,score,coverage:Math.min(1,deltas.length/4),tests:deltas.length};
}
function recentTrainingLoad(days=7){
 const keys=dayKeys(days),trainDays=keys.filter(k=>(db.trainingLogs[k]||[]).length).length;
 let minutes=0;keys.forEach(k=>minutes+=(+db.sessionFeedback?.[k]?.duration||0));
 const runKm=keys.reduce((s,k)=>s+(+db.daily?.[k]?.runKm||0),0),mesh=window.AthleteLoadMesh?.rolling?.(days)||{};
 minutes+=+mesh.adHocMinutes||0;
 return {trainDays,minutes,runKm,highIntensitySec:mesh.highSpeedExposureSec||0,metabolicDemand:mesh.metabolicDemand||0,mechanicalDemand:mesh.mechanicalDemand||0,neuralDemand:mesh.neuralDemand||0,cardiovascularDemand:mesh.cardioVascularDemand||mesh.cardiovascularDemand||0,sessionRpeAU:mesh.sessionRpeAU||0,score:trainDays*12+Math.min(35,runKm*1.5)+Math.min(30,minutes/20)+Math.min(15,(mesh.highSpeedExposureSec||0)/5)+Math.min(10,(mesh.metabolicDemand||0)/10)};
}
function proteinStatus(n,bw){
 const gkg=n.protein/bw,score=clamp(Math.round(gkg/1.6*100),0,105);
 return {gkg,score,label:gkg>=1.6?"Yeterli":gkg>=1.3?"Sınırda":"Düşük"};
}
function carbTarget(load){
 if(load.runKm>=25||load.trainDays>=6||load.highIntensitySec>=90)return 5.0;
 if(load.runKm>=12||load.trainDays>=4||load.highIntensitySec>=30||load.metabolicDemand>=75)return 4.0;
 return 3.0;
}
function carbStatus(n,bw,load){
 const gkg=n.carbs/bw,target=carbTarget(load),score=clamp(Math.round(gkg/target*100),0,110);
 return {gkg,target,score,label:score>=90?"İyi":score>=70?"Orta":"Düşük"};
}
function fatStatus(n,bw){
 const gkg=n.fat/bw,energyPct=n.kcal? n.fat*9/n.kcal*100:0;
 let score=100;
 if(energyPct<18||gkg<.6)score=55;
 else if(energyPct<22||gkg<.8)score=78;
 else if(energyPct>45)score=72;
 return {gkg,energyPct,score};
}
function hydrationStatus(n,load){
 const key=todayKey(),today=nutritionMetricsForDate(key),h=today.hydration||null,roll=rollingHydration(14),recorded=hasWaterRecord(key);
 if(!h){
   const est=window.HydrationIntelligence?.averageEstimate?.(db,load)||{lowL:2.2,highL:3.0,confidence:45};
   return {score:0,liters:0,directLiters:0,foodLiters:0,targetL:(est.lowL+est.highL)/2,targetLowL:est.lowL,targetHighL:est.highL,
     context:["bugün hidrasyon verisi oluşturulamadı"],confidence:0,recorded:false,todayKey:key,rolling:roll};
 }
 const context=[];
 if(!recorded)context.push("bugün doğrudan su kaydı yok");
 else context.push(`${(h.directWaterMl/1000).toFixed(1)} L Water Ledger`);
 if((h.foodWaterMl||0)>0)context.push(`${(h.foodWaterMl/1000).toFixed(1)} L besin/içecek suyu`);
 if(load.runKm>=12||load.minutes>=240||load.highIntensitySec>=45)context.push("yüksek egzersiz / sprint yükü");
 context.push("sweat-rate yoksa kesin sıvı ihtiyacı hesaplanmaz");
 return {
   score:recorded?h.score:Math.min(70,h.score||0),
   liters:h.totalWaterL,directLiters:h.directWaterMl/1000,foodLiters:h.foodWaterMl/1000,
   targetL:(h.lowL+h.highL)/2,targetLowL:h.lowL,targetHighL:h.highL,
   context,confidence:(h.confidence||0)/100,recorded,status:h.status,title:h.title,message:h.message,todayKey:key,rolling:roll
 };
}
function energyState(n,wt){
 const target=db.settings.targetCalories||0,delta=target?n.kcal-target:null;
 let evidence=0;
 if(wt.rate!=null)evidence+=2;
 if(n.coverage>=.5)evidence+=1;
 let state="Uncertain",text="Enerji yönü için daha fazla kayıt gerekli.",severity=0;
 const rate=wt.rate;
 if(rate!=null){
   if(rate<=-.45){state="Aggressive Deficit";severity=-2}
   else if(rate<=-.12){state="Deficit / Cut";severity=-1}
   else if(rate<.10){state="Maintenance / Recomp";severity=0}
   else if(rate<=.35){state="Mild Surplus / Lean Gain";severity=1}
   else{state="Rapid Gain / High Surplus";severity=2}
 }else if(delta!=null&&n.coverage>=.5){
   if(delta<-450){state="Likely Deficit";severity=-2}
   else if(delta<-150){state="Likely Mild Deficit";severity=-1}
   else if(delta<=180){state="Likely Maintenance";severity=0}
   else if(delta<=450){state="Likely Mild Surplus";severity=1}
   else{state="Likely High Surplus";severity=2}
 }
 if(state.includes("Deficit"))text="Kilo/kalori trendi enerji açığı yönünde.";
 else if(state.includes("Maintenance")||state.includes("Recomp"))text="Kilo ve enerji trendi bakım/recomp bölgesine yakın.";
 else if(state.includes("Lean Gain")||state.includes("Mild Surplus"))text="Kontrollü kilo artışı / hafif surplus yönü.";
 else if(state.includes("Rapid Gain")||state.includes("High Surplus"))text="Kilo artışı hızlı; surplus verimliliği ve bel trendi kontrol edilmeli.";
 return {state,text,severity,delta,confidence:Math.min(1,evidence/3)};
}
function underfuelRisk(energy,protein,perf,sleepScore){
 let risk=20;
 if(energy.severity===-2)risk+=35;else if(energy.severity===-1)risk+=20;
 if(protein.score<75)risk+=18;else if(protein.score<90)risk+=8;
 if(perf.delta!=null&&perf.delta<-5)risk+=15;
 if(sleepScore<70)risk+=10;
 return clamp(Math.round(risk),0,100);
}
function hypertrophyEnvironment(energy,protein,carb,perf,n){
 let energyScore=80;
 if(energy.severity===-2)energyScore=42;
 else if(energy.severity===-1)energyScore=65;
 else if(energy.severity===0)energyScore=82;
 else if(energy.severity===1)energyScore=94;
 else if(energy.severity===2)energyScore=80;
 return clamp(Math.round(protein.score*.30+energyScore*.25+carb.score*.12+perf.score*.18+(n.microScore||70)*.10+Math.min(100,n.fiber/30*100)*.05),0,100);
}
function muscleRetentionScore(risk){return 100-risk}
function performanceFueling(energy,carb,hydr,perf){
 let energyScore=energy.severity<=-2?50:energy.severity===-1?72:90;
 return clamp(Math.round(carb.score*.35+hydr.score*.25+energyScore*.25+perf.score*.15),0,100);
}
function micronutrientSignal(n){
 const score=clamp(Math.round(n.microScore||0),0,100);
 const refs={potassium:3500,calcium:1000,iron:8,magnesium:420,zinc:11,vitC:90,vitD:15,b12:2.4,folate:400};
 const lows=Object.entries(refs).filter(([k,v])=>(n[k]||0)<v*.65).map(([k])=>k);
 return {score,lows};
}
function phaseQuality(energy,wt,waist,perf,protein){
 let mode=db.settings.nutritionGoalMode||"auto";
 if(mode==="auto")mode=energy.severity<0?"cut":energy.severity>0?"lean_gain":"recomp";
 if(mode==="cut"){
   let score=70;
   if(wt.rate!=null){if(wt.rate>=-.55&&wt.rate<=-.1)score+=12;else if(wt.rate<-.75)score-=20}
   if(waist.per4w!=null&&waist.per4w<0)score+=10;
   if(perf.delta!=null&&perf.delta>=-3)score+=8;else if(perf.delta!=null&&perf.delta<-8)score-=15;
   if(protein.score<85)score-=12;
   return {mode:"Cut Quality",score:clamp(Math.round(score),0,100),text:"İyi cut: bel/kilo azalırken performans ve protein mümkün olduğunca korunur."};
 }
 if(mode==="lean_gain"){
   let score=68;
   if(wt.rate!=null){if(wt.rate>=.08&&wt.rate<=.35)score+=15;else if(wt.rate>.55)score-=18;else if(wt.rate<0)score-=15}
   if(waist.per4w!=null){if(waist.per4w<=.8)score+=8;else if(waist.per4w>1.8)score-=15}
   if(perf.delta!=null&&perf.delta>2)score+=10;
   if(protein.score<85)score-=10;
   return {mode:"Gain Quality",score:clamp(Math.round(score),0,100),text:"İyi gain: kilo kontrollü artar, bel artışı sınırlı kalır ve performans ilerler."};
 }
 let score=72;
 if(wt.rate!=null&&Math.abs(wt.rate)<.15)score+=10;
 if(waist.per4w!=null&&waist.per4w<=0)score+=7;
 if(perf.delta!=null&&perf.delta>0)score+=8;
 return {mode:"Recomp Quality",score:clamp(Math.round(score),0,100),text:"Recomp: kilo nispeten stabilken bel ve performans trendi birlikte yorumlanır."};
}
function caffeineSleepRisk(days=7){
 let risky=0,total=0;
 dayKeys(days).forEach(k=>{
   const d=db.daily?.[k];if(!d?.bedTime)return;
   const bed=mins(d.bedTime);
   (db.foodLogs?.[k]||[]).forEach(r=>{
     if((+r.caf||0)>0&&r.time){
       total++;
       let diff=bed-mins(r.time);if(diff<0)diff+=1440;
       if(diff<360)risky++;
     }
   });
 });
 return {risk:total?Math.round(risky/total*100):null,total};
}
function avgSleepScore(days=14){
 const vals=dayKeys(days).map(k=>db.daily?.[k]).filter(d=>d?.sleepTime&&d?.wakeTime).map(d=>sleepDuration(d)/60);
 if(!vals.length)return 75;
 return clamp(Math.round(avg(vals)/(db.settings.targetSleep||8)*100),0,105);
}
function confidence(n,wt,waist,perf){
 const c=n.coverage*.42+wt.coverage*.25+waist.coverage*.12+perf.coverage*.14+(db.settings.targetCalories?0.07:0);
 return clamp(Math.round(c*100),0,100);
}
function classifyScore(score,inverse=false){
 const s=inverse?100-score:score;
 if(s>=85)return "Çok iyi";
 if(s>=70)return "İyi / kabul edilebilir";
 if(s>=55)return "Sınırda";
 return "Öncelikli sorun";
}
function build(){
 const n=rollingNutrition(14),bw=currentBW(),wt=linearTrend("weight",42,"body"),waist=waistTrend(),perf=roughPerformanceTrend(),load=recentTrainingLoad(),sleep=avgSleepScore();
 const protein=proteinStatus(n,bw),carb=carbStatus(n,bw,load),fat=fatStatus(n,bw),hydr=hydrationStatus(n,load),energy=energyState(n,wt),micro=micronutrientSignal(n);
 const under=underfuelRisk(energy,protein,perf,sleep),hyper=hypertrophyEnvironment(energy,protein,carb,perf,n),fuel=performanceFueling(energy,carb,hydr,perf),retain=muscleRetentionScore(under),phase=phaseQuality(energy,wt,waist,perf,protein),caf=caffeineSleepRisk();
 const conf=confidence(n,wt,waist,perf);
 return {n,bw,wt,waist,perf,load,sleep,protein,carb,fat,hydr,energy,micro,under,hyper,fuel,retain,phase,caf,conf};
}
function limiter(s){
 const candidates=[
  ["Protein",s.protein.score,"Kas remodeling/retention için protein ortalaması düşük."],
  ["Performance Fueling",s.fuel,"Enerji/karbonhidrat/hidrasyon kombinasyonu antrenman yakıtını sınırlıyor."],
  ["Hydration",s.hydr.score,"Kayıtlı sıvı alımı ve antrenman yükü hidrasyonu sınırlıyor olabilir."],
  ["Micronutrients",s.micro.score,"Gıda kayıtlarında bazı mikro besinler referansın altında kalıyor."],
  ["Hypertrophy Environment",s.hyper,"Toplam adaptasyon ortamı hedeflenen seviyenin altında."]
 ].sort((a,b)=>a[1]-b[1]);
 return candidates[0];
}
function renderMatrix(s){
 const items=[
  ["Hypertrophy Environment",s.hyper,"Kas kazanımı için genel ortam",false],
  ["Muscle Retention",s.retain,"Deficitte kası koruma sinyali",false],
  ["Performance Fueling",s.fuel,`${s.carb.gkg.toFixed(1)} g/kg karbonhidrat`,false],
  ["Hydration",s.hydr.score,s.hydr.recorded?`Bugün ${s.hydr.liters.toFixed(1)} L · su ${s.hydr.directLiters.toFixed(1)} L + besin/içecek ${s.hydr.foodLiters.toFixed(1)} L · model ${s.hydr.targetLowL.toFixed(1)}–${s.hydr.targetHighL.toFixed(1)} L`:`Bugün doğrudan su kaydı yok · besin/içecek ${s.hydr.foodLiters.toFixed(1)} L`,false],
  ["Micronutrient Coverage",s.micro.score,s.micro.lows.length?`${s.micro.lows.length} düşük alan`:"Belirgin düşük alan yok",false],
  ["Protein Adequacy",s.protein.score,`${s.protein.gkg.toFixed(2)} g/kg`,false],
  ["Under-fuelling Risk",s.under,"Uzamış enerji açığı risk sinyali",true],
  ["Phase Quality",s.phase.score,s.phase.mode,false]
 ];
 q("nutritionImpactMatrix").innerHTML=items.map(([name,score,note,inverse])=>{
   const good=inverse?score<=30:score>=75,bad=inverse?score>=60:score<55,cls=bad?"bad":good?"":"warn";
   const shown=inverse?`${score}/100 risk`:`${score}/100`;
   return `<div class="impact-tile ${cls}"><span>${name}</span><strong>${classifyScore(score,inverse)}</strong><b>${shown}</b><div class="impact-meter"><i style="width:${inverse?100-score:score}%"></i></div><small>${note}</small></div>`;
 }).join("");
}
function renderEffects(s){
 const rows=[];
 if(s.energy.severity<=-1)rows.push(["Energy deficit",s.energy.severity===-2?"Yüksek":"Orta","Kilo/enerji trendi cut yönünde. Uzarsa recovery, training volume ve kas koruma baskısı artabilir."]);
 if(s.energy.severity>=1)rows.push(["Energy surplus",s.energy.severity===2?"Yüksek":"Kontrollü","Surplus kas kazanımını destekleyebilir; hızlı kilo + bel artışı gereksiz yağ kazanımı olasılığını artırır."]);
 if(s.protein.score<85)rows.push(["Protein","Sınırlayıcı",`${s.protein.gkg.toFixed(2)} g/kg ortalama, direnç antrenmanı hedefi için düşük/sınırda.`]);
 if(s.carb.score<75)rows.push(["Carbohydrate / glycogen","Sınırlayıcı",`${s.carb.gkg.toFixed(1)} g/kg; mevcut koşu + antrenman yüküne göre yakıt erişilebilirliği düşük olabilir.`]);
 if(!s.hydr.recorded)rows.push(["Hydration","Veri eksik",`Bugün Water Ledger'da doğrudan su kaydı yok. Besin/içeceklerden ${s.hydr.foodLiters.toFixed(1)} L su kaydı var; sistem kaydedilmemiş suyu 0 L içtin diye yorumlamıyor.`]);
 else if(s.hydr.score<75)rows.push(["Hydration","Dikkat",`Bugünkü toplam kayıt ${s.hydr.liters.toFixed(1)} L; model ${s.hydr.targetLowL.toFixed(1)}–${s.hydr.targetHighL.toFixed(1)} L. Sweat-rate olmadığı için kesin eksik miktar veya dehidrasyon yüzdesi çıkarılmıyor.`]);
 if(s.perf.delta!=null&&s.perf.delta<-5)rows.push(["Performance trend","Negatif",`Yaklaşık ${Math.abs(s.perf.delta).toFixed(1)}% düşüş sinyali; nutrition, sleep ve fatigue birlikte değerlendirilmeli.`]);
 if(s.caf.risk!=null&&s.caf.risk>35)rows.push(["Caffeine timing","Uyku riski",`Saat kayıtlı kafeinlerin yaklaşık %${s.caf.risk}'i yatıştan 6 saat içinde.`]);
 if(s.micro.lows.length)rows.push(["Micronutrients","Food-log signal",`Sık düşük görünen alanlar: ${s.micro.lows.join(", ")}. Bu bir laboratuvar eksikliği teşhisi değildir.`]);
 if(!rows.length)rows.push(["Genel durum","Stabil","Mevcut beslenme kayıtlarında belirgin bir ana risk sinyali oluşmadı. Uzun dönem trendi koru."]);
 q("nutritionImpactEffects").innerHTML=rows.map(x=>`<div class="rec-card ${x[1]==="Yüksek"||x[1]==="Sınırlayıcı"?"warn":"good"}"><strong>${x[0]} · ${x[1]}</strong>${x[2]}</div>`).join("");
}
function renderCausalMap(){
 const rows=[
  ["Enerji dengesi","→","Kilo yönü · recovery · uzun dönem kas koruma"],
  ["Protein","→","Muscle remodeling · hypertrophy support · retention"],
  ["Karbonhidrat","→","Glikojen erişilebilirliği · yüksek hacim · koşu yakıtı"],
  ["Su + elektrolit","→","Hidrasyon · kardiyovasküler yük · dayanıklılık bağlamı"],
  ["Mikronutrient kapsamı","→","Uzun dönem fizyolojik yeterlilik için destekleyici sinyal"],
  ["Kafein zamanı","→","Akut performans ↔ uyku/recovery trade-off"],
  ["Beslenme + antrenman","→","Performance trend → adaptation → athlete profile"]
 ];
 q("nutritionCausalMap").innerHTML=rows.map(r=>`<div class="causal-row"><strong>${r[0]}</strong><div class="causal-arrow">${r[1]}</div><span>${r[2]}</span></div>`).join("");
}
function renderPhase(s){
 const w=s.wt.rate==null?"yetersiz veri":`${s.wt.rate>=0?"+":""}${s.wt.rate.toFixed(2)} kg/hafta`;
 const wa=s.waist.per4w==null?"yetersiz veri":`${s.waist.per4w>=0?"+":""}${s.waist.per4w.toFixed(1)} cm/4 hafta`;
 const p=s.perf.delta==null?"yetersiz veri":`${s.perf.delta>=0?"+":""}${s.perf.delta.toFixed(1)}%`;
 q("nutritionPhaseQuality").innerHTML=`<div class="phase-card"><div class="phase-head"><strong>${s.phase.mode}</strong><span class="plan-badge">${s.phase.score}/100</span></div><p>${s.phase.text}</p></div>
 <div class="summary-list">
  <div class="summary-item"><span>Kilo trendi</span><strong>${w}</strong></div>
  <div class="summary-item"><span>Bel trendi</span><strong>${wa}</strong></div>
  <div class="summary-item"><span>Performance trend</span><strong>${p}</strong></div>
  <div class="summary-item"><span>Protein</span><strong>${s.protein.gkg.toFixed(2)} g/kg</strong></div>
  <div class="summary-item"><span>Bugünkü su</span><strong>${s.hydr.recorded?s.hydr.liters.toFixed(1)+" L":"Su kaydı yok"}</strong></div>
  <div class="summary-item"><span>14g su ort.</span><strong>${s.hydr.rolling?.avgTotalL!=null?s.hydr.rolling.avgTotalL.toFixed(1)+" L / kayıtlı gün":"—"}</strong></div>
 </div>`;
}
function renderEvidence(){
 const el=q("nutritionEvidencePanel");if(!el)return;
 if(!EVIDENCE){el.innerHTML='<div class="record-empty">Kanıt kütüphanesi yükleniyor…</div>';return}
 el.innerHTML=EVIDENCE.principles.map(x=>`<div class="evidence-item"><strong>${x.title}</strong><span>${x.summary}</span><div class="evidence-chip">${x.pmid?`PMID ${x.pmid}`:x.doi||"Evidence"}</div></div>`).join("")+
 `<div class="evidence-item"><strong>Motor sınırı</strong><span>${EVIDENCE.engineering_notes[0]} ${EVIDENCE.engineering_notes[2]}</span><div class="evidence-chip">Heuristic ≠ diagnosis</div></div>`;
}
function render(){
 if(!q("nutritionImpactMatrix"))return;
 const s=build();
 q("nutritionImpactConfidence").textContent=`Güven ${s.conf}/100`;
 q("nutritionObservedState").textContent=s.energy.state;
 q("nutritionObservedStateText").textContent=s.energy.text+(s.energy.delta!=null?` 14G ortalama hedef farkı ${s.energy.delta>=0?"+":""}${Math.round(s.energy.delta)} kcal/gün.`:"");
 q("nutritionWeightTrend").textContent=s.wt.rate==null?"--":`${s.wt.rate>=0?"+":""}${s.wt.rate.toFixed(2)}`;
 q("nutritionWaistTrend").textContent=s.waist.per4w==null?"--":`${s.waist.per4w>=0?"+":""}${s.waist.per4w.toFixed(1)}`;
 q("nutritionAvgCalories").textContent=s.n.kcal?Math.round(s.n.kcal):"--";
 renderMatrix(s);renderEffects(s);renderCausalMap();renderPhase(s);renderEvidence();
 const l=limiter(s);
 q("nutritionPrimaryLimiter").innerHTML=`<strong>Primary limiter: ${l[0]}</strong><br>${l[2]} <span class="athlete-profile-note">Bu sınıflandırma ölçülen trend + food log + heuristic ağırlıklarla üretilir; kesin biyolojik etki yüzdesi değildir.</span>`;
}
function init(){
 render();
 document.querySelector('.nav-btn[data-page="nutrition"]')?.addEventListener("click",()=>setTimeout(render,0));
 q("saveSettingsBtn")?.addEventListener("click",()=>setTimeout(render,100));
}
window.NutritionImpact={render,build,rollingNutrition,rollingHydration,hasWaterRecord};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
