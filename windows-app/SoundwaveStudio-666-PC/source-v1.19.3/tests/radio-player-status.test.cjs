'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('src/integration/666-integration.js','utf8');
const html=fs.readFileSync('src/index.html','utf8');
const radioCode=source.slice(source.indexOf('  async function setMode(next)'),source.indexOf('  function metadata()'));

function harness(overrides={}){
  const elements=new Map();
  function element(selector){
    if(!elements.has(selector))elements.set(selector,{value:'',textContent:'',disabled:false,dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(type,fn){this[type]=fn;}});
    return elements.get(selector);
  }
  const listeners=new Map(),timers=new Map(),sync=[];
  let nextTimer=0,probe;
  const audio={
    paused:true,src:'',addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
    emit(type){return Promise.all((listeners.get(type)||[]).map(fn=>fn()));},
    pause(){this.paused=true;void this.emit('pause');},
    load(){void this.emit('loadstart');},
    async play(){this.paused=false;await this.emit('play');await this.emit('playing');}
  };
  class Probe {
    constructor(){probe=this;this.listeners={};}
    addEventListener(type,fn){this.listeners[type]=fn;}
    pause(){}
    removeAttribute(){}
    load(){}
    play(){return Promise.resolve();}
    finish(type){this.listeners[type]();}
  }
  const api={
    radioConfig:async()=>({radioBase:'https://example.test',stream:'/stream',fallback:'/fallback-stream'}),
    radioNowPlaying:async()=>({nowplaying:{artist:'Artist',title:'Song',dj:'DJ',listeners:0,bitrate:128,codec:'MP3'}}),
    syncSource:data=>sync.push(data),...overrides
  };
  const context={
    URL,Audio:Probe,audio,outputMode:false,window:{api,addEventListener(){},RWLocalQueue:{cancelTransition(){}}},
    document:{hidden:false,body:{classList:{add(){},remove(){}}},addEventListener(){}},
    q:element,qa:()=>[],rt:{enablePlayback(){},setStatus(){}},state(){},composeStage(){},overlayPrefs:()=>({}),artworkOf:()=> '',
    cleanText:(v,fallback='—')=>String(v??'').trim()||fallback,
    setTimeout(fn,delay){const id=++nextTimer;timers.set(id,{fn,delay});return id;},
    clearTimeout(id){timers.delete(id);},Math,
  };
  vm.createContext(context);
  vm.runInContext(`
    let mode='local',radioCfg=null,np={},poll=0,radioUsingFallback=false,radioFailoverBusy=false,radioFallbackFailed=false,radioFailoverAttempts=0,radioRecoveryTimer=0,radioRecoveryBusy=false,messengerPoll=0,discordAutoEnabled=false,lastDiscordTrack='';
    let radioPreference='auto',radioGeneration=0,radioPlaybackState='INACTIVE',radioLoaded=false;
    const radioRoute=()=>radioFallbackFailed?'DEGRADED':(radioUsingFallback?'FALLBACK':'MAIN');
    function refreshPlayerMessenger(){}
    ${radioCode}
    globalThis.controller={setMode,recoverRadioMain,getState:()=>({mode,radioPreference,radioUsingFallback,radioPlaybackState,radioFallbackFailed})};
  `,context);
  return {controller:context.controller,audio,element,timers,sync,getProbe:()=>probe};
}

test('player bar contains an independent status and route selector',()=>{
  const footer=html.slice(html.indexOf('<footer class="player-controls">'),html.indexOf('</footer>'));
  for(const id of ['player-radio-route','player-radio-route-state','player-radio-now','player-radio-details'])assert.ok(footer.includes(`id="${id}"`));
  assert.ok(['auto','main','fallback'].every(value=>footer.includes(`value="${value}"`)));
});

test('status tracks radio metadata and actual playback events independently of overlay',async()=>{
  const h=harness();
  assert.equal(h.element('#player-radio-route-state').textContent,'RADIO INACTIVE');
  await h.controller.setMode('radio');
  assert.equal(h.element('#player-radio-route').disabled,false);
  assert.equal(h.element('#player-radio-route-state').textContent,'MAIN · CONNECTING');
  assert.equal(h.element('#player-radio-now').textContent,'Artist — Song');
  assert.equal(h.element('#player-radio-details').textContent,'DJ: DJ · LISTENERS: 0 · STREAM: 128 · MP3');
  await h.audio.emit('canplay');
  assert.equal(h.element('#player-radio-route-state').textContent,'MAIN · PAUSED');
  await h.audio.play();
  assert.equal(h.element('#player-radio-route-state').textContent,'MAIN · PLAYING');
  await h.audio.emit('waiting');
  assert.equal(h.element('#player-radio-route-state').textContent,'MAIN · BUFFERING');
  await h.controller.setMode('local');
  assert.equal(h.element('#player-radio-route-state').textContent,'RADIO INACTIVE');
  assert.equal(h.element('#player-radio-route').disabled,true);
});

