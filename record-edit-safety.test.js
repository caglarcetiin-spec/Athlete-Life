// Execute the real UI handlers with synthetic records. No browser storage, API or live data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function harness(){
 const nodes=new Map(),ready=[],alerts=[],noop=()=>{};
 const make=(id='')=>({
  id,value:'',checked:false,hidden:false,textContent:'',innerHTML:'',dataset:{},
  childNodes:[{nodeValue:''}],classList:{add:noop,remove:noop,toggle:noop},
  addEventListener(type,fn){this['on'+type]=fn},
  dispatchEvent(event){this['on'+event.type]?.(event)},
  click(){return this.onclick?.()},focus:noop,
  after(node){nodes.set(node.id,node)}
 });
 for(const match of fs.readFileSync('index.html','utf8').matchAll(/\bid="([^"]+)"/g))
  nodes.set(match[1],make(match[1]));
 const ctx={
  db:{painLogs:{},capabilityRecords:[],bodyMeasurements:[],characterData:{},daily:{}},
  document:{readyState:'loading',addEventListener:(_,fn)=>ready.push(fn),
   getElementById:id=>nodes.get(id)||null,createElement:()=>make(),
   querySelectorAll:()=>[],querySelector:()=>null},
  q:id=>nodes.get(id)||null,EXERCISES:[],todayKey:()=>'2026-09-16',
  Event:class{constructor(type){this.type=type}},
  alert:message=>alerts.push(message),confirm:()=>true,setTimeout:noop,
  clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  avg:a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0,
  renderCharacter:noop,buildFuturePlanV5:noop,renderPainCoach:noop,
  renderCoachV5:noop,renderTodayTrainingPlanV5:noop,renderCommandCenter:noop,
  renderMuscleReport:noop,safeRender:fn=>fn(),console,
  saves:0,failSave:false,persisted:null
 };
 ctx.save=()=>{
  ctx.saves++;
  if(ctx.failSave==='throw')throw new Error('Simulated storage failure');
  if(ctx.failSave==='false')return false;
  ctx.persisted=JSON.stringify(ctx.db);
 };
 ctx.window=ctx;vm.createContext(ctx);
 for(const file of ['capability-catalog.js','pain-intelligence-core.js',
  'pain-intelligence-engine.js','athlete-profile-engine.js'])
  vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
 ready.forEach(fn=>fn());ctx.saves=0;
 return {ctx,node:id=>nodes.get(id),alerts};
}
const snapshot=x=>JSON.stringify(x);
const painRow=()=>({
 id:'pain-original',date:'2026-09-10',joint:'wrist',side:'left',severity:4,
 context:'movement',onset:'gradual',sensation:'ache',durationDays:2,note:'Original',
 redFlags:{swelling:true},status:'resolved',resolvedAt:'2026-09-13T09:00:00Z',
 createdAt:'2026-09-10T10:00:00Z',entryId:'stable-event-id',custom:{source:'fixture'}
});
function seedPain(ctx){
 ctx.db.painLogs={'2026-09-10':[painRow()],
  '2026-09-12':[{...painRow(),id:'other',date:'2026-09-12',redFlags:{},severity:2}]};
}

