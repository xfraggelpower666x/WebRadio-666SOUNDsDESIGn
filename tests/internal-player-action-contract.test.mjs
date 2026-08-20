import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const worker = read('worker.js');
const workerMirror = read('workers/webradio-666soundsdesign-worker/worker.js');

test('internal player stays embedded in the canonical main Worker mirror', () => {
  assert.equal(workerMirror, worker);
  assert.match(worker, /<title>666SOUNDsDESIGn Radio — Internal<\/title>/);
  assert.match(worker, /data-veluna-page="internal"/);
});

test('internal player loads canonical admin, skip, messenger and Discord owners', () => {
  assert.match(worker, /<script src="\/js\/admin-auth-client\.js[^>]*><\/script>/);
  assert.match(worker, /<script src="\/js\/skip-control\.js[^>]*><\/script>/);
  assert.match(worker, /<script src="\/js\/player-alert-client\.js[^>]*><\/script>/);
  assert.match(worker, /<script src="\/js\/messenger-overlay\.js[^>]*><\/script>/);
  assert.match(worker, /<script src="\/js\/addons\/discord-player-addon-v3\.js[^>]*><\/script>/);
});

test('internal AutoDJ skip delegates to S666SkipControl with internal source', () => {
  assert.match(worker, /window\.S666SkipControl\.skip\(\{/);
  assert.match(worker, /source:\s*'internal-player'/);
  assert.doesNotMatch(worker, /fetch\(['"]\/api\/radio\/skip['"]/);
  assert.doesNotMatch(worker, /666-autodj-skip\.666soundsdesign-broadcaster\.com\/autodj\/skip/);
  assert.doesNotMatch(worker, /S666_AUTODJ_SKIP_ACCESS_TOKEN\s*=/);
});

test('internal action buttons remain wired for skip, Discord and messenger', () => {
  assert.match(worker, /id="skipBtn"[^>]*data-action="skip"/);
  assert.match(worker, /id="discordBtn"[^>]*data-action="discord"/);
  assert.match(worker, /id="internalMessageBtn"[^>]*data-action="message"/);
  assert.match(worker, /S666DiscordPlayerAddonV3/);
  assert.match(worker, /window\.S666Messenger/);
  assert.match(worker, /S666Messenger\.open/);
});
