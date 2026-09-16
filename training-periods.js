(function(){
"use strict";
// Definitions are immutable after activation. Outcomes always come from dated actual records.
const data=()=>window.ALOSRuntime.getDb(),copy=x=>JSON.parse(JSON.stringify(x));
const today=()=>window.todayKey(),days=["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"];
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=k=>String(k).split("-").reverse().join(".");
const add=(k,n)=>window.addDaysKey(k,n),weekday=k=>(new Date(k+"T12:00:00").getDay()+6)%7;
const validDate=k=>/^\d{4}-\d{2}-\d{2}$/.test(k||"")&&!isNaN(new Date(k+"T12:00:00Z"))&&new Date(k+"T12:00:00Z").toISOString().slice(0,10)===k;
const catalog=()=>typeof EXERCISES!=="undefined"?EXERCISES:[];
const knowledge=name=>window.EXERCISE_KNOWLEDGE?.[name]||{};
function unitFor(name){const k=knowledge(name),e=catalog().find(x=>x.n===name);return k.metric|| (e?.type==="STATIC"?"seconds":String(e?.type).includes("RUN")?"km":"reps");}
function periods(){return data().trainingPeriods||[];}
function endOf(p){const next=periods().filter(x=>x.startDate>p.startDate).sort((a,b)=>a.startDate.localeCompare(b.startDate))[0];return next&&next.startDate<=p.endDate?add(next.startDate,-1):p.endDate;}
function forDate(k){return periods().filter(p=>p.startDate<=k&&endOf(p)>=k).sort((a,b)=>b.startDate.localeCompare(a.startDate))[0]||null;}
function blank(){return {name:"Yeni antrenman dönemi",goal:"hybrid",model:"Kuvvet + beceri + dayanıklılık",startDate:add(today(),1),weeks:12,deloadEvery:4,progression:"double",weekly:days.map(()=>[])};}
function validate(d){
 const errors=[];
 if(!d?.name?.trim()||d.name.length>100)errors.push("Dönem adı 1–100 karakter olmalı.");
 if(/[<>]/.test((d?.name||"")+(d?.model||"")))errors.push("Ad ve model alanlarında < veya > işareti kullanma.");
 if(!validDate(d?.startDate))errors.push("Geçerli bir başlangıç tarihi seç.");
 if(!Number.isInteger(+d?.weeks)||d.weeks<1||d.weeks>52)errors.push("Dönem uzunluğu 1–52 hafta olmalı.");
 if(![0,3,4,6].includes(+d?.deloadEvery))errors.push("Hafif hafta aralığı geçersiz.");
 if(!["hybrid","strength","hypertrophy","endurance","skill"].includes(d?.goal))errors.push("Geçerli bir hedef seç.");
 if(!["hold","double"].includes(d?.progression))errors.push("Progresyon yöntemi geçersiz.");
 if(!d?.model?.trim()||d.model.length>120)errors.push("Antrenman modelini yaz (en fazla 120 karakter).");
 if(!Array.isArray(d?.weekly)||d.weekly.length!==7)return [...errors,"Yedi günlük program gerekli."];
 if(!d.weekly.some(rows=>rows.length))errors.push("En az bir güne hareket ekle.");
 d.weekly.forEach((rows,day)=>{
  if(rows.length>20)errors.push(`${days[day]}: en fazla 20 hareket ekle.`);
  const seen=new Set();rows.forEach(r=>{
   const prefix=`${days[day]} / ${r.name}: `;
   if(!catalog().some(e=>e.n===r.name))errors.push(prefix+"kütüphaneden bir hareket seç.");
   if(seen.has(r.name))errors.push(prefix+"aynı gün için tek reçetede birleştir.");seen.add(r.name);
   if(!Number.isInteger(+r.sets)||r.sets<1||r.sets>10)errors.push(prefix+"set sayısı 1–10 olmalı.");
   if(!Number.isFinite(+r.min)||!Number.isFinite(+r.max)||r.min<=0||r.max<r.min||r.max>300)errors.push(prefix+"hedef aralığını kontrol et.");
   if(!Number.isFinite(+r.rir)||r.rir<0||r.rir>5)errors.push(prefix+"RIR 0–5 olmalı.");
   if(!Number.isFinite(+r.rest)||r.rest<0||r.rest>600)errors.push(prefix+"dinlenme 0–600 saniye olmalı.");
   if(r.load!==null&&(!Number.isFinite(+r.load)||r.load<0||r.load>500))errors.push(prefix+"yük 0–500 kg olmalı veya boş bırakılmalı.");
   if(!Number.isFinite(+r.step)||r.step<=0||r.step>10)errors.push(prefix+"yük adımı 0–10 kg arasında olmalı.");
  });
 });return errors;
}
function phase(k){const p=forDate(k);if(!p)return null;const week=Math.floor(window.daysBetween(p.startDate,k)/7)+1,deload=p.deloadEvery>0&&week%p.deloadEvery===0;return {week,cycle:periods().indexOf(p)+1,raw:week,periodId:p.id,weeks:p.weeks,deload,volume:deload?.65:1,intensity:deload?.90:1,label:deload?"Hafif hafta":"Çalışma haftası"};}
function plan(k){
 const p=forDate(k);
 if(!p){const ended=periods().filter(x=>endOf(x)<k).sort((a,b)=>b.startDate.localeCompare(a.startDate))[0];
  return ended?{key:k,type:"recovery",name:"Dönem tamamlandı · yeni planını oluştur",periodEnded:true,periodId:ended.id,reason:"Yeni dönem yalnızca sen ana plana aldığında başlar.",customItems:[]}:null;
 }
 const rows=p.weekly[weekday(k)],types=rows.map(r=>catalog().find(e=>e.n===r.name)?.type||"");
 const allRun=rows.length&&types.every(t=>t.includes("RUN")||t==="MOBILITY");
 return {key:k,type:rows.length?(allRun?"run":"hybrid"):"recovery",name:rows.length?`${p.name} · ${days[weekday(k)]}`:"Dinlenme / serbest hareket",periodId:p.id,customItems:copy(rows),reason:`${p.model} · ${phase(k).week}/${p.weeks}. hafta · ${phase(k).label}. Hedefler günlük verilerle dozlanır.`};
}
function history(name,k){return Object.entries(data().trainingLogs||{}).filter(([date])=>date<k).flatMap(([date,rs])=>rs.filter(r=>r.name===name&&!r.approximateBackfill).map(r=>({...r,date}))).sort((a,b)=>a.date.localeCompare(b.date));}
function progress(r,k,p){
 const h=history(r.name,k).filter(x=>r.load===null||x.date>=p.startDate),last=h.at(-1),prior=[...h].reverse().find(x=>x.date!==last?.date);
 let load=r.load,reason=load===null?"Kişisel yük geçmişinden kalibre edilir.":"Seçtiğin başlangıç yükü korunur.";
 if(load===null&&window.LoadPrescriptionEngine?.isWeighted(r.name)&&last&&Number.isFinite(+last.load))load=+last.load;
 if(load!==null&&last&&p.progression==="double"){
  load=Number.isFinite(+last.load)?+last.load:load;
  const success=x=>x&&(x.sets||[]).length>=r.sets&&(x.sets||[]).slice(0,r.sets).every(v=>+v>=r.max)&&Number.isFinite(+x.rir)&&+x.rir>=r.rir;
  if(success(last)&&success(prior)&&+last.load===+prior.load){load+=r.step;reason=`İki farklı günde üst hedef ve RIR ${r.rir}+ tamamlandı; +${r.step} kg değerlendir.`;}
  else if(+last.rir===0){load*=.95;reason="Son kayıtta RIR 0: yükü %5 azaltıp kaliteyi kontrol et.";}
  else reason="Üst hedefi ve RIR'ı iki seansta doğrulamadan yük artırma.";
 }
 return {load,reason};
}
function template(k){const p=plan(k);if(!p)return null;return {duration:Math.round((p.customItems||[]).reduce((a,r)=>a+estimateMinutes(r),0)),items:p.customItems.map(r=>[r.name,rx(r),`RIR ${r.rir}`])};}
function rx(r,sets=r.sets){const u=unitFor(r.name),suffix=u==="seconds"?" sn":u==="minutes"?" dk":u==="km"?" km":"";return `${sets}×${r.min===r.max?r.min:`${r.min}–${r.max}`}${suffix}`;}
function estimateMinutes(r){const u=unitFor(r.name),work=u==="minutes"?r.max*60:u==="km"?r.max*360:u==="seconds"?r.max:r.max*3;return (r.sets*work+Math.max(0,r.sets-1)*r.rest)/60;}
function decorate(k,items,mod){
 const p=forDate(k);if(!p)return items;
 return items.map((it,i)=>{
  const r=p.weekly[weekday(k)][i];if(!r)return it;
  const pr=progress(r,k,p),fatigued=mod.volume<.9||mod.intensity<.95,targetRir=Math.min(5,r.rir+(fatigued?1:0));
  const pain=window.PainIntelligence?.exerciseAdvice?.(r.name,k),blocked=pain?.level>=3;
  let rec=it.loadRecommendation;
  if(pr.load!==null){const value=Math.round(pr.load*Math.min(1,mod.intensity)*(pain?.level===2?.9:1)*10)/10;
   rec={applicable:true,value:blocked?null:value,display:blocked?"Ağrı uyarısı: yük önerisi kapalı":`${value} kg dış yük`,label:"kg dış yük",source:"manual_period",rationale:pr.reason};
  }
  else if(rec?.value!=null){const value=Math.round(rec.value*Math.min(1,mod.intensity)*10)/10;rec={...rec,value,range:null,display:`${value} ${rec.label||"kg"}`};}
  const rest=r.rest+(fatigued&&r.rest>0?30:0);
  return {...it,prescription:rx(r,Math.max(1,Math.round(r.sets*mod.volume))),targetRir,note:`Hedef RIR ${targetRir} · ${r.rest} sn temel dinlenme`,progression:pr.reason,loadRecommendation:rec,restTargetSec:rest,restMinSec:rest,restMaxSec:rest+60,restKind:"period"};
 });
}
function recoveryPenalty(k){const p=plan(k);if(!p?.customItems?.length)return 0;const ledger=window.ALOSRecovery?.ledger(k)||{},muscles=new Set();p.customItems.forEach(r=>Object.keys(typeof V5_EXERCISE_MUSCLES!=="undefined"?V5_EXERCISE_MUSCLES[r.name]||{}:{}).forEach(m=>muscles.add(m)));return Math.min(22,Math.max(0,...[...muscles].map(m=>(ledger[m]-6)*2)));}
function outcomes(p,until=today()){
 const end=endOf(p)<until?endOf(p):until,actual=Object.entries(data().trainingLogs||{}).filter(([k])=>k>=p.startDate&&k<=end);
 let scheduled=0,completed=0;for(let k=p.startDate;k<=end;k=add(k,1)){const names=p.weekly[weekday(k)].map(r=>r.name);if(!names.length)continue;scheduled++;
  const rows=window.TrainingSessionService?.rows(k)||data().trainingLogs?.[k]||[];
  if(names.every(n=>rows.some(r=>r.name===n&&(r.sets||[]).some(v=>+v>0))))completed++;
 }
 const comparisons=[...new Set(p.weekly.flat().map(r=>r.name))].map(name=>{const rs=actual.flatMap(([k,rows])=>rows.filter(r=>r.name===name&&!r.approximateBackfill).map(r=>({...r,date:k}))).sort((a,b)=>a.date.localeCompare(b.date));const first=rs[0],last=rs.at(-1);
  return {name,sessions:new Set(rs.map(r=>r.date)).size,first:first?{date:first.date,load:first.load,sets:first.sets,rir:first.rir}:null,last:last?{date:last.date,load:last.load,sets:last.sets,rir:last.rir}:null};});
 return {scheduled,completed,adherence:scheduled?Math.round(completed/scheduled*100):null,recordedDays:actual.filter(([,rows])=>rows.length).length,comparisons};
}
function analyze(d,k=today()){
 const errors=validate(d),notes=[],muscles={},frequencies={};let strengthDays=0,runDays=0,totalMinutes=0;
 if(errors.length)return {errors,notes,muscles,frequencies};
 d.weekly.forEach((rows,i)=>{let strength=false,run=false;const seen=new Set();rows.forEach(r=>{
  const e=catalog().find(x=>x.n===r.name),isRun=String(e?.type).includes("RUN");run ||= isRun;strength ||= !isRun&&e?.type!=="MOBILITY";
  totalMinutes+=estimateMinutes(r);
  if(!isRun&&e?.type!=="MOBILITY")Object.entries(typeof V5_EXERCISE_MUSCLES!=="undefined"?V5_EXERCISE_MUSCLES[r.name]||{}:{}).forEach(([m,w])=>{muscles[m]=(muscles[m]||0)+r.sets*w;if(w>=.4)seen.add(m);});
  const pain=window.PainIntelligence?.exerciseAdvice?.(r.name,k);if(pain?.level>0)notes.push(`${r.name}: ${pain.short}`);
  if(r.rir===0&&!isRun)notes.push(`${r.name}: her sette tükeniş yerine teknik kalite için RIR 1–3 seçeneğini değerlendir.`);
 });seen.forEach(m=>frequencies[m]=(frequencies[m]||0)+1);if(strength)strengthDays++;if(run)runDays++;
 if(strength&&run)notes.push(`${days[i]}: kuvvet ve koşu aynı gün. Öncelikli beceriyi önce yap; zor seansları mümkünse ayrı saatlere yerleştir.`);
 });
 if(d.goal==="hybrid"&&(!strengthDays||!runDays))notes.push("Hibrit hedefte hem kuvvet/beceri hem dayanıklılık günü ekle.");
 const labels={chest:"Göğüs",lats:"Sırt",quads:"Ön bacak",hamstrings:"Arka bacak"};
 if(d.goal!=="endurance")Object.entries(labels).forEach(([m,label])=>{if(!muscles[m])notes.push(`${label}: programda belirgin yük yok.`);else if((frequencies[m]||0)<2)notes.push(`${label}: haftada tek gün. İkinci, daha hafif teması değerlendir.`);if((muscles[m]||0)>20)notes.push(`${label}: haftalık hacim yüksek (${muscles[m].toFixed(1)} ağırlıklı set); toparlanma ve performansı izle.`);});
 if(d.weekly.every(r=>r.length))notes.push("Her gün seans var; en az bir dinlenme veya çok hafif gün ayırmayı değerlendir.");
 const daily=data().daily?.[k],ready=daily?window.readiness?.(daily):null,health=window.HealthStateEngine?.assess?.(daily||{});
 if(ready==null)notes.push("Bugünün uyku/enerji kaydı eksik; günlük dozun güveni sınırlı.");else if(ready<68)notes.push(`Bugünkü hazır oluş ${Math.round(ready)}/100: günlük reçete hacmi ve yükü azaltabilir.`);
 if(health?.action&&health.action!=="normal")notes.push(`Sağlık: ${health.label}. Günlük güvenlik sınırı bu taslağa da uygulanır.`);
 const environment=window.SportsSciencePolicy?.recoveryEnvironment?.(k);
 if(environment){notes.push(`Toparlanma girdileri: uyku ${environment.sleepHours?environment.sleepHours.toFixed(1)+" saat":"kaydı yok"}; protein ${environment.proteinG?Math.round(environment.proteinG)+" g kayıtlı":"kaydı yok"}. Enerji ve su kayıtları da günlük toparlanma hesabına katılır.`);}
 const shift=window.shiftDataForKey?.(k);if(shift?.status==="work")notes.push("Vardiya planındaki tarihli kayıt antrenmanın saat penceresini belirler; haftalık hareket modelini değiştirmez.");
 return {errors,notes:[...new Set(notes)],muscles,frequencies,strengthDays,runDays,totalMinutes:Math.round(totalMinutes),ready:ready??null,environment:environment?.score??null,checkedAt:new Date().toISOString()};
}
function activate(d){
 const errors=validate(d);if(d.startDate<today())errors.push("Yeni dönem bugün veya ileri tarihte başlamalı; geçmiş kayıtları değiştirmez.");
 if(window.CanonicalSessionEngine?.isLocked?.(d.startDate))errors.push("Başlangıç gününde başlamış veya kaydedilmiş bir seans var. Yeni dönemi sonraki bir günden başlat.");
 if(periods().some(p=>p.startDate>=d.startDate))errors.push("Yeni dönemi son planlanmış dönemin başlangıcından sonra başlat.");
 if(errors.length)throw new Error(errors.join("\n"));
 const p={...copy(d),id:`period_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,endDate:add(d.startDate,+d.weeks*7-1),activatedAt:new Date().toISOString(),analysisAtActivation:analyze(d),baselineDate:today()};
 data().trainingPeriods=[...periods(),p];data().trainingPeriodDraft=null;window.ALOSRuntime.save();
 window.AthleteCoordinator?.flush("manual period activation",true);return copy(p);
}
function hybridDraft(){
 const d=blank();d.name="Çağlar · Hibrit temel dönem";
 const row=(name,sets,min,max,rest,rir=2)=>({name,sets,min,max,rest,rir,load:null,step:2.5});
 d.weekly=[
  [row("Front Lever",3,6,10,150,3),row("Weighted Pull-Up",3,5,8,180),row("Weighted Ring Dip",3,6,10,150),row("Bulgarian Split Squat",3,8,12,150)],
  [row("Zone 2 Run",1,4,6,0,3),row("Mobility",1,10,15,0,3)],
  [row("Full Planche",3,5,8,150,3),row("RDL",3,6,10,180),row("Ring Row",3,8,12,120),row("OHP",3,6,10,150)],
  [],
  [row("Weighted Pull-Up",3,6,10,150),row("Weighted Ring Dip",3,6,10,150),row("Bulgarian Split Squat",3,8,12,150),row("RDL",2,8,12,150)],
  [row("Zone 2 Run",1,5,8,0,3)],[]
 ];
 // Distances start from recorded easy running, not an assumed race fitness level.
 const recent=history("Zone 2 Run",today()).at(-1),km=recent?(recent.sets||[]).reduce((s,v)=>s+(+v||0),0):null;
 if(km>0&&km<20){d.weekly[1][0].min=Math.round(km*.8*10)/10;d.weekly[1][0].max=Math.round(km*10)/10;d.weekly[5][0].min=d.weekly[1][0].min;d.weekly[5][0].max=d.weekly[1][0].max;}
 d.weekly=d.weekly.map(rs=>rs.filter(r=>catalog().some(e=>e.n===r.name)));return d;
}
let draft=null,editing=-1;
const q=id=>document.getElementById(id);
function status(text){if(q("periodStatus"))q("periodStatus").textContent=text;}
function saveDraft(){data().trainingPeriodDraft=copy(draft);window.ALOSRuntime.save();}
function archiveDraft(){if(draft?.weekly?.some(rs=>rs.length)){data().trainingPeriodDrafts=data().trainingPeriodDrafts||[];data().trainingPeriodDrafts.push({...copy(draft),savedAt:new Date().toISOString()});}}
function fillForm(){
 if(!draft)draft=copy(data().trainingPeriodDraft||blank());
 for(const [field,id] of Object.entries({name:"periodName",goal:"periodGoal",model:"periodModel",startDate:"periodStart",weeks:"periodWeeks",deloadEvery:"periodDeload",progression:"periodProgression"}))if(q(id))q(id).value=draft[field];
 renderDays();render();
}
function readForm(){
 draft={...draft,name:q("periodName").value.trim(),goal:q("periodGoal").value,model:q("periodModel").value.trim(),startDate:q("periodStart").value,weeks:+q("periodWeeks").value,deloadEvery:+q("periodDeload").value,progression:q("periodProgression").value};saveDraft();
}
function resetRow(){editing=-1;if(q("periodAddMove"))q("periodAddMove").textContent="Hareketi Ekle";}
function renderDays(){
 const day=+q("periodDay").value||0,rows=draft.weekly[day];
 q("periodDayList").innerHTML=rows.length?rows.map((r,i)=>`<div class="period-move"><div><strong>${esc(r.name)}</strong><span>${esc(rx(r))} · RIR ${r.rir} · ${r.rest} sn dinlenme · ${r.load===null?"geçmişten yük önerisi":r.load+" kg"}</span></div><div class="quick-row"><button type="button" class="secondary" data-period-edit="${i}" aria-label="${esc(r.name)} düzenle">Düzenle</button><button type="button" class="secondary" data-period-up="${i}" ${i===0?"disabled":""} aria-label="${esc(r.name)} yukarı taşı">↑</button><button type="button" class="secondary" data-period-remove="${i}" aria-label="${esc(r.name)} kaldır">Kaldır</button></div></div>`).join(""):"<p class='hint'>Dinlenme günü. Antrenman planlamak için aşağıdan hareket ekle.</p>";
 q("periodWeekPreview").innerHTML=draft.weekly.map((rs,i)=>`<button class="period-day ${i===day?"active":""}" type="button" data-period-day="${i}"><strong>${days[i]}</strong><span>${rs.length?rs.length+" hareket · ≈"+Math.round(rs.reduce((a,r)=>a+estimateMinutes(r),0))+" dk":"Dinlenme"}</span></button>`).join("");
 q("periodWeekPreview").querySelectorAll("[data-period-day]").forEach(b=>b.onclick=()=>{q("periodDay").value=b.dataset.periodDay;resetRow();renderDays();});
 q("periodDayList").querySelectorAll("[data-period-remove]").forEach(b=>b.onclick=()=>{rows.splice(+b.dataset.periodRemove,1);resetRow();saveDraft();renderDays();render();});
 q("periodDayList").querySelectorAll("[data-period-up]").forEach(b=>b.onclick=()=>{const i=+b.dataset.periodUp;if(i>0)[rows[i-1],rows[i]]=[rows[i],rows[i-1]];resetRow();saveDraft();renderDays();});
 q("periodDayList").querySelectorAll("[data-period-edit]").forEach(b=>b.onclick=()=>{editing=+b.dataset.periodEdit;const r=rows[editing];for(const [field,id] of Object.entries({name:"periodExercise",sets:"periodSets",min:"periodMin",max:"periodMax",rir:"periodRir",rest:"periodRest",load:"periodLoad",step:"periodStep"}))q(id).value=r[field]??"";q("periodAddMove").textContent="Hareketi Güncelle";updateUnit();});
}
function updateUnit(){const unit=unitFor(q("periodExercise").value);q("periodUnitHint").textContent=`Hedef birimi: ${{seconds:"saniye",minutes:"dakika",km:"kilometre",reps:"tekrar"}[unit]||unit}. RIR: set sonunda yedekte kalan tekrar; koşuda kolay tempo ve konuşma testi esas alınır.`;}
function addRow(){
 readForm();const r={name:q("periodExercise").value,sets:+q("periodSets").value,min:+q("periodMin").value,max:+q("periodMax").value,rir:+q("periodRir").value,rest:+q("periodRest").value,load:q("periodLoad").value.trim()===""?null:+q("periodLoad").value,step:+q("periodStep").value};
 const candidate=copy(draft),day=+q("periodDay").value||0;if(editing>=0)candidate.weekly[day][editing]=r;else candidate.weekly[day].push(r);
 const errors=validate(candidate);if(errors.length){status(errors.join(" "));return;}draft=candidate;resetRow();saveDraft();renderDays();render();status("Hareket taslağa kaydedildi. Ana programın henüz değişmedi.");
}
function render(){
 if(!q("periodAnalysis"))return;
 const current=forDate(today()),latest=periods().at(-1),ended=latest&&endOf(latest)<today();
 q("periodCurrent").textContent=current?`${current.name} · ${phase(today()).week}/${current.weeks}. hafta · ${fmt(current.startDate)} – ${fmt(endOf(current))}`:ended?`${latest.name} tamamlandı. Sonuçları inceleyip yeni dönemini oluştur.`:latest?`${latest.name} ${fmt(latest.startDate)} tarihinde başlayacak.`:"Mevcut programın devam ediyor. Yeni dönem oluşturmak için taslağını hazırla.";
 renderRoadmap("month");renderRoadmap("period");
 const d=draft||data().trainingPeriodDraft;
 if(d){const a=analyze(d);q("periodAnalysis").innerHTML=a.errors.length?`<p>${a.errors.map(esc).join("<br>")}</p>`:`<div class="period-metrics"><span><strong>${a.strengthDays}</strong> kuvvet / beceri günü</span><span><strong>${a.runDays}</strong> koşu günü</span><span><strong>≈${a.totalMinutes} dk</strong> haftalık süre</span><span><strong>${a.ready??"—"}/100</strong> günlük hazır oluş</span></div><p class="hint">${new Date(a.checkedAt).toLocaleTimeString("tr-TR")} · Günlük kayıtlar, ağrı, toparlanma ve hareket kütüphanesi ile değerlendirildi. Süre ve kas katkıları tahmindir.</p><ul>${(a.notes.length?a.notes:["Temel dağılım dengeli görünüyor. Verimliliği gerçek performans ve devamlılıkla doğrula."]).map(n=>`<li>${esc(n)}</li>`).join("")}</ul><details><summary>Kaslara göre haftalık dağılım</summary><div class="period-muscles">${Object.entries(a.muscles).map(([m,v])=>`<span>${esc(typeof V5_MUSCLES!=="undefined"?V5_MUSCLES[m]?.label||m:m)}: ${v.toFixed(1)} ağırlıklı set · ${a.frequencies[m]||0} gün</span>`).join("")}</div></details>`;}
 q("periodHistory").innerHTML=[...periods()].reverse().map(p=>{const o=outcomes(p),done=endOf(p)<today();return `<details><summary>${esc(p.name)} · ${fmt(p.startDate)} – ${fmt(endOf(p))} · ${done?"Tamamlandı":p.startDate>today()?"Planlandı":"Aktif"}</summary><p class="hint">${o.completed}/${o.scheduled} program günü için tüm hareketlerin kaydı var. Kayıt günü: ${o.recordedDays}. Bu ölçüt set hedeflerinin eksiksiz tamamlandığını göstermez.</p><div class="period-results">${o.comparisons.map(c=>`<div><strong>${esc(c.name)}</strong><span>${c.sessions} kayıt günü</span><span>${c.sessions<2?"Karşılaştırma için iki farklı gün gerekli.":`${esc(c.first.sets.join(" / "))} → ${esc(c.last.sets.join(" / "))} ${esc(unitFor(c.name))} · yük ${c.first.load??"—"} → ${c.last.load??"—"} kg · RIR ${c.first.rir??"—"} → ${c.last.rir??"—"}`}</span></div>`).join("")}</div></details>`;}).join("")||"<p class='hint'>Ana plana aldığın dönemler burada birikir; yeni dönem eski kayıtları silmez.</p>";
}
function renderRoadmap(mode){
 const p=forDate(today())||periods().at(-1);if(!p)return false;
 const ended=endOf(p)<today(),ph=phase(today()),o=outcomes(p);
 if(mode==="month"){
  let strength=0,run=0;for(let i=0;i<28;i++){const candidate=plan(add(today(),i));if(!candidate?.customItems?.length)continue;if(candidate.type==="run")run++;else strength++;}
  q("monthTarget").textContent=ended?"Dönem tamamlandı":p.model;q("monthStrengthDays").textContent=strength;q("monthRunDays").textContent=run;q("monthDeload").textContent=ph?.deload?"Bu hafta":p.deloadEvery?`Her ${p.deloadEvery}. hafta`:"Sabit takvim yok";
  q("coachMonthRoadmap").innerHTML=Array.from({length:4},(_,i)=>{const k=add(today(),i*7),f=phase(k);return `<div class="block-card"><strong>${fmt(k)}</strong><span>${f?`${f.week}/${f.weeks}. hafta · ${f.label}`:"Yeni dönem onayı bekleniyor"}</span></div>`;}).join("");
  q("coachMonthDecision").textContent=`${p.name}: ${o.completed}/${o.scheduled} günün tüm hareketleri kaydedilmiş. Yeni bir model denemek veya programını sürdürmek için Antrenman → Programım panelini kullan. Değişiklik otomatik uygulanmaz.`;
 }else{
  q("coach12WeekRoadmap").innerHTML=Array.from({length:p.weeks},(_,i)=>{const k=add(p.startDate,i*7),f=phase(k);return `<div class="phase"><strong>Hafta ${i+1} · ${fmt(k)}</strong><span>${k>endOf(p)?"Sonraki döneme devredildi":f?.label||"Çalışma haftası"}</span></div>`;}).join("");
  q("coach12Criteria").innerHTML=`<div class="summary-item"><span>Kaydı tamamlanan gün</span><strong>${o.completed}/${o.scheduled}</strong></div><div class="summary-item"><span>Ölçüm yaklaşımı</span><strong>Aynı hareket, yük, RIR ve hareket kalitesinde karşılaştırma</strong></div>`;
  q("coach12Strategy").textContent=`${p.model}. ${ended?"Dönem tamamlandı. Yeni dönemin hedefini ve modelini sen seç.":"Günlük uyku, sağlık, ağrı ve yük kayıtları doz ayarını besler."} Ayrıntılı hareket karşılaştırmaları Programım → Dönem geçmişi bölümünde.`;
 }return true;
}
function renderCoach(){
 const p=plan(today());if(!p)return false;
 const cs=window.CanonicalSessionEngine?.get(today()),t=window.CanonicalSessionEngine?.template(today()),d=data().daily?.[today()],r=d?window.readiness?.(d):null;if(!t)return false;
 q("coachReadiness").textContent=r==null?"Veri yok":`${Math.round(r)}/100`;q("coachSession").textContent=t.name;q("coachIntensity").textContent=t.modifier.label;q("coachDuration").textContent=`≈${Math.round(t.duration||0)} dk`;
 q("coachDecision").textContent=`${cs.reason} ${t.health?.action!=="normal"?"Sağlık kısıtı: "+(t.health?.label||""):""} Antrenman ekranı ve seans yürütücüsü aynı reçeteyi kullanıyor.${cs.locked?" Başlamış seansın reçetesi korunuyor.":" Günlük kayıtların değiştikçe reçete güncellenir."}`;
 return true;
}
function init(){
 if(!q("periodEditor"))return;draft=copy(data().trainingPeriodDraft||blank());
 q("periodDay").innerHTML=days.map((d,i)=>`<option value="${i}">${d}</option>`).join("");
 q("periodExercise").innerHTML=catalog().map(e=>`<option value="${esc(e.n)}">${esc(e.n)}</option>`).join("");
 q("periodExercise").onchange=updateUnit;q("periodDay").onchange=()=>{resetRow();renderDays();};
 ["periodName","periodGoal","periodModel","periodStart","periodWeeks","periodDeload","periodProgression"].forEach(id=>q(id).onchange=()=>{readForm();render();});
 q("periodAddMove").onclick=addRow;
 q("periodAnalyze").onclick=()=>{readForm();render();status("Taslak kaydedildi ve güncel verilerle analiz edildi.");};
 q("periodActivate").onclick=()=>{readForm();try{const p=activate(draft);draft=blank();fillForm();q("periodEditor").open=false;status(`${p.name} ana plana alındı. Başlamış seanslar ve geçmiş kayıtlar korundu.`);}catch(e){status(e.message);}};
 q("periodNew").onclick=()=>{archiveDraft();draft=blank();const last=periods().at(-1);if(last&&last.endDate>=draft.startDate)draft.startDate=add(last.endDate,1);resetRow();saveDraft();fillForm();q("periodEditor").open=true;};
 q("periodHybrid").onclick=()=>{archiveDraft();draft=hybridDraft();resetRow();saveDraft();fillForm();status("Hibrit başlangıç taslağı hazır. Hareket varyasyonlarını ve mesafeleri kontrol et; ana plana almak senin kararın.");};
 fillForm();updateUnit();setInterval(()=>render(),60000);
}
window.TrainingPeriods={version:"10.1.0",blank,validate,analyze,activate,forDate,planForDate:plan,phase,template,decorate,recoveryPenalty,outcomes,endOf,hybridDraft,unitFor,render,renderRoadmap,renderCoach};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
