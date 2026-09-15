
(function(){
"use strict";
const V="7.17";
let active=null;

function el(id){return typeof document!=="undefined"?document.getElementById(id):null}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function runtime(){return window.ALOSRuntime||null}
function currentDb(){return runtime()?.getDb?.()||null}
function foods(){return runtime()?.getFoods?.()||[]}
function rowById(date,id){return (currentDb()?.foodLogs?.[date]||[]).find(r=>r.logId===id)||null}
function foodIndexForRow(r){
 const list=foods();
 let idx=list.findIndex(f=>r.foodId&&f.id===r.foodId);
 if(idx<0)idx=list.findIndex(f=>f.n===r.name);
 return idx>=0?idx:0;
}
function refreshPreview(){
 const idx=Number(el("nutritionEditFood")?.value),f=foods()[idx],sv=Math.max(.01,+el("nutritionEditServings")?.value||1),box=el("nutritionEditPreview");
 if(!box||!f)return;
 const n=window.NutritionLedger?.snapshot?.(f,sv,el("nutritionEditMeal")?.value||"",el("nutritionEditTime")?.value||"");
 box.innerHTML=`<strong>${escapeHtml(f.n)}</strong><span>${sv} × ${escapeHtml(f.serv)}</span><small>${Math.round(n.kcal||0)} kcal · P ${(n.p||0).toFixed(1)}g · K ${(n.c||0).toFixed(1)}g · Y ${(n.f||0).toFixed(1)}g · Lif ${(n.fiber||0).toFixed(1)}g</small>`;
}
function open(date,id){
 const r=rowById(date,id);if(!r)return;
 active={date,id,original:JSON.parse(JSON.stringify(r))};
 const dlg=el("nutritionEditDialog");if(!dlg)return;
 const select=el("nutritionEditFood"),idx=foodIndexForRow(r);
 select.innerHTML=foods().map((f,i)=>`<option value="${i}" ${i===idx?"selected":""}>${escapeHtml(f.n)} · ${escapeHtml(f.serv)}</option>`).join("");
 el("nutritionEditMeal").value=r.meal||"Atıştırmalık";
 el("nutritionEditServings").value=r.servings||1;
 el("nutritionEditTime").value=r.time||"";
 el("nutritionEditTitle").textContent=`${r.name} kaydını düzenle`;
 el("nutritionEditSubtitle").textContent=`${date} · değişiklikten sonra makro/mikro toplamlar otomatik yeniden hesaplanır.`;
 refreshPreview();dlg.showModal();
}
function refreshAll(message=""){
 const rt=runtime();
 try{rt?.save?.()}catch(e){}
 try{rt?.renderNutrition?.()}catch(e){}
 try{rt?.renderAnalytics?.()}catch(e){}
 try{rt?.renderReports?.()}catch(e){}
 try{window.NutritionImpact?.render?.()}catch(e){}
 try{window.RecordManager?.render?.()}catch(e){}
 const st=el("nutritionSaveStatus");if(st&&message){st.textContent=message;st.classList.add("ok");setTimeout(()=>{if(st.textContent===message)st.textContent=""},2600)}
}
function saveEdit(){
 if(!active)return;
 const idx=Number(el("nutritionEditFood")?.value),f=foods()[idx];if(!f)return;
 const sv=Math.max(.01,+el("nutritionEditServings")?.value||1),meal=el("nutritionEditMeal")?.value||"Atıştırmalık",time=el("nutritionEditTime")?.value||"";
 const snap=window.NutritionLedger?.snapshot?.(f,sv,meal,time);
 const result=window.NutritionLedger?.updateById?.(currentDb(),active.date,active.id,snap);
 if(!result?.ok)return alert("Besin kaydı güncellenemedi. Kayıt bulunamadı.");
 window.AthleteEventStore?.append?.("FOOD_UPDATED",{...result.row},{id:`food_update_${active.id}_${Date.now()}`,domain:"nutrition",athleteDay:active.date,source:"ui",kind:"measured",confidence:100});
 el("nutritionEditDialog")?.close();active=null;refreshAll("✓ Besin kaydı güncellendi");
}
function remove(date,id){
 const r=rowById(date,id);if(!r)return;
 if(!confirm(`${r.name} besin kaydı silinsin mi?\n\nKalori, makro ve mikro toplamlar otomatik yeniden hesaplanacak.`))return;
 const result=window.NutritionLedger?.removeById?.(currentDb(),date,id);
 if(!result?.ok)return alert("Besin kaydı silinemedi. Kayıt bulunamadı.");
 window.AthleteEventStore?.append?.("FOOD_DELETED",{logId:id,name:r.name},{id:`food_delete_${id}_${Date.now()}`,domain:"nutrition",athleteDay:date,source:"ui",kind:"measured",confidence:100});
 refreshAll("✓ Besin kaydı silindi");
}
function duplicate(date,id){
 const r=rowById(date,id);if(!r)return;
 const copy=window.NutritionLedger?.normalize?.({...r,logId:null,loggedAt:null,updatedAt:null},foods());
 copy.logId=`foodlog_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
 copy.loggedAt=new Date().toISOString();
 const result=window.NutritionLedger?.append?.(currentDb(),date,copy);
 if(!result?.ok)return alert("Besin kaydı çoğaltılamadı.");
 refreshAll("✓ Besin kaydı çoğaltıldı");
}
function init(){
 el("nutritionEditSaveBtn")?.addEventListener("click",saveEdit);
 el("nutritionEditFood")?.addEventListener("change",refreshPreview);
 el("nutritionEditServings")?.addEventListener("input",refreshPreview);
 el("nutritionEditMeal")?.addEventListener("change",refreshPreview);
 el("nutritionEditTime")?.addEventListener("change",refreshPreview);
}
window.NutritionRecordEngine={version:V,open,remove,duplicate,refreshPreview,_runtime:runtime,_currentDb:currentDb,_foods:foods,_rowById:rowById};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
