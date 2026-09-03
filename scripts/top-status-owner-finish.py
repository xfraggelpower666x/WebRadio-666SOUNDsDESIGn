from pathlib import Path

hide = '.systempanel-left #statusStream,.systempanel-left #statusMeter,.systempanel-left #statusSource{display:none!important}'
for name in ['css/phase10-stability-iphone-panel-hud.css', 'public/css/phase10-stability-iphone-panel-hud.css']:
    p = Path(name)
    text = p.read_text(encoding='utf-8').replace(hide, '')
    if hide in text:
        raise SystemExit(f'{name}: stale visibility hardlock remains')
    p.write_text(text, encoding='utf-8')

block = '          var mainBtn = qs("#mainBtn");\n          var fbBtn = qs("#fallbackBtn") || qs("#backupBtn");\n          if(mainBtn) mainBtn.classList.add("is-active");\n          if(fbBtn) fbBtn.classList.remove("is-active");\n'
for name in ['js/phase10-stability-iphone-panel-hud.js', 'public/js/phase10-stability-iphone-panel-hud.js']:
    p = Path(name)
    text = p.read_text(encoding='utf-8')
    count = text.count(block)
    if count != 1:
        raise SystemExit(f'{name}: expected one legacy H/B writer, found {count}')
    text = text.replace(block, '')
    if 'mainBtn.classList.add("is-active")' in text or 'fbBtn.classList.remove("is-active")' in text:
        raise SystemExit(f'{name}: legacy H/B writer remains')
    p.write_text(text, encoding='utf-8')

for name in ['index.html', 'public/index.html']:
    p = Path(name)
    text = p.read_text(encoding='utf-8')
    replacements = {
        '/css/phase10-stability-iphone-panel-hud.css?v=2026-06-15-fix1': '/css/phase10-stability-iphone-panel-hud.css?v=2026-09-03-top-panel-owner-v1',
        '/js/phase10-stability-iphone-panel-hud.js?v=2026-07-12-veluna16': '/js/phase10-stability-iphone-panel-hud.js?v=2026-09-03-top-panel-owner-v1',
    }
    for old, new in replacements.items():
        if text.count(old) != 1:
            raise SystemExit(f'{name}: cache identity {old} count={text.count(old)}')
        text = text.replace(old, new)
    p.write_text(text, encoding='utf-8')

Path('tests/top-system-panel-visibility-runtime.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync('css/phase10-stability-iphone-panel-hud.css','utf8');
const cssPublic=fs.readFileSync('public/css/phase10-stability-iphone-panel-hud.css','utf8');
const phase10=fs.readFileSync('js/phase10-stability-iphone-panel-hud.js','utf8');
const phase10Public=fs.readFileSync('public/js/phase10-stability-iphone-panel-hud.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const htmlPublic=fs.readFileSync('public/index.html','utf8');

test('top panel ownership survives Phase10 boot',()=>{
  assert.equal(cssPublic,css);
  assert.equal(phase10Public,phase10);
  assert.equal(htmlPublic,html);
  assert.ok(!css.includes('.systempanel-left #statusStream,.systempanel-left #statusMeter,.systempanel-left #statusSource{display:none!important}'));
  for(const id of ['statusStream','statusSource','statusMeter']) assert.ok(html.includes('id="'+id+'"'));
  assert.ok(!phase10.includes('mainBtn.classList.add("is-active")'));
  assert.ok(!phase10.includes('fbBtn.classList.remove("is-active")'));
  assert.ok(html.includes('phase10-stability-iphone-panel-hud.css?v=2026-09-03-top-panel-owner-v1'));
  assert.ok(html.includes('phase10-stability-iphone-panel-hud.js?v=2026-09-03-top-panel-owner-v1'));
});
''', encoding='utf-8')
