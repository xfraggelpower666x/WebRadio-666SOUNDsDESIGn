'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/diagnostics.js','utf8');

function harness(){
  const elements=new Map(),timers=new Map(),events={};
  function q(selector){
    if(!elements.has(selector)){
      const strong={textContent:''};
      const meter={setAttribute(name,value){this[name]=value;},removeAttribute(name){delete this[name];}},bar={style:{}};
      elements.set(selector,{textContent:'',innerHTML:'',dataset:{},strong,meter,bar,querySelector:s=>s==='strong'?strong:s==='.rw-diag-audio-meter'?meter:s==='.rw-diag-audio-meter i'?bar:null,querySelectorAll:()=>[],setAttribute(name,value){this[name]=value;},addEventListener(type,fn){this[type]=fn;}});
    }
    return elements.get(selector);
  }
  let data={runtime:{memory:{rss:123*1048576,heapUsed:5*1048576}},outputs:{active:[{responsive:true,fps:30},{responsive:false,fps:20}]}};
  const api={displays:async()=>[],outputStatus:async()=>data.outputs,runtimeDiagnostics:async()=>data.runtime};
  const document={querySelector:q,hidden:false,addEventListener(type,fn){events[type]=fn;}},window={api};
  vm.runInNewContext(source,{document,window,setInterval(fn,delay){timers.set(delay,fn);}});
  return {q,api,document,window,sample:()=>timers.get(250)(),visibility:()=>events.visibilitychange(),refresh:()=>q('#rw-diag-refresh').click(),set:value=>{data=value;}};
}

test('LEDs and graphs use actual process memory and responsive output heartbeat samples',async()=>{
  const h=harness();await h.refresh();
  assert.equal(h.q('#rw-diag-led-memory').strong.textContent,'123.0 MiB');
  assert.equal(h.q('#rw-diag-led-heap').strong.textContent,'5.0 MiB');
  assert.equal(h.q('#rw-diag-led-outputs').strong.textContent,'1 / 2');
  assert.equal(h.q('#rw-diag-led-outputs').dataset.state,'warning');
  assert.match(h.q('#rw-diag-graph-memory').innerHTML,/123\.0 MiB/);
  assert.match(h.q('#rw-diag-graph-fps').innerHTML,/30\.0 FPS/);
  for(let i=0;i<35;i++)await h.refresh();
  assert.match(h.q('#rw-diag-graph-memory').innerHTML,/30 samples/);
});

test('missing samples clear old graphs and do not invent zero measurements',async()=>{
  const h=harness();await h.refresh();
  h.set({runtime:{memory:{}},outputs:{active:[]}});
  await h.refresh();
  assert.equal(h.q('#rw-diag-led-memory').strong.textContent,'UNAVAILABLE');
  assert.equal(h.q('#rw-diag-led-outputs').strong.textContent,'0 / 0');
  assert.equal(h.q('#rw-diag-led-outputs').dataset.state,'unknown');
  assert.match(h.q('#rw-diag-graph-memory').innerHTML,/Measurement unavailable/);
  assert.match(h.q('#rw-diag-graph-fps').innerHTML,/Measurement unavailable/);
});

test('a failed output read does not hide valid memory or retain a stale heartbeat',async()=>{
  const h=harness();await h.refresh();
  h.api.outputStatus=()=>{throw new Error('offline');};
  await h.refresh();
  assert.equal(h.q('#rw-diag-led-memory').strong.textContent,'123.0 MiB');
  assert.equal(h.q('#rw-diag-led-outputs').strong.textContent,'UNAVAILABLE');
  assert.match(h.q('#rw-diag-graph-fps').innerHTML,/Measurement unavailable/);
  assert.match(h.q('#rw-diag-state').textContent,/^PARTIAL/);
});

test('audio LED levels are calculated from live analyser bins and sample rate',()=>{
  const h=harness();
  const analyser={frequencyBinCount:512,fftSize:1024,getByteFrequencyData(bins){for(let i=0;i<bins.length;i++){const hz=i*48000/1024;bins[i]=hz<250?255:hz<2000?128:0;}}};
  h.window.SoundwaveRuntime={audio:{paused:false,readyState:4},getAnalyser:()=>analyser,getAudioContext:()=>({state:'running',sampleRate:48000})};
  h.sample();
  assert.equal(h.q('#rw-diag-audio-state').textContent,'ANALYSER · LIVE INPUT SAMPLE');
  assert.equal(h.q('#rw-diag-audio-low').strong.textContent,'100%');
  assert.equal(h.q('#rw-diag-audio-mid').strong.textContent,'50%');
  assert.equal(h.q('#rw-diag-audio-high').strong.textContent,'0%');
  assert.equal(h.q('#rw-diag-audio-mid').meter['aria-valuenow'],'50');
  assert.equal(h.q('#rw-diag-audio-mid').bar.style.width,'50%');
});

test('audio LEDs clear measurements when paused, stale, suspended or unavailable',()=>{
  const h=harness(),audio={paused:false,readyState:4},context={state:'running',sampleRate:48000};
  const analyser={frequencyBinCount:512,fftSize:1024,getByteFrequencyData(bins){bins.fill(255);}};
  h.window.SoundwaveRuntime={audio,getAnalyser:()=>analyser,getAudioContext:()=>context};h.sample();
  h.document.hidden=true;h.visibility();
  assert.equal(h.q('#rw-diag-audio-state').textContent,'ANALYSER · STALE');
  assert.equal(h.q('#rw-diag-audio-low').strong.textContent,'—');
  assert.equal(h.q('#rw-diag-audio-low').meter['aria-valuenow'],undefined);
  assert.equal(h.q('#rw-diag-audio-low').dataset.state,'stale');
  h.document.hidden=false;audio.paused=true;h.visibility();
  assert.equal(h.q('#rw-diag-audio-state').textContent,'ANALYSER · PAUSED');
  audio.paused=false;context.state='suspended';h.sample();
  assert.equal(h.q('#rw-diag-audio-state').textContent,'ANALYSER · CONTEXT NOT RUNNING');
  h.window.SoundwaveRuntime=null;h.sample();
  assert.equal(h.q('#rw-diag-audio-state').textContent,'ANALYSER · UNAVAILABLE');
});
