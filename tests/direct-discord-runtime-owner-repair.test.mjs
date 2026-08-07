import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Discord shooter restores verified Worker transport as default', async () => {
  const addon = await read('js/addons/discord-player-addon-v3.js');
  assert.equal(await read('public/js/addons/discord-player-addon-v3.js'), addon);
  assert.match(addon, /V5\.1-20260807-WORKER-RESTORE-LIVE-JULY/);
  assert.match(addon, /runtimeConfig\(\)\.transport \|\| 'worker'/);
  assert.match(addon, /=== 'direct' \? 'direct' : 'worker'/);
  assert.match(addon, /\/api\/discord\/message/);
  assert.match(addon, /\/api\/discord\/manual/);
  assert.match(addon, /\/api\/discord\/nowplaying/);
  assert.match(addon, /\/api\/discord\/status/);
  assert.match(addon, /Serverseitiger Discord Shooter/);
  assert.match(addon, /workerTransportDefault: true/);
  assert.match(addon, /directLocalTransport: false/);
  assert.match(addon, /threePostingCategories: false/);
  assert.doesNotMatch(addon, /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9._-]{10,}/);
});

test('Worker Now Playing waits for real audio playing while direct remains explicit fallback', async () => {
  const addon = await read('js/addons/discord-player-addon-v3.js');
  assert.match(addon, /document\.addEventListener\('playing', onPlaying, true\)/);
  assert.match(addon, /if \(!force && !directPlaybackStarted\) return \{ ok: true, skipped: true, reason: 'audio_not_playing' \}/);
  assert.match(addon, /if \(!directPlaybackStarted\) return;/);
  assert.match(addon, /credentials: 'same-origin'/);
  assert.match(addon, /transportMode\(\) === 'direct'/);
  assert.match(addon, /directTarget: transportMode\(\) === 'direct' \? settings\.selectedTarget : undefined/);
});

test('all production player mirrors explicitly select Worker transport', async () => {
  const files = ['index.html','public/index.html','VELUNA/index.html','veluna/index.html','public/VELUNA/index.html','public/veluna/index.html'];
  for (const path of files) {
    const html = await read(path);
    assert.match(html, /transport:\s*'worker'/, path);
    assert.doesNotMatch(html, /transport:\s*'direct'/, path);
    assert.match(html, /discord-player-addon-v3\.js\?v=2026-08-07-worker-restore-v1/, path);
  }
  assert.equal(await read('public/index.html'), await read('index.html'));
  const veluna = await read('VELUNA/index.html');
  for (const path of ['veluna/index.html','public/VELUNA/index.html','public/veluna/index.html']) assert.equal(await read(path), veluna, path);
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
