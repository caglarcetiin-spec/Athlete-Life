const a=require('node:assert/strict'),W=require('./athlete-workspace-core'),K=require('./sports-profile-core');
let db={trainingLogs:{'2026-09-10':[{id:'set1'},{id:'set2'}]},sessionFeedback:{'2026-09-10':{duration:40,rpe:5}},sportSessions:[]};
a.equal(W.ledger(db,{to:'2026-09-16'}).loadAU,200);
const input={sportId:'swimming',date:'10.09.2026',durationMin:45,effort:6,metrics:{distanceM:1000},linkedSessionId:'legacy:2026-09-10'};
Object.assign(db,K.applySession(db,input,{today:'2026-09-16'}));
let result=W.ledger(db,{to:'2026-09-16'});a.equal(result.sessions,1);a.equal(result.loadAU,270);a.equal(result.minutes,45);
a.throws(()=>K.applySession(db,input,{today:'2026-09-16'}),/bağlantısı/);
a.equal(W.linkOptions(db,'2026-09-10').length,0);
a.equal(W.linkOptions(db,'2026-09-10',db.sportSessions[0].id).length,1);
const row=db.sportSessions[0];Object.assign(db,K.applySession(db,{...row,linkedSessionId:null,effort:null},{id:row.id,expected:JSON.stringify(row),today:'2026-09-16'}));
result=W.ledger(db,{to:'2026-09-16'});a.equal(result.sessions,2);a.equal(result.rated,1);a.equal(result.missingEffort,1);a.equal(result.issues[0].code,'possible-overlap');
a.equal(W.ledger({sportSessions:[{id:'zero',date:'2026-09-16',durationMin:30,effort:0}]},{to:'2026-09-16'}).rated,1);
a.equal(W.ledger({sportSessions:[{id:'bad',date:'invalid'}]},{to:'2026-09-16'}).sessions,0);
a.equal(W.ledger({sportSessions:[{id:'same',date:'2026-09-16',durationMin:30,effort:4},{id:'same',date:'2026-09-16',durationMin:30,effort:4}]},{to:'2026-09-16'}).sessions,1);
db.athleteProfile={availability:[0,0,30,0,0,0,0],sports:[{sportId:'swimming'}],equipment:[]};
const draft={name:'Yüzme dönemi',startDate:'2026-09-16',weeks:2,goal:'Düzenli teknik çalışma',blocks:[{id:'wed',day:2,sportId:'swimming',durationMin:45,prescription:'Teknik',progression:'İki hafta gözlem'}]};
a.equal(W.reviewPeriod(db,draft,'2026-09-16').notes.length,1);
a.throws(()=>W.activate(db,{...draft,startDate:'2026-09-15'},'2026-09-16'),/gelecekte/);
Object.assign(db,W.activate(db,draft,'2026-09-16'));
a.equal(W.planned(db,'2026-09-16')[0].week,1);a.equal(W.planned(db,'2026-09-23')[0].week,2);a.equal(W.planned(db,'2026-09-30').length,0);
a.throws(()=>W.activate(db,draft,'2026-09-16'),/zaten/);
const p=db.multisportPeriods[0];a.throws(()=>W.validatePlanLink(db,{date:'2026-09-17',sportId:'swimming',periodId:p.id,planBlockId:'wed'}),/eşleşmiyor/);
Object.assign(db,K.applySession(db,{...input,date:'2026-09-16',linkedSessionId:null,periodId:p.id,planBlockId:'wed'},{today:'2026-09-16'}));
a.equal(W.outcomes(db,p,'2026-09-23').recorded,1);a.equal(W.outcomes(db,p,'2026-09-23').unconfirmed,1);
const next={...draft,name:'Sonraki',startDate:'2026-09-30'};Object.assign(db,W.activate(db,next,'2026-09-16'));a.equal(db.multisportPeriods.length,2);a.equal(db.multisportPeriods[0].id,p.id);
a.equal(W.snapshot(db,'2026-09-16').today.sessions,1);a.equal(W.snapshot(db,'2026-09-16').plan.length,1);
a.equal(W.snapshot(db,'2026-09-16').coverage.quality,'completeness-not-confidence');
const measurements={sportSessions:[
 {id:'a',sportId:'swimming',sportName:'Yüzme',date:'2026-09-10',discipline:'Serbest',conditions:'25 m havuz',metrics:{distanceM:1000,movingMinutes:25}},
 {id:'b',sportId:'swimming',sportName:'Yüzme',date:'2026-09-16',discipline:'Serbest',conditions:'25 m havuz',metrics:{distanceM:1000,movingMinutes:20}},
 {id:'c',sportId:'swimming',sportName:'Yüzme',date:'2026-09-16',discipline:'Serbest',conditions:'Açık su',metrics:{distanceM:1000,movingMinutes:40}}
]};
a.equal(W.progress(measurements,'2026-09-16').length,2);a.equal(W.progress(measurements,'2026-09-16')[0].change,-.5); // Both pace and speed are available; unmatched conditions stay separate.
a.equal(W.ledger({sportSessions:[{id:'chess',date:'2026-09-16',family:'mind',durationMin:60,effort:8}]},{to:'2026-09-16'}).loadAU,0);
console.log('PASS shared ledger: identity dedup, explicit matching, missing data, zero RPE, period review/adoption, conflicts and longitudinal outcomes.');
