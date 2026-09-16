const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'alos-workspace-browser-'));
const server=spawn(process.env.AL_OS_TEST_PYTHON||'.venv-modern/bin/python',['-B','account_server.py','--port','0','--data-dir',root,'--backend','sqlite','--no-browser'],{cwd:__dirname,stdio:['ignore','pipe','pipe']});
let browser;
const password='temporary integration passphrase 2026';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nmwAAAABJRU5ErkJggg==';
async function photoWrite(page,row){return page.evaluate(row=>new Promise((resolve,reject)=>{const r=indexedDB.open('AthleteLifeOSPhotos',1);r.onupgradeneeded=()=>r.result.createObjectStore('checkins',{keyPath:'id'});r.onsuccess=()=>{const d=r.result,t=d.transaction('checkins','readwrite');t.objectStore('checkins').put(row);t.oncomplete=()=>{d.close();resolve()};t.onerror=()=>reject(t.error)}}),row)}
async function photoRead(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('AthleteLifeOSPhotos',1);r.onsuccess=()=>{const d=r.result,t=d.transaction('checkins'),get=t.objectStore('checkins').getAll();t.oncomplete=()=>{d.close();resolve(get.result)};t.onerror=()=>reject(t.error)}}))}
async function main(){
 const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server timeout')),10000);server.stdout.on('data',chunk=>{const m=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0])}});server.once('exit',c=>{clearTimeout(timer);reject(new Error('Server '+c))})});
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const a=await browser.newContext({viewport:{width:1365,height:1000}}),page=await a.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.locator('#signup-tab').click();await page.locator('#account-name').fill('Test Sporcusu');await page.locator('#account-username').fill('workspace_a');await page.locator('#account-password').fill(password);await page.locator('#account-confirm').fill(password);await page.locator('#account-submit').click();await page.waitForURL('**/index.html');
 await page.locator('#sports-setup #setup-back').click();await page.waitForFunction(()=>!!window.AthleteWorkspace?.snapshot());
 assert.equal(await page.locator('.workspace-nav button').count(),5);
 await page.locator('[data-workspace-group=plan]').click();await page.locator('#workspace-new-period').click();
 await page.locator('#period-name').fill('Hibrit deneme');await page.locator('#period-goal').fill('Teknik ve süre takibi');await page.locator('#period-weeks').fill('2');await page.locator('#period-add').click();
 const day=await page.evaluate(()=>(new Date().getDay()+6)%7),today=await page.evaluate(()=>SportsProfileCore.dayKey());
 await page.locator('[data-field=day]').selectOption(String(day));await page.locator('[data-field=sportId]').selectOption('swimming');await page.locator('[data-field=durationMin]').fill('40');await page.locator('[data-field=prescription]').fill('Teknik odaklı yüzme');await page.locator('[data-field=progression]').fill('İkinci hafta aynı koşullarda tekrar ölç');
 await page.locator('#period-review').click();assert.equal(await page.evaluate(()=>ALOSRuntime.getDb().multisportPeriods?.length||0),0,'review must not activate');
 await page.locator('#period-activate').click();await page.waitForFunction(()=>!document.getElementById('workspace-period-editor').open);
 assert.equal(await page.evaluate(()=>ALOSRuntime.getDb().multisportPeriods.length),1);
 await page.locator('[data-workspace-group=today]').click();await page.locator('[data-record-block]').click();
 await page.locator('#session-minutes').fill('40');await page.locator('#session-effort').fill('5');await page.locator('#session-discipline').fill('Serbest');await page.locator('#session-conditions').fill('25 m havuz');await page.locator('[data-metric=distanceM]').fill('1000');await page.locator('[data-metric=movingMinutes]').fill('20');await page.locator('#session-save').click();await page.waitForFunction(()=>!document.getElementById('sports-session').open);
 assert.equal(await page.evaluate(()=>AthleteWorkspace.snapshot().today.loadAU),200);
 assert.equal(await page.evaluate(()=>AthleteWorkspaceCore.outcomes(ALOSRuntime.getDb(),ALOSRuntime.getDb().multisportPeriods[0]).recorded),1);
 await page.locator('[data-workspace-group=plan]').click();await page.locator('[data-clone-period]').click();await page.locator('#period-review').click();await page.locator('#period-activate').click();await page.waitForFunction(()=>!document.getElementById('workspace-period-editor').open);
 assert.equal(await page.evaluate(()=>ALOSRuntime.getDb().multisportPeriods.length),2);
 const portable=await page.evaluate(()=>BackupVault.selfTestPayload());assert.equal(portable.data.multisportPeriods.length,2);
 await page.locator('[data-workspace-group=growth]').click();assert((await page.locator('#workspace-analysis').innerText()).includes('200'));
 await page.screenshot({path:path.join(root,'analysis-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'analysis-mobile.png')});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile must not overflow');
 // New photo persists to server and downloads into a distinct browser/device context.
 const photo={id:123456789,date:today,createdAt:new Date().toISOString(),photos:{front:png}};
 await photoWrite(page,photo);assert(await page.evaluate(()=>AccountPhotos.sync()));
 const b=await browser.newContext(),other=await b.newPage();other.on('pageerror',e=>errors.push(e.message));await other.goto(origin);await other.locator('#account-username').fill('workspace_a');await other.locator('#account-password').fill(password);await other.locator('#account-submit').click();await other.waitForURL('**/index.html');
 if(await other.locator('#sports-setup').count())await other.locator('#setup-back').click();
 assert(await other.evaluate(()=>AccountPhotos.sync()));assert.equal((await photoRead(other))[0].photos.front,png);
 await page.evaluate(async()=>{await new Promise((resolve,reject)=>{const r=indexedDB.open('AthleteLifeOSPhotos',1);r.onsuccess=()=>{const d=r.result,t=d.transaction('checkins','readwrite');t.objectStore('checkins').delete(123456789);t.oncomplete=()=>{d.close();resolve()};t.onerror=()=>reject(t.error)}});await AccountPhotos.removed(123456789)});
 assert(await other.evaluate(()=>AccountPhotos.sync()));assert.equal((await photoRead(other)).length,0,'remote deletion must not resurrect');
 await photoWrite(page,photo);await page.evaluate(()=>AccountPhotos.restored(123456789));await other.evaluate(()=>AccountPhotos.sync());assert.equal((await photoRead(other)).length,1,'undo syncs restoration');
 await page.route('**/api/photos*',r=>r.abort());await photoWrite(page,{...photo,id:123456790});assert.equal(await page.evaluate(()=>AccountPhotos.sync()),false);await page.unroute('**/api/photos*');assert(await page.evaluate(()=>AccountPhotos.sync()));await other.evaluate(()=>AccountPhotos.sync());assert.equal((await photoRead(other)).length,2,'offline additions retry');
 // Two devices edit the same photo: neither silently wins; explicit resolution keeps both.
 await photoWrite(page,{...photo,createdAt:'2026-09-16T10:00:00Z'});assert(await page.evaluate(()=>AccountPhotos.sync()));
 await photoWrite(other,{...photo,createdAt:'2026-09-16T11:00:00Z'});assert.equal(await other.evaluate(()=>AccountPhotos.sync()),false);
 assert.equal((await photoRead(other)).find(r=>r.id===photo.id).createdAt,'2026-09-16T11:00:00Z');
 await other.evaluate(()=>goToPage('detailed'));await other.locator('[data-detail=detail-body]').click();await other.locator('#account-photo-resolve').click();
 await other.waitForFunction(()=>!document.getElementById('account-photo-resolve'));
 assert(await other.evaluate(()=>AccountPhotos.sync()));assert.equal((await photoRead(other)).length,3,'explicit conflict resolution preserves both copies');
 const beforeRefresh=await page.evaluate(()=>ALOSServerSync.status().lastAckRev);
 await page.evaluate(async()=>{AthleteCoordinator.flush('test-clock',true);await ALOSServerSync.flush()});
 assert.equal(await page.evaluate(()=>ALOSServerSync.status().lastAckRev),beforeRefresh,'clock refresh must not write a new remote revision');
 assert.equal(await page.locator('#account-conflict').count(),0,'read-only second device must not trigger conflicts');
 await page.setViewportSize({width:1365,height:1000});await page.getByRole('button',{name:'Hesabım: Test Sporcusu'}).click();await page.getByRole('button',{name:'Kurtarma kodlarım',exact:true}).click();
 const recovery=page.locator('dialog[aria-label="Kurtarma kodları"]');await recovery.locator('input').fill(password);await recovery.getByRole('button',{name:'Beş yeni kod oluştur'}).click();await recovery.locator('textarea').waitFor();const codes=await recovery.locator('textarea').inputValue();assert.equal(codes.split('\n').length,5);await recovery.getByRole('button',{name:'Kapat',exact:true}).click();
 await page.locator('#account-logout').click();await page.waitForURL('**/accounts.html');await page.getByRole('button',{name:'Şifremi unuttum'}).click();
 const reset=page.locator('dialog[aria-label="Şifre kurtarma"]');await reset.locator('[name=username]').fill('workspace_a');await reset.locator('[name=code]').fill(codes.split('\n')[0]);await reset.locator('[name=newPassword]').fill(password+' changed');await reset.getByRole('button',{name:'Şifreyi yenile'}).click();await page.waitForFunction(()=>document.querySelector('dialog[aria-label="Şifre kurtarma"] [role=status]').textContent.includes('yenilendi'));
 await reset.getByRole('button',{name:'Kapat',exact:true}).click();await page.locator('#account-username').fill('workspace_a');await page.locator('#account-password').fill(password+' changed');await page.locator('#account-submit').click();await page.waitForURL('**/index.html');
 assert.equal(await page.evaluate(()=>ALOSRuntime.getDb().multisportPeriods.length),2,'recovery preserves data');
 assert.deepEqual(errors,[]);console.log('PASS: five destinations, manual period review/adoption, linked actuals, next period, backup, mobile, two-device photos/delete/undo/offline and password recovery.');console.log('Screenshots: '+root);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.kill('SIGTERM');for(const f of fs.readdirSync(root))if(!f.endsWith('.png'))fs.rmSync(path.join(root,f),{recursive:true,force:true})});
