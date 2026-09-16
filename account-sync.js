/* Account edition transport. User ownership and revision checks are server-enforced. */
(()=>{
'use strict';
const account=window.ALOSAccount;if(!account)throw new Error('Account required');
const RAW='athleteLifeOS',OUTBOX='account.pending',BASE='account.serverRevision';
const parse=x=>{try{return JSON.parse(x)}catch(_){return null}};
// Recomputed caches stay local until the next real input commit. Opening a
// second device must not compete with the first merely for rendering a plan.
const derived=new Set(['meta','modelSnapshots','calibration','futurePlans','generatedWeekPlan','lifecycle','adaptiveModel','uiState','programEngine']);
function inputSignature(data){
 const d={...data};for(const key of derived)delete d[key];
 if(d.planHistory)d.planHistory=Object.fromEntries(Object.entries(d.planHistory).filter(([,v])=>v.performed).map(([k,v])=>[k,{performed:v.performed}]));
 if(d.sessionPrescriptions)d.sessionPrescriptions=Object.fromEntries(Object.entries(d.sessionPrescriptions).filter(([,v])=>v.locked));
 const stable=value=>{if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).filter(k=>!['physiologySnapshot','lastCheckedAt'].includes(k)).sort().map(k=>[k,stable(value[k])]));return value};
 return JSON.stringify(stable(d));
}
let booting=document.readyState==='loading',ackSignature=null;
let base=Number(localStorage.getItem(BASE)||0),pending=parse(localStorage.getItem(OUTBOX)),inFlight=null,timer=null,blocked=false,reloading=false,lastError='';
function renderStatus(){
 const el=document.getElementById('accountSyncStatus');if(!el)return;
 el.textContent=lastError||(pending?'Kaydediliyor…':'Hesabına kaydedildi');
 el.title=lastError;el.onclick=blocked?showConflict:null;el.style.cursor=blocked?'pointer':'';
}
function stash(){
 if(pending)localStorage.setItem(OUTBOX,JSON.stringify({...pending,baseRevision:base}));else localStorage.removeItem(OUTBOX);
 localStorage.setItem(BASE,String(base));renderStatus();
}
function adopt(data){
 localStorage.setItem(RAW,JSON.stringify(data));localStorage.removeItem('athleteLifeOS.commit.v3');
}
function bootstrap(){
 const xhr=new XMLHttpRequest();
 try{
  xhr.open('GET','/api/state',false);Object.entries(account.headers()).forEach(([k,v])=>xhr.setRequestHeader(k,v));xhr.send();
  if(xhr.status===401||xhr.status===403){account.lock();return}
  if(xhr.status!==200)throw new Error('Server unavailable');
  const result=JSON.parse(xhr.responseText),remote=result.data||{meta:{accountId:account.user.id},profile:{name:account.user.name}};
  if(pending){
   if(pending.baseRevision!==result.revision){blocked=true;lastError='Kayıt çakışması · incelemek için seç';}
   base=pending.baseRevision;adopt(pending.data);
  }else{base=result.revision;adopt(remote);ackSignature=inputSignature(remote)}
  stash();
 }catch(_){lastError='Bağlantı bekleniyor · kayıtlar bu hesapta korunuyor';}
}
function push(data,reason){
 if(account.locked||reloading)return false;
 if(booting)return true;
 const signature=inputSignature(data);if(signature===(pending?inputSignature(pending.data):ackSignature))return true;
 pending={data:JSON.parse(JSON.stringify(data)),reason:reason||'account-save',baseRevision:base};
 stash();clearTimeout(timer);if(!blocked)timer=setTimeout(flush,100);return true;
}
function flush(){
 if(inFlight)return inFlight;
 if(blocked||account.locked)return Promise.resolve(false);
 if(!pending)return Promise.resolve(true);
 clearTimeout(timer);
 inFlight=(async()=>{
  while(pending&&!account.locked&&!blocked){
   const payload=pending;
   try{
    const response=await fetch('/api/state',{method:'POST',headers:account.headers(),body:JSON.stringify({...payload,baseRevision:base})});
    const result=await response.json();
    if(response.status===401||response.status===403){account.lock(result.error);return false}
    if(response.status===409){blocked=true;lastError='Kayıt çakışması · incelemek için seç';renderStatus();showConflict();return false}
    if(!response.ok||!result.ok)throw new Error(result.error||'Kayıt tamamlanamadı');
    base=result.revision;ackSignature=inputSignature(payload.data);if(pending===payload)pending=null;lastError='';stash();
   }catch(_){lastError='Bağlantı bekleniyor · kayıtlar bu hesapta korunuyor';renderStatus();return false}
  }
  return true;
 })().finally(()=>{inFlight=null});
 return inFlight;
}
function showConflict(){
 if(!blocked||!document.body||document.getElementById('account-conflict'))return;
 const dialog=document.createElement('dialog');dialog.id='account-conflict';dialog.className='account-dialog';
 dialog.innerHTML='<h2>Kayıtlarını birlikte koruyalım</h2><p>Başka bir sekme veya cihaz daha yeni veri kaydetti. Bu sekmedeki değişiklikler hesabının yerel taslağında duruyor.</p><p class="account-muted">Sunucudaki sürümü açmadan önce yerel taslağını indir. İndirilen dosya bu sekmenin kayıtlarını içerir; fotoğraflar için uygulamanın tam yedeğini kullan.</p><div class="account-actions"><button id="conflict-export" type="button">Yerel taslağı indir</button><button id="conflict-remote" type="button" disabled>Sunucudakini aç</button></div><div class="account-actions"><button id="conflict-close" type="button">Şimdilik kapat</button></div>';
 document.body.append(dialog);dialog.showModal();
 dialog.querySelector('#conflict-close').onclick=()=>{dialog.close();dialog.remove()};
 dialog.querySelector('#conflict-export').onclick=()=>{
  const data=pending?.data||parse(localStorage.getItem(RAW));const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Athlete_Life_Yerel_Taslak.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  dialog.querySelector('#conflict-remote').disabled=false;
 };
 dialog.querySelector('#conflict-remote').onclick=()=>{
  // Keep an additional per-account local copy even after the explicit choice.
  localStorage.setItem('account.conflict.'+Date.now(),JSON.stringify(pending));
  reloading=true;localStorage.removeItem(OUTBOX);pending=null;location.reload();
 };
}
function beacon(data,reason){
 if(account.locked||blocked||reloading)return false;
 // The durable outbox is retried after reload; a concurrent beacon could race a save.
 return push(data,reason||'pagehide');
}
function health(){return fetch('/api/health',{headers:account.headers(),cache:'no-store'}).then(r=>r.json()).catch(()=>({ok:false}))}
window.ALOSServerSync={bootstrap,push,flush,beacon,health,renderStatus,inputSignature,status:()=>({lastAckRev:base,pending:!!pending,saving:!!inFlight,blocked})};
bootstrap();
window.addEventListener('online',()=>flush());
document.addEventListener('DOMContentLoaded',()=>{
 const finish=()=>{booting=false;if(!pending)ackSignature=inputSignature(window.ALOSRuntime?.getDb?.()||parse(localStorage.getItem(RAW))||{});renderStatus();if(blocked)showConflict();else if(pending)flush()};
 if(typeof queueMicrotask==='function')queueMicrotask(finish);else finish();
});
})();
