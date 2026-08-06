import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Discord shooter defaults to direct local transport with exactly three categories', async () => {
  const addon = await read('js/addons/discord-player-addon-v3.js');
  assert.equal(await read('public/js/addons/discord-player-addon-v3.js'), addon);
  assert.match(addon, /DIRECT_STORAGE_KEY = 's666_discord_direct_v1'/);
  assert.match(addon, /DIRECT_CATEGORY_IDS = \['main', 'community', 'labor'\]/);
  assert.match(addon, /runtimeConfig\(\)\.transport \|\| 'direct'/);
  assert.match(addon, /transportMode\(\) === 'direct'/);
  assert.match(addon, /credentials = 'omit'/);
  assert.match(addon, /wait=true/);
  assert.match(addon, /threePostingCategories: true/);
  assert.match(addon, /data-discord-settings-save/);
  assert.match(addon, /s666DiscordAutoTarget/);
  assert.doesNotMatch(addon, /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9._-]{10,}/);
});

test('Direct Now Playing waits for the real audio playing event and worker mode is only legacy explicit', async () => {
  const addon = await read('js/addons/discord-player-addon-v3.js');
  assert.match(addon, /document\.addEventListener\('playing', onPlaying, true\)/);
  assert.match(addon, /if \(transportMode\(\) === 'direct' && !directPlaybackStarted\) return/);
  assert.match(addon, /startup-first-now-playing/);
  assert.match(addon, /clean\(runtimeConfig\(\)\.transport \|\| 'direct'/);
  assert.match(addon, /\/api\/discord\/status\?t=/);
  assert.match(addon, /transport: 'direct-local'/);
  assert.match(addon, /Webhook gelöscht oder ungültig/);
});


test('Manual Now Playing uses the selected category while startup and watcher use Auto Now Playing', async () => {
  const addon = await read('js/addons/discord-player-addon-v3.js');
  assert.match(addon, /if \(DIRECT_CATEGORY_IDS\.indexOf\(String\(requested \|\| ''\)\) >= 0\) return String\(requested\);[\s\S]*if \(String\(path\)\.indexOf\('\/nowplaying'\) >= 0\) return settings\.autoTarget;/);
  assert.match(addon, /postTrackIfChanged\(true, 'manual-now-playing', selectedTarget && selectedTarget\.value\)/);
  assert.match(addon, /async function postTrackIfChanged\(force, reason, directTarget\)/);
  assert.match(addon, /data\.directTarget = String\(directTarget\)/);
  assert.match(addon, /postTrackIfChanged\(true, 'startup-first-now-playing'\)/);
  assert.match(addon, /postTrackIfChanged\(false, 'watcher-track-change'\)/);
});

test('Canonical visualizer adopts or registers one central graph and reports failures', async () => {
  const eq = await read('js/equalizer.js');
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.match(eq, /SMFPBoostCore\?\.graphFor\?\.\(audio\)/);
  assert.match(eq, /SMFPBoostCore\?\.registerEngine\?\.\(audio/);
  assert.match(eq, /existing_audio_source_without_analyser/);
  assert.match(eq, /data-visualizer-graph/);
  assert.match(eq, /s666:visualizer-graph/);
  assert.equal((eq.match(/createMediaElementSource\(audio\)/g) || []).length, 1);
});

test('Mobile layer preserves canonical runtime owners and VELUNA restarts existing engine on playing', async () => {
  const html = await read('index.html');
  assert.equal(await read('public/index.html'), html);
  assert.match(html, /ensureCanonicalRuntimeOwnerHost\(\)/);
  assert.match(html, /host\.appendChild\(owner\)/);
  assert.match(html, /canonicalRuntimeOwner\('playBtn'\)/);
  assert.match(html, /data-mff-canonical-runtime-owners/);
  const veluna = await read('veluna/index.html');
  for (const path of ['VELUNA/index.html','public/veluna/index.html','public/VELUNA/index.html']) assert.equal(await read(path), veluna);
  assert.match(veluna, /audio\.addEventListener\('playing',\(\)=>\{if\(userStopped\)return;hasPlayed=true;void soundEngine\.start\(\);startMetadata\(\);requestAnimationFrame\(\(\)=>requestAnimationFrame\(syncTickerMotion\)\)/);
  assert.match(veluna, /recoverAfterReturn[\s\S]*await soundEngine\.start\(\)/);
});
