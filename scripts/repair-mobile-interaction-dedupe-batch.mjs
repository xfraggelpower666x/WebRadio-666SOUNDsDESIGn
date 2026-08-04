import fs from 'node:fs';

const files=['index.html','public/index.html'];

const replacements=[
  {
    name:'transport feedback',
    old:`  function bindTransportHardFeedback(app){
    if(app.__mffTransportHardFeedbackBound) return;
    app.__mffTransportHardFeedbackBound=true;

    function detectRole(btn){
      if(!btn) return '';
      var a=btn.getAttribute('data-action')||btn.getAttribute('data-mff-action')||'';
      if(/^(play|start|stream-play|transport-play)$/.test(a)) return 'play';
      if(/^(pause|stream-pause|transport-pause)$/.test(a)) return 'pause';
      if(/^(stop|stream-stop|transport-stop)$/.test(a)) return 'stop';
      var t=String(btn.textContent||btn.getAttribute('aria-label')||btn.title||'').trim().toLowerCase();
      if(/▶|►|play/.test(t)) return 'play';
      if(/pause|⏸|Ⅱ|\\|\\|/.test(t)) return 'pause';
      if(/stop|■|▪|square/.test(t)) return 'stop';
      return '';
    }

    function onTransportTap(ev){
      var btn=ev.target&&ev.target.closest?ev.target.closest('button,.mff-control,[data-action],[data-mff-action]'):null;
      if(!btn || !app.contains(btn)) return;
      var role=detectRole(btn);
      if(!role) return;

      // Nur visuelles Feedback hart setzen. Audio-Logik bleibt bei bestehenden Handlern.
      if(role==='play'){
        applyTransportVisualState('play');
      }else if(role==='pause'){
        applyTransportVisualState('pause');
      }else if(role==='stop'){
        applyTransportVisualState('stop');
      }
    }

    app.addEventListener('click',onTransportTap,true);
    app.addEventListener('touchend',onTransportTap,{capture:true,passive:true});
  }`,
    next:`  function bindTransportHardFeedback(app){
    if(app.__mffTransportHardFeedbackBound) return;
    app.__mffTransportHardFeedbackBound=true;
    var lastTransportFeedbackTouchAt=0;

    function detectRole(btn){
      if(!btn) return '';
      var a=btn.getAttribute('data-action')||btn.getAttribute('data-mff-action')||'';
      if(/^(play|start|stream-play|transport-play)$/.test(a)) return 'play';
      if(/^(pause|stream-pause|transport-pause)$/.test(a)) return 'pause';
      if(/^(stop|stream-stop|transport-stop)$/.test(a)) return 'stop';
      var t=String(btn.textContent||btn.getAttribute('aria-label')||btn.title||'').trim().toLowerCase();
      if(/▶|►|play/.test(t)) return 'play';
      if(/pause|⏸|Ⅱ|\\|\\|/.test(t)) return 'pause';
      if(/stop|■|▪|square/.test(t)) return 'stop';
      return '';
    }

    function onTransportTap(ev){
      if(ev.type==='touchend') lastTransportFeedbackTouchAt=Date.now();
      else if(ev.type==='click' && Date.now()-lastTransportFeedbackTouchAt<700) return;
      var btn=ev.target&&ev.target.closest?ev.target.closest('button,.mff-control,[data-action],[data-mff-action]'):null;
      if(!btn || !app.contains(btn)) return;
      var role=detectRole(btn);
      if(!role) return;

      // Nur visuelles Feedback hart setzen. Audio-Logik bleibt bei bestehenden Handlern.
      if(role==='play'){
        applyTransportVisualState('play');
      }else if(role==='pause'){
        applyTransportVisualState('pause');
      }else if(role==='stop'){
        applyTransportVisualState('stop');
      }
    }

    app.addEventListener('click',onTransportTap,true);
    app.addEventListener('touchend',onTransportTap,{capture:true,passive:true});
  }`
  },
  {
    name:'boost feedback',
    old:`  function bindControlActiveFeedback(app){
    if(app.__mffControlFeedbackBound) return;
    app.__mffControlFeedbackBound=true;
    app.addEventListener('click',function(ev){
      var btn=ev.target&&ev.target.closest?ev.target.closest('.mff-control,[data-action]'):null;
      if(!btn || !app.contains(btn)) return;
      var action=btn.getAttribute('data-action')||'';
      if(action==='plus' || action==='boostUp' || action==='boost-plus' || action==='+' ||
         action==='minus' || action==='boostDown' || action==='boost-minus' || action==='-'){
        flashControl(btn,620);
        updateBoostVisualState(action);
      }
    },true);
    app.addEventListener('touchend',function(ev){
      var btn=ev.target&&ev.target.closest?ev.target.closest('.mff-control,[data-action]'):null;
      if(!btn || !app.contains(btn)) return;
      var action=btn.getAttribute('data-action')||'';
      if(action==='plus' || action==='boostUp' || action==='boost-plus' || action==='+' ||
         action==='minus' || action==='boostDown' || action==='boost-minus' || action==='-'){
        flashControl(btn,620);
        updateBoostVisualState(action);
      }
    },{capture:true,passive:true});
  }`,
    next:`  function bindControlActiveFeedback(app){
    if(app.__mffControlFeedbackBound) return;
    app.__mffControlFeedbackBound=true;
    var lastControlFeedbackTouchAt=0;
    var controlFeedbackHandler=function(ev){
      if(ev.type==='touchend') lastControlFeedbackTouchAt=Date.now();
      else if(ev.type==='click' && Date.now()-lastControlFeedbackTouchAt<700) return;
      var btn=ev.target&&ev.target.closest?ev.target.closest('.mff-control,[data-action]'):null;
      if(!btn || !app.contains(btn)) return;
      var action=btn.getAttribute('data-action')||'';
      if(action==='plus' || action==='boostUp' || action==='boost-plus' || action==='+' ||
         action==='minus' || action==='boostDown' || action==='boost-minus' || action==='-'){
        flashControl(btn,620);
        updateBoostVisualState(action);
      }
    };
    app.addEventListener('click',controlFeedbackHandler,true);
    app.addEventListener('touchend',controlFeedbackHandler,{capture:true,passive:true});
  }`
  },
  {
    name:'LED tips',
    old:`  function bindPanelLedTips(app){
    qa('#mffPanelLedPanel .mff-panel-led',app).forEach(function(btn){
      if(btn.__mffLedBound) return;
      btn.__mffLedBound=true;
      var handler=function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        var label=btn.getAttribute('data-label')||'LED';
        var state=btn.getAttribute('data-state')||'off';
        var info=btn.getAttribute('data-info')||'Status';
        setPanelLedTip(label+': '+state.toUpperCase()+' — '+info,btn);
      };
      btn.addEventListener('click',handler,{capture:true});
      btn.addEventListener('touchend',handler,{passive:false,capture:true});
    });
  }`,
    next:`  function bindPanelLedTips(app){
    qa('#mffPanelLedPanel .mff-panel-led',app).forEach(function(btn){
      if(btn.__mffLedBound) return;
      btn.__mffLedBound=true;
      var lastLedTipTouchAt=0;
      var handler=function(ev){
        if(ev.type==='touchend') lastLedTipTouchAt=Date.now();
        else if(ev.type==='click' && Date.now()-lastLedTipTouchAt<700){ev.preventDefault();ev.stopPropagation();return;}
        ev.preventDefault();
        ev.stopPropagation();
        var label=btn.getAttribute('data-label')||'LED';
        var state=btn.getAttribute('data-state')||'off';
        var info=btn.getAttribute('data-info')||'Status';
        setPanelLedTip(label+': '+state.toUpperCase()+' — '+info,btn);
      };
      btn.addEventListener('click',handler,{capture:true});
      btn.addEventListener('touchend',handler,{passive:false,capture:true});
    });
  }`
  },
  {
    name:'mobile EQ open',
    old:`    ['mffEqBars','eqBars'].forEach(function(id){var el=document.getElementById(id); if(el && el.dataset.mobileEqOverlayBound!=='1'){el.dataset.mobileEqOverlayBound='1'; el.title='Tap for Sound Control'; var openSnd=function(ev){ if(ev){ if(ev.cancelable)ev.preventDefault(); try{ev.stopPropagation();}catch(_e){} } if(window.S666SoundControl && typeof window.S666SoundControl.open==='function'){ window.S666SoundControl.open(); return; } open(ev); }; el.addEventListener('click',openSnd,{capture:true}); el.addEventListener('touchend',openSnd,{passive:false,capture:true});}});`,
    next:`    ['mffEqBars','eqBars'].forEach(function(id){var el=document.getElementById(id); if(el && el.dataset.mobileEqOverlayBound!=='1'){el.dataset.mobileEqOverlayBound='1'; el.title='Tap for Sound Control'; var lastMobileEqTouchAt=0; var openSnd=function(ev){ if(ev&&ev.type==='touchend') lastMobileEqTouchAt=Date.now(); else if(ev&&ev.type==='click'&&Date.now()-lastMobileEqTouchAt<700){if(ev.cancelable)ev.preventDefault();try{ev.stopPropagation();}catch(_e){}return;} if(ev){ if(ev.cancelable)ev.preventDefault(); try{ev.stopPropagation();}catch(_e){} } if(window.S666SoundControl && typeof window.S666SoundControl.open==='function'){ window.S666SoundControl.open(); return; } open(ev); }; el.addEventListener('click',openSnd,{capture:true}); el.addEventListener('touchend',openSnd,{passive:false,capture:true});}});`
  }
];

