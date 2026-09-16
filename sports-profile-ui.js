/* Account-edition profile, catalogue and activity ledger. No automatic plan adoption. */
(()=>{
'use strict';
const C=window.SportCatalog,K=window.SportsProfileCore;
if(!window.ALOSAccount||!C||!K)return;
const q=id=>document.getElementById(id),db=()=>window.ALOSRuntime.getDb();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>JSON.parse(JSON.stringify(value));
const options=(items,selected)=>Object.entries(items).map(([id,label])=>`<option value="${esc(id)}" ${id===selected?'selected':''}>${esc(label)}</option>`).join('');
const fmtDate=date=>esc(String(date).split('-').reverse().join('.'));
const decimal=n=>Number(n).toLocaleString('tr-TR',{maximumFractionDigits:2});
function dialog(id,title){
 q(id)?.remove();const el=document.createElement('dialog');el.id=id;el.className='sports-dialog';el.setAttribute('aria-labelledby',id+'-title');
 el.innerHTML=`<header><div><p class="sports-eyebrow">ATHLETE LIFE · PROFİLİM</p><h2 id="${id}-title">${esc(title)}</h2></div><button class="sports-quiet" type="button" data-close aria-label="Kapat">Kapat</button></header><div class="sports-content"></div><p class="sports-message" role="status" aria-live="polite"></p>`;
 el.querySelector('[data-close]').onclick=()=>el.close();document.body.append(el);return el;
}
async function persist(patch){
 if(window.ALOSAccount.locked)throw new Error('Oturumun değişti. Yeniden giriş yap.');
 const d=db(),before=Object.fromEntries(Object.keys(patch).map(key=>[key,d[key]]));
 Object.assign(d,patch);
 try{if(window.ALOSRuntime.save()===false)throw new Error('Kaydetme reddedildi');}
 catch(error){for(const key of Object.keys(patch)){if(before[key]===undefined)delete d[key];else d[key]=before[key]}throw new Error('Kayıt tamamlanamadı. Önceki kayıt korundu; yeniden deneyebilirsin.');}
 render();window.AthleteWorkspace?.refresh?.();window.AthleteCoordinator?.schedule?.('sports_changed');
 try{window.EngineBus?.publish?.('sports.context.changed',K.context(d));}catch(_){}
 const synced=await window.ALOSServerSync.flush();
 return synced?'Hesabına kaydedildi.':'Bu cihazda kaydedildi; sunucuyla eşitleme bekliyor.';
}
function selectedChecks(catalog,selected,group){return Object.entries(catalog).map(([id,label])=>`<label class="sports-check"><input type="checkbox" name="${group}" value="${id}" ${selected.includes(id)?'checked':''}><span>${esc(label)}</span></label>`).join('');}
function openProfile(addSport=null){
 const owner=db(),expected=JSON.stringify(owner.athleteProfile),expectedCustom=JSON.stringify(owner.customSports);
 const existing=owner.athleteProfile;
 const draft=clone(existing||{sports:[],goals:[],equipment:[],methods:[],availability:[0,0,0,0,0,0,0]});
 const custom=clone(owner.customSports||[]);
 if(addSport&&!draft.sports.some(s=>s.sportId===addSport))draft.sports.push({sportId:addSport,experience:'new'});
 const modal=dialog('sports-setup',existing?'Spor profilini düzenle':'Spor profilini oluşturalım');
 const content=modal.querySelector('.sports-content'),message=modal.querySelector('.sports-message');
 let step=0,saving=false;
 function setMessage(text){message.textContent=text;}
 function draw(){
  setMessage('');
  const titles=['Branşların','Hedefin ve deneyimin','Zamanın ve ekipmanın','Son bir bakış'];
  let body=`<ol class="sports-steps">${titles.map((t,i)=>`<li ${i===step?'aria-current="step"':''}>${i+1}. ${t}</li>`).join('')}</ol>`;
  if(step===0){
   body+='<h3>Yaptığın veya başlamak istediğin sporları seç.</h3><p class="sports-muted">Birden fazla branş seçebilirsin. Sonradan değiştirdiğinde geçmiş kayıtların korunur.</p><div class="sports-search"><label>Branş ara<input id="setup-search" type="search" placeholder="Yüzme, futbol, tırmanış…"></label><label>Spor ailesi<select id="setup-family"><option value="">Tüm aileler</option>'+options(C.families,'')+'</select></label></div><p id="setup-count" class="sports-muted" role="status"></p><div id="setup-sport-list" class="sports-choices"></div><button class="sports-quiet" id="setup-more" type="button">Daha fazla göster</button><details class="sports-custom"><summary>Branşımı bulamadım</summary><p class="sports-muted">Kendi branşını ekle. Seçtiğin kayıt biçimi girebileceğin ölçümleri belirler.</p><div class="sports-search"><label>Branş adı<input id="custom-name" maxlength="70" placeholder="Örneğin: kendi spor varyasyonun"></label><label>Aile<select id="custom-family">'+options(C.families,'traditional')+'</select></label><label>Kayıt biçimi<select id="custom-schema">'+options(Object.fromEntries(Object.entries(C.schemas).map(([id,s])=>[id,s.name])),'general')+'</select></label></div><button id="custom-add" class="sports-quiet" type="button">Branşı ekle ve seç</button></details>';
  }else if(step===1){
   body+='<h3>Deneyimin her branşta farklı olabilir.</h3><div class="sports-experience">'+draft.sports.map(s=>`<label>${esc(C.find(s.sportId,custom)?.name||s.sportId)}<select data-experience="${esc(s.sportId)}">${options(C.experience,s.experience)}</select></label>`).join('')+'</div><h3>Şu anda neyi önemsiyorsun?</h3><div class="sports-check-grid">'+selectedChecks(C.goals,draft.goals,'goal')+'</div><details><summary>Çalışma yöntemlerim · isteğe bağlı</summary><p class="sports-muted">Bunlar tercihlerin; seçmek otomatik bir program başlatmaz.</p><div class="sports-check-grid">'+selectedChecks(Object.fromEntries(C.methods.map(m=>[m.id,m.name])),draft.methods,'method')+'</div></details>';
  }else if(step===2){
   body+='<h3>Bir haftada kendine ne kadar zaman ayırabilirsin?</h3><p class="sports-muted">Dinlenmek veya başka işlere ayırmak istediğin günleri 0 bırak. Bu süreler vardiya kaydını değiştirmez.</p><div class="sports-week">'+K.days.map((day,i)=>`<label>${day}<span><input data-day="${i}" aria-label="${day} için dakika" type="number" min="0" max="480" step="5" value="${esc(draft.availability[i])}"> dk</span></label>`).join('')+'</div><h3>Erişebildiğin ekipman ve alanlar</h3><div class="sports-check-grid">'+selectedChecks(C.equipment,draft.equipment,'equipment')+'</div>';
  }else{
   const total=draft.availability.reduce((a,b)=>a+b,0);
   body+=`<h3>Profilin sana ait.</h3><div class="sports-review"><p><strong>Branşlar</strong>${draft.sports.map(s=>`${esc(C.find(s.sportId,custom)?.name)} · ${esc(C.experience[s.experience])}`).join('<br>')}</p><p><strong>Hedefler</strong>${draft.goals.map(id=>esc(C.goals[id])).join(' · ')}</p><p><strong>Haftalık zaman</strong>${draft.availability.filter(Boolean).length} gün · ${decimal(total)} dakika</p><p><strong>Ekipman</strong>${draft.equipment.map(id=>esc(C.equipment[id])).join(' · ')||'Henüz belirtilmedi'}</p></div><p class="sports-muted">Profilin kaydedilir. Programını Plan → Dönemlerim bölümünde kendin oluşturup ana plana alırsın.</p>`;
  }
  body+=`<footer class="sports-actions"><button id="setup-back" class="sports-quiet" type="button">${step?'Geri':'Daha sonra'}</button><button id="setup-next" class="sports-primary" type="button">${step===3?'Profili kaydet':'Devam et'}</button></footer>`;
  content.innerHTML=body;
  q('setup-back').onclick=()=>{if(saving)return;if(step){step--;draw()}else modal.close()};
  q('setup-next').onclick=async()=>{
   if(saving)return;
   if(step===0&&!draft.sports.length)return setMessage('En az bir branş seç.');
   if(step===1&&!draft.goals.length)return setMessage('En az bir hedef seç.');
   if(step===2){const errors=K.validateProfile(draft,custom);if(errors.length)return setMessage(errors.join(' '));}
   if(step<3){step++;draw();content.querySelector('h3')?.scrollIntoView({block:'nearest'});return;}
   if(db()!==owner||JSON.stringify(db().athleteProfile)!==expected||JSON.stringify(db().customSports)!==expectedCustom)return setMessage('Profil başka bir işlemde değişti. Kapatıp güncel profili yeniden aç.');
   try{
    saving=true;q('setup-next').disabled=true;
    const result=await persist(K.applyProfile(db(),draft,custom));modal.close();
    window.goToPage?.('character');q('sports-profile-status').textContent=result;
   }catch(error){setMessage(error.message)}finally{saving=false;if(q('setup-next'))q('setup-next').disabled=false}
  };
  content.querySelectorAll('[data-experience]').forEach(el=>el.onchange=()=>{draft.sports.find(s=>s.sportId===el.dataset.experience).experience=el.value});
  for(const [name,field] of [['goal','goals'],['method','methods'],['equipment','equipment']])content.querySelectorAll(`input[name="${name}"]`).forEach(el=>el.onchange=()=>{draft[field]=[...content.querySelectorAll(`input[name="${name}"]:checked`)].map(x=>x.value)});
  content.querySelectorAll('[data-day]').forEach(el=>el.oninput=()=>{draft.availability[+el.dataset.day]=el.value===''?0:Number(el.value)});
  if(step===0){
   let limit=30;
   const renderChoices=()=>{
    const matches=C.search(q('setup-search').value,q('setup-family').value,custom);
    q('setup-count').textContent=`${draft.sports.length} branş seçili · ${matches.length} sonuç`;
    const selectedIds=new Set(draft.sports.map(s=>s.sportId));
    const sorted=[...matches].sort((a,b)=>Number(selectedIds.has(b.id))-Number(selectedIds.has(a.id)));
    q('setup-sport-list').innerHTML=sorted.slice(0,limit).map(s=>`<button type="button" class="sports-choice" data-sport="${esc(s.id)}" aria-pressed="${selectedIds.has(s.id)}"><strong>${esc(s.name)}</strong><small>${esc(C.families[s.family])}</small></button>`).join('')||'<p>Sonuç yok. Aşağıdan kişisel branş ekleyebilirsin.</p>';
    q('setup-more').hidden=matches.length<=limit;
    q('setup-sport-list').querySelectorAll('[data-sport]').forEach(button=>button.onclick=()=>{
     const id=button.dataset.sport;
     if(draft.sports.some(s=>s.sportId===id))draft.sports=draft.sports.filter(s=>s.sportId!==id);
     else draft.sports.push({sportId:id,experience:'new'});
     renderChoices();[...q('setup-sport-list').querySelectorAll('[data-sport]')].find(el=>el.dataset.sport===id)?.focus();
    });
   };
   q('setup-search').oninput=q('setup-family').onchange=()=>{limit=30;renderChoices()};
   q('setup-more').onclick=()=>{limit+=30;renderChoices()};
   q('custom-add').onclick=()=>{try{
    const sport=K.customSport(q('custom-name').value,q('custom-family').value,q('custom-schema').value,custom);
    custom.push(sport);draft.sports.push({sportId:sport.id,experience:'new'});
    q('setup-search').value='';q('setup-family').value='';q('custom-name').value='';renderChoices();setMessage('Kişisel branş taslağa eklendi. Son adımda profilinle birlikte kaydedilir.');
   }catch(error){setMessage(error.message)}};
   renderChoices();
  }
 }
 draw();modal.showModal();
}
function openLibrary(){
 const modal=dialog('sports-library','Spor ve yöntem kütüphanesi'),content=modal.querySelector('.sports-content');
 content.innerHTML=`<p class="sports-muted">${C.sports.length} başlangıç tanımı · kişisel branşlarla genişletilebilir. ${esc(C.support)}</p><div class="sports-search"><label>Branş ara<input id="library-search" type="search" placeholder="Branş veya bilinen adı"></label><label>Aile<select id="library-family"><option value="">Tüm aileler</option>${options(C.families,'')}</select></label></div><p id="library-count" class="sports-muted" role="status"></p><div class="sports-library-layout"><div><div id="library-list" class="sports-library-list"></div><button id="library-more" class="sports-quiet" type="button">Daha fazla göster</button></div><aside id="library-detail" aria-live="polite"><p>Bir branş seçerek kayıt alanlarını incele.</p></aside></div><details class="sports-methods"><summary>${C.methods.length} çalışma yöntemini incele</summary>${C.methods.map(m=>`<article><h4>${esc(m.name)}</h4><p>${esc(m.description)}</p></article>`).join('')}</details><details><summary>Kapsam ve kaynaklar</summary><p>Bu katalog bir başlangıç sınıflandırmasıdır; dünyadaki tüm branş ve varyasyonları eksiksiz kapsadığı iddia edilmez. Dizinler branş kapsamı için kullanıldı; kayıt alanları uygulamanın tasarımıdır.</p>${C.sources.map(s=>`<p><a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></p>`).join('')}</details>`;
 let limit=25;
 function details(id){
  const s=C.find(id,db().customSports||[]);if(!s)return;
  q('library-detail').innerHTML=`<p class="sports-eyebrow">${esc(C.families[s.family])}</p><h3>${esc(s.name)}</h3><p class="sports-badge">Kayıt · branş özeti · manuel plan takibi</p><h4>Kayıt alanları</h4><ul><li>Tarih ve seans süresi</li><li>Hissedilen zorluk (isteğe bağlı)</li><li>Yöntem, alt disiplin ve karşılaştırma koşulları</li>${(window.SportScience?.definition(s)?.fields||C.schemas[s.schema].fields).map(([,label,unit])=>`<li>${esc(label)} · ${unit}</li>`).join('')}</ul><p class="sports-muted">Süre ve zorluk ortak yük özetinde kullanılır; mesafe ve başarı aynı branş içinde özetlenir. Kas yükü, kalori ve branş normları bu genel kayıttan çıkarılmaz. Programı sen oluşturursun.</p><div class="sports-actions"><button id="library-add" class="sports-quiet" type="button">Branşlarıma ekle</button><button id="library-record" class="sports-primary" type="button">Seans kaydet</button></div>`;
  const model=window.SportScience?.definition(s);
  if(model){const detail=document.createElement('section');detail.className='science-library-model';detail.innerHTML=`<h4>${esc(model.name)}</h4><p>${esc(model.focus)}</p><p><strong>Koşulları eşleştir:</strong> ${esc(model.conditions)}</p><p><strong>Çalışma yöntemleri:</strong> ${model.methods.map(id=>esc(C.methods.find(m=>m.id===id)?.name||id)).join(' · ')}</p>${model.adapted?'<p class="hint">Uyarlanmış ekipman ve kişisel ölçüm protokolünü belirt. Engel sınıfı veya standart fizyolojik norm varsayılmaz.</p>':''}<details><summary>Dayanak ve hesap kapsamı</summary><p>${esc(model.scope)}</p>${model.sources.map(id=>{const r=SportScience.sources[id];return `<p><a href="${r.url}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a><br>${esc(r.scope)}</p>`}).join('')}</details>`;q('library-detail').append(detail);}
  q('library-add').onclick=()=>{modal.close();openProfile(id)};q('library-record').onclick=()=>{modal.close();openSession(null,id)};
 }
 function results(){
  const rows=C.search(q('library-search').value,q('library-family').value,db().customSports||[]);
  q('library-count').textContent=`${rows.length} sonuç`;
  q('library-list').innerHTML=rows.slice(0,limit).map(s=>`<button type="button" class="sports-choice" data-id="${esc(s.id)}"><strong>${esc(s.name)}</strong><small>${esc(C.families[s.family])}</small></button>`).join('')||'<p>Branş bulunamadı. Profilini düzenleyerek kişisel branş ekleyebilirsin.</p>';
  q('library-list').querySelectorAll('[data-id]').forEach(button=>button.onclick=()=>details(button.dataset.id));q('library-more').hidden=rows.length<=limit;
 }
 q('library-search').oninput=q('library-family').onchange=()=>{limit=25;results()};q('library-more').onclick=()=>{limit+=25;results()};
 results();modal.showModal();
}
function openSession(id=null,sportId=null,plan=null){
 const owner=db(),previous=id?(owner.sportSessions||[]).find(r=>r.id===id):null;
 if(id&&!previous)return;
 const expected=previous?JSON.stringify(previous):null;
 const sports=C.all(owner.customSports||[]),fav=new Set((owner.athleteProfile?.sports||[]).map(s=>s.sportId));
 sports.sort((a,b)=>Number(fav.has(b.id))-Number(fav.has(a.id))||a.name.localeCompare(b.name,'tr'));
 const initial=previous?clone(previous):{sportId:sportId||sports[0].id,date:plan?.date||K.dayKey(),durationMin:'',effort:'',metrics:{},notes:'',methodId:plan?.methodId||'',periodId:plan?.periodId||null,planBlockId:plan?.id||null};
 initial.durationMin=esc(initial.durationMin);initial.effort=esc(initial.effort??'');
 const modal=dialog('sports-session',previous?'Branş seansını düzenle':'Branş seansı kaydet'),content=modal.querySelector('.sports-content'),message=modal.querySelector('.sports-message');
 content.innerHTML=`<form id="sport-session-form"><div class="sports-search"><label>Branş<select id="session-sport">${sports.map(s=>`<option value="${esc(s.id)}" ${s.id===initial.sportId?'selected':''}>${esc(s.name)}${fav.has(s.id)?' · Branşım':''}</option>`).join('')}</select></label><label>Tarih<input id="session-date" type="text" inputmode="numeric" placeholder="GG.AA.YYYY" required value="${fmtDate(initial.date)}" aria-describedby="session-date-help"></label></div><p id="session-date-help" class="sports-muted">Örnek: 10.09.2026. Geçmişe ait seans girebilirsin.</p><div class="sports-search"><label>Toplam seans süresi · dk<input id="session-minutes" type="number" min="0.1" max="1440" step="0.1" required value="${initial.durationMin}"></label><label>Hissedilen zorluk · 0–10<input id="session-effort" type="number" min="0" max="10" step="0.1" value="${initial.effort??''}" placeholder="İsteğe bağlı"></label></div><label>Çalışma yöntemi<select id="session-method"><option value="">Belirtmek istemiyorum</option>${C.methods.map(m=>`<option value="${m.id}" ${m.id===initial.methodId?'selected':''}>${esc(m.name)}</option>`).join('')}</select></label><div class="sports-search"><label>Alt disiplin / stil · isteğe bağlı<input id="session-discipline" maxlength="100" value="${esc(initial.discipline||'')}" placeholder="Ör. serbest yüzme, sprint, boulder"></label><label>Karşılaştırma koşulları<input id="session-conditions" maxlength="300" value="${esc(initial.conditions||'')}" placeholder="Parkur, zemin, ekipman, havuz, rakip…"></label></div><div id="session-metrics" class="sports-search"></div><div id="session-links"></div><label>Seans notu<textarea id="session-notes" rows="3" maxlength="2000" placeholder="Koşullar, teknik gözlemler, kullanılan ekipman…">${esc(initial.notes)}</textarea></label><p class="sports-muted">Bu seans ortak süre ve yük özetine eklenir. Süre × zorluk hesabı kas hasarı veya kalori ölçümü değildir. Aynı seansı hareket kaydında da tuttuysan aşağıdan eşleştir.</p><footer class="sports-actions"><button class="sports-quiet" id="session-cancel" type="button">İptal</button><button class="sports-primary" id="session-save" type="submit">${previous?'Kaydı güncelle':'Seansı kaydet'}</button></footer></form>`;
 const metricDrafts={};
 function drawMetrics(values={}){
  const sport=C.find(q('session-sport').value,owner.customSports||[]);
  const model=window.SportScience?.definition(sport),base=C.schemas[sport.schema].fields;
  const field=([key,label,unit,min,max,integer])=>`<label>${esc(label)} · ${esc(unit)}<input data-metric="${key}" type="number" min="${min}" max="${max}" step="${integer?1:'any'}" value="${esc(values[key]??'')}" placeholder="İsteğe bağlı"></label>`;
  const extra=(model?.fields||[]).filter(f=>!base.some(b=>b[0]===f[0]));
  q('session-metrics').innerHTML=base.map(field).join('')+(model?`<details class="science-metrics" ${extra.some(f=>values[f[0]]!=null)?'open':''}><summary>${esc(model.name)} · ayrıntılı ölçümler</summary><p class="hint">${esc(model.focus)}</p><p class="hint">Karşılaştırma bağlamı: ${esc(model.conditions)}</p><div class="sports-search">${extra.map(field).join('')}</div>${model.optionalTests.length?`<details><summary>Kaydettiğim 200/400 m test sonuçları</summary><p class="hint">Yalnız aynı stil ve havuzdaki mevcut test sonuçlarını gir. Hesap kritik tempo tahminidir; test yapma veya güvenli yüzme önerisi değildir.</p><div class="sports-search">${model.optionalTests.map(field).join('')}</div></details>`:''}</details>`:'');
 }
 function drawLinks(){
  const W=window.AthleteWorkspaceCore;if(!W)return;
  const date=K.parseDate(q('session-date').value),links=W.linkOptions(owner,date,id),plans=date?W.planned(owner,date).filter(b=>b.sportId===q('session-sport').value):[];
  q('session-links').innerHTML=`<label>Aynı seansın hareket kaydı · isteğe bağlı<select id="session-link"><option value="">Ayrı bir seans</option>${links.map(r=>`<option value="${esc(r.id)}" ${r.id===initial.linkedSessionId?'selected':''}>${esc(r.sportName)} · ${esc(r.date)}</option>`).join('')}</select></label><label>Planlanan çalışma · isteğe bağlı<select id="session-plan"><option value="">Plan dışı kayıt</option>${plans.map(b=>`<option value="${esc(b.id)}" data-period="${esc(b.periodId)}" ${b.id===initial.planBlockId?'selected':''}>${esc(b.periodName)} · ${esc(b.sportName)} · ${b.durationMin} dk</option>`).join('')}</select></label>`;
 }
 q('session-date').onchange=drawLinks;
 let currentSport=initial.sportId;
 q('session-sport').onchange=()=>{
  metricDrafts[currentSport]=Object.fromEntries([...content.querySelectorAll('[data-metric]')].map(el=>[el.dataset.metric,el.value]));
  currentSport=q('session-sport').value;drawMetrics(metricDrafts[currentSport]||{});drawLinks();
 };
 drawMetrics(initial.metrics);drawLinks();q('session-cancel').onclick=()=>modal.close();
 const execution=window.WorkoutProgramUI?.attachSession({modal,initial,owner,previous});
 let saving=false;
 q('sport-session-form').onsubmit=async event=>{
  event.preventDefault();if(saving)return;message.textContent='';
  if(db()!==owner){message.textContent='Veriler başka bir işlemde değişti. Formu yeniden aç.';return;}
  try{
   const input={sportId:q('session-sport').value,date:q('session-date').value,durationMin:q('session-minutes').value,
    effort:q('session-effort').value,discipline:q('session-discipline').value,conditions:q('session-conditions').value,methodId:q('session-method').value,notes:q('session-notes').value,
    metrics:Object.fromEntries([...content.querySelectorAll('[data-metric]')].map(el=>[el.dataset.metric,el.value]))};
   input.linkedSessionId=q('session-link')?.value||null;input.planBlockId=q('session-plan')?.value||null;input.periodId=q('session-plan')?.selectedOptions?.[0]?.dataset.period||null;
   if(execution)input.workout=execution.read();
   const patch=K.applySession(db(),input,{id,expected});saving=true;q('session-save').disabled=true;
   const result=await persist(patch);modal.close();q('sports-profile-status').textContent=result;
  }catch(error){message.textContent=error.message}finally{saving=false;if(q('session-save'))q('session-save').disabled=false}
 };
 modal.showModal();
}
function render(){
 const el=q('sports-profile-card');if(!el||window.ALOSAccount.locked)return;
 const d=db(),profile=d.athleteProfile,custom=d.customSports||[],context=K.context(d),summary=K.summary(d);
 const recent=[...(d.sportSessions||[])].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)).slice(0,12);
 el.innerHTML=`<div class="sports-card-head"><div><p class="sports-eyebrow">KİŞİSEL SPOR PROFİLİN</p><h3>${profile?'Branşların, hedeflerin, zamanın.':'Önce seni tanıyalım.'}</h3></div><button id="sports-edit-profile" class="secondary" type="button">${profile?'Profili düzenle':'Profilimi oluştur'}</button></div><p class="hint">${profile?profile.sports.map(s=>esc(C.find(s.sportId,custom)?.name||s.sportId)).join(' · '):'Hedeflerini ve branşlarını birkaç adımda belirle.'}</p><div class="sports-stat-grid"><div><strong>${summary.sessions}</strong><span>Branş seansı</span></div><div><strong>${decimal(summary.minutes)}</strong><span>Kayıtlı dakika</span></div><div><strong>${profile?decimal(profile.availability.reduce((a,b)=>a+b,0)):'—'}</strong><span>Haftalık ayrılan dakika</span></div></div><div class="sports-actions"><button id="sports-open-library" class="secondary" type="button">Spor kütüphanesi</button><button id="sports-add-session" class="primary" type="button">Branş seansı kaydet</button></div><p id="sports-profile-status" class="hint" role="status"></p><details><summary>Profil ve program uyumu</summary><p class="hint">Bugün ayırdığın süre: ${esc(context.availableMinutes??'belirtilmedi')}${context.availableMinutes!==null?' dk':''}. Bu karşılaştırma programını değiştirmez.</p><ul>${context.notes.map(note=>`<li>${esc(note)}</li>`).join('')}</ul><p class="hint">Branş kayıtları süre, mesafe ve girilen sonuçlarla özetlenir. Farklı branşlar tek bir performans puanına dönüştürülmez.</p></details><details ${recent.length?'open':''}><summary>Branş geçmişim · ${summary.sessions} seans</summary>${summary.bySport.map(s=>`<p class="hint"><strong>${esc(s.name)}</strong> · ${s.sessions} seans · ${decimal(s.minutes)} dk${s.distanceEntries?' · '+decimal(s.distanceM/1000)+' km ('+s.distanceEntries+' mesafe kaydı)':''}</p>`).join('')}<div class="sports-history">${recent.map(r=>`<article><div><strong>${esc(r.sportName)}</strong><span>${fmtDate(r.date)} · ${decimal(r.durationMin)} dk${r.effort!==null?' · Zorluk '+decimal(r.effort)+'/10':''}</span>${K.sessionDetails(r).map(v=>`<small>${v.label}: ${decimal(v.value)} ${v.unit}</small>`).join('')}${r.notes?'<small>'+esc(r.notes)+'</small>':''}</div><button class="secondary" type="button" data-edit-session="${esc(r.id)}">Düzenle</button></article>`).join('')||'<p class="hint">Henüz branş seansı yok.</p>'}</div>${summary.sessions>12?'<p class="hint">Son 12 seans gösteriliyor; özet bütün branş kayıtlarını içerir.</p>':''}</details>`;
 q('sports-edit-profile').onclick=()=>openProfile();q('sports-open-library').onclick=openLibrary;q('sports-add-session').onclick=()=>openSession();
 el.querySelectorAll('[data-edit-session]').forEach(button=>button.onclick=()=>openSession(button.dataset.editSession));
}
function init(){
 const target=q('character');if(!target)return;
 const card=document.createElement('section');card.id='sports-profile-card';card.className='card';target.prepend(card);render();
 window.EngineBus?.register?.('AthleteSports',{version:'1',inputs:['athleteProfile','sportSessions','trainingPeriods'],outputs:['sports.context.changed']});
 window.EngineBus?.subscribe?.('athlete.state.ready',render,'sports-profile-view');
 // AccountGuidance provides a shorter, optional welcome flow.
}
window.AthleteSports={persist,dialog,openProfile,openLibrary,openSession,render,context:date=>K.context(db(),date),summary:options=>K.summary(db(),options)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
