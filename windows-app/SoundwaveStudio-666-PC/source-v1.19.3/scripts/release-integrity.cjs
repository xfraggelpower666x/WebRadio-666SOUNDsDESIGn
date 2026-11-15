'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
function run(cmd,args){const r=cp.spawnSync(cmd,args,{stdio:'inherit',shell:false});if(r.status!==0)process.exit(r.status||1);}
console.log('=== SoundwaveStudio 666 Release Integrity ===');
run(process.execPath,['tests/deep-integration.test.cjs']);
run(process.execPath,['scripts/check-syntax.cjs']);
// Scan shipped runtime/application content. Audit scripts/tests contain the detector literals themselves.
const scanRoots=['main.js','preload.js','src','docs'];
const textFiles=[];
function walk(p){if(!fs.existsSync(p))return;const st=fs.statSync(p);if(st.isDirectory()){for(const n of fs.readdirSync(p))walk(path.join(p,n));}else if(!/\.(?:png|jpg|jpeg|gif|ico|zip|gz|exe|dll|node|pak)$/i.test(p))textFiles.push(p);}
scanRoots.forEach(walk);
const secretPatterns=[/sk-[A-Za-z0-9_-]{20,}/g,/ghp_[A-Za-z0-9]{20,}/g,/Bearer\s+[A-Za-z0-9._~-]{24,}/g,/SOUNDCLOUD_CLIENT_SECRET\s*=\s*["'][^"']+["']/g];
const mutationPatterns=[/\bgit\s+push\b/i,/wrangler\s+deploy/i,/cloudflare.*deploy/i];
let failures=[];
for(const f of textFiles){const s=fs.readFileSync(f,'utf8');for(const re of secretPatterns){re.lastIndex=0;if(re.test(s))failures.push(`secret-pattern:${f}:${re}`);}for(const re of mutationPatterns){if(re.test(s))failures.push(`production-mutation-pattern:${f}:${re}`);}}
for(const required of ['src/vendor/cayatur/LICENSE','package.json','docs/ARCHITECTURE.md','DEEP_AUDIT_STATUS.md']) if(!fs.existsSync(required)) failures.push(`missing:${required}`);
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`PASS secret/mutation scan across ${textFiles.length} text files`);
console.log('PASS required notices/docs present');
console.log('RELEASE INTEGRITY PASS');
