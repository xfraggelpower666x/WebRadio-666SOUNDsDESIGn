import fs from 'node:fs';

const jsFiles = [
  'js/phase10-stability-iphone-panel-hud.js',
  'public/js/phase10-stability-iphone-panel-hud.js'
];
const cssFiles = [
  'css/phase10-stability-iphone-panel-hud.css',
  'public/css/phase10-stability-iphone-panel-hud.css'
];

const oldMount = `  function mountBottomSafe(){
    var app = qs("#mffApp");
    if(!app || qs("#s666MobileBottomSafe")) return;
    var box = document.createElement("div");
    box.id = "s666MobileBottomSafe";
    box.className = "s666-mobile-bottom-safe";
    box.innerHTML = '<div class="s666-mobile-copyline">666SOUNDsDESIGn WebRadio</div><div class="s666-mobile-meterline"><i class="s666-mobile-meterfill"></i></div>';
    document.body.appendChild(box);
  }`;

const newMount = `  var mobileBottomMeterState = { started:false, smooth:0 };

  function mobileBottomMeterTick(){
    var box = qs("#s666MobileBottomSafe");
    var fill = box && qs(".s666-mobile-meterfill", box);
    if(!fill) return;
    var audio = getAudio();
    var bus = window.__MeterBus;
    var fresh = !!(bus && bus.source === "real" && typeof bus.level === "number" && Date.now() - Number(bus.ts || 0) < 700);
    var level = fresh && audio && !audio.paused ? Math.max(0, Math.min(1, Number(bus.level) || 0)) : 0;
    mobileBottomMeterState.smooth = mobileBottomMeterState.smooth*.72 + level*.28;
    if(level === 0 && mobileBottomMeterState.smooth < .01) mobileBottomMeterState.smooth = 0;
    fill.style.setProperty("width", "100%", "important");
    fill.style.setProperty("transform", "scaleX(" + mobileBottomMeterState.smooth.toFixed(4) + ")", "important");
    fill.style.setProperty("opacity", fresh ? "1" : ".32", "important");
    document.documentElement.setAttribute("data-mobile-bottom-meter-source", fresh ? "meterbus-real" : "real-unavailable");
  }

  function startMobileBottomMeter(){
    if(mobileBottomMeterState.started) return;
    mobileBottomMeterState.started = true;
    mobileBottomMeterTick();
    setInterval(mobileBottomMeterTick, 120);
  }

  function mountBottomSafe(){
    var app = qs("#mffApp");
    if(!app) return;
    var box = qs("#s666MobileBottomSafe");
    if(!box){
      box = document.createElement("div");
      box.id = "s666MobileBottomSafe";
      box.className = "s666-mobile-bottom-safe";
      box.innerHTML = '<div class="s666-mobile-copyline">666SOUNDsDESIGn WebRadio</div><div class="s666-mobile-meterline"><i class="s666-mobile-meterfill"></i></div>';
      document.body.appendChild(box);
    }
    box.style.setProperty("bottom", "max(var(--s666-safe-bottom), 6px)", "important");
    var fill = qs(".s666-mobile-meterfill", box);
    if(fill){
      fill.style.setProperty("width", "100%", "important");
      fill.style.setProperty("transform", "scaleX(0)", "important");
    }
    startMobileBottomMeter();
  }`;

for (const file of jsFiles) {
  let src = fs.readFileSync(file, 'utf8');
  const count = src.split(oldMount).length - 1;
  if (count !== 1) throw new Error(`${file}: mountBottomSafe anchor expected once, found ${count}`);
  src = src.replace(oldMount, newMount);
  fs.writeFileSync(file, src);
}

for (const file of cssFiles) {
  let src = fs.readFileSync(file, 'utf8');
  const replacements = [
    ['bottom:var(--s666-safe-bottom)!important;', 'bottom:max(var(--s666-safe-bottom),6px)!important;', 1],
    ['width:35%;', 'width:100%;', 1],
    ['    transform-origin:left center;', '    transform:scaleX(0);\n    transform-origin:left center;', 1],
    ['.s666-mobile-bottom-safe{bottom:env(safe-area-inset-bottom,0px)!important;padding-bottom:4px!important;}', '.s666-mobile-bottom-safe{bottom:max(env(safe-area-inset-bottom,0px),6px)!important;padding-bottom:4px!important;}', 1]
  ];
  for (const [oldText, newText, expected] of replacements) {
    const count = src.split(oldText).length - 1;
    if (count !== expected) throw new Error(`${file}: CSS anchor expected ${expected}, found ${count}: ${oldText}`);
    src = src.replace(oldText, newText);
  }
  fs.writeFileSync(file, src);
}

const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('js/phase10-stability-iphone-panel-hud.js', 'utf8');
const jsMirror = fs.readFileSync('public/js/phase10-stability-iphone-panel-hud.js', 'utf8');
const css = fs.readFileSync('css/phase10-stability-iphone-panel-hud.css', 'utf8');
const cssMirror = fs.readFileSync('public/css/phase10-stability-iphone-panel-hud.css', 'utf8');

test('mobile bottom-meter mirrors remain byte-identical', () => {
  assert.equal(js, jsMirror);
  assert.equal(css, cssMirror);
});

test('mobile bottom meter uses only fresh real MeterBus data', () => {
  const start = js.indexOf('  var mobileBottomMeterState');
  const end = js.indexOf('  function bindEqTriggers()', start);
  assert.ok(start >= 0 && end > start);
  const block = js.slice(start, end);
  assert.match(block, /window\.__MeterBus/);
  assert.match(block, /bus\.source === "real"/);
  assert.match(block, /Date\.now\(\) - Number\(bus\.ts \|\| 0\) < 700/);
  assert.match(block, /audio && !audio\.paused/);
  assert.match(block, /scaleX\(/);
  assert.match(block, /real-unavailable/);
  assert.doesNotMatch(block, /Math\.sin|pseudo|synthetic|AudioContext|createMediaElementSource|createAnalyser/);
});

test('mobile bottom meter has a physical safe-edge floor', () => {
  assert.match(css, /bottom:max\(var\(--s666-safe-bottom\),6px\)!important/);
  assert.match(css, /bottom:max\(env\(safe-area-inset-bottom,0px\),6px\)!important/);
  assert.match(css, /\.s666-mobile-meterfill[\s\S]*width:100%/);
  assert.match(css, /transform:scaleX\(0\)/);
  assert.doesNotMatch(css, /width:35%/);
});

test('audio recovery and H-B hardlocks remain intact', () => {
  assert.match(js, /S666_AUDIO_HEALING_ORCHESTRA/);
  assert.match(js, /centralAudioGuardV2Recover/);
  assert.match(js, /bindMobileStreamLedSwitch/);
  assert.match(js, /canonical:"mainBtn"/);
  assert.match(js, /canonical:"fallbackBtn"/);
});
`;
fs.writeFileSync('tests/mobile-bottom-meter-real-safe.test.mjs', test);
