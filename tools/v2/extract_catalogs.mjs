import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.runInNewContext(readFileSync('capability-catalog.js','utf8'),context,{timeout:2000});
writeFileSync('apps/api/alos/catalogs/capabilities.json',JSON.stringify(context.window.CAPABILITY_CATALOG,null,2));
const sports={window:{}};vm.runInNewContext(readFileSync('sport-catalog.js','utf8'),sports,{timeout:2000});
const {sports:rows,families,schemas,methods,goals,equipment,experience}=sports.window.SportCatalog;
writeFileSync('apps/api/alos/catalogs/sports.json',JSON.stringify({sports:rows,families,schemas,methods,goals,equipment,experience},null,2));
console.log(JSON.stringify({capabilityGroups:Object.keys(context.window.CAPABILITY_CATALOG),sports:rows.length}));
const knowledgeContext={window:{}};vm.runInNewContext(readFileSync('exercise-knowledge-library.js','utf8'),knowledgeContext,{timeout:1000});writeFileSync('apps/api/alos/catalogs/movements.json',JSON.stringify(knowledgeContext.window.EXERCISE_KNOWLEDGE,null,2)+'\n');
