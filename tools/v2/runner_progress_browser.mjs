import {chromium,expect} from '../../apps/web/node_modules/@playwright/test/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10009',name='alos_test_runner_'+Date.now();
let server,browser,page; const errors=[];
async function api(path,body){return page.evaluate(async({path,body})=>{const me=await(await fetch('/api/v2/auth/me')).json();const r=await fetch('/api/v2/'+path,body?{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':me.csrf},body:JSON.stringify(body)}:{});if(!r.ok)throw Error(await r.text());return r.json()},{path,body});}
async function command(type,id,version,payload){return api('commands',{operation_id:randomUUID(),entity_id:id,expected_version:version,schema_version:1,command_type:type,payload});}
async function synced(){await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible({timeout:20000});}
try {
 try { await fetch(base+'/health/ready'); throw Error('Test port already occupied'); } catch(e) { if(e.message==='Test port already occupied') throw e; }
 mkdirSync(root+'/docs/evidence/runner-progress',{recursive:true});
 execFileSync(python,['tools/v2/test_database.py','create',name],{stdio:'pipe'});
 server=spawn(python,['-m','uvicorn','alos.main:create_app','--factory','--host','127.0.0.1','--port','10009','--no-access-log'],{env:{...process.env,PYTHONPATH:root+'/apps/api',ALOS_V2_ENABLED:'1',ALOS_V2_ENVIRONMENT:'test',ALOS_V2_PUBLIC_ORIGIN:base,ALOS_V2_DATABASE_URL:'postgresql://localhost:15432/'+name},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await synced();
 await page.getByRole('button',{name:'Devam',exact:true}).click();
 await page.getByLabel('Branş ara',{exact:true}).fill('yüzme');await page.getByLabel('Çalıştığın branşı ekle',{exact:true}).selectOption('swimming');
 await page.getByLabel('Spor geçmişin ve şu anki düzenin',{exact:true}).fill('İki yıldır yüzüyorum.');
 await page.getByRole('button',{name:'Yüzme çalışması',exact:false}).click();await page.getByRole('button',{name:'Devam',exact:true}).click();
 await page.getByLabel('Hareket ara',{exact:true}).fill('Serbest');await expect(page.getByRole('checkbox',{name:'Serbest stil yüzme',exact:true})).toBeVisible();
 const id=randomUUID();
 await command('program.create',id,0,{name:'Sentetik halka ve kuvvet',goal:'Set sırasını doğrulamak',weeks:4,start_date:'2026-09-14',days:[{weekday:1,label:'Halka günü',kind:'training',exercises:[{movement_id:'ring-l-sit',name:'Halkada L tutuş',catalog_version:'movement-catalog-2',sets:2,seconds:6,modality:'isometric',load_kind:'bodyweight',equipment:'Rings',rest_seconds:120,set_kind:'working'},{movement_id:'muscle-up',name:'Bar üzerinde muscle-up',catalog_version:'movement-catalog-2',sets:1,reps:3,modality:'skill',load_kind:'bodyweight',rest_seconds:90,set_kind:'working'}]}]});
 let state=await api('bootstrap');await command('program.activate',id,state.programs[0].version,{});
 await page.goto(base+'/?date=2026-09-15#workout');await synced();await page.getByRole('button',{name:'Günün reçetesini hazırla',exact:true}).click();await synced();await page.getByRole('button',{name:'Yeni seans aç',exact:true}).click();await synced();
 await expect(page.getByRole('status').filter({hasText:'Sıradaki:'})).toContainText('1. seti / 2');
 await page.getByRole('button',{name:'Hedefi aynen tamamladım',exact:true}).click();await synced();
 await expect(page.getByRole('status').filter({hasText:'Sıradaki:'})).toContainText('2. seti / 2');
 state=await api('bootstrap');expect(state.sets).toHaveLength(1);const sid=state.sessions[0].id;expect(state.sessions[0].status).toBe('active');
 await page.getByRole('button',{name:'Seansı tamamla',exact:true}).click();await expect(page.getByRole('alert')).toContainText('2 planlanan set');await page.getByRole('button',{name:'Sete dön',exact:true}).click();
 await page.getByRole('button',{name:'Seansı tamamla',exact:true}).click();await page.getByRole('button',{name:'Eksik setlerle seansı bitir',exact:true}).click();await synced();
 await page.getByRole('button',{name:'Eksik setlere devam et',exact:true}).click();await synced();expect((await api('bootstrap')).sets).toHaveLength(1);
 await page.getByRole('button',{name:'Seans listesini göster',exact:true}).click();await page.getByRole('button',{name:'Seansıma devam et',exact:true}).click();await synced();expect((await api('bootstrap')).sessions).toHaveLength(1);
 await context.setOffline(true);await page.getByRole('button',{name:'Hedefi aynen tamamladım',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Sıradaki:'})).toContainText('Bar üzerinde muscle-up');
 await context.setOffline(false);await page.reload();await synced();await expect.poll(async()=> (await api('bootstrap')).sets.length).toBe(2);await expect(page.getByRole('status').filter({hasText:'Sıradaki:'})).toContainText('Bar üzerinde muscle-up');
 await page.locator('.set-form').getByLabel('Tekrar',{exact:true}).fill('7');await page.getByRole('button',{name:'Gerçek seti kaydet',exact:true}).click();await synced();
 await expect(page.getByText('Planlanan bütün slotlar kayıtlı. İstersen seansı tamamla.',{exact:true})).toBeVisible();state=await api('bootstrap');expect(state.sets).toHaveLength(3);expect(new Set(state.sets.map(s=>s.slot_id)).size).toBe(3);expect(state.sets.find(s=>s.movement_id==='muscle-up').reps).toBe(7);
 await page.getByRole('button',{name:'Seansı tamamla',exact:true}).click();await synced();expect((await api('bootstrap')).sessions[0].status).toBe('completed');
 await page.goto(base+'/?date=2026-09-15#week');await synced();await expect(page.getByRole('region',{name:'Haftalık antrenman planım'})).toContainText('Halka günü');await expect(page.getByRole('region',{name:'Haftalık antrenman planım'})).toContainText('1 tamamlanan seans');
 await page.screenshot({path:root+'/docs/evidence/runner-progress/mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 writeFileSync(root+'/docs/evidence/runner-progress/results.json',JSON.stringify({result:'PASS',checks:['same-exercise set advances','early finish requires explicit choice','resume reuses session','offline next exercise and reload preserved','manual actual preserved','three distinct slots','weekly plan reflects completion'],browser:browser.version(),errors},null,2));console.log('Runner progression: PASS');
} finally {if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r));}execFileSync(python,['tools/v2/test_database.py','drop',name],{stdio:'pipe'});}
