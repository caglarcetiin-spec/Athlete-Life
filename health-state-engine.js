
(function(){
"use strict";
const V="7.15";
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,+x||0));
function flags(d={}){
 return {
  fever:!!d.healthFever,
  dizziness:!!d.healthDizziness,
  chestBreathing:!!d.healthChestBreathing,
  gi:!!d.healthGI,
  cough:!!d.healthCough,
  soreThroat:!!d.healthSoreThroat,
  headache:!!d.healthHeadache
 };
}
function assess(d={}){
 const status=d.healthStatus||"normal",fatigue=clamp(+d.fatigueLevel||0,0,10),illness=clamp(+d.illnessSeverity||0,0,10),f=flags(d);
 const red=!!(f.fever||f.chestBreathing||f.dizziness||(f.gi&&illness>=6));
 let action="normal",volume=1,intensity=1,penalty=0,label="Normal",reason="Belirgin hastalık/halsizlik sinyali yok.";
 if(status==="recovering"){action="reduce";volume=.72;intensity=.90;penalty=12;label="Toparlanıyor";reason="Hastalık sonrası dönüş: hacmi kademeli artır."}
 if(status==="fatigued"||fatigue>=5){
   action=fatigue>=8?"recovery":"reduce";volume=fatigue>=8?.45:fatigue>=6?.70:.85;intensity=fatigue>=8?.75:fatigue>=6?.88:.95;
   penalty=Math.max(penalty,fatigue>=8?25:fatigue>=6?16:8);label=fatigue>=8?"Belirgin halsizlik":"Halsizlik";reason=`Halsizlik ${fatigue}/10; ana kaliteyi koruyup hacmi azalt.`;
 }
 if(status==="mild_illness"||illness>=2){
   action=illness>=5?"recovery":"reduce";volume=illness>=5?.35:.60;intensity=illness>=5?.70:.85;
   penalty=Math.max(penalty,illness>=5?30:18);label=illness>=5?"Hastalık":"Hafif hastalık";reason=`Hastalık şiddeti ${illness}/10; yüksek yoğunluğu zorlamadan toparlanmayı önceliklendir.`;
 }
 if(status==="sick"||illness>=7||red){
   action="stop_hard_training";volume=0;intensity=0;penalty=45;label="Antrenman uygun değil";
   reason=red?"Ateş/baş dönmesi/göğüs-solunum veya ağır GI sinyali işaretli. Zorlu antrenmanı ertele; uygun sağlık değerlendirmesi gerekebilir.":"Hastalık şiddeti yüksek. Bugün zorlu antrenman yerine dinlenme/recovery öncelikli.";
 }
 const symptomCount=Object.values(f).filter(Boolean).length;
 if(action!=="stop_hard_training"&&symptomCount>=3){volume=Math.min(volume,.55);intensity=Math.min(intensity,.82);penalty=Math.max(penalty,20);action="reduce";reason+=" Birden fazla semptom var."}
 return {version:V,status,fatigue,illness,flags:f,redFlag:red,action,volumeFactor:volume,intensityFactor:intensity,readinessPenalty:penalty,label,reason,symptomCount};
}
function readinessPenalty(d){return assess(d).readinessPenalty}
function assessFor(db,date){
 const base=assess(db.daily?.[date]||{}),personal=window.PersonalHealth?.dose?.(db,date);
 if(!personal)return base;
 const c=personal.context,detail=c.reasons.map(r=>r.message).join(' ');
 if(personal.blocked)return {...base,action:'stop_hard_training',volumeFactor:0,intensityFactor:0,readinessPenalty:Math.max(base.readinessPenalty,30),label:'Sağlık durumunu değerlendir',reason:detail||base.reason,personal};
 if(personal.volumeFactor<1||personal.loadFactor<1)return {...base,action:base.action==='normal'?'reduce':base.action,volumeFactor:Math.min(base.volumeFactor,personal.volumeFactor),intensityFactor:Math.min(base.intensityFactor,personal.loadFactor),label:base.action==='stop_hard_training'?base.label:'Kontrollü dönüş',reason:[base.action==='normal'?'':base.reason,detail,c.adaptation?'Seçtiğin hafif hafta uygulanıyor.':''].filter(Boolean).join(' '),personal};
 return {...base,personal};
}
function coachTypeOverride(d,proposed){
 const a=assess(d);return ["recovery","stop_hard_training"].includes(a.action)?"recovery":proposed;
}
window.HealthStateEngine={version:V,assess,assessFor,readinessPenalty,coachTypeOverride};
if(typeof module!=="undefined"&&module.exports)module.exports={assess,assessFor,readinessPenalty,coachTypeOverride};
})();
