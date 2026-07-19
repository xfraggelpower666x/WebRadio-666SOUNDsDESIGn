from pathlib import Path
import re

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# 1) Shared VELUNA/Internal touch runtime.
# ---------------------------------------------------------------------------
ui = read('js/veluna-ui.js')
ui = replace_once(ui, '/* VELUNA Central UI Runtime v1.2.12 */', '/* VELUNA Central UI Runtime v1.2.25 */', 'VELUNA UI version')
ui_marker = '  function injectHeader(){'
ui_feedback = '''  function installTouchFeedback(){
    if (document.documentElement.dataset.velunaTouchFeedback === '1') return;
    document.documentElement.dataset.velunaTouchFeedback = '1';
    const selector = 'button,a[href],[role="button"],input[type="button"],input[type="submit"],.control-btn,.small-btn,.source-led-btn,.tiny-btn';
    let pressed = null;
    let releaseTimer = 0;

    const release = (delay = 0) => {
      clearTimeout(releaseTimer);
      const current = pressed;
      releaseTimer = window.setTimeout(() => {
        if (!current) return;
        current.classList.remove('is-pressed');
        current.removeAttribute('data-veluna-press');
        if (pressed === current) pressed = null;
      }, delay);
    };

    const press = (target, inputType) => {
      const control = target?.closest?.(selector);
      if (!control || !body.contains(control) || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
      if (pressed && pressed !== control) release(0);
      pressed = control;
      clearTimeout(releaseTimer);
      control.classList.add('is-pressed');
      control.setAttribute('data-veluna-press','1');
      try {
        window.dispatchEvent(new CustomEvent('veluna:button-feedback', { detail: {
          page,
          id: control.id || '',
          action: control.getAttribute('data-action') || control.textContent?.trim().slice(0,40) || '',
          input: inputType || 'pointer'
        }}));
      } catch (_) {}
    };

    document.addEventListener('pointerdown', event => press(event.target, event.pointerType || 'pointer'), { capture:true, passive:true });
    document.addEventListener('pointerup', () => release(150), { capture:true, passive:true });
    document.addEventListener('pointercancel', () => release(0), { capture:true, passive:true });
    document.addEventListener('touchend', () => release(170), { capture:true, passive:true });
    document.addEventListener('touchcancel', () => release(0), { capture:true, passive:true });
    document.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') press(event.target, 'keyboard');
    }, true);
    document.addEventListener('keyup', event => {
      if (event.key === 'Enter' || event.key === ' ') release(120);
    }, true);
    window.addEventListener('blur', () => release(0), { passive:true });
  }

'''
if 'function installTouchFeedback()' not in ui:
    ui = replace_once(ui, ui_marker, ui_feedback + ui_marker, 'VELUNA touch runtime insertion')
ui = replace_once(ui, '  injectHeader();', '  installTouchFeedback();\n  injectHeader();', 'VELUNA touch runtime activation')
write('js/veluna-ui.js', ui)
write('public/js/veluna-ui.js', ui)


