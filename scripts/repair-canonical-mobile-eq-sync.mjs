import fs from 'node:fs';

const soundFiles=['js/sound-control-overlay-v1.js','public/js/sound-control-overlay-v1.js'];
const indexFiles=['index.html','public/index.html'];

const oldOpen=`  function open(){
    readEqFromDom();
    draft = clone(state);
    // If user changed old EQ panel before opening, reflect existing DOM once.
    BANDS.forEach(function(b){
      var input = b.selector ? qs(b.selector) : null;
      if(input) draft.eq[b.key] = clamp(input.value,-12,12);
    });
    draft.boosterLevel = readBoostStage();
    getOverlay().classList.remove("is-hidden");
    renderValues();
    updateLed();
  }`;

const newOpen=`  function open(){
    draft = clone(state);
    // Canonical EQ state wins when the dialog opens. Do not overwrite it with stale overlay storage.
    readEqFromDom();
    draft.boosterLevel = readBoostStage();
    dirty = false;
    getOverlay().classList.remove("is-hidden");
    renderValues();
    updateLed();
  }`;

for(const file of soundFiles){
  const src=fs.readFileSync(file,'utf8');
  const count=src.split(oldOpen).length-1;
  if(count!==1) throw new Error(`${file}: expected stale open block once, found ${count}`);
  fs.writeFileSync(file,src.replace(oldOpen,newOpen));
}

const oldBands=`  var BANDS=[
    {label:'SUB',key:'b63',id:'pcEq63'},
    {label:'BASS',key:'b125',id:'pcEq125'},
    {label:'LOW',key:'b250',id:'pcEq250'},
    {label:'MID',key:'b1k',id:'pcEq1k'},
    {label:'HIGH',key:'b4k',id:'pcEq4k'},
    {label:'AIR',key:'b16k',id:'pcEq16k'}
  ];`;
const newBands=`  var BANDS=[
    {label:'BASS',key:'low'},
    {label:'LOW MID',key:'lowMid'},
    {label:'MID',key:'mid'},
    {label:'HIGH MID',key:'highMid'},
    {label:'AIR',key:'high'}
  ];`;

const oldAccess=`  function getHiddenInput(b){return document.getElementById(b.id)||document.querySelector('[data-smfp-eq="'+b.key+'"]');}
  function setBand(b,val){
    val=clamp(val);
    var input=getHiddenInput(b);
    if(input){
      input.value=String(val);
      try{input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}
    }else{
      try{var raw=localStorage.getItem('smfp_real_eq_v162')||'{}'; var st=JSON.parse(raw); st[b.key]=val; localStorage.setItem('smfp_real_eq_v162',JSON.stringify(st));}catch(e){}
      try{if(typeof window.__smfpRealEqApply==='function')window.__smfpRealEqApply();}catch(e){}
    }
  }
  function getBand(b){
    var input=getHiddenInput(b); if(input)return clamp(input.value);
    try{var st=JSON.parse(localStorage.getItem('smfp_real_eq_v162')||'{}'); return clamp(st[b.key]||0);}catch(e){return 0;}
  }`;

const newAccess=`  function readCanonicalState(){
    try{
      if(window.SMFPRealEq&&typeof window.SMFPRealEq.getState==='function') return window.SMFPRealEq.getState()||{};
      return JSON.parse(localStorage.getItem('smfp_real_eq_v154')||'{}');
    }catch(e){return {};}
  }
  function setBand(b,val){
    val=clamp(val);
    try{
      if(window.SMFPRealEq&&typeof window.SMFPRealEq.setBand==='function'){
        window.SMFPRealEq.setBand(b.key,val);
        return;
      }
      var st=readCanonicalState();
      st[b.key]=val;
      localStorage.setItem('smfp_real_eq_v154',JSON.stringify(st));
      document.dispatchEvent(new CustomEvent('s666:sound-eq',{detail:{values:st}}));
      if(typeof window.__smfpRealEqApply==='function')window.__smfpRealEqApply();
    }catch(e){}
  }
  function getBand(b){
    var st=readCanonicalState();
    return clamp(st[b.key]||0);
  }`;

for(const file of indexFiles){
  let src=fs.readFileSync(file,'utf8');
  let count=src.split(oldBands).length-1;
  if(count!==1) throw new Error(`${file}: expected legacy mobile EQ bands once, found ${count}`);
  src=src.replace(oldBands,newBands);
  count=src.split(oldAccess).length-1;
  if(count!==1) throw new Error(`${file}: expected legacy mobile EQ access once, found ${count}`);
  src=src.replace(oldAccess,newAccess);
  fs.writeFileSync(file,src);
}

const test=`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('index.html','utf8');
const mirror=fs.readFileSync('public/index.html','utf8');
const sound=fs.readFileSync('js/sound-control-overlay-v1.js','utf8');
const soundMirror=fs.readFileSync('public/js/sound-control-overlay-v1.js','utf8');
const equalizer=fs.readFileSync('js/equalizer.js','utf8');

test('root and public player remain byte-identical',()=>assert.equal(root,mirror));
test('sound control root/public remain byte-identical',()=>assert.equal(sound,soundMirror));
test('sound dialog reads canonical EQ after cloning stored state',()=>{
  const start=sound.indexOf('  function open(){');
  const end=sound.indexOf('  function requestClose()',start);
  const block=sound.slice(start,end);
  assert.ok(block.indexOf('draft = clone(state);') < block.indexOf('readEqFromDom();'));
  assert.match(block,/dirty = false;/);
  assert.doesNotMatch(block,/b\.selector/);
});
test('mobile fallback uses canonical five-band EQ contract',()=>{
  const start=root.indexOf('<script id="smfpMobileGraphicEqOverlayV190Script">');
  const end=root.indexOf('</script>',start);
  const block=root.slice(start,end);
  for(const key of ['low','lowMid','mid','highMid','high']) assert.match(block,new RegExp("key:'"+key+"'"));
  assert.match(block,/window\.SMFPRealEq/);
  assert.match(block,/smfp_real_eq_v154/);
  assert.match(block,/s666:sound-eq/);
  assert.doesNotMatch(block,/smfp_real_eq_v162|pcEq63|key:'b63'|key:'b16k'/);
});
test('canonical audio EQ architecture remains unchanged',()=>{
  assert.match(equalizer,/const SMFP_REAL_EQ_BANDS = \[/);
  assert.match(equalizer,/window\.SMFPRealEq =/);
  assert.match(equalizer,/createMediaElementSource\(audio\)/);
  assert.match(equalizer,/smfp_real_eq_v154/);
});
`;
fs.writeFileSync('tests/canonical-mobile-eq-sync.test.mjs',test);
