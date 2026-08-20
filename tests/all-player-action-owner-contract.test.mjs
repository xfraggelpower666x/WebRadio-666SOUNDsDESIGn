import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const stage = read('js/player-stage-v2.js');
const stagePublic = read('public/js/player-stage-v2.js');
const skip = read('js/skip-control.js');
const skipPublic = read('public/js/skip-control.js');
const messenger = read('js/messenger-overlay.js');
const messengerPublic = read('public/js/messenger-overlay.js');
const discord = read('js/addons/discord-player-addon-v3.js');
const discordPublic = read('public/js/addons/discord-player-addon-v3.js');

test('shared player action owners remain mirrored', () => {
  assert.equal(stagePublic, stage);
  assert.equal(skipPublic, skip);
  assert.equal(messengerPublic, messenger);
  assert.equal(discordPublic, discord);
});

test('desktop and mobile stage actions delegate to existing canonical owners', () => {
  assert.match(stage, /S666DiscordPlayerAddonV3\.messagePost/);
  assert.match(stage, /S666SkipControl\.skip/);
  assert.match(stage, /s666StageDiscord/);
  assert.match(stage, /s666StageMobileDiscord/);
  assert.match(stage, /s666StageSkip/);
  assert.match(stage, /s666StageMobileSkip/);
  assert.doesNotMatch(stage, /discord(?:app)?\.com\/api\/webhooks/i);
  assert.doesNotMatch(stage, /S666_AUTODJ_SKIP_ACCESS_TOKEN/);
});

test('skip controller uses only protected same-origin Player Admin route', () => {
  assert.match(skip, /S666AdminAuth\.fetch\('\/api\/admin\/skip'/);
  assert.match(skip, /credentials:\s*'same-origin'/);
  assert.match(skip, /cache:\s*'no-store'/);
  assert.doesNotMatch(skip, /fetch\('\/api\/radio\/skip'/);
  assert.doesNotMatch(skip, /666-autodj-skip\.666soundsdesign-broadcaster\.com/);
  assert.doesNotMatch(skip, /S666_AUTODJ_SKIP_ACCESS_TOKEN\s*=/);
});

test('messenger has one authoritative send owner through PlayerAlertClient', () => {
  assert.match(messenger, /authoritative Messenger overlay/);
  assert.match(messenger, /var client = window\.S666PlayerAlertClient/);
  assert.match(messenger, /return client\.send\(message, \{ username: 'Broadcast', source: 'messenger-overlay' \}\)/);
  assert.match(messenger, /if \(activeSendId\) return Promise\.resolve\(false\)/);
  assert.doesNotMatch(messenger, /discord(?:app)?\.com\/api\/webhooks/i);
});

test('Discord Shooter defaults to server-side Worker transport', () => {
  assert.match(discord, /transport defaults to the verified same-origin Worker routes/);
  assert.match(discord, /Webhook URLs remain server-side in Worker secrets/);
  assert.match(discord, /runtimeConfig\(\)\.transport \|\| 'worker'/);
  assert.match(discord, /clean\(runtimeConfig\(\)\.transport \|\| 'worker', 24\)\.toLowerCase\(\) === 'direct' \? 'direct' : 'worker'/);
});
