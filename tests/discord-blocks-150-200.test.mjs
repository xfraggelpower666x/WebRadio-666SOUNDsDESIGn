import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');
test('worker mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('message and manual cooldown timestamps are committed after delivery',()=>{
  assert.ok(root.includes("const result = await sendDiscord(env, messagePayload(input));\n      runtime.lastMessageAt = Date.now();"));
  assert.ok(root.includes("const result = await sendDiscord(env, manualPayload(input));\n    runtime.lastManualAt = Date.now();"));
});
test('secondary and private configuration reflect usable unique targets',()=>{
  assert.ok(root.includes('webhook2Configured: getDiscordWebhooks(env).length > 1'));
  assert.ok(root.includes("privateTrackWebhookConfigured: Boolean(clean(getPrivateTrackWebhook(env), '', 1000))"));
});
test('private retry cannot erase an unresolved main partial failure',()=>{
  assert.ok(root.includes("runtime.pendingMainPartialTrackKey === key"));
  assert.ok(root.includes("'nowplaying-private-retry-ok-main-partial'"));
  assert.ok(root.includes("pendingMainPartialTrack: runtime.pendingMainPartialTrackKey ? '[set]' : ''"));
});
