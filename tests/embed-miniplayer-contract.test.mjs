import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const embed=readFileSync(new URL('../public/embed/miniplayer.html',import.meta.url),'utf8');
test('mini player uses shared canonical audio and admin modules',()=>{
  for(const script of ['/js/boost-core.js','/js/admin-auth-client.js','/js/skip-control.js'])assert.ok(embed.includes(script),script);
  assert.ok(embed.includes('SMFPBoostCore.ensureGraph(audio)') || embed.includes('core.ensureGraph(audio)'));
  assert.ok(embed.includes('core.applyEq(audio,'));
  assert.ok(embed.includes('core.applyBoost(audio,'));
  assert.ok(!embed.includes('createMediaElementSource(audio)'), 'No second audio graph');
});
test('mini player uses shared radio APIs and protects skip',()=>{
  for(const value of ['/api/nowplaying','/api/player-alert/send','S666SkipControl.skip','/stream'])assert.ok(embed.includes(value),value);
  assert.ok(!/AUTH_SECRET|SHOUTCAST_ADMIN_PASSWORD|WEBHOOK_SECRET/.test(embed));
});
test('shared modules and integration contract exist',()=>{
  for(const file of ['public/js/boost-core.js','public/js/admin-auth-client.js','public/js/skip-control.js','docs/EMBED_MINIPLAYER_SYNC_CONTRACT.md'])assert.ok(existsSync(new URL('../'+file,import.meta.url)),file);
});

test('worker allows framing only on the public embed route',()=>{
  const worker=readFileSync(new URL('../worker.js',import.meta.url),'utf8');
  assert.ok(worker.includes('url.pathname==="/embed/miniplayer.html"'));
  assert.ok(worker.includes('headers.delete("x-frame-options")'));
  assert.ok(worker.includes('frame-ancestors https:;'));
  assert.ok(worker.includes('if(!embedded)return new Response("Not found"'));
});

test('native playback does not auto-activate a CORS-sensitive audio graph',()=>{
  const playBody=embed.split('async function play(){')[1]?.split('toggle.addEventListener')[0]||'';
  assert.ok(playBody.includes('await audio.play()'));
  assert.ok(!playBody.includes('enableVisualizer()'));
  assert.ok(!playBody.includes('core.ensureGraph('));
});
