/* One theme preference: account settings use the existing durable sync path. */
(()=>{
'use strict';
const root=document.documentElement,valid=value=>['light','dark'].includes(value);
const system=window.matchMedia('(prefers-color-scheme: dark)'),reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
const storageKey='appearance.theme';
let mode,explicit=false,transition;
try{const cached=JSON.parse(localStorage.getItem('athleteLifeOS')||'null');mode=window.ALOSAccount?cached?.settings?.theme:localStorage.getItem(storageKey)}catch(_){}
explicit=valid(mode);mode=explicit?mode:(system.matches?'dark':'light');
function draw(next){
 mode=next;root.dataset.theme=mode;root.style.colorScheme=mode;
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=mode==='dark'?'#0d1513':'#edf3f0';
 document.querySelectorAll('[data-theme-toggle]').forEach(button=>{
  const target=mode==='dark'?'Açık':'Koyu';button.textContent=(mode==='dark'?'☀ ':'☾ ')+target;
  button.setAttribute('aria-label',target+' temaya geç');button.title=target+' temaya geç';
 });
 document.querySelectorAll('[data-theme-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===mode)));
 window.dispatchEvent(new Event('resize')); // Canvas charts resolve the same root tokens.
}
function announce(text){const el=document.getElementById('appearance-status');if(el)el.textContent=text}
function choose(next){
 if(!valid(next)||next===mode)return;
 const db=window.ALOSRuntime?.getDb?.(),previous=db?.settings?.theme;
 if(window.ALOSAccount?.locked)return;
 try{
  if(db){db.settings=db.settings||{};db.settings.theme=next;
   if(window.ALOSRuntime.save()===false)throw Error('save rejected');
  }else localStorage.setItem(storageKey,next);
 }catch(_){if(db){if(previous===undefined)delete db.settings.theme;else db.settings.theme=previous}announce('Tema kaydedilemedi. Yeniden dene.');return}
 explicit=true;
 transition?.skipTransition?.();
 if(document.startViewTransition&&!reduce.matches)transition=document.startViewTransition(()=>draw(next));else draw(next);
 if(db){announce('Tema kaydediliyor…');window.ALOSServerSync?.flush().then(ok=>announce(ok?'Tema hesabına kaydedildi.':'Tema bu cihazda korundu; eşitleme bekliyor.'))}
 else announce('Tema bu tarayıcıda kaydedildi.');
}
function toggle(parent){
 if(!parent||parent.querySelector('[data-theme-toggle]'))return;
 const button=document.createElement('button');button.type='button';button.className='theme-toggle';button.dataset.themeToggle='';
 button.onclick=()=>choose(mode==='dark'?'light':'dark');parent.append(button);
}
function init(){
 const saved=window.ALOSRuntime?.getDb?.()?.settings?.theme;
 if(valid(saved)){mode=saved;explicit=true}
 toggle(document.querySelector('.topbar-actions')||document.querySelector('.welcome-story'));
 const settings=document.getElementById('settings');
 if(settings){const card=document.createElement('section');card.className='card appearance-card';card.innerHTML='<h3>Görünüm</h3><p>Okunaklı renkler, yumuşak cam yüzeyler. Seçimin hesabınla eşitlenir.</p><div class="theme-options" role="group" aria-label="Renk teması"><button type="button" data-theme-choice="light">☀ Açık</button><button type="button" data-theme-choice="dark">☾ Koyu</button></div><p id="appearance-status" class="hint" role="status" aria-live="polite"></p>';const heading=settings.querySelector('.design-header');if(heading)heading.after(card);else settings.prepend(card);card.querySelectorAll('button').forEach(b=>b.onclick=()=>choose(b.dataset.themeChoice))}
 // Modal users can change appearance without discarding an unfinished profile.
 const dialogs=()=>{document.querySelectorAll('.sports-dialog>header').forEach(toggle);draw(mode)};
 new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('dialog')||n.querySelector('dialog')))))dialogs()}).observe(document.body,{childList:true,subtree:true});
 dialogs();
}
draw(mode);
system.addEventListener('change',()=>{if(!explicit)draw(system.matches?'dark':'light')});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else init();
})();
