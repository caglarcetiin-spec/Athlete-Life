
(function(){
"use strict";
const V="7.14";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,+x||0));
const roundTo=(x,step)=>Math.round((+x||0)/step)*step;
const PROFILES={
 "Weighted Pull-Up":{ratio:.35,step:2.5,unit:"belt_external",label:"kg ek yük",min:5,max:60,anchor:"wpuLoad"},
 "Weighted Ring Dip":{ratio:.20,step:2.5,unit:"belt_external",label:"kg ek yük",min:2.5,max:70,anchor:"dipLoad"},
 "OHP":{ratio:.35,step:2.5,unit:"total",label:"kg toplam yük",min:10,max:80,anchor:"ohpKg"},
 "RDL":{ratio:.60,step:2.5,unit:"total",label:"kg toplam yük",min:15,max:120},
 "Bulgarian Split Squat":{ratio:.22,step:2,unit:"total_external",label:"kg toplam dış yük",min:4,max:60},
 "Backpack/Goblet Squat":{ratio:.28,step:2,unit:"total_external",label:"kg dış yük",min:4,max:60},
 "Single-Leg RDL":{ratio:.18,step:2,unit:"total_external",label:"kg toplam dış yük",min:4,max:50},
 "Calf Raise":{ratio:.30,step:2,unit:"total_external",label:"kg dış yük",min:4,max:80},
 "EZ-Bar Curl":{ratio:.20,step:2.5,unit:"total",label:"kg toplam yük",min:7.5,max:50},
 "DB Hammer Curl":{ratio:.11,step:2,unit:"per_dumbbell",label:"kg / dumbbell",min:4,max:30},
 "DB Lateral Raise":{ratio:.055,step:1,unit:"per_dumbbell",label:"kg / dumbbell",min:2,max:16},
 "Triceps Extension":{ratio:.11,step:2,unit:"single_external",label:"kg dış yük",min:4,max:35}
};
function bodyweight(){
 try{if(typeof window.bodyweightNow==="function")return +window.bodyweightNow()||72}catch(e){}
 const ds=Object.entries(window.db?.daily||{}).sort().map(([,d])=>+d.weight||0).filter(Boolean);
 if(ds.length)return ds.at(-1);
 const ms=(window.db?.bodyMeasurements||[]).filter(x=>+x.weight).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 return ms.length?+ms.at(-1).weight:72;
}
function parseRx(text){
 const s=String(text||"").replace(/[×✕]/g,"x").replace(/[–—−]/g,"-");
 const m=s.match(/(\d+)\s*x\s*([\d.]+)(?:\s*-\s*([\d.]+))?/i);
 return {sets:m?+m[1]:1,min:m?+m[2]:null,max:m&&m[3]?+m[3]:(m?+m[2]:null)};
}
function rows(name){
 const out=[];
 Object.keys(window.db?.trainingLogs||{}).sort().forEach(k=>(db.trainingLogs[k]||[]).forEach(r=>{
   if(r.name===name&&!r.approximateBackfill&&(+r.load||0)>0)out.push({date:k,...r});
 }));
 return out;
}
function readinessFor(date){
 try{if(window.db?.daily?.[date]&&typeof window.readiness==="function")return window.readiness(db.daily[date])}catch(e){}
 return null;
}
function templateLoad(note){
 const m=String(note||"").match(/\+\s*([\d.]+)\s*kg/i);return m?+m[1]:null;
}
function anchorLoad(profile){
 const d=window.db?.characterData||{},v=profile?.anchor?+d[profile.anchor]:0;
 return v>0?v:null;
}
function isWeighted(name){
 const k=window.EXERCISE_KNOWLEDGE?.[name]||{};
 return !!PROFILES[name]||k.type==="WEIGHTED"||k.type==="BARBELL"||String(name).includes("Weighted");
}
function recommend(name,prescription="",date=null,opts={}){
 const profile=PROFILES[name],k=window.EXERCISE_KNOWLEDGE?.[name]||{};
 if(!isWeighted(name))return {applicable:false,name};
 const rx=parseRx(prescription),hist=rows(name),last=hist.at(-1),bw=bodyweight(),ready=opts.readinessScore??readinessFor(date),pain=window.PainIntelligence?.exerciseAdvice?.(name,date||window.todayKey?.());
 if(pain?.level>=3)return {applicable:true,name,value:null,display:"Ağrı/red-flag nedeniyle bugün yük önermiyorum",confidence:85,source:"pain_guard",rationale:pain.short||"İlgili eklemi zorlayan yükten kaçın."};
 if(window.ALOSAccount&&!last&&!anchorLoad(profile))return {applicable:true,name,value:null,display:'Başlangıç yükünü kendin belirle; bu harekette kişisel ölçüm veya kayıt yok.',confidence:null,source:'missing-personal-baseline',rationale:'Örnek bir sporcunun vücut ağırlığı veya sabit oranları yeni hesaba uygulanmaz.'};
 let value=null,source="",confidence=0,rationale="",range=null;
 if(last&&(+last.load||0)>0){
   value=+last.load;source="history";confidence=88;
   const vals=(last.sets||[]).map(Number).filter(x=>x>0),rir=Number.isFinite(+last.rir)?+last.rir:2;
   const targetSets=rx.sets||vals.length||1,min=rx.min||Math.min(...vals,1),max=rx.max||Math.max(...vals,1);
   const completed=vals.slice(0,targetSets),allTop=completed.length>=targetSets&&completed.every(x=>x>=max),allMin=completed.length>=Math.min(targetSets,vals.length)&&completed.every(x=>x>=min);
   const poor=completed.length&&completed.filter(x=>x<min).length>=Math.max(1,Math.ceil(completed.length/2));
   const step=profile?.step||2.5;
   if(allTop&&rir>=2){value+=step;rationale=`Son seans ${last.load} kg ile üst tekrar sınırı ve RIR ${rir}; küçük yük artışı.`}
   else if(poor||rir<=0){value*=.93;rationale=`Son seans hedef tekrar/RIR kalitesi düştü; yaklaşık %5–10 load drop.`}
   else if(allMin&&rir>=1){rationale=`Son ${last.load} kg yük hedef bandında; aynı yükü koru ve tekrar kalitesini tamamla.`}
   else rationale=`Son gerçek yük ${last.load} kg; önce bu yükte reçeteyi doğrula.`;
 }else{
   const noteLoad=templateLoad(opts.templateNote),anchor=anchorLoad(profile);
   if(noteLoad){value=noteLoad;source="template_anchor";confidence=78;rationale="Programdaki kişisel başlangıç referansı kullanıldı."}
   else if(anchor){value=anchor;source="capability_anchor";confidence=82;rationale="Capability/Character kaydındaki gerçek yük referansı kullanıldı."}
   else if(profile){value=bw*profile.ratio;source="bodyweight_baseline";confidence=52;rationale=`Geçmiş kayıt yok; ${bw.toFixed(1)} kg vücut ağırlığı + hareket profiline göre konservatif baseline.`}
   else return {applicable:true,name,value:null,display:"İlk yükü RIR 2–3 bırakacak şekilde seç; ilk setten sonra sistem kalibre edecek.",confidence:35,source:"unknown_weighted",rationale:"Hareket için kişisel yük geçmişi yok."};
 }
 const p=profile||{step:2.5,label:"kg dış yük",min:0,max:200};
 if(ready!=null&&ready<58){value*=.90;rationale+=` Readiness ${Math.round(ready)}/100 → yük yaklaşık %10 azaltıldı.`}
 else if(ready!=null&&ready<68){value*=.95;rationale+=` Readiness ${Math.round(ready)}/100 → yük yaklaşık %5 azaltıldı.`}
 if(pain?.level===2){value*=.90;rationale+=` Ağrı/joint-load eşleşmesi nedeniyle konservatif %10 azaltım.`;confidence=Math.min(confidence,75)}
 value=clamp(roundTo(value,p.step),p.min,p.max);
 if(source==="bodyweight_baseline"){
   range=[clamp(value-p.step,p.min,p.max),clamp(value+p.step,p.min,p.max)];
 }
 const display=range&&range[0]!==range[1]
   ?`${range[0]}–${range[1]} ${p.label} · ${value} ile başla`
   :`${value} ${p.label}`;
 return {applicable:true,name,value,range,unit:p.unit,label:p.label,display,confidence,source,rationale,target:rx,bodyweight:bw,step:p.step};
}
function explain(name,prescription,date,opts={}){
 const r=recommend(name,prescription,date,opts);if(!r.applicable)return "";
 return r.value==null?r.display:`${r.display} · güven ${r.confidence}/100. ${r.rationale}`;
}
window.LoadPrescriptionEngine={version:V,profiles:PROFILES,recommend,explain,parseRx,isWeighted,bodyweight};
})();
