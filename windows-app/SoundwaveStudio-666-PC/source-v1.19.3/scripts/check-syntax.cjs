'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const roots=['main.js','preload.js','src','scripts','tests'];
const files=[];
function walk(p){const st=fs.statSync(p);if(st.isDirectory()){for(const n of fs.readdirSync(p)) walk(path.join(p,n));} else if(/\.(?:js|cjs)$/.test(p)) files.push(p);}
for(const r of roots) if(fs.existsSync(r)) walk(r);
let bad=0;
for(const f of files){const r=cp.spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status!==0){bad++;console.error('FAIL syntax',f);console.error(r.stderr||r.stdout);} }
if(bad) process.exit(1);
console.log(`PASS syntax ${files.length}/${files.length} JS/CJS files`);
