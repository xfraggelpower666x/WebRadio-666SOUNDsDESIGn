import fs from 'node:fs';

const files = ['index.html', 'public/index.html'];

const legacyBindBlock = `  function bindHistoryModalV17(app){
    var hbtn=q('.mff-history',app);
    if(hbtn && !hbtn.__mffHistoryBound){
      hbtn.__mffHistoryBound=true;
      hbtn.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();toggleHistory();},{capture:true});
      hbtn.addEventListener('touchend',function(ev){ev.preventDefault();ev.stopPropagation();toggleHistory();},{passive:false,capture:true});
    }
    qa('[data-mff-history-close]',app).forEach(function(el){
      if(el.__mffHistoryCloseBound)return;
      el.__mffHistoryCloseBound=true;
      el.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();toggleHistory(false);},{capture:true});
      el.addEventListener('touchend',function(ev){ev.preventDefault();ev.stopPropagation();toggleHistory(false);},{passive:false,capture:true});
    });
  }`;

const repairedBindBlock = `  function bindHistoryModalV17(app){
    var hbtn=q('.mff-history',app);
    if(hbtn && !hbtn.__mffHistoryBound){
      hbtn.__mffHistoryBound=true;
      var lastHistoryTouchAt=0;
      var toggleHistoryHandler=function(ev){
        if(ev.type==='touchend') lastHistoryTouchAt=Date.now();
        else if(ev.type==='click' && Date.now()-lastHistoryTouchAt<700){ev.preventDefault();ev.stopPropagation();return;}
        ev.preventDefault();
        ev.stopPropagation();
        toggleHistory();
      };
      hbtn.addEventListener('click',toggleHistoryHandler,{capture:true});
      hbtn.addEventListener('touchend',toggleHistoryHandler,{passive:false,capture:true});
    }
    qa('[data-mff-history-close]',app).forEach(function(el){
      if(el.__mffHistoryCloseBound)return;
      el.__mffHistoryCloseBound=true;
      var lastHistoryCloseTouchAt=0;
      var closeHistoryHandler=function(ev){
        if(ev.type==='touchend') lastHistoryCloseTouchAt=Date.now();
        else if(ev.type==='click' && Date.now()-lastHistoryCloseTouchAt<700){ev.preventDefault();ev.stopPropagation();return;}
        ev.preventDefault();
        ev.stopPropagation();
        toggleHistory(false);
      };
      el.addEventListener('click',closeHistoryHandler,{capture:true});
      el.addEventListener('touchend',closeHistoryHandler,{passive:false,capture:true});
    });
  }`;

const duplicateBuildBindings = `    var hbtn=q('.mff-history',app);
    if(hbtn){
      hbtn.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();toggleHistory();},{capture:true});
      hbtn.addEventListener('touchend',function(ev){ev.preventDefault();ev.stopPropagation();toggleHistory();},{passive:false,capture:true});
    }
    var hback=q('#mffHistoryBackdrop',app);
    if(hback){
      hback.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();toggleHistory(false);},{capture:true});
      hback.addEventListener('touchend',function(ev){ev.preventDefault();ev.stopPropagation();toggleHistory(false);},{passive:false,capture:true});
    }

    var hclose=q('[data-mff-history-close]',app);
    if(hclose){
      hclose.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();toggleHistory(false);},{capture:true});
      hclose.addEventListener('touchend',function(ev){ev.preventDefault();ev.stopPropagation();toggleHistory(false);},{passive:false,capture:true});
    }

`;

const repairGateOld = `    if(!btn || !overlay) return;
    function setOpen(open){`;
const repairGateNew = `    if(!btn || !overlay) return;
    if(btn.__mffHistoryBound) return;
    function setOpen(open){`;

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes(legacyBindBlock)) throw new Error(`${file}: legacy bindHistoryModalV17 block not found`);
  if (!src.includes(duplicateBuildBindings)) throw new Error(`${file}: duplicate buildApp history bindings not found`);
  if (!src.includes(repairGateOld)) throw new Error(`${file}: repairHistoryButton gate not found`);

  src = src.replace(legacyBindBlock, repairedBindBlock);
  src = src.replace(duplicateBuildBindings, '');
  src = src.replace(repairGateOld, repairGateNew);
  fs.writeFileSync(file, src);
}

fs.writeFileSync('tests/mobile-history-single-bind.test.mjs', `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n\nconst root = fs.readFileSync('index.html', 'utf8');\nconst mirror = fs.readFileSync('public/index.html', 'utf8');\n\ntest('root and public player remain byte-identical', () => {\n  assert.equal(root, mirror);\n});\n\nfor (const [name, src] of [['index.html', root], ['public/index.html', mirror]]) {\n  test(name + ': one authoritative history binding with touch-click dedupe', () => {\n    assert.match(src, /var lastHistoryTouchAt=0;/);\n    assert.match(src, /Date\\.now\\(\\)-lastHistoryTouchAt<700/);\n    assert.match(src, /var lastHistoryCloseTouchAt=0;/);\n    assert.match(src, /Date\\.now\\(\\)-lastHistoryCloseTouchAt<700/);\n    assert.match(src, /if\\(btn\\.__mffHistoryBound\\) return;/);\n    assert.doesNotMatch(src, /var hback=q\\('#mffHistoryBackdrop',app\\);/);\n    assert.doesNotMatch(src, /hbtn\\.addEventListener\\('click',function\\(ev\\)\\{ev\\.preventDefault\\(\\);ev\\.stopPropagation\\(\\);toggleHistory\\(\\);/);\n  });\n}\n`);
