import {chromium,expect} from '../../apps/web/node_modules/@playwright/test/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import AxeBuilder from '../../apps/web/node_modules/@axe-core/playwright/dist/index.mjs';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10011',name='alos_test_sport_browser_'+Date.now();let server,browser,page,created=false;const errors=[];
const output=root+'/docs/evidence/daily-log';
try {
 try{await fetch(base+'/health/ready');throw Error('Test port occupied');}catch(e){if(e.message==='Test port occupied')throw e;}
 mkdirSync(output,{recursive:true});execFileSync(python,['tools/v2/test_database.py','create',name],{stdio:'pipe'});created=true;
 server=spawn(python,['-m','uvicorn','tools.v2.daily_log_fixture:create','--factory','--host','127.0.0.1','--port','10011','--no-access-log'],{env:{...process.env,PYTHONPATH:root+'/apps/api:'+root,PYTHON_DOTENV_DISABLED:'1',STORAGE_BACKEND:'sqlite',ACCOUNT_STORAGE_BACKEND:'sqlite',ALOS_SYNTHETIC_SPORT_DB:name},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible();
 await page.goto(base+'/?date=2026-10-05#workout');await page.locator('.daily-narrative summary').click();
 const input=page.getByLabel('Gününü anlat veya eksik bilgileri tamamla',{exact:true});
 const message='02:00–07:00 uyudum. 10:00 işe başladım 8 saat çalıştım; ulaşım 0 dk hazırlık 0 dk. 2,5 litre su. Pilav yedim. 30 dk kalistenik; 3 set 5 tekrar pushup yaptım';
 await input.fill(message);await expect(page.getByRole('button',{name:'Mesajı gönder ve özeti hazırla',exact:true})).toBeDisabled();
 await page.getByRole('checkbox',{name:/Bu günlük mesajlarının/}).check();await page.getByRole('button',{name:'Mesajı gönder ve özeti hazırla',exact:true}).click();
 const summary=page.getByRole('region',{name:'Hızlı kayıt özeti',exact:true});await expect(summary).toBeVisible();await expect(summary.getByRole('checkbox').first()).toBeDisabled();
 expect((await (await page.request.get(base+'/api/v2/bootstrap')).json()).hydrations).toHaveLength(0);
 await input.fill('Su miktarı günün toplamı.');await page.getByRole('button',{name:'Mesajı gönder ve özeti hazırla',exact:true}).click();await expect(summary.getByRole('checkbox').first()).toBeEnabled();
 await page.reload();await page.locator('.daily-narrative summary').click();await expect(summary).toBeVisible();
 for(const c of await summary.getByRole('checkbox').all())await c.check();
 const violations=(await new AxeBuilder({page}).include('.daily-narrative').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;expect(violations).toEqual([]);
 await page.screenshot({path:output+'/review-mobile.png',fullPage:true});
 let rejected=false,lost=false;await page.route('**/api/v2/commands',async route=>{if(!rejected && route.request().postDataJSON().command_type==='daily_log.save'){rejected=true;await route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:{code:'sleep_interval',message:'Sentetik geçersiz saat'}})});}else if(!lost && route.request().postDataJSON().command_type==='daily_log.save'){lost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 await page.getByRole('button',{name:'Seçtiklerimi onayla ve kaydet',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Sentetik geçersiz saat');await expect(input).toBeEnabled();await expect(page.getByRole('button',{name:'Kaydı doğrula / yeniden dene',exact:true})).toHaveCount(0);
 await page.getByRole('checkbox',{name:/Bu günlük mesajlarının/}).check();await page.getByRole('button',{name:'Güncel kayıtlarla yeniden analiz et',exact:true}).click();await expect(summary).toBeVisible();for(const c of await summary.getByRole('checkbox').all())await c.check();
 await page.getByRole('button',{name:'Seçtiklerimi onayla ve kaydet',exact:true}).click();await expect(page.getByRole('button',{name:'Kaydı doğrula / yeniden dene',exact:true})).toBeEnabled();
 await page.reload();await page.locator('.daily-narrative summary').click();await page.getByRole('button',{name:'Kaydı doğrula / yeniden dene',exact:true}).click();await expect(page.getByText(/Seçtiğin bilgiler sunucuya kaydedildi/)).toBeVisible();
 const snapshot=await (await page.request.get(base+'/api/v2/bootstrap')).json();for(const kind of ['hydrations','meals','sleeps','shifts','sessions'])expect(snapshot[kind]).toHaveLength(1);expect(snapshot.sets).toHaveLength(3);expect(snapshot.meals[0].kcal).toBeNull();expect(errors).toEqual([]);
 writeFileSync(output+'/BROWSER.json',JSON.stringify({mobileReview:true,consentRequired:true,incompleteWaterBlocked:true,followUpCompleted:true,noWritesBeforeApproval:true,reloadPreserved:true,definitiveRejectionAllowsCorrection:true,lostAckRetriedWithoutDuplication:true,allFiveDomains:true,threeRealSets:true,noInventedCalories:true,violations,errors},null,2));
 console.log('Daily narrative mobile review, clarification, reload, lost ACK replay and all five domains PASS');
} catch(error){if(page){await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});console.error(await page.locator('body').innerText().catch(()=>''));}throw error;}finally{await browser?.close();if(server){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}if(created)execFileSync(python,['tools/v2/test_database.py','drop',name],{stdio:'pipe'});}
