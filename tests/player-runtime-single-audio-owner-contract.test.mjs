import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const publicHtml=fs.readFileSync('public/index.html','utf8');

test('mobile UI delegates transport to canonical player core',()=>{
  assert.match(html,/return canonicalRuntimeOwner\('radio'\)\|\|q\('audio'\)\|\|null/);
  assert.match(html,/canonicalRuntimeOwner\('playBtn'\)/);
  assert.match(html,/canonicalRuntimeOwner\('pauseBtn'\)/);
  assert.match(html,/canonicalRuntimeOwner\('stopBtn'\)/);
  assert.match(html,/ensureCanonicalRuntimeOwnerHost\(\)/);
  assert.match(html,/s666CanonicalRuntimeOwners/);
  assert.doesNotMatch(html,/createElement\(['\"]audio['\"]\)/);
  assert.equal(html,publicHtml);
});
