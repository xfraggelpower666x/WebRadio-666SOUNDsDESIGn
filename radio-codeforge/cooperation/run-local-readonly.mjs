#!/usr/bin/env node
// Executes a real local read-only filesystem host adapter. Does NOT run any foreign plugin.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname,resolve } from 'node:path';
import { planCooperation } from './coop-core.mjs';
import { executePlan } from './peer-executor.mjs';
import { localReadBinding } from './local-readonly-host.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const catalog=JSON.parse(await readFile(resolve(root,'radio-codeforge/cooperation/peer-catalog.json'),'utf8'));
const sample=JSON.parse(await readFile(resolve(root,'radio-codeforge/cooperation/example-job.json'),'utf8'));
// This demo is intentionally ONE isolated test: do not dispatch declared foreign peers.
const task={id:'local_readback',project:'WEBRADIO',peer:'666-RADIO-CODEFORGE-001',capability:'native_scope_guard',intent:'READ',read:['readme']};
const plan=planCooperation({catalog,current:sample.current,budget:sample.budget,tasks:[task]});
const b=localReadBinding({root,peer:task.peer,capability:task.capability,scopeFiles:{readme:'README.md'},nativeCommit:sample.current.commit});
const report=await executePlan({plan,native:sample.current,budget:sample.budget,bindings:[b]});
// Avoid emitting full document contents to logs, print redacted digest-only receipts.
const safe={...report,receipts:report.receipts.map(({output,...entry})=>entry)};
console.log(JSON.stringify(safe,null,2));
if(report.blocked) process.exitCode=1;
