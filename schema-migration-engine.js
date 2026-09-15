
(function(){
"use strict";
const V="9.0",TARGET=9;
const steps={
  6:db=>{db.meta=db.meta||{};db.meta.schemaVersion=6;return db},
  7:db=>{db.waterLogs=db.waterLogs||{};db.meta.schemaVersion=7;return db},
  8:db=>{db.meta=db.meta||{};db.meta.schemaVersion=8;db.meta.engineArchitecture="v8-event-mesh";db.modelSnapshots=db.modelSnapshots||{};db.calibration=db.calibration||{};db.tissueLoad=db.tissueLoad||{};return db},
  9:db=>{db.meta=db.meta||{};db.meta.schemaVersion=9;db.meta.sessionArchitecture="canonical-prescription-v1";db.sessionPrescriptions=db.sessionPrescriptions||{};return db}
};
function current(db){return +db?.meta?.schemaVersion||5}
function migrate(db){
 const from=current(db);let v=from,applied=[];while(v<TARGET){const n=v+1;if(steps[n]){db=steps[n](db);applied.push(n)}v=n}
 return {db,from,to:TARGET,applied};
}
function validate(db){
 const issues=[];["daily","foodLogs","trainingLogs","water","waterLogs"].forEach(k=>{if(!db[k]||typeof db[k]!=="object")issues.push(`${k} missing`)});
 if((+db?.meta?.schemaVersion||0)!==TARGET)issues.push("schemaVersion mismatch");
 return {ok:issues.length===0,issues,target:TARGET};
}
window.SchemaMigration={version:V,targetSchema:TARGET,migrate,validate};
})();
