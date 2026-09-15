
(function(){
"use strict";
const V="8.0";
function targets(date=window.todayKey?.()){
 const d=window.ALOSRuntime?.getDb?.()||{},bw=window.LoadPrescriptionEngine?.bodyweight?.()||72,cal=window.PersonalCalibration?.nutritionMaintenance?.()||{};
 const canonical=window.CanonicalSessionEngine?.get?.(date),plan=window.planForDate?.(date),mesh=window.AthleteLoadMesh?.rollingBefore?.(date,1)||{},type=canonical?.planType||plan?.type||"recovery";
 const maintenance=cal.maintenanceKcal||(+d.settings?.targetCalories||2800),surplus=cal.maintenanceKcal&&+d.settings?.targetWeight>bw?250:0;
 let carbs=type==="legs"?5.0:type==="run"?4.8:type==="pull"||type==="push"?4.2:3.3;
 if((mesh.metabolicDemand||0)>70)carbs+=.4;
 const protein=Math.round(2.0*bw),fat=Math.round(Math.max(.8*bw,55));
 const kcal=Math.round((maintenance+surplus)/25)*25;
 const carbG=Math.max(0,Math.round((kcal-4*protein-9*fat)/4)),macroKcal=4*protein+4*carbG+9*fat;
 return {version:V,date,kcal,proteinG:protein,carbsG:carbG,fatG:fat,carbsGkg:+(carbG/bw).toFixed(1),
  macroKcal,energyConsistent:Math.abs(kcal-macroKcal)<=4,kind:"estimated",canonicalSnapshotId:canonical?.snapshotId||null,
  maintenanceKcal:maintenance,calibrationConfidence:cal.confidence||35,trainingType:type,
  rationale:`${type} ortak planı · makrolar ${kcal} kcal enerji hedefiyle uzlaştırıldı. ${cal.maintenanceKcal?"Bakım kalorisi model tahmini":"Kullanıcının kalori hedefi; ek surplus tekrar eklenmez"}.`};
}
window.AdaptiveNutrition={version:V,targets};
})();
