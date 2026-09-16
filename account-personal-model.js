/* Account-specific inputs. No sample athlete's weight or energy need is inherited. */
((root)=>{
'use strict';
function weight(db,to=new Date().toISOString().slice(0,10)){
 const records=[...Object.entries(db.daily||{}).map(([date,r])=>({date,weight:r.weight})),...(db.bodyMeasurements||[])].filter(r=>r.date<=to&&Number.isFinite(+r.weight)&&+r.weight>=20&&+r.weight<=350).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const r=records.at(-1);return r?{kg:+r.weight,date:r.date,source:'recorded-weight'}:null;
}
function validate(input){
 function n(key,min,max){if(input[key]===''||input[key]==null)throw new Error('Tüm beslenme hedeflerini gir.');const v=Number(String(input[key]).replace(',','.'));if(!Number.isFinite(v)||v<min||v>max)throw new Error('Hedef aralık dışında: '+key);return v;}
 const kcal=n('kcal',500,15000),proteinG=n('proteinG',0,600),fatG=n('fatG',0,600),waterL=n('waterL',.1,15),remaining=kcal-4*proteinG-9*fatG;
 if(remaining<0)throw new Error('Protein ve yağın enerji toplamı kalori hedefini aşıyor.');
 return {kcal,proteinG,fatG,waterL,carbsG:remaining/4};
}
function targets(db,date){
 if(!db.settings?.personalTargets)return null;
 let t;try{t=validate(db.settings.personalTargets)}catch(_){return null;}
 const bw=weight(db,date);
 return {version:'account-2',date,...t,macroKcal:4*t.proteinG+4*t.carbsG+9*t.fatG,energyConsistent:true,kind:'user-defined',
  carbsGkg:bw?t.carbsG/bw.kg:null,bodyweight:bw,calibrationConfidence:null,sportEnergyEstimate:null,
  rationale:'Kendi girdiğin enerji, protein ve yağ hedefleri. Karbonhidrat kalan enerjiden hesaplanır; antrenman AU değerinden kalori eklenmez.'};
}
const api={weight,validate,targets};root.AccountPersonalModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
