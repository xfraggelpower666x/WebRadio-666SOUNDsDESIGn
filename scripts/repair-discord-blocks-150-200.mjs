import fs from 'node:fs';

const files = [
  'worker-addons/discord-notify-addon-v3.js',
  'workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js'
];

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`missing patch anchor: ${label}`);
  return source.replace(from, to);
}

for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');

  s = replaceOnce(s,
`  lastKind: 'idle',
  pendingPrivateTrackKey: ''
};
if (typeof runtime.pendingPrivateTrackKey !== 'string') runtime.pendingPrivateTrackKey = '';`,
`  lastKind: 'idle',
  pendingPrivateTrackKey: '',
  pendingMainPartialTrackKey: '',
  pendingMainPartialError: ''
};
if (typeof runtime.pendingPrivateTrackKey !== 'string') runtime.pendingPrivateTrackKey = '';
if (typeof runtime.pendingMainPartialTrackKey !== 'string') runtime.pendingMainPartialTrackKey = '';
if (typeof runtime.pendingMainPartialError !== 'string') runtime.pendingMainPartialError = '';`,
'runtime pending main partial state');

  s = s.replaceAll(
`      webhook2Configured: Boolean(env && (env.DISCORD_WEBHOOK_URL2 || env.DISCORD_WEBHOOK_2 || env.DISCORD_SECONDARY_WEBHOOK_URL)),
      privateTrackWebhookConfigured: Boolean(getPrivateTrackWebhook(env)),`,
`      webhook2Configured: getDiscordWebhooks(env).length > 1,
      privateTrackWebhookConfigured: Boolean(clean(getPrivateTrackWebhook(env), '', 1000)),`);

  s = replaceOnce(s,
`      pendingPrivateTrack: runtime.pendingPrivateTrackKey ? '[set]' : ''`,
`      pendingPrivateTrack: runtime.pendingPrivateTrackKey ? '[set]' : '',
      pendingMainPartialTrack: runtime.pendingMainPartialTrackKey ? '[set]' : ''`,
'debug pending main partial marker');

  s = replaceOnce(s,
`      runtime.lastMessageAt = now;
      runtime.lastKind = 'message';
      const result = await sendDiscord(env, messagePayload(input));
      return json({ ok: true, partial: Boolean(result.partial), type: 'message', led: discordDeliveryLed(result), discord: result, addon: ADDON_VERSION });`,
`      runtime.lastKind = 'message';
      const result = await sendDiscord(env, messagePayload(input));
      runtime.lastMessageAt = Date.now();
      return json({ ok: true, partial: Boolean(result.partial), type: 'message', led: discordDeliveryLed(result), discord: result, addon: ADDON_VERSION });`,
'message cooldown after delivery');

  s = replaceOnce(s,
`    runtime.lastManualAt = now;
    runtime.lastKind = 'manual';
    const result = await sendDiscord(env, manualPayload(input));
    return json({ ok: true, partial: Boolean(result.partial), type: 'manual', led: discordDeliveryLed(result), discord: result, addon: ADDON_VERSION });`,
`    runtime.lastKind = 'manual';
    const result = await sendDiscord(env, manualPayload(input));
    runtime.lastManualAt = Date.now();
    return json({ ok: true, partial: Boolean(result.partial), type: 'manual', led: discordDeliveryLed(result), discord: result, addon: ADDON_VERSION });`,
'manual cooldown after delivery');

  s = replaceOnce(s,
`          runtime.pendingPrivateTrackKey = '';
          runtime.lastOkAt = Date.now();
          runtime.lastErrorAt = 0;
          runtime.lastError = '';
          runtime.lastKind = 'nowplaying-private-retry-ok';
          return json({ ok: true, partial: false, privateRetry: true, skippedMain: true, led: 'ok', privateTrack, addon: ADDON_VERSION });`,
`          runtime.pendingPrivateTrackKey = '';
          runtime.lastOkAt = Date.now();
          const mainStillPartial = runtime.pendingMainPartialTrackKey === key;
          runtime.lastErrorAt = mainStillPartial ? Date.now() : 0;
          runtime.lastError = mainStillPartial ? runtime.pendingMainPartialError : '';
          runtime.lastKind = mainStillPartial ? 'nowplaying-private-retry-ok-main-partial' : 'nowplaying-private-retry-ok';
          return json({ ok: true, partial: mainStillPartial, privateRetry: true, skippedMain: true, led: mainStillPartial ? 'warning' : 'ok', privateTrack, addon: ADDON_VERSION });`,
'private retry preserves main partial truth');

  s = replaceOnce(s,
`      if (runtime.pendingPrivateTrackKey && runtime.pendingPrivateTrackKey !== key) {
        runtime.pendingPrivateTrackKey = '';
      }`,
`      if (runtime.pendingPrivateTrackKey && runtime.pendingPrivateTrackKey !== key) {
        runtime.pendingPrivateTrackKey = '';
      }
      if (runtime.pendingMainPartialTrackKey && runtime.pendingMainPartialTrackKey !== key) {
        runtime.pendingMainPartialTrackKey = '';
        runtime.pendingMainPartialError = '';
      }`,
'clear stale main partial on track change');

  s = replaceOnce(s,
`      const result = await sendDiscord(env, payload);
      runtime.lastTrackKey = key;
      runtime.lastTrackAt = Date.now();
      const privateTrack = await sendPrivateNowPlayingIfConfigured(env, payload, mainWebhooks);`,
`      const result = await sendDiscord(env, payload);
      runtime.lastTrackKey = key;
      runtime.lastTrackAt = Date.now();
      if (result.partial) {
        runtime.pendingMainPartialTrackKey = key;
        runtime.pendingMainPartialError = runtime.lastError;
      } else {
        runtime.pendingMainPartialTrackKey = '';
        runtime.pendingMainPartialError = '';
      }
      const privateTrack = await sendPrivateNowPlayingIfConfigured(env, payload, mainWebhooks);`,
'record main partial state');

  fs.writeFileSync(file, s);
}

const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('worker-addons/discord-notify-addon-v3.js','utf8');
const mirror=fs.readFileSync('workers/webradio-666soundsdesign-worker/worker-addons/discord-notify-addon-v3.js','utf8');
test('worker mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('message and manual cooldown timestamps are committed after delivery',()=>{
  assert.ok(root.includes("const result = await sendDiscord(env, messagePayload(input));\\n      runtime.lastMessageAt = Date.now();"));
  assert.ok(root.includes("const result = await sendDiscord(env, manualPayload(input));\\n    runtime.lastManualAt = Date.now();"));
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
`;
fs.writeFileSync('tests/discord-blocks-150-200.test.mjs', test);
