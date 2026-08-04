import fs from 'node:fs';

const files=[
  'worker-addons/discord-notify-addon-v3.js',
  'workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js'
];

const oldBlock=`      const privateTrack = await sendPrivateNowPlayingIfConfigured(env, payload, mainWebhooks);
      return json({ ok: true, partial: Boolean(result.partial), type: 'nowplaying', led: discordDeliveryLed(result), discord: result, privateTrack, addon: ADDON_VERSION });`;

const newBlock=`      const privateTrack = await sendPrivateNowPlayingIfConfigured(env, payload, mainWebhooks);
      const privatePartial = privateTrack.configured === true && privateTrack.ok === false;
      const partial = Boolean(result.partial || privatePartial);
      if (privatePartial) {
        runtime.lastErrorAt = Date.now();
        runtime.lastError = clean(privateTrack.error, 'private_track_delivery_failed', 1200);
      }
      return json({ ok: true, partial, type: 'nowplaying', led: partial ? 'warning' : discordDeliveryLed(result), discord: result, privateTrack, addon: ADDON_VERSION });`;

for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  const count=src.split(oldBlock).length-1;
  if(count!==1) throw new Error(`${file}: nowplaying private status block expected once, found ${count}`);
  fs.writeFileSync(file,src.replace(oldBlock,newBlock));
}

const test=`import test from 'node:test';
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
`;
fs.writeFileSync('tests/discord-private-partial-status.test.mjs',test);
