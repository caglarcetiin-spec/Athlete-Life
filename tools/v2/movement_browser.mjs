import {chromium,expect} from '../../apps/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../apps/web/node_modules/@axe-core/playwright/dist/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10005',name='alos_test_visual_'+Date.now();let server,browser;const errors=[];
try {
 execFileSync(python,['tools/v2/test_database.py','create',name],{cwd:root});
 server=spawn(python,['-m','uvicorn','alos.main:create_app','--factory','--host','127.0.0.1','--port','10005','--no-access-log'],{cwd:root,env:{...process.env,PYTHONPATH:root+'/apps/api',ALOS_V2_ENABLED:'1',ALOS_V2_ENVIRONMENT:'test',ALOS_V2_PUBLIC_ORIGIN:base,ALOS_V2_DATABASE_URL:process.env.ALOS_TEST_BACKEND==='mongodb'?'mongodb://127.0.0.1:27028/?replicaSet=alos-test':'postgresql://localhost:15432/'+name,ALOS_V2_MONGO_DATABASE:name},stdio:'ignore'});
 for(let i=0;i<80;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.ALOS_BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}}), page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible();
 await page.goto(base+'/#workout');await page.locator('.movement-library summary').click();
 for(const id of ['squat','pushup','bridge','plank','lunge','bird-dog']) {
  await page.getByLabel('İncelemek istediğin hareket').selectOption(id);
  await expect(page.locator('.movement-library svg[role="img"]')).toHaveCount(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.getByLabel('İncelemek istediğin hareket').selectOption('squat');
 for(const theme of ['light','dark']) {
  await page.evaluate(theme=>{document.documentElement.dataset.theme=theme},theme);
  const result=await new AxeBuilder({page}).include('.movement-library').withTags(['wcag2a','wcag2aa']).analyze();
  expect(result.violations).toEqual([]);
  await page.locator('.movement-library').screenshot({path:root+'/docs/evidence/stage-9/movement-'+theme+'.png'});
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(await page.locator('.page-enter').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 await page.goto(base+'/#program');await expect(page.locator('.movement-library')).toBeVisible();
 expect(errors).toEqual([]);
 writeFileSync(root+'/docs/evidence/stage-9/movement-browser-results.json',JSON.stringify({result:'PASS',viewport:[390,844],themes:['light','dark'],illustrations:6,checks:['No horizontal overflow','Accessible SVG names','WCAG AA library check','Reduced motion','Workout and programming entry points'],errors},null,2));
 console.log('Movement library mobile, light/dark, accessibility, reduced motion: PASS');
} finally {if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r))}execFileSync(python,['tools/v2/test_database.py','drop',name],{cwd:root})}
