const a=require('node:assert/strict'),C=require('./sport-catalog'),S=require('./sport-science-engine'),K=require('./sports-profile-core');
a.equal(S.coverage().length,199);a(S.coverage().every(s=>s.model),'every catalogue branch needs an explicit model');
a.equal(Object.keys(S.models).length,26);
for(const sport of C.sports){
 const d=S.definition(sport);a(d.focus&&d.conditions&&d.sources.length);a.equal(new Set(d.fields.map(f=>f[0])).size,d.fields.length);
 for(const id of d.sources)a(S.sources[id]?.url.startsWith('https://'));
 const input={sportId:sport.id,date:'2026-09-16',durationMin:60,metrics:{}};
 const row=K.validateSession(input,[],'2026-09-16');a.equal(row.measurementModel.id,d.modelId);a.deepEqual(S.measurements(row),[]);
}
const base={sportId:'swimming',date:'2026-09-16',durationMin:60,discipline:'Serbest',conditions:'25 m, aynı çıkış',metrics:{distanceM:1000,movingMinutes:20,poolLengthM:25,test200Sec:180,test400Sec:390}};
const swim=K.validateSession(base,[],'2026-09-16');a.equal(S.measurements(swim).find(x=>x.id==='pace').value,2);a.equal(S.measurements(swim).find(x=>x.id==='css').value,1.75);
for(const patch of [{conditions:''},{metrics:{...base.metrics,test400Sec:350}},{metrics:{test200Sec:180,poolLengthM:25}},{durationMin:5}])a.throws(()=>K.validateSession({...base,...patch},[],'2026-09-16'));
const cycling=K.validateSession({...base,sportId:'road-cycling',metrics:{distanceKm:30,movingMinutes:60,powerW:200,cadence:90}},[],'2026-09-16');
a.equal(S.measurements(cycling).find(v=>v.id==='mechanicalWork').value,720);a(!S.measurements(cycling).some(v=>/kcal|hasar|risk/.test(v.label)));
for(const [sport,metrics] of [['football',{shots:10,shotsOnTarget:11}],['tennis',{pointsPlayed:10,pointsWon:12}],['chess',{matches:1,wins:2}],['bouldering',{routesCompleted:3}],['boxing',{workMinutes:45,restMinutes:30}]])a.throws(()=>K.validateSession({...base,sportId:sport,metrics},[],'2026-09-16'));
const adapted=S.definition('para-swimming');a(adapted.adapted);a.equal(adapted.optionalTests.length,0,'no adult competition test extrapolation to adapted swimming');
const custom=K.customSport('Test tekniği','precision','precision');const r=K.validateSession({...base,sportId:custom.id,metrics:{attempts:10,hits:8}},[custom],'2026-09-16');a.equal(S.measurements(r,[custom])[0].value,80);
const rows=[{...swim,id:'one',date:'2026-09-15'},{...swim,id:'two',date:'2026-09-16',metrics:{...swim.metrics,movingMinutes:19}},{...swim,id:'three',conditions:'50 m havuz',metrics:{...swim.metrics,movingMinutes:18}}];
const compare=S.compare(rows).find(v=>v.id==='pace');a.equal(compare.count,2);a(Math.abs(compare.change+.1)<1e-9);
a.deepEqual(S.compare([{...rows[0],conditions:''},rows[1]]),[]);
const review=S.reviewBlocks([{day:0,sportId:'strength',sportName:'Kuvvet'},{day:0,sportId:'running',sportName:'Koşu',targetRir:2}],{goals:['hybrid']});a(review.some(n=>n.source==='hybrid'));a(review.some(n=>n.source==='rir'));
console.log('PASS: complete model mapping, measured vs estimated output, protocol-specific comparisons, missing data and invalid metrics.');
