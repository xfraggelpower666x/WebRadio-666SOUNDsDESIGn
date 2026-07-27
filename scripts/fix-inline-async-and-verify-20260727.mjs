import fs from 'node:fs';
import vm from 'node:vm';

for (const file of ['index.html','public/index.html']) {
  let html=fs.readFileSync(file,'utf8');
  html=html.replaceAll('async async function','async function');
  if (html.includes('async async function')) throw new Error(`${file}: duplicate async remains`);
  const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((m)=>m[1])
    .filter((code)=>code.trim() && !/^\s*\{[\s\S]*\}\s*$/.test(code.trim()));
  inline.forEach((code,index)=>{
    try { new vm.Script(code,{filename:`${file}#inline-${index+1}`}); }
    catch (error) { throw new Error(`${file} inline script ${index+1}: ${error.message}`); }
  });
  fs.writeFileSync(file,html);
}

const root=fs.readFileSync('index.html','utf8');
const pub=fs.readFileSync('public/index.html','utf8');
if(root!==pub) throw new Error('root/public index mismatch');