# ---------------------------------------------------------------------------
# 2) Shared VELUNA/Internal visual authority.
# ---------------------------------------------------------------------------
theme = read('css/veluna-theme.css')
theme = replace_once(theme, 'VELUNA Central Player Theme v1.2.24', 'VELUNA Central Player Theme v1.2.25', 'VELUNA theme version')
css_anchor = '''body[data-veluna-ui] :is(button,.control-btn,.small-btn,.ghost-btn,.tiny-btn,.source-led-btn,.status-chip):is(:hover,:focus-visible,:active,.is-active,.is-pressed,.transport-active,[aria-pressed="true"],[data-state="active"],[data-active="1"]){border-color:rgba(180,92,255,.86)!important;box-shadow:var(--veluna-pink-glow)!important}
'''
css_feedback = css_anchor + '''body[data-veluna-ui] :is(button,a[href],[role="button"],.control-btn,.small-btn,.ghost-btn,.tiny-btn,.source-led-btn,.status-chip){
  transform-origin:center!important;
  transition:transform .08s ease,filter .08s ease,color .08s ease,background .08s ease,border-color .08s ease,box-shadow .08s ease!important;
  -webkit-user-select:none!important;user-select:none!important;
}
body[data-veluna-ui] :is(button,a[href],[role="button"],.control-btn,.small-btn,.ghost-btn,.tiny-btn,.source-led-btn,.status-chip):is(:active,.is-pressed,[data-veluna-press="1"]){
  transform:translateY(2px) scale(.955)!important;
  color:#fff!important;
  background:linear-gradient(135deg,rgba(180,92,255,.58),rgba(22,139,255,.42)),rgba(9,10,18,.98)!important;
  border-color:rgba(216,170,255,.98)!important;
  box-shadow:0 0 7px rgba(255,255,255,.82),0 0 22px rgba(180,92,255,.92),0 0 26px rgba(22,139,255,.64),inset 0 0 18px rgba(255,255,255,.13)!important;
  filter:brightness(1.34) saturate(1.24)!important;
}
body[data-veluna-ui] :is(.transport-active,.is-active,[aria-pressed="true"],[data-state="active"],[data-active="1"]):not(.is-pressed){
  color:var(--veluna-laser-blue-hot)!important;
  background:linear-gradient(135deg,rgba(180,92,255,.28),rgba(22,139,255,.24)),rgba(15,16,24,.98)!important;
}
body[data-veluna-ui] :is(button,a[href],[role="button"]):disabled{transform:none!important;filter:none!important;opacity:.48!important;pointer-events:none!important}
'''
theme = replace_once(theme, css_anchor, css_feedback, 'VELUNA strong touch CSS')
mobile_anchor = '''  body[data-veluna-page="veluna"] :is(.status-grid,.pill-row,.mini-grid,.source-switch,.control-strip,.tool-strip){gap:4px!important}
'''
mobile_grid = mobile_anchor + '''  body[data-veluna-page="veluna"] .tool-strip{grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-auto-flow:row!important}
  body[data-veluna-page="veluna"] .tool-strip > *{width:100%!important;min-width:0!important;max-width:none!important;overflow:hidden!important;text-overflow:ellipsis!important}
'''
theme = replace_once(theme, mobile_anchor, mobile_grid, 'VELUNA mobile toolbar grid')
write('css/veluna-theme.css', theme)
write('public/css/veluna-theme.css', theme)


# ---------------------------------------------------------------------------
# 3) Main player touch runtime.
# ---------------------------------------------------------------------------
stage = read('js/player-stage-v2.js')
stage = replace_once(stage, '666SOUNDsDESIGn Interior Layout V6 - shared auth + responsive calibration', '666SOUNDsDESIGn Interior Layout V7 - shared auth + global touch feedback', 'Main stage version')
stage_marker = '  function makeButton(id,label,action){'
stage_feedback = '''  function installTouchFeedback(){
    if(document.documentElement.dataset.s666StageTouchFeedback==='1')return;
    document.documentElement.dataset.s666StageTouchFeedback='1';
    var selector='#mffApp button,#mffApp a[href],.player-shell button,.player-shell a[href],.player-shell [role="button"]';
    var pressed=null,releaseTimer=0;
    function release(delay){
      clearTimeout(releaseTimer);
      var current=pressed;
      releaseTimer=setTimeout(function(){
        if(!current)return;
        current.classList.remove('is-pressed');
        current.removeAttribute('data-s666-press');
        if(pressed===current)pressed=null;
      },delay||0);
    }
    function press(target,input){
      var control=target&&target.closest?target.closest(selector):null;
      if(!control||control.disabled||control.getAttribute('aria-disabled')==='true')return;
      if(pressed&&pressed!==control)release(0);
      pressed=control;
      clearTimeout(releaseTimer);
      control.classList.add('is-pressed');
      control.setAttribute('data-s666-press','1');
      try{window.dispatchEvent(new CustomEvent('s666:button-feedback',{detail:{id:control.id||'',action:control.getAttribute('data-action')||String(control.textContent||'').trim().slice(0,40),input:input||'pointer'}}));}catch(_){ }
    }
    document.addEventListener('pointerdown',function(event){press(event.target,event.pointerType||'pointer');},{capture:true,passive:true});
    document.addEventListener('pointerup',function(){release(150);},{capture:true,passive:true});
    document.addEventListener('pointercancel',function(){release(0);},{capture:true,passive:true});
    document.addEventListener('touchend',function(){release(170);},{capture:true,passive:true});
    document.addEventListener('touchcancel',function(){release(0);},{capture:true,passive:true});
    document.addEventListener('keydown',function(event){if(event.key==='Enter'||event.key===' ')press(event.target,'keyboard');},true);
    document.addEventListener('keyup',function(event){if(event.key==='Enter'||event.key===' ')release(120);},true);
    window.addEventListener('blur',function(){release(0);},{passive:true});
  }

'''
if 'function installTouchFeedback()' not in stage:
    stage = replace_once(stage, stage_marker, stage_feedback + stage_marker, 'Main touch runtime insertion')
