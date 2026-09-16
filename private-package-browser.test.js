/* Delivery rehearsal. Uses a temporary local SQLite store; never writes to MongoDB. */
const a=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const app=process.env.AL_OS_PRIVATE_PACKAGE||__dirname,seedPath=path.join(app,'private-data/first-profile.alosbackup');
if(!fs.existsSync(seedPath)){console.log('SKIP: extracted private package required (AL_OS_PRIVATE_PACKAGE).');process.exit(0)}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'alos-private-rehearsal-')),password='temporary package rehearsal passphrase';
let browser,server,origin;
function stable(v){return v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}'}
function counts(d){return Object.fromEntries(['daily','trainingLogs','foodLogs','waterLogs','scheduleByDate','bodyMeasurements','capabilityRecords'].map(k=>[k,Array.isArray(d[k])?d[k].length:Object.keys(d[k]||{}).length]))}
async function start(){
 server=spawn('./START_LOCAL_MAC.command',['--backend','sqlite','--port','0','--data-dir',tmp,'--no-browser'],{cwd:app,stdio:['ignore','pipe','pipe']});
 return await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('Bundled launcher timeout')),20000);server.stdout.on('data',b=>{out+=b;const m=out.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0])}});server.once('exit',code=>{clearTimeout(timer);reject(Error('Bundled launcher exited '+code))})});
}
async function stop(){if(server&&server.exitCode===null){const done=new Promise(resolve=>server.once('exit',resolve));server.kill('SIGTERM');await done}}
async function main(){
 const seed=JSON.parse(fs.readFileSync(seedPath)),expectedDigest=seed.integrity.sha256;delete seed.integrity;
 a.equal(crypto.createHash('sha256').update(stable(seed)).digest('hex'),expectedDigest,'portable backup is compatible with browser integrity checks');
 origin=await start();browser=await chromium.launch({headless:true,executablePath:process.env.AL_OS_TEST_BROWSER||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);a((await page.locator('body').innerText()).includes('ilk oluşturulan hesaba'));
 const registered=await context.request.post(origin+'/api/auth/signup',{headers:{Origin:origin},data:{username:'private_owner',password,name:'Paket Denemesi'}});a.equal(registered.status(),200);
 const auth=await context.request.get(origin+'/api/auth/session'),user=(await auth.json()).user;
 const headers={'X-ALOS-Account':user.id};
 const initial=await(await context.request.get(origin+'/api/state',{headers})).json();a.equal(initial.database,'sqlite');
 const original={...seed.data},actual={...initial.data};delete original.meta;delete actual.meta;
 a(stable(original)===stable(actual),'seed content must arrive intact before any app calculations');
 for(const file of ['.env','private-data/first-profile.alosbackup','private-data/original-server.env','runtime/python/bin/python3','accounts.test.py'])a.equal((await context.request.get(origin+'/'+file)).status(),404,'private HTTP path '+file);
 await page.goto(origin+'/index.html');await page.waitForFunction(()=>!!window.AccountDesign);
 if(await page.locator('#sports-setup').isVisible())await page.locator('#setup-back').click();
 a.deepEqual(await page.evaluate(()=>Object.fromEntries(['daily','trainingLogs','foodLogs','waterLogs','scheduleByDate','bodyMeasurements','capabilityRecords'].map(k=>[k,Array.isArray(ALOSRuntime.getDb()[k])?ALOSRuntime.getDb()[k].length:Object.keys(ALOSRuntime.getDb()[k]||{}).length]))),counts(seed.data),'record counts survive app load');
 await page.evaluate(()=>AthleteWorkspace.navigate('reports'));await page.waitForFunction(()=>document.getElementById('bodyMap3DStatus').textContent.includes('Hazır'),null,{timeout:60000});
 a(await page.locator('#bodyMap3DCanvas').isVisible(),'bundled GLB renders without upload');
 await page.locator('#bodyMap3DCanvas').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(tmp,'bundled-body-model.png')});
 await page.evaluate(async()=>{const d=ALOSRuntime.getDb();d.settings.privateDeliveryRehearsal='retained';ALOSRuntime.save();if(!(await ALOSServerSync.flush()))throw Error('Temporary save failed')});
 const other=await browser.newContext();const created=await other.request.post(origin+'/api/auth/signup',{headers:{Origin:origin},data:{username:'private_friend',password,name:'İkinci Profil'}});a.equal(created.status(),200);
 const b=(await(await other.request.get(origin+'/api/auth/session')).json()).user;
 const empty=await(await other.request.get(origin+'/api/state',{headers:{'X-ALOS-Account':b.id}})).json();a.equal(empty.data,null,'second account must not receive personal backup');await other.close();
 await context.close();await stop();origin=await start();
 const reopened=await browser.newContext();a.equal((await reopened.request.post(origin+'/api/auth/login',{headers:{Origin:origin},data:{username:'private_owner',password}})).status(),200);
 const saved=await(await reopened.request.get(origin+'/api/state',{headers})).json();a.equal(saved.data.settings.privateDeliveryRehearsal,'retained','restart must not reapply seed');
 a.deepEqual(errors,[]);await reopened.close();console.log('PASS: bundled launcher/runtime, browser-compatible backup integrity, original records, rendered built-in GLB, private HTTP protection, first-account import, second-account isolation, restart without reseeding.');
 console.log('Screenshot: '+path.join(tmp,'bundled-body-model.png'));
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();await stop();for(const f of fs.readdirSync(tmp))if(!f.endsWith('.png'))fs.rmSync(path.join(tmp,f),{recursive:true,force:true})});
