import {chromium,expect} from '../../apps/web/node_modules/@playwright/test/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import AxeBuilder from '../../apps/web/node_modules/@axe-core/playwright/dist/index.mjs';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10011',name='alos_test_sport_browser_'+Date.now();let server,browser,page,created=false;const errors=[],checks=[];
async function synced(){await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible({timeout:20000});}
async function next(){await page.getByRole('button',{name:'Devam',exact:true}).click();}
try{
 try{await fetch(base+'/health/ready');throw Error('Test port occupied');}catch(e){if(e.message==='Test port occupied')throw e;}
 mkdirSync(root+'/docs/evidence/branch-methods',{recursive:true});execFileSync(python,['tools/v2/test_database.py','create',name],{stdio:'pipe'});created=true;
 server=spawn(python,['-m','uvicorn','tools.v2.sport_training_fixture:create','--factory','--host','127.0.0.1','--port','10011','--no-access-log'],{env:{...process.env,PYTHONPATH:root+'/apps/api:'+root,PYTHON_DOTENV_DISABLED:'1',STORAGE_BACKEND:'sqlite',ACCOUNT_STORAGE_BACKEND:'sqlite',ALOS_SYNTHETIC_SPORT_DB:name},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await synced();await next();
 await page.getByLabel('Branş kategorisi',{exact:true}).selectOption({label:'Bisiklet ve tekerlekli sporlar'});
 await expect(page.getByRole('region',{name:'Kategoriye uygun yöntemler'})).toContainText('Pedal');
 await page.getByLabel('Çalıştığın branşı ekle',{exact:true}).selectOption('road-cycling');
 await expect(page.getByRole('button',{name:'Yol bisikleti · Teknik çalışma',exact:false})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('region',{name:'Yol bisikleti çalışma yöntemleri'})).toContainText('Vites ve kadans geçişi');
 await expect(page.getByRole('button',{name:'Ağırlık çalışması',exact:false})).not.toBeVisible();
 await page.getByLabel('Branş kategorisi',{exact:true}).selectOption({label:'Kış sporları'});await expect(page.getByRole('region',{name:'Kategoriye uygun yöntemler'})).toContainText('Kenar kontrolü');
 await page.getByLabel('Çalıştığın branşı ekle',{exact:true}).selectOption('alpine-skiing');
 await page.getByRole('button',{name:'Alp disiplini kayak · Teknik / taktik analiz',exact:false}).click();await page.getByRole('button',{name:'Alp disiplini kayak · Teknik çalışma',exact:false}).click();
 await expect(page.getByRole('button',{name:'Yol bisikleti · Teknik çalışma',exact:false})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('Branş kategorisi',{exact:true}).selectOption({label:'Binicilik'});await page.getByLabel('Çalıştığın branşı ekle',{exact:true}).selectOption('dressage');
 await expect(page.getByRole('region',{name:'At terbiyesi çalışma yöntemleri'})).toContainText('Adeta-tırıs geçişi');await page.getByRole('button',{name:'At terbiyesi · kaldır',exact:true}).click();await expect(page.getByRole('region',{name:'At terbiyesi çalışma yöntemleri'})).toHaveCount(0);
 await page.reload();await synced();await expect(page.getByRole('button',{name:'Alp disiplini kayak · Teknik / taktik analiz',exact:false})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Alp disiplini kayak · Teknik çalışma',exact:false})).toHaveAttribute('aria-pressed','false');
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const axe=await new AxeBuilder({page}).include('.guided-plan').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await page.screenshot({path:root+`/docs/evidence/branch-methods/methods-${width}.png`,fullPage:true});}
 await next();await expect(page.getByRole('checkbox',{name:'Alp disiplini kayak · Kenar kontrolü',exact:true})).toHaveCount(0);await page.getByRole('checkbox',{name:'Yol bisikleti · Pedal çevirme ritmi',exact:true}).check();
 const fields=page.getByRole('group',{name:'Yol bisikleti',exact:true});await fields.getByRole('checkbox',{name:/uygun tesis/}).check();await fields.getByRole('checkbox',{name:'Branş eğitmenim uygulamaya eşlik edecek',exact:true}).check();
 await next();await page.getByLabel('Somut hedefin ne?',{exact:true}).fill('Bisiklette ritim, kayakta teknik analiz');await next();await next();await next();await next();await next();
 await page.getByLabel('18 yaş veya üzerindeyim.',{exact:true}).check();await page.getByRole('checkbox',{name:/Bu formdaki planlama bilgilerimin AI taslağı için EVREN/}).check();
 const rp=page.waitForResponse(r=>r.url().endsWith('/api/v2/ai-program-drafts'));await page.getByRole('button',{name:'AI ile programımı hazırla',exact:true}).click();const response=await rp;const result=await response.json();expect(response.status(),JSON.stringify(result)).toBe(200);
 expect(result.program.guided_choices.sport_methods).toEqual({'road-cycling':['sport_technique'],'alpine-skiing':['sport_tactics']});
 const days=result.program.days.filter(d=>d.kind==='training');expect(days[0].exercises.every(e=>e.movement_id.startsWith('sport-road-cycling-'))).toBe(true);expect(days[1].exercises.every(e=>e.movement_id==='sport-alpine-skiing-analysis')).toBe(true);
 await expect(page.getByRole('heading',{name:'Planına göz at',exact:true})).toBeVisible();await page.screenshot({path:root+'/docs/evidence/branch-methods/preview.png',fullPage:true});await page.getByRole('button',{name:'Düzenle ve kaydet',exact:true}).click();
 const values=await page.locator('input').evaluateAll(items=>items.map(i=>i.value));expect(values.some(v=>v.includes('Yol bisikleti'))).toBe(true);
 checks.push('category preview; cycling/winter/equestrian methods; independent per-sport selection; removal/reload; filtered competencies; per-day synthetic AI methods; populated editor; 390/1280px Axe');
 expect(errors).toEqual([]);writeFileSync(root+'/docs/evidence/branch-methods/browser-results.json',JSON.stringify({result:'PASS',checks,errors,browser:browser.version(),provider:'synthetic'},null,2));console.log('Branch methods browser PASS');
}catch(e){if(page){await page.screenshot({path:root+'/docs/evidence/branch-methods/failure.png',fullPage:true});console.error((await page.locator('body').innerText()).slice(-6000));}throw e;}finally{if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r));}if(created)execFileSync(python,['tools/v2/test_database.py','drop',name],{stdio:'pipe'});}
