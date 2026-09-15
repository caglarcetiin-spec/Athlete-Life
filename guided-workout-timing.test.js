global.window=global;
global.document={readyState:"loading",addEventListener:()=>{}};
global.db={settings:{},trainingLogs:{},activeGuidedWorkout:null};
global.save=()=>{};
require("./guided-workout-core.js");
require("./guided-workout-engine.js");
function a(x,m){if(!x)throw new Error(m)}

const old=new Date(Date.now()-74*60*1000).toISOString();
a(GuidedWorkout.sessionElapsedSec({startedAt:old,timingStartedAt:null,totalPausedSec:0})===0,"idle legacy creation time must not count as workout duration");

const start=new Date(Date.now()-90*1000).toISOString();
const end=new Date(Date.parse(start)+60*1000).toISOString();
const elapsed=GuidedWorkout.sessionElapsedSec({timingStartedAt:start,completedAt:end,totalPausedSec:0});
a(Math.abs(elapsed-60)<0.05,"completed duration must stop at completedAt");

const pauseStarted=new Date(Date.parse(start)+30*1000).toISOString();
const paused=GuidedWorkout.sessionElapsedSec({timingStartedAt:start,completedAt:end,paused:true,pauseStartedAt:pauseStarted,totalPausedSec:0});
a(Math.abs(paused-30)<0.05,"open pause must be excluded from duration");

const resetSession={
 id:"gw_reset",phase:"ready",startedAt:old,timingStartedAt:null,totalPausedSec:0,
 events:[{type:"set_started",at:"2026-09-15T08:00:00.000Z"},{type:"session_timer_reset",at:"2026-09-15T09:00:00.000Z"}]
};
GuidedWorkout.normalizeTiming(resetSession);
a(resetSession.timingStartedAt===null,"timer reset must not resurrect an older set start");
resetSession.events.push({type:"set_started",at:"2026-09-15T09:05:00.000Z"});
GuidedWorkout.normalizeTiming(resetSession);
a(resetSession.timingStartedAt==="2026-09-15T09:05:00.000Z","first set after reset must restart timing");

console.log("v9.0 guided timing tests: PASS");
