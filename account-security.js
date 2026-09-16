(()=>{
'use strict';
function init(){
 const signed=!!window.ALOSAccount,target=signed?document.querySelector('.account-dialog'):document.querySelector('.account-card');if(!target)return;
 const button=document.createElement('button');button.className='secondary';button.type='button';button.textContent=signed?'Kurtarma kodlarım':'Şifremi unuttum';target.append(button);
 button.onclick=()=>{
  const d=document.createElement('dialog');d.className='account-dialog';d.setAttribute('aria-label',signed?'Kurtarma kodları':'Şifre kurtarma');
  d.innerHTML=signed?'<h2>Kurtarma kodların</h2><p>Şifreni unutursan her kod bir kez kullanılabilir. Yeni kod üretmek eski kodları geçersiz kılar. Kodlar yalnız bu kez gösterilir; güvenli bir yerde sakla.</p><form><label>Mevcut şifre<input name="currentPassword" type="password" autocomplete="current-password" required maxlength="128"></label><button class="account-primary" type="submit">Beş yeni kod oluştur</button></form>':'<h2>Şifreni yenile</h2><p>Hesabında daha önce oluşturduğun tek kullanımlık kurtarma kodunu gir. Bu işlem tüm açık oturumları kapatır.</p><form><label>Kullanıcı adı<input name="username" autocomplete="username" required maxlength="40"></label><label>Kurtarma kodu<input name="code" autocomplete="off" required maxlength="128"></label><label>Yeni şifre<input name="newPassword" type="password" autocomplete="new-password" required minlength="15" maxlength="128"></label><button class="account-primary" type="submit">Şifreyi yenile</button></form>';
  const msg=document.createElement('p');msg.setAttribute('role','status');const close=document.createElement('button');close.type='button';close.textContent='Kapat';close.onclick=()=>d.close();d.append(msg,close);document.body.append(d);d.onclose=()=>d.remove();d.showModal();
  let busy=false;d.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const submit=d.querySelector('[type=submit]');submit.disabled=true;msg.textContent='';
   try{
    const response=await fetch(signed?'/api/auth/recovery-codes':'/api/auth/recover',{method:'POST',headers:signed?window.ALOSAccount.headers():{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))}),data=await response.json();
    if(!response.ok)throw new Error(data.error);
    if(signed){const field=document.createElement('textarea');field.readOnly=true;field.rows=7;field.setAttribute('aria-label','Tek kullanımlık kurtarma kodları');field.value=data.codes.join('\n');e.target.replaceWith(field);msg.textContent='Kodları şimdi sakla. Kapatınca tekrar gösterilmez.';field.select()}
    else{e.target.reset();msg.textContent='Şifren yenilendi. Bu pencereyi kapatıp yeni şifrenle giriş yap.';if(typeof BroadcastChannel!=='undefined'){const c=new BroadcastChannel('alos-account-session');c.postMessage('changed');c.close()}}
   }catch(error){msg.textContent=error.message}finally{busy=false;submit.disabled=false}
  };
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
