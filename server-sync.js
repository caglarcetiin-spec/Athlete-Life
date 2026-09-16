(function(){
"use strict";
const RAW_KEY="athleteLifeOS";
const API="/api/state";
function parse(s){try{return s?JSON.parse(s):null}catch(e){return null}}
function rev(d){return Number(d?.meta?.persistenceRevision||0)}
function savedAt(d){return String(d?.meta?.lastSavedAt||"")}
function weight(d){
 if(!d||typeof d!=="object")return 0;
 const ks=["daily","scheduleByDate","weekOptimizations","trainingLogs","foodLogs","waterLogs","painLogs","sessionFeedback","futurePlans","capabilityRecords","guidedWorkoutHistory"];
 return ks.reduce((n,k)=>n+(Array.isArray(d[k])?d[k].length:(d[k]&&typeof d[k]==="object"?Object.keys(d[k]).length:0)),0);
}
function compare(a,b){
 const ra=rev(a), rb=rev(b); if(ra!==rb)return ra-rb;
 const ta=Date.parse(savedAt(a)||0)||0,tb=Date.parse(savedAt(b)||0)||0;if(ta!==tb)return ta-tb;
 return weight(a)-weight(b);
}
function request(method,url,body,async){
 try{
  const x=new XMLHttpRequest();x.open(method,url,async!==false);x.setRequestHeader("Content-Type","application/json");
  x.send(body==null?null:JSON.stringify(body));
  if(async!==false)return null;
  if(x.status>=200&&x.status<300)return parse(x.responseText);
 }catch(e){console.warn("Server sync request failed",e)}return null;
}
function bootstrap(){
 const local=parse(localStorage.getItem(RAW_KEY));
 const res=request("GET",API,null,false); const remote=res?.data||null;
 try{
  if(remote && (!local || compare(remote,local)>=0)){
   localStorage.setItem(RAW_KEY,JSON.stringify(remote));
   localStorage.removeItem("athleteLifeOS.commit.v3");
   localStorage.setItem("athleteLifeOS.serverHydratedAt",new Date().toISOString());
   return {source:"server",data:remote};
  }
  if(local){
   request("POST",API,{data:local,reason:"browser-bootstrap-migration"},false);
   return {source:"browser",data:local};
  }
 }catch(e){console.warn("Server bootstrap failed",e)}
 return {source:"empty",data:local||null};
}
let pending=null,timer=null,lastAckRev=0,inFlight=null;
function flush(){
 if(inFlight)return inFlight;
 if(!pending)return Promise.resolve(false);
 clearTimeout(timer);
 inFlight=(async()=>{
  while(pending){
   const payload=pending;pending=null;
   try{
    const response=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    if(!response.ok)throw new Error("HTTP "+response.status);
    const result=await response.json();
    if(!result.ok)throw new Error("Save rejected");
    lastAckRev=Number(result.revision||rev(payload.data)||0);
   }catch(error){console.warn("Server persistence delayed",error);pending=pending||payload;return false}
  }
  return true;
 })().finally(()=>{inFlight=null});
 return inFlight;
}
function push(data,reason){
 pending={data:JSON.parse(JSON.stringify(data)),reason:reason||"client-save"};
 clearTimeout(timer);timer=setTimeout(flush,80);return true;
}
function beacon(data,reason){
 try{
  const blob=new Blob([JSON.stringify({data,reason:reason||"pagehide"})],{type:"application/json"});
  if(navigator.sendBeacon("/api/state/beacon",blob))return true;
 }catch(e){}
 try{fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data,reason:reason||"pagehide"}),keepalive:true});return true}catch(e){return false}
}
function health(){return fetch("/api/health",{cache:"no-store"}).then(r=>r.json()).catch(()=>({ok:false}))}
function status(){return {lastAckRev,pending:!!pending,saving:!!inFlight}}
window.ALOSServerSync={bootstrap,push,flush,beacon,health,status,compare};
window.addEventListener("online",()=>{flush()});
bootstrap();
window.addEventListener("pagehide",()=>{try{const d=parse(localStorage.getItem(RAW_KEY));if(d)beacon(d,"pagehide-final") }catch(e){}});
})();
