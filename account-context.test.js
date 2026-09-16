const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('account-context.js','utf8');
const values=new Map([['athleteLifeOS','legacy-private-data']]);
const storage={get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const opens=[],deletes=[];
function load(id){
 const noop=()=>{};
 const context={ALOSAccountConfig:{user:{id,name:id},csrf:'test-csrf'},localStorage:storage,sessionStorage:storage,
  indexedDB:{open:(...args)=>opens.push(args),deleteDatabase:n=>deletes.push(n),cmp:()=>0,databases:async()=>[]},
  document:{addEventListener:noop,body:null},addEventListener:noop,setInterval:noop};
 context.window=context;vm.createContext(context);vm.runInContext(code,context);return context;
}
const a=load('athlete-a'),b=load('athlete-b');
assert.equal(a.localStorage.getItem('athleteLifeOS'),null,'legacy state must never auto-import');
a.localStorage.setItem('athleteLifeOS','A private');b.localStorage.setItem('athleteLifeOS','B private');
assert.equal(a.localStorage.getItem('athleteLifeOS'),'A private');assert.equal(b.localStorage.getItem('athleteLifeOS'),'B private');
a.sessionStorage.setItem('athleteRecordUndo','A undo');assert.equal(b.sessionStorage.getItem('athleteRecordUndo'),null);
for(const ctx of [a,b])for(const name of ['AthleteLifeOSPhotos','AthleteLifeOSVault','AthleteLifeOSDurable'])ctx.indexedDB.open(name,1);
assert.equal(new Set(opens.map(([name])=>name)).size,6);
a.indexedDB.deleteDatabase('AthleteLifeOSPhotos');assert.equal(deletes[0],'alos-account:athlete-a:AthleteLifeOSPhotos');
a.localStorage.clear();assert.equal(b.localStorage.getItem('athleteLifeOS'),'B private');assert.equal(values.get('athleteLifeOS'),'legacy-private-data');
b.ALOSAccount.lock();assert.throws(()=>b.localStorage.setItem('x','changed'),/Session changed/);
assert.throws(()=>b.indexedDB.open('AthleteLifeOSPhotos',1),/Session changed/);
assert.equal(a.ALOSAccount.headers()['X-ALOS-Account'],'athlete-a');
assert(![...values.values()].some(v=>String(v).includes('test-csrf')),'CSRF/session material is not stored in local storage');
console.log('PASS: per-account local storage, undo, photos, backups, durable history, clear isolation and session lock.');
