from pathlib import Path

FILES = [Path('index.html'), Path('public/index.html')]
OLD = """    var controls=q('.mff-controls',app);\n    var handler=function(ev){\n      var btn=ev.target.closest&&ev.target.closest('[data-mff]'); if(!btn)return;\n      ev.preventDefault(); ev.stopPropagation();\n      var c=btn.getAttribute('data-mff');\n      if(c==='play')play(); if(c==='pause')pause(); if(c==='stop')stop();\n      if(c==='reset'){flash('reset');stop();setTimeout(play,120)}\n      if(c==='down'){flash('down');boost(-1)}\n      if(c==='up'){flash('up');boost(1)}\n      if(c==='boost'){flash('boost');boost(1)}\n    };\n    controls.addEventListener('click',handler,{capture:true});\n    controls.addEventListener('touchend',handler,{passive:false,capture:true});\n"""
NEW = """    var controls=q('.mff-controls',app);\n    var mffLastControlTouchAt=0;\n    var handler=function(ev){\n      if(ev.type==='touchend') mffLastControlTouchAt=Date.now();\n      else if(ev.type==='click' && Date.now()-mffLastControlTouchAt<700) return;\n      var btn=ev.target.closest&&ev.target.closest('[data-mff]'); if(!btn)return;\n      ev.preventDefault(); ev.stopPropagation();\n      var c=btn.getAttribute('data-mff');\n      if(c==='play')play(); if(c==='pause')pause(); if(c==='stop')stop();\n      if(c==='reset'){flash('reset');stop();setTimeout(play,120)}\n      if(c==='down'){flash('down');boost(-1)}\n      if(c==='up'){flash('up');boost(1)}\n      if(c==='boost'){flash('boost');boost(1)}\n    };\n    controls.addEventListener('click',handler,{capture:true});\n    controls.addEventListener('touchend',handler,{passive:false,capture:true});\n"""

for path in FILES:
    text = path.read_text(encoding='utf-8')
    if OLD not in text:
        raise SystemExit(f'expected control block not found in {path}')
    path.write_text(text.replace(OLD, NEW, 1), encoding='utf-8')

Path('tests/mobile-touch-dedupe.test.mjs').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

for (const file of ['index.html','public/index.html']) {
  const src = fs.readFileSync(file, 'utf8');
  test(`${file}: mobile transport suppresses synthetic click after touchend`, () => {
    assert.match(src, /mffLastControlTouchAt=0/);
    assert.match(src, /ev\.type==='touchend'\) mffLastControlTouchAt=Date\.now\(\)/);
    assert.match(src, /ev\.type==='click' && Date\.now\(\)-mffLastControlTouchAt<700/);
  });
}
""", encoding='utf-8')
