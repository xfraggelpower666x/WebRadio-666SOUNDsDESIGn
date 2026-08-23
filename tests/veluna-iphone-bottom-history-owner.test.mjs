import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const theme=read('css/veluna-theme.css');
const bootstrap=read('config/veluna-assets.js');
const html=read('veluna/index.html');

test('VELUNA mirrors and theme mirrors remain byte-identical',()=>{
  for(const p of ['VELUNA/index.html','public/veluna/index.html','public/VELUNA/index.html']) assert.equal(read(p),html,p);
  assert.equal(read('public/css/veluna-theme.css'),theme);
});

test('mobile generic fullscreen owner no longer captures history overlay',()=>{
  assert.match(theme,/:is\(\.overlay,\.panel-overlay,\.admin-overlay\)\{position:fixed!important;inset:0!important/);
  assert.doesNotMatch(theme,/:is\([^)]*\.history-overlay[^)]*\)\{position:fixed!important;inset:0!important/);
});

test('VELUNA history has its own safe-area fixed owner and internal scroll',()=>{
  assert.match(theme,/body\[data-veluna-page="veluna"\] \.history-overlay\{[^}]*position:fixed!important;[^}]*top:max\(104px,calc\(env\(safe-area-inset-top\) \+ 88px\)\)!important;[^}]*bottom:max\(18px,calc\(env\(safe-area-inset-bottom\) \+ 18px\)\)!important;[^}]*display:flex!important;[^}]*flex-direction:column!important/);
  assert.match(theme,/body\[data-veluna-page="veluna"\] \.history-overlay\.hidden\{display:none!important\}/);
  assert.match(theme,/body\[data-veluna-page="veluna"\] \.history-list\{[^}]*flex:1 1 auto!important;[^}]*overflow-y:auto!important;[^}]*-webkit-overflow-scrolling:touch!important/);
});

test('existing history toggle becomes reachable CLOSE control while overlay is active',()=>{
  assert.match(html,/id="historyToggle" class="tiny-btn" type="button">HISTORY<\/button>/);
  assert.match(theme,/body\[data-veluna-page="veluna"\] #historyToggle\.is-active\{[^}]*position:fixed!important;[^}]*z-index:2147483700!important;[^}]*min-width:92px!important;[^}]*font-size:0!important/);
  assert.match(theme,/body\[data-veluna-page="veluna"\] #historyToggle\.is-active::after\{content:"CLOSE"/);
});

test('iPhone bottom rows reserve space for action levelmeter and footer',()=>{
  assert.match(theme,/grid-template-rows:auto auto auto minmax\(56px,1fr\) auto auto auto auto auto auto auto!important/);
  assert.match(theme,/padding-bottom:max\(10px,calc\(env\(safe-area-inset-bottom\) \+ 6px\)\)!important/);
  assert.match(theme,/body\[data-veluna-page="veluna"\] \.levelmeter\{height:24px!important;min-height:24px!important;max-height:24px!important/);
  assert.match(theme,/body\[data-veluna-page="veluna"\] \.footer\{min-height:18px!important;line-height:18px!important;margin-bottom:0!important/);
});

test('bootstrap refreshes the existing VELUNA theme with a dedicated cache identity',()=>{
  assert.match(bootstrap,/velunaThemeVersion = '2026-08-23-iphone-bottom-history-owner-v1'/);
  assert.match(bootstrap,/existingVelunaTheme = document\.querySelector\('link\[href\*="\/css\/veluna-theme\.css"\]'\)/);
  assert.match(bootstrap,/existingVelunaTheme\.href = `\/css\/veluna-theme\.css\?v=\$\{velunaThemeVersion\}`/);
});
