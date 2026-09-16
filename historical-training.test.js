const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('adaptive-intelligence.js','utf8');
function fn(name){const start=source.indexOf('function '+name+'('),end=source.indexOf('\nfunction ',start+1);return source.slice(start,end)}
const elements={manualTrainingDate:{value:'2026-09-14',setCustomValidity(){},reportValidity(){}},exerciseSelect:{value:'0'},exerciseLoad:{value:'10'},exerciseRir:{value:'2'},set1:{value:'8'}};
for(let i=2;i<=5;i++)elements['set'+i]={value:''};
let guided=0,stamped;
const c={q:id=>elements[id],db:{trainingLogs:{},planHistory:{},daily:{}},EXERCISES:[{n:'Pull-Up',type:'DYNAMIC'}],sessionActualKey:()=> '2026-09-15',selectedSessionTargetKey:()=> '2026-09-15',calKey:()=> '2026-09-15',planForDate:()=>({type:'strength'}),restIntervalPrescription:()=>({target:120}),save(){},renderTrainingAdaptive(){},safeRender(){},renderToday(){},renderCharacter(){},renderMuscleReport(){},renderAdaptiveIntelligence(){},window:{AthleteLoadMesh:{stampRow:(row,day)=>{stamped=day}},GuidedWorkout:{syncFromLogs(){guided++}}}};
vm.createContext(c);vm.runInContext(fn('manualTrainingContext')+'\n'+fn('addExerciseAdaptive'),c);
c.addExerciseAdaptive();assert.equal(c.db.trainingLogs['2026-09-14'].length,1);assert.equal(c.db.trainingLogs['2026-09-15'],undefined);assert.equal(stamped,'2026-09-14');assert.equal(guided,0);
const row=c.db.trainingLogs['2026-09-14'][0];assert.equal(row.historicalEntry,true);assert.equal(row.performedAt,null);assert.ok(row.recordedAt);assert.equal(row.scheduledFor,'2026-09-14');
for(const bad of ['2026-09-16','2026-02-30']){elements.manualTrainingDate.value=bad;c.addExerciseAdaptive();assert.equal(c.db.trainingLogs['2026-09-14'].length,1)}
elements.manualTrainingDate.value='';c.addExerciseAdaptive();assert.equal(c.db.trainingLogs['2026-09-15'],undefined,'blank date must not silently save today');
elements.manualTrainingDate.value='10.09.2026';c.addExerciseAdaptive();assert.equal(c.db.trainingLogs['2026-09-10'].length,1);assert.equal(guided,0);
elements.manualTrainingDate.value='15.09.2026';c.addExerciseAdaptive();assert.equal(c.db.trainingLogs['2026-09-15'].length,1);assert.equal(guided,1);
const store=new Map([['athleteLifeOS',JSON.stringify({_portableImport:{sha256:'test',events:{events:[{id:'a'}]}}})],['athleteLifeOS.events.v1',JSON.stringify({events:[{id:'b'}]})]]);
const ctx={window:{},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('event-store-engine.js','utf8'),ctx);assert.equal(ctx.window.AthleteEventStore.load().events.length,2);assert.equal(ctx.window.AthleteEventStore.load().events.length,2);
console.log('Historical date, invalid date, today and event import tests: PASS');

const appSource=fs.readFileSync('app.js','utf8');const start=appSource.indexOf('function trainingRowTime('),end=appSource.indexOf('\nfunction ',start+1);vm.runInContext(appSource.slice(start,end),c);assert.equal(c.trainingRowTime('2026-09-14',row).getDate(),14);
