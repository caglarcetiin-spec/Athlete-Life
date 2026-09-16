/* Add punctuation-free pickers without changing existing field ids, units or save handlers. */
(()=>{
'use strict';if(!window.ALOSAccount)return;
const E=EntryFields,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labelOf=input=>[...(input.labels?.[0]?.childNodes||[])].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim()||input.getAttribute('aria-label')||input.placeholder||input.name||input.id;
function kind(input){
 if(input.closest('#entry-picker')||input.type==='hidden'||input.type==='search')return null;
 const text=labelOf(input),key=(input.id+' '+input.name+' '+input.placeholder+' '+text);
 if(['date','datetime-local'].includes(input.type))return input.type;
 if(input.type==='time')return 'time';
 if(['text',''].includes(input.type)&&(/GG.AA.YYYY/.test(key)||/^(?:birthDate|startDate|endDate|recoveryDate|assessmentDate|date)$/.test(input.name)||/manualTrainingDate|period-startDate|session-date/.test(input.id)))return 'date';
 if(input.type==='number'){
  if(/(?:\/\s*(?:dk|sn|saat)\b|\b(?:dk|sn)\s*\/)/i.test(text))return null;
  if(/\b(?:sn|saniye|seconds?)\b/i.test(text)||/^(?:seconds|restSec)$/.test(input.name||input.dataset.field||input.dataset.actual||''))return 'seconds';
  if(/\b(?:dk|dakika|minutes?)\b/i.test(text)||/^(?:durationMin|nightAwake)$/.test(input.name||input.dataset.field||''))return 'minutes';
  if(/\b(?:saat|hours?)\b/i.test(text))return 'hours';
 }
 return null;
}
const countOptions=(max,selected)=>Array.from({length:max+1},(_,n)=>`<option value="${n}" ${n===+selected?'selected':''}>${String(n).padStart(2,'0')}</option>`).join('');
function choose(input,type){
 if(input.disabled||input.readOnly)return;
 const title=labelOf(input),modal=AthleteSports.dialog('entry-picker',type==='date'||type==='datetime-local'?'Tarih seç':type==='time'?'Saat seç':'Süre seç'),content=modal.querySelector('.sports-content'),message=modal.querySelector('.sports-message');
 modal.querySelector('.sports-eyebrow').textContent=title;
 const today=SportsProfileCore.dayKey(),iso=E.date(input.value.split('T')[0])||today,clock=E.time(input.type==='datetime-local'?input.value.split('T')[1]:input.value)||'00:00';
 const isDate=['date','datetime-local'].includes(type),isTime=['time','datetime-local'].includes(type),isDuration=!isDate&&!isTime;
 let fields='';
 if(isDate){const [year,month,day]=iso.split('-').map(Number),thisYear=new Date().getFullYear();fields+=`<label>Takvim<input id="entry-native-date" type="date" value="${iso}" ${input.min?'min="'+esc(input.min.split('T')[0])+'"':''} ${input.max?'max="'+esc(input.max.split('T')[0])+'"':''}></label><p class="hint">Takvimden veya gün, ay ve yıl listelerinden seç.</p><div class="entry-columns"><label>Gün<select name="day">${countOptions(31,day).replace(/<option value="0"[^<]*<\/option>/,'')}</select></label><label>Ay<select name="month">${['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'].map((n,i)=>`<option value="${i+1}" ${i+1===month?'selected':''}>${n}</option>`).join('')}</select></label><label>Yıl<select name="year">${Array.from({length:Math.max(thisYear+11,year+1)-1900},(_,i)=>1900+i).reverse().map(y=>`<option ${y===year?'selected':''}>${y}</option>`).join('')}</select></label></div>`}
 if(isTime){const [h,m,s]=clock.split(':');fields+=`<div class="entry-columns"><label>Saat<select name="hour">${countOptions(23,h)}</select></label><label>Dakika<select name="minute">${countOptions(59,m)}</select></label>${input.step&&+input.step<60?`<label>Saniye<select name="second">${countOptions(59,s||0)}</select></label>`:''}</div>`}
 if(isDuration){const p=E.splitDuration(input.value,type),factor={seconds:1,minutes:60,hours:3600}[type],limit=input.max?Math.ceil(+input.max*factor/3600):48,maxHours=Math.min(1000,Math.max(limit,p.hours)),allowSeconds=type==='seconds'||input.step==='any'||input.step&&+input.step*factor<60;fields+=`<p class="hint">Süreyi seç; uygulama bu alanın ${type==='seconds'?'saniye':type==='hours'?'saat':'dakika'} birimine dönüştürür.</p><div class="entry-columns"><label>Saat<select name="hours">${countOptions(maxHours,p.hours)}</select></label><label>Dakika<select name="minutes">${countOptions(59,p.minutes)}</select></label>${allowSeconds?`<label>Saniye<select name="seconds">${countOptions(59,p.seconds)}${p.seconds%1?`<option selected value="${p.seconds}">${p.seconds}</option>`:''}</select></label>`:''}</div>`}
 content.innerHTML=`<form id="entry-picker-form" class="wellness-form">${fields}<p id="entry-preview" role="status"></p><button type="submit" class="primary">Seçimi kullan</button></form>`;
 const form=content.querySelector('form'),preview=content.querySelector('#entry-preview');
 function value(){let v;if(isDate){v=E.date(form.elements.year.value+'-'+form.elements.month.value+'-'+form.elements.day.value);if(!v)throw Error('Bu ayda seçtiğin gün yok. Günü kontrol et.');if(type==='datetime-local')v+='T'+form.elements.hour.value.padStart(2,'0')+':'+form.elements.minute.value.padStart(2,'0')}
 else if(isTime)v=form.elements.hour.value.padStart(2,'0')+':'+form.elements.minute.value.padStart(2,'0')+(form.elements.second?':'+form.elements.second.value.padStart(2,'0'):'');
 else v=String(E.duration(form.elements.hours.value,form.elements.minutes.value,form.elements.seconds?.value||0,type));
 if(input.min&&(isDuration?+v<+input.min:v<input.min))throw Error('Seçim bu alanın alt sınırından küçük.');if(input.max&&(isDuration?+v>+input.max:v>input.max))throw Error('Seçim bu alanın üst sınırını aşıyor.');
 if(isDuration&&input.step&&input.step!=='any'){const n=(+v-(+input.min||0))/+input.step;if(Math.abs(n-Math.round(n))>1e-6)throw Error('Bu alan '+input.step+' '+({seconds:'saniye',minutes:'dakika',hours:'saat'}[type])+' adımlarla kaydedilir. Süreyi bu adıma göre seç.')}
 return v;
 }
 function draw(){try{const v=value();preview.textContent='Seçimin: '+(isDate?E.displayDate(v.split('T')[0])+(v.includes('T')?' · '+v.split('T')[1]:''):isDuration?Number(v).toLocaleString('tr-TR',{maximumFractionDigits:4})+' '+({seconds:'sn',minutes:'dk',hours:'saat'}[type]):v);message.textContent='';if(isDate)form.querySelector('#entry-native-date').value=v.split('T')[0]}catch(e){message.textContent=e.message;preview.textContent=''}}
 form.onchange=e=>{if(e.target.id==='entry-native-date'&&e.target.value){const [y,m,d]=e.target.value.split('-').map(Number);form.elements.year.value=y;form.elements.month.value=m;form.elements.day.value=d}draw()};draw();
 form.onsubmit=e=>{e.preventDefault();try{const v=value();if(!input.isConnected)throw Error('Alan yenilendi. Formdaki seçiciyi yeniden aç.');input.value=isDate&&input.type==='text'?E.displayDate(v):v;input.setCustomValidity('');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));modal.close();input.focus()}catch(err){message.textContent=err.message}};
 modal.addEventListener('close',()=>input.isConnected&&input.focus(),{once:true});modal.showModal();
}
function enhance(root=document){root.querySelectorAll('input').forEach(input=>{const type=kind(input);if(!type){if(input.dataset.entryPicker){const wrap=input.closest('.entry-field');if(wrap){wrap.before(input);wrap.remove()}delete input.dataset.entryPicker;if(input.dataset.entryAria){input.removeAttribute('aria-label');delete input.dataset.entryAria}}return}if(input.dataset.entryPicker){input.dataset.entryPicker=type;const b=input.parentElement.querySelector('.entry-open'),label=labelOf(input);if(b){b.disabled=input.disabled||input.readOnly;b.textContent=type==='date'||type==='datetime-local'?'Tarih seç':type==='time'?'Saat seç':'Süre seç';b.setAttribute('aria-label',label+' · '+b.textContent)}if(input.dataset.entryAria)input.setAttribute('aria-label',label);return}
 input.dataset.entryPicker=type;const normalize=()=>{if(type==='date'&&input.type==='text'){const d=E.date(input.value);if(d){const formatted=E.displayDate(d);if(input.value!==formatted){input.value=formatted;input.setCustomValidity('');input.dispatchEvent(new Event('change',{bubbles:true}))}}}};input.addEventListener('blur',normalize);input.addEventListener('change',normalize,true);const label=labelOf(input);if(!input.getAttribute('aria-label')){input.setAttribute('aria-label',label);input.dataset.entryAria='true'};const wrap=document.createElement('span');wrap.className='entry-field';input.before(wrap);wrap.append(input);const b=document.createElement('button');b.type='button';b.className='secondary entry-open';b.textContent=type==='date'||type==='datetime-local'?'Tarih seç':type==='time'?'Saat seç':'Süre seç';b.setAttribute('aria-label',label+' · '+b.textContent);b.disabled=input.disabled||input.readOnly;b.onclick=e=>{e.preventDefault();choose(input,input.dataset.entryPicker)};wrap.append(b);
 });}
function init(){enhance();let scheduled=false;new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}}).observe(document.body,{childList:true,subtree:true});
 document.addEventListener('change',e=>{const input=e.target;if(input.dataset?.entryPicker==='date'&&input.type==='text'){const d=E.date(input.value);if(d){input.value=E.displayDate(d);input.setCustomValidity('')}}},true);
}
window.AccountEntryUI={enhance,choose,kind};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
