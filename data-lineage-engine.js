
(function(){
"use strict";
const V="8.0";
const KINDS=["measured","derived","estimated","recommended"];
function node(value,{kind="estimated",confidence=50,model="unknown",version="unknown",inputs=[],units=null,note=""}={}){
 return {value,kind:KINDS.includes(kind)?kind:"estimated",confidence:Math.max(0,Math.min(100,+confidence||0)),model,version,inputs,units,note,createdAt:new Date().toISOString()};
}
function measured(value,opts={}){return node(value,{...opts,kind:"measured",confidence:opts.confidence??100})}
function derived(value,opts={}){return node(value,{...opts,kind:"derived",confidence:opts.confidence??90})}
function estimated(value,opts={}){return node(value,{...opts,kind:"estimated",confidence:opts.confidence??60})}
function recommended(value,opts={}){return node(value,{...opts,kind:"recommended",confidence:opts.confidence??60})}
function explain(x){
 if(!x)return "Veri yok";
 return `${x.kind.toUpperCase()} · ${x.model}@${x.version} · güven ${x.confidence}/100${x.units?` · ${x.units}`:""}${x.note?` · ${x.note}`:""}`;
}
window.DataLineage={version:V,node,measured,derived,estimated,recommended,explain,kinds:KINDS};
})();
