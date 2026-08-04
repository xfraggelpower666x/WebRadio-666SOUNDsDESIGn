import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');

test('Discord worker addon mirrors remain byte-identical',()=>assert.equal(root,mirror));

test('nowplaying dedupe commits only after a successful main delivery',()=>{
  const start=root.indexOf("    if (path === '/api/discord/nowplaying')");
  const sendAt=root.indexOf('const result = await sendDiscord(env, payload)',start);
  const keyAt=root.indexOf('runtime.lastTrackKey = key',start);
  const timeAt=root.indexOf('runtime.lastTrackAt = Date.now()',start);
  const nextManualAt=root.indexOf("runtime.lastKind = 'manual'",start);
  assert.ok(start>=0&&sendAt>start&&keyAt>sendAt&&timeAt>sendAt&&nextManualAt>timeAt);
  const block=root.slice(start,nextManualAt);
  assert.ok(!block.includes('runtime.lastTrackAt = now'));
});

test('private track webhook cannot duplicate a main delivery target',()=>{
  assert.ok(root.includes('alreadyUsedWebhooks = []'));
  assert.ok(root.includes('used.has(privateWebhook)'));
  assert.ok(root.includes('private webhook duplicates main delivery target'));
  assert.ok(root.includes('sendPrivateNowPlayingIfConfigured(env, payload, mainWebhooks)'));
});

test('Discord endpoints and secret names remain intact',()=>{
  for(const required of [
    "path === '/api/discord/nowplaying'",
    "path === '/api/discord/manual'",
    'env.DISCORD_WEBHOOK_URL2',
    'env.PRIVATE_TRACK_SHOOTER',
    'sendDiscordToWebhook(privateWebhook, payload)'
  ]) assert.ok(root.includes(required),required);
});
