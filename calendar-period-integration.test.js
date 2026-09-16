const assert=require('assert');
const {ctx,element,run,callbacks}=require('./integration-v9.test.js');
// The manually typed day must survive incomplete edits and only commit on explicit action.
ctx.indexedDB=null;callbacks.find(fn=>fn.name==='bindAdaptive')();
const date=element('manualTrainingDate');date.value='1';date.oninput();assert.equal(date.value,'1');
date.value='10.09.2026';element('applyManualTrainingDate').onclick();assert.equal(ctx.trainingViewDate(),'2026-09-10');assert.equal(date.value,'10.09.2026');
for(const bad of ['31.09.2026','29.02.2026','10.09.20','17.09.2026','']){date.value=bad;element('applyManualTrainingDate').onclick();assert.equal(ctx.trainingViewDate(),'2026-09-10');assert(element('manualTrainingSaveStatus').textContent.includes('geçerli'));}
date.value='10.09.2026';element('applyManualTrainingDate').onclick();assert.equal(ctx.trainingViewDate(),'2026-09-10');
// Weeks own their dates, including crossing a month/year. Switching never overwrites another week.
run('initWeek()');element('ws0').value='work';element('wsh0').value='evening';element('wso0').value='First week';run('persistWeeklyScheduleFromUI()');
const original=JSON.stringify(ctx.db.scheduleByDate['2026-09-14']);
assert(run('selectPlannerWeek("2026-10-01")'));assert.equal(element('weekPlanner').dataset.weekStart,'2026-09-28');
assert.equal(element('wso0').value,'');element('ws0').value='annual';element('wso0').value='Different week';run('optimizeWeek()');
assert.equal(ctx.db.scheduleByDate['2026-09-28'].status,'annual');assert.equal(JSON.stringify(ctx.db.scheduleByDate['2026-09-14']),original);
assert(ctx.db.weekOptimizations['2026-09-28']);assert.equal(run('shiftDataForKey("2026-10-05").shift'),'morning');
assert(run('selectPlannerWeek("2026-09-14")'));assert.equal(element('wso0').value,'First week');
assert(run('selectPlannerWeek("2027-01-01")'));assert.equal(element('weekPlanner').dataset.weekStart,'2026-12-28');assert(element('weekRangeLabel').textContent.includes('03.01.2027'));
// Manual period activation is explicit and non-destructive; every consumer sees its prescription.
const engine=ctx.TrainingPeriods,d=engine.blank();d.startDate='2026-09-16';d.weeks=4;
const row={name:'Weighted Pull-Up',sets:3,min:5,max:8,rir:2,rest:180,load:20,step:2.5};d.weekly[2]=[row];
assert.equal(engine.validate(d).length,0);const originalLogs=JSON.stringify(ctx.db.trainingLogs);
assert.equal(ctx.db.trainingPeriods,undefined);const p=engine.activate(d);assert.equal(JSON.stringify(ctx.db.trainingLogs),originalLogs);
assert.equal(ctx.db.futurePlans[d.startDate].periodId,p.id);
const rx=ctx.CanonicalSessionEngine.get(d.startDate);assert.equal(rx.items.length,1);assert.equal(rx.items[0].name,row.name);assert.equal(rx.items[0].targetRir,2);assert.equal(rx.items[0].restTargetSec,180);
assert.equal(rx.items[0].loadRecommendation.value,20);assert.equal(engine.phase('2026-10-07').deload,true);
assert.equal(engine.phase('2026-09-16').week,1);
const dormant=engine.planForDate('2026-10-14');assert(dormant.periodEnded);assert.equal(dormant.customItems.length,0);
// Severe health updates replace the executable dose with recovery, never with custom heavy work.
ctx.db.daily[d.startDate]={healthFever:true};ctx.AthleteCoordinator.flush('health in custom period',true);
assert.equal(ctx.CanonicalSessionEngine.get(d.startDate).planType,'recovery');assert(!ctx.CanonicalSessionEngine.get(d.startDate).items.some(x=>x.name===row.name));
delete ctx.db.daily[d.startDate];
// Record two comparable successes. In-period progression considers real days, not projected plans.
ctx.db.trainingLogs['2026-09-16']=[{...row,sets:[8,8,8],load:20,rir:2}];ctx.db.trainingLogs['2026-09-23']=[{...row,sets:[8,8,8],load:20,rir:2}];
let decorated=engine.decorate('2026-09-30',[{name:row.name}],{volume:1,intensity:1});assert.equal(decorated[0].loadRecommendation.value,22.5);
ctx.db.trainingLogs['2026-09-23'][0].sets=[8,7,6];decorated=engine.decorate('2026-09-30',[{name:row.name}],{volume:1,intensity:1});assert.equal(decorated[0].loadRecommendation.value,20);
const next=engine.blank();next.startDate='2026-10-14';next.weeks=8;next.weekly[2]=[{...row,name:'OHP'}];const p2=engine.activate(next);
assert.equal(ctx.db.trainingPeriods.length,2);assert.equal(engine.forDate('2026-09-23').id,p.id);assert.equal(engine.forDate('2026-10-14').id,p2.id);
assert.equal(engine.outcomes(p,'2026-09-30').comparisons[0].sessions,2);assert(ctx.db.trainingLogs['2026-09-16']);
assert.throws(()=>engine.activate({...next,startDate:'2026-09-14'}));
// Serialization/reload and validation of all bundled draft movements.
run('db=JSON.parse(JSON.stringify(db))');assert.equal(engine.forDate('2026-10-14').id,p2.id);
assert.equal(engine.validate(engine.hybridDraft()).length,0);
assert(engine.analyze(d).notes.length>0,'unbalanced one-movement draft must receive actionable analysis');
console.log('PASS: text dates, selected weeks, manual periods, health override, progression, outcomes, rollover and history persistence');
