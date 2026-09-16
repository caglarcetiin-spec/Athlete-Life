// Local end-to-end scenario, with an isolated temporary SQLite account server.
// NODE_PATH must contain Playwright; AL_OS_TEST_PYTHON can select the Python runtime.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'alos-accounts-browser-'));
const server=spawn(process.env.AL_OS_TEST_PYTHON||'.venv-modern/bin/python',['-B','account_server.py','--port','0','--data-dir',root,'--backend','sqlite','--no-browser'],{cwd:__dirname,stdio:['ignore','pipe','pipe']});
const password='temporary browser test password';
let browser;
async function main(){
 const origin=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Test server did not start')),10000);
  server.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0])}});
  server.once('exit',code=>{clearTimeout(timer);reject(new Error('Test server exited '+code))});
 });
 browser=await chromium.launch({headless:true,executablePath:process.env.AL_OS_TEST_BROWSER||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const a=await context.newPage(),errors=[];
 a.on('pageerror',error=>errors.push(error.message));
 await a.goto(origin);await a.screenshot({path:path.join(root,'welcome-desktop.png')});
 await a.setViewportSize({width:390,height:844});
 assert(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await a.screenshot({path:path.join(root,'welcome-mobile.png')});
 await a.setViewportSize({width:1280,height:900});
 async function signup(page,username,name){
  await page.goto(origin);await page.getByRole('button',{name:'Profil oluştur',exact:true}).click();
  await page.locator('#account-name').fill(name);await page.locator('#account-username').fill(username);
  await page.locator('#account-password').fill(password);await page.locator('#account-confirm').fill(password);
  await page.getByRole('button',{name:'Profilimi oluştur',exact:true}).click();
  await page.waitForURL('**/index.html');await page.waitForFunction(()=>window.ALOSRuntime&&window.ALOSAccount&&window.AthleteCoordinator);
  await page.waitForFunction(()=>document.getElementById('accountSyncStatus'));
  await page.locator('#sports-setup #setup-back').click();
  await page.evaluate(async()=>{await ALOSServerSync.flush()});
 }
 await signup(a,'athlete_a','Sporcu A');
 await a.evaluate(async()=>{
  const d=ALOSRuntime.getDb();d.daily[todayKey()]={healthNote:'A private marker'};ALOSRuntime.save();
  if(!(await ALOSServerSync.flush()))throw new Error('A save failed');
  localStorage.setItem('isolation-test','A');
  await new Promise((resolve,reject)=>{const request=indexedDB.open('AthleteLifeOSPhotos',1);request.onupgradeneeded=()=>request.result.createObjectStore('checkins',{keyPath:'id'});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const database=request.result,tx=database.transaction('checkins','readwrite');tx.objectStore('checkins').put({id:123,date:todayKey(),photos:{},marker:'A photo'});tx.oncomplete=()=>{database.close();resolve()};tx.onerror=()=>reject(tx.error)}});
 });
 const b=await context.newPage();b.on('pageerror',error=>errors.push(error.message));
 await signup(b,'athlete_b','Sporcu B');
 await a.waitForSelector('.account-lock');
 assert.equal(await b.evaluate(()=>localStorage.getItem('isolation-test')),null);
 assert(!(await b.evaluate(()=>JSON.stringify(ALOSRuntime.getDb()))).includes('A private marker'));
 assert.equal(await a.evaluate(async()=>{const response=await fetch('/api/state',{method:'POST',headers:ALOSAccount.headers(),body:JSON.stringify({baseRevision:0,data:{wrongOwner:true}})});return response.status}),403);
 const photos=await b.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('AthleteLifeOSPhotos',1);request.onupgradeneeded=()=>request.result.createObjectStore('checkins',{keyPath:'id'});request.onsuccess=()=>{const database=request.result,read=database.transaction('checkins').objectStore('checkins').getAll();read.onsuccess=()=>{resolve(read.result);database.close()};read.onerror=()=>reject(read.error)}}));
 assert.deepEqual(photos,[]);
 await b.getByRole('button',{name:'Hesabım: Sporcu B'}).click();await b.getByRole('button',{name:'Çıkış yap',exact:true}).click();
 await b.waitForURL('**/accounts.html');
 await b.locator('#account-username').fill('athlete_a');await b.locator('#account-password').fill(password);
 await b.getByRole('button',{name:'Giriş yap',exact:true}).last().click();
 await b.waitForURL('**/index.html');await b.waitForFunction(()=>window.ALOSRuntime);
 assert((await b.evaluate(()=>JSON.stringify(ALOSRuntime.getDb()))).includes('A private marker'));
 assert.equal(await b.evaluate(()=>localStorage.getItem('isolation-test')),'A');
 assert.deepEqual(errors,[],'Browser page errors');
 console.log('PASS: real browser signup, login, logout, mobile layout, two-account isolation, old-tab lock, photo isolation and relogin persistence.');
 console.log('Screenshots: '+root);
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
 if(browser)await browser.close();
 server.kill('SIGTERM');
 // Keep only screenshots for visual review; remove all synthetic account databases.
 for(const name of fs.readdirSync(root))if(!name.endsWith('.png'))fs.rmSync(path.join(root,name),{recursive:true,force:true});
});
