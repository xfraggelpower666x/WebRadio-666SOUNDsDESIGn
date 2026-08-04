import fs from 'node:fs';

const files=['js/system-extra/govee/govee-scene-sync.js','public/js/system-extra/govee/govee-scene-sync.js'];
const oldImports=`import { GOVEE_SYNC_CONFIG } from "/js/system-extra/govee/govee-sync-config.js";
import { goveeSendAudio, goveeSetMode, goveeSetEnabled } from "/js/system-extra/govee/govee-bridge-client.js";`;
const newImports=`import { GOVEE_SYNC_CONFIG } from "/js/system-extra/govee/govee-sync-config.js";
import { goveeSendAudio, goveeSetMode, goveeSetEnabled } from "/js/system-extra/govee/govee-bridge-client.js";
import { applyStatusChip } from "/js/shared-status.js";`;

const oldPublish=`function publishState(state, error = "") {
  const root = document.documentElement;
  root?.setAttribute("data-govee-sync", state);
  if (error) root?.setAttribute("data-govee-error", String(error).slice(0, 160));
  else root?.removeAttribute("data-govee-error");
  try { window.dispatchEvent(new CustomEvent("s666:govee-state", { detail: { state, error } })); } catch (_) {}
}`;

const newPublish=`function publishState(state, error = "") {
  const root = document.documentElement;
  root?.setAttribute("data-govee-sync", state);
  if (error) root?.setAttribute("data-govee-error", String(error).slice(0, 160));
  else root?.removeAttribute("data-govee-error");

  const chip = document.getElementById("statusGovee");
  const ledState = state === "connecting" ? "warn" : state === "disabled" ? "off" : state;
  const labels = {
    online: "GOVEE / FX - lokale Bridge online",
    connecting: "GOVEE / FX - lokale Bridge wird verbunden",
    offline: "GOVEE / FX - lokale Bridge offline",
    disabled: "GOVEE / FX - Synchronisation deaktiviert",
    stopped: "GOVEE / FX - Synchronisation gestoppt"
  };
  applyStatusChip(chip, ledState, error ? labels[state] + ": " + String(error).slice(0, 100) : (labels[state] || "GOVEE / FX"));

  try { window.dispatchEvent(new CustomEvent("s666:govee-state", { detail: { state, error } })); } catch (_) {}
}`;

for(const file of files){
  let src=fs.readFileSync(file,'utf8');
  let count=src.split(oldImports).length-1;
  if(count!==1) throw new Error(`${file}: imports expected once, found ${count}`);
  src=src.replace(oldImports,newImports);
  count=src.split(oldPublish).length-1;
  if(count!==1) throw new Error(`${file}: publishState expected once, found ${count}`);
  src=src.replace(oldPublish,newPublish);
  fs.writeFileSync(file,src);
}

const test=`import test from 'node:test';
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
`;
fs.writeFileSync('tests/govee-status-led-binding.test.mjs',test);
