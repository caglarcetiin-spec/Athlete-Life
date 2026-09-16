const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('account-sync.js','utf8');
function harness({storage=new Map(),remote=null,revision=0,status=200}={}){
 const requests=[];
 const ctx={JSON,Number,Promise,Error,Date,console,
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  ALOSAccount:{user:{id:'a',name:'A'},locked:false,headers:()=>({'X-ALOS-Account':'a','X-ALOS-CSRF':'csrf-a'}),lock(){this.locked=true}},
  XMLHttpRequest:class{open(){}setRequestHeader(){}send(){this.status=status;this.responseText=JSON.stringify({ok:status===200,data:remote,revision})}},
  document:{body:null,getElementById:()=>null,addEventListener:()=>{}},addEventListener:()=>{},setTimeout:()=>1,clearTimeout:()=>{},
  fetch:async(url,options)=>{requests.push({url,...options,body:JSON.parse(options.body)});return {ok:true,status:200,json:async()=>({ok:true,revision:revision+requests.length})}}
 };
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);return {ctx,storage,requests,sync:ctx.ALOSServerSync};
}
async function main(){
 {
  const h=harness({remote:{marker:'same',meta:{revision:1},modelSnapshots:{old:true}}});
  h.sync.push({marker:'same',meta:{revision:2},modelSnapshots:{new:true}},'recompute');
  assert.equal(h.sync.status().pending,false,'derived refresh must not create a server write');
  h.sync.push({marker:'same',daily:{'2026-09-16':{energy:3}}},'input');
  assert.equal(h.sync.status().pending,true,'actual input must still queue');
  assert(await h.sync.flush());
 }

 {
  const {ctx,sync,storage,requests}=harness({remote:{marker:'remote'},revision:3});
  assert.equal(JSON.parse(storage.get('athleteLifeOS')).marker,'remote');
  sync.push({marker:'new'},'test');assert(storage.has('account.pending'));
  assert(await sync.flush());assert.equal(requests[0].body.baseRevision,3);
  assert.equal(requests[0].headers['X-ALOS-Account'],'a');
  assert.equal(sync.status().lastAckRev,4);assert(!storage.has('account.pending'));
  assert(!ctx.ALOSAccount.locked);
 }
 {
  const first=harness();first.ctx.fetch=async()=>{throw new Error('offline')};
  first.sync.push({marker:'offline'},'test');assert.equal(await first.sync.flush(),false);
  const reload=harness({storage:first.storage});
  assert.equal(JSON.parse(reload.storage.get('athleteLifeOS')).marker,'offline');
  assert(await reload.sync.flush());assert(!reload.storage.has('account.pending'));
 }
 {
  const first=harness();first.sync.push({marker:'local-draft'},'test');
  const reload=harness({storage:first.storage,revision:2,remote:{marker:'newer-server'}});
  assert(reload.sync.status().blocked);assert.equal(await reload.sync.flush(),false);
  assert.equal(reload.requests.length,0);assert.equal(JSON.parse(reload.storage.get('account.pending')).data.marker,'local-draft');
 }
 for(const status of [401,403,409]){
  const {ctx,sync,storage}=harness();ctx.fetch=async()=>({ok:false,status,json:async()=>({ok:false,error:'denied'})});
  sync.push({marker:'retained'},'test');assert.equal(await sync.flush(),false);
  assert(storage.has('account.pending'));
  if(status===409)assert(sync.status().blocked);else assert(ctx.ALOSAccount.locked);
 }
 {
  const {ctx,sync,requests,storage}=harness({revision:4});
  let release;
  ctx.fetch=async(url,options)=>{
   requests.push(JSON.parse(options.body));
   if(requests.length===1)await new Promise(resolve=>{release=resolve});
   return {ok:true,status:200,json:async()=>({ok:true,revision:4+requests.length})};
  };
  sync.push({value:1},'first');const flushing=sync.flush();
  sync.push({value:2},'second');release();assert(await flushing);
  assert.deepEqual(requests.map(r=>r.baseRevision),[4,5]);
  assert.deepEqual(requests.map(r=>r.data.value),[1,2]);
  assert.equal(sync.status().lastAckRev,6);assert(!storage.has('account.pending'));
 }
 assert(harness({status:401}).ctx.ALOSAccount.locked);
 console.log('PASS: account-bound sync, durable outbox/reload, concurrent updates, conflict preservation and expired/changed sessions.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
