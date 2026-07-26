from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


root = Path('.')
css_files = [p for p in root.rglob('*.css') if '.git' not in p.parts]

main_targets = [p for p in css_files if '#mffApp .mff-shell' in p.read_text(encoding='utf-8', errors='ignore') and 'v98SafeResyncCss' in p.read_text(encoding='utf-8', errors='ignore')]
if {p.as_posix() for p in main_targets} != {'css/mobile-patches.css', 'public/css/mobile-patches.css'}:
    raise SystemExit(f'unexpected main mobile targets: {[p.as_posix() for p in main_targets]}')

for path in main_targets:
    text = path.read_text(encoding='utf-8')
    text = replace_once(text, '    padding:39px 0 5px 0!important;\n    gap:6px!important;\n    overflow:hidden!important;\n    justify-content:center!important;', '    padding:27px 0 5px 0!important;\n    gap:5px!important;\n    overflow:hidden!important;\n    justify-content:flex-start!important;', f'{path} shell flow')
    text = replace_once(text, '#mffApp .mff-now{min-height:96px!important;height:96px!important;padding:9px!important;border-radius:20px!important;grid-template-columns:58px minmax(0,1fr) 60px!important;gap:7px!important;}', '#mffApp .mff-now{min-height:92px!important;height:92px!important;padding:8px!important;border-radius:20px!important;grid-template-columns:62px minmax(0,1fr) 58px!important;gap:7px!important;}', f'{path} now playing geometry')
    text = replace_once(text, '#mffApp .mff-symbol{width:56px!important;height:56px!important;border-radius:15px!important;}', '#mffApp .mff-symbol{width:62px!important;height:62px!important;border-radius:15px!important;overflow:hidden!important;}', f'{path} artwork frame')
    text = replace_once(text, '#mffApp .mff-eq{height:144px!important;min-height:144px!important;padding:10px!important;border-radius:18px!important;}', '#mffApp .mff-eq{height:138px!important;min-height:138px!important;padding:9px!important;border-radius:18px!important;}', f'{path} eq geometry')
    text = replace_once(text, '#mffApp .mff-eq-bars{height:92px!important;gap:4px!important;padding:8px 6px!important;border-radius:14px!important;}', '#mffApp .mff-eq-bars{height:88px!important;gap:4px!important;padding:7px 6px!important;border-radius:14px!important;}', f'{path} eq bars geometry')
    path.write_text(text, encoding='utf-8')

veluna_targets = []
for path in css_files:
    text = path.read_text(encoding='utf-8', errors='ignore')
    if 'html[data-veluna-fixed-viewport] body[data-veluna-page="veluna"] .player-card' in text and '.veluna-bottom-brand' in text:
        veluna_targets.append(path)

expected_veluna = {'css/veluna-theme.css', 'public/css/veluna-theme.css'}
if {p.as_posix() for p in veluna_targets} != expected_veluna:
    raise SystemExit(f'unexpected veluna targets: {[p.as_posix() for p in veluna_targets]}')

for path in veluna_targets:
    text = path.read_text(encoding='utf-8')
    text = replace_once(
        text,
        'html[data-veluna-fixed-viewport] body[data-veluna-page="veluna"] .player-card,html[data-veluna-fixed-viewport] body[data-veluna-page="internal"] .player-card{position:absolute!important;inset:4px!important;',
        'html[data-veluna-fixed-viewport] body[data-veluna-page="veluna"] .player-card,html[data-veluna-fixed-viewport] body[data-veluna-page="internal"] .player-card{position:absolute!important;top:max(4px,env(safe-area-inset-top))!important;right:max(4px,env(safe-area-inset-right))!important;bottom:max(4px,env(safe-area-inset-bottom))!important;left:max(4px,env(safe-area-inset-left))!important;',
        f'{path} safe-area card inset',
    )
    text = replace_once(
        text,
        'body[data-veluna-page="veluna"] .veluna-bottom-brand{display:block!important;align-self:stretch!important;justify-self:center!important;width:auto!important;height:100%!important;min-width:0!important;min-height:0!important;max-width:96%!important;max-height:none!important;object-fit:contain!important;margin:0 auto!important}',
        'body[data-veluna-page="veluna"] .veluna-bottom-brand{display:block!important;align-self:center!important;justify-self:center!important;width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;max-width:96%!important;max-height:clamp(34px,7dvh,58px)!important;object-fit:contain!important;margin:0 auto!important}',
        f'{path} bottom brand bounds',
    )
    path.write_text(text, encoding='utf-8')

Path('tests/mobile-viewport-geometry-contract.test.mjs').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('main iPhone layout starts at the safe top and keeps artwork and EQ inside the viewport', async () => {
  const css = await read('css/mobile-patches.css');
  assert.match(css, /justify-content:flex-start!important/);
  assert.match(css, /grid-template-columns:62px minmax\(0,1fr\) 58px/);
  assert.match(css, /mff-symbol\{width:62px!important;height:62px/);
  assert.match(css, /mff-eq\{height:138px!important/);
  assert.equal(await read('public/css/mobile-patches.css'), css);
});

test('VELUNA fixed viewport respects all iPhone safe areas and bounds its bottom brand', async () => {
  const css = await read('css/veluna-theme.css');
  assert.match(css, /top:max\(4px,env\(safe-area-inset-top\)\)!important/);
  assert.match(css, /bottom:max\(4px,env\(safe-area-inset-bottom\)\)!important/);
  assert.doesNotMatch(css, /player-card\{position:absolute!important;inset:4px!important/);
  assert.match(css, /max-height:clamp\(34px,7dvh,58px\)!important/);
  assert.equal(await read('public/css/veluna-theme.css'), css);
});
""", encoding='utf-8')
