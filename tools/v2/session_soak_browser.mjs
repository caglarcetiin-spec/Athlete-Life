// Synthetic repeated navigation probe; reports a bounded session, not a lifetime leak proof.
import { chromium, expect } from '../../apps/web/node_modules/@playwright/test/index.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const root=process.cwd(), python=root+'/.venv-v2/bin/python', base='http://127.0.0.1:10005';
const name='alos_test_soak_'+Date.now(), started=Date.now();
let server,browser;const errors=[],samples=[];let requests=0;
const routes=['today','week','workout','program','nutrition','health','capability','status','reports','science','goals','system','backups','tools','profile','guide','events'];
try {
 execFileSync(python,['tools/v2/test_database.py','create',name],{cwd:root});
 server=spawn(python,['-m','uvicorn','alos.main:create_app','--factory','--host','127.0.0.1','--port','10005','--no-access-log'],{cwd:root,env:{...process.env,PYTHONPATH:root+'/apps/api',ALOS_V2_ENABLED:'1',ALOS_V2_ENVIRONMENT:'test',ALOS_V2_PUBLIC_ORIGIN:base,ALOS_V2_DATABASE_URL:process.env.ALOS_TEST_BACKEND==='mongodb'?'mongodb://127.0.0.1:27028/?replicaSet=alos-test':'postgresql://localhost:15432/'+name,ALOS_V2_MONGO_DATABASE:name},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.ALOS_BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const context=await browser.newContext(), page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/v2/'))requests++});
 await page.goto(base);await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible();
 const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
 for(let cycle=0;cycle<12;cycle++){
  for(const route of routes){await page.evaluate(route=>{location.hash=route},route);await expect(page.locator('main h1')).toBeVisible();await page.waitForTimeout(120);expect(await page.locator('main').innerText()).not.toContain('Bu bölüm açılırken');}
  await cdp.send('HeapProfiler.collectGarbage');const metrics=await cdp.send('Performance.getMetrics');samples.push({cycle:cycle+1,elapsedMs:Date.now()-started,requests,heapBytes:metrics.metrics.find(x=>x.name==='JSHeapUsedSize').value});
 }
 await page.reload();await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible();
 const boot=await page.evaluate(async()=>{const r=await fetch('/api/v2/bootstrap');if(!r.ok)throw Error(r.status);return r.json()});expect(boot.cursor).toBe(0);expect(errors).toEqual([]);
 const result={result:'PASS',browser:browser.version(),routeTransitions:12*routes.length,elapsedMs:Date.now()-started,samples,pageErrors:errors,canonicalCursorAfterReload:boot.cursor,limits:'204 repeated SPA transitions with empty synthetic domain records. GC heap measurements reported without claiming a lifetime memory-leak proof or real-device equivalence.'};
 writeFileSync(root+'/docs/evidence/stage-9/session-soak-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r))}execFileSync(python,['tools/v2/test_database.py','drop',name],{cwd:root})}
