import fs from 'node:fs';

const files=['js/phase10-stability-iphone-panel-hud.js','public/js/phase10-stability-iphone-panel-hud.js'];
const anchor=`    function hardfixForceMainOnlyPc(){}
    function phase10IsMobileAudioDevice(){ return /iphone|ipad|ipod|android/i.test(navigator.userAgent||"") || (window.innerWidth||9999) <= 860; }`;
const replacement=`    function hardfixForceMainOnlyPc(){}

    var phase10StreamSwitchLastTouchAt=0;
    function bindMobileStreamLedSwitch(){
      var app=qs("#mffApp");
      if(!app) return;
      var entries=[
        {led:"main",target:"main",canonical:"mainBtn"},
        {led:"backup",target:"backup",canonical:"fallbackBtn"}
      ];
      entries.forEach(function(entry){
        var btn=qs('#mffPanelLedPanel [data-led="'+entry.led+'"]',app);
        if(!btn) return;
        btn.classList.add("mff-stream-btn");
        btn.setAttribute("data-stream-target",entry.target);
        if(btn.__phase10StreamSwitchBound) return;
        btn.__phase10StreamSwitchBound=true;
        var handler=function(ev){
          if(ev.type==="touchend") phase10StreamSwitchLastTouchAt=Date.now();
          else if(ev.type==="click" && Date.now()-phase10StreamSwitchLastTouchAt<700){ev.preventDefault();ev.stopPropagation();return;}
          ev.preventDefault();
          ev.stopPropagation();
          var canonical=document.getElementById(entry.canonical);
          if(canonical) tap(canonical,"mobile-"+entry.target+"-stream");
          document.documentElement.setAttribute("data-manual-stream-target",entry.target);
          qsa('#mffPanelLedPanel [data-stream-target]',app).forEach(function(other){
            var active=other.getAttribute("data-stream-target")===entry.target;
            other.classList.toggle("is-active",active);
            other.setAttribute("aria-pressed",active?"true":"false");
          });
        };
        btn.addEventListener("click",handler,{capture:true});
        btn.addEventListener("touchend",handler,{capture:true,passive:false});
      });
      var current=document.documentElement.getAttribute("data-manual-stream-target")||"main";
      qsa('#mffPanelLedPanel [data-stream-target]',app).forEach(function(btn){
        var active=btn.getAttribute("data-stream-target")===current;
        btn.classList.toggle("is-active",active);
        btn.setAttribute("aria-pressed",active?"true":"false");
      });
    }

    function phase10IsMobileAudioDevice(){ return /iphone|ipad|ipod|android/i.test(navigator.userAgent||"") || (window.innerWidth||9999) <= 860; }`;

const bootOld=`    phase10RelocatePcPanels();
    mountMobilePanelRow();
    mountBottomSafe();`;
const bootNew=`    phase10RelocatePcPanels();
    mountMobilePanelRow();
    bindMobileStreamLedSwitch();
    mountBottomSafe();`;

const maintenanceOld=`      mountMobilePanelRow();
      bindEqTriggers();
        installAudioFocusGuard();`;
const maintenanceNew=`      mountMobilePanelRow();
      bindMobileStreamLedSwitch();
      bindEqTriggers();
        installAudioFocusGuard();`;

for(const file of files){
  let src=fs.readFileSync(file,'utf8');
  for(const [name,oldBlock,newBlock] of [
    ['function anchor',anchor,replacement],
    ['boot binding',bootOld,bootNew],
    ['maintenance binding',maintenanceOld,maintenanceNew]
  ]){
    const count=src.split(oldBlock).length-1;
    if(count!==1) throw new Error(`${file}: ${name} expected once, found ${count}`);
    src=src.replace(oldBlock,newBlock);
  }
  fs.writeFileSync(file,src);
}

const test=`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/phase10-stability-iphone-panel-hud.js','utf8');
const mirror=fs.readFileSync('public/js/phase10-stability-iphone-panel-hud.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const publicIndex=fs.readFileSync('public/index.html','utf8');

test('phase10 root/public remain byte-identical',()=>assert.equal(root,mirror));
test('player root/public remain byte-identical',()=>assert.equal(index,publicIndex));

test('visible H/B LEDs use the canonical stream buttons',()=>{
  assert.match(index,/data-led=\\"main\\"/);
  assert.match(index,/data-led=\\"backup\\"/);
  assert.match(root,/canonical:\"mainBtn\"/);
  assert.match(root,/canonical:\"fallbackBtn\"/);
  assert.match(root,/tap\\(canonical,\"mobile-\"\\+entry\\.target\\+\"-stream\"\\)/);
});

test('mobile H/B switch suppresses synthetic click and reports state',()=>{
  assert.match(root,/phase10StreamSwitchLastTouchAt/);
  assert.match(root,/Date\\.now\\(\\)-phase10StreamSwitchLastTouchAt<700/);
  assert.match(root,/data-manual-stream-target/);
  assert.match(root,/aria-pressed/);
  assert.match(root,/bindMobileStreamLedSwitch\\(\\);/);
});

test('repair does not define stream URLs or audio graph',()=>{
  const start=root.indexOf('    var phase10StreamSwitchLastTouchAt=0;');
  const end=root.indexOf('    function phase10IsMobileAudioDevice()',start);
  const block=root.slice(start,end);
  assert.doesNotMatch(block,/STREAM_URL|https?:|AudioContext|createMediaElementSource|createAnalyser/);
});
`;
fs.writeFileSync('tests/mobile-hb-led-stream-switch.test.mjs',test);
