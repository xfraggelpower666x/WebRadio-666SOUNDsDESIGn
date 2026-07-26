from pathlib import Path

for name in ('index.html', 'public/index.html'):
    path = Path(name)
    text = path.read_text(encoding='utf-8')
    old = "  window.addEventListener('orientationchange',install,{passive:true});"
    new = "  window.addEventListener('orientationchange',function(){if(window.__S666VisualizerRefreshTargets){window.__S666VisualizerRefreshTargets();}},{passive:true});"
    if text.count(old) != 1:
        raise SystemExit(f'{name}: orientation installer count={text.count(old)}')
    text = text.replace(old, new, 1)
    path.write_text(text, encoding='utf-8')

if Path('index.html').read_bytes() != Path('public/index.html').read_bytes():
    raise SystemExit('index mirrors differ')

test_path = Path('tests/single-mobile-visual-writer-contract.test.mjs')
test = test_path.read_text(encoding='utf-8')
needle = "  assert.doesNotMatch(html, /addEventListener\\('resize',install/);\n"
addition = needle + "  assert.doesNotMatch(html, /addEventListener\\('orientationchange',install/);\n"
if needle not in test:
    raise SystemExit('test insertion point missing')
test_path.write_text(test.replace(needle, addition, 1), encoding='utf-8')
