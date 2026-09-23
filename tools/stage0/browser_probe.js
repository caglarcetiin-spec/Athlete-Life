// Anonymous reference screens and persistence observations against a temporary
// SQLite server. No live URLs, real backups, personal photos or body model loaded.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn,execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'docs/evidence/stage-0/browser');fs.mkdirSync(out,{recursive:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'alos-stage0-browser-'));
const password='Synthetic audit password 2026';
let server,browser,origin;
const report={source_commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),started_at:new Date().toISOString(),fixture:'synthetic account; local SQLite; personal GLB blocked',screens:[],errors:[],observations:{}};
function launchServer(){return new Promise((resolve,reject)=>{
 const env={...process.env,STORAGE_BACKEND:'sqlite',ACCOUNT_STORAGE_BACKEND:'sqlite',PYTHON_DOTENV_DISABLED:'1'};
 for(const k of Object.keys(env))if(/MONGODB|ALOS_PUBLIC|RENDER_EXTERNAL/.test(k))delete env[k];
 server=spawn(process.env.AL_OS_TEST_PYTHON||path.join(root,'.venv-modern/bin/python'),['-B','account_server.py','--port','0','--backend','sqlite','--data-dir',temp,'--no-browser'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
 const timeout=setTimeout(()=>reject(Error('local server timeout')),15000);
 server.stdout.on('data',c=>{const m=String(c).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timeout);origin=m[0];resolve(origin)}});
 server.once('exit',code=>{clearTimeout(timeout);reject(Error('server exit '+code))});
 });}
