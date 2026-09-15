
(function(){
"use strict";
function qx(id){return document.getElementById(id)}
function render(){
 const el=qx("universalMeshMetrics");if(!el||!window.AthleteLoadMesh)return;
 const x=window.AthleteLoadMesh.rolling(7),metrics=[
  ["Mekanik",x.mechanicalDemand||0],["Metabolik",x.metabolicDemand||0],["Nöral",x.neuralDemand||0],["Kardiyo",x.cardiovascularDemand||0],["Recovery Cost",x.recoveryCost||0]
 ];
 el.innerHTML=metrics.map(([n,v])=>`<div class="mesh-metric"><span>${n}</span><strong>${Math.round(v)}/100</strong><i><b style="width:${Math.max(0,Math.min(100,v))}%"></b></i></div>`).join("");
 const badge=qx("universalMeshBadge");if(badge)badge.textContent=`${x.trainingDays||0} gün · ${x.sessions||0} seans`;
 const src=qx("universalMeshSources");if(src){
  const by={planned_manual_guided:0,ad_hoc:0};(x.parts||[]).forEach(p=>by[p.source]=(by[p.source]||0)+1);
  src.innerHTML=[
   ["Planlı / Guided / manuel",by.planned_manual_guided||0],["Plan dışı / Ad Hoc",by.ad_hoc||0],
   ["Training süre",`${Math.round(x.trainingMinutes||0)} dk`],["sRPE Load",Math.round(x.sessionRpeAU||0)],
   ["High-speed",`${Math.round(x.highSpeedExposureSec||0)} sn`]
  ].map(v=>`<div class="summary-item"><span>${v[0]}</span><strong>${v[1]}</strong></div>`).join("");
 }
}
function init(){render();document.querySelector('.nav-btn[data-page="analytics"]')?.addEventListener("click",()=>setTimeout(render,20));window.addEventListener("focus",render)}
window.TrainingMeshDashboard={render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
