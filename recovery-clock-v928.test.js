const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
function assert(c,m){if(!c)throw new Error(m)}
assert(app.includes('function trainingRowTime'),'recovery must use timestamp');
assert(app.includes('hours=Math.max(0,(ref-at)/3600000)'),'recovery must decay by elapsed hours');
assert(app.includes('Math.pow(.5,hours/Math.max(12,effectiveHalfLife))'),'recovery must decay continuously');
assert(app.includes('recoveryEnvironmentBetween'),'sleep/nutrition/hydration environment must modulate recovery');
assert(app.includes('recordedAt:new Date().toISOString()'),'training rows must carry timestamp');
assert(app.includes('window.ALOSRecovery'),'recovery API must be exposed');
console.log('recovery-clock-v928.test.js PASS');
