import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = fs.readFileSync('config/veluna-assets.js', 'utf8');
const mirror = fs.readFileSync('public/config/veluna-assets.js', 'utf8');

assert.equal(mirror, root, 'shared player bootstrap must stay byte-identical in root/public');
assert.match(root, /SYSTEM_MEDIA_CANONICAL_LAUNCH_GUARD_v1/);
assert.match(root, /https:\/\/webradio\.666soundsdesign-broadcaster\.com/);
assert.match(root, /xfraggelpower666x\.github\.io/);
assert.match(root, /path\.startsWith\('\/external-player'\)/);
assert.match(root, /path\.startsWith\('\/extern'\)/);
assert.match(root, /path\.startsWith\('\/veluna'\)/);
assert.match(root, /path\.startsWith\('\/internal'\)/);
assert.match(root, /route = '\/veluna\/'/);
assert.match(root, /route = '\/internal\/'/);
assert.match(root, /audio\.pause\?\.\(\)/);
assert.match(root, /audio\.removeAttribute\?\.\('src'\)/);
assert.match(root, /window\.location\.replace\(target\.toString\(\)\)/);
assert.match(root, /legacy-github-pages-player-owner/);

console.log('SYSTEM MEDIA CANONICAL LAUNCH GUARD PASS');
