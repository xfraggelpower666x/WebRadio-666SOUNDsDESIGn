import fs from 'node:fs';

const files=['js/phase10-stability-iphone-panel-hud.js','public/js/phase10-stability-iphone-panel-hud.js'];
const oldBlock=`    if((!rms || rms < .015) && audio && !audio.paused){
      sideMeterReactV1State.phase += .135;
      rms = .22 + Math.abs(Math.sin(sideMeterReactV1State.phase))*.32 + Math.abs(Math.sin(sideMeterReactV1State.phase*.43+1.9))*.18 + Math.abs(Math.sin(sideMeterReactV1State.phase*1.71+.3))*.10;
    }
    var level = Math.max(0, Math.min(1, rms));
    sideMeterReactV1State.smooth = sideMeterReactV1State.smooth*.64 + level*.36;
    sideMeterReactV1State.peak = Math.max(sideMeterReactV1State.smooth, sideMeterReactV1State.peak*.88);
    return { level:sideMeterReactV1State.smooth, peak:sideMeterReactV1State.peak, running:!!(audio && !audio.paused) };`;
const newBlock=`    var signalAvailable=!!(rms && rms >= .015);
    if(!signalAvailable){
      rms=0;
      document.documentElement.setAttribute("data-side-meter-signal","real-unavailable");
    }else{
      document.documentElement.setAttribute("data-side-meter-signal",busFresh?"meterbus-real":"legacy-real-level");
    }
    var level = Math.max(0, Math.min(1, rms));
    sideMeterReactV1State.smooth = sideMeterReactV1State.smooth*.64 + level*.36;
    sideMeterReactV1State.peak = Math.max(sideMeterReactV1State.smooth, sideMeterReactV1State.peak*.88);
    return { level:sideMeterReactV1State.smooth, peak:sideMeterReactV1State.peak, running:!!(audio && !audio.paused && signalAvailable) };`;

for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  const count=src.split(oldBlock).length-1;
  if(count!==1) throw new Error(`${file}: synthetic side-meter block expected once, found ${count}`);
  fs.writeFileSync(file,src.replace(oldBlock,newBlock));
}

const test=`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/phase10-stability-iphone-panel-hud.js','utf8');
const mirror=fs.readFileSync('public/js/phase10-stability-iphone-panel-hud.js','utf8');
const equalizer=fs.readFileSync('js/equalizer.js','utf8');

test('phase10 root/public remain byte-identical',()=>assert.equal(root,mirror));

test('side meter uses real signals and stays still when unavailable',()=>{
  const start=root.indexOf('  function sideMeterReactV1AudioLevel(){');
  const end=root.indexOf('  function sideMeterReactV1Groups()',start);
  assert.ok(start>=0&&end>start);
  const block=root.slice(start,end);
  assert.match(block,/window\.__MeterBus/);
  assert.match(block,/data-side-meter-signal/);
  assert.match(block,/real-unavailable/);
  assert.match(block,/audio && !audio\.paused && signalAvailable/);
  assert.doesNotMatch(block,/Math\.sin|phase \+=|pseudo|synthetic/);
});

test('canonical MeterBus producer remains unchanged',()=>{
  assert.match(equalizer,/window\.__MeterBus = \{/);
  assert.match(equalizer,/source: source/);
  assert.match(equalizer,/ts: now/);
});

test('H/B and recovery contracts remain present',()=>{
  assert.match(root,/bindMobileStreamLedSwitch/);
  assert.match(root,/centralAudioGuardV2Recover/);
});
`;
fs.writeFileSync('tests/pc-side-meter-no-fake-motion.test.mjs',test);