// Opening/cancelling keeps both the live record and the saved state untouched.
{
 const {ctx,node}=harness();seedPain(ctx);const original=snapshot(ctx.db);
 ctx.PainIntelligence.editEntry('pain-original');
 assert.equal(snapshot(ctx.db),original);assert.equal(ctx.saves,0);
 assert.equal(node('cancelPainEditBtn').hidden,false);
 node('painSeverity').value='8';node('cancelPainEditBtn').click();
 assert.equal(snapshot(ctx.db),original);assert.equal(ctx.saves,0);
 assert.equal(node('cancelPainEditBtn').hidden,true);
 // Sparse flags in a second record must not inherit the first draft's symptoms.
 ctx.PainIntelligence.editEntry('pain-original');assert(node('painFlagSwelling').checked);
 ctx.PainIntelligence.editEntry('other');assert.equal(node('painFlagSwelling').checked,false);
}
// A date correction moves exactly one record, preserving its identity and resolved state.
{
 const {ctx,node}=harness();seedPain(ctx);
 const other=snapshot(ctx.db.painLogs['2026-09-12'][0]),old=ctx.db.painLogs['2026-09-10'][0];
 ctx.PainIntelligence.editEntry(old.id);
 node('painLogDate').value='2026-09-12';node('painSeverity').value='6';node('painNote').value='Updated';
 assert.equal(ctx.PainIntelligence.saveEntry(),true);assert.equal(ctx.saves,1);
 const rows=Object.values(ctx.db.painLogs).flat(),updated=rows.find(r=>r.id===old.id);
 assert.equal(rows.length,2);assert.equal(ctx.db.painLogs['2026-09-10'],undefined);
 assert.equal(snapshot(ctx.db.painLogs['2026-09-12'][0]),other);
 for(const key of ['id','entryId','createdAt','resolvedAt','status'])assert.equal(updated[key],old[key]);
 assert.equal(updated.severity,6);assert.equal(updated.note,'Updated');
 assert.equal(snapshot(updated.custom),snapshot(old.custom));assert(!('_index' in updated));
 assert.equal(snapshot(JSON.parse(ctx.persisted).painLogs),snapshot(ctx.db.painLogs));
}
// Failed commits leave the previous record intact and the draft available for retry.
for(const failure of ['throw','false']){
 const {ctx,node}=harness();seedPain(ctx);const before=snapshot(ctx.db.painLogs);
 ctx.PainIntelligence.editEntry('pain-original');node('painSeverity').value='7';
 ctx.failSave=failure;assert.equal(ctx.PainIntelligence.saveEntry(),false);
 assert.equal(snapshot(ctx.db.painLogs),before);assert.equal(node('painSeverity').value,'7');
 assert.equal(node('cancelPainEditBtn').hidden,false);
 ctx.failSave=false;assert.equal(ctx.PainIntelligence.saveEntry(),true);
 assert.equal(ctx.db.painLogs['2026-09-10'][0].severity,7);
}
for(const change of ['update','delete','replace-db']){
 const {ctx,node}=harness();seedPain(ctx);ctx.PainIntelligence.editEntry('pain-original');
 if(change==='update')ctx.db.painLogs['2026-09-10'][0].note='Another change';
 if(change==='delete')delete ctx.db.painLogs['2026-09-10'];
 if(change==='replace-db')ctx.db=JSON.parse(snapshot(ctx.db));
 const before=snapshot(ctx.db);node('painSeverity').value='9';
 assert.equal(ctx.PainIntelligence.saveEntry(),false);
 assert.equal(snapshot(ctx.db),before);assert.equal(ctx.saves,0);
}
{
 const {ctx,node}=harness();seedPain(ctx);ctx.PainIntelligence.editEntry('pain-original');
 const before=snapshot(ctx.db);
 node('painLogDate').value='2026-09-31';assert.equal(ctx.PainIntelligence.saveEntry(),false);
 node('painLogDate').value='2026-09-10';node('painSeverity').value='Infinity';
 assert.equal(ctx.PainIntelligence.saveEntry(),false);assert.equal(snapshot(ctx.db),before);
 ctx.PainIntelligence.cancelEdit();node('painSeverity').value='3';
 assert.equal(ctx.PainIntelligence.saveEntry(),true);
 assert.equal(Object.values(ctx.db.painLogs).flat().length,3);
 assert.equal(ctx.db.painLogs['2026-09-10'][0].id,'pain-original');
}

