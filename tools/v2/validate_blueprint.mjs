import fs from 'node:fs';
import yaml from '../../apps/web/node_modules/js-yaml/index.js';
import Ajv from '../../apps/web/node_modules/@redocly/ajv/dist/2020.js';
const schema=await(await fetch('https://render.com/schema/render.yaml.json')).json();
const blueprint=yaml.load(fs.readFileSync('infra/v2/render.yaml','utf8'));
const ajv=new Ajv({allErrors:true,strict:false});
const validate=ajv.compile(schema);
if(!validate(blueprint)){console.error(JSON.stringify(validate.errors,null,2));process.exit(1)}
console.log('Render public JSON Schema validation: PASS');
fs.writeFileSync('docs/evidence/stage-8/blueprint-validation.json',JSON.stringify({schema_url:'https://render.com/schema/render.yaml.json',checked_at:new Date().toISOString(),result:'PASS',note:'Static schema validation only; not an applied deployment.'},null,2));