test('manual routes stay selected on error and do not auto-recover; auto fails over',async()=>{
  const h=harness();await h.controller.setMode('radio');await h.audio.play();
  const selector=h.element('#player-radio-route');
  selector.value='fallback';await selector.change({target:selector});
  assert.equal(h.audio.src,'https://example.test/fallback-stream');
  assert.equal(h.element('#player-radio-route-state').textContent,'FALLBACK · PLAYING');
  await h.audio.emit('error');
  assert.equal(h.element('#player-radio-route-state').textContent,'FALLBACK · ERROR');
  assert.equal([...h.timers.values()].some(t=>t.delay===5000),false);
  selector.value='main';await selector.change({target:selector});
  await h.audio.emit('error');
  assert.equal(h.audio.src,'https://example.test/stream');
  assert.equal(h.element('#player-radio-route-state').textContent,'MAIN · ERROR');
  selector.value='auto';await selector.change({target:selector});
  await h.audio.emit('error');
  assert.equal(h.audio.src,'https://example.test/fallback-stream');
  assert.equal(h.element('#player-radio-route-state').textContent,'FALLBACK · PLAYING');
  assert.equal(h.sync.at(-1).routeState,'FALLBACK');
});

test('recovery cannot override a manual choice or mode change while probing',async()=>{
  const h=harness();await h.controller.setMode('radio');await h.audio.play();await h.audio.emit('error');
  const recovery=h.controller.recoverRadioMain();
  const selector=h.element('#player-radio-route');selector.value='fallback';await selector.change({target:selector});
  h.getProbe().finish('canplay');await recovery;
  assert.equal(h.controller.getState().radioPreference,'fallback');
  assert.equal(h.audio.src,'https://example.test/fallback-stream');
  selector.value='auto';await selector.change({target:selector});await h.audio.emit('error');
  const second=h.controller.recoverRadioMain();await h.controller.setMode('local');
  h.getProbe().finish('canplay');await second;
  assert.equal(h.controller.getState().mode,'local');
  assert.equal(h.element('#player-radio-route-state').textContent,'RADIO INACTIVE');
});

test('changing a paused radio route preserves pause',async()=>{
  const h=harness();await h.controller.setMode('radio');
  const selector=h.element('#player-radio-route');selector.value='fallback';await selector.change({target:selector});
  assert.equal(h.audio.paused,true);
  await h.audio.emit('canplay');
  assert.equal(h.element('#player-radio-route-state').textContent,'FALLBACK · PAUSED');
});

test('automatic recovery restores main without starting a paused player',async()=>{
  const h=harness();await h.controller.setMode('radio');await h.audio.play();await h.audio.emit('error');h.audio.pause();
  const recovery=h.controller.recoverRadioMain();h.getProbe().finish('canplay');await recovery;
  assert.equal(h.audio.src,'https://example.test/stream');
  assert.equal(h.audio.paused,true);
  await h.audio.emit('canplay');
  assert.equal(h.element('#player-radio-route-state').textContent,'MAIN · PAUSED');
});

test('late configuration or now-playing responses cannot replace a different source',async()=>{
  let resolveConfig;
  const h=harness({radioConfig:()=>new Promise(resolve=>{resolveConfig=resolve;})});
  const loading=h.controller.setMode('radio');await h.controller.setMode('local');
  resolveConfig({radioBase:'https://example.test',stream:'/stream',fallback:'/fallback-stream'});await loading;
  assert.equal(h.audio.src,'');
  assert.equal(h.element('#player-radio-route-state').textContent,'RADIO INACTIVE');

  let resolveNow,signalStart;
  const started=new Promise(resolve=>{signalStart=resolve;});
  const other=harness({radioNowPlaying:()=>new Promise(resolve=>{resolveNow=resolve;signalStart();})});
  const radio=other.controller.setMode('radio');await started;
  await other.controller.setMode('local');resolveNow({title:'stale'});await radio;
  assert.equal(other.element('#player-radio-now').textContent,'—');
});

test('changing route during initial metadata fetch keeps polling active',async()=>{
  let resolveNow,signalStart;
  const started=new Promise(resolve=>{signalStart=resolve;});
  const h=harness({radioNowPlaying:()=>new Promise(resolve=>{resolveNow=resolve;signalStart();})});
  const radio=h.controller.setMode('radio');await started;
  const selector=h.element('#player-radio-route');selector.value='fallback';await selector.change({target:selector});
  resolveNow({title:'stale'});await radio;
  assert.equal([...h.timers.values()].some(t=>t.delay===10000),true);
});
