import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');

test('Discord worker addon mirrors remain byte-identical',()=>assert.equal(root,mirror));

test('private track failure contributes to partial warning truth',()=>{
  assert.ok(root.includes('const privatePartial = privateTrack.configured === true && privateTrack.ok === false'));
  assert.ok(root.includes('const partial = Boolean(result.partial || privatePartial)'));
  assert.ok(root.includes("runtime.lastError = clean(privateTrack.error, 'private_track_delivery_failed', 1200)"));
  assert.ok(root.includes("led: partial ? 'warning' : discordDeliveryLed(result)"));
});

test('private unconfigured or duplicate target remains a clean skip',()=>{
  assert.ok(root.includes('if (!privateWebhook) return { configured: false, skipped: true }'));
  assert.ok(root.includes("reason: 'private webhook duplicates main delivery target'"));
});

test('main delivery and endpoint contracts remain intact',()=>{
  for(const required of ['const result = await sendDiscord(env, payload)','runtime.lastTrackKey = key','runtime.lastTrackAt = Date.now()',"path === '/api/discord/nowplaying'",'env.PRIVATE_TRACK_SHOOTER']) assert.ok(root.includes(required),required);
});
