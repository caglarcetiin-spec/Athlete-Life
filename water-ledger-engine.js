
(function(){
"use strict";
const V="7.18",uid=()=>`water_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const sum=rows=>(rows||[]).reduce((s,x)=>s+(Math.max(0,Number(x.ml)||0)),0);
function maps(db){db.water=db.water||{};db.waterLogs=db.waterLogs||{}}
function ensureDay(db,date){
 maps(db); if(Array.isArray(db.waterLogs[date]))return db.waterLogs[date];
 const legacy=Math.max(0,Number(db.water[date])||0);
 if(legacy>0){const row={id:`legacy_${date}`,ml:legacy,source:"legacy_total",time:"",loggedAt:new Date().toISOString()};db.waterLogs={...db.waterLogs,[date]:[row]};return db.waterLogs[date]}
 return [];
}
function entries(db,date){return ensureDay(db,date).map(x=>({...x}))}
function total(db,date){return sum(ensureDay(db,date))}
function compat(db,date,rows){maps(db);const ml=sum(rows);db.water={...db.water,[date]:ml};return ml}
function append(db,date,ml,meta={}){
 const amount=Math.max(0,Number(ml)||0);if(!amount)return {ok:false,reason:"invalid_amount"};
 const before=ensureDay(db,date),row={id:uid(),ml:amount,source:meta.source||"quick_add",time:meta.time||"",loggedAt:new Date().toISOString()},next=[...before,row];
 db.waterLogs={...db.waterLogs,[date]:next};return {ok:true,row,before:before.length,after:next.length,totalMl:compat(db,date,next)};
}
function removeById(db,date,id){
 const before=ensureDay(db,date),idx=before.findIndex(x=>x.id===id);if(idx<0)return {ok:false,reason:"not_found"};
 const removed=before[idx],next=before.filter((_,i)=>i!==idx),copy={...db.waterLogs};
 if(next.length)copy[date]=next;else delete copy[date];db.waterLogs=copy;
 return {ok:true,removed,before:before.length,after:next.length,totalMl:compat(db,date,next)};
}
function updateById(db,date,id,ml,time=""){
 const before=ensureDay(db,date),idx=before.findIndex(x=>x.id===id),amount=Math.max(0,Number(ml)||0);
 if(idx<0)return {ok:false,reason:"not_found"};if(!amount)return removeById(db,date,id);
 const prev=before[idx],row={...prev,ml:amount,time:time||"",updatedAt:new Date().toISOString()},next=before.map((x,i)=>i===idx?row:x);
 db.waterLogs={...db.waterLogs,[date]:next};return {ok:true,row,previous:prev,totalMl:compat(db,date,next)};
}
function migrateAll(db){maps(db);let migrated=0;Object.keys(db.water).forEach(date=>{if(!Array.isArray(db.waterLogs[date])&&(Number(db.water[date])||0)>0){ensureDay(db,date);migrated++}});return {migrated}}
window.WaterLedger={version:V,ensureDay,entries,total,append,removeById,updateById,migrateAll};
if(typeof module!=="undefined"&&module.exports)module.exports={ensureDay,entries,total,append,removeById,updateById,migrateAll};
})();