async function context(){const c=await browser.newContext({viewport:{width:1280,height:900},timezoneId:'Europe/Istanbul',reducedMotion:'reduce'});await c.route('**/*.glb*',r=>r.abort());return c;}
async function ready(page){await page.waitForFunction(()=>window.ALOSRuntime&&window.AthleteWorkspace&&window.ALOSServerSync);await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close())});}
async function login(page){await page.goto(origin);await page.locator('#account-username').fill('stage0_athlete');await page.locator('#account-password').fill(password);await page.locator('#account-submit').click();await page.waitForURL('**/index.html');await ready(page);}
async function state(page){return page.evaluate(async()=>{const r=await fetch('/api/state',{headers:ALOSAccount.headers()});return r.json()});}
async function main(){
 await launchServer();browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 report.browser=browser.version();report.timezone='Europe/Istanbul';report.viewport={width:1280,height:900};
 const c=await context(),p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto(origin);await p.screenshot({path:path.join(out,'login-desktop.png')});
 await p.locator('#signup-tab').click();await p.locator('#account-name').fill('Deneme Sporcusu');await p.locator('#account-username').fill('stage0_athlete');await p.locator('#account-password').fill(password);await p.locator('#account-confirm').fill(password);await p.locator('#account-submit').click();await p.waitForURL('**/index.html');await ready(p);
 await p.evaluate(async()=>{const d=ALOSRuntime.getDb();d.settings.interfaceMode='professional';d.settings.welcomeCompletedAt=new Date().toISOString();ALOSRuntime.save();await ALOSServerSync.flush();window.dispatchEvent(new CustomEvent('alos:interface-mode'));});
 const routes=await p.evaluate(()=>Array.from(document.querySelectorAll('section.page')).map(e=>e.id));
 for(const route of routes){
  await p.evaluate(r=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());AthleteWorkspace.navigate(r)},route);
  await p.waitForTimeout(80);
  const detail=await p.evaluate(r=>({route:r,visible:!!document.getElementById(r)&&getComputedStyle(document.getElementById(r)).display!=='none',title:document.getElementById('pageTitle')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth}),route);
  if(detail.visible){detail.file=route+'.png';await p.screenshot({path:path.join(out,detail.file)});}
  report.screens.push(detail);
 }
 await p.evaluate(()=>AthleteWorkspace.navigate('week'));await p.waitForTimeout(150);
 const before=await state(p);await p.route('**/api/state',r=>r.request().method()==='POST'?r.abort():r.continue());
 await p.locator('#ws1').selectOption('work');await p.locator('#wsh1').selectOption('evening');
 report.observations.week_offline=await p.evaluate(()=>({toast:document.getElementById('weekSaveStatus').textContent,status:ALOSServerSync.status(),selectedWeek:db.uiState?.weekSelectedDate||weekPlannerDate()}));
 await p.screenshot({path:path.join(out,'week-offline.png')});
 await p.unroute('**/api/state');assert(await p.evaluate(()=>ALOSServerSync.flush()));
 await p.locator('#optimizeWeekBtn').count().then(async n=>{if(n)await p.locator('#optimizeWeekBtn').click();else await p.evaluate(()=>optimizeWeek())});
 assert(await p.evaluate(()=>ALOSServerSync.flush()));
 const after=await state(p),key=Object.keys(after.data.weekOptimizations)[0];
 report.observations.week_ack={before_revision:before.revision,after_revision:after.revision,week:key,structured_rows:after.data.weekOptimizations[key].rows.length};
 const c2=await context(),p2=await c2.newPage();await login(p2);const remote=await state(p2);
 assert.deepEqual(remote.data.scheduleByDate,after.data.scheduleByDate);assert.deepEqual(remote.data.weekOptimizations,after.data.weekOptimizations);
 report.observations.second_context={schedule_equal:true,optimization_equal:true};
 await c2.close();
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>AthleteWorkspace.navigate('simple-home'));await p.screenshot({path:path.join(out,'today-mobile.png')});
 report.observations.mobile={viewport:{width:390,height:844},overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
 // Deterministic midnight without waiting: run the actual registered 60s callback.
 report.observations.midnight=await p.evaluate(()=>{
  const old=setInterval,oldCalendar=calendarTodayKey,oldSave=save,oldRender=safeRender;let tick,day='2026-09-16';
  const selected=db.uiState.trainingSelectedDate;db.uiState.trainingSelectedDate='2026-09-10';
  try{window.setInterval=(fn,ms)=>{if(ms===60000)tick=fn;return 0};calendarTodayKey=()=>day;save=()=>{};safeRender=()=>{};initTrainingDateNavigation();day='2026-09-17';tick();return {before:'2026-09-10',after:db.uiState.trainingSelectedDate,history_context_preserved:db.uiState.trainingSelectedDate==='2026-09-10'};}
  finally{window.setInterval=old;calendarTodayKey=oldCalendar;save=oldSave;safeRender=oldRender;db.uiState.trainingSelectedDate=selected}
 });
 // Test the in-app diagnostic only in this disposable account.
 report.observations.integrity=await p.evaluate(async()=>{
  const before=JSON.stringify(ALOSRuntime.getDb()),writes=[];const push=ALOSServerSync.push;
  ALOSServerSync.push=(data,reason)=>{writes.push({reason,trainingDays:Object.keys(data.trainingLogs||{}).length});return true};
  try{const r=await SystemIntegrity.run();return {total:r.total,failed:r.failed,failures:r.tests.filter(t=>!t.ok).map(t=>({name:t.name,category:t.category})),save_attempts:writes,raw_state_identical:before===JSON.stringify(ALOSRuntime.getDb())};}finally{ALOSServerSync.push=push}
 });
 await c.close();await new Promise(resolve=>{server.once('exit',resolve);server.kill('SIGTERM')});await launchServer();
 const c3=await context(),p3=await c3.newPage();await login(p3);const restarted=await state(p3);
 assert.deepEqual(restarted.data.scheduleByDate,after.data.scheduleByDate);assert.deepEqual(restarted.data.weekOptimizations,after.data.weekOptimizations);
 report.observations.restart_fresh_context={schedule_equal:true,optimization_equal:true};await c3.close();
 console.log('Completed anonymous routes, offline toast, ACK, two contexts, fresh login/server restart, midnight and integrity probes.');
}
main().catch(e=>{report.fatal=e.stack;console.error(e);process.exitCode=1}).finally(async()=>{
 report.finished_at=new Date().toISOString();fs.writeFileSync(path.join(out,'observations.json'),JSON.stringify(report,null,2)+'\n');
 if(browser)await browser.close();if(server)server.kill('SIGTERM');fs.rmSync(temp,{recursive:true,force:true});
});
