import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = await readFile(new URL('../js/phase10-stability-iphone-panel-hud.js', import.meta.url), 'utf8');
const pub = await readFile(new URL('../public/js/phase10-stability-iphone-panel-hud.js', import.meta.url), 'utf8');

test('Phase10 root/public mirror stays byte-identical', () => {
  assert.equal(root, pub);
});

test('Phase10 recognizes and delegates to canonical all-player recovery owner', () => {
  assert.match(root, /owner\.owner === "all-player-audio-recovery-v1"/);
  assert.match(root, /typeof owner\.legacyHandoff === "function"/);
  assert.match(root, /var handoffReason = reason \|\| source \|\| "legacy-recovery-signal"/);
  assert.match(root, /owner\.legacyHandoff\(handoffReason\)/);
  assert.doesNotMatch(root, /owner\.owner\.id === "all-player-audio-recovery-v1"/);
  assert.doesNotMatch(root, /owner\.legacyHandoff\(source \|\| "phase10", reason \|\| "legacy-recovery-signal"\)/);
  assert.match(root, /function centralAudioGuardV2Recover\(reason\)\{\s*if\(s666LegacyRecoveryHandoff\("phase10-central-guard", reason \|\| "phase10-recovery"\)\) return;/);
});

test('Phase10 desktop automatic backup paths hand off before hard transport mutation', () => {
  const guardStart = root.indexOf('function installPcMainBackupGuard()');
  const guardEnd = root.indexOf('function phase10RelocatePcPanels()', guardStart);
  const guard = root.slice(guardStart, guardEnd);
  const handoff = guard.indexOf('s666LegacyRecoveryHandoff("phase10-pc-backup-guard","backup-detected")');
  const pause = guard.indexOf('audio.pause()');
  assert.ok(handoff >= 0, 'desktop backup guard must hand off');
  assert.ok(pause < 0 || handoff < pause, 'handoff must happen before hard pause/load fallback');

  const directStart = root.indexOf('function directfixPcNoAutoFallback()');
  const directEnd = root.indexOf('function directfixTickerAndMessage()', directStart);
  const direct = root.slice(directStart, directEnd);
  const directHandoff = direct.indexOf('s666LegacyRecoveryHandoff("phase10-pc-directfix","backup-detected")');
  const directPause = direct.indexOf('audio.pause()');
  assert.ok(directHandoff >= 0, 'directfix must hand off');
  assert.ok(directPause < 0 || directHandoff < directPause, 'directfix handoff must happen before hard pause/load fallback');
});

test('manual H/B stream controls remain present', () => {
  for (const marker of ['#mainBtn', '#fallbackBtn', 'phase10MarkManualStreamSwitch', 'bindMobileStreamLedSwitch']) {
    assert.ok(root.includes(marker), marker);
  }
});
