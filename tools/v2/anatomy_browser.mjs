import {chromium,expect} from '../../apps/web/node_modules/@playwright/test/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {rmSync} from 'node:fs';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10005',name='alos_test_anatomy_'+Date.now();let server,browser,asset;const errors=[];
try{
 execFileSync(python,['tools/v2/test_database.py','create',name],{cwd:root});asset=JSON.parse(execFileSync(python,['tools/v2/synthetic_model_setup.py',name],{cwd:root,encoding:'utf8',env:{...process.env,ALOS_SYNTHETIC_NAMED_MODEL:'1'}}));
 server=spawn(python,['-m','uvicorn','alos.main:create_app','--factory','--host','127.0.0.1','--port','10005','--no-access-log'],{cwd:root,env:{...process.env,PYTHONPATH:root+'/apps/api',ALOS_V2_ENABLED:'1',ALOS_V2_ENVIRONMENT:'test',ALOS_V2_PUBLIC_ORIGIN:base,ALOS_V2_DATABASE_URL:process.env.ALOS_TEST_BACKEND==='mongodb'?'mongodb://127.0.0.1:27028/?replicaSet=alos-test':'postgresql://localhost:15432/'+name,ALOS_V2_MONGO_DATABASE:name,ALOS_V2_BODY_MODEL_PATH:asset.path,ALOS_V2_BODY_MODEL_OWNER_ID:asset.owner},stdio:'ignore'});
 for(let i=0;i<80;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.ALOS_BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();await page.clock.install();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible();


 page.on('console',m=>{if(m.type()==='error'&&/shader|webglprogram/i.test(m.text()))errors.push(m.text())});
 await page.goto(base+'/#reports');
 await expect(page.getByRole('button',{name:'Önden',exact:true})).toBeVisible({timeout:20000});
 await expect(page.getByText('Kayıtlı modelin hesabında korunuyor; tekrar yüklemen gerekmez.',{exact:true})).toBeVisible();
 await page.getByLabel('Görüntülenecek model',{exact:true}).selectOption('atlas');
 await expect(page.getByText(/Ayrıntılı anatomik atlas ·/)).toBeVisible({timeout:30000});
 const select=page.getByLabel('Anatomik yapı',{exact:true});expect(await select.locator('option').count()).toBeGreaterThan(400);
 await page.getByLabel('Kas / yapı ara',{exact:true}).fill('Vastus medialis');
 const value=await select.locator('option').filter({hasText:'Sol'}).first().getAttribute('value');await select.selectOption(value);
 await page.getByLabel('Yalnız seçili yapıyı göster',{exact:true}).check();await page.getByRole('button',{name:'Seçili yapıya yaklaş',exact:true}).click();
 await page.screenshot({path:root+'/docs/evidence/stage-9/anatomy-isolated.png',fullPage:true});
 await page.getByLabel('Yalnız seçili yapıyı göster',{exact:true}).uncheck();await page.getByRole('button',{name:'Önden',exact:true}).click();
 await page.screenshot({path:root+'/docs/evidence/stage-9/anatomy-full.png',fullPage:true});
 await page.reload();await expect(page.getByText(/Ayrıntılı anatomik atlas ·/)).toBeVisible({timeout:30000});await expect(page.getByLabel('Görüntülenecek model',{exact:true})).toHaveValue('atlas');
 await page.getByLabel('Görüntülenecek model',{exact:true}).selectOption('personal');await expect(page.getByRole('button',{name:'Önden',exact:true})).toBeVisible();
 await page.evaluate(async()=>{const me=await(await fetch('/api/v2/auth/me')).json();await fetch('/api/v2/auth/logout',{method:'POST',headers:{'X-CSRF-Token':me.csrf}})});await page.goto(base);
 await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible();
 await page.goto(base+'/#reports');await expect(page.getByRole('button',{name:'Önden',exact:true})).toBeVisible({timeout:15000});await expect(page.getByLabel('Görüntülenecek model',{exact:true})).toHaveValue('personal');
 expect(errors).toEqual([]);console.log(JSON.stringify({result:'PASS',checks:['Public licensed atlas renders without shader errors','400+ anatomical surfaces selectable','Isolated left vastus medialis and focus camera','Source selection survives reload','Personal synthetic model auto-opens after logout/login'],errors}));
}finally{if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r))}if(asset)rmSync(asset.path);execFileSync(python,['tools/v2/test_database.py','drop',name],{cwd:root})}
