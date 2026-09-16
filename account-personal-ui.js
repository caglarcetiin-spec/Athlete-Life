(()=>{
'use strict';if(!window.ALOSAccount)return;
const q=id=>document.getElementById(id),db=()=>ALOSRuntime.getDb(),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function update(){
 const target=AccountPersonalModel.targets(db(),SportsProfileCore.dayKey());document.body.classList.toggle('personal-targets-missing',!target);
 if(target)for(const [id,value] of [['targetCalories',target.kcal],['targetProtein',target.proteinG],['targetWater',target.waterL]])if(q(id))q(id).value=value;
 const note=q('personal-nutrition-note');if(note)note.querySelector('p').textContent=target?'Kendi belirlediğin hedefler kullanılıyor. Hesaplar kayıtlı besinlerle karşılaştırılır.':'Besinlerini kaydedebilirsin. Kalori ve makro hedefi girmeden kişisel beslenme reçetesi üretilmez.';
 const label=q('personal-target-summary');if(label)label.textContent=target?`${Math.round(target.kcal)} kcal · ${Math.round(target.proteinG)} g protein · ${Math.round(target.fatG)} g yağ · ${Math.round(target.carbsG)} g karbonhidrat · ${target.waterL} L su`:'Henüz kişisel beslenme hedefi belirlenmedi.';
}
function edit(){
 const owner=db(),expected=JSON.stringify(owner.settings?.personalTargets),current=owner.settings?.personalTargets||{},modal=AthleteSports.dialog('personal-target-editor','Kişisel beslenme hedeflerin');
 const content=modal.querySelector('.sports-content'),message=modal.querySelector('.sports-message');
 content.innerHTML=`<p class="hint">Kendi veya birlikte çalıştığın uzmanın belirlediği hedefleri gir. Bu form kalori ihtiyacı tahmin etmez. Karbonhidrat, protein ve yağdan sonra kalan enerjiyle hesaplanır.</p><form id="personal-target-form"><div class="sports-search">${[['kcal','Enerji · kcal',500,15000],['proteinG','Protein · g',0,600],['fatG','Yağ · g',0,600],['waterL','Su · L',.1,15]].map(([key,label,min,max])=>`<label>${label}<input name="${key}" type="number" min="${min}" max="${max}" step="any" required value="${esc(current[key]??'')}"></label>`).join('')}</div><button class="primary" type="submit">Hedeflerimi kaydet</button></form>`;
 content.querySelector('form').onsubmit=async e=>{e.preventDefault();try{
  if(db()!==owner||JSON.stringify(db().settings?.personalTargets)!==expected)throw new Error('Ayarlar değişti. Güncel hedeflerini yeniden aç.');
  const t=AccountPersonalModel.validate(Object.fromEntries(new FormData(e.target))),settings={...db().settings,personalTargets:{...t,confirmedAt:new Date().toISOString()},targetCalories:t.kcal,targetProtein:t.proteinG,targetWater:t.waterL};
  await AthleteSports.persist({settings});modal.close();update();window.AthleteCoordinator?.schedule('personal-targets');
 }catch(error){message.textContent=error.message}};modal.showModal();
}
function init(){
 const card=document.createElement('section');card.className='card';card.id='personal-target-card';card.innerHTML='<h3>Kişisel beslenme hedefleri</h3><p id="personal-target-summary"></p><button id="personal-target-edit" class="secondary">Hedeflerimi düzenle</button>';
 const settings=q('settings');settings.querySelector('.design-header')?.after(card);if(!card.isConnected)settings.prepend(card);q('personal-target-edit').onclick=edit;
 for(const id of ['targetProtein','targetCalories','targetWater'])q(id)?.closest('label')?.classList.add('design-duplicate');
 const note=document.createElement('section');note.className='card';note.id='personal-nutrition-note';note.innerHTML='<p></p><button class="secondary" type="button">Beslenme hedeflerim</button>';note.querySelector('button').onclick=edit;q('nutrition').querySelector('.design-header')?.after(note);
 // Legacy model percentages are diagnostic indices, not calibrated certainty.
 for(const id of ['nutritionImpactConfidence','adaptiveMeasurementConfidence']){const el=q(id);if(el){el.setAttribute('title','Eski modelin veri kapsamı göstergesi; doğrulanmış kesinlik olasılığı değildir.');}}
 update();EngineBus?.subscribe?.('athlete.state.ready',update,'personal-targets');
}
window.AccountPersonalUI={edit,update};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
