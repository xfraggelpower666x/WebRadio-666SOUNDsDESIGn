import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const addon = read('worker-addons/skip-api-addon.js');

test('AutoDJ status route exposes configuration state but never the access token value', () => {
  assert.match(addon, /url\.pathname === "\/api\/skip\/status"/);
  assert.match(addon, /configured:\s*dedicatedSkipConfigured\(env\)/);
  assert.match(addon, /accessTokenConfigured:\s*Boolean\(dedicatedSkipToken\(env\)\)/);
  assert.match(addon, /protectedWriteRoute:\s*"\/api\/admin\/skip"/);
  assert.match(addon, /secretTransport:\s*"server-side-only"/);
  assert.doesNotMatch(addon, /accessToken:\s*dedicatedSkipToken\(env\)/);
  assert.doesNotMatch(addon, /token:\s*dedicatedSkipToken\(env\)/);
});

test('legacy browser skip POST routes remain blocked behind the protected admin route', () => {
  assert.match(addon, /"\/api\/radio\/skip"/);
  assert.match(addon, /error:\s*"protected_route_required"/);
  assert.match(addon, /protectedWriteRoute:\s*"\/api\/admin\/skip"/);
  assert.match(addon, /authorization:\s*`Bearer \$\{token\}`/);
});
