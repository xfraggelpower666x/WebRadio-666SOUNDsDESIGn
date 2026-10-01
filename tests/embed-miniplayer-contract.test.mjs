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
