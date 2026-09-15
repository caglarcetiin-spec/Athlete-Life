const fs=require('fs'),vm=require('vm');
const app=fs.readFileSync('app.js','utf8');
function assert(c,m){if(!c)throw new Error(m)}
assert(app.includes('db.weekOptimizations=db.weekOptimizations||{}'),'week optimization store must initialize');
assert(app.includes('db.weekOptimizations[keys[0]]'),'optimized week must persist by week start');
assert(app.includes('renderSavedWeekOptimization();'),'saved optimized week must hydrate on init');
const vault=fs.readFileSync('backup-vault.js','utf8');
assert(vault.includes('"weekOptimizations"'),'backup merge/normalize must retain optimized week');
console.log('weekly-optimization-persistence-v928.test.js PASS');
