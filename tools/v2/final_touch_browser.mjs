import {chromium,expect} from '../../apps/web/node_modules/@playwright/test/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import AxeBuilder from '../../apps/web/node_modules/@axe-core/playwright/dist/index.mjs';
const root=process.cwd(),python=root+'/.venv-v2/bin/python',base='http://127.0.0.1:10011',name='alos_test_sport_browser_'+Date.now();let server,browser,page,created=false;const errors=[],checks=[];
async function synced(){await expect(page.getByRole('button',{name:'Sunucuya kaydedildi',exact:true})).toBeVisible({timeout:20000});}
async function next(){await page.getByRole('button',{name:'Devam',exact:true}).click();}
try{
 try{await fetch(base+'/health/ready');throw Error('Test port occupied');}catch(e){if(e.message==='Test port occupied')throw e;}
 mkdirSync(root+'/docs/evidence/final-touch',{recursive:true});execFileSync(python,['tools/v2/test_database.py','create',name],{stdio:'pipe'});created=true;
 server=spawn(python,['-m','uvicorn','tools.v2.final_touch_fixture:create','--factory','--host','127.0.0.1','--port','10011','--no-access-log'],{env:{...process.env,PYTHONPATH:root+'/apps/api:'+root,PYTHON_DOTENV_DISABLED:'1',STORAGE_BACKEND:'sqlite',ACCOUNT_STORAGE_BACKEND:'sqlite',ALOS_SYNTHETIC_SPORT_DB:name},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health/ready')).ok)break}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByLabel('Kullanıcı adı',{exact:true}).fill('deniz');await page.getByLabel('Şifre',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await synced();
 await page.goto(base+'/#profile');await synced();
 const upload=page.getByLabel('Fotoğraf ekle',{exact:true});
 await upload.setInputFiles({name:'oversize.png',mimeType:'image/png',buffer:Buffer.alloc(8000001)});await expect(page.getByRole('alert')).toContainText('8 MB');
 const png=execFileSync(python,['-c',"import io,sys; from PIL import Image; b=io.BytesIO(); Image.new('RGB',(40,30),'#456789').save(b,format='PNG'); sys.stdout.buffer.write(b.getvalue())"]);
 const padded=Buffer.alloc(8000000);png.copy(padded);
 const photoResponse=page.waitForResponse(r=>r.url().endsWith('/api/v2/commands') && r.request().postDataJSON()?.payload?.avatar===true);
 await upload.setInputFiles({name:'synthetic-avatar.png',mimeType:'image/png',buffer:padded});expect((await photoResponse).status()).toBe(200);await synced();
 for(const route of ['profile','health','workout','program','chat']){await page.goto(base+'/#'+route);await synced();await expect(page.locator('header .profile-link img')).toBeVisible();await expect.poll(()=>page.locator('header .profile-link img').evaluate(e=>e.naturalWidth)).toBeGreaterThan(0);}
 await page.reload();await synced();await expect(page.locator('header .profile-link img')).toBeVisible();
 await page.getByLabel('Mesajın',{exact:true}).fill('Halkada evde uygulayacağım örnek bir programı birlikte hazırlayalım.');
 await page.getByRole('checkbox',{name:/Mesajlarımın ve seçtiğim görselin/}).check();await page.getByRole('button',{name:'Gönder',exact:true}).click();await page.getByRole('button',{name:'Bu yanıtı programa dönüştür',exact:true}).click();
 const source=await page.getByLabel('Programa aktarılacak sohbet metni',{exact:true}).inputValue();
 await page.getByRole('button',{name:'Planlayıcıda tamamla',exact:true}).click();
 await expect(page.getByLabel('Yaşın',{exact:true})).toBeVisible();
 await page.getByLabel('Yaşın',{exact:true}).fill('28');await page.getByLabel('Boyun (cm)',{exact:true}).fill('175');await page.getByLabel('Kilon (kg)',{exact:true}).fill('75');await page.getByLabel('Toplam spor geçmişin (ay)',{exact:true}).fill('24');await page.getByRole('button',{name:'Düzenli çalışıyorum',exact:false}).click();await next();
 await page.getByLabel('Çalıştığın branşı ekle',{exact:true}).selectOption('strength');
 await page.getByLabel('Çalıştığın branşı ekle',{exact:true}).selectOption('calisthenics');
 await page.getByLabel('Spor geçmişin ve şu anki düzenin',{exact:true}).fill('İki yıllık sentetik geçmiş; haftada üç gün çalışıyorum.');
 await next();
 const forward=page.getByRole('button',{name:'Devam',exact:true}), notes=page.locator('textarea[required]');
 await expect(notes).toHaveCount(2);await expect(notes.first()).toBeVisible();await expect(forward).toBeDisabled();
 await notes.first().fill(' \n ');await expect(forward).toBeDisabled();
 await page.getByRole('button',{name:'Henüz teknik veya performans bilgim yok',exact:true}).first().click();
 await expect(forward).toBeDisabled();
 await notes.nth(1).fill('6 kontrollü barfiks; halkada L tutuş 10 saniye. Tempomu henüz ölçmedim.');
 await expect(forward).toBeEnabled();
 await expect(page.getByText('Önemli: AI planını sana göre hazırlamak için bu bilgiyi kullanır.',{exact:true})).toHaveCount(2);
 const expectedNotes=await notes.evaluateAll(items=>items.map(e=>e.value));
 await page.screenshot({path:root+'/docs/evidence/final-touch/notes-mobile.png',fullPage:true});
 const violations=(await new AxeBuilder({page}).include('.guided-plan').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;expect(violations).toEqual([]);
 await next();await page.reload();await synced();await expect(page.getByLabel('Somut hedefin ne?',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Geri',exact:true}).first().click();await expect(notes.first()).toHaveValue(expectedNotes[0]);await expect(notes.nth(1)).toHaveValue(expectedNotes[1]);await expect(forward).toBeEnabled();await next();
 await page.getByLabel('Somut hedefin ne?',{exact:true}).fill('Sekiz haftada barfikste kontrollü tekrarlarımı geliştirmek');
 await page.getByLabel('Dönem boyunca nasıl ilerleyelim?',{exact:true}).selectOption('phased');
 await page.getByLabel('Kuvvet setlerinin sonunda kaç tekrar yedekte kalsın (RIR)?',{exact:true}).selectOption('2');
 await page.screenshot({path:root+'/docs/evidence/final-touch/goals.png',fullPage:true});await next();
 for(const label of ['Barfiks barı','Halka','Dumbbell']) { const button=page.getByRole('button',{name:label,exact:true});if(await button.count())await button.click(); }
 await next();await next();await page.getByRole('button',{name:'Üst vücut bölgelerini seç',exact:true}).click();await page.getByLabel('Bölge seçimim planı nasıl etkilesin?',{exact:true}).selectOption('selected');await next();
 await page.getByLabel('Dönem uzunluğu',{exact:true}).selectOption('8');await next();
 const finalBox=page.getByLabel('Tam olarak nasıl bir çalışma istiyorsun? (gerekli)',{exact:true});await expect(finalBox).toBeVisible();
 await expect(page.getByLabel('AI’nin plana dönüştüreceği sohbet metni',{exact:true})).toHaveValue(source);
 await page.getByRole('radio',{name:'Standart taslak',exact:true}).check();await expect(finalBox).toHaveCount(0);await page.getByRole('radio',{name:'AI ile hazırla',exact:true}).check();
 await page.getByRole('button',{name:'AI ile programımı hazırla',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Son isteklerini yaz');
 const finalRequest='Pazartesi önce teknik sonra kuvvet; çarşamba daha hafif. Evde halka ve dumbbell kullanacağım.';
 await finalBox.fill(finalRequest);
 const editedSource=source+' Not: dinlenme aralarında acele etmek istemiyorum.';await page.getByLabel('AI’nin plana dönüştüreceği sohbet metni',{exact:true}).fill(editedSource);
 await page.reload();await synced();await expect(finalBox).toHaveValue(finalRequest);await expect(page.getByLabel('AI’nin plana dönüştüreceği sohbet metni',{exact:true})).toHaveValue(editedSource);
 await page.getByRole('region',{name:'AI için son isteklerin',exact:true}).screenshot({path:root+'/docs/evidence/final-touch/final-request.png'});
 await page.getByLabel('18 yaş veya üzerindeyim.',{exact:true}).check();await page.getByRole('checkbox',{name:/Bu formdaki planlama bilgilerimin AI taslağı için EVREN/}).check();
 const pending=page.waitForResponse(r=>r.url().endsWith('/api/v2/ai-program-drafts'));await page.getByRole('button',{name:'AI ile programımı hazırla',exact:true}).click();const response=await pending;
 expect(response.request().postDataJSON().region_mode).toBe('selected');expect(response.request().postDataJSON().focus.calves).toBeUndefined();expect(response.request().postDataJSON().target_rir).toBe(2);expect(response.request().postDataJSON().progression_mode).toBe('phased');expect(response.status()).toBe(200);
 const payload=response.request().postDataJSON();expect(payload.final_requests).toBe(finalRequest);expect(payload.chat_plan_text).toBe(editedSource);expect(payload.sport_experience.map(s=>s.known_skills)).toEqual(expectedNotes);expect(payload.training_history).toBe('İki yıllık sentetik geçmiş; haftada üç gün çalışıyorum.');
 const result=await response.json();expect(result.program.days.some(d=>d.first_week===4)).toBe(true);expect(result.program.days.some(d=>d.first_week===8)).toBe(true);
 await expect(page.getByRole('heading',{name:'Planına göz at',exact:true})).toBeVisible();await page.getByText('Dönem yapısı ve ilerleme koşulları',{exact:true}).click();await expect(page.locator('details').filter({has:page.locator('summary', {hasText:'Dönem yapısı ve ilerleme koşulları'})}).getByText(/İlerleme koşulu: aynı hareket/)).toBeVisible();
 await page.getByRole('button',{name:'Düzenle ve kaydet',exact:true}).click();
 const values=await page.locator('input').evaluateAll(items=>items.map(i=>i.value));expect(values.some(v=>v.includes('Hafif hafta'))).toBe(true);expect(errors).toEqual([]);
 await page.screenshot({path:root+'/docs/evidence/final-touch/editor.png',fullPage:true});
 expect(errors).toEqual([]);
 writeFileSync(root+'/docs/evidence/final-touch/BROWSER.json',JSON.stringify({avatar8MBAccepted:true,oversizeRejected:true,avatarOnFivePages:true,chatTransfer:true,finalRequestRequired:true,sourceEditsSurviveReload:true,finalFieldsInAIRequest:true,editorOpened:true,accessibilityViolations:violations,errors},null,2));console.log('Per-sport completion, explicit unknown, draft reload, AI request with intact notes, editor and mobile accessibility PASS');
}catch(e){if(page){await page.screenshot({path:root+'/docs/evidence/final-touch/failure.png',fullPage:true});console.error((await page.locator('body').innerText()).slice(-6000));}throw e;}finally{if(browser)await browser.close();if(server){server.kill('SIGKILL');await new Promise(r=>server.once('exit',r));}if(created)execFileSync(python,['tools/v2/test_database.py','drop',name],{stdio:'pipe'});}
