import { chromium, expect } from '../../apps/web/node_modules/@playwright/test/index.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import AxeBuilder from '../../apps/web/node_modules/@axe-core/playwright/dist/index.mjs';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10011',name='alos_test_sport_browser_'+Date.now(),out=root+'/docs/evidence/intake';
let server,browser,page,created=false;const errors=[],checks=[];
async function next(){await page.getByRole('button',{name:'Devam',exact:true}).click();}
async function fillIntake(){await page.getByLabel('Yaşın',{exact:true}).fill('28');await page.getByLabel('Boyun (cm)',{exact:true}).fill('168');await page.getByLabel('Kilon (kg)',{exact:true}).fill('64');await page.getByLabel('Toplam spor geçmişin (ay)',{exact:true}).fill('0');}
try {
  try {await fetch(base+'/health/ready');throw Error('Test port occupied');}catch(e){if(e.message==='Test port occupied')throw e;}
  mkdirSync(out,{recursive:true});execFileSync(python,['tools/v2/test_database.py','create',name],{stdio:'pipe'});created=true;
  server=spawn(python,['-m','uvicorn','tools.v2.intake_browser_fixture:create','--factory','--host','127.0.0.1','--port','10011','--no-access-log'],{env:{...process.env,PYTHONPATH:root+'/apps/api:'+root,PYTHON_DOTENV_DISABLED:'1',STORAGE_BACKEND:'sqlite',ACCOUNT_STORAGE_BACKEND:'sqlite',ALOS_SYNTHETIC_SPORT_DB:name},stdio:'ignore'});
  for(let i=0;i<100;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.getByRole('button',{name:'Hesap oluştur',exact:true}).click();await page.getByLabel('Adın',{exact:true}).fill('Sentetik Sporcu');await page.getByLabel('Kullanıcı adı',{exact:true}).fill('onboarding-test');await page.getByLabel('Şifre',{exact:true}).fill('synthetic-password-123');await page.getByRole('button',{name:'Hesap oluştur',exact:true}).click();
  // Signup may land back at login; first use must always enter the assessment.
  if(await page.getByRole('button',{name:'Giriş yap',exact:true}).isVisible()) {await page.getByLabel('Kullanıcı adı',{exact:true}).fill('onboarding-test');await page.getByLabel('Şifre',{exact:true}).fill('synthetic-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();}
  await expect(page.getByRole('heading',{name:'Başlangıç analizin',exact:true})).toBeVisible({timeout:15000});
  await page.goto(base+'/#health');await expect(page.getByRole('heading',{name:'Başlangıç analizin',exact:true})).toBeVisible();checks.push('New signup and hash navigation stay in intake');
  await fillIntake();await page.getByLabel('Cinsiyet',{exact:true}).selectOption('female');await page.getByLabel('Döngü bilgisi eklemek ister misin?',{exact:true}).selectOption('yes');
  await page.getByLabel('Son adet başlangıcı',{exact:true}).fill('2026-09-14');await page.getByLabel('Adet süresi (gün)',{exact:true}).fill('4');await page.getByLabel('Genellikle iki başlangıç arası (gün)',{exact:true}).fill('28');await page.getByLabel('Adet günlerinde nasıl çalışmak istersin?',{exact:true}).selectOption('pause');
  await page.getByRole('checkbox',{name:/Döngü uzunluğuma göre tahmin/}).check();await page.screenshot({path:out+'/assessment-mobile.png',fullPage:true});
  for (const theme of ['light','dark']) {if(theme==='dark')await page.getByRole('button',{name:'Koyu temaya geç',exact:true}).click();
    // Audit the settled theme, not an intermediate CSS transition frame.
    await page.locator('form > button').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
    const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(a.violations).toEqual([]);}
  await page.getByRole('button',{name:'Analizi kaydet ve planına geç',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Nereden başlıyoruz?',exact:true})).toBeVisible({timeout:20000});
  await expect(page.getByLabel('Boyun (cm)',{exact:true})).toHaveValue('168');await expect(page.getByLabel('Toplam spor geçmişin (ay)',{exact:true})).toHaveValue('0');await expect(page.getByText('Yeni başlangıç seçildi:',{exact:false})).toBeVisible();
  await next();await next();await next();await page.getByLabel('Somut hedefin ne?',{exact:true}).fill('Düzenli antrenmana başlamak ve temel hareketleri öğrenmek');await next();await next();await next();await next();await page.getByLabel('Dönem uzunluğu',{exact:true}).selectOption('4');await next();
  await page.getByLabel('18 yaş veya üzerindeyim.',{exact:true}).check();await page.getByRole('checkbox',{name:/Bu formdaki planlama bilgilerimin AI taslağı için EVREN/}).check();
  const pending=page.waitForResponse(r=>r.url().endsWith('/api/v2/ai-program-drafts'));await page.getByRole('button',{name:'AI ile programımı hazırla',exact:true}).click();const response=await pending;
  expect(response.status()).toBe(200);const sent=response.request().postDataJSON();expect(sent.athlete_context.weight_kg).toBe(64);expect(sent.athlete_context.sex).toBe('female');expect(sent.experience).toBe('new');expect(sent.athlete_context.cycle.preference).toBe('pause');
  const result=await response.json();expect(result.notes.some(n=>n.includes('dinlenme tarihleri'))).toBe(true);checks.push('Prefilled novice and cycle preferences reach planner; confirmed breaks appear in preview');
  await expect(page.getByRole('heading',{name:'Planına göz at',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Döngü tercihine göre takvim',exact:true})).toBeVisible();await page.getByRole('button',{name:'Düzenle ve kaydet',exact:true}).click();await page.getByRole('button',{name:'Taslağı kaydet',exact:true}).click();await page.getByRole('button',{name:'Ana planım yap',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Mobil ana gezinme',exact:true})).toBeVisible({timeout:20000});await page.goto(base+'/#health');await expect(page.getByRole('heading',{name:'Başlangıç analizin',exact:true})).toHaveCount(0);await expect(page.getByRole('navigation',{name:'Mobil ana gezinme',exact:true})).toBeVisible();
  checks.push('Plan approval unlocks navigation; persisted completion survives reload');
  await page.goto(base+'/#profile');await expect(page.getByLabel('Kilon (kg)',{exact:true})).toHaveValue('64');await page.getByLabel('Cinsiyet',{exact:true}).selectOption('male');await expect(page.getByLabel('Son adet başlangıcı',{exact:true})).toHaveCount(0);checks.push('Male selection clears and hides optional cycle fields');
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:out+'/profile-desktop.png',fullPage:true});expect(errors).toEqual([]);
  writeFileSync(out+'/BROWSER.json',JSON.stringify({checks,errors,provider:'synthetic EVREN; no real provider called'},null,2));console.log(checks.join('\n')+'\nFirst-use journey and accessibility PASS');
} catch(e) { if(page){await page.screenshot({path:out+'/failure.png',fullPage:true});console.error((await page.locator('body').innerText()).slice(-9000));}throw e; }
finally {if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r));}if(created)execFileSync(python,['tools/v2/test_database.py','drop',name],{stdio:'pipe'});}
