'use strict';
const assert=require('node:assert/strict');global.window=global;
const P=require('./personal-health-core'),G=require('./account-guidance-core'),H=require('./health-state-engine');
require('./sport-catalog');require('./sport-science-engine');const WP=require('./workout-program-core');require('./sports-profile-core');const W=require('./athlete-workspace-core');
const today='2026-09-16',profile={birthDate:'1990-09-17',sex:'female',trainingHistory:'advanced',cycleTracking:true};
const base=()=>({settings:{theme:'dark',personalTargets:{kcal:2100}},personalHealthProfile:{...profile},daily:{},healthEpisodes:[],personalHealthHistory:[],cycleDays:{},trainingLogs:{'2026-09-01':[{name:'Squat',sets:[5],load:40}]}});
const episode=(db,values={})=>P.saveEpisode(db,{kind:'illness',state:'recovering',startDate:'2026-09-07',recoveryDate:'2026-09-14',assessmentDate:today,severity:1,symptoms:{},...values},{on:today});
assert.equal(P.age(profile,today),35);assert.equal(P.age(profile,'2026-09-17'),36);
assert.throws(()=>P.validateProfile({...profile,birthDate:'31.02.1990'},today));assert.throws(()=>P.validateProfile({...profile,birthDate:'2027-01-01'},today));
let db=base();assert.equal(G.mode(db),'simple');const prefs=G.settings(db,'professional');assert.equal(prefs.settings.theme,'dark');assert.deepEqual(prefs.settings.personalTargets,db.settings.personalTargets);assert.equal(G.mode({...db,...prefs}),'professional');assert.equal(G.roadmap(db).find(x=>x.id==='move').done,true);assert.throws(()=>G.settings(db,'invalid'));
assert.equal(P.context(db,today).level,'normal');assert.deepEqual(P.context({...db,personalHealthProfile:{...profile,sex:'male'}},today).proposal,null);
// A bleeding day alone must not lower training or imply impaired muscle growth.
db={...db,...P.saveCycle(db,{date:today,bleeding:'medium',cycleStart:true,pain:0,fatigue:0},JSON.stringify(null),today)};
assert.equal(P.context(db,today).level,'normal');assert.equal(P.dose(db,today).volumeFactor,1);
const cycleOld=JSON.stringify(db.cycleDays[today]);db={...db,...P.saveCycle(db,{date:today,bleeding:'heavy',pain:5,fatigue:6},cycleOld,today)};
assert.equal(P.context(db,today).level,'ease');assert.equal(P.dose(db,today).volumeFactor,.7);assert(P.context(db,today).nutrition.length);
assert.equal(P.context(db,'2026-09-15').cycle,null);assert.equal(P.context({...db,personalHealthProfile:{...profile,cycleTracking:false}},today).level,'normal');
assert.throws(()=>P.saveCycle(db,{date:today,bleeding:'none'},cycleOld,today));assert.throws(()=>P.saveCycle(db,{date:'2026-09-17',bleeding:'none'},undefined,today));
assert.equal(db.personalHealthHistory.filter(h=>h.kind==='cycle').length,2);
// No invented recovery from the calendar. Current symptoms beat past athletic experience.
db=base();db={...db,...episode(db)};let c=P.context(db,today);assert.equal(c.level,'ease');assert(c.proposal);assert.equal(H.assessFor(db,today).action,'reduce');
assert.equal(P.context(db,'2026-09-19').level,'review');assert.equal(P.dose(db,'2026-09-19').blocked,true);
assert.equal(P.context(db,'2026-09-06').level,'normal');assert.equal(P.context(db,'2026-09-10').level,'review');
assert.equal(P.context({...db,daily:{[today]:{healthFever:true}}},today).level,'stop');assert.equal(H.assessFor({...db,daily:{[today]:{healthChestBreathing:true}}},today).volumeFactor,0);
assert.equal(P.dose({...db,personalHealthProfile:{...profile,birthDate:'2012-01-01'}},today).blocked,true);assert.equal(P.context({...db,personalHealthProfile:{...profile,birthDate:null}},today).proposal,null);
assert.equal(P.dose({...db,personalHealthProfile:{...profile,birthDate:null}},today).blocked,true);
assert(P.context({...db,personalHealthProfile:{...profile,birthDate:'1950-01-01'}},today).notes.some(n=>n.message.includes('denge')));
const injury={...base(),...episode(base(),{kind:'injury',region:'Diz',clinicianReturn:false})};assert.equal(P.context(injury,today).level,'review');
assert.throws(()=>episode(base(),{state:'resolved',recoveryDate:'2026-09-14',endDate:today,severity:1}));assert.throws(()=>episode(base(),{recoveryDate:'2026-09-01'}));
const before=db.healthEpisodes[0];db={...db,...P.saveEpisode(db,{...before,state:'resolved',endDate:today,severity:0},{id:before.id,expected:JSON.stringify(before),on:today})};assert.equal(P.context(db,today).level,'normal');assert.equal(db.personalHealthHistory.length,2);assert(db.trainingLogs['2026-09-01']);
// A new daily entry merges with existing sleep, pain and medication-free health flags.
db={...base(),daily:{[today]:{sleepTime:'23:00',wakeTime:'07:00',healthFever:true,painKnee:6}}};const daily=JSON.stringify(db.daily[today]);db={...db,...P.saveCheckin(db,{date:today,energy:4,fatigueLevel:5},daily,today)};assert.equal(db.daily[today].sleepTime,'23:00');assert.equal(db.daily[today].healthFever,true);assert.equal(db.daily[today].painKnee,6);assert.throws(()=>P.saveCheckin(db,{date:today,energy:4,fatigueLevel:5},daily,today));
// New and existing profile data remain separate from interface complexity.
db=base();const personal=P.saveProfile(db,{...profile,sex:'male',cycleTracking:false},JSON.stringify(db.personalHealthProfile),today);assert.deepEqual(personal.personalHealthHistory[0].before,profile);assert.equal(G.mode({...db,...personal}),'simple');
// Derived targets are lower; source periods and completed session snapshots remain immutable.
db=base();db={...db,...episode(db)};const block={id:'block',day:2,sportId:'strength',sportName:'Kuvvet',durationMin:60,targetRir:1,steps:[{id:'step',name:'Squat',type:'resistance',sets:4,reps:8,seconds:null,distanceM:null,loadKg:40,rir:1,restSec:120,progressionMetric:'loadKg',increment:2}]};
db.multisportPeriods=[{id:'period',name:'Main',startDate:'2026-09-14',endDate:'2026-10-11',blocks:[block]}];const original=JSON.stringify(db.multisportPeriods);
const planned=W.planned(db,today)[0];assert.equal(planned.durationMin,42);assert.equal(planned.steps[0].sets,2);assert.equal(planned.steps[0].loadKg,36);assert.equal(planned.steps[0].rir,3);assert.equal(JSON.stringify(db.multisportPeriods),original);
const execution=WP.execution(db,{date:today,periodId:'period',planBlockId:'block',workout:{actual:[]}},null);assert.equal(execution.plannedSets,2);
const previous={periodId:'period',planBlockId:'block',workout:{steps:block.steps,actual:[]}};assert.equal(WP.execution(db,{date:today,periodId:'period',planBlockId:'block'},previous).plannedSets,4);
db={...db,...P.adoptWeek(db,{volumeFactor:.6,loadFactor:.8,minRir:4},today)};assert.equal(P.dose(db,today).volumeFactor,.6);assert.equal(P.dose(db,today).loadFactor,.8);assert.equal(JSON.stringify(db.multisportPeriods),original);
assert.equal(P.context(db,'2026-09-23').adaptation,null);assert.equal(P.dose({...db,daily:{[today]:{healthFever:true}}},today).blocked,true);
const active=db.healthAdjustments[0];db={...db,...P.cancelWeek(db,active.id,today)};assert.equal(P.context(db,today).adaptation,null);assert(db.healthAdjustments[0].cancelledAt);
assert.throws(()=>P.adoptWeek(db,{volumeFactor:1.5,loadFactor:1,minRir:3},today));
console.log('Personal health + guidance: profile, cycle, episode, check-in, safety, week, immutable plans and execution integration PASS');

const retained={...db,healthAdjustments:[{...active,cancelledAt:'2026-09-18T00:00:00Z',cancelledOn:'2026-09-18'}]};assert(P.context(retained,'2026-09-17').adaptation);assert.equal(P.context(retained,'2026-09-18').adaptation,null);
const noTimestamps={...base(),healthEpisodes:[{...before,updatedAt:undefined}],personalHealthHistory:[{kind:'episode',id:before.id,after:{...before,updatedAt:undefined}}]};assert.equal(P.context(noTimestamps,today).level,'ease');
