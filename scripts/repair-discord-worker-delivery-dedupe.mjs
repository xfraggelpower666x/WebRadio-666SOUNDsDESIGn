import fs from 'node:fs';

const files=[
  'worker-addons/discord-notify-addon-v3.js',
  'workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js'
];

const oldPrivate=`async function sendPrivateNowPlayingIfConfigured(env, payload) {
  const privateWebhook = getPrivateTrackWebhook(env);
  if (!privateWebhook) return { configured: false, skipped: true };
  try {
    const result = await sendDiscordToWebhook(privateWebhook, payload);
    return { configured: true, ok: true, result };
  } catch (err) {
    return { configured: true, ok: false, error: err && err.message ? err.message : String(err) };
  }
}`;

const newPrivate=`async function sendPrivateNowPlayingIfConfigured(env, payload, alreadyUsedWebhooks = []) {
  const privateWebhook = clean(getPrivateTrackWebhook(env), '', 1000);
  if (!privateWebhook) return { configured: false, skipped: true };
  const used = new Set((alreadyUsedWebhooks || []).map(value => clean(value, '', 1000)).filter(Boolean));
  if (used.has(privateWebhook)) {
    return { configured: true, skipped: true, reason: 'private webhook duplicates main delivery target' };
  }
  try {
    const result = await sendDiscordToWebhook(privateWebhook, payload);
    return { configured: true, ok: true, result };
  } catch (err) {
    return { configured: true, ok: false, error: err && err.message ? err.message : String(err) };
  }
}`;

const oldNow=`      runtime.lastTrackKey = key;
      runtime.lastTrackAt = now;
      runtime.lastKind = 'nowplaying';
      const payload = nowPlayingPayload(input);
      const result = await sendDiscord(env, payload);
      const privateTrack = await sendPrivateNowPlayingIfConfigured(env, payload);
      return json({ ok: true, type: 'nowplaying', led: 'ok', discord: result, privateTrack, addon: ADDON_VERSION });`;

const newNow=`      runtime.lastKind = 'nowplaying';
      const payload = nowPlayingPayload(input);
      const mainWebhooks = getDiscordWebhooks(env);
      const result = await sendDiscord(env, payload);
      runtime.lastTrackKey = key;
      runtime.lastTrackAt = Date.now();
      const privateTrack = await sendPrivateNowPlayingIfConfigured(env, payload, mainWebhooks);
      return json({ ok: true, type: 'nowplaying', led: 'ok', discord: result, privateTrack, addon: ADDON_VERSION });`;

for(const file of files){
  let src=fs.readFileSync(file,'utf8');
  for(const [name,oldBlock,newBlock] of [['private target',oldPrivate,newPrivate],['nowplaying commit',oldNow,newNow]]){
    const count=src.split(oldBlock).length-1;
    if(count!==1) throw new Error(`${file}: ${name} expected once, found ${count}`);
    src=src.replace(oldBlock,newBlock);
  }
  fs.writeFileSync(file,src);
}

const test=`import test from 'node:test';
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
  const nextManualAt=root.indexOf('runtime.lastKind = \'manual\'',start);
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
`;
fs.writeFileSync('tests/discord-worker-delivery-dedupe.test.mjs',test);
