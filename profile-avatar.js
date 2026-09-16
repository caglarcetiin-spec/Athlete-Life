/* Only the resized JPEG is persisted through the account's existing sync path. */
(()=>{
'use strict';if(!window.ALOSAccount)return;
const q=id=>document.getElementById(id),db=()=>ALOSRuntime.getDb();
const valid=v=>typeof v==='string'&&v.length<=125000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v);
function draw(){const value=db().settings?.profileAvatar;document.querySelectorAll('.profile-monogram,.profile-chip-avatar').forEach(el=>{if(valid(value)){if(el.querySelector('img')?.src===value)return;const image=new Image();image.src=value;image.alt='';el.replaceChildren(image)}else if(el.querySelector('img'))el.textContent=ALOSAccount.user.name.trim().slice(0,1).toLocaleUpperCase('tr')});}
function init(){
 const identity=document.querySelector('.profile-identity');if(!identity)return;
 const card=document.createElement('section');card.className='card';card.innerHTML='<h3>Profil fotoğrafın</h3><p class="hint">İsteğe bağlı. Fotoğraf cihazında 256 × 256 piksele küçültülür; yalnız küçük JPEG hesabına kaydedilir.</p><div class="avatar-editor"><img id="avatar-preview" class="avatar-preview" alt="Seçtiğin profil fotoğrafının önizlemesi" hidden><label>Fotoğraf seç<input id="avatar-file" type="file" accept="image/jpeg,image/png,image/webp"></label><button id="avatar-save" class="primary" disabled>Fotoğrafı kaydet</button><button id="avatar-remove" class="secondary">Fotoğrafı kaldır</button></div><p id="avatar-message" class="hint" role="status"></p>';identity.after(card);
 let pending=null,ticket=0,saving=false;
 q('avatar-file').onchange=async e=>{const token=++ticket,f=e.target.files[0];pending=null;q('avatar-save').disabled=true;if(!f)return;const msg=q('avatar-message');try{
  if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024)throw Error('En fazla 10 MB JPEG, PNG veya WebP seç.');
  const bitmap=await createImageBitmap(f);if(token!==ticket){bitmap.close();return}
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>50000000){bitmap.close();throw Error('Fotoğraf çok büyük. Daha küçük bir görsel seç.')}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),edge=Math.min(bitmap.width,bitmap.height);
  ctx.fillStyle='#edf3f0';ctx.fillRect(0,0,256,256);ctx.drawImage(bitmap,(bitmap.width-edge)/2,(bitmap.height-edge)/2,edge,edge,0,0,256,256);bitmap.close();
  pending=canvas.toDataURL('image/jpeg',.76);if(!valid(pending))throw Error('Görsel küçültülemedi. Başka bir fotoğraf seç.');
  q('avatar-preview').src=pending;q('avatar-preview').hidden=false;q('avatar-save').disabled=false;msg.textContent='Önizleme hazır · yaklaşık '+Math.ceil(pending.length*.75/1024)+' KB. Kaydettiğinde profilinde görünür.';
 }catch(err){if(token===ticket)msg.textContent=err.message}};
 async function save(value){if(saving)return;saving=true;q('avatar-save').disabled=true;q('avatar-remove').disabled=true;try{q('avatar-message').textContent=await AthleteSports.persist({settings:{...db().settings,profileAvatar:value}});pending=null;q('avatar-file').value='';q('avatar-preview').hidden=true;draw();}catch(err){q('avatar-message').textContent=err.message}finally{saving=false;q('avatar-save').disabled=!pending;q('avatar-remove').disabled=false}}
 q('avatar-save').onclick=()=>{if(valid(pending))save(pending)};q('avatar-remove').onclick=()=>save(null);
 new MutationObserver(draw).observe(document.querySelector('.topbar-actions'),{childList:true,subtree:true});
 window.addEventListener('account:profile-updated',draw);window.addEventListener('workspace:navigate',draw);draw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
