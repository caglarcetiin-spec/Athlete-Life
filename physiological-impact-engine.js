
(function(){
"use strict";
const V="7.14";
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,+x||0));
const mean=a=>a?.length?a.reduce((s,x)=>s+(+x||0),0)/a.length:0;
const median=a=>{a=(a||[]).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return 0;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
const sum=a=>(a||[]).reduce((s,x)=>s+(+x||0),0);
function knowledge(name){return window.EXERCISE_KNOWLEDGE?.[name]||window.movementKnowledge?.(name)||{}}
function vals(row){return (row?.sets||[]).map(Number).filter(x=>x>0)}
function bw(){try{return window.LoadPrescriptionEngine?.bodyweight?.()||window.bodyweightNow?.()||72}catch(e){return 72}}
function sessionContext(date,row={}){
 const adh=row.adHocSessionId?(window.db?.adHocSessions||[]).find(x=>x.id===row.adHocSessionId):null;
 const fb=window.db?.sessionFeedback?.[date]||{};
 const rpe=+row.sessionRpe||+adh?.rpe||+fb.rpe||clamp(10-(Number.isFinite(+row.rir)?+row.rir:3),4,10);
 const duration=+row.sessionDurationMin||+adh?.duration||+fb.duration||0;
 const density=adh?.density?.score||({very_high:95,high:82,moderate:62,low:40}[row.densityClass]||null);
 return {date,rpe,duration,density,source:row.source||"training",feedback:fb,adHoc:adh};
}
function rest(row,ctx={}){const rs=(row?.restBetweenSets||[]).map(Number).filter(x=>x>=0);return rs.length?median(rs):Math.max(0,+row?.plannedRestSec||+ctx.roundRest||+ctx.adHoc?.roundRest||0)}
function q(row){return knowledge(row?.name).qualities||{}}
function muscleImpact(row){
 if(window.MovementIntelligence?.impactForRow)return window.MovementIntelligence.impactForRow(row)||{};
 const k=knowledge(row?.name),n=Math.max(1,vals(row).length);return Object.fromEntries(Object.entries(k.muscles||{}).map(([m,c])=>[m,c*n]));
}
function jointLoads(name){
 if(window.PainIntelligence?.jointLoadProfile)return window.PainIntelligence.jointLoadProfile(name);
 const s=String(name||"").toLowerCase(),o={shoulder:1,elbow:1,wrist:1,hand:1,neck:0,upperBack:1,lowBack:1,hip:1,knee:1,ankle:1,foot:1};
 const b=(k,v)=>o[k]=Math.max(o[k]||0,v);
 if(/planche|handstand|dip|push|ohp|bench/.test(s)){b("shoulder",8);b("elbow",6);b("wrist",6)}
 if(/pull|row|lever|curl|muscle-up|chin/.test(s)){b("shoulder",7);b("elbow",7);b("hand",5)}
 if(/squat|lunge|split/.test(s)){b("hip",7);b("knee",8);b("ankle",5)}
 if(/rdl|deadlift|hinge/.test(s)){b("hip",8);b("lowBack",7)}
 if(/sprint|run|jump|calf/.test(s)){b("hip",6);b("knee",7);b("ankle",8);b("foot",8)}
 return o;
}
function localRecovery(row,recoveryCost){
 const m=muscleImpact(row),mx=Math.max(1,...Object.values(m));
 return Object.fromEntries(Object.entries(m).map(([k,v])=>[k,Math.round(clamp(v/mx*recoveryCost))]));
}
function durationEstimate(row,mode){
 const v=vals(row),rs=(row.restBetweenSets||[]).map(Number).filter(x=>x>=0),setN=Math.max(1,v.length);
 if(mode==="static_isometric"||mode==="sprint"||mode==="interval")return (sum(v)+sum(rs))/60;
 if(mode==="continuous_aerobic"||mode==="mobility_recovery")return knowledge(row.name).metric==="minutes"?sum(v):(+row.sessionDurationMin||0);
 const repSec=mode==="explosive_skill"?2.0:mode==="loaded_dynamic"?2.8:2.5;
 return (sum(v)*repSec+sum(rs))/60;
}
function modelFor(row){
 const k=knowledge(row?.name),m=k.metric,mode=k.physiology?.mode,qq=k.qualities||{};
 if(k.doseModel==="sprint_work_seconds"||mode==="sprint")return"sprint";
 if(k.doseModel==="interval_work_seconds"||["interval","vo2"].includes(mode))return"interval";
 if(k.type==="MOBILITY"||/mobility|walk/i.test(row.name)&&m==="minutes")return"mobility_recovery";
 if(k.type==="RUN"&&(m==="minutes"||m==="km"))return"continuous_aerobic";
 if(m==="seconds"&&(k.type==="STATIC"||/isometric/i.test(k.contraction||"")))return"static_isometric";
 if((qq.power||0)>=8||/explosive|muscle-up|jump|plyo/i.test(`${k.contraction||""} ${row.name}`))return"explosive_skill";
 if(k.type==="WEIGHTED"||k.type==="BARBELL"||(+row.load||0)>0)return"loaded_dynamic";
 return"bodyweight_dynamic";
}
function baseConfidence(row,ctx,bonus=0){
 let c=45+bonus;if(vals(row).length)c+=12;if(Number.isFinite(+row.rir))c+=7;if(rest(row,ctx)>0)c+=7;if(+row.load>0)c+=5;if(+ctx.rpe)c+=6;if((row.setDurationsSec||[]).some(x=>+x>0))c+=6;return clamp(c,35,94);
}
function sprintImpact(row,ctx={}){
 const v=vals(row),rounds=v.length||1,per=mean(v)||6,total=sum(v)||per*rounds,R=rest(row,ctx),ratio=per?R/per:0,rpe=clamp((+ctx.rpe||8)*10),restQ=clamp(ratio>=8?100:ratio>=5?94:ratio>=3?82:ratio>=2?70:ratio>=1?55:40,35,100);
 const ph=clamp(per<=6?96:per<=10?88:per<=20?68:48),gly=clamp(per<=6?30:per<=10?52:per<=20?80:92),aer=clamp(10+Math.min(50,(rounds-1)*8)+(ratio<3?15:0)),neu=clamp(82+restQ*.10+rpe*.08),met=clamp(gly*.58+aer*.30+(100-restQ)*.12);
 const mechanical=clamp(76+rpe*.16+Math.min(12,rounds)),cardio=clamp(aer*.75+met*.25),rec=clamp(mechanical*.32+met*.25+neu*.23+rpe*.20),distance=(+row.sprintDistanceM||+row.distanceM||0)*rounds;
 const demands={mechanical,metabolic:met,neural:neu,skill:62,cardiovascular:cardio,stability:55,joint:70};
 return {mode:"sprint",rounds,perBoutSec:per,totalWorkSec:total,restSec:R,energySystems:{phosphagen:ph,glycolytic:gly,aerobic:aer},demands,
 adaptation:{strength:45,hypertrophy:30,power:94,neuromuscularPower:94,skill:58,speedExposure:96,repeatedSprintAbility:clamp(met*.55+aer*.3),aerobicConditioning:aer,workCapacity:clamp(met*.7+aer*.25)},
 loads:{metabolicDemand:met,mechanicalDemand:mechanical,neuralDemand:neu,cardiovascularDemand:cardio,recoveryCost:rec,mechanicalLowerBody:mechanical,highSpeedExposureSec:total*(rpe>=80?1:.75),totalSprintDistanceM:distance,avgSprintSpeedMS:distance&&total?distance/total:null},
 jointLoads:jointLoads(row.name),localRecovery:localRecovery(row,rec),confidence:baseConfidence(row,ctx,12),
 interpretation:"Sprint modeli: bout süresi + rest + round + RPE → power, high-speed, enerji sistemi ve lower-body recovery talebi."};
}
function intervalImpact(row,ctx={}){
 const v=vals(row),rounds=v.length||1,per=mean(v)||30,total=sum(v)||per*rounds,R=rest(row,ctx),duty=per/(per+Math.max(0,R)||per),rpe=clamp((+ctx.rpe||7)*10);
 const ph=clamp(per<=15?62:per<=30?45:28),gly=clamp(45+Math.min(38,per/60*32)+duty*22+rpe*.10),aer=clamp(40+duty*30+Math.min(20,total/360*20)+rpe*.10);
 const met=clamp(gly*.5+aer*.5),cardio=clamp(aer*.82+met*.18),neu=clamp(ph*.35+rpe*.30),mechanical=clamp(50+rpe*.18+(knowledge(row.name).qualities?.power||0)*2),rec=clamp(met*.36+cardio*.25+mechanical*.20+rpe*.19);
 return {mode:"interval",rounds,perBoutSec:per,totalWorkSec:total,restSec:R,energySystems:{phosphagen:ph,glycolytic:gly,aerobic:aer},
 demands:{mechanical,metabolic:met,neural:neu,skill:35,cardiovascular:cardio,stability:40,joint:55},
 adaptation:{strength:25,hypertrophy:15,power:45,skill:25,speedExposure:25,repeatedSprintAbility:clamp(gly*.48+aer*.35),aerobicConditioning:aer,workCapacity:clamp(met*.75+rpe*.18)},
 loads:{metabolicDemand:met,mechanicalDemand:mechanical,neuralDemand:neu,cardiovascularDemand:cardio,recoveryCost:rec,mechanicalLowerBody:mechanical,highSpeedExposureSec:0,totalSprintDistanceM:0,avgSprintSpeedMS:null},
 jointLoads:jointLoads(row.name),localRecovery:localRecovery(row,rec),confidence:baseConfidence(row,ctx,10),interpretation:"Interval modeli: work:rest + toplam çalışma + RPE metabolik/aerobik talebi belirler."};
}
function staticImpact(row,ctx={}){
 const k=knowledge(row.name),qq=k.qualities||{},v=vals(row),total=sum(v),avgHold=mean(v),R=rest(row,ctx),rir=Number.isFinite(+row.rir)?+row.rir:2,eff=clamp((10-rir)*10);
 const short=avgHold<=12,ph=clamp((short?68:48)+(qq.strength||0)*2),gly=clamp(28+Math.min(35,total/60*35)+(R<120?15:0)+eff*.12),aer=clamp(12+Math.min(30,total/120*30));
 const mechanical=clamp((qq.strength||0)*7+(qq.stability||0)*3+eff*.25),neural=clamp((qq.skill||0)*5+(qq.strength||0)*4+eff*.25),skill=clamp((qq.skill||0)*10),met=clamp(gly*.65+aer*.35),cardio=clamp(aer*.75+met*.15),rec=clamp(mechanical*.35+neural*.25+met*.22+eff*.18);
 return {mode:"static_isometric",rounds:v.length,totalWorkSec:total,restSec:R,energySystems:{phosphagen:ph,glycolytic:gly,aerobic:aer},
 demands:{mechanical,metabolic:met,neural,skill,cardiovascular:cardio,stability:clamp((qq.stability||0)*10),joint:Math.max(...Object.values(jointLoads(row.name))) *10},
 adaptation:{strength:clamp((qq.strength||0)*10),hypertrophy:clamp((qq.hypertrophy||0)*9+eff*.1),power:clamp((qq.power||0)*10),skill,aerobicConditioning:aer,workCapacity:clamp(met*.45+(qq.endurance||0)*4),speedExposure:0,repeatedSprintAbility:0},
 loads:{metabolicDemand:met,mechanicalDemand:mechanical,neuralDemand:neural,cardiovascularDemand:cardio,recoveryCost:rec,mechanicalLowerBody:0,highSpeedExposureSec:0,totalSprintDistanceM:0,avgSprintSpeedMS:null},
 jointLoads:jointLoads(row.name),localRecovery:localRecovery(row,rec),confidence:baseConfidence(row,ctx,8),interpretation:`İzometrik model: ${total.toFixed(1)} sn toplam hold + rest + RIR + skill/strength talebi.`};
}
function loadedImpact(row,ctx={}){
 const k=knowledge(row.name),qq=k.qualities||{},v=vals(row),reps=sum(v),sets=v.length||1,R=rest(row,ctx),rir=Number.isFinite(+row.rir)?+row.rir:2,eff=clamp((10-rir)*10),load=+row.load||0,rel=load/Math.max(40,bw());
 const lowRep=mean(v)<=6,density=R?clamp(100-R/3,20,90):50;
 const mechanical=clamp((qq.strength||0)*5.5+(qq.hypertrophy||0)*2+Math.min(28,rel*35)+eff*.18+sets*2);
 const metabolic=clamp((qq.hypertrophy||0)*4+Math.min(25,reps/40*25)+density*.25+eff*.18);
 const neural=clamp((qq.strength||0)*5+(qq.power||0)*3+(lowRep?16:5)+eff*.20);
 const ph=clamp((lowRep?58:36)+(qq.power||0)*4),gly=clamp(25+metabolic*.65),aer=clamp(10+density*.22+(qq.endurance||0)*4),cardio=clamp(aer*.55+metabolic*.28);
 const rec=clamp(mechanical*.35+metabolic*.25+neural*.22+eff*.18),lower=/squat|rdl|deadlift|lunge|calf/i.test(row.name)?mechanical:0;
 return {mode:"loaded_dynamic",rounds:sets,totalWorkSec:durationEstimate(row,"loaded_dynamic")*60,restSec:R,energySystems:{phosphagen:ph,glycolytic:gly,aerobic:aer},
 demands:{mechanical,metabolic,neural,skill:clamp((qq.skill||0)*10),cardiovascular:cardio,stability:clamp((qq.stability||0)*10),joint:Math.max(...Object.values(jointLoads(row.name)))*10},
 adaptation:{strength:clamp((qq.strength||0)*8+mechanical*.2),hypertrophy:clamp((qq.hypertrophy||0)*8+metabolic*.2),power:clamp((qq.power||0)*9),skill:clamp((qq.skill||0)*9),aerobicConditioning:aer,workCapacity:clamp(metabolic*.5+(qq.endurance||0)*5),speedExposure:0,repeatedSprintAbility:0},
 loads:{metabolicDemand:metabolic,mechanicalDemand:mechanical,neuralDemand:neural,cardiovascularDemand:cardio,recoveryCost:rec,mechanicalLowerBody:lower,highSpeedExposureSec:0,totalSprintDistanceM:0,avgSprintSpeedMS:null},
 jointLoads:jointLoads(row.name),localRecovery:localRecovery(row,rec),confidence:baseConfidence(row,ctx,10),interpretation:`Yüklü dinamik model: ${sets} set · ${reps} tekrar · ${load} kg · RIR ${rir} · median rest ${Math.round(R)} sn.`};
}
function explosiveImpact(row,ctx={}){
 const k=knowledge(row.name),qq=k.qualities||{},v=vals(row),reps=sum(v),R=rest(row,ctx),rir=Number.isFinite(+row.rir)?+row.rir:2,rpe=clamp((+ctx.rpe||10-rir)*10),restQ=R>=150?95:R>=90?78:R>=60?62:45;
 const neural=clamp((qq.power||8)*6+(qq.skill||6)*2+restQ*.15+rpe*.18),mechanical=clamp((qq.strength||6)*5+(qq.power||8)*3+reps*.8),met=clamp(25+reps*2+(100-restQ)*.28+rpe*.16),ph=clamp(68+restQ*.16+(qq.power||8)*1.5),gly=clamp(28+met*.55),aer=clamp(10+met*.18),rec=clamp(neural*.34+mechanical*.28+met*.22+rpe*.16);
 return {mode:"explosive_skill",rounds:v.length,totalWorkSec:durationEstimate(row,"explosive_skill")*60,restSec:R,energySystems:{phosphagen:ph,glycolytic:gly,aerobic:aer},
 demands:{mechanical,metabolic:met,neural,skill:clamp((qq.skill||0)*10),cardiovascular:clamp(aer*.6+met*.18),stability:clamp((qq.stability||0)*10),joint:Math.max(...Object.values(jointLoads(row.name)))*10},
 adaptation:{strength:clamp((qq.strength||0)*9),hypertrophy:clamp((qq.hypertrophy||0)*7),power:clamp((qq.power||0)*10),skill:clamp((qq.skill||0)*10),aerobicConditioning:aer,workCapacity:clamp(met*.4),speedExposure:0,repeatedSprintAbility:0},
 loads:{metabolicDemand:met,mechanicalDemand:mechanical,neuralDemand:neural,cardiovascularDemand:clamp(aer*.6+met*.18),recoveryCost:rec,mechanicalLowerBody:0,highSpeedExposureSec:0,totalSprintDistanceM:0,avgSprintSpeedMS:null},
 jointLoads:jointLoads(row.name),localRecovery:localRecovery(row,rec),confidence:baseConfidence(row,ctx,8),interpretation:"Patlayıcı/skill model: tekrar kalitesi, uzun rest, neural-power ve transition/skill talebi birlikte."};
}
function bodyweightImpact(row,ctx={}){
 const k=knowledge(row.name),qq=k.qualities||{},v=vals(row),reps=sum(v),R=rest(row,ctx),rir=Number.isFinite(+row.rir)?+row.rir:2,eff=clamp((10-rir)*10),density=R?clamp(100-R/2.5,25,95):55;
 const mechanical=clamp((qq.strength||0)*5+(qq.hypertrophy||0)*2+eff*.18+Math.min(20,reps/40*20)),met=clamp((qq.hypertrophy||0)*4+density*.32+eff*.2+Math.min(20,reps/50*20)),neural=clamp((qq.strength||0)*4+(qq.skill||0)*2+eff*.15);
 const ph=clamp((qq.power||0)*7+(qq.strength||0)*2),gly=clamp(25+met*.62),aer=clamp((qq.endurance||0)*6+density*.22),cardio=clamp(aer*.65+met*.2),rec=clamp(mechanical*.3+met*.3+neural*.2+eff*.2);
 return {mode:"bodyweight_dynamic",rounds:v.length,totalWorkSec:durationEstimate(row,"bodyweight_dynamic")*60,restSec:R,energySystems:{phosphagen:ph,glycolytic:gly,aerobic:aer},
 demands:{mechanical,metabolic:met,neural,skill:clamp((qq.skill||0)*10),cardiovascular:cardio,stability:clamp((qq.stability||0)*10),joint:Math.max(...Object.values(jointLoads(row.name)))*10},
 adaptation:{strength:clamp((qq.strength||0)*9),hypertrophy:clamp((qq.hypertrophy||0)*8+met*.15),power:clamp((qq.power||0)*9),skill:clamp((qq.skill||0)*9),aerobicConditioning:aer,workCapacity:clamp(met*.55+(qq.endurance||0)*4),speedExposure:0,repeatedSprintAbility:0},
 loads:{metabolicDemand:met,mechanicalDemand:mechanical,neuralDemand:neural,cardiovascularDemand:cardio,recoveryCost:rec,mechanicalLowerBody:/squat|lunge|calf|nordic/i.test(row.name)?mechanical:0,highSpeedExposureSec:0,totalSprintDistanceM:0,avgSprintSpeedMS:null},
 jointLoads:jointLoads(row.name),localRecovery:localRecovery(row,rec),confidence:baseConfidence(row,ctx,6),interpretation:"Bodyweight dinamik model: tekrar + RIR + rest/density + hareketin strength/hypertrophy/skill profili."};
}
function continuousImpact(row,ctx={}){
 const k=knowledge(row.name),qq=k.qualities||{},v=vals(row),metric=k.metric,duration=metric==="minutes"?sum(v):(+ctx.duration||+row.sessionDurationMin||0),km=metric==="km"?sum(v):(+row.distanceKm||0),rpe=clamp((+ctx.rpe||+row.sessionRpe||(/zone 2/i.test(row.name)?4:7))*10);
 const intensity=/threshold/i.test(row.name)?82:/tempo/i.test(row.name)?70:/long run/i.test(row.name)?55:/zone 2/i.test(row.name)?42:55;
 const cardio=clamp(intensity*.72+rpe*.28),aer=clamp(cardio),gly=clamp(Math.max(15,intensity-25)+rpe*.15),ph=12,mechanical=clamp(30+Math.min(35,(km||duration/8)*4)+rpe*.12),met=clamp(cardio*.7+gly*.3),rec=clamp(cardio*.30+mechanical*.25+met*.25+rpe*.20);
 return {mode:"continuous_aerobic",rounds:v.length,totalWorkSec:duration*60,restSec:0,energySystems:{phosphagen:ph,glycolytic:gly,aerobic:aer},
 demands:{mechanical,metabolic:met,neural:20,skill:20,cardiovascular:cardio,stability:38,joint:Math.max(...Object.values(jointLoads(row.name)))*10},
 adaptation:{strength:12,hypertrophy:8,power:12,skill:15,aerobicConditioning:aer,workCapacity:clamp(cardio*.8+duration*.3),speedExposure:0,repeatedSprintAbility:0},
 loads:{metabolicDemand:met,mechanicalDemand:mechanical,neuralDemand:20,cardiovascularDemand:cardio,recoveryCost:rec,mechanicalLowerBody:mechanical,highSpeedExposureSec:0,totalSprintDistanceM:0,avgSprintSpeedMS:null},
 jointLoads:jointLoads(row.name),localRecovery:localRecovery(row,rec),confidence:baseConfidence(row,ctx,metric==="minutes"?8:4),interpretation:`Sürekli aerobik model: ${duration?duration.toFixed(1)+" dk":""}${km?` · ${km.toFixed(2)} km`:""} · intensity/RPE bağlamı.`};
}
function mobilityImpact(row,ctx={}){
 const v=vals(row),minutes=sum(v)||+ctx.duration||0,rec=Math.max(5,Math.min(25,10+minutes*.35));
 return {mode:"mobility_recovery",rounds:v.length,totalWorkSec:minutes*60,restSec:0,energySystems:{phosphagen:3,glycolytic:5,aerobic:18},
 demands:{mechanical:10,metabolic:8,neural:10,skill:20,cardiovascular:12,stability:25,joint:12},
 adaptation:{strength:5,hypertrophy:2,power:2,skill:20,aerobicConditioning:12,workCapacity:10,speedExposure:0,repeatedSprintAbility:0},
 loads:{metabolicDemand:8,mechanicalDemand:10,neuralDemand:10,cardiovascularDemand:12,recoveryCost:rec,mechanicalLowerBody:5,highSpeedExposureSec:0,totalSprintDistanceM:0,avgSprintSpeedMS:null},
 jointLoads:jointLoads(row.name),localRecovery:localRecovery(row,rec),confidence:70,interpretation:"Mobility/recovery modeli: düşük sistemik maliyet, hareket kalitesi/ROM ve aktif recovery bağlamı."};
}
function movementImpact(row,ctx={}){
 const c={...sessionContext(ctx.date||row?.athleteDay||row?.calendarDate||"",row),...ctx},mode=modelFor(row);
 if(mode==="sprint")return sprintImpact(row,c);
 if(mode==="interval")return intervalImpact(row,c);
 if(mode==="static_isometric")return staticImpact(row,c);
 if(mode==="loaded_dynamic")return loadedImpact(row,c);
 if(mode==="explosive_skill")return explosiveImpact(row,c);
 if(mode==="continuous_aerobic")return continuousImpact(row,c);
 if(mode==="mobility_recovery")return mobilityImpact(row,c);
 return bodyweightImpact(row,c);
}
function mergeMuscles(rows){const o={};(rows||[]).forEach(r=>Object.entries(muscleImpact(r)).forEach(([m,v])=>o[m]=(o[m]||0)+v));return o}
function sessionImpact(session={},rows=[]){
 const impacts=rows.map(r=>({name:r.name,...movementImpact(r,{...session,date:session.date||r.athleteDay||r.calendarDate})}));
 if(!impacts.length)return {version:V,movementImpacts:[],muscles:{},energySystems:{phosphagen:0,glycolytic:0,aerobic:0},demands:{},adaptation:{},loads:{sessionRpeAU:0,recoveryCost:0,metabolicDemand:0,mechanicalDemand:0,neuralDemand:0,cardiovascularDemand:0,mechanicalLowerBody:0,highSpeedExposureSec:0,totalSprintDistanceM:0},confidence:0};
 const weights=impacts.map((x,i)=>Math.max(1,x.totalWorkSec/10,window.exerciseDoseUnits?.(rows[i])||1)),ws=sum(weights)||1,wavg=fn=>impacts.reduce((s,x,i)=>s+(+fn(x)||0)*weights[i],0)/ws;
 const avgObj=(key,fields)=>Object.fromEntries(fields.map(f=>[f,Math.round(wavg(x=>x[key]?.[f]))]));
 const duration=+session.duration||Math.max(1,impacts.reduce((s,x)=>s+(x.totalWorkSec||0),0)/60),rpe=+session.rpe||mean(rows.map(r=>+r.sessionRpe||Math.max(4,10-(+r.rir||3))));
 const srpe=Math.round(duration*rpe),high=sum(impacts.map(x=>x.loads.highSpeedExposureSec)),dist=sum(impacts.map(x=>x.loads.totalSprintDistanceM));
 const energy=avgObj("energySystems",["phosphagen","glycolytic","aerobic"]);
 const demands=avgObj("demands",["mechanical","metabolic","neural","skill","cardiovascular","stability","joint"]);
 const adaptation=avgObj("adaptation",["strength","hypertrophy","power","skill","aerobicConditioning","workCapacity","speedExposure","repeatedSprintAbility"]);adaptation.neuromuscularPower=adaptation.power;
 const recovery=clamp(wavg(x=>x.loads.recoveryCost)*.65+Math.min(100,srpe/5)*.35);
 const joints={};impacts.forEach(x=>Object.entries(x.jointLoads||{}).forEach(([j,v])=>joints[j]=Math.max(joints[j]||0,v)));
 const local={};impacts.forEach(x=>Object.entries(x.localRecovery||{}).forEach(([m,v])=>local[m]=Math.max(local[m]||0,v)));
 return {version:V,movementImpacts:impacts,muscles:mergeMuscles(rows),energySystems:energy,demands,adaptation,
  loads:{sessionRpeAU:srpe,recoveryCost:Math.round(recovery),metabolicDemand:demands.metabolic,mechanicalDemand:demands.mechanical,neuralDemand:demands.neural,cardiovascularDemand:demands.cardio||demands.cardiovascular,mechanicalLowerBody:Math.round(wavg(x=>x.loads.mechanicalLowerBody)),highSpeedExposureSec:high,totalSprintDistanceM:dist},
  jointLoads:joints,localRecovery:local,confidence:Math.round(wavg(x=>x.confidence)),durationMin:duration,rpe,
  limits:["0–100 değerler ölçülmüş biyolojik yüzde değil, karar-destek demand indeksleridir.","HR/GPS/power/lactate olmadığı sürece kesin VO₂, laktat, kalori veya gerçek 1RM iddiası yapılmaz."]};
}
function groupsForDate(date){
 const rows=(window.db?.trainingLogs?.[date]||[]),groups=[];
 const normal=rows.filter(r=>r.source!=="ad_hoc");
 if(normal.length){const fb=window.db?.sessionFeedback?.[date]||{};groups.push({session:{date,duration:+fb.duration||0,rpe:+fb.rpe||0,source:"planned_manual_guided"},rows:normal})}
 const map={};rows.filter(r=>r.source==="ad_hoc").forEach(r=>{const id=r.adHocSessionId||`adhoc_${date}`;(map[id]=map[id]||[]).push(r)});
 Object.entries(map).forEach(([id,rr])=>{const s=(window.db?.adHocSessions||[]).find(x=>x.id===id)||{};groups.push({session:{...s,date,source:"ad_hoc"},rows:rr})});
 return groups;
}
function impactForDate(date){const gs=groupsForDate(date),parts=gs.map(g=>sessionImpact(g.session,g.rows));if(parts.length===1)return parts[0];if(!parts.length)return sessionImpact({date},[]);const fakeRows=[];gs.forEach(g=>fakeRows.push(...g.rows));const combined=sessionImpact({date,duration:sum(parts.map(x=>x.durationMin)),rpe:mean(parts.map(x=>x.rpe))},fakeRows);combined.subSessions=parts;return combined}
function dateRange(days,endKey){
 endKey=endKey||window.todayKey?.()||new Date().toISOString().slice(0,10);const out=[];for(let i=days-1;i>=0;i--)out.push(window.addDaysKey?window.addDaysKey(endKey,-i):endKey);return out;
}
function rolling(days=7,endKey){
 const dates=dateRange(days,endKey),parts=[];dates.forEach(d=>groupsForDate(d).forEach(g=>parts.push({date:d,source:g.session.source,impact:sessionImpact(g.session,g.rows),session:g.session})));
 if(!parts.length)return {sessions:0,trainingDays:0,adHocSessions:0,trainingMinutes:0,adHocMinutes:0,sessionRpeAU:0,highSpeedExposureSec:0,totalSprintDistanceM:0,recoveryCost:0,metabolicDemand:0,mechanicalDemand:0,neuralDemand:0,cardiovascularDemand:0,neuromuscularPower:0,aerobicConditioning:0};
 const avg=k=>mean(parts.map(x=>+x.impact.loads?.[k]||0)),ad=parts.filter(x=>x.source==="ad_hoc");
 return {sessions:parts.length,trainingDays:new Set(parts.map(x=>x.date)).size,adHocSessions:ad.length,trainingMinutes:sum(parts.map(x=>x.impact.durationMin)),adHocMinutes:sum(ad.map(x=>x.impact.durationMin)),
  sessionRpeAU:sum(parts.map(x=>x.impact.loads.sessionRpeAU)),highSpeedExposureSec:sum(parts.map(x=>x.impact.loads.highSpeedExposureSec)),totalSprintDistanceM:sum(parts.map(x=>x.impact.loads.totalSprintDistanceM)),
  recoveryCost:avg("recoveryCost"),metabolicDemand:avg("metabolicDemand"),mechanicalDemand:avg("mechanicalDemand"),neuralDemand:avg("neuralDemand"),cardiovascularDemand:avg("cardiovascularDemand"),
  neuromuscularPower:mean(parts.map(x=>+x.impact.adaptation?.power||0)),aerobicConditioning:mean(parts.map(x=>+x.impact.adaptation?.aerobicConditioning||0)),parts};
}
function rollingBefore(date,days=2){const end=window.addDaysKey?window.addDaysKey(date,-1):date;return rolling(days,end)}
function systemicPenalty(date,type){
 const x=rollingBefore(date,2);let p=0;
 if(x.recoveryCost>=80)p+=6;else if(x.recoveryCost>=65)p+=3;
 if(x.neuralDemand>=80)p+=2;if(x.metabolicDemand>=80)p+=2;
 if(["legs","run"].includes(type)&&x.highSpeedExposureSec>=30)p+=6;
 if(["legs","run"].includes(type)&&x.mechanicalDemand>=75)p+=3;
 if(["push","pull"].includes(type)&&x.mechanicalDemand>=80)p+=2;
 return {penalty:clamp(p,0,16),...x};
}
function stampRow(row,date){
 if(!row)return null;const impact=movementImpact(row,{date:date||row.athleteDay||row.calendarDate});row.physiologySnapshot={version:V,at:new Date().toISOString(),mode:impact.mode,energySystems:impact.energySystems,demands:impact.demands,adaptation:impact.adaptation,loads:impact.loads,jointLoads:impact.jointLoads,localRecovery:impact.localRecovery,confidence:impact.confidence};return row.physiologySnapshot;
}
function restampDay(date){(window.db?.trainingLogs?.[date]||[]).forEach(r=>stampRow(r,date));return impactForDate(date)}
window.AthleteLoadMesh={version:V,modelFor,movementImpact,sessionImpact,impactForDate,rolling,rollingBefore,systemicPenalty,stampRow,restampDay,sprintImpact,intervalImpact,loadedImpact,staticImpact,explosiveImpact,bodyweightImpact,continuousImpact,mobilityImpact};
})();
