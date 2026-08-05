import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror = fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');
test('Discord worker mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('stale private pending state is cleared at a real track boundary',()=>{
  const clear = "if (runtime.pendingPrivateTrackKey && runtime.pendingPrivateTrackKey !== key)";
  assert.ok(root.includes(clear));
  const clearAt = root.indexOf(clear);
  const mainAt = root.indexOf("runtime.lastKind = 'nowplaying';", clearAt);
  const sendAt = root.indexOf('const result = await sendDiscord(env, payload);', mainAt);
  assert.ok(clearAt < mainAt && mainAt < sendAt);
});
test('same-track private-only retry remains before the track-boundary clear',()=>{
  const dedupeAt = root.indexOf('if (key === runtime.lastTrackKey');
  const retryAt = root.indexOf('runtime.pendingPrivateTrackKey === key', dedupeAt);
  const clearAt = root.indexOf('runtime.pendingPrivateTrackKey && runtime.pendingPrivateTrackKey !== key');
  assert.ok(dedupeAt >= 0 && retryAt > dedupeAt && clearAt > retryAt);
});
test('main Discord contracts remain intact',()=>{
  for (const marker of ['sendDiscord(env, payload)','sendPrivateNowPlayingIfConfigured(env, payload, mainWebhooks)','MIN_TRACK_COOLDOWN_MS','PRIVATE_TRACK_SHOOTER']) assert.ok(root.includes(marker), marker);
});
