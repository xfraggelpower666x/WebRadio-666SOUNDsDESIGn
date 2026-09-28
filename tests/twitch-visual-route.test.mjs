import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync('worker.js','utf8');
const legacy=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker.js','utf8');
const root=fs.readFileSync('TWITCH/index.html','utf8');
const pub=fs.readFileSync('public/TWITCH/index.html','utf8');

test('twitch worker mirror stays byte-identical',()=>assert.equal(worker,legacy));
test('twitch visual root/public mirror stays byte-identical',()=>assert.equal(root,pub));
test('twitch route is additive and has dedicated stream order',()=>{
  assert.match(worker,/isTwitchPlayerPath/);
  assert.match(worker,/proxyTwitchStream/);
  const start=worker.indexOf('async function proxyTwitchStream');
  const block=worker.slice(start,start+700);
  assert.ok(block.indexOf('my.idjstream.com:8686/stream') < block.indexOf('my.idjstream.com/666soundsdesign/stream'));
  assert.match(block,/twitch-main-8686/);
  assert.match(block,/twitch-backup-named/);
});
test('twitch visual has autoplay, nowplaying and audio-reactive analyser',()=>{
  assert.match(root,/<audio[^>]+autoplay/);
  assert.match(root,/\/api\/nowplaying/);
  assert.match(root,/createAnalyser\(\)/);
  assert.match(root,/requestAnimationFrame/);
  assert.match(root,/laser-h/);
  assert.match(root,/laser-v/);
  assert.match(root,/class="reactor/);
  assert.match(root,/\/TWITCH\/background\.jpg/);
});

test('twitch background asset exists in root/public and stays byte-identical',()=>{
  const rootPath='TWITCH/background.jpg';
  const publicPath='public/TWITCH/background.jpg';
  assert.equal(fs.existsSync(rootPath),true,'missing TWITCH/background.jpg');
  assert.equal(fs.existsSync(publicPath),true,'missing public/TWITCH/background.jpg');
  const a=fs.readFileSync(rootPath);
  const b=fs.readFileSync(publicPath);
  assert.ok(a.length>100000,'twitch background unexpectedly small');
  assert.equal(Buffer.compare(a,b),0,'twitch background mirrors differ');
});
