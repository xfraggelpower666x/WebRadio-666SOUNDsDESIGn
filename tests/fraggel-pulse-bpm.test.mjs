import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const core = read('js/fraggel-pulse-bpm.js');
const corePublic = read('public/js/fraggel-pulse-bpm.js');
const config = read('config/veluna-assets.js');
const configPublic = read('public/config/veluna-assets.js');
const index = read('index.html');

test('Fraggel Pulse BPM runtime and bootstrap mirrors stay identical', () => {
  assert.equal(corePublic, core);
  assert.equal(configPublic, config);
  assert.match(config, /\/js\/fraggel-pulse-bpm\.js\?v=/);
  assert.match(index, /aria-label="Fraggle Pulse"/);
});

test('Fraggel Pulse defaults to 145 BPM instead of trusting the old static 128 display', () => {
  assert.match(core, /const FALLBACK_BPM = 145;/);
  assert.match(core, /publish\(FALLBACK_BPM, 'fallback'\)/);
  assert.doesNotMatch(core, /FALLBACK_BPM\s*=\s*128/);
});

test('BPM detection uses existing metadata and MeterBus without creating another audio graph', () => {
  assert.match(core, /data-track-bpm/);
  assert.match(core, /#nowPlayingTicker/);
  assert.match(core, /window\.__MeterBus/);
  assert.match(core, /bus\.source === 'real'/);
  assert.doesNotMatch(core, /createMediaElementSource|new AudioContext|webkitAudioContext|createAnalyser|connect\(/);
});

test('BPM normalization guards half-time and double-time estimates inside the psy range', () => {
  assert.match(core, /const MIN_BPM = 120;/);
  assert.match(core, /const MAX_BPM = 180;/);
  assert.match(core, /while \(bpm < MIN_BPM && bpm \* 2 <= MAX_BPM\) bpm \*= 2;/);
  assert.match(core, /while \(bpm > MAX_BPM && bpm \/ 2 >= MIN_BPM\) bpm \/= 2;/);
  assert.match(core, /close\.length \/ bpms\.length < 0\.58/);
});

test('static Fraggel Pulse text cannot self-identify as metadata', () => {
  const metadataBlock = core.slice(core.indexOf('const metadataBpm'), core.indexOf('const estimateFromPeaks'));
  assert.doesNotMatch(metadataBlock, /document\.body.*textContent/);
  assert.match(metadataBlock, /document\.querySelector\('#metaLine'\)/);
});
