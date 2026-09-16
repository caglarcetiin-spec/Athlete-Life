(()=>{
'use strict';if(!window.ALOSAccount)return;
const S=window.SportScience,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number(v).toLocaleString('tr-TR',{maximumFractionDigits:2});let selected=null;
function source(id){const s=S.sources[id];return s?`<a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`:'';}
function review(notes=[]){return notes.length?`<details open class="science-review"><summary>Antrenman ilkeleriyle inceleme</summary>${notes.map(n=>`<p>${esc(n.text)}<br><small>${source(n.source)}</small></p>`).join('')}</details>`:'';}
function render(target,data){
 if(!target||!data)return;
 target.querySelector('#science-analysis')?.remove();
 // Replace the former generic comparison with the model-aware comparison view.
 for(const el of target.querySelectorAll(':scope > section'))if(el.querySelector('h3')?.textContent==='Aynı koşullardaki değişim')el.remove();
 const section=document.createElement('section');section.id='science-analysis';section.className='card';
 section.innerHTML=`<div class="section-head"><div><p class="sports-eyebrow">BRANŞINA GÖRE ÖLÇ</p><h3>Performans laboratuvarın</h3></div><button type="button" class="secondary" id="science-library">Modelleri keşfet</button></div><p class="hint">${data.coverage.mapped} branş · ${data.coverage.models} ölçüm modeli. Sonuçlar kendi koşulları ve kaynaklarıyla gösterilir.</p>${data.bySport.length?`<label>İncelenecek branş<select id="science-sport">${data.bySport.map(b=>`<option value="${esc(b.sport.id)}">${esc(b.sport.name)}</option>`).join('')}</select></label><div id="science-sport-detail"></div>`:'<p>Profiline bir branş ekle veya seans kaydet. Ölçümler burada birikecek.</p>'}`;
 target.children[0]?.after(section);section.querySelector('#science-library').onclick=()=>window.AthleteSports.openLibrary();
 function draw(){
  const id=section.querySelector('#science-sport').value;selected=id;const b=data.bySport.find(b=>b.sport.id===id),m=b.model;
  section.querySelector('#science-sport-detail').innerHTML=`<h4>${esc(m.name)}</h4><p>${esc(m.focus)}</p><p class="hint">Koşullar: ${esc(m.conditions)}</p>${b.latest?`<p>${esc(b.latest.date)} · ${b.count} toplam seans</p><div class="science-metric-grid">${b.measurements.map(v=>`<article><small>${esc(v.label)}</small><strong>${fmt(v.value)} <span>${esc(v.unit)}</span></strong><small>${v.kind==='estimate'?'Model tahmini':v.kind==='recorded'?'Girilen ölçüm':'Hesaplanan değer'}</small><details><summary>Nasıl hesaplandı?</summary><p>${esc(v.formula)}</p>${v.source?source(v.source):'<p>Birincil kayıtlardan aritmetik hesap; fizyolojik norm kullanılmaz.</p>'}</details></article>`).join('')||'<p>Son seansta bu modele uygun ölçüm yok. Kaydı düzenleyerek ölçüm ekleyebilirsin.</p>'}</div><button type="button" class="secondary" id="science-edit">Son seansı düzenle</button>`:'<p>Bu branşta henüz seans kaydı yok.</p>'}<h4>Koşulları eşleşen gelişim</h4>${b.comparisons.map(p=>`<article class="workspace-finding"><strong>${esc(p.label)} · ${esc(p.discipline)}</strong><p>${esc(p.firstDate)}: ${fmt(p.firstValue)} → ${esc(p.date)}: ${fmt(p.value)} ${esc(p.unit)}</p><p class="hint">${p.count} ölçüm · fark ${fmt(p.change)} ${esc(p.unit)} · ortalama ${fmt(p.mean)} · standart sapma ${fmt(p.sd)}.</p><small>${esc(p.conditions)}. ${esc(p.interpretation)}</small></article>`).join('')||'<p class="hint">Aynı alt disiplin, koşul ve ilgili ölçüm protokolüyle en az iki kayıt gerektiğinden henüz karşılaştırma yok.</p>'}<details><summary>Model kapsamı ve dayanaklar</summary><p>${esc(m.scope)}</p>${m.adapted?'<p>Uyarlanmış branşlarda kişisel ekipman ve protokol kullanılır; standart engel sınıfı veya fizyoloji varsayılmaz.</p>':''}${m.sources.map(id=>`<p>${source(id)}<br><small>${esc(S.sources[id].scope)}</small></p>`).join('')}</details>`;
  section.querySelector('#science-edit')?.addEventListener('click',()=>window.AthleteSports.openSession(b.latest.id));
 }
 const select=section.querySelector('#science-sport');if(select){if(data.bySport.some(b=>b.sport.id===selected))select.value=selected;select.onchange=draw;draw();}
}
window.SportScienceUI={render,review};
})();
