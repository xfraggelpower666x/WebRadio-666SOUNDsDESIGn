import fs from 'node:fs';

const files=[
  'worker-addons/discord-notify-addon-v3.js',
  'workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js'
];

const oldSend=`  const failed = results.filter(item => !item.ok);
  if (failed.length === results.length) throw new Error(failed.map(item => item.error).join(' | ') || 'all_discord_webhooks_failed');
  runtime.lastOkAt = Date.now();
  runtime.lastError = '';
  return { ok: true, count: results.length, results };
}`;

const newSend=`  const failed = results.filter(item => !item.ok);
  if (failed.length === results.length) throw new Error(failed.map(item => item.error).join(' | ') || 'all_discord_webhooks_failed');
  const partial = failed.length > 0;
  runtime.lastOkAt = Date.now();
  runtime.lastErrorAt = partial ? Date.now() : runtime.lastErrorAt;
  runtime.lastError = partial ? failed.map(item => item.error).join(' | ').slice(0, 1200) : '';
  return { ok: true, partial, delivered: results.length - failed.length, failed: failed.length, count: results.length, results };
}

function discordDeliveryLed(result) {
  return result && result.partial ? 'warning' : 'ok';
}`;

const replacements=[
  ["return json({ ok: true, type: 'test', led: 'ok', discord: result, addon: ADDON_VERSION });","return json({ ok: true, partial: Boolean(result.partial), type: 'test', led: discordDeliveryLed(result), discord: result, addon: ADDON_VERSION });"],
  ["return json({ ok: true, type: 'message', led: 'ok', discord: result, addon: ADDON_VERSION });","return json({ ok: true, partial: Boolean(result.partial), type: 'message', led: discordDeliveryLed(result), discord: result, addon: ADDON_VERSION });"],
  ["return json({ ok: true, type: 'nowplaying', led: 'ok', discord: result, privateTrack, addon: ADDON_VERSION });","return json({ ok: true, partial: Boolean(result.partial), type: 'nowplaying', led: discordDeliveryLed(result), discord: result, privateTrack, addon: ADDON_VERSION });"],
  ["return json({ ok: true, type: 'manual', led: 'ok', discord: result, addon: ADDON_VERSION });","return json({ ok: true, partial: Boolean(result.partial), type: 'manual', led: discordDeliveryLed(result), discord: result, addon: ADDON_VERSION });"]
];

for(const file of files){
  let src=fs.readFileSync(file,'utf8');
  const sendCount=src.split(oldSend).length-1;
  if(sendCount!==1) throw new Error(file+': sendDiscord completion block expected once, found '+sendCount);
  src=src.replace(oldSend,newSend);
  for(const [oldText,newText] of replacements){
    const count=src.split(oldText).length-1;
    if(count!==1) throw new Error(file+': route response expected once, found '+count);
    src=src.replace(oldText,newText);
  }
  fs.writeFileSync(file,src);
}

const lines=[
"import test from 'node:test';",
"import assert from 'node:assert/strict';",
"import fs from 'node:fs';",
"",
"const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');",
"const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');",
"",
"test('Discord worker addon mirrors remain byte-identical',()=>assert.equal(root,mirror));",
"",
"test('partial main or mirror failure remains visible',()=>{",
"  assert.ok(root.includes('const partial = failed.length > 0'));",
"  assert.ok(root.includes('delivered: results.length - failed.length'));",
"  assert.ok(root.includes('failed: failed.length'));",
"  assert.ok(root.includes(\"return result && result.partial ? 'warning' : 'ok'\"));",
"  assert.ok(root.includes(\"runtime.lastError = partial ? failed.map(item => item.error).join(' | ').slice(0, 1200) : ''\"));",
"});",
"",
"test('all successful response routes expose partial and delivery LED',()=>{",
"  for(const type of ['test','message','nowplaying','manual']) assert.ok(root.includes(\"type: '\"+type+\"', led: discordDeliveryLed(result)\"),type);",
"  assert.equal((root.match(/partial: Boolean\\(result\\.partial\\)/g)||[]).length,4);",
"});",
"",
"test('delivery and endpoint contracts remain intact',()=>{",
"  for(const required of ['sendDiscordToWebhook(webhooks[i], payload)','failed.length === results.length',\"path === '/api/discord/nowplaying'\",\"path === '/api/discord/manual'\",'env.PRIVATE_TRACK_SHOOTER']) assert.ok(root.includes(required),required);",
"});",
""
];
fs.writeFileSync('tests/discord-partial-delivery-status.test.mjs',lines.join('\n'));
