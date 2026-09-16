/* Preview and download use the same server snapshot, bound to the signed-in account. */
(()=>{
'use strict';if(!window.ALOSAccount)return;
const H=window.HealthCore,q=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const human=d=>String(d).split('-').reverse().join('.');
const hours=n=>n===null?'Kayıt yok':`${Math.floor(Math.round(n)/60)} sa ${Math.round(n)%60} dk`;
function init(){
 const page=document.createElement('section');page.id='health-report';page.className='page';document.querySelector('main.main').append(page);
 page.innerHTML=`<header class="wellness-header"><p class="sports-eyebrow">SAĞLIK · PAYLAŞILABİLİR ÖZET</p><h2>Görüşmene hazırlıklı git.</h2><p>Uyku ve tahlil geçmişini seçtiğin dönem için birleştir. Önce kapsamı incele, ardından PDF olarak indir.</p></header><section class="card"><form id="health-report-form" class="wellness-form"><div class="sports-actions" aria-label="Hazır rapor dönemi"><button type="button" class="secondary" data-report-days="30">Son 30 gün</button><button type="button" class="secondary" data-report-days="90">Son 90 gün</button></div><div class="wellness-form-row"><label>Başlangıç · GG.AA.YYYY<input name="from" placeholder="GG.AA.YYYY" inputmode="numeric" required></label><label>Bitiş · GG.AA.YYYY<input name="to" placeholder="GG.AA.YYYY" inputmode="numeric" required></label></div><label class="report-checkbox"><input name="includeAll" type="checkbox"><span>Tüm tahlil sonuçlarını ek sayfalara ekle</span></label><p class="hint">Ana rapor tek sayfalık özettir. Uzun listelerde özete sığmayan sonuç sayısı belirtilir. Ek sayfalar seçilen dönemdeki tüm geçerli, arşivlenmemiş sonuçları içerir.</p><button class="primary" type="submit">Raporu önizle</button></form><p id="health-report-message" role="status" aria-live="polite"></p></section><section id="health-report-preview" class="card" hidden aria-label="Sağlık raporu önizlemesi"></section>`;
 const form=q('health-report-form'),msg=q('health-report-message'),preview=q('health-report-preview');let snapshot=null,busy=false;
 const invalidate=()=>{snapshot=null;const b=q('health-report-download');if(b)b.disabled=true;if(!preview.hidden)msg.textContent='Seçenekler değişti. Güncel raporu önizle.'};
 function preset(days){const now=H.today(),d=new Date(now+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-days+1);form.elements.from.value=human(d.toISOString().slice(0,10));form.elements.to.value=human(now);invalidate()}
 preset(30);form.oninput=invalidate;page.querySelectorAll('[data-report-days]').forEach(b=>b.onclick=()=>preset(Number(b.dataset.reportDays)));
 document.addEventListener('click',e=>{if(e.target.closest('[data-health-report]'))AthleteWorkspace.navigate('health-report')});
 async function request(path,body){const response=await fetch(path,{method:'POST',headers:ALOSAccount.headers(),body:JSON.stringify(body)});if(!response.ok){let error;try{error=await response.json()}catch(_){}throw Error(error?.error||'Rapor oluşturulamadı. Bağlantını kontrol edip yeniden dene.')}return response}
 form.onsubmit=async event=>{
  event.preventDefault();if(busy)return;
  let requestBody;try{requestBody={from:H.date(form.elements.from.value),to:H.date(form.elements.to.value),includeAll:form.elements.includeAll.checked}}catch(e){msg.textContent=e.message;return}
  busy=true;snapshot=null;form.querySelector('[type=submit]').disabled=true;const oldDownload=q('health-report-download');if(oldDownload)oldDownload.disabled=true;msg.textContent='Kayıtlar kontrol ediliyor…';
  try{
   const sync=window.ALOSServerSync;if(!sync||sync.status().blocked||!(await sync.flush()))throw Error('Rapor için kayıtların sunucuyla eşitlenmesi gerekiyor. Bağlantıyı ve kayıt durumunu kontrol et.');
   requestBody.baseRevision=sync.status().lastAckRev;
   const result=await (await request('/api/health/report/preview',requestBody)).json();
   // The form may change while the server is responding; never label stale data as current.
   if(H.date(form.elements.from.value)!==requestBody.from||H.date(form.elements.to.value)!==requestBody.to||form.elements.includeAll.checked!==requestBody.includeAll)throw Error('Seçenekler değişti. Güncel raporu yeniden önizle.');
   snapshot={body:requestBody,model:result.report};draw(snapshot);msg.textContent='Önizleme hazır. PDF yalnız indirildiğinde cihazına kaydedilir.';
  }catch(error){msg.textContent=error.message}finally{busy=false;form.querySelector('[type=submit]').disabled=false}
 };
 function draw(view){
  const r=view.model,s=r.sleep;preview.hidden=false;
  preview.innerHTML=`<div class="wellness-section-title"><div><p class="sports-eyebrow">PDF İÇERİĞİ · ${view.body.includeAll?'ÖZET VE EKLER':'TEK SAYFA'}</p><h3>${esc(r.name)}</h3><p class="hint">${human(r.from)} - ${human(r.to)}</p></div><button id="health-report-download" class="primary" type="button">PDF indir</button></div><div class="workspace-stats"><div><strong>${hours(s.average)}</strong><span>${s.count}/${s.days} gecenin ortalaması</span></div><div><strong>${s.quality===null?'Kayıt yok':Number(s.quality).toLocaleString('tr-TR',{maximumFractionDigits:2})+'/5'}</strong><span>Uyku kalitesi · ${s.rated} bildirim</span></div><div><strong>${r.reportCount}</strong><span>Tahlil raporu · ${r.measurementCount} sonuç</span></div></div>${r.omitted?`<p class="wellness-notice"><strong>${r.omitted} ölçüm serisi tek sayfalık özete sığmıyor.</strong> ${view.body.includeAll?'Tam sonuç listesi ek sayfalarda yer alacak.':'Tam liste için yukarıdaki ek sayfa seçeneğini açıp yeniden önizle.'}</p>`:''}${r.invalidReports?`<p class="wellness-notice">${r.invalidReports} eksik veya geçersiz rapor analize alınmadı.</p>`:''}<p class="hint">Özet: ${r.rows.length}/${r.seriesCount} ölçüm serisinin son değeri. Dönemde ${r.outsideCount} sınır dışı, ${r.unknownCount} yorumlanamayan sonuç var.</p>${r.rows.length?`<div class="table-wrap"><table><thead><tr><th>Test / laboratuvar</th><th>Son ölçüm</th><th>Önceki ölçüm</th><th>Rapor aralığı</th></tr></thead><tbody>${r.rows.map(row=>`<tr><th>${esc(row.name)}<br><small>${esc(row.lab)}</small></th><td>${esc(row.resultText)} ${esc(row.unit)}<br><small>${human(row.date)}</small></td><td>${row.previous?esc(row.previous.resultText)+' '+esc(row.unit)+'<br><small>'+human(row.previous.date)+'</small>':'-'}</td><td>${esc(row.referenceText)}<br><span class="lab-status ${esc(row.statusCode)}">${esc(row.statusLabel)}</span></td></tr>`).join('')}</tbody></table></div>`:'<p class="wellness-empty">Bu dönemde geçerli tahlil kaydı yok. PDF, mevcut uyku verisini ve tahlil kaydı bulunmadığını gösterecek.</p>'}<p class="hint">Önceki ölçüm; seçilen dönemde, aynı test, birim, laboratuvar, yöntem, açlık ve referans sınırlarıyla önceki farklı güne aittir. Bilinmeyen koşullar karşılaştırmayı sınırlar.</p><p class="hint">Rapor kullanıcı kayıtlarından oluşur; sağlık kuruluşunun asıl tahlil raporunun yerine geçmez. Aralık etiketleri tanı değildir.</p>`;
  q('health-report-download').onclick=async()=>{
   if(!snapshot||busy)return;const selected=snapshot,b=q('health-report-download');busy=true;b.disabled=true;msg.textContent='PDF hazırlanıyor…';
   try{
    if(reportNeedsRefresh(selected.body.baseRevision))throw Error('Kayıtlar değişti veya eşitleme bekliyor. Güncel raporu yeniden önizle.');
    const response=await request('/api/health/report/pdf',selected.body);
    const blob=await response.blob();if(!response.headers.get('Content-Type')?.includes('application/pdf'))throw Error('PDF yanıtı alınamadı.');
    if(snapshot!==selected)throw Error('Seçenekler değişti. Raporu yeniden önizle.');
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Athlete_Life_Saglik_${selected.body.from}_${selected.body.to}.pdf`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);msg.textContent='PDF hazır; indirme isteği tarayıcına iletildi.';
   }catch(error){msg.textContent=error.message;snapshot=null}finally{busy=false;b.disabled=!snapshot}
  };
 }
 function reportNeedsRefresh(revision){const s=window.ALOSServerSync?.status();return ALOSAccount.locked||!s||s.pending||s.blocked||s.lastAckRev!==revision}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
