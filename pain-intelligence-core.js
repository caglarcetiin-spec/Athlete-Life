
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.PainIntelligenceCore=api;
})(typeof window!=="undefined"?window:globalThis,function(){
"use strict";
const JOINT_ALIAS={
 shoulder:"shoulder",elbow:"elbow",wrist:"wrist",hand:"hand",
 neck:"neck",upperBack:"upperBack",back:"lowBack",lowBack:"lowBack",
 hip:"hip",knee:"knee",ankle:"ankle",foot:"foot"
};
function datePart(v){return String(v||"").slice(0,10)}
function activeAtDate(row,date){
 if(!row||!date)return false;
 const start=datePart(row.date||row.createdAt);
 if(start&&start>date)return false;
 const resolved=datePart(row.resolvedAt);
 if(row.status==="resolved" && (!resolved||resolved<=date))return false;
 if(resolved&&resolved<=date)return false;
 return (+row.severity||0)>0;
}
function jointKey(v){return JOINT_ALIAS[v]||v}
function aggregate(entries,date){
 const out={shoulder:0,elbow:0,wrist:0,hand:0,neck:0,upperBack:0,lowBack:0,hip:0,knee:0,ankle:0,foot:0};
 (entries||[]).filter(r=>activeAtDate(r,date)).forEach(r=>{
   const k=jointKey(r.joint);if(k in out)out[k]=Math.max(out[k],+r.severity||0);
 });
 return out;
}
function maxSeverity(entries,date){
 return Math.max(0,...(entries||[]).filter(r=>activeAtDate(r,date)).map(r=>+r.severity||0));
}
function redFlag(row){
 const f=row?.redFlags||{};
 return !!(row?.onset==="trauma"||f.swelling||f.numbness||f.weakness||f.instability||f.cannotUse||f.nightRestPain);
}
function sideCompatible(painSide,movementSide){
 if(!painSide||painSide==="bilateral"||painSide==="midline"||!movementSide||movementSide==="bilateral")return true;
 return painSide===movementSide;
}
return {datePart,activeAtDate,jointKey,aggregate,maxSeverity,redFlag,sideCompatible};
});