const forms=[
 ['calisthenics','capSkill','addSkillCapability','Value'],
 ['strength','capStrength','addStrengthCapability','Load'],
 ['running','capRun','addRunCapability','Minutes'],
 ['power','capPower','addPowerCapability','Value'],
 ['balance_control','capBalance','addBalanceCapability','Value'],
 ['work_capacity','capWork','addWorkCapability','Value'],
 ['mobility','capMobility','addMobilityCapability','Value'],
 ['endurance','capEndurance','addEnduranceCapability','Value']
];
function seedCapability(ctx,domain){
 const definition=ctx.CAPABILITY_CATALOG[domain][0];
 const row={id:123,domain,testId:definition.id,date:'2026-09-10',createdAt:'2026-09-10T09:00:00Z',
  value:10,load:20,reps:5,bodyweight:72,distanceKm:definition.distanceKm||5,minutes:25,
  note:'Original',entryId:'cap-event',custom:{retained:true}};
 ctx.db.capabilityRecords=[row];return row;
}
for(const [domain,prefix,button,field] of forms){
 const {ctx,node}=harness(),old=seedCapability(ctx,domain),before=snapshot(ctx.db);
 ctx.AthleteProfile.edit(old.id);
 assert.equal(snapshot(ctx.db),before,domain+' edit must not mutate');
 assert.equal(ctx.saves,0);assert.equal(node(prefix+'CancelEdit').hidden,false);
 node(prefix+field).value='30';node(prefix+'CancelEdit').click();
 assert.equal(snapshot(ctx.db),before);assert.equal(ctx.saves,0);
 ctx.AthleteProfile.edit(old.id);
 node(prefix+field).value='30';node(prefix+'Date').value='2026-09-12';
 node(button).click();
 assert.equal(ctx.db.capabilityRecords.length,1,domain+' edit must not duplicate');
 assert.equal(ctx.saves,1);const row=ctx.db.capabilityRecords[0];
 assert.equal(row.date,'2026-09-12');
 for(const key of ['id','createdAt','entryId'])assert.equal(row[key],old[key]);
 assert.equal(snapshot(row.custom),snapshot(old.custom));
 assert.equal(node(prefix+'CancelEdit').hidden,true);
 assert.equal(JSON.parse(ctx.persisted).capabilityRecords[0].date,'2026-09-12');
}
for(const [domain,prefix,button,field] of forms){
 const {ctx,node}=harness();seedCapability(ctx,domain);const before=snapshot(ctx.db.capabilityRecords);
 ctx.AthleteProfile.edit(123);node(prefix+field).value='30';ctx.failSave='throw';
 node(button).click();
 assert.equal(snapshot(ctx.db.capabilityRecords),before);
 assert.equal(node(prefix+field).value,'30',domain+' failed save must retain draft');
 assert.equal(node(prefix+'CancelEdit').hidden,false);
 ctx.failSave=false;node(button).click();
 assert.equal(ctx.db.capabilityRecords.length,1);
 assert.equal(node(prefix+'CancelEdit').hidden,true);
}
for(const change of ['update','delete','replace-db']){
 const {ctx,node}=harness();seedCapability(ctx,'strength');ctx.AthleteProfile.edit(123);
 if(change==='update')ctx.db.capabilityRecords[0].load=99;
 if(change==='delete')ctx.db.capabilityRecords=[];
 if(change==='replace-db')ctx.db=JSON.parse(snapshot(ctx.db));
 const before=snapshot(ctx.db);node('capStrengthLoad').value='30';node('addStrengthCapability').click();
 assert.equal(snapshot(ctx.db),before);assert.equal(ctx.saves,0);
}
{
 const {ctx,node}=harness();seedCapability(ctx,'strength');ctx.AthleteProfile.edit(123);
 const before=snapshot(ctx.db);node('capStrengthDate').value='2026-02-29';
 node('addStrengthCapability').click();assert.equal(snapshot(ctx.db),before);assert.equal(ctx.saves,0);
 // A new test in another tab must never replace the pending strength edit.
 node('capPowerSelect').value=ctx.CAPABILITY_CATALOG.power[0].id;
 node('capPowerValue').value='40';node('addPowerCapability').click();
 assert.equal(ctx.db.capabilityRecords.length,2);
 assert.equal(ctx.db.capabilityRecords[0].load,20);
 assert.equal(node('capStrengthCancelEdit').hidden,false);
 ctx.AthleteProfile.cancelEdit('strength');node('capStrengthLoad').value='25';
 node('capStrengthReps').value='5';node('capStrengthBW').value='72';
 node('addStrengthCapability').click();assert.equal(ctx.db.capabilityRecords.length,3);
 assert.equal(new Set(ctx.db.capabilityRecords.map(r=>r.id)).size,3);
}
// Verify the same editors through the actual application persistence/coordinator,
// using the existing integration harness's in-memory storage and fake transport.
{
 const {ctx,element,callbacks,storage}=require('./integration-v9.test.js');
 element('capSkillValueLabel').childNodes=[{nodeValue:''}];
 const profileInit=callbacks.find(fn=>String(fn).includes('bindForms();renderAll()'));
 assert(profileInit);profileInit();
 seedPain(ctx);seedCapability(ctx,'strength');ctx.save();
 const beforePain=snapshot(ctx.db.painLogs);
 ctx.PainIntelligence.editEntry('pain-original');
 assert.equal(snapshot(JSON.parse(storage.athleteLifeOS).painLogs),beforePain);
 element('painLogDate').value='2026-09-12';element('painSeverity').value='6';
 assert.equal(ctx.PainIntelligence.saveEntry(),true);
 let restored=ctx.ALOSDurablePersistence.bootstrap();
 assert.equal(restored.painLogs['2026-09-10'],undefined);
 assert.equal(restored.painLogs['2026-09-12'].length,2);
 assert.equal(restored.painLogs['2026-09-12'].find(r=>r.id==='pain-original').severity,6);

 ctx.AthleteProfile.edit(123);element('capStrengthLoad').value='35';
 element('addStrengthCapability').click();
 restored=ctx.ALOSDurablePersistence.bootstrap();
 assert.equal(restored.capabilityRecords.length,1);
 assert.equal(restored.capabilityRecords[0].id,123);
 assert.equal(restored.capabilityRecords[0].load,35);

 // A real snapshot write failure must preserve disk state as well as the form.
 const originalSetItem=ctx.localStorage.setItem,originalError=ctx.console.error;
 const failNextSnapshot=()=>{
  let failed=false;
  ctx.localStorage.setItem=(key,value)=>{
   if(key==='athleteLifeOS'&&!failed){failed=true;throw new Error('Synthetic write failure')}
   return originalSetItem(key,value);
  };
  ctx.console.error=(...args)=>{
   if(args[0]==='Durable save failed'&&String(args[1]).includes('Synthetic write failure'))return;
   originalError(...args);
  };
 };
 ctx.PainIntelligence.editEntry('pain-original');element('painSeverity').value='8';
 failNextSnapshot();assert.equal(ctx.PainIntelligence.saveEntry(),false);
 assert.equal(ctx.PainIntelligence.findEntry('pain-original').severity,6);
 assert.equal(ctx.ALOSDurablePersistence.bootstrap().painLogs['2026-09-12'].find(r=>r.id==='pain-original').severity,6);
 assert.equal(element('painSeverity').value,'8');
 ctx.localStorage.setItem=originalSetItem;
 assert.equal(ctx.PainIntelligence.saveEntry(),true);

 ctx.AthleteProfile.edit(123);element('capStrengthLoad').value='40';
 failNextSnapshot();element('addStrengthCapability').click();
 assert.equal(ctx.db.capabilityRecords[0].load,35);
 assert.equal(ctx.ALOSDurablePersistence.bootstrap().capabilityRecords[0].load,35);
 assert.equal(element('capStrengthLoad').value,'40');
 ctx.localStorage.setItem=originalSetItem;ctx.console.error=originalError;
 element('addStrengthCapability').click();
 assert.equal(ctx.ALOSDurablePersistence.bootstrap().capabilityRecords[0].load,40);
 const report=ctx.AthleteCoordinator.flush('record edit persistence integration',true);
 assert(report.ok,JSON.stringify(report.errors));
 assert(ctx.ALOSDurablePersistence.health().ok);
}
console.log('PASS: pain + 8 capability editors; non-destructive cancel, identity, date moves, flags, failure/retry, stale records, actual snapshot persistence and coordinator.');
