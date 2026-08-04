import fs from 'node:fs';

const files = ['index.html', 'public/index.html'];
const oldBlock = `  function bindStreamSwitch(app){
    qa('#mffStreamSwitch .mff-stream-btn',app).forEach(function(btn){
      if(btn.__mffStreamBound)return;
      btn.__mffStreamBound=true;
      var fn=function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        setManualStreamTarget(btn.getAttribute('data-stream-target')||'main');
      };
      btn.addEventListener('click',fn,{capture:true});
      btn.addEventListener('touchend',fn,{passive:false,capture:true});
    });
    updateStreamSwitchButtons();
  }`;
const newBlock = `  function bindStreamSwitch(app){
    qa('#mffStreamSwitch .mff-stream-btn',app).forEach(function(btn){
      if(btn.__mffStreamBound)return;
      btn.__mffStreamBound=true;
      var lastStreamSwitchTouchAt=0;
      var fn=function(ev){
        if(ev.type==='touchend') lastStreamSwitchTouchAt=Date.now();
        else if(ev.type==='click' && Date.now()-lastStreamSwitchTouchAt<700){ev.preventDefault();ev.stopPropagation();return;}
        ev.preventDefault();
        ev.stopPropagation();
        setManualStreamTarget(btn.getAttribute('data-stream-target')||'main');
      };
      btn.addEventListener('click',fn,{capture:true});
      btn.addEventListener('touchend',fn,{passive:false,capture:true});
    });
    updateStreamSwitchButtons();
  }`;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const matches = src.split(oldBlock).length - 1;
  if (matches !== 1) throw new Error(`${file}: expected exactly one legacy stream-switch block, found ${matches}`);
  fs.writeFileSync(file, src.replace(oldBlock, newBlock));
}

fs.writeFileSync('tests/mobile-stream-switch-dedupe.test.mjs', `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n\nconst root=fs.readFileSync('index.html','utf8');\nconst mirror=fs.readFileSync('public/index.html','utf8');\n\ntest('root and public remain byte-identical',()=>assert.equal(root,mirror));\nfor(const [name,src] of [['index.html',root],['public/index.html',mirror]]){\n  test(name+': mobile stream switch suppresses synthetic click',()=>{\n    assert.match(src,/var lastStreamSwitchTouchAt=0;/);\n    assert.match(src,/Date\\.now\\(\\)-lastStreamSwitchTouchAt<700/);\n    assert.match(src,/if\\(ev\\.type==='touchend'\\) lastStreamSwitchTouchAt=Date\\.now\\(\\);/);\n    assert.match(src,/setManualStreamTarget\\(btn\\.getAttribute\\('data-stream-target'\\)\\|\\|'main'\\);/);\n    assert.match(src,/if\\(canonical && typeof canonical\\.click==='function'\\) canonical\\.click\\(\\);/);\n    assert.doesNotMatch(src,/btn\\.__mffStreamBound=true;\\n      var fn=function\\(ev\\)\\{\\n        ev\\.preventDefault/);\n  });\n}\n`);
