const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(html.includes('id="saveShiftBtn"'),'missing shift save button');
ok(html.includes('id="shiftSaveStatus"'),'missing shift save status');
ok(app.includes('function saveTodayShift()'),'missing saveTodayShift');
ok(app.includes('db.scheduleByDate[k]'),'shift should sync to scheduleByDate');
ok(app.includes('"SHIFT_RECORDED"'),'shift event not emitted');
ok(app.includes('q("saveShiftBtn").onclick=saveTodayShift'),'shift button not wired');
ok(sw.includes('v10-0-0-dynamic-sqlite'),'cache version not bumped');
console.log('PASS shift persistence v9.2.4');
