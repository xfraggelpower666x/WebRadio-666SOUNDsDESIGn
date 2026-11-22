import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dash = readFileSync(new URL('../dashboard/index.html', import.meta.url), 'utf8');
const mirror = readFileSync(new URL('../public/dashboard/index.html', import.meta.url), 'utf8');

test('Dashboard and public mirror remain byte-identical', () => {
  assert.equal(dash, mirror);
});

test('HUD diagnostics only render HTTP information and never change functional LED health', () => {
  const start = dash.indexOf('<script id="dashboard-hud-endpoint-runtime">');
  const end = dash.indexOf('</script>', start);
  assert.ok(start >= 0 && end > start);
  const diagnostics = dash.slice(start, end);
  assert.match(diagnostics, /const response=await fetch\(path/);
  assert.match(diagnostics, /httpStatus='HTTP '\+response\.status/);
  assert.match(diagnostics, /rawResponse=displayed/);
  assert.doesNotMatch(diagnostics, /button\.dataset\.health\s*=/);
  assert.doesNotMatch(diagnostics, /mark\('/);
});

test('SB LED only indicates genuine observed buffering; source and stream LEDs use active MiniPlayer', () => {
  assert.match(dash, /mark\('SB',state\.waiting\?'pending':'off'/);
  assert.doesNotMatch(dash, /mark\('SB',state\.waiting\?'pending':state\.playing\?'ok'/);
  assert.match(dash, /mark\('STR',state\.error\?'error':state\.waiting/);
  assert.match(dash, /mark\('M',playing&&state\.source==='main'/);
  assert.match(dash, /mark\('B',playing&&state\.source==='backup'/);
});

test('MET diagnostic copy control and dialog remain present', () => {
  assert.match(dash, /id="hudCopy"/);
  assert.match(dash, /id="hudCopyStatus"/);
  assert.match(dash, /id="hudModal"/);
});
