/* Account-only presentation layer. Original controls retain their nodes/listeners. */
(()=>{
'use strict';if(!window.ALOSAccount)return;
const q=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pages={
 today:{title:'Bugün nasıl hissediyorsun?',text:'Uyku, sağlık ve günlük koşullarını bir kez kaydet. Plan ve analiz aynı kaydı kullanır.',keep:['#saveDailyBtn','#saveHealthBtn','#saveBtn','#painLogBtn','#checkinForm','#dailyForm'],titles:['Sabah','Sağlık','Pain /','Eksik Günleri','Bugünkü Vardiya']},
 week:{title:'Zamanını planla',text:'Haftayı tarihle seç. Vardiyaları düzenle, ardından istersen önerileri incele.',keep:['#weekPlanner'],titles:[]},
 training:{title:'Hareket ve set kaydı',text:'Yeni dönemlerini Antrenman → Dönemlerim bölümünde oluştur. Burada hareket kayıtlarına ve önceki kuvvet programının uygulama araçlarına eriş.',keep:['#manualTrainingDate','#exerciseSelect','#exerciseLog'],titles:[]},
 nutrition:{title:'Yediklerini ve içtiklerini kaydet',text:'Besin ve su kayıtların tek günlükte. Hedefler ve eğilimler aşağıda ayrı gösterilir.',keep:['#addFoodBtn','#foodLog'],titles:[]},
 analytics:{title:'Zaman içinde ne değişti?',text:'Günlük dalgalanma ile uzun dönem eğilimini ayır. Eksik günler gerçek sıfır sayılmaz.',keep:[],titles:['Periyodik','Haftalık Özet']},
 detailed:{title:'Ölçümler ve ayrıntılar',text:'Aynı koşullarda kaydettiğin ölçümleri ve fotoğrafları takip et.',keep:['.analysis-layout'],titles:[]},
 coach:{title:'Kuvvet programı incelemesi',text:'Önceki hareket programının gerekçeleri ve yol haritası. Çok branşlı dönemin ana kaynağı Antrenman → Dönemlerim bölümüdür.',keep:['#coachDecision'],titles:['Koç Kararı']},
 character:{title:'Spor profilin ve ölçümlerin',text:'Branşlarını, hedeflerini ve zamanını düzenle. Fiziksel testleri ihtiyaç duyduğunda aç.',keep:['#sports-profile-card'],titles:[]},
 reports:{title:'Vücudun ve toparlanma',text:'Anatomik görünüm kayıtlı hareket yüklerinden tahmin üretir. Özbildirimin ve geçen süre birlikte değerlendirilir.',keep:['#bodymap3dCanvas','#body3dCanvas','#muscleReport','#bodyMap3d','#body3d'],titles:['Kaslar ve Toparlanma']},
 records:{title:'Kayıtlarını yönet',text:'Düzeltmeler geçmişi korur. Yeni dönem seanslarının setlerini bağlı branş kaydından düzenle.',keep:['#recordCenterToolbar'],titles:['Kayıt Merkezi']},
 settings:{title:'Tercihler ve verilerin',text:'Kişisel hedefler, yedek ve geri yükleme tek yerde.',keep:['#exportAllBtn','#dataVaultExport','#targetSleep','#targetCalories'],titles:['Profil ve Hedefler','Data Vault']}
};
const translations={
 'Sabah Check-in':'Günlük durum kaydı','Pain / Joint Intelligence':'Ağrı ve eklem kaydı','Adherence Guardian':'Planlanan ve gerçekleşen',
 'Athlete OS Architecture':'Veri akışı tanılaması','Universal Training Mesh':'Birleşik hareket yükü','Set Timing Consistency':'Set sürelerinin tutarlılığı',
 'Athlete Identity Engine':'Ölçüm profili','Capability Lab':'Fiziksel testler','ÇAĞLAR • Hybrid Athlete Character':'Fiziksel yetenek profili','Karakter Veri Girişi':'Önceki test kayıtları',
 'Character Veri Güveni':'Test verisinin kapsamı','Training DNA':'Çalışma eğilimleri','Data Vault':'Yedek ve geri yükleme',
 'System Integrity / Engine Mesh Test':'Sistem tanılaması','Nutrition Impact Engine':'Beslenme eğilimleri','Nutrition → Adaptation Map':'Beslenme ve performans ilişkileri',
 'Cut / Bulk Kalitesi':'Kilo hedefinin takibi','Photo Progress Check-in':'Fotoğraflarla gelişim','Body Gelişimi':'Vücut ölçümlerinin değişimi','Strength & PR':'Kuvvet ve kişisel rekorlar',
 'Recovery Önerisi':'Toparlanma yorumu','Koşu & Strength Uyumu':'Koşu ve kuvvet uyumu','Kişisel Response Model':'Kişisel yanıt eğilimleri','Plateau Detector':'Değişimin yavaşladığı alanlar',
 'Measurement Scheduler':'Ölçüm düzeni','Goal Conflict Engine':'Hedeflerin birlikte değerlendirilmesi','Testing Calendar':'Test takvimi','Guided Workout Runner · Seçili Günün Programı':'Önceki kuvvet programını uygula'
};
function titleOf(el){return el.querySelector('h3,h2')?.childNodes[0]?.textContent?.trim()||'';}
function translate(container=document){
 container.querySelectorAll('h2,h3,h4').forEach(h=>{const first=h.childNodes[0];if(first?.nodeType!==3)return;const old=first.textContent.trim();if(translations[old])first.textContent=translations[old]+' ';});
}
function fold(el,title){
 if(el.closest('.design-fold')||el.tagName==='DETAILS'||el.matches('[hidden]')||!title)return;
 const details=document.createElement('details');details.className='design-fold';
 const summary=document.createElement('summary');summary.textContent=translations[title]||title;details.append(summary);el.before(details);details.append(el);
 // Heading is repeated by the accessible disclosure label, not shown twice.
 const h=el.querySelector('h3');if(h){h.classList.add('design-inner-title');}
}
function setupPage(id,config){
 const page=q(id);if(!page||page.dataset.designVersion)return;page.dataset.designVersion='2';
 // Flatten only simple presentation grids; forms, metric strips and routed panels stay intact.
 for(const grid of [...page.children].filter(e=>e.matches('.grid.two'))){
  if(grid.children.length&&[...grid.children].every(e=>e.classList.contains('card')&&!e.classList.contains('metric'))){grid.replaceWith(...grid.childNodes);}
 }
 const nodes=[...page.children],primaryNodes=[];
 for(const el of nodes){
  if(el.matches('.command-center')){el.classList.add('design-duplicate');continue;}
  if(id==='detailed'||el.hidden||el.matches('dialog,.period-workshop')||el.querySelector('.detail-panel'))continue;
  const title=titleOf(el),primary=config.keep.some(selector=>el.matches(selector)||el.querySelector(selector))||config.titles.some(t=>title.includes(t));
  if(primary)primaryNodes.push(el);
  if(!primary&&el.matches('.card,.grid,details')&&title)fold(el,title);
  if(!primary&&el.matches('.grid.four')&&!title)fold(el,'Özbildirimden türetilen özet');
 }
 for(const el of primaryNodes.reverse())page.prepend(el);
 const header=document.createElement('header');header.className='design-header';header.innerHTML=`<div><p class="sports-eyebrow">ATHLETE LIFE</p><h2>${esc(config.title)}</h2><p>${esc(config.text)}</p></div>`;page.prepend(header);
 if(id==='training'){
  const legacy=page.querySelector('.period-workshop');
  if(legacy){fold(legacy,'Önceki kuvvet dönemlerinin arşivi');legacy.querySelector('#periodNew')?.setAttribute('hidden','');legacy.querySelector('#periodEditor')?.setAttribute('hidden','');}
  const button=document.createElement('button');button.className='secondary';button.textContent='Dönem planıma git';button.onclick=()=>AthleteWorkspace.navigate('workspace-plan');header.append(button);
 }
 if(id==='reports'){
  // The common analysis owns these summaries; keep render targets out of the UI.
  for(const el of nodes)if(['Bugünün Özeti','Bugün Ne Yapmalısın?','Haftalık Performans Raporu','Yeni Hafta İçin Öneriler','Aylık Gelişim Özeti','Önümüzdeki Ay İçin Öneriler'].includes(titleOf(el))){(el.closest('.design-fold')||el).classList.add('design-duplicate');}
 }
 if(id==='character'){
  for(const el of page.querySelectorAll('.manual-score-panel'))el.classList.add('design-duplicate');
 }
}
function tools(){
 const modal=AthleteSports.dialog('design-tools','Araçlar ve ayarlar'),content=modal.querySelector('.sports-content');
 const links=[['health-report','PDF sağlık raporu','Sağlık'],['account-profile','Hesap, e-posta ve şifre','Profilim'],['health-overview','Sağlık özeti','Sağlık'],['health-sleep','Uyku kalitesi ve eğilimleri','Sağlık'],['health-labs','Kan tahlilleri ve dönem karşılaştırması','Sağlık'],['today','Günlük durum ve sağlık','Sağlık'],['week','Vardiya takvimi','Antrenman'],['training','Hareket ve set kaydı','Antrenman'],['nutrition','Besin ve su günlüğü','Beslenme'],['analytics','Grafikler ve dönem eğilimleri','Gelişim'],['detailed','Vücut ölçümleri ve fotoğraflar','Gelişim'],['character','Spor profili ve fiziksel testler','Profilim'],['reports','3D vücut ve toparlanma','Sağlık'],['records','Kayıtları düzelt','Veriler'],['coach','Önceki kuvvet programını incele','Plan'],['settings','Hedefler, yedek ve ayarlar','Veriler']];
 content.innerHTML='<label>Araç ara<input id="design-tools-search" type="search" placeholder="Fotoğraf, sağlık, vardiya, yedek…"></label><div id="design-tools-list" class="design-tools-list"></div>';
 const draw=()=>{const search=SportCatalog.normalize(q('design-tools-search').value);q('design-tools-list').innerHTML=links.filter(([,name,group])=>SportCatalog.normalize(name+' '+group).includes(search)).map(([id,name,group])=>`<button type="button" data-tool="${id}"><span>${esc(group)}</span><strong>${esc(name)}</strong><span aria-hidden="true">↗</span></button>`).join('')||'<p>Bu aramayla eşleşen araç yok.</p>';q('design-tools-list').querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{modal.close();AthleteWorkspace.navigate(b.dataset.tool)})};
 q('design-tools-search').oninput=draw;draw();modal.showModal();
}
function detailNavigation(){
 const map={'detail-body':'Ölçümler ve fotoğraflar','detail-volume':'Hareket hacmi','detail-recovery':'Toparlanma','detail-strength':'Kuvvet ve rekorlar','detail-running':'Koşu','detail-critical':'Hareket incelemesi','detail-rules':'Uygulama rehberi','detail-portal':'Veri görünümü'};
 const duplicate={'detail-dashboard':'workspace-analysis','detail-progression':'workspace-plan','detail-bodymap':'reports','detail-recommendation':'workspace-plan'};
 for(const b of document.querySelectorAll('.analysis-tab')){if(map[b.dataset.detail])b.textContent=map[b.dataset.detail];if(duplicate[b.dataset.detail])b.classList.add('design-duplicate');}
 document.querySelector('[data-detail="detail-body"]')?.click();
 for(const b of document.querySelectorAll('.report-tab')){
  if(['daily-report','weekly-report','monthly-report'].includes(b.dataset.report))b.classList.add('design-duplicate');
  if(b.dataset.report==='adaptive-report')b.textContent='Kişisel eğilimler';
  if(b.dataset.report==='muscle-report')b.textContent='Kaslar ve 3D görünüm';
 }
 document.querySelector('[data-report="muscle-report"]')?.click();
}
function init(){
 document.body.classList.add('design-system');for(const [id,c] of Object.entries(pages))setupPage(id,c);translate();detailNavigation();
 const actions=document.querySelector('.topbar-actions'),button=document.createElement('button');button.id='design-tools-open';button.className='secondary';button.type='button';button.textContent='Araçlar';button.setAttribute('aria-label','Araçlar ve ayarlar');button.onclick=tools;actions?.append(button);
 document.querySelector('.brand h1')?.querySelector('small')?.remove();
 const legacyVersion=document.querySelector('.brand .version-pill');if(legacyVersion)legacyVersion.hidden=true;
 const foodIntro=q('nutritionLibraryBadge')?.closest('.section-head')?.querySelector('p');if(foodIntro)foodIntro.textContent='Besin değerleri seçtiğin porsiyona göre hesaplanır.';
 // Re-rendered legacy headings are translated without moving controls during editing.
 let pending=false;new MutationObserver(mutations=>{if(pending||!mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1)))return;pending=true;requestAnimationFrame(()=>{pending=false;translate();})}).observe(document.querySelector('main.main'),{childList:true,subtree:true});
 window.EngineBus?.subscribe?.('athlete.state.ready',()=>window.dispatchEvent(new Event('resize')),'design-resize');
}
window.AccountDesign={pages:Object.keys(pages),tools};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
