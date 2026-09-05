import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const bytes = path => readFile(new URL(`../${path}`, import.meta.url));
const MAIN='/assets/main/header/666soundsdesign-lyvra-main-header.webp?v=2026-09-05-main-header-v1';
const VELUNA='/assets/veluna/header/veluna-player-header.webp';

test('dedicated Main header asset is mirrored, valid WebP and Main-only', async () => {
  const html=await read('index.html');
  const pub=await read('public/index.html');
  const stage=await read('js/player-stage-v2.js');
  const css=await read('css/player-stage-v2.css');
  assert.equal(pub,html);
  assert.equal(await read('public/js/player-stage-v2.js'),stage);
  assert.equal(await read('public/css/player-stage-v2.css'),css);
  assert.match(html,/assets\/main\/header\/666soundsdesign-lyvra-main-header\.webp/);
  assert.match(stage,/assets\/main\/header\/666soundsdesign-lyvra-main-header\.webp/);
  assert.doesNotMatch(html,/assets\/veluna\/header\/veluna-player-header\.webp/);
  assert.match(css,/MAIN_HEADER_BRAND_V1_20260905/);
  assert.match(css,/width:min\(420px,44vw\)/);
  assert.match(css,/width:min\(78vw,280px\)/);
  assert.match(css,/max-height:60px/);
  const rootAsset=await bytes('assets/main/header/666soundsdesign-lyvra-main-header.webp');
  const publicAsset=await bytes('public/assets/main/header/666soundsdesign-lyvra-main-header.webp');
  assert.ok(rootAsset.length>12000);
  assert.equal(rootAsset.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(rootAsset.subarray(8,12).toString('ascii'),'WEBP');
  assert.deepEqual(rootAsset,publicAsset);
  for(const path of ['veluna/index.html','VELUNA/index.html','public/veluna/index.html','public/VELUNA/index.html','config/veluna-assets.js','public/config/veluna-assets.js']){
    const text=await read(path);
    assert.ok(!text.includes(MAIN), path+' must not adopt Main header');
  }
  const velunaJoined=(await read('veluna/index.html'))+'\n'+(await read('config/veluna-assets.js'));
  assert.ok(velunaJoined.includes(VELUNA), 'VELUNA keeps its own header asset');
});
