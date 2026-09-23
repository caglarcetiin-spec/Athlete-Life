import {chromium,expect} from '../../apps/web/node_modules/@playwright/test/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10005',name='alos_test_experience_'+Date.now();let server,browser,page;const errors=[];const workerPath=root+'/apps/web/dist/sw.js',originalWorker=readFileSync(workerPath,'utf8');
async function api(path,body){return page.evaluate(async({path,body})=>{const me=await(await fetch('/api/v2/auth/me')).json();const r=await fetch('/api/v2/'+path,body?{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':me.csrf},body:JSON.stringify(body)}:{});if(!r.ok)throw Error(await r.text());return r.json()},{path,body})}
async function synced(){await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible({timeout:20000})}
try{
 execFileSync(python,['tools/v2/test_database.py','create',name],{cwd:root});server=spawn(python,['-m','uvicorn','alos.main:create_app','--factory','--host','127.0.0.1','--port','10005','--no-access-log'],{cwd:root,env:{...process.env,PYTHONPATH:root+'/apps/api',ALOS_V2_ENABLED:'1',ALOS_V2_ENVIRONMENT:'test',ALOS_V2_PUBLIC_ORIGIN:base,ALOS_V2_DATABASE_URL:'postgresql://localhost:15432/'+name},stdio:'ignore'});for(let i=0;i<80;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.ALOS_BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await synced();
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);await expect(page.getByRole('button',{name:'Yeni sürümü aç',exact:true})).toHaveCount(0);
 await page.goto(base+'/?date=2026-09-10#today');
 const date=page.getByLabel('Tarih',{exact:true});await date.fill('2026-09-11');
 await page.getByRole('button',{name:'Geri git',exact:true}).click();await expect(date).toHaveValue('2026-09-10');
 await page.getByRole('button',{name:'İleri git',exact:true}).click();await expect(date).toHaveValue('2026-09-11');
 await page.locator('.skip-link').focus();await page.keyboard.press('Enter');expect(new URL(page.url()).hash).toBe('#today');
 await page.goto(base+'/#profile');await page.getByLabel('Tercih ettiğim görünüm',{exact:true}).selectOption('professional');
 await page.locator('section').filter({has:page.getByRole('heading',{name:'Spor ve sağlık profilim',exact:true})}).getByRole('button',{name:'Kaydı sakla',exact:true}).click();await synced();
 await expect(page.getByText('Profesyonel görünüm açık. Planım, raporlar ve Capability Lab menüye eklendi.',{exact:true})).toBeVisible();
 await page.getByLabel('E-posta adresim',{exact:true}).fill('deniz@example.invalid');
 await page.locator('section').filter({has:page.getByRole('heading',{name:'Hesap bilgilerim',exact:true})}).getByRole('button',{name:'Kaydı sakla',exact:true}).click();
 await expect.poll(async()=> (await api('auth/me')).email).toBe('deniz@example.invalid');
 await page.goto(base+'/?date=2026-09-10#nutrition');
 const water=page.locator('section').filter({has:page.getByRole('heading',{name:'Su',exact:true})});
 await water.getByRole('button',{name:'Ekle',exact:true}).click();
 const amount=water.locator('input[inputmode="decimal"]').first();await amount.fill('375');
 await expect(water.getByText('Form taslağı bu cihazda korundu; kaydı tamamlamak için Kaydı sakla.',{exact:true})).toBeVisible();
 await page.reload();await water.getByRole('button',{name:'Ekle',exact:true}).click();await expect(amount).toHaveValue('375');
 await water.getByRole('button',{name:'Kaydı sakla',exact:true}).click();await synced();
 await page.goto(base+'/#profile');
 const {default:AxeBuilder}=await import('../../apps/web/node_modules/@axe-core/playwright/dist/index.mjs');const axe=await new AxeBuilder({page}).analyze();writeFileSync(root+'/docs/evidence/stage-6/a11y.json',JSON.stringify(axe.violations,null,2));expect(axe.violations).toEqual([]);
 await page.screenshot({path:root+'/docs/evidence/stage-6/profile-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Çıkış yap',exact:true}).click();const logout=page.getByRole('dialog',{name:'Çıkış yap',exact:true});await expect(logout.getByRole('button',{name:'Vazgeç',exact:true})).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(logout.getByRole('button',{name:'Kayıtları koru ve çık',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(logout.getByRole('button',{name:'Vazgeç',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(logout).toHaveCount(0);await expect(page.getByRole('button',{name:'Çıkış yap',exact:true})).toBeFocused();
 await page.route('**/api/v2/commands',route=>route.abort());
 await page.goto(base+'/?date=2026-09-10#nutrition');await water.getByRole('button',{name:'Ekle',exact:true}).click();await amount.fill('500');await water.getByRole('button',{name:'Kaydı sakla',exact:true}).click();
 await expect(page.getByRole('button',{name:'1 kayıt eşitlenmeyi bekliyor',exact:true})).toBeVisible();
 writeFileSync(workerPath,originalWorker.replace('alos-shell-','alos-shell-update-test-'));
 await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update()});
 await expect(page.getByRole('button',{name:'Önce bekleyen kayıtları eşitle',exact:true})).toBeDisabled();
 await page.unroute('**/api/v2/commands');await page.getByRole('button',{name:'Tekrar dene',exact:true}).click();await synced();
 await expect(page.getByRole('button',{name:'Yeni sürümü aç',exact:true})).toBeEnabled();page.once('dialog',d=>d.accept());await Promise.all([page.waitForEvent('domcontentloaded'),page.getByRole('button',{name:'Yeni sürümü aç',exact:true}).click()]);await synced();
 expect((await api('bootstrap')).hydrations.filter(r=>!r.deleted_at).map(r=>r.ml).sort((a,b)=>a-b)).toEqual([375,500]);
 const cacheKeys=await page.evaluate(async()=>{const names=await caches.keys();return (await Promise.all(names.map(async name=>(await(await caches.open(name)).keys()).map(r=>r.url)))).flat()});expect(cacheKeys.some(u=>u.includes('/api/'))).toBe(false);
 await context.setOffline(true);await page.reload();await expect(page.getByRole('button',{name:'Giriş yap',exact:true})).toBeVisible();expect(await page.locator('body').innerText()).not.toContain('deniz@example.invalid');await context.setOffline(false);
 expect(errors).toEqual([]);
 writeFileSync(root+'/docs/evidence/stage-6/browser-results.json',JSON.stringify({result:'PASS',browser:browser.version(),viewport:[390,844],checks:['Date history and skip link','Professional mode announcement','Account email update','Interrupted form draft recovery','Profile axe and mobile layout','Offline shell with no authenticated API cache','Pending journal blocks SW update; ACK and update preserve both records'],errors},null,2));console.log('Profile, navigation, draft and offline shell journey: PASS');

}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:root+'/docs/evidence/stage-6/failure.png',fullPage:true});console.error(await page.locator('body').innerText());console.error('STATE',JSON.stringify(await api('bootstrap')))}throw e}finally{writeFileSync(workerPath,originalWorker);if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r))}execFileSync(python,['tools/v2/test_database.py','drop',name],{cwd:root})}
