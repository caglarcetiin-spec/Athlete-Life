import {chromium,expect} from '../../apps/web/node_modules/@playwright/test/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import AxeBuilder from '../../apps/web/node_modules/@axe-core/playwright/dist/index.mjs';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10011',name='alos_test_sport_browser_'+Date.now();let server,browser,page,created=false;const errors=[],checks=[];
async function synced(){await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible({timeout:20000});}
async function next(){await page.getByRole('button',{name:'Devam',exact:true}).click();}
try{
 try{await fetch(base+'/health/ready');throw Error('Test port occupied');}catch(e){if(e.message==='Test port occupied')throw e;}
 mkdirSync(root+'/docs/evidence/running-planner',{recursive:true});execFileSync(python,['tools/v2/test_database.py','create',name],{stdio:'pipe'});created=true;
 server=spawn(python,['-m','uvicorn','tools.v2.sport_training_fixture:create','--factory','--host','127.0.0.1','--port','10011','--no-access-log'],{env:{...process.env,PYTHONPATH:root+'/apps/api:'+root,PYTHON_DOTENV_DISABLED:'1',STORAGE_BACKEND:'sqlite',ACCOUNT_STORAGE_BACKEND:'sqlite',ALOS_SYNTHETIC_SPORT_DB:name},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await synced();await next();
 await page.getByRole('button',{name:'Koşu çalışması',exact:false}).click();
 await expect(page.getByRole('button',{name:'Ağırlık çalışması',exact:false})).not.toBeVisible();await next();
 for(const label of ['Kolay tempoda koşu','Tempo koşusu','Uzun ve rahat koşu']) await page.getByRole('checkbox',{name:label,exact:true}).check();
 await expect(page.getByRole('checkbox',{name:'Yokuş tekrarları',exact:true})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:'Kontrollü kısa hızlanmalar',exact:true})).toBeVisible();
 await page.getByLabel('Hedef koşu mesafen (km)',{exact:true}).fill('10');
 await page.getByLabel('Son haftalarda haftalık koşu süren (dakika)',{exact:true}).fill('75');
 await page.reload();await synced();await expect(page.getByLabel('Hedef koşu mesafen (km)',{exact:true})).toHaveValue('10');
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const axe=await new AxeBuilder({page}).include('.guided-plan').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await page.screenshot({path:root+`/docs/evidence/running-planner/choices-${width}.png`,fullPage:true});}
 await next();await expect(page.getByRole('button',{name:'İkisi birlikte',exact:false})).toHaveCount(0);await page.getByLabel('Somut hedefin ne?',{exact:true}).fill('Rahat 10 km koşusuna hazırlanmak');await next();
 await expect(page.getByRole('button',{name:'Atletizm pisti',exact:true})).toBeVisible();await page.getByRole('button',{name:'Yol / düz parkur',exact:true}).click();await next();await next();
 await expect(page.getByRole('heading',{name:'Hangi performans hedefleri önceliğin?',exact:true})).toBeVisible();await expect(page.getByLabel('Göğüs öncelik puanı',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Daha uzun mesafe',exact:true}).click();await next();
 await expect(page.getByRole('button',{name:'Dayanıklılık günleri',exact:false})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Tüm vücut',exact:false})).toHaveCount(0);await next();
 await page.getByLabel('18 yaş veya üzerindeyim.',{exact:true}).check();await page.getByRole('checkbox',{name:/Bu formdaki planlama bilgilerimin AI taslağı için EVREN/}).check();
 const rp=page.waitForResponse(r=>r.url().endsWith('/api/v2/ai-program-drafts'));await page.getByRole('button',{name:'AI ile programımı hazırla',exact:true}).click();const response=await rp;const result=await response.json();expect(response.status(),JSON.stringify(result)).toBe(200);expect(result.program.ai_origin.prompt_version).toBe('ai-planner-9');expect(result.program.guided_choices.methods).toEqual(['running']);
 expect(result.program.guided_choices.performance_focus).toContain('distance');expect(result.program.guided_choices.running_profile.target_distance_km).toBe(10);
 expect(result.program.days.flatMap(d=>d.exercises).every(e=>e.modality==='cardio' && e.seconds>0)).toBe(true);
 await expect(page.getByRole('heading',{name:'Planına göz at',exact:true})).toBeVisible();await expect(page.locator('summary').filter({hasText:'Çalışma süresi ve seçim gerekçeleri'})).toBeVisible();await page.screenshot({path:root+'/docs/evidence/running-planner/preview.png',fullPage:true});await page.getByRole('button',{name:'Düzenle ve kaydet',exact:true}).click();
 const values=await page.locator('input').evaluateAll(items=>items.map(i=>i.value));expect(values.some(v=>v.includes('koşu'))).toBe(true);
 checks.push('running-only method; all running choices; saved target and weekly minutes; contextual equipment; distance priorities; endurance split; real validation with synthetic provider; prefilled editor; mobile/desktop Axe');
 expect(errors).toEqual([]);writeFileSync(root+'/docs/evidence/running-planner/browser-results.json',JSON.stringify({result:'PASS',checks,errors,browser:browser.version(),provider:'synthetic'},null,2));console.log('Running planning browser PASS');
}catch(e){if(page){await page.screenshot({path:root+'/docs/evidence/running-planner/failure.png',fullPage:true});console.error((await page.locator('body').innerText()).slice(-6000));}throw e;}finally{if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r));}if(created)execFileSync(python,['tools/v2/test_database.py','drop',name],{stdio:'pipe'});}
