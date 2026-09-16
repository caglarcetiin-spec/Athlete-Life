const a=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'alos-revision-browser-'));
const server=spawn(process.env.AL_OS_TEST_PYTHON||'.venv-modern/bin/python',['-B','account_server.py','--port','0','--data-dir',root,'--backend','sqlite','--no-browser'],{cwd:__dirname,stdio:['ignore','pipe','pipe']});
let browser;
async function main(){
 const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server timeout')),15000);server.stdout.on('data',s=>{const m=String(s).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0])}});server.once('exit',c=>reject(Error('Server '+c)))});
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.locator('#signup-tab').click();await page.locator('#account-name').fill('Revision Test');await page.locator('#account-username').fill('revision_test');await page.locator('#account-password').fill('temporary revision passphrase');await page.locator('#account-confirm').fill('temporary revision passphrase');await page.locator('#account-submit').click();await page.waitForURL('**/index.html');await page.locator('#setup-back').click();
 a.equal(await page.evaluate(()=>SportScience.coverage().filter(s=>s.model).length),199);
 a.equal(await page.evaluate(()=>AdaptiveNutrition.targets()),null,'new accounts have no inherited nutrition prescription');
 await page.evaluate(()=>AccountPersonalUI.edit());
 for(const [name,value] of Object.entries({kcal:'2400',proteinG:'140',fatG:'80',waterL:'2.5'}))await page.locator('#personal-target-form [name='+name+']').fill(value);
 await page.locator('#personal-target-form button[type=submit]').click();await page.waitForFunction(()=>!document.getElementById('personal-target-editor').open);
 a.equal(await page.evaluate(()=>AdaptiveNutrition.targets().carbsG),280);a.equal(await page.locator('#targetCalories').inputValue(),'2400');
 // Every inherited screen now has the same task heading and works at narrow width.
 const pages=await page.evaluate(()=>AccountDesign.pages);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  for(const id of pages){
   await page.evaluate(id=>AthleteWorkspace.navigate(id),id);
   a(await page.locator('#'+id+' > .design-header').isVisible(),id+' task heading');
   const overflow=await page.evaluate(()=>({width:innerWidth,actual:document.documentElement.scrollWidth,wide:[...document.querySelectorAll('.page.active *')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().right>innerWidth+2).slice(0,6).map(e=>e.tagName+'#'+e.id+'.'+e.className)}));
   a(overflow.actual<=width+1,id+' horizontal overflow '+JSON.stringify(overflow));
   await page.screenshot({path:path.join(root,id+'-'+width+'.png')});
  }
 }
 await page.setViewportSize({width:1440,height:1000});await page.locator('#design-tools-open').click();await page.locator('#design-tools-search').fill('fotoğraf');await page.locator('[data-tool=detailed]').click();a(await page.locator('#detail-body').isVisible());
 await page.evaluate(()=>AthleteWorkspace.navigate('workspace-plan'));await page.locator('#workspace-new-period').click();await page.locator('#period-name').fill('Yapılandırılmış dönem');await page.locator('#period-add').click();
 const day=await page.evaluate(()=>(new Date().getDay()+6)%7);await page.locator('[data-field=day]').selectOption(String(day));await page.locator('[data-field=sportId]').selectOption('strength');await page.locator('[data-field=durationMin]').fill('40');await page.locator('[data-field=prescription]').fill('Kontrollü kuvvet');await page.locator('[data-field=progression]').fill('İki seans hedefi');await page.locator('[data-edit-steps]').click();await page.locator('#program-step-add').click();
 const editor=page.locator('#workout-steps-editor');await editor.locator('[data-step-field=name]').fill('Pull-Up');await editor.locator('[data-step-field=sets]').fill('2');await editor.locator('[data-step-field=reps]').fill('8');await editor.locator('[data-step-field=loadKg]').fill('0');await editor.locator('[data-step-field=rir]').fill('2');await editor.locator('[data-step-field=restSec]').fill('120');await editor.locator('#program-steps-save').click();await page.locator('#period-review').click();await page.locator('#period-activate').click();await page.waitForFunction(()=>!document.getElementById('workspace-period-editor').open);
 await page.evaluate(()=>AthleteWorkspace.navigate('workspace-today'));await page.locator('[data-record-block]').click();await page.locator('#session-minutes').fill('40');await page.locator('#session-effort').fill('5');
 const sets=page.locator('[data-execution]');a.equal(await sets.count(),2);a.equal(await sets.first().locator('[data-actual=reps]').inputValue(),'','targets not copied into actuals');
 for(let i=0;i<2;i++){await sets.nth(i).locator('[data-actual=done]').check();await sets.nth(i).locator('[data-actual=reps]').fill('8');await sets.nth(i).locator('[data-actual=loadKg]').fill('0');await sets.nth(i).locator('[data-actual=rir]').fill('2');}
 await page.locator('#session-save').click();await page.waitForFunction(()=>!document.getElementById('sports-session').open);
 a.equal(await page.evaluate(()=>AthleteWorkspace.snapshot().today.sessions),1);a.equal(await page.evaluate(()=>AthleteWorkspace.snapshot().today.loadAU),200);
 a.equal(await page.evaluate(()=>ALOSRuntime.getDb().trainingLogs[SportsProfileCore.dayKey()].filter(r=>r.source==='sport_program').length),2);
 await page.evaluate(()=>AthleteWorkspace.navigate('workspace-analysis'));a(await page.locator('#science-analysis').innerText().then(t=>t.includes('Kaydedilen direnç seti')));
 await page.evaluate(async()=>{await ALOSServerSync.flush()});await page.reload();await page.waitForFunction(()=>!!window.AccountDesign);a.equal(await page.evaluate(()=>ALOSRuntime.getDb().sportSessions[0].workout.recordedSets),2);a.equal(await page.evaluate(()=>AdaptiveNutrition.targets().kcal),2400);
 // Backfill a distinct sport, then verify advanced metric entry and source-aware analysis.
 await page.evaluate(()=>AthleteSports.openSession(null,'swimming'));await page.locator('#session-date').fill('10.09.2026');await page.locator('#session-minutes').fill('40');await page.locator('#session-effort').fill('4');await page.locator('#session-discipline').fill('Serbest');await page.locator('#session-conditions').fill('25 m havuz');await page.locator('[data-metric=distanceM]').fill('1000');await page.locator('[data-metric=movingMinutes]').fill('20');await page.locator('[data-metric=poolLengthM]').fill('25');await page.locator('#session-save').click();await page.waitForFunction(()=>!document.getElementById('sports-session').open);
 a(await page.evaluate(()=>ALOSRuntime.getDb().sportSessions.some(r=>r.date==='2026-09-10')));
 await page.evaluate(()=>AthleteWorkspace.navigate('workspace-analysis'));await page.locator('#science-sport').selectOption('swimming');a((await page.locator('#science-sport-detail').innerText()).includes('Aktif tempo'));
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'science-final-mobile.png')});a(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 a.deepEqual(errors,[]);console.log('PASS: all 11 inherited screens desktop/mobile, task navigation, structured plan/actual/legacy projection, persistence, historical date and sport-specific analysis.');console.log('Screenshots: '+root);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.kill('SIGTERM');for(const f of fs.readdirSync(root))if(!f.endsWith('.png'))fs.rmSync(path.join(root,f),{recursive:true,force:true});});
