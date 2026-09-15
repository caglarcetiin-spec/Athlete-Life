
(function(){
"use strict";
const V="7.19";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,+x||0));
const round50=x=>Math.round((+x||0)/50)*50;
function latestBodyWeight(db,date){
 const dates=Object.keys(db?.daily||{}).filter(k=>k<=date&&+db.daily[k]?.weight>0).sort();
 if(dates.length)return +db.daily[dates.at(-1)].weight;
 const ms=(db?.bodyMeasurements||[]).filter(x=>x.date<=date&&+x.weight>0).sort((a,b)=>a.date.localeCompare(b.date));
 return ms.length?+ms.at(-1).weight:72;
}
function trainingContext(db,date){
 const d=db?.daily?.[date]||{},fb=db?.sessionFeedback?.[date]||{};
 const runMin=Math.max(0,+d.runMinutes||0),fbMin=Math.max(0,+fb.duration||0),ad=(db?.adHocSessions||[]).filter(x=>x.date===date),adMin=ad.reduce((s,x)=>s+(+x.duration||0),0);
 const minutes=fbMin+(fb.type==="run"?Math.max(0,runMin-fbMin):runMin)+adMin;
 const rpes=[+d.runRpe||0,+fb.rpe||0,...ad.map(x=>+x.rpe||0)].filter(x=>x>0);
 return {minutes,rpe:rpes.length?Math.max(...rpes):0,runMinutes:runMin,sessionMinutes:fbMin,adHocMinutes:adMin};
}
function estimate({bodyWeight=72,exerciseMinutes=0,rpe=0,sweatRateMlPerHr=null,manualTargetL=null}={}){
 const bw=clamp(bodyWeight,40,180),h=Math.max(0,+exerciseMinutes||0)/60;
 let low=bw*30,high=bw*40,confidence=55,exLow=0,exHigh=0,rationale="vücut ağırlığına göre geniş günlük coaching aralığı";
 const sr=Number(sweatRateMlPerHr);
 if(h>0){
   if(Number.isFinite(sr)&&sr>0){
     const x=clamp(sr,200,1800);exLow=x*h*.65;exHigh=x*h*.95;confidence=84;rationale="kişisel sweat-rate + egzersiz süresi";
   }else{
     const hard=(+rpe||0)>=8,moderate=(+rpe||0)>=5,band=hard?[400,850]:moderate?[300,700]:[200,550];
     exLow=band[0]*h;exHigh=band[1]*h;confidence=58;rationale="sweat-rate bilinmiyor; geniş egzersiz aralığı";
   }
 }
 low=round50(low+exLow);high=round50(high+exHigh);if(high<low+300)high=low+300;
 return {version:V,bodyWeight:bw,lowMl:low,highMl:high,lowL:low/1000,highL:high/1000,exerciseMinutes:+exerciseMinutes||0,rpe:+rpe||0,
   confidence,sweatRateKnown:Number.isFinite(sr)&&sr>0,manualTargetL:+manualTargetL>0?+manualTargetL:null,rationale};
}
function context(db,date,{foodWaterMl=0,directWaterMl=null,sweatRateMlPerHr=null}={}){
 const bw=latestBodyWeight(db,date),tr=trainingContext(db,date),direct=directWaterMl==null?(window.WaterLedger?.total?.(db,date)??(+db?.water?.[date]||0)):+directWaterMl;
 const est=estimate({bodyWeight:bw,exerciseMinutes:tr.minutes,rpe:tr.rpe,sweatRateMlPerHr,manualTargetL:db?.settings?.targetWater});
 const total=Math.max(0,+direct||0)+Math.max(0,+foodWaterMl||0);
 let status="within",title="Hidrasyon kaydı makul aralıkta",message="";
 if(total<est.lowMl*.70){
   status="low_recorded";title="Kayıtlı toplam su düşük görünüyor";
   message=`${(total/1000).toFixed(1)} L kayıt var; model aralığı ${est.lowL.toFixed(1)}–${est.highL.toFixed(1)} L. Bu tek başına dehidrasyon ölçümü değildir. Gün içine yayılmış sıvı alımını ve antrenman sonrası kayıpları kontrol et.`;
 }else if(total<est.lowMl){
   status="below_range";title="Kayıt model aralığının biraz altında";
   message=`${(total/1000).toFixed(1)} L kayıt var; yaklaşık model aralığı ${est.lowL.toFixed(1)}–${est.highL.toFixed(1)} L. Kesin bir “eksik litre” söylemiyorum; sweat-rate bilinmiyorsa ihtiyaç kişiden kişiye değişir.`;
 }else if(total>est.highMl+1000){
   status="high_recorded";title="Kayıt model aralığının belirgin üzerinde";
   message=`${(total/1000).toFixed(1)} L kayıtlı. Sweat-rate/ısı verisi bunu gerektirmiyorsa yalnız hedef tutturmak için ekstra su zorlamana gerek yok.`;
 }else if(total>est.highMl){
   status="above_range";title="Kayıt model aralığının üzerinde";
   message=`${(total/1000).toFixed(1)} L kayıtlı; model ${est.lowL.toFixed(1)}–${est.highL.toFixed(1)} L. Yüksek terleme varsa bu normal olabilir; sistem sweat-rate olmadan bunu “fazla” diye teşhis etmez.`;
 }else{
   message=`${(total/1000).toFixed(1)} L kayıt var ve ${est.lowL.toFixed(1)}–${est.highL.toFixed(1)} L model aralığında. Sweat-rate bilinmediği için bu bir hidrasyon testi değil, günlük kayıt kontrolüdür.`;
 }
 const score=total>=est.lowMl&&total<=est.highMl+750?100:total<est.lowMl?clamp(Math.round(total/Math.max(1,est.lowMl)*100),0,100):92;
 const custom=est.manualTargetL,customMismatch=!!(custom&&(custom*1000<est.lowMl*.8||custom*1000>est.highMl*1.2));
 return {...est,...tr,directWaterMl:direct,foodWaterMl:+foodWaterMl||0,totalWaterMl:total,totalWaterL:total/1000,score,status,title,message,customMismatch,
 note:"Terleme hızı, ortam sıcaklığı ve objektif hidrasyon ölçümü yoksa kesin bireysel sıvı ihtiyacı veya dehidrasyon yüzdesi hesaplanamaz."};
}
function averageEstimate(db,load={}){
 const date=typeof window.todayKey==="function"?window.todayKey():new Date().toISOString().slice(0,10);
 const bw=latestBodyWeight(db,date),days=Math.max(1,+load.trainingDays||1),mins=(+load.trainingMinutes||+load.minutes||0)/days;
 return estimate({bodyWeight:bw,exerciseMinutes:mins,rpe:0,manualTargetL:db?.settings?.targetWater});
}
window.HydrationIntelligence={version:V,latestBodyWeight,trainingContext,estimate,context,averageEstimate};
if(typeof module!=="undefined"&&module.exports)module.exports={latestBodyWeight,trainingContext,estimate,context,averageEstimate};
})();
