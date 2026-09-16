
(function(){
"use strict";
const V="8.0";
const STORAGE_KEY="athleteLifeOS.events.v1";
const SCHEMA=1;
const now=()=>new Date().toISOString();
const uid=(type="evt")=>`${type}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
function safeParse(s,fallback){try{return JSON.parse(s)}catch(e){return fallback}}
function load(){
 const imported=safeParse(localStorage.getItem("athleteLifeOS"),null)?._portableImport;
 if(imported?.sha256 && Array.isArray(imported.events?.events) && localStorage.getItem(STORAGE_KEY+".import")!==imported.sha256){
  const existing=safeParse(localStorage.getItem(STORAGE_KEY),null);
  const merged=JSON.parse(JSON.stringify(imported.events));
  const ids=new Set(merged.events.map(e=>e.id));
  for(const event of existing?.events||[])if(!ids.has(event.id)){merged.events.push(event);ids.add(event.id)}
  localStorage.setItem(STORAGE_KEY,JSON.stringify(merged));
  localStorage.setItem(STORAGE_KEY+".import",imported.sha256);
 }
 const raw=localStorage.getItem(STORAGE_KEY),x=safeParse(raw,null);
 return x&&Array.isArray(x.events)?x:{schemaVersion:SCHEMA,createdAt:now(),events:[]};
}
function save(store){localStorage.setItem(STORAGE_KEY,JSON.stringify(store));return store}
function list(filter={}){
 const s=load();return s.events.filter(e=>{
  if(filter.type&&e.type!==filter.type)return false;
  if(filter.domain&&e.domain!==filter.domain)return false;
  if(filter.date&&e.athleteDay!==filter.date)return false;
  if(filter.since&&e.createdAt<filter.since)return false;
  return true;
 });
}
function append(type,payload={},meta={}){
 const s=load(),event={
  id:meta.id||uid(type.toLowerCase()),schemaVersion:SCHEMA,type,domain:meta.domain||type.split("_")[0].toLowerCase(),
  athleteDay:meta.athleteDay||payload.athleteDay||payload.date||window.todayKey?.()||new Date().toISOString().slice(0,10),
  createdAt:meta.createdAt||now(),source:meta.source||"app",actor:meta.actor||"athlete",payload,
  provenance:{kind:meta.kind||"measured",confidence:meta.confidence??100,modelVersion:meta.modelVersion||null,derivedFrom:meta.derivedFrom||[]}
 };
 const existing=s.events.find(e=>e.id===event.id);if(existing)return {...existing,_created:false};
 event._created=true;s.events.push(event);save(s);
 try{window.EngineBus?.publish?.("event.appended",event)}catch(e){}
 return event;
}
function signature(type,date,payload){return `${type}|${date}|${JSON.stringify(payload)}`}
function stableToken(x){let h=2166136261,s=String(x);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function bootstrapFromLegacy(db){
 // The mutable application DB is the measured-record authority. The event log
 // is an audit trail, not a second competing database. Stable entity IDs and
 // tombstones make edits, deletions and restores project correctly.
 const s=load(),prior=s.recordIndex||{},next={},out=[];
 const add=(type,date,row,domain,id)=>{
   const payload=JSON.parse(JSON.stringify(row,(k,v)=>k==="physiologySnapshot"?undefined:v));
   const key=type+"|"+id,record={type,date,payload,domain,id},sig=JSON.stringify(record);
   next[key]={...record,sig};if(prior[key]?.sig===sig)return;
   out.push({id:uid("record"),schemaVersion:SCHEMA,type,domain,athleteDay:date,createdAt:now(),source:"record_reconcile",
    entityKey:key,payload,provenance:{kind:row.approximateBackfill?"estimated":"recorded",confidence:row.approximateBackfill?50:null}});
 };
 const many=(field,type,domain)=>Object.entries(db?.[field]||{}).forEach(([date,rows])=>(rows||[]).forEach(r=>{
   if(!r.entryId)r.entryId=r.logId||r.id||uid(field);
   add(type,date,r,domain,r.entryId);
 }));
 Object.entries(db?.daily||{}).forEach(([date,r])=>add("DAILY_CHECKIN_RECORDED",date,r,"recovery",date));
 many("foodLogs","FOOD_LOGGED","nutrition");many("waterLogs","WATER_LOGGED","nutrition");many("trainingLogs","TRAINING_ROW_RECORDED","training");
 Object.entries(db?.sessionFeedback||{}).forEach(([date,r])=>add("SESSION_FEEDBACK_RECORDED",date,r,"training",date));
 Object.entries(prior).forEach(([key,r])=>{if(!next[key])out.push({id:uid("delete"),type:"RECORD_DELETED",entityKey:key,athleteDay:r.date,domain:r.domain,createdAt:now(),payload:{}})});
 if(!s.recordIndex)s.projectionStart=s.events.length;
 const firstSync=!s.recordIndex;
 s.recordIndex=next;s.events.push(...out);s.projectionCommittedAt=s.events.length;
 if(out.length||firstSync)save(s);
 return {added:out.length,total:s.events.length};
}
function state(date=null){
 const store=load(),raw=store.events.slice(store.projectionStart||0),entities=new Map(),legacy=[];
 raw.forEach((e,i)=>{if(e.entityKey){if(e.type==="RECORD_DELETED")entities.delete(e.entityKey);else entities.set(e.entityKey,e)}else if(!store.recordIndex||((store.projectionStart||0)+i>=(store.projectionCommittedAt||0)&&!['FOOD_LOGGED','TRAINING_ROW_RECORDED','WATER_LOGGED','DAILY_CHECKIN_RECORDED','SESSION_FEEDBACK_RECORDED'].includes(e.type)))legacy.push(e)});
 const ev=[...entities.values(),...legacy].filter(e=>!date||e.athleteDay===date);
 const s={nutrition:{foods:[],water:[]},training:{rows:[],feedback:[]},recovery:{checkins:[]},events:ev};
 ev.forEach(e=>{
  if(e.type==="FOOD_LOGGED")s.nutrition.foods.push(e);
  if(e.type==="FOOD_UPDATED")s.nutrition.foods=s.nutrition.foods.filter(x=>x.payload.logId!==e.payload.logId).concat(e);
  if(e.type==="FOOD_DELETED")s.nutrition.foods=s.nutrition.foods.filter(x=>x.payload.logId!==e.payload.logId);
  if(e.type==="WATER_LOGGED")s.nutrition.water.push(e);
  if(e.type==="WATER_DELETED")s.nutrition.water=s.nutrition.water.filter(x=>x.payload.id!==e.payload.id);
  if(e.type==="TRAINING_ROW_RECORDED")s.training.rows.push(e);
  if(e.type==="SESSION_FEEDBACK_RECORDED")s.training.feedback.push(e);
  if(e.type==="DAILY_CHECKIN_RECORDED")s.recovery.checkins.push(e);
 });
 return s;
}
function health(){const s=load();return {version:V,schemaVersion:s.schemaVersion,eventCount:s.events.length,storageKey:STORAGE_KEY}}
window.AthleteEventStore={version:V,append,list,state,bootstrapFromLegacy,health,load,save};
})();
