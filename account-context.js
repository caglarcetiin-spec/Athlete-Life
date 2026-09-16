/* Loaded before every legacy engine, only by the account edition. */
(()=>{
'use strict';
const config=window.ALOSAccountConfig;
if(!config?.user?.id||!config.csrf)throw new Error('Account context required');
let user=Object.freeze({...config.user});
const prefix='alos-account:'+user.id+':';
let locked=false;
function scopedStorage(native){
 const keys=()=>Array.from({length:native.length},(_,i)=>native.key(i)).filter(k=>k?.startsWith(prefix));
 return Object.freeze({
  get length(){return keys().length},key:i=>keys()[i]?.slice(prefix.length)??null,
  getItem:key=>native.getItem(prefix+String(key)),
  setItem:(key,value)=>{if(locked)throw new Error('Session changed');native.setItem(prefix+String(key),String(value))},
  removeItem:key=>{if(locked)throw new Error('Session changed');native.removeItem(prefix+String(key))},
  clear:()=>{if(locked)throw new Error('Session changed');keys().forEach(key=>native.removeItem(key))}
 });
}
const nativeLocal=window.localStorage,nativeSession=window.sessionStorage,nativeIDB=window.indexedDB;
Object.defineProperty(window,'localStorage',{value:scopedStorage(nativeLocal)});
Object.defineProperty(window,'sessionStorage',{value:scopedStorage(nativeSession)});
if(nativeIDB)Object.defineProperty(window,'indexedDB',{value:Object.freeze({
 open:(name,...args)=>{if(locked)throw new Error('Session changed');return nativeIDB.open(prefix+String(name),...args)},
 deleteDatabase:name=>{if(locked)throw new Error('Session changed');return nativeIDB.deleteDatabase(prefix+String(name))},
 cmp:nativeIDB.cmp.bind(nativeIDB),
 databases:async()=>((await nativeIDB.databases()).filter(x=>x.name.startsWith(prefix)).map(x=>({...x,name:x.name.slice(prefix.length)})))
})});
function lock(message='Oturum değişti. Devam etmek için yeniden giriş yap.'){
 if(locked)return;locked=true;
 const show=()=>{
  const panel=document.createElement('div');panel.className='account-lock';panel.setAttribute('role','alert');
  const title=document.createElement('h1');title.textContent='Hesabını yeniden aç';
  const text=document.createElement('p');text.textContent=message;
  const link=document.createElement('a');link.href='/accounts.html';link.textContent='Giriş ekranına git';
  panel.append(title,text,link);document.body.replaceChildren(panel);
 };
 if(document.body)show();else document.addEventListener('DOMContentLoaded',show,{once:true});
}
const headers=()=>({'Content-Type':'application/json','X-ALOS-Account':user.id,'X-ALOS-CSRF':config.csrf});
async function checkSession(){
 if(locked)return;
 try{
  const response=await fetch('/api/auth/session',{cache:'no-store'});
  if(response.status===401){lock();return}
  if(response.ok){const result=await response.json();if(result.user?.id!==user.id||result.csrf!==config.csrf)lock()}
 }catch(_){} // Offline changes remain confined to this account's storage.
}
function updateUser(next){
 if(locked||next?.id!==user.id)throw new Error('Hesap eşleşmedi.');
 user=Object.freeze({...next});
 const b=document.getElementById('account-profile-open');if(b){b.textContent=user.name;b.setAttribute('aria-label','Profilim: '+user.name)}
 window.dispatchEvent(new CustomEvent('account:profile-updated'));
}
window.ALOSAccount=Object.freeze({get user(){return user},updateUser,headers,lock,get locked(){return locked}});
delete window.ALOSAccountConfig;
if(typeof BroadcastChannel!=='undefined'){
 const channel=new BroadcastChannel('alos-account-session');channel.onmessage=()=>checkSession();
}
window.addEventListener('pageshow',checkSession);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkSession()});
setInterval(checkSession,60000);
document.addEventListener('DOMContentLoaded',()=>{
 if(locked)return;
 const actions=document.querySelector('.topbar-actions');if(!actions)return;
 const button=document.createElement('button');button.type='button';button.id='account-profile-open';button.className='secondary';button.textContent=user.name;button.setAttribute('aria-label','Profilim: '+user.name);
 const status=document.createElement('span');status.id='accountSyncStatus';status.className='account-status';status.setAttribute('role','status');
 actions.prepend(button,status);
 const dialog=document.createElement('dialog');dialog.className='account-dialog';dialog.setAttribute('aria-labelledby','account-dialog-title');
 dialog.innerHTML='<h2 id="account-dialog-title">Hesabım</h2><p id="account-display-name"></p><p id="account-display-username" class="account-muted"></p><details><summary>Şifremi değiştir</summary><form id="account-password-form"><label>Mevcut şifre<input name="currentPassword" type="password" autocomplete="current-password" required maxlength="128"></label><label>Yeni şifre<input name="newPassword" type="password" autocomplete="new-password" required minlength="15" maxlength="128"></label><button class="account-primary" type="submit">Şifreyi değiştir ve çıkış yap</button></form></details><p id="account-dialog-message" class="account-message" role="status"></p><div class="account-actions"><button id="account-close" type="button">Kapat</button><button id="account-logout" type="button">Çıkış yap</button></div>';
 document.body.append(dialog);
 dialog.querySelector('#account-display-name').textContent=user.name;
 dialog.querySelector('#account-display-username').textContent='@'+user.username;
 button.onclick=()=>document.getElementById('account-profile')?window.AthleteWorkspace.navigate('account-profile'):dialog.showModal();dialog.querySelector('#account-close').onclick=()=>dialog.close();
 const message=dialog.querySelector('#account-dialog-message');
 async function finishSession(path,body){
  try{
   window.ALOSRuntime?.save?.();
   const sync=window.ALOSServerSync;
   if(sync?.status().pending&&!(await sync.flush()))throw new Error('Bekleyen kayıtlar henüz sunucuya ulaşmadı. Yeniden dene veya önce yedekle.');
   const response=await fetch(path,{method:'POST',headers:headers(),body:JSON.stringify(body)});
   const result=await response.json();if(!response.ok)throw new Error(result.error);
   if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('alos-account-session');channel.postMessage('changed');channel.close()}
   lock();location.replace('/accounts.html');
  }catch(error){message.textContent=error.message}
 }
 dialog.querySelector('#account-logout').onclick=()=>finishSession('/api/auth/logout',{});
 dialog.querySelector('#account-password-form').onsubmit=event=>{
  event.preventDefault();const data=new FormData(event.currentTarget);
  finishSession('/api/auth/password',Object.fromEntries(data));
 };
 window.ALOSServerSync?.renderStatus?.();
});
})();
