import {chromium,expect} from '../../apps/web/node_modules/@playwright/test/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import AxeBuilder from '../../apps/web/node_modules/@axe-core/playwright/dist/index.mjs';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10011',name='alos_test_sport_browser_'+Date.now();let server,browser,page,created=false;const errors=[],checks=[];
async function synced(){await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible({timeout:20000});}
async function next(){await page.getByRole('button',{name:'Devam',exact:true}).click();}
try{
 try{await fetch(base+'/health/ready');throw Error('Test port occupied');}catch(e){if(e.message==='Test port occupied')throw e;}
 mkdirSync(root+'/docs/evidence/metrics',{recursive:true});execFileSync(python,['tools/v2/test_database.py','create',name],{stdio:'pipe'});created=true;
 server=spawn(python,['-m','uvicorn','tools.v2.sport_training_fixture:create','--factory','--host','127.0.0.1','--port','10011','--no-access-log'],{env:{...process.env,PYTHONPATH:root+'/apps/api:'+root,PYTHON_DOTENV_DISABLED:'1',STORAGE_BACKEND:'sqlite',ACCOUNT_STORAGE_BACKEND:'sqlite',ALOS_SYNTHETIC_SPORT_DB:name},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await synced();await next();
 await page.getByRole('button',{name:'Koşu çalışması',exact:false}).click();
 await expect(page.getByRole('button',{name:'Ağırlık çalışması',exact:false})).not.toBeVisible();await next();
 for(const label of ['Kolay tempoda koşu','Tempo koşusu','Uzun ve rahat koşu']) await page.getByRole('checkbox',{name:label,exact:true}).check();
 await expect(page.getByRole('checkbox',{name:'Yokuş tekrarları',exact:true})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:'Kontrollü kısa hızlanmalar',exact:true})).toBeVisible();
 await page.getByLabel('Kolay tempoda koşu kapasitesi birimi',{exact:true}).selectOption('min');await page.getByLabel('Kolay tempoda koşu kapasitesi',{exact:true}).fill('30');
 await page.getByLabel('Kolay tempoda koşu kapasitesi birimi',{exact:true}).selectOption('h');await expect(page.getByLabel('Kolay tempoda koşu kapasitesi',{exact:true})).toHaveValue('0.5');
 await page.getByLabel('Kolay tempoda koşu kapasitesi birimi',{exact:true}).selectOption('min');await expect(page.getByLabel('Kolay tempoda koşu kapasitesi',{exact:true})).toHaveValue('30');
 await page.getByLabel('Hedef koşu mesafen (km)' ,{exact:true}).fill('10');
 await page.getByLabel('Son haftalarda haftalık koşu süren (dakika)',{exact:true}).fill('75');
 await page.reload();await synced();await expect(page.getByLabel('Hedef koşu mesafen (km)',{exact:true})).toHaveValue('10');
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const axe=await new AxeBuilder({page}).include('.guided-plan').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await page.screenshot({path:root+`/docs/evidence/metrics/choices-${width}.png`,fullPage:true});}
 await next();await expect(page.getByRole('button',{name:'İkisi birlikte',exact:false})).toHaveCount(0);await page.getByLabel('Somut hedefin ne?',{exact:true}).fill('Rahat 10 km koşusuna hazırlanmak');await next();
 await expect(page.getByRole('button',{name:'Atletizm pisti',exact:true})).toBeVisible();await page.getByRole('button',{name:'Yol / düz parkur',exact:true}).click();await next();await next();
 await expect(page.getByRole('heading',{name:'Hangi performans hedefleri önceliğin?',exact:true})).toBeVisible();await expect(page.getByLabel('Göğüs öncelik puanı',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Daha uzun mesafe',exact:true}).click();await next();
 await expect(page.getByRole('button',{name:'Dayanıklılık günleri',exact:false})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Tüm vücut',exact:false})).toHaveCount(0);await next();
 await page.getByLabel('Başlangıç tarihi',{exact:true}).fill('2026-09-28');await page.getByLabel('18 yaş veya üzerindeyim.',{exact:true}).check();await page.getByRole('checkbox',{name:/Bu formdaki planlama bilgilerimin AI taslağı için EVREN/}).check();
 const rp=page.waitForResponse(r=>r.url().endsWith('/api/v2/ai-program-drafts'));await page.getByRole('button',{name:'AI ile programımı hazırla',exact:true}).click();const response=await rp;const result=await response.json();expect(response.status(),JSON.stringify(result)).toBe(200);expect(result.program.ai_origin.prompt_version).toBe('ai-planner-9');expect(result.program.guided_choices.methods).toEqual(['running']);expect(result.program.guided_choices.competencies.find(c=>c.movement_id==='zone-2-run').seconds).toBe(1800);
 expect(result.program.guided_choices.performance_focus).toContain('distance');expect(result.program.guided_choices.running_profile.target_distance_km).toBe(10);
 expect(result.program.days.flatMap(d=>d.exercises).every(e=>e.modality==='cardio' && e.seconds>0)).toBe(true);
 await expect(page.getByRole('heading',{name:'Planına göz at',exact:true})).toBeVisible();await expect(page.locator('summary').filter({hasText:'Çalışma süresi ve seçim gerekçeleri'})).toBeVisible();await page.screenshot({path:root+'/docs/evidence/metrics/preview.png',fullPage:true});await page.getByRole('button',{name:'Düzenle ve kaydet',exact:true}).click();
 const values=await page.locator('input').evaluateAll(items=>items.map(i=>i.value));expect(values.some(v=>v.includes('koşu'))).toBe(true);
 await page.locator('summary').filter({hasText:'Kolay tempoda koşu'}).first().click();await page.getByLabel('Süre birimi',{exact:true}).first().selectOption('min');await page.getByLabel('Süre',{exact:true}).first().fill('30');
 await page.getByLabel('Mesafe birimi',{exact:true}).first().selectOption('km');await page.getByLabel('Mesafe',{exact:true}).first().fill('5');
 await page.getByLabel('Dinlenme birimi',{exact:true}).first().selectOption('min');await page.getByLabel('Dinlenme',{exact:true}).first().fill('1,5');
 await page.getByRole('button',{name:'Taslağı kaydet',exact:true}).click();await synced();
 async function snapshot(){return page.evaluate(async()=>await(await fetch('/api/v2/bootstrap')).json());}
 await expect.poll(async()=> (await snapshot()).programs.length).toBe(1);
 const state=await snapshot(),program=state.programs[0],exercise=state.program_exercises.find(e=>e.day_id===state.program_days.find(d=>d.program_id===program.id && d.weekday===0).id);expect(exercise.seconds).toBe(1800);expect(exercise.distance_m).toBe(5000);expect(exercise.rest_seconds).toBe(90);
 await page.getByRole('button',{name:'Ana planım yap',exact:true}).click();await synced();await page.goto(base+'/?date=2026-09-28#workout');await synced();
 await page.getByRole('button',{name:'Günün reçetesini hazırla',exact:true}).click();await synced();await page.getByRole('button',{name:'Yeni seans aç',exact:true}).click();await synced();
 const form=page.locator('.set-form');await form.getByLabel('Süre birimi',{exact:true}).selectOption('min');await form.getByLabel('Süre',{exact:true}).fill('30');await form.getByLabel('Mesafe birimi',{exact:true}).selectOption('km');await form.getByLabel('Mesafe',{exact:true}).fill('5');
 await form.getByLabel('Süre birimi',{exact:true}).selectOption('h');await expect(form.getByLabel('Süre',{exact:true})).toHaveValue('0.5');
 await page.getByRole('button',{name:'Gerçek seti kaydet',exact:true}).click();await synced();await expect.poll(async()=> (await snapshot()).sets.length).toBe(1);
 expect((await snapshot()).sets[0]).toMatchObject({seconds:1800,distance_m:5000});
 await page.getByRole('button',{name:'Seansı tamamla',exact:true}).click();await synced();await page.getByText('Seans özeti ve isteğe bağlı geri bildirim',{exact:true}).click();
 await page.getByLabel('Gerçek toplam seans süresi birimi',{exact:true}).selectOption('h');await page.getByLabel('Gerçek toplam seans süresi',{exact:true}).fill('0,5');await page.getByLabel('Tüm seansın eforu (0–10)',{exact:true}).fill('4');await page.getByRole('button',{name:'Kaydı sakla',exact:true}).click();await synced();
 await expect.poll(async()=> (await snapshot()).sessions[0].feedback?.session_load_au).toBe(120);expect((await snapshot()).sessions[0].feedback.duration_seconds).toBe(1800);
 await page.reload();await synced();expect((await snapshot()).sets[0]).toMatchObject({seconds:1800,distance_m:5000});
 checks.push('30 min / 0.5 hour → 1800 seconds; 5 km → 5000 m; 1.5 min rest → 90s; wizard, editor, actual set, feedback and reload; session load 30min*4=120; mobile/desktop Axe');
 expect(errors).toEqual([]);writeFileSync(root+'/docs/evidence/metrics/browser-results.json',JSON.stringify({result:'PASS',checks,errors,browser:browser.version(),provider:'synthetic'},null,2));console.log('Metrics browser PASS');
}catch(e){if(page){await page.screenshot({path:root+'/docs/evidence/metrics/failure.png',fullPage:true});console.error((await page.locator('body').innerText()).slice(-6000));}throw e;}finally{if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r));}if(created)execFileSync(python,['tools/v2/test_database.py','drop',name],{stdio:'pipe'});}
