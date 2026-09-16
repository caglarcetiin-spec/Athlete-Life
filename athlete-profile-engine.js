
(function(){
"use strict";
const CAT=window.CAPABILITY_CATALOG||{};
const TIERS=["Foundation","Developing","Intermediate","Advanced","Elite Skill Tier"];
const TIER_SCORE=[20,40,60,80,96];
const STRENGTH_BANDS={
 weighted_pullup:[1.05,1.20,1.40,1.60],
 weighted_dip:[1.10,1.30,1.55,1.85],
 bench:[0.75,1.00,1.25,1.50],
 ohp:[0.45,0.60,0.80,1.00],
 squat:[1.00,1.35,1.70,2.00],
 deadlift:[1.20,1.60,2.00,2.40]
};
db.capabilityRecords=db.capabilityRecords||[];
const editForms={
 calisthenics:{prefix:"capSkill",button:"addSkillCapability",values:["Value","Load","Note"]},
 strength:{prefix:"capStrength",button:"addStrengthCapability",values:["Load","Reps","BW"]},
 running:{prefix:"capRun",button:"addRunCapability",values:["Distance","Minutes","Note"]},
 power:{prefix:"capPower",button:"addPowerCapability",values:["Value","Note"]},
 balance_control:{prefix:"capBalance",button:"addBalanceCapability",values:["Value","Note"]},
 work_capacity:{prefix:"capWork",button:"addWorkCapability",values:["Value","Note"]},
 mobility:{prefix:"capMobility",button:"addMobilityCapability",values:["Value","Note"]},
 endurance:{prefix:"capEndurance",button:"addEnduranceCapability",values:["Value","Note"]}
};
const editingRecords=new Map();
function updateEditControls(domain){
 const form=editForms[domain],button=form&&q(form.button);if(!button)return;
 button.textContent=editingRecords.has(domain)?"Kaydı Güncelle":"Kaydet";
 let cancel=q(form.prefix+"CancelEdit");
 if(!cancel){cancel=document.createElement("button");cancel.id=form.prefix+"CancelEdit";cancel.type="button";cancel.className="secondary";cancel.textContent="Düzenlemeyi İptal Et";button.after(cancel)}
 cancel.hidden=!editingRecords.has(domain);cancel.onclick=()=>cancelEdit(domain);
}
function cancelEdit(domain){
 const form=editForms[domain];if(!form)return;
 editingRecords.delete(domain);
 form.values.forEach(suffix=>{if(q(form.prefix+suffix))q(form.prefix+suffix).value=""});
 if(q(form.prefix+"Date"))q(form.prefix+"Date").value=todayKey();
 updateEditControls(domain);
}

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function tierFromIndex(i){return TIERS[Math.max(0,Math.min(4,i))]}
function tierFromThreshold(value,bands,higher=true){
 if(value==null||!Number.isFinite(value))return {tier:"Foundation",idx:0,score:0};
 let idx=0;
 if(higher){
   if(value>=bands[0])idx=1;if(value>=bands[1])idx=2;if(value>=bands[2])idx=3;if(value>=bands[3])idx=4;
 }else{
   // bands passed high->low cutoffs for time: e.g. 35,30,25,20
   if(value<=bands[0])idx=1;if(value<=bands[1])idx=2;if(value<=bands[2])idx=3;if(value<=bands[3])idx=4;
 }
 return {tier:tierFromIndex(idx),idx,score:TIER_SCORE[idx]};
}
function e1rm(load,reps){
 const l=+load||0,r=Math.max(1,+reps||1);
 return r<=1?l:l*(1+r/30);
}
function getSkill(id){return (CAT.calisthenics||[]).find(x=>x.id===id)}
function getStrength(id){return (CAT.strength||[]).find(x=>x.id===id)}
function getRun(id){return (CAT.running||[]).find(x=>x.id===id)}
function getPower(id){return (CAT.power||[]).find(x=>x.id===id)}
function getGeneric(domain,id){return (CAT[domain]||[]).find(x=>x.id===id)}
function genericResult(domain,r){
 const t=getGeneric(domain,r.testId),v=+r.value||0;
 if(!t||!v)return {tier:"Foundation",score:0};
 return tierFromThreshold(v,t.bands||[25,50,75,90],t.higher!==false);
}
function addRecord(rec){
 const date=new Date(rec.date+"T12:00:00Z");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(rec.date||"")||isNaN(date)||date.toISOString().slice(0,10)!==rec.date){alert("Geçerli bir test tarihi seç.");return false}
 const draft=editingRecords.get(rec.domain),before=db.capabilityRecords;
 const index=draft?before.findIndex(r=>r.id===draft.id):-1,previous=index>=0?before[index]:null;
 if(draft&&(draft.owner!==db||!previous||JSON.stringify(previous)!==draft.snapshot)){
  alert("Bu kayıt düzenleme sırasında değişti. İptal edip güncel kaydı yeniden aç.");return false;
 }
 const now=new Date().toISOString();
 if(previous)rec={...previous,...rec,id:previous.id,createdAt:previous.createdAt,updatedAt:now};
 else{
  let id=Date.now()+Math.floor(Math.random()*1000);while(before.some(r=>r.id===id))id++;
  rec={...rec,id,createdAt:now};
 }
 db.capabilityRecords=previous?before.map((r,i)=>i===index?rec:r):[...before,rec];
 try{if(save()===false)throw new Error("Save rejected")}
 catch(error){db.capabilityRecords=before;alert("Kayıt kaydedilemedi. Önceki kayıt korundu; değişikliklerini tekrar kaydedebilirsin.");return false}
 if(draft)cancelEdit(rec.domain);
 renderAll();window.RecordManager?.render?.();return true;
}
function deleteRecord(id){
 if(!confirm("Bu capability kaydı silinsin mi?"))return;
 db.capabilityRecords=db.capabilityRecords.filter(x=>x.id!==id);save();renderAll();
}
function editRecord(id){
 const r=db.capabilityRecords.find(x=>x.id===id);if(!r)return;
 if(!editForms[r.domain])return;
 editingRecords.set(r.domain,{id,owner:db,snapshot:JSON.stringify(r)});
 if(r.domain==="calisthenics"){
   activateTab("calisthenics");q("capSkillSelect").value=r.testId;q("capSkillSelect").dispatchEvent(new Event("change"));q("capSkillValue").value=r.value;q("capSkillLoad").value=r.load||"";q("capSkillDate").value=r.date;q("capSkillNote").value=r.note||"";
 }else if(r.domain==="strength"){
   activateTab("strength");q("capStrengthSelect").value=r.testId;q("capStrengthLoad").value=r.load;q("capStrengthReps").value=r.reps;q("capStrengthBW").value=r.bodyweight||"";q("capStrengthDate").value=r.date;
 }else if(r.domain==="running"){
   activateTab("running");q("capRunSelect").value=r.testId;q("capRunSelect").dispatchEvent(new Event("change"));q("capRunDistance").value=r.distanceKm||"";q("capRunMinutes").value=r.minutes;q("capRunDate").value=r.date;q("capRunNote").value=r.note||"";
 }else if(r.domain==="power"){
   activateTab("power");q("capPowerSelect").value=r.testId;q("capPowerSelect").dispatchEvent(new Event("change"));q("capPowerValue").value=r.value;q("capPowerDate").value=r.date;q("capPowerNote").value=r.note||"";
 }else{
   const cfg={balance_control:["balance","capBalance"],work_capacity:["work","capWork"],mobility:["mobility","capMobility"],endurance:["endurance","capEndurance"]}[r.domain];
   if(cfg){activateTab(cfg[0]);q(cfg[1]+"Select").value=r.testId;q(cfg[1]+"Select").dispatchEvent(new Event("change"));q(cfg[1]+"Value").value=r.value;q(cfg[1]+"Date").value=r.date;q(cfg[1]+"Note").value=r.note||"";}
 }
 updateEditControls(r.domain);
 q(editForms[r.domain].prefix+"Date")?.focus();
}
function skillPerformanceScore(r){
 const s=getSkill(r.testId);if(!s)return 0;
 let base={1:25,2:40,3:55,4:70,5:84,6:90,7:95,8:99}[s.difficulty]||20;
 const v=+r.value||0;
 if(s.metric==="seconds")base+=Math.min(10,v>=20?10:v/2);
 else if(s.metric==="reps")base+=Math.min(10,v*1.5);
 else if(s.metric==="load_reps"){
   const bw=latestBW(),ratio=bw?e1rm(bw+(+r.load||0),v)/bw:1;
   base+=Math.min(12,Math.max(0,(ratio-1)*18));
 }
 return clamp(Math.round(base),0,100);
}
function skillTier(r){
 const s=getSkill(r.testId);if(!s)return {tier:"Foundation",score:0};
 const score=skillPerformanceScore(r);
 let idx=score>=92?4:score>=78?3:score>=58?2:score>=38?1:0;
 return {tier:tierFromIndex(idx),score};
}
function latestBW(){
 const cap=[...db.capabilityRecords].filter(x=>x.domain==="strength"&&+x.bodyweight>0).sort((a,b)=>String(a.date).localeCompare(String(b.date))).at(-1);
 if(cap)return +cap.bodyweight;
 const bm=(db.bodyMeasurements||[]).filter(x=>+x.weight>0).sort((a,b)=>String(a.date).localeCompare(String(b.date))).at(-1);
 if(bm)return +bm.weight;
 return +(db.characterData?.bodyweight||0) || null;
}
function strengthResult(r){
 const s=getStrength(r.testId),bw=+r.bodyweight||latestBW();
 if(!s||!bw)return {tier:"Foundation",score:25,ratio:null,e1rm:null};
 let rm;
 if(s.type==="bodyweight_plus")rm=e1rm(bw+(+r.load||0),r.reps);
 else rm=e1rm(+r.load||0,r.reps);
 const ratio=rm/bw,bands=STRENGTH_BANDS[r.testId]||[.6,.9,1.2,1.5];
 const t=tierFromThreshold(ratio,bands,true);
 return {...t,ratio,e1rm:rm};
}
function runningResult(r){
 const d=+r.distanceKm||getRun(r.testId)?.distanceKm,mins=+r.minutes||0;
 if(!d||!mins)return {tier:"Foundation",score:0,pace:null};
 const pace=mins/d;
 let bands=null;
 if(Math.abs(d-5)<.2)bands=[35,30,25,20];
 else if(Math.abs(d-10)<.3)bands=[75,62,52,42];
 else if(Math.abs(d-21.0975)<.5)bands=[165,135,115,95];
 else if(Math.abs(d-42.195)<1)bands=[360,300,255,210];
 // Custom distances classified by pace with deliberately broad bands.
 let t=bands?tierFromThreshold(mins,bands,false):tierFromThreshold(pace,[7.5,6.3,5.2,4.2],false);
 return {...t,pace};
}
function powerResult(r){
 const v=+r.value||0,id=r.testId;
 if(id==="cooper")return tierFromThreshold(v,[1800,2200,2600,3000],true);
 if(id==="vertical_jump")return tierFromThreshold(v,[25,35,45,55],true);
 if(id==="broad_jump")return tierFromThreshold(v,[150,190,225,255],true);
 if(id==="sprint10")return tierFromThreshold(v,[2.4,2.1,1.9,1.75],false);
 if(id==="sprint30")return tierFromThreshold(v,[5.5,4.9,4.4,4.0],false);
 if(id==="max_pullups")return tierFromThreshold(v,[5,10,15,22],true);
 if(id==="max_pushups")return tierFromThreshold(v,[15,30,45,60],true);
 if(id==="burpee5")return tierFromThreshold(v,[35,50,65,80],true);
 return {tier:"Foundation",score:20};
}
function bestByTest(domain,resultFn){
 const groups={};
 db.capabilityRecords.filter(x=>x.domain===domain).forEach(r=>{
   const res=resultFn(r),score=res.score||0;
   if(!groups[r.testId]||score>groups[r.testId].res.score)groups[r.testId]={r,res};
 });
 return groups;
}
function migrateLegacyEvidence(){
 // Read legacy Character data as evidence without creating duplicate records.
 const d=db.characterData||{},virtual=[];
 const push=(domain,testId,value,extra={})=>{if(value!=null&&value!=="")virtual.push({id:"legacy_"+testId,domain,testId,value:+value,date:d.updatedAt?.slice(0,10)||todayKey(),legacy:true,...extra})};
 push("calisthenics","full_planche",d.plancheSec);push("calisthenics","front_lever",d.frontLeverSec);push("calisthenics","back_lever",d.backLeverSec);push("calisthenics","muscle_up",d.muscleUpReps);push("calisthenics","l_sit",d.lSitSec);
 if(d.wpuLoad!=null)virtual.push({id:"legacy_wpu",domain:"strength",testId:"weighted_pullup",load:+d.wpuLoad,reps:+d.wpuReps||1,bodyweight:+d.bodyweight||latestBW(),date:d.updatedAt?.slice(0,10)||todayKey(),legacy:true});
 if(d.dipLoad!=null)virtual.push({id:"legacy_dip",domain:"strength",testId:"weighted_dip",load:+d.dipLoad,reps:+d.dipReps||1,bodyweight:+d.bodyweight||latestBW(),date:d.updatedAt?.slice(0,10)||todayKey(),legacy:true});
 if(d.ohpKg!=null)virtual.push({id:"legacy_ohp",domain:"strength",testId:"ohp",load:+d.ohpKg,reps:1,bodyweight:+d.bodyweight||latestBW(),date:d.updatedAt?.slice(0,10)||todayKey(),legacy:true});
 if(d.run5kMin>0)virtual.push({id:"legacy_5k",domain:"running",testId:"5k",distanceKm:5,minutes:+d.run5kMin,date:d.updatedAt?.slice(0,10)||todayKey(),legacy:true});
 push("power","cooper",d.cooperM);push("power","vertical_jump",d.verticalJumpCm);push("power","broad_jump",d.broadJumpCm);push("power","sprint10",d.sprint10Sec);push("power","sprint30",d.sprint30Sec);push("power","max_pullups",d.maxPullups);push("power","max_pushups",d.maxPushups);push("power","burpee5",d.burpee5);
 return virtual;
}
function allEvidence(){return [...migrateLegacyEvidence(),...db.capabilityRecords]}
function domainSummary(){
 const all=allEvidence();
 const skills=all.filter(x=>x.domain==="calisthenics").map(r=>({r,res:skillTier(r)})).sort((a,b)=>b.res.score-a.res.score);
 const strength=all.filter(x=>x.domain==="strength").map(r=>({r,res:strengthResult(r)})).sort((a,b)=>b.res.score-a.res.score);
 const runs=all.filter(x=>x.domain==="running").map(r=>({r,res:runningResult(r)})).sort((a,b)=>b.res.score-a.res.score);
 const power=all.filter(x=>x.domain==="power").map(r=>({r,res:powerResult(r)}));
 const balanceDirect=all.filter(x=>x.domain==="balance_control").map(r=>({r,res:genericResult("balance_control",r)})).sort((a,b)=>b.res.score-a.res.score);
 const workDirect=all.filter(x=>x.domain==="work_capacity").map(r=>({r,res:genericResult("work_capacity",r)})).sort((a,b)=>b.res.score-a.res.score);
 const mobilityDirect=all.filter(x=>x.domain==="mobility").map(r=>({r,res:genericResult("mobility",r)})).sort((a,b)=>b.res.score-a.res.score);
 const enduranceDirect=all.filter(x=>x.domain==="endurance").map(r=>({r,res:genericResult("endurance",r)})).sort((a,b)=>b.res.score-a.res.score);
 const speed=power.filter(x=>["sprint10","sprint30"].includes(x.r.testId)).sort((a,b)=>b.res.score-a.res.score);
 const explosive=power.filter(x=>["vertical_jump","broad_jump"].includes(x.r.testId)).sort((a,b)=>b.res.score-a.res.score);
 const work=power.filter(x=>["max_pullups","max_pushups","burpee5"].includes(x.r.testId)).sort((a,b)=>b.res.score-a.res.score);
 const cooper=power.filter(x=>x.r.testId==="cooper").sort((a,b)=>b.res.score-a.res.score);
 const endScores=[...runs,...cooper].map(x=>x.res.score);
 const skillScore=skills.length?Math.round(avg(skills.slice(0,5).map(x=>x.res.score))):null;
 const relStrength=strength.filter(x=>["weighted_pullup","weighted_dip"].includes(x.r.testId));
 const absStrength=strength.filter(x=>!["weighted_pullup","weighted_dip"].includes(x.r.testId));
 const relative=relStrength.length?Math.round(avg(relStrength.slice(0,3).map(x=>x.res.score))):null;
 const absolute=absStrength.length?Math.round(avg(absStrength.slice(0,4).map(x=>x.res.score))):strength.length?Math.round(avg(strength.slice(0,3).map(x=>x.res.score))):null;
 const endurance=enduranceDirect.length?Math.round(avg(enduranceDirect.slice(0,4).map(x=>x.res.score))):(endScores.length?Math.round(avg(endScores.slice(0,4))):null);
 const powerScore=explosive.length?Math.round(avg(explosive.slice(0,3).map(x=>x.res.score))):null;
 const speedScore=speed.length?Math.round(avg(speed.slice(0,2).map(x=>x.res.score))):null;
 const workScore=workDirect.length?Math.round(avg(workDirect.slice(0,4).map(x=>x.res.score))):(work.length?Math.round(avg(work.slice(0,3).map(x=>x.res.score))):null);
 const balanceScore=balanceDirect.length?Math.round(avg(balanceDirect.slice(0,4).map(x=>x.res.score))):null;
 const mobilityScore=mobilityDirect.length?Math.round(avg(mobilityDirect.slice(0,4).map(x=>x.res.score))):null;
 return {
  "Calisthenics Skill":{score:skillScore,count:skills.length,best:skills[0]},
  "Relative Strength":{score:relative,count:relStrength.length,best:relStrength[0]},
  "Absolute Strength":{score:absolute,count:absStrength.length,best:absStrength[0]},
  "Running / Endurance":{score:endurance,count:enduranceDirect.length+runs.length+cooper.length,best:enduranceDirect[0]||runs[0]||cooper[0]},
  "Power":{score:powerScore,count:explosive.length,best:explosive[0]},
  "Speed":{score:speedScore,count:speed.length,best:speed[0]},
  "Work Capacity":{score:workScore,count:workDirect.length+work.length,best:workDirect[0]||work[0]},
  "Balance / Control":{score:balanceScore,count:balanceDirect.length,best:balanceDirect[0]},
  "Mobility":{score:mobilityScore,count:mobilityDirect.length,best:mobilityDirect[0]}
 };
}
function tierForScore(s){
 if(s==null)return "No Data";
 if(s>=88)return "Elite Skill Tier";
 if(s>=72)return "Advanced";
 if(s>=55)return "Intermediate";
 if(s>=35)return "Developing";
 return "Foundation";
}
function identity(dom){
 const vals=Object.entries(dom).filter(([,v])=>v.score!=null).sort((a,b)=>b[1].score-a[1].score);
 if(!vals.length)return {name:"Unclassified Athlete",text:"Profil için doğrudan performans verisi gerekiyor.",balance:null,spec:null,coverage:0};
 const scores=vals.map(x=>x[1].score),mean=avg(scores),sd=Math.sqrt(avg(scores.map(x=>(x-mean)**2))),balance=Math.round(clamp(100-sd*2,0,100));
 const median=[...scores].sort((a,b)=>a-b)[Math.floor(scores.length/2)],spec=Math.round(vals[0][1].score-median);
 const top=vals[0][0],second=vals[1]?.[0]||"",topScore=vals[0][1].score,secondScore=vals[1]?.[1].score||0;
 let name,text;
 if(vals.length>=4 && balance>=75 && mean>=58){name="Balanced Hybrid Athlete";text="Birden fazla performans alanında belirgin zayıf halka olmadan dengeli profil."}
 else if(top==="Calisthenics Skill" && (second==="Relative Strength"||secondScore>=60)){name="Skill-Dominant Calisthenics Hybrid";text="Teknik bodyweight becerileri ve relatif kuvvet profilin baskın."}
 else if(top==="Relative Strength"){name="Relative Strength Specialist";text="Vücut ağırlığına göre kuvvet üretimi profilinin ana özelliği."}
 else if(top==="Absolute Strength"){name="Strength-Dominant Athlete";text="Barbell/external-load kuvveti diğer alanlardan daha baskın."}
 else if(top==="Running / Endurance"){name="Endurance-Dominant Hybrid";text="Koşu/aerobik kapasite profilin baskın; diğer alanlar bunu tamamlıyor."}
 else if(top==="Power"||top==="Speed"){name="Power-Speed Athlete";text="Patlayıcı kuvvet ve hız özellikleri profilinde öne çıkıyor."}
 else if(top==="Work Capacity"){name="Work-Capacity Hybrid";text="Tekrarlı iş üretme ve lokal/karma dayanıklılık baskın."}
 else{name=`${top}–Dominant Athlete`;text="Profilin en güçlü ölçülen alanı "+top+"."}
 return {name,text,balance,spec,coverage:Math.round(vals.length/Object.keys(dom).length*100),top,topScore};
}
function confidence(dom){
 const counts=Object.values(dom).map(x=>x.count),domains=counts.filter(x=>x>0).length,total=counts.reduce((a,b)=>a+b,0);
 return clamp(Math.round(domains/Math.max(1,Object.keys(dom).length)*65+Math.min(35,total*2.5)),0,100);
}
function bestLabel(x){
 if(!x?.r)return "—";
 const r=x.r;
 if(r.domain==="calisthenics"){const s=getSkill(r.testId);return `${s?.name||r.testId}: ${r.value}${s?.metric==="seconds"?" sn":s?.metric==="reps"?" tekrar":` tekrar · +${r.load||0}kg`}`}
 if(r.domain==="strength"){const s=getStrength(r.testId),z=strengthResult(r);return `${s?.name||r.testId}: e1RM ${z.e1rm?z.e1rm.toFixed(1):"—"} kg · ${z.ratio?z.ratio.toFixed(2)+"× BW":""}`}
 if(r.domain==="running"){const s=getRun(r.testId),z=runningResult(r);return `${s?.name||r.distanceKm+" km"}: ${r.minutes} dk · ${z.pace?.toFixed(2)} dk/km`}
 if(["balance_control","work_capacity","mobility","endurance"].includes(r.domain)){const t=getGeneric(r.domain,r.testId);return `${t?.name||r.testId}: ${r.value} ${t?.unit||""}`}
 const p=getPower(r.testId);return `${p?.name||r.testId}: ${r.value} ${p?.unit||""}`;
}
function renderIdentity(){
 const dom=domainSummary(),id=identity(dom),conf=confidence(dom);
 q("athleteTypeName").textContent=id.name;q("athleteTypeExplanation").textContent=id.text;
 q("athleteBalanceIndex").textContent=id.balance==null?"--":id.balance+"/100";
 q("athleteSpecialization").textContent=id.spec==null?"--":"+"+id.spec;
 q("athleteDataCoverage").textContent=id.coverage+"%";q("athleteIdentityConfidence").textContent="Güven "+conf+"/100";
 q("athleteDomainMatrix").innerHTML=Object.entries(dom).map(([name,d])=>{
   const tier=tierForScore(d.score),cls=tier.replaceAll(" ","");
   return `<div class="domain-tile"><span>${name}</span><strong>${tier}</strong><b>${d.score==null?"--":d.score+"/100"}</b><div class="domain-meter"><i style="width:${d.score||0}%"></i></div><small>${d.count} veri · ${esc(bestLabel(d.best))}</small></div>`;
 }).join("");
 const known=Object.entries(dom).filter(([,d])=>d.score!=null).sort((a,b)=>b[1].score-a[1].score);
 const strong=known[0],weak=known.at(-1);
 const exposure=window.AthleteLoadMesh?.rolling?.(7)||{};
 q("athleteIdentityInsight").innerHTML=known.length?`<strong>Profil özeti:</strong> en güçlü ölçülen alan <b>${strong[0]}</b> (${tierForScore(strong[1].score)}), en düşük ölçülen alan <b>${weak[0]}</b> (${tierForScore(weak[1].score)}). ${exposure.sessions?`Son 7 günde ${exposure.sessions} analiz edilen seans · nöral ${Math.round(exposure.neuralDemand||0)}/100 · mekanik ${Math.round(exposure.mechanicalDemand||0)}/100 · ${Math.round(exposure.highSpeedExposureSec||0)} sn high-speed exposure var. Bu <b>training exposure context</b> olarak gösterilir; Capability test skorunun yerine geçmez.`:""} Buradaki “Elite Skill Tier” bir hareket/alan performans katmanıdır; resmi elit sporcu statüsü değildir.`:"Profil için Capability Lab'e performans verisi ekle.";
 renderTierExplanation(dom);renderNextTests(dom);
}
function renderTierExplanation(dom){
 const el=q("athleteTierExplanation");if(!el)return;
 el.innerHTML=Object.entries(dom).map(([n,d])=>`<div class="rec-card ${d.score>=72?"good":d.score==null?"warn":""}"><strong>${n} · ${tierForScore(d.score)}</strong>${d.score==null?"Doğrudan test verisi yok.":`${d.score}/100 · ${d.count} doğrudan/legacy veri. ${esc(bestLabel(d.best))}`}</div>`).join("")+
 `<div class="rec-card"><strong>Seviye terminolojisi</strong>Foundation → Developing → Intermediate → Advanced → Elite Skill Tier. Bunlar Athlete OS şeffaf performans bantlarıdır; nüfus yüzdelikleri değildir.</div>`;
}
function renderNextTests(dom){
 const wants=[];
 if(dom["Calisthenics Skill"].count<2)wants.push(["Calisthenics","En zor statik hareket + max hold ve strict dynamic skill testi"]);
 if(dom["Relative Strength"].count<2)wants.push(["Relative Strength","Weighted Pull-Up ve Weighted Dip load+reps+bodyweight"]);
 if(dom["Absolute Strength"].count<2)wants.push(["Absolute Strength","Bench/OHP + squat/deadlift veya erişebildiğin güvenli ana lift"]);
 if(dom["Running / Endurance"].count<1)wants.push(["Running","5K time trial veya standardize Cooper 12 dk"]);
 if(dom["Power"].count<1)wants.push(["Power","3 deneme CMJ/vertical jump veya standing broad jump"]);
 if(dom["Speed"].count<1)wants.push(["Speed","Standardize 10 m veya 30 m sprint"]);
 if(dom["Work Capacity"].count<1)wants.push(["Work Capacity","Max strict pull-up, density testi veya 5 dk burpee"]);
 if(dom["Balance / Control"].count<1)wants.push(["Balance / Control","Single-leg balance veya freestanding handstand control testi"]);
 if(dom["Mobility"].count<1)wants.push(["Mobility","Knee-to-wall, shoulder flexion veya active straight-leg raise"]);
 if(!wants.length)wants.push(["Profil kapsamı","Ana alanların tamamında doğrudan veri var; 6–8 haftada retest yap."]);
 q("athleteNextTests").innerHTML=wants.map(x=>`<div class="rec-card ${x[0]==="Profil kapsamı"?"good":"warn"}"><strong>${x[0]}</strong>${x[1]}</div>`).join("");
}
function formatRecord(r){
 if(r.domain==="calisthenics"){
  const s=getSkill(r.testId),z=skillTier(r);return {name:s?.name||r.testId,value:s?.metric==="seconds"?`${r.value} sn`:s?.metric==="load_reps"?`${r.value} tekrar · +${r.load||0} kg`:`${r.value} tekrar`,tier:z.tier,meta:`${r.date} · ${s?.group?esc(s.group)+" · ":""}difficulty ${s?.difficulty||"?"}/8`};
 }
 if(r.domain==="strength"){
  const s=getStrength(r.testId),z=strengthResult(r);return {name:s?.name||r.testId,value:`${r.load} kg × ${r.reps}`,tier:z.tier,meta:`e1RM ${z.e1rm?.toFixed(1)||"—"} kg · ${z.ratio?.toFixed(2)||"—"}× BW · ${r.date}`};
 }
 if(r.domain==="running"){
  const s=getRun(r.testId),z=runningResult(r);return {name:s?.name||`${r.distanceKm} km`,value:`${r.minutes} dk`,tier:z.tier,meta:`${z.pace?.toFixed(2)||"—"} dk/km · ${r.date}`};
 }
 if(["balance_control","work_capacity","mobility","endurance"].includes(r.domain)){
  const t=getGeneric(r.domain,r.testId),z=genericResult(r.domain,r);return {name:t?.name||r.testId,value:`${r.value} ${t?.unit||""}`,tier:z.tier,meta:r.date};
 }
 const p=getPower(r.testId),z=powerResult(r);return {name:p?.name||r.testId,value:`${r.value} ${p?.unit||""}`,tier:z.tier,meta:r.date};
}
function renderRecords(){
 q("capabilityRecordCount").textContent=`${db.capabilityRecords.length} kayıt`;
 const domains=["calisthenics","strength","running","power","balance_control","work_capacity","mobility","endurance"];
 domains.forEach(domain=>{
  const id={calisthenics:"calisthenicsCapabilityList",strength:"strengthCapabilityList",running:"runningCapabilityList",power:"powerCapabilityList",balance_control:"balanceCapabilityList",work_capacity:"workCapabilityList",mobility:"mobilityCapabilityList",endurance:"enduranceCapabilityList"}[domain],el=q(id);if(!el)return;
  const rows=db.capabilityRecords.filter(x=>x.domain===domain).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  if(!rows.length){el.innerHTML='<div class="record-empty">Henüz kayıt yok.</div>';return}
  el.innerHTML=rows.map(r=>{const f=formatRecord(r),cls=f.tier.replaceAll(" ","");return `<div class="capability-best-card"><div class="cap-head"><strong>${esc(f.name)}</strong><span class="tier-badge tier-${cls}">${esc(f.tier)}</span></div><div class="cap-value">${esc(f.value)}</div><div class="cap-meta">${esc(f.meta)}${r.note?` · ${esc(r.note)}`:""}</div><div class="capability-card-actions"><button onclick="AthleteProfile.edit(${r.id})">Düzenle</button><button class="delete" onclick="AthleteProfile.delete(${r.id})">Sil</button></div></div>`}).join("");
 });
}
function activateTab(name){
 document.querySelectorAll(".capability-tab").forEach(b=>b.classList.toggle("active",b.dataset.capTab===name));
 document.querySelectorAll(".capability-panel").forEach(p=>p.classList.toggle("active",p.id===`capPanel${name[0].toUpperCase()+name.slice(1)}`));
}
function bindForms(){
 document.querySelectorAll(".capability-tab").forEach(b=>b.onclick=()=>activateTab(b.dataset.capTab));
 const skillGroups=[];
 (CAT.calisthenics||[]).forEach(x=>{const g=x.group||"Other";let row=skillGroups.find(v=>v.name===g);if(!row){row={name:g,items:[]};skillGroups.push(row)}row.items.push(x)});
 q("capSkillSelect").innerHTML=skillGroups.map(g=>`<optgroup label="${esc(g.name)}">${g.items.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")}</optgroup>`).join("");
 q("capStrengthSelect").innerHTML=(CAT.strength||[]).map(x=>`<option value="${x.id}">${x.name}</option>`).join("");
 q("capRunSelect").innerHTML=(CAT.running||[]).map(x=>`<option value="${x.id}">${x.name}</option>`).join("");
 q("capPowerSelect").innerHTML=(CAT.power||[]).map(x=>`<option value="${x.id}">${x.name}</option>`).join("");
 [["balance_control","capBalance"],["work_capacity","capWork"],["mobility","capMobility"],["endurance","capEndurance"]].forEach(([domain,prefix])=>{q(prefix+"Select").innerHTML=(CAT[domain]||[]).map(x=>`<option value="${x.id}">${x.name}</option>`).join("");});
 ["capSkillDate","capStrengthDate","capRunDate","capPowerDate","capBalanceDate","capWorkDate","capMobilityDate","capEnduranceDate"].forEach(id=>q(id).value=todayKey());
 const skillChange=()=>{
   const s=getSkill(q("capSkillSelect").value),load=s?.metric==="load_reps";q("capSkillLoadWrap").hidden=!load;
   q("capSkillValueLabel").childNodes[0].nodeValue=s?.metric==="seconds"?"Süre (sn)":s?.metric==="load_reps"?"Tekrar":"Tekrar";
 };
 q("capSkillSelect").onchange=skillChange;skillChange();
 q("capRunSelect").onchange=()=>q("capCustomDistanceWrap").hidden=q("capRunSelect").value!=="custom";
 q("capPowerSelect").onchange=()=>{const p=getPower(q("capPowerSelect").value);q("capPowerUnit").textContent="Birim: "+(p?.unit||"")};q("capPowerSelect").onchange();
 [["balance_control","capBalance"],["work_capacity","capWork"],["mobility","capMobility"],["endurance","capEndurance"]].forEach(([domain,prefix])=>{const fn=()=>{const t=getGeneric(domain,q(prefix+"Select").value);q(prefix+"Unit").textContent="Birim: "+(t?.unit||"")};q(prefix+"Select").onchange=fn;fn();});

 q("addSkillCapability").onclick=()=>{
   const s=getSkill(q("capSkillSelect").value),v=+q("capSkillValue").value;if(!s||!v)return alert("Performans değerini gir.");
   if(!addRecord({domain:"calisthenics",testId:s.id,value:v,load:+q("capSkillLoad").value||0,date:q("capSkillDate").value||todayKey(),note:q("capSkillNote").value||"",dataConfidence:"high"}))return;
   q("capSkillValue").value="";q("capSkillLoad").value="";q("capSkillNote").value="";
 };
 q("addStrengthCapability").onclick=()=>{
   const s=getStrength(q("capStrengthSelect").value),load=+q("capStrengthLoad").value,reps=+q("capStrengthReps").value,bw=+q("capStrengthBW").value||latestBW();
   if(!s||!load||!reps||!bw)return alert("Yük, tekrar ve vücut ağırlığı gerekli.");
   addRecord({domain:"strength",testId:s.id,load,reps,bodyweight:bw,date:q("capStrengthDate").value||todayKey(),dataConfidence:"high"});
 };
 q("addRunCapability").onclick=()=>{
   const s=getRun(q("capRunSelect").value),dist=s?.id==="custom"?+q("capRunDistance").value:s?.distanceKm,mins=+q("capRunMinutes").value;
   if(!dist||!mins)return alert("Mesafe ve süre gerekli.");
   if(!addRecord({domain:"running",testId:s.id,distanceKm:dist,minutes:mins,date:q("capRunDate").value||todayKey(),note:q("capRunNote").value||"",dataConfidence:"high"}))return;
   q("capRunMinutes").value="";q("capRunNote").value="";
 };
 q("addPowerCapability").onclick=()=>{
   const p=getPower(q("capPowerSelect").value),v=+q("capPowerValue").value;if(!p||!v)return alert("Test değerini gir.");
   if(!addRecord({domain:"power",testId:p.id,value:v,date:q("capPowerDate").value||todayKey(),note:q("capPowerNote").value||"",dataConfidence:"high"}))return;
   q("capPowerValue").value="";q("capPowerNote").value="";
 };
 [["balance_control","capBalance","addBalanceCapability"],["work_capacity","capWork","addWorkCapability"],["mobility","capMobility","addMobilityCapability"],["endurance","capEndurance","addEnduranceCapability"]].forEach(([domain,prefix,button])=>{
   q(button).onclick=()=>{const t=getGeneric(domain,q(prefix+"Select").value),v=+q(prefix+"Value").value;if(!t||!v)return alert("Test değerini gir.");if(!addRecord({domain,testId:t.id,value:v,date:q(prefix+"Date").value||todayKey(),note:q(prefix+"Note").value||"",dataConfidence:"high"}))return;q(prefix+"Value").value="";q(prefix+"Note").value="";};
 });
 Object.keys(editForms).forEach(updateEditControls);
}
function renderAll(){renderRecords();renderIdentity();try{renderCharacter()}catch(e){}}
function init(){
 bindForms();renderAll();
 document.querySelector('.nav-btn[data-page="character"]')?.addEventListener("click",()=>setTimeout(renderAll,0));
}
window.AthleteProfile={render:renderAll,delete:deleteRecord,edit:editRecord,cancelEdit,domainSummary,identity};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