stage = replace_once(stage, '  function ensureSmallAdditions(){\n    ensureActionButtons();', '  function ensureSmallAdditions(){\n    installTouchFeedback();\n    ensureActionButtons();', 'Main touch runtime activation')
write('js/player-stage-v2.js', stage)
write('public/js/player-stage-v2.js', stage)


# ---------------------------------------------------------------------------
# 4) Main player visual authority.
# ---------------------------------------------------------------------------
stage_css = read('css/player-stage-v2.css')
stage_css = replace_once(stage_css, '666SOUNDsDESIGn Interior Layout V5 - EQ + NOW PLAYING + Ticker', '666SOUNDsDESIGn Interior Layout V6 - EQ + NOW PLAYING + Touch Feedback', 'Main stage CSS version')
main_css = '''
/* Shared Main-player touch authority: instant, visible and identical on mouse, keyboard and iPhone. */
body[data-veluna-page="main"] :is(button,a[href],[role="button"],.icon-btn){
  touch-action:manipulation!important;
  -webkit-tap-highlight-color:rgba(180,92,255,.32)!important;
  transform-origin:center!important;
  transition:transform .08s ease,filter .08s ease,color .08s ease,background .08s ease,border-color .08s ease,box-shadow .08s ease!important;
  -webkit-user-select:none!important;user-select:none!important;
}
body[data-veluna-page="main"] :is(button,a[href],[role="button"],.icon-btn):is(:active,.is-pressed,[data-s666-press="1"]){
  transform:translateY(2px) scale(.955)!important;
  color:#fff!important;
  background:linear-gradient(135deg,rgba(180,92,255,.58),rgba(22,139,255,.42)),rgba(5,8,20,.98)!important;
  border-color:rgba(216,170,255,.98)!important;
  box-shadow:0 0 7px rgba(255,255,255,.78),0 0 22px rgba(180,92,255,.88),0 0 24px rgba(22,139,255,.62),inset 0 0 18px rgba(255,255,255,.12)!important;
  filter:brightness(1.34) saturate(1.24)!important;
}
body[data-veluna-page="main"] :is(button,a[href],[role="button"],.icon-btn):is(.is-active,.transport-active,[aria-pressed="true"],[data-state="active"]):not(.is-pressed){
  color:#7edcff!important;
  border-color:rgba(180,92,255,.86)!important;
  background:linear-gradient(135deg,rgba(180,92,255,.26),rgba(22,139,255,.22)),rgba(5,8,20,.98)!important;
  box-shadow:0 0 5px rgba(126,220,255,.82),0 0 16px rgba(180,92,255,.58)!important;
}
body[data-veluna-page="main"] :is(button,a[href],[role="button"]):disabled{transform:none!important;filter:none!important;opacity:.48!important;pointer-events:none!important}

'''
if 'Shared Main-player touch authority' not in stage_css:
    stage_css = stage_css.replace('*/\n', '*/\n' + main_css, 1)
write('css/player-stage-v2.css', stage_css)
write('public/css/player-stage-v2.css', stage_css)


# ---------------------------------------------------------------------------
# 5) Cache ownership and mirrors.
# ---------------------------------------------------------------------------
veluna = read('veluna/index.html')
veluna = veluna.replace('/css/veluna-theme.css?v=2026-07-19-pc-fit-v1224', '/css/veluna-theme.css?v=2026-07-19-touch-feedback-v1225')
veluna = re.sub(r'/js/veluna-ui\.js\?v=[^"\s]+', '/js/veluna-ui.js?v=2026-07-19-touch-feedback-v1225', veluna)
for path in ['veluna/index.html','VELUNA/index.html','public/veluna/index.html','public/VELUNA/index.html']:
    write(path, veluna)

worker = read('worker.js')
worker = worker.replace('/css/veluna-theme.css?v=2026-07-19-pc-fit-v1224', '/css/veluna-theme.css?v=2026-07-19-touch-feedback-v1225')
worker = re.sub(r'/js/veluna-ui\.js\?v=[^"\s]+', '/js/veluna-ui.js?v=2026-07-19-touch-feedback-v1225', worker)
write('worker.js', worker)
write('workers/webradio-666soundsdesign-worker/worker.js', worker)

