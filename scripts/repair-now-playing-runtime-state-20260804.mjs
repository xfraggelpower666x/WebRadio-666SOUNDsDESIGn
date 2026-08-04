import fs from 'node:fs';

const files=['index.html','public/index.html'];
for(const file of files){
  let html=fs.readFileSync(file,'utf8');
  const marker="  function setPanelLedsFromMeta(meta){";
  if(!html.includes(marker)) throw new Error(`${file}: setPanelLedsFromMeta marker missing`);
  if(!html.includes('function mffRuntimeIsPlaying(){')){
    const helper=`  function mffRuntimeIsPlaying(){\n    try{\n      var a=getAudio();\n      var hasSource=!!(a&&(a.currentSrc||a.getAttribute('src')||a.src));\n      var audioPlaying=!!(a&&hasSource&&!a.paused&&!a.ended);\n      var uiPlaying=document.documentElement.getAttribute('data-mff-playing')==='1';\n      return !mffUserStopped&&(audioPlaying||uiPlaying);\n    }catch(e){\n      return !mffUserStopped&&document.documentElement.getAttribute('data-mff-playing')==='1';\n    }\n  }\n\n`;
    html=html.replace(marker,helper+marker);
  }
  const old="    var playing=document.documentElement.getAttribute('data-mff-playing')==='1';";
  const count=(html.match(new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
  if(count!==1) throw new Error(`${file}: expected one LED playing assignment, found ${count}`);
  html=html.replace(old,"    var playing=mffRuntimeIsPlaying();");
  const oldApply="    var playing=document.documentElement.getAttribute('data-mff-playing')==='1' && !mffUserStopped;";
  const countApply=(html.match(new RegExp(oldApply.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
  if(countApply!==1) throw new Error(`${file}: expected one applyMeta playing assignment, found ${countApply}`);
  html=html.replace(oldApply,"    var playing=mffRuntimeIsPlaying();");
  fs.writeFileSync(file,html);
}
const root=fs.readFileSync('index.html','utf8');
const pub=fs.readFileSync('public/index.html','utf8');
if(root!==pub) throw new Error('root/public index mismatch');
fs.writeFileSync('tests/now-playing-runtime-state.test.mjs',`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {readFile} from 'node:fs/promises';\nconst read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');\ntest('Now Playing follows the canonical audio element as well as the mobile helper flag',async()=>{\n const html=await read('index.html');\n assert.equal(await read('public/index.html'),html);\n assert.match(html,/function mffRuntimeIsPlaying\\(\\)/);\n assert.match(html,/audioPlaying=!!\\(a&&hasSource&&!a\\.paused&&!a\\.ended\\)/);\n assert.match(html,/var playing=mffRuntimeIsPlaying\\(\\);/);\n assert.doesNotMatch(html,/var playing=document\\.documentElement\\.getAttribute\\('data-mff-playing'\\)==='1' && !mffUserStopped;/);\n});\n`);
