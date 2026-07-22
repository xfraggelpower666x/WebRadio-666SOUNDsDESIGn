// Targeted VELUNA iPhone and central-runtime regression contract v1.0.0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('VELUNA iPhone uses free space for a larger Now Playing image', async () => {
  const root = await read('js/veluna-viewport-lock.js');
  assert.equal(await read('public/js/veluna-viewport-lock.js'), root);
  assert.match(root, /geometry lock v1\.2\.30/);
  assert.match(root, /displayMinimum = compact \? 150 : 188/);
  assert.match(root, /spacerMinimum = 0/);
  assert.match(root, /minmax\(\$\{displayMinimum\}px,1fr\) auto \$\{spacerMinimum\}px/);
  assert.match(root, /compact \? '124px' : '158px'/);
});

test('VELUNA keeps original DOM and loads current central audio/artwork runtimes', async () => {
  const files = ['VELUNA/index.html','veluna/index.html','public/VELUNA/index.html','public/veluna/index.html'];
  const canonical = await read(files[0]);
  for (const path of files.slice(1)) assert.equal(await read(path), canonical, path);
  assert.match(canonical, /central-audio-v202/);
  assert.match(canonical, /single-writer-v54/);
  assert.match(canonical, /central-audio-artwork-v182/);
  assert.match(canonical, /central-artwork-v1230/);
  assert.doesNotMatch(canonical, /s666SplashPreflight|s666SplashPrepaintGate/);
  assert.match(canonical, /id="coverImage"/);
  assert.match(canonical, /id="listenersText"/);
  assert.match(canonical, /id="primaryBtn"/);
  assert.match(canonical, /id="playBtn"/);
});

test('central artwork is the only cover owner while Discord and Messenger remain', async () => {
  const addon = await read('js/addons/discord-player-addon-v3.js');
  assert.equal(await read('public/js/addons/discord-player-addon-v3.js'), addon);
  assert.doesNotMatch(addon, /installSharedVisualStyle|applyCoverToPlayers|syncSharedCoverLogic|TRACK_COVER_MS/);
  assert.match(addon, /velunaMessengerBridge:\s*true/);
  assert.match(addon, /sharedVisualBridge:\s*false/);
  const ui = await read('js/veluna-ui.js');
  assert.equal(await read('public/js/veluna-ui.js'), ui);
  assert.match(ui, /SMFPArtworkCore\?\.enforce/);
  const artwork = await read('js/artwork-core.js');
  assert.match(artwork, /TRACK_MS = 18000/);
  assert.match(artwork, /stream\/station artwork -> local fallback/);
});

test('central sound policy remains 160 ms with mobile hardware volume and desktop boost one', async () => {
  const core = await read('js/boost-core.js');
  assert.match(core, /RAMP_SECONDS = 0\.16/);
  assert.match(core, /maxBoostStage: mobile \? 5 : 1/);
  assert.match(core, /playerVolume: !mobile/);
  assert.match(core, /hardwareVolume: mobile/);
  const policy = await read('js/audio-policy-core.js');
  assert.match(policy, /engine\.applyEq/);
  assert.match(policy, /engine\.applyBoost/);
});
