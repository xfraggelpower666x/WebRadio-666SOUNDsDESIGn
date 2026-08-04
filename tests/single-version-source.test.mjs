import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

for (const file of ['index.html','public/index.html']) {
  const src = fs.readFileSync(file, 'utf8');
  test(file + ': mobile has one canonical visible version source', () => {
    assert.match(src, /qsa\('\.smfp-v181-footer-version',a\)\.forEach/);
    assert.doesNotMatch(src, /footer\.textContent='WebRadio 666SOUNDsDESIGn '/);
    assert.match(src, /class=\"smfp-version-badge\"/);
  });
}
