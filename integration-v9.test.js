const fs=require('fs'),vm=require('vm'),assert=require('assert');
const storage={},callbacks=[],nodes=new Map(),timers=[];
const noop=()=>{};
// This scenario exercises Tuesday's run plan, independently of the real date.
class ScenarioDate extends Date{constructor(...args){super(...(args.length?args:['2026-09-15T12:00:00+03:00']))}static now(){return new ScenarioDate().getTime()}}
function element(id){
 if(nodes.has(id))return nodes.get(id);
 const el={id,hidden:false,value:'',textContent:'',innerHTML:'',dataset:{},options:[],style:{},
 classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener(type,fn){this['on'+type]=fn},
 removeAttribute:noop,setAttribute:noop,appendChild:noop,append:noop,after:noop,replaceChildren:noop,
 querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>({width:500,height:200}),
 getContext:()=>new Proxy({},{get:()=>noop,set:()=>true}),focus:noop,click(){this.onclick?.()},
 showModal:noop,close:noop};nodes.set(id,el);return el;
}
const testConsole={...console,warn:(...args)=>{if(args[0]==='Durable journal mirror failed'&&String(args[1]).includes('IndexedDB unavailable'))return;console.warn(...args)}};
const ctx={console:testConsole,Date:ScenarioDate,Math,JSON,Intl,Map,Set,URL,Blob,performance:{now:()=>Date.now()},
 XMLHttpRequest:class{open(){}setRequestHeader(){}send(){this.status=200;this.responseText='{"ok":true,"data":null}'}},
 localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]},
 document:{readyState:'loading',addEventListener:(type,fn)=>callbacks.push(fn),getElementById:element,
 querySelectorAll:()=>[],querySelector:()=>null,documentElement:element('root'),createElement:element,createTextNode:x=>x},
 navigator:{},location:{protocol:'file:'},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout:noop,
 setInterval:noop,clearInterval:noop,addEventListener:noop,requestAnimationFrame:noop,devicePixelRatio:1,
 getComputedStyle:()=>({getPropertyValue:()=> '#555'}),confirm:()=>true,alert:noop,
 fetch:async url=>({json:async()=>JSON.parse(fs.readFileSync(String(url).split('?')[0],'utf8'))})};ctx.window=ctx;vm.createContext(ctx);
const scripts=[...fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"?]+)(?:[^\"]*)"/g)].map(x=>x[1]);
for(const f of scripts)vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const run=code=>vm.runInContext(code,ctx);
run(`db.settings.guidedSound=false;db.settings.programStartDate=todayKey();
 db.daily[todayKey()]={sleepTime:'23:00',wakeTime:'07:00',sleepQuality:4,energy:4,motivation:4,soreness:2,joint:2,stress:2};
 AthleteProgramEngine.build(14,'integration fixture');`);
// A lexical app DB must be visible to old and new engines; imports must update it too.
assert.strictEqual(ctx.db,ctx.ALOSRuntime.getDb());
const day=ctx.todayKey(),p=ctx.CanonicalSessionEngine.get(day);
assert.equal(ctx.AthleteProgramEngine.version,'9.2.8');
assert.equal(ctx.AthleteProgramEngine.baseSlot(day).type,'run');
assert(p.items.some(x=>x.name==='Zone 2 Run'));
assert(p.items.some(x=>x.name==='Mobility'));
// Fresh Runner must follow today even with a stale/catch-up router selection.
element('sessionAttributionMode').value='catchup:2026-09-01';
const flush=ctx.AthleteCoordinator.flush;ctx.AthleteCoordinator.flush=()=>{};
ctx.GuidedWorkout.start();
let s=ctx.db.activeGuidedWorkout;
assert.equal(s.targetDate,day);assert.equal(ctx.GuidedWorkout.sessionElapsedSec(s),0);
assert(ctx.TrainingSessionService.audit(day).ok);
assert.equal(ctx.TrainingSessionService.contract(s.items),ctx.TrainingSessionService.contract(p.items));
// Both rendered recommendations are generated from the same prescription.
ctx.refreshTrainingPlanner(false);
assert.equal(element('todayTrainingPlan').innerHTML,element('guidedPrescriptionPreview').innerHTML);
assert.equal(element('todayTrainingPlan').dataset.snapshotId,p.snapshotId);
// Idle session must follow an updated prescription (including rest, not just names).
const resolved=ctx.resolvedTemplate;
ctx.resolvedTemplate=k=>{const t=resolved(k);t.items[0].restTargetSec+=30;return t};
ctx.GuidedWorkout.reconcilePlan();
assert(ctx.TrainingSessionService.audit(day).ok);
assert.notEqual(ctx.db.activeGuidedWorkout.canonicalSnapshotId,p.snapshotId);
assert.equal(ctx.db.activeGuidedWorkout.items[0].restTargetSec,p.items[0].restTargetSec+30);
ctx.resolvedTemplate=resolved;ctx.GuidedWorkout.reconcilePlan();
// Prescription consumers cannot mutate the central stored object.
p.items[0].name='CORRUPTED';assert.notEqual(ctx.CanonicalSessionEngine.get(day).items[0].name,'CORRUPTED');
// Bind Runner UI handlers, without unrelated full-page startup callbacks.
const runnerInit=callbacks.find(fn=>String(fn).includes('db.guidedWorkoutHistory'));
assert(runnerInit);runnerInit();
element('guidedStartSet').onclick();s=ctx.db.activeGuidedWorkout;
assert.equal(s.phase,'work');assert(s.timingStartedAt);
const locked=s.canonicalSnapshotId;
run(`db.futurePlans[todayKey()]={...db.futurePlans[todayKey()],type:'push',name:'Push + Planche',version:99}`);
assert.equal(ctx.CanonicalSessionEngine.get(day).snapshotId,locked);
// A health red flag still gates execution, without silently rewriting history.
run(`db.activeGuidedWorkout.phase='ready';db.daily[todayKey()].healthFever=true`);
let alert='';ctx.alert=x=>alert=x;element('guidedStartSet').onclick();assert(alert);assert.equal(s.phase,'ready');
run(`delete db.daily[todayKey()].healthFever`);
// Restart preserves all actual rows and records the discarded UI session for audit.
const oldId=s.id;
run(`db.trainingLogs[todayKey()]=[{name:'Back Lever',sets:[8],metricUnit:'seconds',type:'STATIC',guidedSessionId:db.activeGuidedWorkout.id,scheduledFor:todayKey()},
 {name:'Ring Row',sets:[10],source:'manual',scheduledFor:todayKey()}]`);
