#!/usr/bin/env node
/** Stages R02 inside a local 666STREAM repository checkout, NEVER pushes or deploys.
 * Reads and verifies canonical structure; refuses to overwrite any unexpected path.
 * BACKUP: copies edited native files into supplied backup directory before modification.
 */
import {readFileSync,writeFileSync,existsSync,mkdirSync,copyFileSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const bundleRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const target=process.argv[2] && resolve(process.argv[2]);
const backup=process.argv[3] && resolve(process.argv[3]);
const quit=(msg)=>{console.error('WRITE_BLOCKED: '+msg);process.exit(2)};
if(!target||!backup||target===backup||backup.startsWith(target+'/')||target.startsWith(backup+'/'))quit('Provide distinct checkout and external backup directory arguments');
const manifestPath=join(target,'666STREAM_STRUCTURE_CONTROL/REHYDRATION_MANIFEST.json');
const pointerPath=join(target,'666STREAM_STRUCTURE_CONTROL/CURRENT_POINTER.json');
const authPath=join(target,'666STREAM_STRUCTURE_CONTROL/AUTHORITY_CONTRACT.md');
const radioReadme=join(target,'radio-codeforge/README.md');
const statePath=join(target,'666STREAM_STRUCTURE_CONTROL/current/CURRENT_STATE.md');
if(![manifestPath,pointerPath,authPath,radioReadme,statePath].every(existsSync))quit('Not a complete 666STREAM checkout');
if(!readFileSync(authPath,'utf8').includes('AUTHORITY_BRANCH=WebRadio-666SOUNDsDESIGn'))quit('Native 666STREAM authority mismatch');
const ptr=JSON.parse(readFileSync(pointerPath,'utf8'));
if(ptr.authority_branch!=='WebRadio-666SOUNDsDESIGn'||ptr.project_scope_model!=='ONE_ACTIVE_PROJECT_PER_CHAT')quit('Current pointer scope mismatch');
const m=JSON.parse(readFileSync(manifestPath,'utf8'));
if(m.system!=='666STREAM_STRUCTURE_CONTROL'||!m.core_evolution_v1?.required_rehydration_stage_after_existing_order)quit('Unexpected manifest schema');
const r='LOAD_PROJECT_SCOPED_CODEFORGE_COOPERATION_IF_REQUESTED';
const base='666STREAM_STRUCTURE_CONTROL/';
const contract='integration/CODEFORGE_COOPERATION_R02_CONTRACT.md';
const additions=[
 'radio-codeforge/cooperation/coop-core.mjs',
 'radio-codeforge/cooperation/peer-catalog.json',
 'radio-codeforge/cooperation/peer-executor.mjs',
 'radio-codeforge/cooperation/local-readonly-host.mjs',
 'radio-codeforge/cooperation/plan.mjs',
 'radio-codeforge/cooperation/run-local-readonly.mjs',
 'radio-codeforge/cooperation/example-job.json',
 'tests/coop-core.test.mjs','tests/peer-executor.test.mjs',
 base+contract
];
const originalDocs=[manifestPath,radioReadme,statePath];
for(const path of additions){const dst=join(target,path),src=join(bundleRoot,path);if(!existsSync(src))quit('Source missing: '+path);if(existsSync(dst)){const a=readFileSync(dst),b=readFileSync(src);if(!a.equals(b))quit('Existing file differs, refuse overwrite: '+path);}}
if(!m.core_evolution_v1.required_rehydration_stage_after_existing_order.includes(r))m.core_evolution_v1.required_rehydration_stage_after_existing_order.push(r);
const config={status:'SOURCE_STAGED_LOCAL_ONLY',contract,executor:'radio-codeforge/cooperation/peer-executor.mjs',host:'EXPLICIT_BINDINGS_ONLY',auto_dispatch:false,foreign_autoactivation:false,foreign_writes:false,production_import:false,production_merge:false,cost_gate:'REQUIRED_BEFORE_EXTERNAL_ACTION',current_pointer_publish:'SEPARATE_NATIVE_UPDATE_POINTER_LAST'};
if(m.codeforge_cooperation_r02&&JSON.stringify(m.codeforge_cooperation_r02)!==JSON.stringify(config))quit('Existing cooperation manifest entry differs');
m.codeforge_cooperation_r02=config;
const mark='## R02 CodeForge cooperation — development-only';
const readmeAddon=`\n\n${mark}\nThe additive R02 peer executor is at \`radio-codeforge/cooperation/\`; it is only loaded after native rehydration and exact project binding for an explicitly requested development/CodeForge task. See \`666STREAM_STRUCTURE_CONTROL/integration/CODEFORGE_COOPERATION_R02_CONTRACT.md\`. It does not auto-dispatch or grant foreign/production writes.\n`;
const stateAddon=`\n\n${mark}\nPROJECT=WEBRADIO\nNATIVE_OWNER=666STREAM_STRUCTURE_CONTROL\nEXECUTOR=666-RADIO-CODEFORGE-001\nR02_SOURCE=radio-codeforge/cooperation/\nR02_REHYDRATION=PROJECT_BOUND_DEVELOPMENT_ONLY\nR02_LOCAL_TESTS=44_OF_44_PASS_ARCHIVE_TEST\nR02_REMOTE_HOST=READBACK_PENDING\nR02_PRODUCTION_DEPLOY=FORBIDDEN\nR02_GITHUB_PUBLICATION=READBACK_PENDING\nPR_262=PRODUCTION_HOLD\n`;
const newDocs=new Map([[manifestPath,JSON.stringify(m,null,2)+'\n'],[radioReadme,readFileSync(radioReadme,'utf8').includes(mark)?readFileSync(radioReadme,'utf8'):readFileSync(radioReadme,'utf8')+readmeAddon],[statePath,readFileSync(statePath,'utf8').includes(mark)?readFileSync(statePath,'utf8'):readFileSync(statePath,'utf8')+stateAddon]]);
// Pure preflight: all potential changes known BEFORE writing any file.
if(existsSync(backup))quit('Backup directory already exists; choose new external destination');
mkdirSync(backup,{recursive:true});
for(const path of originalDocs){const rel=path.slice(target.length+1),dest=join(backup,rel);mkdirSync(dirname(dest),{recursive:true});copyFileSync(path,dest)}
for(const path of additions){const dst=join(target,path),src=join(bundleRoot,path);if(!existsSync(dst)){mkdirSync(dirname(dst),{recursive:true});copyFileSync(src,dst)}}
for(const [path,content] of newDocs){writeFileSync(path,content,'utf8')}
for(const path of additions){const x=readFileSync(join(target,path)),y=readFileSync(join(bundleRoot,path));if(!x.equals(y))quit('Local readback mismatch: '+path)}
for(const [path,content] of newDocs){if(readFileSync(path,'utf8')!==content)quit('Local readback mismatch: '+path)}
console.log(JSON.stringify({status:'LOCAL_STAGE_VERIFIED_NOT_PUBLISHED',files:additions.length+newDocs.size,backup,githubWrite:false,cloudflareDeploy:false,pointerUnchanged:true,sha256:createHash('sha256').update([...newDocs.values()].join('')).digest('hex')},null,2));
