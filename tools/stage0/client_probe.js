// Execute shipped transport in an isolated VM. Assertions intentionally describe
// observed risks; this is evidence collection, not a passing 2.0 acceptance test.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'account-sync.js'),'utf8');
function harness({status=200,body={ok:true,data:null,revision:0},throws=false,storage=new Map()}={}){
 const events={},label={textContent:'',style:{}},requests=[];
 const ctx={JSON,Number,Promise,Error,Date,console,queueMicrotask,
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  ALOSAccount:{user:{id:'synthetic-a',name:'Test'},headers:()=>({}),locked:false,lock(){this.locked=true}},
  XMLHttpRequest:class{open(){}setRequestHeader(){}send(){if(throws)throw Error('offline');this.status=status;this.responseText=JSON.stringify(body)}},
  document:{readyState:'loading',body:null,getElementById:id=>id==='accountSyncStatus'?label:null,addEventListener:(k,f)=>events[k]=f},
  addEventListener:()=>{},setTimeout:()=>1,clearTimeout:()=>{},fetch:async(url,opts)=>{requests.push(JSON.parse(opts.body));return {status:200,ok:true,json:async()=>({ok:true,revision:1})}}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,events,storage,label,requests,sync:ctx.ALOSServerSync};
}
async function main(){
 const output={fixture:'synthetic VM',cases:[]};
 for(const status of [500,503,401]){
  const storage=new Map([['athleteLifeOS',JSON.stringify({marker:'cached'})]]),h=harness({status,storage});
  assert.equal(JSON.parse(storage.get('athleteLifeOS')).marker,'cached');assert.equal(h.requests.length,0);
  output.cases.push({http_status:status,cache_retained:true,bootstrap_posts:0,account_locked:h.ctx.ALOSAccount.locked});
 }
 for(const body of [{ok:true,data:null,revision:0},{}]){
  const h=harness({body,storage:new Map([['athleteLifeOS',JSON.stringify({marker:'cached'})]])});
  output.cases.push({response:body,cache_replaced_with_profile:JSON.parse(h.storage.get('athleteLifeOS')).marker!== 'cached',label:h.label.textContent});
 }
 const lost=harness();lost.events.DOMContentLoaded();await Promise.resolve();
 let committed=false;lost.ctx.fetch=async()=>{if(!committed){committed=true;throw Error('response lost after commit')}return {ok:false,status:409,json:async()=>({ok:false})}};
 lost.sync.push({trainingLogs:{'2026-09-10':[{id:'set-a',sets:[5]}]}},'synthetic');
 assert.equal(await lost.sync.flush(),false);assert(lost.storage.has('account.pending'));
 assert.equal(await lost.sync.flush(),false);assert(lost.sync.status().blocked);
 output.cases.push({name:'lost ACK then retry',pending_retained:true,blocked_as_conflict:true,prior_result_replayed:false});
 const quota=harness();quota.events.DOMContentLoaded();await Promise.resolve();
 quota.ctx.localStorage.setItem=()=>{throw Error('QuotaExceededError')};let quotaError=false;
 try{quota.sync.push({marker:'unsaved'},'quota')}catch(_){quotaError=true}
 assert(quotaError);output.cases.push({name:'outbox quota',push_throws:true,durable_outbox_written:false});
 console.log(JSON.stringify(output,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
