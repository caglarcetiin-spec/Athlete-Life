'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),H=require('./health-core.js');
const raw=(date='10.09.2026',value='42,5')=>({date,lab:'Test Laboratuvarı',fasting:'fasting',rows:[{marker:'ferritin',unit:'ng/mL',value,low:'20',high:'100',comparator:'=',method:'A'}]});
test('strict dates, comma decimals, blank is not zero and absent intervals stay unknown',()=>{
 assert.equal(H.validate(raw()).rows[0].value,42.5);assert.equal(H.date('10.09.2026'),'2026-09-10');
 for(const d of ['31.02.2026','2026-02-29','2026-13-10'])assert.throws(()=>H.date(d));
 assert.throws(()=>H.validate(raw('17.09.2026'),'2026-09-16'));
 for(const v of ['',null,'NaN','Infinity','-1','1,2,3'])assert.throws(()=>H.validate(raw('10.09.2026',v)));
 assert.equal(H.validate(raw('10.09.2026','0')).rows[0].value,0);
 const r=raw();r.rows[0].low='';r.rows[0].high='';assert.equal(H.status(H.validate(r).rows[0]).code,'unknown');
 r.rows[0].low='200';r.rows[0].high='100';assert.throws(()=>H.validate(r));
});
test('inclusive bounds, single limits and censored values do not imply normal health',()=>{
 for(const [v,s] of [[19,'low'],[20,'within'],[100,'within'],[101,'high']])assert.equal(H.status(H.validate(raw(undefined,v)).rows[0]).code,s);
 const row=H.validate(raw()).rows[0];assert.equal(H.status({...row,comparator:'<'}).code,'unknown');
 assert.match(H.status({...row,low:null}).label,/tek sınıra/);
});
test('edit, archive and restore retain history; stale updates fail without mutating db',()=>{
 let db={daily:{'2026-09-10':{pain:3}},sentinel:'preserved'};Object.assign(db,H.saveReport(db,raw()));
 const first=db.healthLabRecords[0],expected=JSON.stringify(first);Object.assign(db,H.saveReport(db,raw(undefined,51),{id:first.id,expected}));
 assert.equal(db.healthLabHistory[1].before.rows[0].value,42.5);assert.equal(db.sentinel,'preserved');assert.throws(()=>H.saveReport(db,raw(),{id:first.id,expected}));
 assert.throws(()=>H.saveReport(db,raw(undefined,51)));
 Object.assign(db,H.archive(db,first.id,true,JSON.stringify(db.healthLabRecords[0])));assert.equal(H.reports(db).valid.length,0);assert.equal(H.reports(db,true).valid.length,1);
 Object.assign(db,H.archive(db,first.id,false,JSON.stringify(db.healthLabRecords[0])));assert.equal(H.reports(db).valid.length,1);assert.equal(db.healthLabHistory.length,4);
});
test('trend separates units, laboratory, method, fasting and reference intervals',()=>{
 let db={};Object.assign(db,H.saveReport(db,raw()));Object.assign(db,H.saveReport(db,raw('12.09.2026',50)));assert.equal(H.series(db).length,1);assert.equal(H.series(db)[0].points.length,2);
 const mutations=[r=>r.rows[0].unit='µg/L',r=>r.lab='Other Lab',r=>r.fasting='nonfasting',r=>r.rows[0].method='B',r=>r.rows[0].high=200];
 mutations.forEach(change=>{const r=raw('13.09.2026');change(r);Object.assign(db,H.saveReport(db,r))});assert.equal(H.series(db).length,6);
 db.healthLabRecords.push({id:'bad',date:'not a date'});assert.equal(H.reports(db).invalid,1);
});
test('sleep overnight and daytime accounting, missing data and preserved health fields',()=>{
 let db={daily:{'2026-09-10':{pain:3,workStart:'08:00'}}};Object.assign(db,H.saveSleep(db,{date:'10.09.2026',sleepTime:'23:00',wakeTime:'07:30',nightAwake:'30',sleepQuality:'4'}));
 assert.equal(db.daily['2026-09-10'].pain,3);assert.equal(db.daily['2026-09-10'].workStart,'08:00');
 const s=H.sleepSummary(db,7,'2026-09-12');assert.equal(s.average,480);assert.equal(s.count,1);assert.equal(s.quality,4);assert.equal(s.points.filter(p=>p.minutes===null).length,6);
 assert.equal(H.sleepEntry({sleepTime:'09:00',wakeTime:'17:00'}).minutes,480);
 for(const r of [{},{sleepTime:'08:00',wakeTime:'08:00'},{sleepTime:'26:00',wakeTime:'07:00'},{sleepTime:'01:00',wakeTime:'02:00',nightAwake:60}])assert.equal(H.sleepEntry(r),null);
 assert.throws(()=>H.saveSleep(db,{date:'10.09.2026',sleepTime:'23:00',wakeTime:'07:00',sleepQuality:6}));
});

test('small laboratory values retain clinically relevant decimal precision',()=>{
 assert.equal(H.formatValue(0.001),'0,001');assert.equal(H.formatValue(0.000015),'0,000015');
 assert.equal(H.formatValue(42.5),'42,5');assert.equal(H.formatValue(45.3-42.5),'2,8');
});
