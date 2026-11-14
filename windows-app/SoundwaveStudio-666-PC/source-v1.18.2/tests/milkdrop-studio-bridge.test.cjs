'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { Preset } = require('../src/vendor/cayatur/milkdrop-core.js');
const root = path.resolve(__dirname, '../../milkdrop-cyber-studio/preset-studio/presets');

test('Bundled presets preserve bass and treble smoothing across real EEL frames', () => {
  for (const profile of fs.readdirSync(root)) {
    const directory = path.join(root, profile);
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
    for (const { file, sha256 } of manifest) {
      const bytes = fs.readFileSync(path.join(directory, file));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), sha256, file);
      const preset = new Preset(bytes.toString('utf8'), { accurate: true });
      assert.deepEqual(preset.errors, [], file);
      for (const [bass, expectedQ1, expectedQ2] of [[2, 1.18, 1.1], [2, 1.3276, 1.19], [1, 1.268632, 1.171]]) {
        preset.frame({ bass, treb: bass, time: 0 });
        assert.ok(Math.abs(preset.get('q1') - expectedQ1) < 1e-5, file + ' q1');
        assert.ok(Math.abs(preset.get('q2') - expectedQ2) < 1e-5, file + ' q2');
      }
    }
  }
});

test('Secondary output clears a previous import when a built-in preset is selected', () => {
  const code = fs.readFileSync(path.join(__dirname, '../src/integration/666-integration.js'), 'utf8');
  const registration = code.split('\n').find(line => line.includes('window.api.onSourceState(st=>'));
  assert.ok(registration);
  let update;
  const elements = new Map();
  const context = vm.createContext({
    window: { api: { onSourceState(handler) { update = handler; } } },
    q(id) {
      if (!elements.has(id)) elements.set(id, { value: '' });
      return elements.get(id);
    },
    composeStage() {}
  });
  vm.runInContext('let importedMilkdrop = null;\n' + registration, context);
  update({ visual: { engine: 'milkdrop', importedMilkdrop: { id: 'studio-preset', source: '[preset00]' } } });
  assert.equal(vm.runInContext('importedMilkdrop.id', context), 'studio-preset');
  update({ visual: { engine: 'milkdrop', milkdropPreset: 'builtin' } });
  assert.equal(vm.runInContext('importedMilkdrop', context), null);
  assert.equal(elements.get('#milkdrop-preset').value, 'builtin');
});
