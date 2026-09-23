import {chromium,expect} from '../../apps/web/node_modules/@playwright/test/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import AxeBuilder from '../../apps/web/node_modules/@axe-core/playwright/dist/index.mjs';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10005',name='alos_test_routes_'+Date.now();let server,browser;const errors=[],results=[];
const routes=['today','week','workout','program','nutrition','health','capability','status','reports','science','goals','system','backups','tools','profile','guide','events'];
try{
 execFileSync(python,['tools/v2/test_database.py','create',name],{cwd:root});server=spawn(python,['-m','uvicorn','alos.main:create_app','--factory','--host','127.0.0.1','--port','10005','--no-access-log'],{cwd:root,env:{...process.env,PYTHONPATH:root+'/apps/api',ALOS_V2_ENABLED:'1',ALOS_V2_ENVIRONMENT:'test',ALOS_V2_PUBLIC_ORIGIN:base,ALOS_V2_DATABASE_URL:'postgresql://localhost:15432/'+name},stdio:'ignore'});
 for(let i=0;i<80;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.ALOS_BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 for(const viewport of [{width:390,height:844},{width:1440,height:1000}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible();
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>{localStorage.setItem('alos-theme',theme)},theme);await page.reload();
   for(const route of routes){
    await page.evaluate(route=>{location.hash=route},route);await expect(page.locator('main')).toBeVisible();await expect(page.locator('main h1')).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const result=await new AxeBuilder({page}).analyze();results.push({route,theme,viewport,violations:result.violations});
   }
  }
  await page.goto(base+'/#system');await page.getByRole('button',{name:'Sistem bütünlüğünü kontrol et'}).click();await expect(page.getByText('2 / 2 kontrol geçti.',{exact:true})).toBeVisible();
  await context.close();
 }
 writeFileSync(root+'/docs/evidence/stage-6/routes-a11y.json',JSON.stringify({browser:browser.version(),results,errors},null,2));expect(errors).toEqual([]);expect(results.flatMap(r=>r.violations.map(v=>({route:r.route,theme:r.theme,viewport:r.viewport,id:v.id,nodes:v.nodes.map(n=>n.target)})))).toEqual([]);console.log('All routes, light/dark, mobile/desktop, reduced motion, integrity UI: PASS');
}finally{if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r))}execFileSync(python,['tools/v2/test_database.py','drop',name],{cwd:root})}
