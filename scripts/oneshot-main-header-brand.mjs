import fs from 'node:fs';

const OLD_MARK='2026-09-04-recovery-single-owner-v3';
const NEW_MARK='2026-09-05-main-header-brand-v1';
const OLD_HEADER='/assets/veluna/header/veluna-player-header.webp';
const NEW_HEADER='/assets/main/header/666soundsdesign-lyvra-main-header.webp?v=2026-09-05-main-header-v1';
const BRAND_MARK='MAIN_HEADER_BRAND_V1_20260905';

function read(path){ return fs.readFileSync(path,'utf8'); }
function write(path,text){ fs.writeFileSync(path,text); }
function replaceRequired(text,from,to,label){
  if(text.includes(to)) return text;
  if(!text.includes(from)) throw new Error(`missing replacement anchor: ${label}`);
  return text.replaceAll(from,to);
}

for(const path of ['index.html','public/index.html']){
  let text=read(path);
  text=text.replace(/\/assets\/veluna\/header\/veluna-player-header\.webp(?:\?v=[^"'\\\s<>]+)?/g,NEW_HEADER);
  text=text.replaceAll(OLD_MARK,NEW_MARK);
  if(!text.includes(NEW_HEADER)) throw new Error(`${path}: new Main header missing`);
  if(text.includes(OLD_HEADER)) throw new Error(`${path}: old Veluna header still referenced by Main player`);
  write(path,text);
}

for(const path of ['js/player-stage-v2.js','public/js/player-stage-v2.js']){
  let text=read(path);
  text=replaceRequired(text,"image.src='/assets/veluna/header/veluna-player-header.webp';",`image.src='${NEW_HEADER}';`,`${path} header src`);
  text=text.replace("image.alt='LYVRA · VELUNA · 666';","image.alt='666SOUNDsDESIGn · LYVRA';");
  text=text.replace("image.setAttribute('width','1536');","image.setAttribute('width','800');");
  text=text.replace("image.setAttribute('height','509');","image.setAttribute('height','200');");
  if(!text.includes(NEW_HEADER)||!text.includes("width','800")||!text.includes("height','200")) throw new Error(`${path}: canonical Main header contract incomplete`);
  write(path,text);
}

const cssBlock=`\n\n/* ${BRAND_MARK}\n   Dedicated Main-player brand only. VELUNA player assets/layout stay independent. */\nbody[data-veluna-page="main"] #pcHeaderNewLogo.s666-canonical-header-image.s666-main-header-image{\n  width:min(420px,44vw)!important;\n  max-width:420px!important;\n  height:auto!important;\n  max-height:105px!important;\n  aspect-ratio:4/1!important;\n  object-fit:contain!important;\n  object-position:center!important;\n}\n@media(max-width:760px){\n  body[data-veluna-page="main"] #mffApp .mff-cyber-header.s666-mobile-header{\n    min-height:64px!important;\n    height:64px!important;\n    display:flex!important;\n    align-items:center!important;\n    justify-content:center!important;\n    overflow:hidden!important;\n  }\n  body[data-veluna-page="main"] #mffApp .mff-cyber-header .s666-mobile-header-image{\n    width:min(78vw,280px)!important;\n    max-width:280px!important;\n    height:auto!important;\n    max-height:60px!important;\n    aspect-ratio:4/1!important;\n    object-fit:contain!important;\n    object-position:center!important;\n  }\n}\n`;
for(const path of ['css/player-stage-v2.css','public/css/player-stage-v2.css']){
  let text=read(path);
  text=text.replace('--s666-header-ratio:1536/509;','--s666-header-ratio:4/1;');
  if(!text.includes(BRAND_MARK)) text += cssBlock;
  if(!text.includes('--s666-header-ratio:4/1;')||!text.includes(BRAND_MARK)) throw new Error(`${path}: Main header sizing contract incomplete`);
  write(path,text);
}

for(const path of [
  'js/player-core.js','public/js/player-core.js',
  'tests/runtime-cache-identity.test.mjs',
  'tests/pc-eq-balanced-headroom.test.mjs',
  'tests/pc-real-spectrum-layout.test.mjs',
  'tests/pc-high-frequency-response.test.mjs',
  'tests/audio-recovery-runtime-single-owner.test.mjs'
]){
  let text=read(path);
  if(text.includes(OLD_MARK)) text=text.replaceAll(OLD_MARK,NEW_MARK);
  write(path,text);
}

{
  const path='tests/main-player-reactive-visual-contract.test.mjs';
  let text=read(path);
  text=text.replace("test('header is one canonical 1536 by 509 asset without destructive rebuild', () => {","test('header is one dedicated canonical 800 by 200 Main asset without destructive rebuild', () => {");
  text=text.replace("assert.match(stageJs, /width','1536'/);","assert.match(stageJs, /width','800'/);");
  text=text.replace("assert.match(stageJs, /height','509'/);","assert.match(stageJs, /height','200'/);");
  text=text.replace("assert.match(stageCss, /--s666-header-ratio:1536\\/509/);","assert.match(stageCss, /--s666-header-ratio:4\\/1/);");
  if(text.includes("width','1536")||text.includes("height','509")||text.includes('1536\\/509')) throw new Error('stale Main header dimension pin remains');
  write(path,text);
}

{
  const path='tests/frontend-contracts.test.mjs';
  let text=read(path);
  text=text.replace("assert.match(stage, /veluna-player-header\\.webp/);","assert.match(stage, /assets\\/main\\/header\\/666soundsdesign-lyvra-main-header\\.webp/);");
  write(path,text);
}

{
  const path='tests/radio-only-cleanup.test.mjs';
  let text=read(path);
  text=text.replace('assert.equal(rootAssets.length, 18);','assert.equal(rootAssets.length, 19);');
  text=text.replace('assert.equal(publicAssets.length, 18);','assert.equal(publicAssets.length, 19);');
  if(!text.includes("normalizedRoot.includes('main/header/666soundsdesign-lyvra-main-header.webp')")){
    text=text.replace("assert.ok(normalizedRoot.includes('boot-screen/lyvra-radio-boot.jpg'), 'central LYVRA radio boot image must be part of the mirrored production asset set');","assert.ok(normalizedRoot.includes('boot-screen/lyvra-radio-boot.jpg'), 'central LYVRA radio boot image must be part of the mirrored production asset set');\n  assert.ok(normalizedRoot.includes('main/header/666soundsdesign-lyvra-main-header.webp'), 'dedicated Main header image must be part of the mirrored production asset set');");
  }
  write(path,text);
}

const scopeTest=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { readFile } from 'node:fs/promises';\n\nconst read = path => readFile(new URL(\`../\${path}\`, import.meta.url), 'utf8');\nconst bytes = path => readFile(new URL(\`../\${path}\`, import.meta.url));\nconst MAIN='/assets/main/header/666soundsdesign-lyvra-main-header.webp?v=2026-09-05-main-header-v1';\nconst VELUNA='/assets/veluna/header/veluna-player-header.webp';\n\ntest('dedicated Main header asset is mirrored, valid WebP and Main-only', async () => {\n  const html=await read('index.html');\n  const pub=await read('public/index.html');\n  const stage=await read('js/player-stage-v2.js');\n  const css=await read('css/player-stage-v2.css');\n  assert.equal(pub,html);\n  assert.equal(await read('public/js/player-stage-v2.js'),stage);\n  assert.equal(await read('public/css/player-stage-v2.css'),css);\n  assert.match(html,/assets\\/main\\/header\\/666soundsdesign-lyvra-main-header\\.webp/);\n  assert.match(stage,/assets\\/main\\/header\\/666soundsdesign-lyvra-main-header\\.webp/);\n  assert.doesNotMatch(html,/assets\\/veluna\\/header\\/veluna-player-header\\.webp/);\n  assert.match(css,/MAIN_HEADER_BRAND_V1_20260905/);\n  assert.match(css,/width:min\\(420px,44vw\\)/);\n  assert.match(css,/width:min\\(78vw,280px\\)/);\n  assert.match(css,/max-height:60px/);\n  const rootAsset=await bytes('assets/main/header/666soundsdesign-lyvra-main-header.webp');\n  const publicAsset=await bytes('public/assets/main/header/666soundsdesign-lyvra-main-header.webp');\n  assert.ok(rootAsset.length>12000);\n  assert.equal(rootAsset.subarray(0,4).toString('ascii'),'RIFF');\n  assert.equal(rootAsset.subarray(8,12).toString('ascii'),'WEBP');\n  assert.deepEqual(rootAsset,publicAsset);\n  for(const path of ['veluna/index.html','VELUNA/index.html','public/veluna/index.html','public/VELUNA/index.html','config/veluna-assets.js','public/config/veluna-assets.js']){\n    const text=await read(path);\n    assert.ok(!text.includes(MAIN), path+' must not adopt Main header');\n  }\n  const velunaJoined=(await read('veluna/index.html'))+'\\n'+(await read('config/veluna-assets.js'));\n  assert.ok(velunaJoined.includes(VELUNA), 'VELUNA keeps its own header asset');\n});\n`;
write('tests/main-header-brand-scope.test.mjs',scopeTest);

if(read('index.html')!==read('public/index.html')) throw new Error('root/public index mismatch');
if(read('js/player-stage-v2.js')!==read('public/js/player-stage-v2.js')) throw new Error('stage JS mirror mismatch');
if(read('css/player-stage-v2.css')!==read('public/css/player-stage-v2.css')) throw new Error('stage CSS mirror mismatch');

console.log('Main header brand integration applied:', NEW_HEADER);
