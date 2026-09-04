import { readFile, writeFile } from 'node:fs/promises';

const paths=['veluna/index.html','VELUNA/index.html','public/veluna/index.html','public/VELUNA/index.html'];
const from="if(!audio.paused&&!audio.ended&&audio.readyState>=2){setStatus('Playing');setLamp(audioLamp,'lamp-green');setTransportUi('play');document.documentElement.setAttribute('data-veluna-app-return','healthy-noop');return}";
const to="if(!audio.paused&&!audio.ended&&audio.readyState>=2){await soundEngine.resume();setStatus('Playing');setLamp(audioLamp,'lamp-green');setTransportUi('play');document.documentElement.setAttribute('data-veluna-app-return','healthy-context-resume');return}";
for(const path of paths){
  let s=await readFile(path,'utf8');
  if(!s.includes(from)) throw new Error('missing healthy branch: '+path);
  s=s.replace(from,to);
  await writeFile(path,s);
}
let test=await readFile('tests/iphone-layout-app-return-audio.test.mjs','utf8');
test=test.replace("assert.match(v,/data-veluna-app-return','healthy-noop/);assert.match(v,/if\\(!audio\\.paused&&!audio\\.ended&&audio\\.readyState>=2\\)/);","assert.match(v,/data-veluna-app-return','healthy-context-resume/);assert.match(v,/if\\(!audio\\.paused&&!audio\\.ended&&audio\\.readyState>=2\\)\\{await soundEngine\\.resume\\(\\)/);assert.doesNotMatch(v,/healthy-context-resume[^}]*audio\\.play\\(/);");
await writeFile('tests/iphone-layout-app-return-audio.test.mjs',test);
console.log('Veluna healthy app return now resumes only the suspended sound graph');