ctx.GuidedWorkout.restartWorkout();assert.equal(ctx.db.trainingLogs[day].length,2);
assert.notEqual(ctx.db.activeGuidedWorkout.id,oldId);assert(ctx.db.guidedWorkoutHistory.some(h=>h.id===oldId));
assert.equal(ctx.GuidedWorkout.sessionElapsedSec(ctx.db.activeGuidedWorkout),0);
// Real physiology must see those rows through the bridge.
assert(ctx.AthleteLoadMesh.impactForDate(day).exerciseCount>0||ctx.AthleteLoadMesh.rolling(1,day).sessions>0);
// Stable event projection: edit and delete cannot leave ghost rows.
ctx.AthleteEventStore.bootstrapFromLegacy(ctx.db);
assert.equal(ctx.AthleteEventStore.state(day).training.rows.length,2);
ctx.db.trainingLogs[day][0].sets=[12];ctx.AthleteEventStore.bootstrapFromLegacy(ctx.db);
assert.equal(ctx.AthleteEventStore.state(day).training.rows.length,2);
assert.equal(ctx.AthleteEventStore.state(day).training.rows[0].payload.sets[0],12);
ctx.db.trainingLogs[day].splice(0,1);ctx.AthleteEventStore.bootstrapFromLegacy(ctx.db);
assert.equal(ctx.AthleteEventStore.state(day).training.rows.length,1);
ctx.db.waterLogs[day]=[{id:'restore-water',ml:500}];ctx.AthleteEventStore.bootstrapFromLegacy(ctx.db);
ctx.AthleteEventStore.append('WATER_DELETED',{id:'restore-water'},{athleteDay:day,domain:'nutrition'});
assert.equal(ctx.AthleteEventStore.state(day).nutrition.water.length,0);
ctx.db.waterLogs[day]=[];ctx.AthleteEventStore.bootstrapFromLegacy(ctx.db);
ctx.db.waterLogs[day]=[{id:'restore-water',ml:500}];ctx.AthleteEventStore.bootstrapFromLegacy(ctx.db);
assert.equal(ctx.AthleteEventStore.state(day).nutrition.water.length,1);
ctx.db.daily[day].energy=1;ctx.AthleteEventStore.bootstrapFromLegacy(ctx.db);
assert.equal(ctx.AthleteEventStore.state(day).recovery.checkins.length,1);
assert.equal(ctx.AthleteEventStore.state(day).recovery.checkins[0].payload.energy,1);
// Recalibration is deterministic across identical refreshes.
ctx.PersonalCalibration.rebuild();const sessions=ctx.db.calibration['load:Ring Row'].sessions;
ctx.PersonalCalibration.rebuild();assert.equal(ctx.db.calibration['load:Ring Row'].sessions,sessions);
// The pipeline uses actual app planner and every available engine in order.
ctx.AthleteCoordinator.flush=flush;
const report=ctx.AthleteCoordinator.flush('integration',true);
assert(report.ok,JSON.stringify(report.errors));
assert(report.stages.indexOf('physiology')<report.stages.indexOf('future-plan'));
assert.equal(ctx.AthleteCoordinator.flush('same inputs').revision,report.revision);
assert.equal(element('todayTrainingPlan').innerHTML,element('guidedPrescriptionPreview').innerHTML);
ctx.db.daily[day].energy=2;
const changed=ctx.AthleteCoordinator.flush('edited daily');assert.equal(changed.revision,report.revision+1);
assert(changed.ok,JSON.stringify(changed.errors));
assert.equal(ctx.AthleteEventStore.state(day).recovery.checkins[0].payload.energy,2);
// Whole-db replacement (backup restore) must not leave engines on a stale object.
run('db=JSON.parse(JSON.stringify(db));db.daily[todayKey()].energy=3');
assert.strictEqual(ctx.db,ctx.ALOSRuntime.getDb());
assert.equal(ctx.AthleteCoordinator.flush('restored backup').revision,changed.revision+1);
const nutrition=ctx.AdaptiveNutrition.targets(day);
assert(nutrition.energyConsistent);assert(Math.abs(nutrition.kcal-nutrition.macroKcal)<=4);
assert.equal(nutrition.canonicalSnapshotId,ctx.CanonicalSessionEngine.get(day).snapshotId);
console.log('v9 actual-script integration PASS: DB bridge, today/catch-up isolation, full prescription contract, immutable reads, first set lock, live safety gate, non-destructive restart, physiology, event corrections/deletion, calibration, ordered pipeline.');
module.exports={ctx,element,callbacks,storage,run,scripts};
