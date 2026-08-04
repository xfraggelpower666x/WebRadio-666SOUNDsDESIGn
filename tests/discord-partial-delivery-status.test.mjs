// CI retrigger after one-shot cleanup; runtime files unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');

test('Discord worker addon mirrors remain byte-identical',()=>assert.equal(root,mirror));

test('partial main or mirror failure remains visible',()=>{
  assert.ok(root.includes('const partial = failed.length > 0'));
  assert.ok(root.includes('delivered: results.length - failed.length'));
  assert.ok(root.includes('failed: failed.length'));
  assert.ok(root.includes("return result && result.partial ? 'warning' : 'ok'"));
  assert.ok(root.includes("runtime.lastError = partial ? failed.map(item => item.error).join(' | ').slice(0, 1200) : ''"));
});

test('all successful response routes expose partial and delivery LED',()=>{
  for(const type of ['test','message','nowplaying','manual']) assert.ok(root.includes("type: '"+type+"', led: discordDeliveryLed(result)"),type);
  assert.equal((root.match(/partial: Boolean\(result\.partial\)/g)||[]).length,4);
});

test('delivery and endpoint contracts remain intact',()=>{
  for(const required of ['sendDiscordToWebhook(webhooks[i], payload)','failed.length === results.length',"path === '/api/discord/nowplaying'","path === '/api/discord/manual'",'env.PRIVATE_TRACK_SHOOTER']) assert.ok(root.includes(required),required);
});
