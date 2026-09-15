
(function(){
"use strict";
const V="7.16";
const KEYS=["kcal","p","c","f","fiber","sugar","sodium","potassium","calcium","iron","magnesium","zinc","vitC","vitD","b12","folate","caf","water"];
function uid(){return `foodlog_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}
function snapshot(food,servings=1,meal="",time=""){
 const mult=Math.max(.01,Number(servings)||1),row={
  logId:uid(),nutritionSchemaVersion:2,foodId:food?.id||"",name:food?.n||food?.name||"Besin",cat:food?.cat||"",
  serv:food?.serv||"",meal,time,servings:mult,source:food?.source||"nutrition-library",precision:food?.precision||"reference",loggedAt:new Date().toISOString()
 };
 KEYS.forEach(k=>row[k]=(Number(food?.[k])||0)*mult);
 return row;
}
function normalize(row,library=[]){
 if(!row)return {};
 const food=library.find(x=>(row.foodId&&x.id===row.foodId)||x.n===row.name);
 const servings=Math.max(.01,Number(row.servings)||1);
 const base=food?snapshot({...food},servings,row.meal||"",row.time||""):{...row};
 const out={...base,...row,servings};
 if(!out.logId)out.logId=uid();
 if(!out.nutritionSchemaVersion)out.nutritionSchemaVersion=2;
 KEYS.forEach(k=>{
   const v=Number(row[k]);
   out[k]=Number.isFinite(v)?v:(Number(base[k])||0);
 });
 return out;
}
function totals(rows,library=[]){
 const t=Object.fromEntries(KEYS.map(k=>[k,0]));
 (rows||[]).forEach(r=>{const n=normalize(r,library);KEYS.forEach(k=>t[k]+=Number(n[k])||0)});
 return t;
}
function append(db,date,row){
 db.foodLogs=db.foodLogs||{};
 const existing=Array.isArray(db.foodLogs[date])?db.foodLogs[date]:[];
 const normalized=normalize(row,[]);
 const next=[...existing,normalized];
 db.foodLogs={...db.foodLogs,[date]:next};
 return {before:existing.length,after:next.length,rowId:normalized.logId||null,ok:next.length===existing.length+1};
}
function findIndexById(db,date,logId){
 const rows=Array.isArray(db?.foodLogs?.[date])?db.foodLogs[date]:[];
 return rows.findIndex(r=>r?.logId===logId);
}
function updateById(db,date,logId,newRow){
 db.foodLogs=db.foodLogs||{};
 const existing=Array.isArray(db.foodLogs[date])?db.foodLogs[date]:[];
 const idx=findIndexById(db,date,logId);
 if(idx<0)return {ok:false,reason:"not_found",before:existing.length,after:existing.length};
 const previous=existing[idx],replacement=normalize({...newRow,logId,loggedAt:previous.loggedAt||newRow.loggedAt||new Date().toISOString(),updatedAt:new Date().toISOString()},[]);
 const next=existing.map((r,i)=>i===idx?replacement:r);
 db.foodLogs={...db.foodLogs,[date]:next};
 return {ok:true,index:idx,before:existing.length,after:next.length,previous,row:replacement};
}
function removeById(db,date,logId){
 db.foodLogs=db.foodLogs||{};
 const existing=Array.isArray(db.foodLogs[date])?db.foodLogs[date]:[];
 const idx=findIndexById(db,date,logId);
 if(idx<0)return {ok:false,reason:"not_found",before:existing.length,after:existing.length};
 const removed=existing[idx],next=existing.filter((_,i)=>i!==idx);
 const foodLogs={...db.foodLogs};
 if(next.length)foodLogs[date]=next;else delete foodLogs[date];
 db.foodLogs=foodLogs;
 return {ok:true,index:idx,before:existing.length,after:next.length,removed};
}
function repairDay(db,date,library=[]){
 db.foodLogs=db.foodLogs||{};const rows=Array.isArray(db.foodLogs[date])?db.foodLogs[date]:[];
 let changed=false;
 const fixed=rows.map(r=>{const n=normalize(r,library);const before=JSON.stringify(r),after=JSON.stringify(n);if(before!==after)changed=true;return n});
 if(changed)db.foodLogs={...db.foodLogs,[date]:fixed};
 return {changed,count:fixed.length};
}
function verifyPersistent(storageKey,date,expectedIds=[]){
 try{
   const x=JSON.parse(localStorage.getItem(storageKey)||"{}"),rows=x.foodLogs?.[date]||[],ids=new Set(rows.map(r=>r.logId).filter(Boolean));
   return {ok:expectedIds.every(id=>ids.has(id)),count:rows.length};
 }catch(e){return {ok:false,count:0,error:e.message}}
}
window.NutritionLedger={version:V,keys:KEYS,snapshot,normalize,totals,append,findIndexById,updateById,removeById,repairDay,verifyPersistent};
if(typeof module!=="undefined"&&module.exports)module.exports={snapshot,normalize,totals,append,findIndexById,updateById,removeById,repairDay};
})();
