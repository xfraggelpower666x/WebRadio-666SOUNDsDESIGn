import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const MARK='2026-09-04-recovery-single-owner-v3';
const APP_RETURN_MARK='2026-09-05-header-panels-led-idle-v1';

test('repaired PC runtime assets use one fresh cache identity', async () => {
  const html=await read('index.html');
  const pub=await read('public/index.html');
  const core=await read('js/player-core.js');
  assert.equal(pub,html);
  assert.ok(html.includes(`/css/player-stage-v2.css?v=${MARK}`));
  assert.ok(html.includes(`/js/player-stage-v2.js?v=${MARK}`));
  assert.ok(html.includes(`/js/player-core.js?v=${APP_RETURN_MARK}`));
  assert.ok(html.includes(`/js/media-session-ios.js?v=${APP_RETURN_MARK}`));
  assert.ok(html.includes(`/css/mobile-patches.css?v=${APP_RETURN_MARK}`));
  assert.ok(core.includes(`./equalizer.js?v=${MARK}`));
  assert.equal(await read('public/js/player-core.js'),core);
  assert.ok(!html.includes('/css/player-stage-v2.css?v=2026-07-24-balanced-headroom-v14'));
  assert.ok(!html.includes('/js/player-stage-v2.js?v=2026-07-24-balanced-headroom-v14'));
  assert.ok(!html.includes('/js/player-core.js?v=2026-08-06-runtime-owner-v1'));
  assert.ok(!core.includes('./equalizer.js?v=2026-08-06-runtime-owner-v1'));
});