import {chromium,expect} from '../../apps/web/node_modules/@playwright/test/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {rmSync} from 'node:fs';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10005',name='alos_test_recovery_'+Date.now();let server,browser,asset;const errors=[];
try{
 execFileSync(python,['tools/v2/test_database.py','create',name],{cwd:root});asset=JSON.parse(execFileSync(python,['tools/v2/synthetic_model_setup.py',name],{cwd:root,encoding:'utf8',env:{...process.env,ALOS_SYNTHETIC_NAMED_MODEL:'1'}}));
 server=spawn(python,['-m','uvicorn','alos.main:create_app','--factory','--host','127.0.0.1','--port','10005','--no-access-log'],{cwd:root,env:{...process.env,PYTHONPATH:root+'/apps/api',ALOS_V2_ENABLED:'1',ALOS_V2_ENVIRONMENT:'test',ALOS_V2_PUBLIC_ORIGIN:base,ALOS_V2_DATABASE_URL:process.env.ALOS_TEST_BACKEND==='mongodb'?'mongodb://127.0.0.1:27028/?replicaSet=alos-test':'postgresql://localhost:15432/'+name,ALOS_V2_MONGO_DATABASE:name,ALOS_V2_BODY_MODEL_PATH:asset.path,ALOS_V2_BODY_MODEL_OWNER_ID:asset.owner},stdio:'ignore'});
 for(let i=0;i<80;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.ALOS_BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();await page.clock.install();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible();

 const fixtures=JSON.parse(execFileSync(python,['-c',`import json,sys
sys.path.insert(0,'apps/api')
from alos.domain.science import compute
from datetime import datetime,timezone,timedelta
at=datetime(2026,9,24,12,tzinfo=timezone.utc)
s={'timezone':'Europe/Istanbul','sets':[{'id':'s'+str(i),'version':1,'modality':'strength','movement_id':'weighted-pull-up','name':'Weighted Pull-Up','local_date':'2026-09-24','occurred_at':at.isoformat(),'reps':10,'rir':1,'external_kg':20,'status':'completed'} for i in range(8)]}
print(json.dumps([compute(s,at+timedelta(hours=h)) for h in (0,48)]))`],{cwd:root,encoding:'utf8'}));
 let phase=0,models=0;
 page.on('request',r=>{if(r.url().endsWith('/api/v2/body-model/content'))models++});
 page.on('console',message=>{if(message.type()==='error'&&/shader|webglprogram/i.test(message.text()))errors.push(message.text())});
 await page.route('**/api/v2/analysis?*',async route=>{const response=await route.fetch();const data=await response.json();await route.fulfill({response,json:{...data,muscle_recovery:fixtures[phase].muscle_recovery,muscles:fixtures[phase].muscles}})});
 await page.goto(base+'/#reports');await page.getByRole('button',{name:'3B kütüphanemi aç',exact:true}).click();
 await expect(page.getByRole('button',{name:'Önden',exact:true})).toBeVisible({timeout:15000});
 const canvas=page.locator('.body-model-canvas canvas'),detail=page.getByRole('region',{name:'Seçili kas analizi'});
 await expect(detail.getByText('Hesaba giren 8 set')).toBeVisible();
 await page.getByLabel('Kas bölgesi',{exact:true}).selectOption('chest');
 await expect(detail).toContainText('yüzde hesabı için eşleşen kuvvet seti yok');
 const rect=await canvas.boundingBox();await canvas.click({position:{x:rect.width/2,y:rect.height/2}});
 await expect(page.getByLabel('Kas bölgesi',{exact:true})).toHaveValue('lats');
 const colored=await canvas.screenshot();await page.getByLabel('Boyama',{exact:true}).selectOption('original');
 const original=await canvas.screenshot();expect(colored.equals(original)).toBe(false);
 await page.getByLabel('Boyama',{exact:true}).selectOption('load');
 phase=1;await page.clock.runFor(60010);
 const fatigue=fixtures[1].muscle_recovery.groups.lats.fatigue.low.toFixed(1);
 await expect(detail.getByRole('heading',{name:'%'+fatigue,exact:true})).toBeVisible();
 expect(models).toBe(1);
 await page.getByText('Model yönünü düzelt',{exact:true}).click();await page.getByLabel('Modelin dik ekseni').selectOption('z');await page.getByLabel('Modelin dik ekseni').selectOption('y');
 await expect(canvas).toBeVisible();expect(models).toBe(1);
 await page.screenshot({path:root+'/docs/evidence/stage-9/synthetic-recovery-3d.png',fullPage:true});
 expect(errors).toEqual([]);
 console.log(JSON.stringify({result:'PASS',fixture:'Synthetic named triangle and clock-injected synthetic workout analysis; no personal GLB/data',browser:browser.version(),checks:['WebGL shader compiles','Named mesh click selects lats','Unknown region stays unknown','Canvas pixels change with overlay toggle','60-second refresh shows 48h lower fatigue without reloading GLB','Orientation calibration redraws without GLB download'],errors}));
}finally{if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r))}if(asset)rmSync(asset.path);execFileSync(python,['tools/v2/test_database.py','drop',name],{cwd:root})}
