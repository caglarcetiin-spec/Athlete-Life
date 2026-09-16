/* Shared, deterministic read/write model for account snapshots and backups. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./health-lab-library.js'));else root.HealthCore=factory(root.HealthLabLibrary)})(typeof globalThis!=='undefined'?globalThis:this,function(library){
'use strict';
const copy=v=>JSON.parse(JSON.stringify(v)),array=v=>Array.isArray(v)?v:[];
const text=(v,max=100)=>String(v??'').trim().slice(0,max);
function number(v,optional=false){
 if(v===null||v===undefined||String(v).trim()===''){if(optional)return null;throw Error('Sonuç değerini gir.');}
 const s=String(v).trim().replace(',','.');
 if(!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)||!Number.isFinite(Number(s))||Number(s)<0)throw Error('Değerleri pozitif sayı veya sıfır olarak gir; ondalık için virgül kullanabilirsin.');
 return Number(s);
}
function date(v){
 let s=text(v,20);if(/^\d{2}\.\d{2}\.\d{4}$/.test(s))s=s.split('.').reverse().join('-');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||s<'1900-01-01'||Number.isNaN(Date.parse(s))||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)throw Error('Geçerli bir tarih gir: GG.AA.YYYY.');
 return s;
}
function today(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
function validate(raw,maxDate=today()){
 const d=date(raw.date);if(d>maxDate)throw Error('Tahlil tarihi gelecekte olamaz.');
 const lab=text(raw.lab);if(!lab)throw Error('Karşılaştırabilmek için laboratuvar adını gir.');
 const rows=array(raw.rows);if(!rows.length||rows.length>60)throw Error('Bir rapora 1–60 sonuç ekleyebilirsin.');
 const seen=new Set();
 const cleaned=rows.map(r=>{
  const marker=library.find(m=>m.id===r.marker),custom=text(r.name);
  if(!marker&&r.marker!=='custom')throw Error('Testi listeden seç.');
  if(!marker&&!custom)throw Error('Özel testin adını gir.');
  const name=marker?.name||custom,key=marker?.id||'custom:'+name.toLocaleLowerCase('tr');
  if(seen.has(key))throw Error('Aynı test bir raporda iki kez yer alamaz.');seen.add(key);
  const unit=text(r.unit,40);if(!unit)throw Error(name+': rapordaki birimi gir.');
  const value=number(r.value),low=number(r.low,true),high=number(r.high,true);
  if(low!==null&&high!==null&&low>=high)throw Error(name+': alt sınır üst sınırdan küçük olmalı.');
  const comparator=r.comparator||'=';if(!['=','<','>','≤','≥'].includes(comparator))throw Error('Sonuç işaretini kontrol et.');
  return {marker:marker?.id||'custom',name,unit,value,comparator,low,high,method:text(r.method,100)};
 });
 return {date:d,lab,fasting:['fasting','nonfasting'].includes(raw.fasting)?raw.fasting:'unknown',notes:text(raw.notes,2000),rows:cleaned};
}
function status(r){
 if(r.comparator!=='=')return {code:'unknown',label:'Sınırlı ölçüm; yorumlanmadı'};
 if(r.low===null&&r.high===null)return {code:'unknown',label:'Referans aralığı eksik'};
 if(r.low!==null&&r.value<r.low)return {code:'low',label:'Rapor alt sınırının altında'};
 if(r.high!==null&&r.value>r.high)return {code:'high',label:'Rapor üst sınırının üzerinde'};
 return {code:'within',label:r.low===null||r.high===null?'Girilen tek sınıra uygun':'Rapor aralığında'};
}
function reports(db,includeArchived=false){
 const valid=[],invalid=[];
 for(const r of array(db.healthLabRecords))try{const v=validate(r);if(!r.id||typeof r.id!=='string')throw Error('Kimlik eksik');if(!r.archivedAt||includeArchived)valid.push({...r,...v});}catch(_){invalid.push(r)}
 return {valid:valid.sort((a,b)=>b.date.localeCompare(a.date)),invalid:invalid.length};
}
function key(report,row){return JSON.stringify([row.marker==='custom'?'custom:'+row.name.toLocaleLowerCase('tr'):row.marker,row.unit,report.lab.toLocaleLowerCase('tr'),row.method,report.fasting,row.low,row.high]);}
function series(db){
 const groups=new Map();
 for(const report of reports(db).valid)for(const row of report.rows){const k=key(report,row);if(!groups.has(k))groups.set(k,{key:k,row,lab:report.lab,fasting:report.fasting,points:[]});groups.get(k).points.push({date:report.date,value:row.value,comparator:row.comparator,reportId:report.id});}
 return [...groups.values()].map(g=>({...g,points:g.points.sort((a,b)=>a.date.localeCompare(b.date))}));
}
function saveReport(db,raw,{id,expected,now=new Date().toISOString(),maxDate=today()}={}){
 const record=validate(raw,maxDate),all=array(db.healthLabRecords),old=id?all.find(r=>r.id===id):null;
 if(id&&(!old||JSON.stringify(old)!==expected))throw Error('Bu rapor değişmiş. Son halini yeniden aç.');
 if(old?.archivedAt)throw Error('Önce raporu arşivden geri al.');
 if(!id&&reports(db).valid.some(r=>r.date===record.date&&r.fasting===record.fasting&&r.lab.toLocaleLowerCase('tr')===record.lab.toLocaleLowerCase('tr')&&JSON.stringify(r.rows)===JSON.stringify(record.rows)))throw Error('Bu sonuçlar aynı tarih ve laboratuvarla zaten kayıtlı.');
 const identifier=id||(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'lab-'+Date.now()+'-'+Math.random().toString(36).slice(2));
 const next={...record,id:identifier,createdAt:old?.createdAt||now,updatedAt:now,revision:(old?.revision||0)+1,archivedAt:null};
 return {healthLabRecords:old?all.map(r=>r.id===id?next:r):[...all,next],healthLabHistory:[...array(db.healthLabHistory),{at:now,action:old?'edit':'create',id:identifier,before:old?copy(old):null,after:copy(next)}]};
}
function archive(db,id,archived,expected,now=new Date().toISOString()){
 const all=array(db.healthLabRecords),old=all.find(r=>r.id===id);
 if(!old||JSON.stringify(old)!==expected)throw Error('Bu rapor değişmiş. Son halini yeniden aç.');
 const next={...old,archivedAt:archived?now:null,updatedAt:now,revision:(old.revision||0)+1};
 return {healthLabRecords:all.map(r=>r.id===id?next:r),healthLabHistory:[...array(db.healthLabHistory),{at:now,action:archived?'archive':'restore',id,before:copy(old),after:copy(next)}]};
}
function minutes(v){if(!/^\d{2}:\d{2}$/.test(String(v)))return null;const [h,m]=v.split(':').map(Number);return h<24&&m<60?h*60+m:null;}
function sleepEntry(r){
 const start=minutes(r?.sleepTime),end=minutes(r?.wakeTime);if(start===null||end===null||start===end)return null;
 const duration=(end-start+1440)%1440;let awake;try{awake=number(r.nightAwake,true)??0}catch(_){return null}
 if(awake>=duration)return null;
 const quality=Number(r.sleepQuality);return {minutes:duration-awake,quality:quality>=1&&quality<=5?quality:null,sleepTime:r.sleepTime,wakeTime:r.wakeTime,nightAwake:awake};
}
function saveSleep(db,raw,maxDate=today()){
 const d=date(raw.date);if(d>maxDate)throw Error('Uyandığın tarih gelecekte olamaz.');
 const sleepTime=text(raw.sleepTime),wakeTime=text(raw.wakeTime),nightAwake=number(raw.nightAwake,true)??0;
 const sleepQuality=number(raw.sleepQuality,true);if(sleepQuality!==null&&(!Number.isInteger(sleepQuality)||sleepQuality<1||sleepQuality>5))throw Error('Uyku kalitesi 1–5 arasında olmalı.');
 const row={sleepTime,wakeTime,nightAwake,sleepQuality};if(!sleepEntry(row))throw Error('Uyku ve uyanış saatlerini kontrol et. Uyanık süre toplam süreden az olmalı.');
 return {daily:{...db.daily,[d]:{...db.daily?.[d],...row}}};
}
function sleepSummary(db,days=30,end=today()){
 date(end);const points=[];for(let i=days-1;i>=0;i--){const t=new Date(end+'T12:00:00Z');t.setUTCDate(t.getUTCDate()-i);const d=t.toISOString().slice(0,10);points.push({date:d,...(sleepEntry(db.daily?.[d])||{minutes:null,quality:null})})}
 const known=points.filter(p=>p.minutes!==null),rated=known.filter(p=>p.quality!==null);
 return {points,count:known.length,days,average:known.length?known.reduce((s,p)=>s+p.minutes,0)/known.length:null,quality:rated.length?rated.reduce((s,p)=>s+p.quality,0)/rated.length:null,rated:rated.length};
}
const formatValue=n=>n===null||n===undefined?'—':Number(n).toLocaleString('tr-TR',{maximumSignificantDigits:15});
return Object.freeze({library,formatValue,number,date,today,validate,status,reports,series,saveReport,archive,sleepEntry,saveSleep,sleepSummary});
});
