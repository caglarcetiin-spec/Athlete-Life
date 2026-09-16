const fs=require('fs'),assert=require('assert');
const file='.local-backups/merged-2026-09-15.alosbackup';
if(!fs.existsSync(file)){console.log('Backup rehearsal: SKIP (private backup not present)');process.exit(0)}
const {ctx,storage,run}=require('./integration-v9.test.js');
const backup=JSON.parse(fs.readFileSync(file,'utf8'));
ctx.__backupData=backup.data;run('db=JSON.parse(JSON.stringify(__backupData))');
storage['athleteLifeOS.events.v1']=JSON.stringify(backup.events);
const counts=d=>Object.fromEntries(['trainingLogs','foodLogs','waterLogs'].map(k=>[k,Object.values(d[k]||{}).reduce((n,r)=>n+r.length,0)]));
const before=counts(ctx.db);
const report=ctx.AthleteCoordinator.flush('backup-rehearsal',true);
assert(report.ok,JSON.stringify(report.errors));assert.deepEqual(counts(ctx.db),before);
assert.equal(ctx.AthleteEventStore.state('2026-09-14').training.rows.length,7);
assert.equal(ctx.AthleteEventStore.state('2026-09-15').nutrition.foods.length,4);
assert(ctx.AthleteLoadMesh.impactForDate('2026-09-14').movementImpacts.length>=7);
assert.equal(new Set(ctx.db.trainingLogs['2026-09-14'].map(r=>r.entryId||r.id||r.logId)).size,7);
assert.deepEqual(counts(JSON.parse(storage.athleteLifeOS)),before);
console.log('Private backup rehearsal PASS:',JSON.stringify(before),'event projection, physiology, canonical pipeline and local persistence.');
