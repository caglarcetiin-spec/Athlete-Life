/* Six destinations, a shared read model, and explicit manual period adoption. */
(()=>{
'use strict';
if(!window.ALOSAccount)return;
const W=window.AthleteWorkspaceCore,K=window.SportsProfileCore,C=window.SportCatalog;
const q=id=>document.getElementById(id),db=()=>window.ALOSRuntime.getDb();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('tr-TR',{maximumFractionDigits:1});
const groups=[
 {id:'today',name:'Bugün',pages:[['workspace-today','Özet'],['simple-home','Bugün']]},
 {id:'training',name:'Antrenman',pages:[['simple-activity','Hareket günlüğü'],['workspace-training','Seanslarım'],['workspace-plan','Dönemlerim'],['week','Takvim ve vardiya'],['training','Hareket ve set kaydı'],['coach','Program incelemesi']]},
 {id:'nutrition',name:'Beslenme',pages:[['nutrition','Günlük beslenme']]},
 {id:'health',name:'Sağlık',pages:[['simple-health','Sağlığım'],['health-overview','Genel bakış'],['health-recovery','Toparlanma geçmişi'],['health-cycle','Regl günlüğü'],['health-profile','Sağlık profilim'],['health-sleep','Uyku'],['health-labs','Kan tahlilleri'],['health-report','Sağlık raporu'],['today','Günlük durum'],['reports','Vücut ve toparlanma']]},
 {id:'growth',name:'Gelişim',pages:[['simple-progress','Gelişimim'],['workspace-analysis','Ortak analiz'],['analytics','Grafikler'],['detailed','Ölçümler'],['records','Kayıt yönetimi']]},
 {id:'profile',name:'Profilim',pages:[['account-profile','Hesabım'],['character','Spor profilim'],['settings','Tercihler ve veriler'],['guide','Görünüm ve rehber']]}
];
let selected='workspace-today',last=null,ready=false;
const mode=()=>window.AccountGuide?.mode(db())||'professional';
const firstPage=g=>mode()==='simple'?({today:'simple-home',training:'simple-activity',health:'simple-health',profile:'account-profile',growth:'simple-progress',nutrition:'nutrition'})[g]:({today:'workspace-today',training:'workspace-training',health:'health-overview',profile:'account-profile',growth:'workspace-analysis',nutrition:'nutrition'})[g];
function refreshNavigation(){
 document.body.dataset.interfaceMode=mode();
 document.querySelectorAll('[data-workspace-group]').forEach(b=>{const g=groups.find(g=>g.id===b.dataset.workspaceGroup);b.hidden=mode()==='simple'&&['nutrition','growth'].includes(g.id);const label=b.querySelector('[data-nav-label]');if(label)label.textContent=mode()==='simple'&&g.id==='training'?'Hareket':g.name});
}

function navigate(page){
 const group=groups.find(g=>g.pages.some(p=>p[0]===page));if(!group)return;
 selected=page;
 document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id===page));
 document.querySelectorAll('[data-workspace-group]').forEach(el=>el.setAttribute('aria-current',el.dataset.workspaceGroup===group.id?'page':'false'));
 refreshNavigation();
 const visible=group.pages.filter(([id])=>!id.startsWith('simple-')&&(id!=='health-cycle'||db().personalHealthProfile?.cycleTracking));
 q('workspace-subnav').innerHTML=mode()==='simple'?(page===firstPage(group.id)?'':`<button type="button" data-destination="${firstPage(group.id)}">← ${group.id==='training'?'Hareket':group.name}</button>`):visible.map(([id,name])=>`<button type="button" data-destination="${id}" ${id===page?'aria-current="page"':''}>${name}</button>`).join('');
 q('workspace-subnav').querySelectorAll('button').forEach(b=>b.onclick=()=>navigate(b.dataset.destination));
 const pageLabel=group.pages.find(p=>p[0]===page)[1];q('pageTitle').textContent=pageLabel===group.name?pageLabel:group.name+' · '+pageLabel;
 if(page==='workspace-plan')renderPlans();
 window.dispatchEvent(new CustomEvent('workspace:navigate',{detail:{page}}));
 window.scrollTo({top:0,behavior:'instant'});
}
function action(name){
 if(name==='profile')return window.AthleteSports.openProfile();
 if(name==='daily')return navigate('today');
 if(name==='record')return navigate('workspace-training');
 if(name==='plan')return navigate('workspace-plan');
 navigate('workspace-analysis');
}
const sourceLabel=s=>s.startsWith('daily:')?'Günlük durum kaydın':s.startsWith('health:')?'Sağlık kaydın':s.startsWith('period:')?'Dönem takvimin':({'athleteProfile':'Spor profilin','session-ledger':'Seans kayıtların','profile+period':'Zaman tercihin ve planın','multisportPeriods':'Dönemlerin','duration×RPE':'Seans süresi ve zorluk'})[s]||'Kişisel kayıtların';
const metric=(value,label)=>`<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
function bind(root){
 root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
 root.querySelectorAll('[data-open-sport]').forEach(b=>b.onclick=()=>window.AthleteSports.openSession(b.dataset.openSport));
 root.querySelectorAll('[data-record-block]').forEach(b=>b.onclick=()=>{const block=last.plan.find(p=>p.id===b.dataset.recordBlock);if(block)window.AthleteSports.openSession(null,block.sportId,block)});
}
function historyHTML(rows){
 return rows.slice().reverse().map(r=>`<article class="workspace-row"><div><strong>${esc(r.sportName)}</strong><span>${esc(r.date)} · ${r.durationMin===null?'Süre eksik':fmt(r.durationMin)+' dk'} · ${r.effort===null?'Zorluk eksik':'Zorluk '+fmt(r.effort)+'/10'}${r.loadAU!==null?' · '+fmt(r.loadAU)+' AU':''}</span>${r.periodId?'<small>Planlanan çalışmayla bağlantılı</small>':''}</div>${r.source==='sport'?`<button type="button" class="secondary" data-open-sport="${esc(r.id.slice(6))}">Düzenle</button>`:'<button type="button" class="secondary" data-action="legacy-record">Hareket kaydı</button>'}</article>`).join('')||'<p class="hint">Henüz kayıt yok. Geçmiş bir günü de kaydedebilirsin.</p>';
}
function refresh(){
 if(!ready||window.ALOSAccount.locked)return last;
 last=W.snapshot(db());const s=last;
 q('workspace-today').innerHTML=`<section class="card workspace-hero"><p class="sports-eyebrow">${esc(s.date)} · SENİN GÜNÜN</p><h3>${esc(window.ALOSAccount.user.name)}, bugün nasıl gidiyor?</h3><p>${s.period?esc(s.period.name)+' · '+(s.plan[0]?.week||Math.floor((Date.parse(s.date)-Date.parse(s.period.startDate))/604800000)+1)+'. hafta':'Kendi ritmine uygun bir dönem oluştur.'}</p><div class="workspace-stats">${metric(s.today.sessions,'Bugünkü seans')}${metric(fmt(s.today.minutes),'Kayıtlı dakika')}${metric(s.context.availableMinutes??'—','Ayırdığın dakika')}</div><div class="sports-actions"><button class="primary" data-action="daily">Günlük durumumu gir</button><button class="secondary" id="workspace-quick-record">Seans kaydet</button></div></section><section class="card"><h3>Bugünkü planın</h3>${s.plan.map(b=>`<article class="workspace-row"><div><strong>${esc(b.sportName)} · ${esc(b.durationMin)} dk${b.healthPaused?' · Sağlık nedeniyle öneri beklemede':b.healthAdjustment?' · Hafifletilmiş öneri':''}</strong><p>${esc(b.prescription||'Çalışma tarifi belirtilmedi')}</p><small>${b.targetRir!==null?'Hedef RIR '+esc(b.targetRir)+' · ':''}${b.restSec!==null?'Dinlenme '+esc(b.restSec)+' sn':''}</small></div><button class="secondary" data-record-block="${esc(b.id)}">Gerçekleşeni kaydet</button></article>`).join('')||'<p class="hint">Bugün için çok branşlı çalışma planlanmamış.</p>'}</section><section class="card"><h3>Gözden geçir</h3>${s.findings.slice(0,3).map(f=>`<article class="workspace-row"><div><strong>${esc(f.title)}</strong><p>${esc(f.detail)}</p></div><button class="secondary" data-action="${f.action}">Aç</button></article>`).join('')||'<p class="hint">Kayıt bütünlüğü açısından ek uyarı yok. Bu, fizyolojik hazır oluş onayı değildir.</p>'}</section>`;
 q('workspace-quick-record').onclick=()=>window.AthleteSports.openSession();bind(q('workspace-today'));
 q('workspace-analysis').innerHTML=`<section class="card"><p class="sports-eyebrow">SON 7 GÜN · ${esc(s.recent.from)} / ${esc(s.date)}</p><h3>Verinin anlattığı</h3><div class="workspace-stats">${metric(s.recent.sessions,'Toplam seans')}${metric(fmt(s.recent.minutes),'Kayıtlı dakika')}${metric(fmt(s.recent.loadAU),'Bilinen yük · AU')}${metric(s.recent.rated+'/'+s.recent.sessions,'Süre ve zorluk bulunan')}</div><p class="hint">${esc(s.notice)}</p><p class="hint">Önceki 7 gün: ${fmt(s.previous.minutes)} dk · ${fmt(s.previous.loadAU)} AU (${s.previous.rated}/${s.previous.sessions} tam kayıt). Eksik kayıtlar karşılaştırmayı sınırlar.</p></section><section class="card"><h3>Yorumlar ve dayanakları</h3>${s.findings.map(f=>`<article class="workspace-finding"><strong>${esc(f.title)}</strong><p>${esc(f.detail)}</p><small>Kural temelli kontrol · kaynak: ${esc(sourceLabel(f.source))}</small><button class="secondary" data-action="${f.action}">İlgili bölümü aç</button></article>`).join('')||'<p>Şu anda ek kontrol önerisi yok.</p>'}</section><section class="card"><h3>Aynı koşullardaki değişim</h3>${s.progress.length?s.progress.map(p=>`<article class="workspace-finding"><strong>${esc(p.sportName)} · ${esc(p.discipline)}</strong><p>${esc(p.conditions)} · ${p.count} kayıt</p><p>${esc(p.firstDate)}: ${fmt(p.firstValue)} → ${esc(p.date)}: ${fmt(p.value)} ${esc(p.unit)}</p><small>İlk ve son kayıt farkı: ${fmt(p.change)} ${esc(p.unit)}. Koşullar kullanıcı beyanıyla eşleşir; bu fark tek başına gelişim kanıtı değildir.</small></article>`).join(''):'<p class="hint">Karşılaştırma için aynı branş, alt disiplin ve koşullarla en az iki ölçümlü seans gir. Tempo karşılaştırmasında mesafe de eşleşmeli.</p>'}</section><section class="card"><h3>Analiz kapsamı</h3><ul><li>Branşlar ve hareket kayıtları aynı seans listesinde okunur. Aynı seansı kimliğiyle eşleştirmek çift sayımı önler.</li><li>Yük: yalnız girilmiş süre × seans zorluğu. Eksik değerler tahminle doldurulmaz.</li><li>Tempo ve başarı oranları ilgili branşa aittir; bütün sporları tek performans puanına çevirmeyiz.</li><li>Kas haritası mevcut hareket modelinin tahminidir. Genel branş kaydından kas hasarı veya iyileşme yüzdesi üretilmez.</li><li>Program ve ilerleme kuralı sana aittir. Yorumlar programı otomatik değiştirmez.</li></ul><a href="https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2017.00612/full" target="_blank" rel="noopener noreferrer">Seans zorluğu ve yük izleme yöntemi</a></section>`;
 window.SportScienceUI?.render(q('workspace-analysis'),s.science);bind(q('workspace-analysis'));
 renderHistory();renderPlans();window.PersonalHealthUI?.refresh();window.AccountGuidance?.refresh();return s;
}
function renderHistory(){
 const el=q('workspace-training'),previousFilter=q('workspace-history-search')?.value||'';
 el.innerHTML='<section class="card"><p class="sports-eyebrow">TEK SEANS GEÇMİŞİ</p><h3>Yaptığını kaydet, gelişimini izle.</h3><div class="sports-actions"><button id="workspace-record" class="primary">Branş seansı kaydet</button><button id="workspace-movements" class="secondary">Hareket ve set kaydı</button><button id="workspace-library" class="secondary">Spor kütüphanesi</button></div><p class="hint">Süre ve zorluk ortak analizde kullanılır. Aynı seansı iki bölümde kaydettiysen, branş kaydında eşleştir.</p><label>Geçmişte ara<input id="workspace-history-search" type="search" placeholder="Branş veya YYYY-AA-GG"></label><div id="workspace-history"></div><button id="workspace-history-more" class="secondary" hidden>Daha fazla göster</button></section>';
 q('workspace-record').onclick=()=>window.AthleteSports.openSession();q('workspace-movements').onclick=()=>navigate('training');q('workspace-library').onclick=()=>window.AthleteSports.openLibrary();
 let limit=30;q('workspace-history-search').value=previousFilter;
 function draw(){const query=C.normalize(q('workspace-history-search').value),rows=W.ledger(db()).rows.filter(r=>C.normalize(r.sportName+' '+r.date).includes(query));q('workspace-history').innerHTML=historyHTML(rows.slice(-limit));q('workspace-history-more').hidden=rows.length<=limit;bind(q('workspace-history'));q('workspace-history').querySelectorAll('[data-action="legacy-record"]').forEach(b=>b.onclick=()=>navigate('records'));}
 q('workspace-history-search').oninput=()=>{limit=30;draw()};q('workspace-history-more').onclick=()=>{limit+=30;draw()};draw();
}
function renderPlans(){
 const el=q('workspace-plan');if(!el)return;
 const periods=db().multisportPeriods||[],today=K.dayKey();
 el.innerHTML=`<section class="card"><p class="sports-eyebrow">SEN OLUŞTUR. SİSTEM İZLESİN.</p><h3>Dönem kütüphanen</h3><p class="hint">Branş, hedef, hareket tarifi, RIR, dinlenme ve ilerleme kuralını kendin belirlersin. Önce inceler, sonra ana plana alırsın. Önceki dönemler ve kayıtlar korunur.</p><button id="workspace-new-period" class="primary">Yeni dönem oluştur</button><p class="hint">Hareket/set motorundaki mevcut kuvvet programına Antrenman → Hareket ve set kaydı üzerinden erişebilirsin. Dönem adımlarındaki set kayıtları aynı hareket ve toparlanma analizine bağlanır.</p></section>${[...periods].reverse().map(p=>{
 const o=W.outcomes(db(),p),state=p.startDate>today?'Yaklaşan':p.endDate<today?'Tamamlanan tarih aralığı':'Aktif';
 return `<section class="card"><div class="sports-card-head"><div><p class="sports-eyebrow">${state}</p><h3>${esc(p.name)}</h3></div><button class="secondary" data-clone-period="${esc(p.id)}">Yeni döneme kopyala</button></div><p>${esc(p.goal)}</p><p class="hint">${esc(p.startDate)} — ${esc(p.endDate)} · ${esc(p.weeks)} hafta</p><div class="workspace-stats">${metric(o.recorded+'/'+o.scheduled,'Bugüne kadar kayıt bağlantısı')}${metric(o.unconfirmed,'Doğrulanmamış çalışma')}${metric(fmt(o.minutes),'Bağlantılı dakika')}</div><details><summary>Haftalık tarif ve ilerleme kuralları</summary>${p.blocks.map(b=>`<article class="workspace-row"><div><strong>${K.days[b.day]} · ${esc(b.sportName)} · ${esc(b.durationMin)} dk</strong><p>${esc(b.prescription)}</p><p class="hint">İlerleme: ${esc(b.progression||'Belirtilmedi')} ${b.targetRir!==null?'· RIR '+esc(b.targetRir):''} ${b.restSec!==null?'· Dinlenme '+esc(b.restSec)+' sn':''}</p><ul>${window.WorkoutProgramUI?.describe(b.steps)||''}</ul>${window.WorkoutProgramUI?.progress(db(),b,p.id)||''}</div></article>`).join('')}</details><p class="hint">Kayıt bulunmayan çalışma, yapılmadı kabul edilmez. Performans değişimi için aynı koşullarda branş ölçümlerini de izle.</p></section>`;
 }).join('')}`;
 q('workspace-new-period').onclick=()=>openPeriod();el.querySelectorAll('[data-clone-period]').forEach(b=>b.onclick=()=>openPeriod(periods.find(p=>p.id===b.dataset.clonePeriod)));
}
function openPeriod(source=null){
 const owner=db(),expected=JSON.stringify(owner.multisportPeriods||[]),periods=owner.multisportPeriods||[],today=K.dayKey();
 const lastEnd=periods.map(p=>p.endDate).sort().at(-1),start=lastEnd&&lastEnd>=today?W.addDays(lastEnd,1):today;
 const draft=source?JSON.parse(JSON.stringify(source)):{name:'',goal:'',weeks:12,blocks:[]};draft.startDate=start;draft.name=source?source.name+' · yeni dönem':'';
 const modal=window.AthleteSports.dialog('workspace-period-editor','Dönem oluştur'),content=modal.querySelector('.sports-content'),message=modal.querySelector('.sports-message');
 let reviewed=false,busy=false;
 const sportOptions=C.all(owner.customSports||[]).sort((a,b)=>Number(owner.athleteProfile?.sports?.some(s=>s.sportId===b.id))-Number(owner.athleteProfile?.sports?.some(s=>s.sportId===a.id))||a.name.localeCompare(b.name,'tr'));
 function collect(){if(reviewed)return;for(const key of ['name','goal','startDate','weeks'])draft[key]=q('period-'+key).value;draft.blocks=[...content.querySelectorAll('[data-block-index]')].map((el,i)=>({...draft.blocks[i],...Object.fromEntries([...el.querySelectorAll('[data-field]')].map(x=>[x.dataset.field,x.value]))}));}
 function draw(){
  message.textContent='';
  content.innerHTML=`<p class="hint">Çalışma tarifine hareket, set × tekrar, yük veya mesafe ekleyebilirsin. RIR, sette kalan tahmini tekrar sayısıdır; her branşa uygulanmaz. İlerleme kuralında ne zaman artırıp azaltacağını yaz.</p><div class="sports-search"><label>Dönem adı<input id="period-name" maxlength="100" value="${esc(draft.name)}"></label><label>Başlangıç · GG.AA.YYYY<input id="period-startDate" type="text" placeholder="GG.AA.YYYY" value="${esc(draft.startDate.split('-').reverse().join('.'))}"></label><label>Hafta sayısı<input id="period-weeks" type="number" min="1" max="52" value="${esc(draft.weeks)}"></label></div><label>Dönem hedefi<textarea id="period-goal" maxlength="1000">${esc(draft.goal)}</textarea></label><div id="period-blocks">${draft.blocks.map((b,i)=>`<fieldset data-block-index="${i}"><legend>Çalışma ${i+1}</legend><div class="sports-search"><label>Gün<select data-field="day">${K.days.map((d,j)=>`<option value="${j}" ${+b.day===j?'selected':''}>${d}</option>`).join('')}</select></label><label>Branş<select data-field="sportId">${sportOptions.map(s=>`<option value="${esc(s.id)}" ${b.sportId===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label><label>Süre · dk<input data-field="durationMin" type="number" min="1" max="480" value="${esc(b.durationMin)}"></label><label>Yöntem<select data-field="methodId"><option value="">Belirtilmedi</option>${C.methods.map(m=>`<option value="${m.id}" ${b.methodId===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select></label><label>Hedef RIR · isteğe bağlı<input data-field="targetRir" type="number" min="0" max="10" value="${esc(b.targetRir)}"></label><label>Set arası dinlenme · sn<input data-field="restSec" type="number" min="0" max="1800" value="${esc(b.restSec)}"></label></div><label>Çalışma tarifi<textarea data-field="prescription" maxlength="2000">${esc(b.prescription)}</textarea></label><label>İlerleme / hafifletme kuralın<textarea data-field="progression" maxlength="2000">${esc(b.progression)}</textarea></label><div class="program-step-summary"><ul>${window.WorkoutProgramUI?.describe(b.steps)||''}</ul><button type="button" class="secondary" data-edit-steps="${i}">Hareket / set / interval ekle</button></div><button class="sports-quiet" data-remove="${i}">Taslak çalışmayı kaldır</button></fieldset>`).join('')}</div><div class="sports-actions"><button id="period-add" class="secondary">Çalışma ekle</button><button id="period-review" class="primary">Planı incele</button></div>`;
  q('period-add').onclick=()=>{collect();draft.blocks.push({day:0,sportId:sportOptions[0].id,durationMin:30,prescription:'',progression:''});draw()};
  content.querySelectorAll('[data-edit-steps]').forEach(b=>b.onclick=()=>{collect();const i=+b.dataset.editSteps;window.WorkoutProgramUI.editor(draft.blocks[i].steps||[],steps=>{draft.blocks[i].steps=steps;draw()})});
  content.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{collect();draft.blocks.splice(+b.dataset.remove,1);draw()});
  q('period-review').onclick=()=>{collect();try{
   const review=W.reviewPeriod(owner,draft);reviewed=true;
   content.innerHTML=`<h3>${esc(review.period.name)}</h3><p>${esc(review.period.startDate)} — ${esc(review.period.endDate)}</p><p>${review.period.blocks.length} çalışma / hafta · ${review.minutes.reduce((a,b)=>a+b,0)} dk</p><ul>${review.notes.map(n=>`<li>${esc(n)}</li>`).join('')||'<li>Süre ve tarif kontrolünde ek uyarı yok.</li>'}</ul><p class="hint">${esc(review.notice)}</p>${window.SportScienceUI?.review(review.science)||''}<div class="sports-actions"><button id="period-back" class="secondary">Düzenlemeye dön</button><button id="period-activate" class="primary">İnceledim, ana plana al</button></div>`;
   q('period-back').onclick=()=>{reviewed=false;draw()};
   q('period-activate').onclick=async()=>{if(busy)return;try{
    if(db()!==owner)throw new Error('Veriler değişti. Dönemi yeniden aç.');
    busy=true;q('period-activate').disabled=true;await window.AthleteSports.persist(W.activate(db(),draft,today,expected));modal.close();navigate('workspace-plan');
   }catch(e){message.textContent=e.message}finally{busy=false;if(q('period-activate'))q('period-activate').disabled=false}};
  }catch(e){message.textContent=e.message}};
 }
 draw();modal.showModal();
}
function init(){
 document.body.classList.add('account-workspace');
 const main=document.querySelector('main.main');if(!main)return;
 for(const id of ['workspace-today','workspace-plan','workspace-training','workspace-analysis']){const section=document.createElement('section');section.id=id;section.className='page';main.append(section)}
 const old=document.querySelector('.sidebar nav');old.classList.add('account-legacy-nav');old.setAttribute('aria-hidden','true');
 const nav=document.createElement('nav');nav.className='workspace-nav';nav.setAttribute('aria-label','Ana gezinme');nav.innerHTML=groups.map(g=>`<button type="button" data-workspace-group="${g.id}"><span data-nav-label>${g.name}</span></button>`).join('');old.after(nav);
 nav.querySelectorAll('button').forEach(b=>b.onclick=()=>navigate(firstPage(b.dataset.workspaceGroup)));
 const sub=document.createElement('nav');sub.id='workspace-subnav';sub.setAttribute('aria-label','Bölüm içeriği');document.querySelector('.topbar').after(sub);
 window.goToPage=navigate;
 old.querySelectorAll('button[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
 const skip=document.createElement('a');skip.className='workspace-skip';skip.href='#pageTitle';skip.textContent='İçeriğe geç';document.body.prepend(skip);q('pageTitle').tabIndex=-1;
 const note=document.querySelector('.sidebar-note');if(note)note.innerHTML='<strong>Her branş, kendi ölçümüyle.</strong><span>Planın senin kararın. Kayıtların birlikte okunur.</span>';
 ready=true;refresh();navigate('workspace-today');
 window.EngineBus?.subscribe?.('athlete.state.ready',refresh,'workspace-view');
 window.EngineBus?.subscribe?.('sports.context.changed',refresh,'workspace-sports');
}
window.AthleteWorkspace={refresh,snapshot:()=>last||W.snapshot(db()),navigate,openPeriod,refreshNavigation,current:()=>selected,home:()=>navigate(firstPage('today'))};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
