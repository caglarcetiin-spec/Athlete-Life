/* Explicit user actions only. Archives are snapshots, never inputs to live analysis. */
((root)=>{
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const trainingArrays=['trainingPeriods','trainingPeriodDrafts','multisportPeriods','sportSessions','sportSessionHistory','removedSportSessions','athleteGoals','goalMeasurements','goalHistory','workoutRunHistory','guidedWorkoutHistory','capabilityRecords','adHocSessions','runs','generatedWeekPlan'];
const trainingMaps=['trainingLogs','sessionFeedback','sessionPrescriptions','planHistory','weekOptimizations','futurePlans','gapReconciliation','adherencePlans','deviationReasons','tissueLoad','programEngine','adaptiveModel','modelSnapshots','calibration','lifecycle'];
const fullArrays=['bodyMeasurements','healthEpisodes','healthAdjustments','personalHealthHistory','healthLabRecords','healthLabHistory'];
const fullMaps=['characterData','characterOverrides','daily','foodLogs','waterLogs','water','painLogs','cycleDays','scheduleByDate','week','social'];
const id=()=>root.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
function archive(db,name,now=new Date().toISOString()){
 const {workspaceArchives,removedSportSessions,meta,...data}=copy(db);
 // Photos have their own account storage. This archive contains measurements, not photo binaries.
 delete data.photoProgress;if(data.settings)delete data.settings.profileAvatar;
 return {id:id(),name:String(name||'Önceki dönem').trim().slice(0,100),createdAt:now,data};
}
function reset(db,{scope='training',keep=true,name,expected,now=new Date().toISOString()}={}){
 if(!['training','all'].includes(scope))throw Error('Başlangıç kapsamını seç.');
 if(db.activeWorkoutRun||db.activeGuidedWorkout&&!['complete','completed'].includes(db.activeGuidedWorkout.phase))throw Error('Önce açık antrenmanını bitir veya taslak olarak arşivle.');
 if(expected&&signature(db)!==expected)throw Error('Kayıtların değişti. Kapsamı yeniden incele.');
 const patch={};for(const k of [...trainingArrays,...(scope==='all'?fullArrays:[])])patch[k]=[];
 for(const k of [...trainingMaps,...(scope==='all'?fullMaps:[])])patch[k]={};
 patch.programEngine={version:'9.2.8',assignments:{},history:[]};
 patch.lifecycle=null; // The legacy engine initializes its full day-boundary schema on demand.
 patch.activeWorkoutRun=null;patch.activeGuidedWorkout=null;patch.trainingPeriodDraft=null;
 for(const k of ['training','workouts','exerciseLogs','sessions'])if(db[k])patch[k]=Array.isArray(db[k])?[]:{};patch.settings={...db.settings,pinnedPeriodId:null,programStartDate:null};
 patch.workspaceArchives=[...(db.workspaceArchives||[]),...(keep?[archive(db,name,now)]:[])];
 patch.workspaceGeneration={id:id(),startedAt:now,scope};
 return patch;
}
function signature(db){const inputs=[...trainingArrays.filter(k=>k!=='generatedWeekPlan'),'trainingLogs','sessionFeedback','sessionPrescriptions','planHistory','weekOptimizations',...fullArrays,...fullMaps,'activeWorkoutRun','activeGuidedWorkout'];return JSON.stringify(inputs.map(k=>db[k]??null),(k,v)=>k==='physiologySnapshot'?undefined:v);}
function removeSession(db,sessionId,expected,now=new Date().toISOString()){
 const row=(db.sportSessions||[]).find(r=>r.id===sessionId);
 if(!row||JSON.stringify(row)!==expected)throw Error('Seans değişti. Güncel kaydı yeniden aç.');
 const trainingLogs={},projections={};
 for(const [day,rows] of Object.entries(db.trainingLogs||{})){
  const owned=r=>r.source==='sport_program'&&r.sportSessionId===sessionId;
  const kept=rows.filter(r=>!owned(r)),removed=rows.filter(owned);
  if(kept.length)trainingLogs[day]=kept;if(removed.length)projections[day]=copy(removed);
 }
 return {trainingLogs,sportSessions:db.sportSessions.filter(r=>r.id!==sessionId),removedSportSessions:[...(db.removedSportSessions||[]),{id:id(),record:copy(row),projections,removedAt:now}],sportSessionHistory:[...(db.sportSessionHistory||[]),{action:'removed',record:copy(row),replacedAt:now}]};
}
function restoreSession(db,removedId){
 const item=(db.removedSportSessions||[]).find(r=>r.id===removedId);if(!item)throw Error('Kaldırılan kayıt bulunamadı.');
 const row=item.record,rows=db.sportSessions||[];
 if(rows.some(r=>r.id===row.id||row.linkedSessionId&&r.linkedSessionId===row.linkedSessionId||row.planBlockId&&r.date===row.date&&r.planBlockId===row.planBlockId))throw Error('Bu gün, çalışma veya hareket için başka bir seans var. Önce o kaydı kontrol et.');
 const logs=copy(db.trainingLogs||{});for(const [day,added] of Object.entries(item.projections||{})){
  const existing=logs[day]||[];if(added.some(a=>existing.some(b=>a.id===b.id)))throw Error('Hareket kaydı zaten var.');logs[day]=[...existing,...copy(added)];
 }
 return {sportSessions:[...rows,copy(row)],trainingLogs:logs,removedSportSessions:db.removedSportSessions.filter(r=>r.id!==removedId)};
}
const api={reset,archive,signature,removeSession,restoreSession};root.WorkspaceLifecycle=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
