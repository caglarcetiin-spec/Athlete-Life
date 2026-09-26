import {chromium,expect} from '../../apps/web/node_modules/@playwright/test/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {rmSync,writeFileSync} from 'node:fs';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10005',name='alos_test_navigation_'+Date.now();let server,browser,asset;const errors=[];
try{
 execFileSync(python,['tools/v2/test_database.py','create',name],{cwd:root});asset=JSON.parse(execFileSync(python,['tools/v2/synthetic_model_setup.py',name],{cwd:root,encoding:'utf8',env:{...process.env,ALOS_SYNTHETIC_NAMED_MODEL:'1'}}));
 server=spawn(python,['-m','uvicorn','alos.main:create_app','--factory','--host','127.0.0.1','--port','10005','--no-access-log'],{cwd:root,env:{...process.env,PYTHONPATH:root+'/apps/api',ALOS_V2_ENABLED:'1',ALOS_V2_ENVIRONMENT:'test',ALOS_V2_PUBLIC_ORIGIN:base,ALOS_V2_DATABASE_URL:process.env.ALOS_TEST_BACKEND==='mongodb'?'mongodb://127.0.0.1:27028/?replicaSet=alos-test':'postgresql://localhost:15432/'+name,ALOS_V2_MONGO_DATABASE:name,ALOS_V2_BODY_MODEL_PATH:asset.path,ALOS_V2_BODY_MODEL_OWNER_ID:asset.owner},stdio:'ignore'});
 for(let i=0;i<80;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.ALOS_BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible();



 const {default:AxeBuilder}=await import('../../apps/web/node_modules/@axe-core/playwright/dist/index.mjs');
 const destinations=[['today','Bugün'],['workout','Antrenman'],['health','Sağlık'],['status','Gelişim'],['tools','Araçlar']];
 const groups={today:['today'],workout:['workout','program','week'],health:['health','nutrition'],status:['status','reports','goals'],tools:['tools','capability','events','backups','science','system','guide']};
 const audit=[];
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:900});
  const nav=page.getByRole('navigation',{name:width===390?'Mobil ana gezinme':'Ana gezinme',exact:true});
  await expect(nav).toBeVisible();await expect(nav.getByRole('link')).toHaveCount(5);
  for(const [route,label] of destinations){
   await nav.getByRole('link',{name:label,exact:true}).click();
   await expect(nav.getByRole('link',{name:label,exact:true})).toHaveAttribute('aria-current','location');
   if(route==='tools'){
    await expect(page.locator('.tool-card')).toHaveCount(6);
    await expect(page.locator('.tool-card[href="#program"],.tool-card[href="#reports"],.tool-card[href="#goals"]')).toHaveCount(0);
    await page.getByRole('link',{name:'Capability Lab Beceri ve fiziksel kapasite testleri.',exact:true}).click();
    await expect(page.getByRole('navigation',{name:'Bölüm yolu'})).toContainText('Capability Lab');
    await page.getByRole('navigation',{name:'Bölüm yolu'}).getByRole('link',{name:'Araçlar',exact:true}).click();
   }
   await page.locator('.page-enter').evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished))});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const violations=(await new AxeBuilder({page}).analyze()).violations;
   audit.push({width,route,violations});expect(violations).toEqual([]);
  }
  await page.goto(base+'/?date=2026-09-10#program');
  await expect(nav.locator('[aria-current]')).toContainText('Antrenman');
  await page.getByRole('navigation',{name:'Antrenman bölümleri'}).getByRole('link',{name:'Haftam',exact:true}).click();
  expect(new URL(page.url()).searchParams.get('date')).toBe('2026-09-10');
  await expect(page.locator('#content')).toBeFocused();
  await page.getByRole('button',{name:'Geri git',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Antrenman planım',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'İleri git',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Haftam',exact:true})).toBeVisible();
  for(const [parent,routes] of Object.entries(groups))for(const route of routes){
   await page.goto(base+'/?date=2026-09-10#'+route);
   await expect(nav.locator('[aria-current]')).toHaveAttribute('href','#'+parent);
  }
  await page.goto(base+'/#today');
  await page.locator('.page-enter').evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished))});
  await page.screenshot({path:root+'/docs/evidence/stage-9/navigation-'+width+'.png',fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Açık tema; koyu temaya geç',exact:true}).click();
 await page.locator('.page-enter').evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished))});
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 await page.screenshot({path:root+'/docs/evidence/stage-9/navigation-dark.png',fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('navigation',{name:'Mobil ana gezinme'}).getByRole('link',{name:'Antrenman',exact:true}).click();
 await expect(page.locator('#content')).toBeFocused();
 expect(errors).toEqual([]);
 writeFileSync(root+'/docs/evidence/stage-9/navigation-browser-results.json',JSON.stringify({result:'PASS',browser:browser.version(),checks:['Five primary destinations on desktop and mobile','No duplicated Tools destinations','All grouped deep links retain their parent section','Section navigation preserves selected past date','Back/forward restores section','Focus and reduced motion','Light/dark accessibility and no horizontal overflow'],audit,errors},null,2));
 console.log('Navigation, section hierarchy, accessibility and history: PASS');
}finally{if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r))}if(asset)rmSync(asset.path);execFileSync(python,['tools/v2/test_database.py','drop',name],{cwd:root})}
