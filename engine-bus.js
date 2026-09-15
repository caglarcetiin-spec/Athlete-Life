
(function(){
"use strict";
const V="8.0",subs=new Map(),engines=new Map(),edges=[];
function subscribe(topic,fn,id="anon"){
 if(!subs.has(topic))subs.set(topic,[]);subs.get(topic).push({id,fn});return ()=>subs.set(topic,(subs.get(topic)||[]).filter(x=>x.fn!==fn))
}
function publish(topic,payload){
 const calls=[...(subs.get(topic)||[]),...(subs.get("*")||[])],errors=[];
 calls.forEach(x=>{try{x.fn(payload,topic)}catch(e){errors.push({id:x.id,error:e.message})}});
 return {topic,delivered:calls.length,errors};
}
function register(name,{version="unknown",inputs=[],outputs=[],health=null}={}){
 engines.set(name,{name,version,inputs,outputs,health});inputs.forEach(i=>edges.push({from:i,to:name}));outputs.forEach(o=>edges.push({from:name,to:o}));
 return engines.get(name);
}
function graph(){return {version:V,engines:[...engines.values()].map(({health,...x})=>x),edges:[...edges]}}
function health(){
 return [...engines.values()].map(e=>{let status="ok",detail=null;try{detail=e.health?.()||null}catch(err){status="error";detail=err.message}return {name:e.name,version:e.version,status,detail}})
}
window.EngineBus={version:V,subscribe,publish,register,graph,health};
})();
