
(function(){
"use strict";
const V="9.0";
function run(){
 const tests=[];const t=(name,ok,detail="")=>tests.push({name,ok:!!ok,detail});
 try{t("Event Store available",!!window.AthleteEventStore)}catch(e){t("Event Store available",false,e.message)}
 try{t("Engine Bus graph",window.EngineBus?.graph?.().engines?.length>=5,JSON.stringify(window.EngineBus?.graph?.()))}catch(e){t("Engine Bus graph",false,e.message)}
 try{t("Schema v9",window.SchemaMigration?.validate?.(window.ALOSRuntime?.getDb?.())?.ok,JSON.stringify(window.SchemaMigration?.validate?.(window.ALOSRuntime?.getDb?.())))}catch(e){t("Schema v9",false,e.message)}
 try{const s=window.AdaptiveCoachSolver?.solve?.(window.todayKey?.(),"pull");t("Coach solver finite",Number.isFinite(s?.best?.score),JSON.stringify(s?.best))}catch(e){t("Coach solver finite",false,e.message)}
 try{const n=window.AdaptiveNutrition?.targets?.();t("Adaptive nutrition finite",[n?.kcal,n?.proteinG,n?.carbsG,n?.fatG].every(Number.isFinite),JSON.stringify(n))}catch(e){t("Adaptive nutrition finite",false,e.message)}
 try{const tr=window.PerformanceTrendV2?.summary?.("monthly");t("Trend V2",!!tr?.state,JSON.stringify({state:tr?.state,confidence:tr?.confidence}))}catch(e){t("Trend V2",false,e.message)}
 try{const x=window.TissueLoadEngine?.rolling?.();t("Tissue load object",x&&typeof x==="object",JSON.stringify(x))}catch(e){t("Tissue load object",false,e.message)}
 try{const k=window.todayKey?.(),p=window.ALOSRuntime?.getPlan?.(k),a=window.CanonicalSessionEngine?.audit?.(k);t("Canonical training 3-way sync",!p||!!(a?.ok&&a?.snapshotId),JSON.stringify(a))}catch(e){t("Canonical training 3-way sync",false,e.message)}
 return {version:V,passed:tests.filter(x=>x.ok).length,total:tests.length,tests};
}
window.ReleaseIntegrityV8={version:V,run};
})();
