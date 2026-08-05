import fs from 'node:fs';

const htmlFiles = ['veluna/index.html','VELUNA/index.html','public/veluna/index.html','public/VELUNA/index.html'];
const addonFiles = ['js/addons/discord-player-addon-v3.js','public/js/addons/discord-player-addon-v3.js'];

for (const file of htmlFiles) {
  let text = fs.readFileSync(file, 'utf8');
  const before = text;
  text = text.replaceAll("btn.classList.remove('is-busy', 'is-ok', 'is-error');", "btn.classList.remove('is-busy', 'is-ok', 'is-warn', 'is-error');");
  text = text.replaceAll("else if (detail.phase === 'success') btn.classList.add('is-ok');\n      else if (detail.phase === 'error') btn.classList.add('is-error');", "else if (detail.phase === 'success') btn.classList.add('is-ok');\n      else if (detail.phase === 'warning') btn.classList.add('is-warn');\n      else if (detail.phase === 'error') btn.classList.add('is-error');");
  if (text === before) throw new Error(`No Discord status listener patched in ${file}`);
  fs.writeFileSync(file, text);
}

for (const file of addonFiles) {
  let text = fs.readFileSync(file, 'utf8');
  const marker = "'.s666-discord-status.is-sending{color:#ffc857}.s666-discord-status.is-ok{color:#7edcff}.s666-discord-status.is-error{color:#ff5570}.s666-discord-status.is-warn{color:#ffc857}',";
  if (!text.includes(marker)) throw new Error(`Status style marker missing in ${file}`);
  text = text.replace(marker, marker + "\n      '#discordBtn.is-warn{border-color:rgba(255,200,87,.82)!important;color:#ffc857!important;box-shadow:0 0 14px rgba(255,200,87,.3)!important}',");
  fs.writeFileSync(file, text);
}

const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const htmlFiles=['veluna/index.html','VELUNA/index.html','public/veluna/index.html','public/VELUNA/index.html'];
const addonRoot=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const addonPublic=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord addon mirrors remain byte-identical',()=>assert.equal(addonRoot,addonPublic));
test('all Veluna mirrors consume warning state',()=>{
  const contents=htmlFiles.map(file=>fs.readFileSync(file,'utf8'));
  for(const text of contents){
    assert.ok(text.includes("btn.classList.remove('is-busy', 'is-ok', 'is-warn', 'is-error');"));
    assert.ok(text.includes("else if (detail.phase === 'warning') btn.classList.add('is-warn');"));
  }
  assert.equal(contents[0],contents[2]);
  assert.equal(contents[1],contents[3]);
});
test('warning class has a distinct visual state',()=>{
  assert.ok(addonRoot.includes('#discordBtn.is-warn'));
  assert.ok(addonRoot.includes('color:#ffc857!important'));
});
`;
fs.writeFileSync('tests/discord-blocks-500-1000-status-bridge.test.mjs', test);
