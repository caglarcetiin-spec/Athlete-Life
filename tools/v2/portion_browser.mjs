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
 await page.goto(base+'/?date=2026-10-05#workout');await page.locator('.daily-narrative > summary').click();
 const input=page.getByLabel('Gününü anlat veya eksik bilgileri tamamla',{exact:true});
 const message='02:00–07:00 uyudum. 10:00 işe başladım 8 saat çalıştım; ulaşım 0 dk hazırlık 0 dk. 2,5 litre su. Pilav yedim. 30 dk kalistenik; 3 set 5 tekrar pushup yaptım';
 await input.fill(message);await expect(page.getByRole('button',{name:'Mesajı gönder ve özeti hazırla',exact:true})).toBeDisabled();
 await page.getByRole('checkbox',{name:/Bu günlük mesajlarının/}).check();await page.getByRole('button',{name:'Mesajı gönder ve özeti hazırla',exact:true}).click();
 const summary=page.getByRole('region',{name:'Hızlı kayıt özeti',exact:true});await expect(summary).toBeVisible();await expect(summary.getByRole('checkbox').first()).toBeDisabled();
 expect((await (await page.request.get(base+'/api/v2/bootstrap')).json()).hydrations).toHaveLength(0);
 await input.fill('Su miktarı günün toplamı.');await page.getByRole('button',{name:'Mesajı gönder ve özeti hazırla',exact:true}).click();await expect(summary.getByRole('checkbox').first()).toBeEnabled();
 await page.reload();await page.locator('.daily-narrative > summary').click();await expect(summary).toBeVisible();
 await summary.getByText('Gram bilmeden yaklaşık hesapla',{exact:true}).click();
 await summary.getByLabel('Yiyecek karşılığı',{exact:true}).selectOption('rice');
 await summary.getByLabel('Porsiyon büyüklüğü',{exact:true}).selectOption('unknown');
 await summary.getByRole('button',{name:'Tahmini özette göster',exact:true}).click();
 await expect(summary).toContainText('Tahmini:');
 expect((await (await page.request.get(base+'/api/v2/bootstrap')).json()).meals).toHaveLength(0);
 await page.reload();await page.locator('.daily-narrative > summary').click();await expect(summary).toContainText('Tahmini:');
 for(const c of await summary.getByRole('checkbox').all())await c.check();
 const violations=(await new AxeBuilder({page}).include('.daily-narrative').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;expect(violations).toEqual([]);
 await page.getByRole('button',{name:'Seçtiklerimi onayla ve kaydet',exact:true}).click();await expect(page.getByText(/Seçtiğin bilgiler sunucuya kaydedildi/)).toBeVisible();
 const snapshot=await (await page.request.get(base+'/api/v2/bootstrap')).json();
 expect(snapshot.meals).toHaveLength(1);expect(snapshot.meals[0].kcal).toBe(260);
 expect(snapshot.meals[0].nutrient_snapshot.source).toBe('estimated-reference-portion');
 await page.goto(base+'/?date=2026-10-05#nutrition');
 await expect(page.getByText('Tahmini besin değerleri',{exact:true})).toBeVisible();
 await expect(page.getByText(/1 öğünde tahmini değer var/).first()).toBeVisible();
 await page.screenshot({path:output+'/portion-mobile.png',fullPage:true});
 expect(errors).toEqual([]);
 writeFileSync(output+'/PORTION_BROWSER.json',JSON.stringify({mobile:true,portionUnknownUsesVisibleMedium:true,noWritesBeforeApproval:true,reloadPreserved:true,savedProvenance:true,nutritionEstimateVisible:true,violations,errors},null,2));
 console.log('Reference portions: review, persistence, approval, nutrition labels, mobile accessibility PASS');
} catch(error){if(page){await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});console.error(await page.locator('body').innerText().catch(()=>''));}throw error;}finally{await browser?.close();if(server){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}if(created)execFileSync(python,['tools/v2/test_database.py','drop',name],{stdio:'pipe'});}
