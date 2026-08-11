import fs from 'node:fs';

const paths = ['js/messenger-overlay.js', 'public/js/messenger-overlay.js'];
for (const path of paths) {
  let text = fs.readFileSync(path, 'utf8');
  text = text.replace("\n      'body[data-veluna-page=\"veluna\"] #actionBar #s666MessageControlButton{min-height:20px;padding:2px 7px;margin-left:auto;flex:0 0 auto;border-radius:8px;font-size:9px;line-height:1}',", '');

  const currentTarget = `  function desiredTarget() {\n    var velunaActionBar = document.body && document.body.getAttribute('data-veluna-page') === 'veluna' ? document.getElementById('actionBar') : null;\n    if (velunaActionBar) return velunaActionBar;\n    if (window.innerWidth <= 760) {\n      return document.getElementById('s666StageMobileActions') || document.getElementById('s666MobileExtraRow') || document.querySelector('#mffApp .mff-discord-slot');\n    }\n    return document.querySelector('.player-shell .bottom-console .control-toolbar') || document.getElementById('s666MessageActionSlot');\n  }`;
  const originalTarget = `  function desiredTarget() {\n    if (window.innerWidth <= 760) {\n      return document.getElementById('s666StageMobileActions') || document.getElementById('s666MobileExtraRow') || document.querySelector('#mffApp .mff-discord-slot');\n    }\n    return document.querySelector('.player-shell .bottom-console .control-toolbar') || document.getElementById('s666MessageActionSlot');\n  }`;
  if (!text.includes(currentTarget) && !text.includes(originalTarget)) throw new Error(`target block missing: ${path}`);
  text = text.replace(currentTarget, originalTarget);

  const mountNeedle = `  function mountTrigger() {\n    var target = desiredTarget();`;
  const mountReplacement = `  function mountTrigger() {\n    if (document.body && document.body.getAttribute('data-veluna-page') === 'veluna') {\n      return Boolean(document.getElementById('s666VelunaMessageButton'));\n    }\n    var target = desiredTarget();`;
  if (!text.includes(mountNeedle) && !text.includes(mountReplacement)) throw new Error(`mount block missing: ${path}`);
  text = text.replace(mountNeedle, mountReplacement);
  text = text.replace("      button.textContent = document.body && document.body.getAttribute('data-veluna-page') === 'veluna' ? 'MSG' : 'MESSAGE';", "      button.textContent = 'MESSAGE';");
  fs.writeFileSync(path, text, 'utf8');
}

const testPath = 'tests/player-alert-global-backend-repair.test.mjs';
let test = fs.readFileSync(testPath, 'utf8');
const oldTest = `test('shared Messenger mounts in the existing VELUNA action bar without adding a player-control row', () => {\n  assert.match(messenger, /data-veluna-page/);\n  assert.match(messenger, /document\\.getElementById\\('actionBar'\\)/);\n  assert.match(messenger, /\\? 'MSG' : 'MESSAGE'/);\n  assert.doesNotMatch(messenger, /document\\.querySelector\\('\\.tool-strip'\\)/);\n  assert.equal(messengerMirror, messenger);\n});`;
const newTest = `test('shared Messenger adopts the existing VELUNA MSG trigger instead of creating a duplicate control', () => {\n  assert.match(messenger, /data-veluna-page/);\n  assert.match(messenger, /document\\.getElementById\\('s666VelunaMessageButton'\\)/);\n  assert.doesNotMatch(messenger, /document\\.getElementById\\('actionBar'\\)/);\n  assert.doesNotMatch(messenger, /document\\.querySelector\\('\\.tool-strip'\\)/);\n  assert.equal(messengerMirror, messenger);\n});`;
if (!test.includes(oldTest) && !test.includes(newTest)) throw new Error('VELUNA Messenger regression test block missing');
test = test.replace(oldTest, newTest);
fs.writeFileSync(testPath, test, 'utf8');

if (fs.readFileSync(paths[0], 'utf8') !== fs.readFileSync(paths[1], 'utf8')) throw new Error('messenger mirrors diverged');
console.log('Shared Messenger now reuses the existing VELUNA MSG trigger without creating a duplicate.');
