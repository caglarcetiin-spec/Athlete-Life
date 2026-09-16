const vm=require('vm'),fs=require('fs'),assert=require('assert');
const storage={},requests=[];
const ctx={console:{warn(){}},setTimeout:()=>1,clearTimeout(){},navigator:{},
 localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]},
 XMLHttpRequest:class{open(){}setRequestHeader(){}send(){this.status=200;this.responseText='{"ok":true,"data":null}'}},
 addEventListener(){},fetch:(url,opts)=>new Promise((resolve,reject)=>requests.push({data:JSON.parse(opts.body).data,resolve,reject}))};
ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('server-sync.js','utf8'),ctx);
async function test(){
 const sync=ctx.ALOSServerSync;
 sync.push({v:1});const first=sync.flush();sync.push({v:2});
 assert.strictEqual(sync.flush(),first);assert.equal(requests.length,1,'writes must be serialized');
 requests[0].reject(new Error('offline'));assert.equal(await first,false);
 const next=sync.flush();assert.equal(requests[1].data.v,2,'failure must not replace newer pending data');
 sync.push({v:3});requests[1].resolve({ok:true,json:async()=>({ok:true,revision:2})});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(requests[2].data.v,3);
 requests[2].resolve({ok:true,json:async()=>({ok:true,revision:3})});
 assert.equal(await next,true);assert.equal(sync.status().pending,false);assert.equal(sync.status().lastAckRev,3);
 console.log('Server sync ordering, retry preservation and complete acknowledgement: PASS');
}
test().catch(e=>{console.error(e);process.exitCode=1});
