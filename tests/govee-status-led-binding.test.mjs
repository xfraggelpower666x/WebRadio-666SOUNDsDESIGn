import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/system-extra/govee/govee-scene-sync.js','utf8');
const mirror=fs.readFileSync('public/js/system-extra/govee/govee-scene-sync.js','utf8');
const status=fs.readFileSync('js/shared-status.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const publicHtml=fs.readFileSync('public/index.html','utf8');

test('Govee scene sync remains mirrored',()=>assert.equal(root,mirror));
test('player root mirror remains intact',()=>assert.equal(html,publicHtml));
test('existing GOV chip is bound to runtime state',()=>{
  assert.match(html,/id="statusGovee"/);
  assert.match(root,/applyStatusChip/);
  assert.match(root,/document\.getElementById\("statusGovee"\)/);
  assert.match(root,/state === "connecting" \? "warn"/);
  assert.match(root,/state === "disabled" \? "off"/);
  assert.match(root,/s666:govee-state/);
});
test('shared status semantics cover Govee states',()=>{
  assert.match(status,/\['online', 'state-main'\]/);
  assert.match(status,/\['offline', 'state-error'\]/);
  assert.match(status,/\['warn', 'state-warn'\]/);
  assert.match(status,/\['off', 'state-off'\]/);
});
test('Govee still does not create a second audio graph',()=>{
  assert.match(root,/window\.__MeterBus/);
  assert.doesNotMatch(root,/AudioContext|createMediaElementSource|createAnalyser/);
});
