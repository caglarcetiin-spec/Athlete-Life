(()=>{
'use strict';
const q=id=>document.getElementById(id);
let mode='login',busy=false;
function select(next){
 if(busy)return;
 mode=next;const signup=mode==='signup';
 q('login-tab').setAttribute('aria-pressed',String(!signup));q('signup-tab').setAttribute('aria-pressed',String(signup));
 for(const id of ['name-field','confirm-field','password-hint'])q(id).hidden=!signup;
 q('account-name').required=signup;q('account-confirm').required=signup;
 q('account-password').minLength=signup?8:1;q('account-password').autocomplete=signup?'new-password':'current-password';
 q('form-title').textContent=signup?'Kendi yolculuğunu başlat.':'Yeniden hoş geldin.';
 q('form-description').textContent=signup?'Hesabını oluştur; ardından Basit veya Profesyonel görünümünü seç. Kısa rehber ilk adımlarında yanında.':'Kaldığın yerden devam et.';
 q('account-submit').textContent=signup?'Profilimi oluştur':'Giriş yap';q('account-message').textContent='';
 q(signup?'account-name':'account-username').focus();
}
q('login-tab').onclick=()=>select('login');q('signup-tab').onclick=()=>select('signup');
q('show-password').onclick=()=>{
 const show=q('account-password').type==='password';q('account-password').type=show?'text':'password';
 q('show-password').textContent=show?'Gizle':'Göster';q('show-password').setAttribute('aria-pressed',String(show));
 q('show-password').setAttribute('aria-label',show?'Şifreyi gizle':'Şifreyi göster');
};
q('account-form').onsubmit=async event=>{
 event.preventDefault();if(busy)return;
 q('account-message').textContent='';
 if(mode==='signup'&&q('account-password').value!==q('account-confirm').value){q('account-message').textContent='Şifreler eşleşmiyor.';q('account-confirm').focus();return}
 busy=true;q('account-submit').disabled=true;
 try{
  const response=await fetch('/api/auth/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:q('account-username').value,password:q('account-password').value,name:q('account-name').value})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Giriş tamamlanamadı.');
  q('account-password').value='';q('account-confirm').value='';
  if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('alos-account-session');channel.postMessage('changed');channel.close()}
  location.assign('/index.html');
 }catch(error){q('account-message').textContent=error.message==='Failed to fetch'?'Sunucuya ulaşılamıyor. Bağlantını kontrol edip yeniden dene.':error.message}
 finally{busy=false;q('account-submit').disabled=false}
};
})();
