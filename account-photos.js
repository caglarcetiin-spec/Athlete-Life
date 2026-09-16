/* Durable account-local photo queue. Conflict never overwrites either device. */
(()=>{
'use strict';if(!window.ALOSAccount)return;
const KEY='account.photoSync',q=id=>document.getElementById(id);
let working=null,again=false,conflictId=null;
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{known:{},removed:{}}}catch(_){return {known:{},removed:{}}}};
const write=s=>localStorage.setItem(KEY,JSON.stringify(s));
const clean=r=>({id:r.id,date:r.date,createdAt:r.createdAt||null,photos:r.photos});
function stable(x){return JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v)}
async function hash(row){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stable(clean(row)))))).map(v=>v.toString(16).padStart(2,'0')).join('')}
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open('AthleteLifeOSPhotos',1);r.onupgradeneeded=()=>r.result.createObjectStore('checkins',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function photos(){const d=await open();return new Promise((resolve,reject)=>{const t=d.transaction('checkins'),r=t.objectStore('checkins').getAll();t.oncomplete=()=>{d.close();resolve(r.result)};t.onerror=()=>{d.close();reject(t.error)}})}
async function put(row,id,expected){const d=await open();return new Promise((resolve,reject)=>{const t=d.transaction('checkins','readwrite'),s=t.objectStore('checkins');const get=s.get(id);get.onsuccess=()=>{if(stable(get.result?clean(get.result):null)!==stable(expected?clean(expected):null)){t.abort();return}if(read().removed[id]!==undefined){t.abort();return}if(row)s.put(row);else s.delete(id)};t.onabort=()=>{d.close();reject(new Error('Fotoğraf bu cihazda değişti; tekrar eşitle.'))};t.oncomplete=()=>{d.close();resolve()};t.onerror=()=>{d.close();reject(t.error)}})}
async function request(path,body){
 const response=await fetch(path,{method:body?'POST':'GET',headers:window.ALOSAccount.headers(),cache:'no-store',...(body?{body:JSON.stringify(body)}:{})});
 const result=await response.json();if(response.status===401||response.status===403){window.ALOSAccount.lock();throw new Error('Oturum değişti.')}
 if(!response.ok){const error=new Error(response.status===409?'Fotoğraf başka cihazda değişti. Yerel fotoğraf korundu; tam yedek alıp değişiklikleri kontrol et.':result.error||'Fotoğraf eşitlenemedi.');error.conflict=response.status===409;throw error;}return result;
}
function conflictButton(){
 q('account-photo-resolve')?.remove();if(conflictId===null)return;
 const b=document.createElement('button');b.id='account-photo-resolve';b.type='button';b.className='secondary';b.textContent='Çakışan fotoğraf kopyalarını koru';
 b.onclick=async()=>{b.disabled=true;try{
  const id=+conflictId,local=(await photos()).find(r=>r.id===id),remote=await request('/api/photos/'+id);
  // Explicit resolution: keep a separate local copy, then accept the remote id.
  if(local){let next=Date.now();const ids=new Set((await photos()).map(r=>r.id));while(ids.has(next))next++;await put({...local,id:next},next,null)}
  const state=read();delete state.removed[id];write(state);
  await put(remote.deleted?null:remote.record,id,local||null);
  state.known[id]={revision:remote.revision,hash:remote.deleted?null:await hash(remote.record)};write(state);
  conflictId=null;b.remove();await sync();
 }catch(e){status(e.message);b.disabled=false}};
 q('account-photo-status')?.after(b);
}
function status(text){const el=q('account-photo-status');if(el)el.textContent=text}
async function sync(){
 if(window.ALOSAccount.locked)return false;if(working){again=true;return working;}
 working=(async()=>{
  let activeId=null;status('Fotoğraflar eşitleniyor…');
  try{
   let state=read();const remote=await request('/api/photos'),local=await photos(),map=new Map(local.map(r=>[String(r.id),r])),cloud=new Map(remote.photos.map(r=>[String(r.id),r]));
   for(const [id,base] of Object.entries(state.removed)){activeId=id;
    const existing=cloud.get(id);
    const saved=existing?.deleted?existing:await request('/api/photos',{id:+id,baseRevision:base,record:null});
    state=read();delete state.removed[id];state.known[id]={revision:saved.revision,hash:null};write(state);cloud.set(id,{id:+id,revision:saved.revision,deleted:true});
   }
   for(const [id,r] of map){activeId=id;
    if(window.ALOSAccount.locked)throw new Error('Oturum değişti.');
    if(!r.photos||!Object.keys(r.photos).length)continue;
    state=read();if(Object.hasOwn(state.removed,id))continue;
    const signature=await hash(r),known=state.known[id],remote=cloud.get(id);
    if(remote?.hash===signature){state.known[id]={revision:remote.revision,hash:signature};write(state);continue}
    const changed=!known||known.hash!==signature;
    if(changed&&remote&&remote.revision!==(known?.revision||0)){const error=new Error('Aynı fotoğraf başka cihazda değişti. Yerel kopya korundu.');error.conflict=true;throw error;}
    if(changed){
     const saved=await request('/api/photos',{id:r.id,baseRevision:known?.revision||0,record:clean(r)});
     state=read();if(Object.hasOwn(state.removed,id)&&state.removed[id]===(known?.revision||0))state.removed[id]=saved.revision;state.known[id]={revision:saved.revision,hash:signature};write(state);
    }else if(remote&&remote.revision!==known.revision){
     if(remote.deleted){await put(null,r.id,r);state=read();state.known[id]={revision:remote.revision,hash:null};write(state)}
     else{const item=await request('/api/photos/'+id);await put(item.record,r.id,r);state=read();state.known[id]={revision:item.revision,hash:await hash(item.record)};write(state)}
    }
   }
   for(const [id,r] of cloud){
    state=read();if(map.has(id)||r.deleted||Object.hasOwn(state.removed,id))continue;
    const item=await request('/api/photos/'+id);if(item.deleted)continue;
    await put(item.record,item.record.id,null);state=read();state.known[id]={revision:item.revision,hash:await hash(item.record)};write(state);
   }
   status('Fotoğraflar hesabınla eşitlendi.');window.renderPhotoGallery?.();return true;
  }catch(e){if(e.conflict){conflictId=activeId;conflictButton()}status('Fotoğraf eşitleme bekliyor: '+e.message);return false}
 })().finally(()=>{working=null;if(again){again=false;queueMicrotask(sync)}});return working;
}
function removed(id){const s=read();s.removed[id]=s.known[id]?.revision||0;write(s);return sync()}
function restored(id){const s=read();delete s.removed[id];write(s);return sync()}
function init(){
 const gallery=q('photoProgressGallery');if(!gallery)return;
 const bar=document.createElement('div');bar.className='sports-actions';const button=document.createElement('button');button.className='secondary';button.type='button';button.textContent='Fotoğrafları eşitle';button.onclick=sync;
 const note=document.createElement('p');note.id='account-photo-status';note.className='hint';note.setAttribute('role','status');bar.append(button,note);gallery.before(bar);sync();
 window.addEventListener('online',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
}
window.AccountPhotos={sync,changed:sync,removed,restored,status:read};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
