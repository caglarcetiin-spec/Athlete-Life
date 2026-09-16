
(function(){
"use strict";
const V="8.0";
function targets(date=window.todayKey?.()){
 if(window.ALOSAccount)return window.AccountPersonalModel?.targets(window.ALOSRuntime?.getDb?.()||{},date)||null;
 const d=window.ALOSRuntime?.getDb?.()||{},bw=window.LoadPrescriptionEngine?.bodyweight?.()||72,cal=window.PersonalCalibration?.nutritionMaintenance?.()||{};
 const canonical=window.CanonicalSessionEngine?.get?.(date),plan=window.planForDate?.(date),type=canonical?.planType||plan?.type||"recovery";
 const maintenance=cal.maintenanceKcal||(+d.settings?.targetCalories||2800),surplus=cal.maintenanceKcal&&+d.settings?.targetWeight>bw?250:0;
 /* Energy-target allocation; no unconsumed sport-specific carbohydrate calculation. */

 const protein=Math.round(2.0*bw),fat=Math.round(Math.max(.8*bw,55));
 const kcal=Math.round((maintenance+surplus)/25)*25;
 const carbG=Math.max(0,Math.round((kcal-4*protein-9*fat)/4)),macroKcal=4*protein+4*carbG+9*fat;
 return {version:V,date,kcal,proteinG:protein,carbsG:carbG,fatG:fat,carbsGkg:+(carbG/bw).toFixed(1),
  macroKcal,energyConsistent:Math.abs(kcal-macroKcal)<=4,kind:"estimated",canonicalSnapshotId:canonical?.snapshotId||null,
  sharedTraining:window.AthleteWorkspaceCore?.snapshot?.(d,date)||null,
  sportEnergyEstimate:null,maintenanceKcal:maintenance,calibrationConfidence:cal.confidence||35,trainingType:type,
  rationale:`Makrolar ${kcal} kcal enerji hedefiyle uzlaştırıldı. ${cal.maintenanceKcal?"Bakım kalorisi model tahmini":"Kullanıcının kalori hedefi; ek surplus tekrar eklenmez"}. Branş yükü AU değerinden kalori tahmin edilmez.`};
}
window.AdaptiveNutrition={version:V,targets};
})();
