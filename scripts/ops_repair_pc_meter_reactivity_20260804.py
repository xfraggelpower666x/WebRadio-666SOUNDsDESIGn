from pathlib import Path

FILES = [Path('js/equalizer.js'), Path('public/js/equalizer.js')]
OLD = """      const visualGainCompensation = Math.pow(boostGain, -0.55);
      const visualVolumeScale = Math.pow(volume, 0.85);
      const visualSignalScale = visualGainCompensation * visualVolumeScale;
"""
NEW = """      // Visual-only response guard: keep real analyser dynamics readable without
      // making meter motion grow with Boost or collapse at normal listening volume.
      const visualGainCompensation = Math.pow(boostGain, -0.18);
      const visualVolumeScale = 0.72 + Math.pow(volume, 0.85) * 0.28;
      const visualSignalScale = clamp(visualGainCompensation * visualVolumeScale, 0.62, 1);
"""

for path in FILES:
    text = path.read_text(encoding='utf-8')
    count = text.count(OLD)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one visual scale block, found {count}')
    text = text.replace(OLD, NEW, 1)
    path.write_text(text, encoding='utf-8')

root = FILES[0].read_bytes()
public = FILES[1].read_bytes()
if root != public:
    raise SystemExit('equalizer root/public mirror mismatch')

contract = Path('tests/pc-meter-reactivity-floor.test.mjs')
contract.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PC real meter response retains a readable visual floor without Boost-driven growth', async () => {
  const eq = await read('js/equalizer.js');
  assert.equal(await read('public/js/equalizer.js'), eq);
  assert.match(eq, /Math\.pow\(boostGain, -0\.18\)/);
  assert.match(eq, /0\.72 \+ Math\.pow\(volume, 0\.85\) \* 0\.28/);
  assert.match(eq, /clamp\(visualGainCompensation \* visualVolumeScale, 0\.62, 1\)/);
  assert.doesNotMatch(eq, /Math\.pow\(boostGain, -0\.55\)/);
});
""", encoding='utf-8')
