from pathlib import Path

css_files = [Path('css/player-patches.css'), Path('public/css/player-patches.css')]
js_files = [Path('js/equalizer.js'), Path('public/js/equalizer.js')]

old_eq = '''  .mff-eq-bars i{display:block!important;height:var(--h)!important;border-radius:8px 8px 3px 3px!important;background:linear-gradient(to top,var(--mff-cyan),#547bff 34%,#b744ff 58%,var(--mff-pink))!important;box-shadow:0 0 10px rgba(255,61,187,.18),0 0 10px rgba(22,255,243,.15)!important;animation:mffEqPulse 1.35s ease-in-out infinite alternate!important;animation-delay:var(--d)!important;}
  @keyframes mffEqPulse{from{height:calc(var(--h) * .72);}to{height:min(100%,calc(var(--h) * 1.12));}}'''
new_eq = '''  .mff-eq-bars i{display:block!important;height:100%!important;transform-origin:50% 100%!important;transform:scaleY(var(--eq-scale,.075))!important;border-radius:8px 8px 3px 3px!important;background:linear-gradient(to top,var(--mff-cyan),#547bff 34%,#b744ff 58%,var(--mff-pink))!important;box-shadow:0 0 10px rgba(255,61,187,.18),0 0 10px rgba(22,255,243,.15)!important;animation:none!important;}'''

old_bottom = '''  .mff-bottom-bars i{display:block!important;height:30px!important;border-radius:6px!important;background:linear-gradient(to top,var(--mff-cyan) 0%,var(--mff-cyan) 34%,#516dff 45%,var(--mff-purple) 66%,var(--mff-pink) 100%)!important;box-shadow:0 0 8px rgba(22,255,243,.28),0 0 8px rgba(255,61,187,.20)!important;opacity:calc(.46 + var(--mff-level) * .54)!important;transform:scaleY(calc(.48 + var(--mff-level) * .52))!important;animation:mffCenterOutPulse 1.05s ease-in-out infinite alternate!important;animation-delay:calc(var(--mff-center-distance,0) * 18ms)!important;}
  @keyframes mffCenterOutPulse{0%{transform:scaleY(calc(.42 + var(--mff-level) * .42));opacity:calc(.38 + var(--mff-level) * .46);}100%{transform:scaleY(calc(.62 + var(--mff-level) * .38));opacity:calc(.58 + var(--mff-level) * .42);}}'''
new_bottom = '''  .mff-bottom-bars i{display:block!important;height:30px!important;transform-origin:50% 50%!important;border-radius:6px!important;background:linear-gradient(to top,var(--mff-cyan) 0%,var(--mff-cyan) 34%,#516dff 45%,var(--mff-purple) 66%,var(--mff-pink) 100%)!important;box-shadow:0 0 8px rgba(22,255,243,.28),0 0 8px rgba(255,61,187,.20)!important;opacity:calc(.12 + var(--v,.04) * .88)!important;transform:scaleY(calc(.34 + var(--v,.04) * .74))!important;animation:none!important;}'''

for path in css_files:
    text = path.read_text(encoding='utf-8')
    if text.count(old_eq) != 1:
        raise SystemExit(f'{path}: EQ animation block count={text.count(old_eq)}')
    if text.count(old_bottom) != 1:
        raise SystemExit(f'{path}: bottom animation block count={text.count(old_bottom)}')
    text = text.replace(old_eq, new_eq, 1).replace(old_bottom, new_bottom, 1)
    path.write_text(text, encoding='utf-8')

needle = "  root.style.setProperty('--audio-level', safeLevel.toFixed(3));\n"
addition = needle + "  root.style.setProperty('--mff-level', safeLevel.toFixed(3));\n"
for path in js_files:
    text = path.read_text(encoding='utf-8')
    if text.count(needle) != 1:
        raise SystemExit(f'{path}: mobile level insertion count={text.count(needle)}')
    text = text.replace(needle, addition, 1)
    path.write_text(text, encoding='utf-8')

if css_files[0].read_bytes() != css_files[1].read_bytes():
    raise SystemExit('CSS mirrors differ')
if js_files[0].read_bytes() != js_files[1].read_bytes():
    raise SystemExit('JS mirrors differ')
