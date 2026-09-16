const assert=require('assert');
const {ctx,element,callbacks,storage}=require('./integration-v9.test.js');
async function test(){
 const day=ctx.todayKey(),old=ctx.addDaysKey(day,-1);
 let remote;
 ctx.fetch=async(url,options)=>{
  assert.equal(url,'/api/state');remote=JSON.parse(options.body).data;
  return {ok:true,json:async()=>({ok:true,revision:remote.meta.persistenceRevision+1})};
 };
 ctx.db.daily[day].steps=4321;
 element('healthStatus').value='sick';element('healthNote').value='integration-test';
 element('fatigueLevel').type='number';element('fatigueLevel').value='8';
 element('illnessSeverity').type='number';element('illnessSeverity').value='7';
 element('healthFever').checked=true;
 await ctx.saveHealthStatus();
 assert.equal(remote.daily[day].healthFever,true);
 assert.equal(remote.daily[day].steps,4321,'health-only save must preserve other daily fields');
 assert.equal(JSON.parse(storage.athleteLifeOS).daily[day].healthNote,'integration-test');
 assert.equal(ctx.HealthStateEngine.assess(remote.daily[day]).action,'stop_hard_training');
 assert.equal(ctx.AthleteEventStore.state(day).recovery.checkins[0].payload.healthFever,true);
 assert(element('healthSaveStatus').textContent.includes('veritabanına kaydedildi'));
 assert(ctx.AthleteCoordinator.status().ok);
 // A second edit updates the projected record rather than retaining the first event.
 element('healthStatus').value='normal';element('healthFever').checked=false;
 element('fatigueLevel').value='0';element('illnessSeverity').value='0';
 await ctx.saveHealthStatus();assert.equal(remote.daily[day].healthFever,false);
 assert.equal(ctx.AthleteEventStore.state(day).recovery.checkins[0].payload.healthFever,false);
 ctx.ALOSServerSync.flush=async()=>false;
 await ctx.saveHealthStatus();assert(element('healthSaveStatus').textContent.includes('bekliyor'));
 ctx.indexedDB=null;
 const adaptiveInit=callbacks.find(fn=>fn.name==='bindAdaptive');assert(adaptiveInit);
 adaptiveInit();
 element('manualTrainingDate').setCustomValidity=()=>{};
 element('manualTrainingDate').reportValidity=()=>{};
 ctx.setTrainingViewDate(old);
 assert.equal(element('manualTrainingDate').value,old.split('-').reverse().join('.'));
 element('exerciseSelect').value='0';element('set1').value='8';
 const todayCount=(ctx.db.trainingLogs[day]||[]).length;
 element('addExerciseBtn').click();
 const row=ctx.db.trainingLogs[old].at(-1);
 assert.equal(row.athleteDay,old);assert.equal(row.scheduledFor,old);
 assert.equal(row.historicalEntry,true);assert.equal((ctx.db.trainingLogs[day]||[]).length,todayCount);
 assert.equal(JSON.parse(storage.athleteLifeOS).trainingLogs[old].at(-1).athleteDay,old);
 const report=ctx.AthleteCoordinator.flush('historical-entry',true);assert(report.ok,JSON.stringify(report.errors));
 assert(ctx.AthleteEventStore.state(old).training.rows.length>0);
 assert(ctx.AthleteLoadMesh.impactForDate(old).movementImpacts.length>0);
 // Existing historical-entry links must select the actual write date as well.
 ctx.goToPage=()=>{};ctx.openHistoricalSessionTarget(ctx.addDaysKey(day,-2));
 assert.equal(element('manualTrainingDate').value,ctx.addDaysKey(day,-2).split('-').reverse().join('.'));
 console.log('Health/history integration PASS: persisted fields, server acknowledgement, event correction, offline status, date navigation, legacy history link, physiology and coordinator.');
}
test().catch(e=>{console.error(e);process.exitCode=1});
