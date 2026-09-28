import {chromium,expect} from '../../apps/web/node_modules/@playwright/test/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import AxeBuilder from '../../apps/web/node_modules/@axe-core/playwright/dist/index.mjs';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10011',name='alos_test_sport_browser_'+Date.now();let server,browser,page,created=false;const errors=[],checks=[];
async function synced(){await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible({timeout:20000});}
async function next(){await page.getByRole('button',{name:'Devam',exact:true}).click();}
try{
 try{await fetch(base+'/health/ready');throw Error('Test port occupied');}catch(e){if(e.message==='Test port occupied')throw e;}
 mkdirSync(root+'/docs/evidence/library-regions',{recursive:true});execFileSync(python,['tools/v2/test_database.py','create',name],{stdio:'pipe'});created=true;
 server=spawn(python,['-m','uvicorn','tools.v2.sport_training_fixture:create','--factory','--host','127.0.0.1','--port','10011','--no-access-log'],{env:{...process.env,PYTHONPATH:root+'/apps/api:'+root,PYTHON_DOTENV_DISABLED:'1',STORAGE_BACKEND:'sqlite',ACCOUNT_STORAGE_BACKEND:'sqlite',ALOS_SYNTHETIC_SPORT_DB:name},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await synced();
 await page.getByLabel('Yaşın',{exact:true}).fill('28');await page.getByLabel('Boyun (cm)',{exact:true}).fill('175');await page.getByLabel('Kilon (kg)',{exact:true}).fill('75');await page.getByLabel('Toplam spor geçmişin (ay)',{exact:true}).fill('24');await page.getByRole('button',{name:'Düzenli çalışıyorum',exact:false}).click();await next();
 await page.getByRole('button',{name:'Kalistenik',exact:false}).click();await next();await next();
 await page.getByLabel('Somut hedefin ne?',{exact:true}).fill('Sekiz haftada barfikste kontrollü tekrarlarımı geliştirmek');
 await page.getByLabel('Dönem boyunca nasıl ilerleyelim?',{exact:true}).selectOption('phased');
 await page.getByLabel('Kuvvet setlerinin sonunda kaç tekrar yedekte kalsın (RIR)?',{exact:true}).selectOption('2');
 await page.screenshot({path:root+'/docs/evidence/library-regions/goals.png',fullPage:true});await next();
 for(const label of ['Barfiks barı','Halka','Dumbbell']) { const button=page.getByRole('button',{name:label,exact:true});if(await button.count())await button.click(); }
 await next();await next();await page.getByRole('button',{name:'Üst vücut bölgelerini seç',exact:true}).click();await page.getByLabel('Bölge seçimim planı nasıl etkilesin?',{exact:true}).selectOption('selected');await next();
 await page.getByLabel('Dönem uzunluğu',{exact:true}).selectOption('8');await next();
 await page.getByLabel('18 yaş veya üzerindeyim.',{exact:true}).check();await page.getByRole('checkbox',{name:/Bu formdaki planlama bilgilerimin AI taslağı için EVREN/}).check();
 const pending=page.waitForResponse(r=>r.url().endsWith('/api/v2/ai-program-drafts'));await page.getByRole('button',{name:'AI ile programımı hazırla',exact:true}).click();const response=await pending;
 expect(response.request().postDataJSON().region_mode).toBe('selected');expect(response.request().postDataJSON().focus.calves).toBeUndefined();expect(response.request().postDataJSON().target_rir).toBe(2);expect(response.request().postDataJSON().progression_mode).toBe('phased');expect(response.status()).toBe(200);
 const result=await response.json();expect(result.program.days.some(d=>d.first_week===4)).toBe(true);expect(result.program.days.some(d=>d.first_week===8)).toBe(true);
 await expect(page.getByRole('heading',{name:'Planına göz at',exact:true})).toBeVisible();await page.getByText('Dönem yapısı ve ilerleme koşulları',{exact:true}).click();await expect(page.locator('details').filter({has:page.locator('summary', {hasText:'Dönem yapısı ve ilerleme koşulları'})}).getByText(/İlerleme koşulu: aynı hareket/)).toBeVisible();
 await page.getByRole('button',{name:'Düzenle ve kaydet',exact:true}).click();
 const values=await page.locator('input').evaluateAll(items=>items.map(i=>i.value));expect(values.some(v=>v.includes('Hafif hafta'))).toBe(true);expect(errors).toEqual([]);
 await page.screenshot({path:root+'/docs/evidence/library-regions/editor.png',fullPage:true});
 await page.goto(base+'/#workout');await synced();const library=page.locator('.movement-library');await library.locator('summary').first().click();
 const catalog=await page.evaluate(async()=> (await(await fetch('/api/v2/catalogs')).json()).movements);
 const tested=[];
 for(const id of ['ring-l-sit','front-lever','pull-up','ez-bar-curl','bodyweight-squat']){
   await library.getByLabel('İncelemek istediğin hareket',{exact:true}).selectOption(id);
   await expect(library.locator('.movement-poses svg')).toHaveCount(2);
   await expect(library.locator('.movement-poses figure').first()).toBeVisible();
   const muscles=library.locator('.interactive-muscles');const controls=muscles.getByRole('group').getByRole('button');await controls.first().focus();await page.keyboard.press('Enter');await expect(controls.first()).toHaveAttribute('aria-pressed','true');
   if(await controls.count()>1){await controls.nth(1).evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));const hit=await controls.nth(1).evaluate(el=>{const box=el.getBBox(),matrix=el.getScreenCTM();for(let y=box.y+1;y<box.y+box.height;y+=2)for(let x=box.x+1;x<box.x+box.width;x+=2){const p=new DOMPoint(x,y);if(el.isPointInFill(p)){const screen=p.matrixTransform(matrix);if(document.elementFromPoint(screen.x,screen.y)===el)return {x:screen.x,y:screen.y};}}return null;});expect(hit).not.toBeNull();await page.mouse.click(hit.x,hit.y);await expect(controls.nth(1)).toHaveAttribute('aria-pressed','true');await expect(controls.first()).toHaveAttribute('aria-pressed','false');}
   await page.screenshot({path:root+'/docs/evidence/library-regions/'+id+'.png',fullPage:true});tested.push(id);
 }
 for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await library.evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished)));const violations=(await new AxeBuilder({page}).include('.movement-library').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;expect(violations).toEqual([]);}
 await library.getByRole('checkbox',{name:/Yalnız form çizimi bulunanları göster/}).check();const illustrated=await library.getByLabel('İncelemek istediğin hareket',{exact:true}).locator('option').count();expect(illustrated).toBeGreaterThan(70);
 for(const m of catalog.filter(m=>m.sport_id).slice(0,1)){await library.getByRole('checkbox',{name:/Yalnız form çizimi bulunanları göster/}).uncheck();await library.getByLabel('İncelemek istediğin hareket',{exact:true}).selectOption(m.id);await expect(library.locator('.movement-poses')).toHaveCount(0);await expect(library.getByText(/tek bir hareketin yapılışını tarif etmez/i)).toBeVisible();}
 await page.setViewportSize({width:1440,height:1000});await library.getByLabel('İncelemek istediğin hareket',{exact:true}).selectOption('ring-l-sit');await page.screenshot({path:root+'/docs/evidence/library-regions/desktop.png',fullPage:true});expect(errors).toEqual([]);
 writeFileSync(root+'/docs/evidence/library-regions/BROWSER.json',JSON.stringify({tested,illustrated,catalog:catalog.length,upperOnlyPlan:true,errors},null,2));console.log('Upper region plan, EVREN payload, preview/editor, canonical form illustrations, interactive muscles, unknown technique boundaries and light/dark mobile accessibility PASS; illustrations='+illustrated);
}catch(e){if(page){await page.screenshot({path:root+'/docs/evidence/library-regions/failure.png',fullPage:true});console.error((await page.locator('body').innerText()).slice(-6000));}throw e;}finally{if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r));}if(created)execFileSync(python,['tools/v2/test_database.py','drop',name],{stdio:'pipe'});}
