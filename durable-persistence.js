(function(){
"use strict";
const RAW_KEY="athleteLifeOS";
const META_KEY="athleteLifeOS.commit.v3";
const ROLLBACK_KEY="athleteLifeOSLastKnownGood"; // one previous full snapshot only
const IDB_NAME="AthleteLifeOSDurable";
const IDB_STORE="revisions";
const MAX_REVISIONS=30;
let idbQueue=Promise.resolve();
function parse(raw,f=null){try{return raw?JSON.parse(raw):f}catch(e){return f}}
function clone(x){return JSON.parse(JSON.stringify(x||{}))}
function stable(obj){if(obj===null||typeof obj!=="object")return JSON.stringify(obj);if(Array.isArray(obj))return "["+obj.map(stable).join(",")+"]";return "{"+Object.keys(obj).sort().map(k=>JSON.stringify(k)+":"+stable(obj[k])).join(",")+"}"}
function hashString(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,"0")}
function checksum(data){return hashString(stable(data))}
function contentChecksum(data){const d=clone(data);if(d.meta){delete d.meta.lastSavedAt;delete d.meta.lastSaveReason;delete d.meta.persistenceRevision}return checksum(d)}
function weight(x){if(!x||typeof x!=="object")return 0;let n=0;const maps=["daily","week","weekOptimizations","scheduleByDate","trainingLogs","foodLogs","planHistory","sessionFeedback","painLogs","futurePlans","waterLogs","social","water","sessionPrescriptions","gapReconciliation"];maps.forEach(k=>{const v=x[k];if(v&&typeof v==="object")n+=Object.keys(v).length});["bodyMeasurements","capabilityRecords","adHocSessions","guidedWorkoutHistory","runs","generatedWeekPlan","photoProgress"].forEach(k=>{if(Array.isArray(x[k]))n+=x[k].length});return n}
function meta(){const x=parse(localStorage.getItem(META_KEY),null);return x&&x.schema===3?x:null}
function rawCandidate(){const d=parse(localStorage.getItem(RAW_KEY),null);if(!d||typeof d!=="object")return null;const m=meta(),sum=checksum(d);return {rev:+d?.meta?.persistenceRevision||+m?.rev||0,savedAt:d?.meta?.lastSavedAt||m?.savedAt||"",reason:d?.meta?.lastSaveReason||m?.reason||"raw",checksum:sum,data:d,verified:!m||m.checksum===sum}}
function rollbackCandidate(){const x=parse(localStorage.getItem(ROLLBACK_KEY),null),d=x?.data;if(!d||typeof d!=="object")return null;const sum=checksum(d);return {rev:+x.rev||+d?.meta?.persistenceRevision||0,savedAt:x.savedAt||d?.meta?.lastSavedAt||"",reason:x.reason||"rollback",checksum:sum,data:d,verified:!x.checksum||x.checksum===sum}}
function compare(a,b){const ar=+a?.rev||0,br=+b?.rev||0;if(ar!==br)return br-ar;const at=Date.parse(a?.savedAt||0)||0,bt=Date.parse(b?.savedAt||0)||0;if(at!==bt)return bt-at;return weight(b?.data)-weight(a?.data)}
function bootstrap(){const raw=rawCandidate(),rb=rollbackCandidate();let chosen=null;if(raw?.verified)chosen=raw;else if(rb?.verified)chosen=rb;else chosen=raw||rb;if(!chosen)return {};try{if(chosen===rb){localStorage.setItem(RAW_KEY,JSON.stringify(rb.data));localStorage.setItem(META_KEY,JSON.stringify({schema:3,rev:rb.rev,savedAt:rb.savedAt,reason:"rollback-recovery",checksum:rb.checksum}))}}catch(e){}return clone(chosen.data)}
function openDB(){return new Promise((res,rej)=>{if(!window.indexedDB)return rej(new Error("IndexedDB unavailable"));const r=indexedDB.open(IDB_NAME,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(IDB_STORE))d.createObjectStore(IDB_STORE,{keyPath:"rev"})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function putIDB(row){const d=await openDB();await new Promise((res,rej)=>{const tx=d.transaction(IDB_STORE,"readwrite");tx.objectStore(IDB_STORE).put(row);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});const all=await new Promise((res,rej)=>{const tx=d.transaction(IDB_STORE,"readonly"),r=tx.objectStore(IDB_STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)});if(all.length>MAX_REVISIONS){const old=all.sort((a,b)=>b.rev-a.rev).slice(MAX_REVISIONS);await new Promise((res,rej)=>{const tx=d.transaction(IDB_STORE,"readwrite"),s=tx.objectStore(IDB_STORE);old.forEach(x=>s.delete(x.rev));tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}}
function queueIDB(row){idbQueue=idbQueue.then(()=>putIDB(row)).catch(e=>console.warn("Durable journal mirror failed",e));return idbQueue}
function makeRow(data,rev,reason){const d=clone(data),savedAt=new Date().toISOString();d.meta={...(d.meta||{}),lastSavedAt:savedAt,lastSaveReason:reason,persistenceRevision:rev};return {schema:3,rev,savedAt,reason,checksum:checksum(d),data:d}}
function save(data,reason="save"){
 const current=rawCandidate();const nextRev=Math.max(+current?.rev||0,+data?.meta?.persistenceRevision||0)+1;const next=makeRow(data,nextRev,reason);
 try{
  // Preserve exactly one previous verified state before changing live data.
  if(current?.data&&current.verified){localStorage.setItem(ROLLBACK_KEY,JSON.stringify({schema:3,rev:current.rev,savedAt:current.savedAt,reason:"previous-verified",checksum:current.checksum,data:current.data}))}
  localStorage.setItem(RAW_KEY,JSON.stringify(next.data));
  // Read-after-write verification prevents acknowledging a bad commit.
  const reread=parse(localStorage.getItem(RAW_KEY),null);if(!reread||checksum(reread)!==next.checksum)throw new Error("read-after-write verification failed");
  localStorage.setItem(META_KEY,JSON.stringify({schema:3,rev:next.rev,savedAt:next.savedAt,reason:next.reason,checksum:next.checksum}));
  localStorage.setItem("athleteLifeOSLastKnownGoodAt",next.savedAt);
  queueIDB(next);
  try{window.ALOSServerSync?.push?.(next.data,next.reason)}catch(e){console.warn("Server mirror delayed",e)}
  return {savedAt:next.savedAt,rev:next.rev,data:next.data};
 }catch(e){console.error("Durable save failed",e);const rb=rollbackCandidate();if(rb?.verified){try{localStorage.setItem(RAW_KEY,JSON.stringify(rb.data));localStorage.setItem(META_KEY,JSON.stringify({schema:3,rev:rb.rev,savedAt:rb.savedAt,reason:"rollback-after-failed-save",checksum:rb.checksum}))}catch(_){}}throw e}
}
async function allIDB(){try{const d=await openDB();return await new Promise((res,rej)=>{const tx=d.transaction(IDB_STORE,"readonly"),r=tx.objectStore(IDB_STORE).getAll();r.onsuccess=()=>res((r.result||[]).filter(x=>x?.data&&x.checksum===checksum(x.data)));r.onerror=()=>rej(r.error)})}catch(e){return []}}
async function latestIDB(){return (await allIDB()).sort(compare)[0]||null}
async function recoverIfNewer(){const remote=await latestIDB();if(!remote)return false;const local=rawCandidate();if(local?.verified&&compare(local,remote)<=0)return false;try{localStorage.setItem(RAW_KEY,JSON.stringify(remote.data));localStorage.setItem(META_KEY,JSON.stringify({schema:3,rev:remote.rev,savedAt:remote.savedAt,reason:"idb-recovery",checksum:remote.checksum}));return true}catch(e){return false}}
async function forceJournal(data,reason="checkpoint"){const current=rawCandidate();const rev=Math.max(+current?.rev||0,+data?.meta?.persistenceRevision||0);const row=makeRow(data,rev||1,reason);await putIDB(row);return row}
function health(){const c=rawCandidate(),rb=rollbackCandidate();return {ok:!!c?.verified,revision:c?.rev||0,savedAt:c?.savedAt||null,rollbackRevision:rb?.rev||0,weight:weight(c?.data||{}),checksum:c?.checksum||null}}
window.ALOSDurablePersistence={bootstrap,save,health,recoverIfNewer,latestIDB,forceJournal,checksum,contentChecksum,weight,keys:{RAW_KEY,META_KEY,ROLLBACK_KEY}};
})();