for(const file of files){
  let src=fs.readFileSync(file,'utf8');
  for(const replacement of replacements){
    const count=src.split(replacement.old).length-1;
    if(count!==1) throw new Error(`${file}: ${replacement.name} expected once, found ${count}`);
    src=src.replace(replacement.old,replacement.next);
  }
  fs.writeFileSync(file,src);
}

const test=`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('index.html','utf8');
const mirror=fs.readFileSync('public/index.html','utf8');

test('root and public player remain byte-identical',()=>assert.equal(root,mirror));
for(const [name,src] of [['index.html',root],['public/index.html',mirror]]){
  test(name+': batched mobile interaction dedupe markers',()=>{
    assert.match(src,/var lastTransportFeedbackTouchAt=0;/);
    assert.match(src,/Date\\.now\\(\\)-lastTransportFeedbackTouchAt<700/);
    assert.match(src,/var lastControlFeedbackTouchAt=0;/);
    assert.match(src,/Date\\.now\\(\\)-lastControlFeedbackTouchAt<700/);
    assert.match(src,/var lastLedTipTouchAt=0;/);
    assert.match(src,/Date\\.now\\(\\)-lastLedTipTouchAt<700/);
    assert.match(src,/var lastMobileEqTouchAt=0;/);
    assert.match(src,/Date\\.now\\(\\)-lastMobileEqTouchAt<700/);
    assert.match(src,/setManualStreamTarget\\(btn\\.getAttribute\\('data-stream-target'\\)\\|\\|'main'\\);/);
    assert.match(src,/mffRuntimeIsPlaying\\(\\)/);
    assert.match(src,/qsa\\('\\.smfp-v181-footer-version',a\\)\\.forEach/);
  });
}
`;
fs.writeFileSync('tests/mobile-interaction-dedupe-batch.test.mjs',test);