main = read('index.html')
main = re.sub(r'/css/player-stage-v2\.css\?v=[^"\s]+', '/css/player-stage-v2.css?v=2026-07-19-touch-feedback-v1', main)
main = re.sub(r'/js/player-stage-v2\.js\?v=[^"\s]+', '/js/player-stage-v2.js?v=2026-07-19-touch-feedback-v1', main)
write('index.html', main)
write('public/index.html', main)


# ---------------------------------------------------------------------------
# 6) Contracts.
# ---------------------------------------------------------------------------
tests = read('tests/frontend-contracts.test.mjs')
contract = '''

test("all player variants expose immediate touch feedback without overlay interception", async () => {
  const velunaUi = await read("js/veluna-ui.js");
  const velunaTheme = await read("css/veluna-theme.css");
  const stage = await read("js/player-stage-v2.js");
  const stageCss = await read("css/player-stage-v2.css");
  const veluna = await read("veluna/index.html");
  const main = await read("index.html");
  assert.match(velunaUi, /function installTouchFeedback\(\)/);
  assert.match(velunaUi, /pointerdown/);
  assert.match(velunaUi, /pointercancel/);
  assert.match(velunaUi, /data-veluna-press/);
  assert.match(velunaTheme, /translateY\(2px\) scale\(\.955\)/);
  assert.match(velunaTheme, /tool-strip\{grid-template-columns:repeat\(4/);
  assert.match(stage, /function installTouchFeedback\(\)/);
  assert.match(stage, /data-s666-press/);
  assert.match(stageCss, /Shared Main-player touch authority/);
  assert.match(stageCss, /translateY\(2px\) scale\(\.955\)/);
  assert.match(veluna, /veluna-theme\.css\?v=2026-07-19-touch-feedback-v1225/);
  assert.match(veluna, /veluna-ui\.js\?v=2026-07-19-touch-feedback-v1225/);
  assert.match(main, /player-stage-v2\.css\?v=2026-07-19-touch-feedback-v1/);
  assert.match(main, /player-stage-v2\.js\?v=2026-07-19-touch-feedback-v1/);
});
'''
if 'all player variants expose immediate touch feedback' not in tests:
    tests += contract
write('tests/frontend-contracts.test.mjs', tests)

worker_tests = read('tests/worker-smoke.test.mjs')
worker_contract = '''

test("Internal player loads the shared touch feedback authority", async () => {
  const internal = await request("/internal", { headers: { accept: "text/html" } });
  assert.equal(internal.status, 200);
  const html = await internal.text();
  assert.match(html, /veluna-theme\.css\?v=2026-07-19-touch-feedback-v1225/);
  assert.match(html, /veluna-ui\.js\?v=2026-07-19-touch-feedback-v1225/);
});
'''
if 'Internal player loads the shared touch feedback authority' not in worker_tests:
    worker_tests += worker_contract
write('tests/worker-smoke.test.mjs', worker_tests)


# Final mirror/marker gates.
checks = {
    'js/veluna-ui.js': ['VELUNA Central UI Runtime v1.2.25','function installTouchFeedback()','data-veluna-press'],
    'css/veluna-theme.css': ['VELUNA Central Player Theme v1.2.25','translateY(2px) scale(.955)','grid-template-columns:repeat(4'],
    'js/player-stage-v2.js': ['Interior Layout V7','function installTouchFeedback()','data-s666-press'],
    'css/player-stage-v2.css': ['Shared Main-player touch authority','translateY(2px) scale(.955)'],
    'veluna/index.html': ['touch-feedback-v1225'],
    'worker.js': ['touch-feedback-v1225'],
    'index.html': ['touch-feedback-v1'],
}
for path, markers in checks.items():
    text = read(path)
    for marker in markers:
        if marker not in text:
            raise SystemExit(f'{path}: missing {marker}')

for a,b in [
    ('js/veluna-ui.js','public/js/veluna-ui.js'),
    ('css/veluna-theme.css','public/css/veluna-theme.css'),
    ('js/player-stage-v2.js','public/js/player-stage-v2.js'),
    ('css/player-stage-v2.css','public/css/player-stage-v2.css'),
    ('index.html','public/index.html'),
    ('worker.js','workers/webradio-666soundsdesign-worker/worker.js'),
    ('veluna/index.html','VELUNA/index.html'),
    ('veluna/index.html','public/veluna/index.html'),
    ('veluna/index.html','public/VELUNA/index.html'),
]:
    if read(a) != read(b):
        raise SystemExit(f'mirror mismatch: {a} != {b}')

print('global player touch feedback repair applied')
