import fs from 'node:fs';

const paths = ['js/messenger-overlay.js', 'public/js/messenger-overlay.js'];
for (const path of paths) {
  let text = fs.readFileSync(path, 'utf8');
  text = text.replace(
    "      '.s666msg-trigger{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:34px;padding:5px 12px;border-radius:8px;border:1px solid rgba(22,139,255,.5);background:rgba(7,11,28,.85);color:#168bff;font:900 10px/1 \"Courier New\",monospace;letter-spacing:.04em;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}',",
    "      '.s666msg-trigger{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:34px;padding:5px 12px;border-radius:8px;border:1px solid rgba(22,139,255,.5);background:rgba(7,11,28,.85);color:#168bff;font:900 10px/1 \"Courier New\",monospace;letter-spacing:.04em;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}',\n      'body[data-veluna-page=\"veluna\"] #actionBar #s666MessageControlButton{min-height:20px;padding:2px 7px;margin-left:auto;flex:0 0 auto;border-radius:8px;font-size:9px;line-height:1}',"
  );
  const oldTarget = `  function desiredTarget() {\n    if (window.innerWidth <= 760) {\n      return document.getElementById('s666StageMobileActions') || document.getElementById('s666MobileExtraRow') || document.querySelector('#mffApp .mff-discord-slot') || document.querySelector('.tool-strip');\n    }\n    return document.querySelector('.player-shell .bottom-console .control-toolbar') || document.getElementById('s666MessageActionSlot') || document.querySelector('.tool-strip');\n  }`;
  const newTarget = `  function desiredTarget() {\n    var velunaActionBar = document.body && document.body.getAttribute('data-veluna-page') === 'veluna' ? document.getElementById('actionBar') : null;\n    if (velunaActionBar) return velunaActionBar;\n    if (window.innerWidth <= 760) {\n      return document.getElementById('s666StageMobileActions') || document.getElementById('s666MobileExtraRow') || document.querySelector('#mffApp .mff-discord-slot');\n    }\n    return document.querySelector('.player-shell .bottom-console .control-toolbar') || document.getElementById('s666MessageActionSlot');\n  }`;
  if (!text.includes(oldTarget) && !text.includes(newTarget)) throw new Error(`target block not found: ${path}`);
  text = text.replace(oldTarget, newTarget);
  text = text.replace("      button.textContent = 'MESSAGE';", "      button.textContent = document.body && document.body.getAttribute('data-veluna-page') === 'veluna' ? 'MSG' : 'MESSAGE';");
  fs.writeFileSync(path, text, 'utf8');
}

const testPath = 'tests/player-alert-global-backend-repair.test.mjs';
let test = fs.readFileSync(testPath, 'utf8');
test = test.replace(
  "test('shared Messenger can mount in the VELUNA tool strip on mobile and desktop', () => {\n  assert.match(messenger, /document\\.querySelector\\('\\.tool-strip'\\)/);\n  assert.equal(messengerMirror, messenger);\n});",
  "test('shared Messenger mounts in the existing VELUNA action bar without adding a player-control row', () => {\n  assert.match(messenger, /data-veluna-page/);\n  assert.match(messenger, /document\\.getElementById\\('actionBar'\\)/);\n  assert.match(messenger, /\\? 'MSG' : 'MESSAGE'/);\n  assert.doesNotMatch(messenger, /document\\.querySelector\\('\\.tool-strip'\\)/);\n  assert.equal(messengerMirror, messenger);\n});"
);
fs.writeFileSync(testPath, test, 'utf8');

if (fs.readFileSync(paths[0], 'utf8') !== fs.readFileSync(paths[1], 'utf8')) throw new Error('messenger mirrors diverged');
console.log('VELUNA Messenger target refined without creating an extra tool-strip row.');
