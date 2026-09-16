const fs=require('fs');
function ok(v,m){if(!v)throw new Error(m)}
const app=fs.readFileSync('app.js','utf8');
const vault=fs.readFileSync('backup-vault.js','utf8');
const idx=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
ok(app.includes('athleteLifeOSLastKnownGood'),'missing last-known-good mirror');
ok(app.includes('__alosBootState'),'missing boot recovery selector');
ok(app.includes('__alosPersistSnapshot(db,"app-save")'),'normal saves must mirror state');
ok(vault.includes('portable full backup · last known good'),'full backup must create internal checkpoint');
ok(vault.includes('autoRecoverLatestCheckpointIfNeeded'),'missing automatic checkpoint recovery');
ok(vault.includes('backup-import'),'imports must update last-known-good');
ok(idx.includes('app.js?v=10.1.0')&&idx.includes('backup-vault.js?v=10.1.0'),'cache bust missing');
ok(/const CACHE="athlete-life-os-v\d+-\d+-\d+-[\w-]+"/.test(sw),'service worker must have a versioned cache');
console.log('PASS v9.2.6 persistence continuity');
