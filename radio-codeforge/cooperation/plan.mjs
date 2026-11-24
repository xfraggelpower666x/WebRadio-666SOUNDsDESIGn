#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {planCooperation,verifyPlan} from './coop-core.mjs';
const here=dirname(fileURLToPath(import.meta.url));
try {
 const catalog=JSON.parse(readFileSync(join(here,'peer-catalog.json'),'utf8'));
 const job=JSON.parse(readFileSync(process.argv[2] || join(here,'example-job.json'),'utf8'));
 const plan=planCooperation({...job,catalog});
 verifyPlan(plan,job.current.commit);
 console.log(JSON.stringify(plan,null,2));
} catch(err) {console.error(`COOP_BLOCKED=${err.code||'INPUT_ERROR'} ${err.message}`);process.exitCode=1;}
