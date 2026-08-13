import fs from 'node:fs';
import assert from 'node:assert/strict';

const rootManifest = JSON.parse(fs.readFileSync('site.webmanifest','utf8'));
const publicManifest = JSON.parse(fs.readFileSync('public/site.webmanifest','utf8'));
const boot = fs.readFileSync('js/central-boot-screen.js','utf8');
const bootMirror = fs.readFileSync('public/js/central-boot-screen.js','utf8');
const velunaManifest = JSON.parse(fs.readFileSync('veluna.webmanifest','utf8'));
const internalManifest = JSON.parse(fs.readFileSync('internal.webmanifest','utf8'));

assert.deepEqual(rootManifest, publicManifest, 'root/public manifests must stay identical');
assert.equal(rootManifest.id, '/');
assert.equal(rootManifest.start_url, '/');
assert.equal(rootManifest.scope, '/');
assert.ok(!JSON.stringify(rootManifest).includes('/assets/veluna/'), 'root manifest must not carry VELUNA artwork identity');
assert.ok(!(rootManifest.shortcuts || []).some(x => /veluna|internal/i.test(`${x.name||''} ${x.short_name||''} ${x.url||''}`)), 'root shortcuts must not claim VELUNA/Internal ownership');

assert.equal(boot, bootMirror, 'central boot/session owner mirror must stay identical');
assert.match(boot, /function mediaIdentity\(identity\)/);
assert.match(boot, /identity\.page==='veluna'/);
assert.match(boot, /identity\.page==='internal'/);
assert.match(boot, /RadioBotAI DJ/);
assert.match(boot, /phase10-new-header-logo\.png/);
assert.match(boot, /applyMediaIdentity/);

assert.equal(velunaManifest.start_url, '/veluna/');
assert.equal(internalManifest.start_url, '/internal/');

console.log('PLAYER MEDIA SESSION IDENTITY REGRESSION PASS');
