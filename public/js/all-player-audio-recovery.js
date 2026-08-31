/*
 * 666SOUNDsDESIGn — ALL-PLAYER AUDIO BUFFER / RECOVERY CORE v1.0.3
 * One conservative recovery owner for Main Desktop, Main Mobile/MFF, VELUNA and Internal.
 * waiting/stalled/suspend are sensors only. Recovery requires confirmed playback loss.
 * Polling also seeds candidates for silent currentTime/readyState/network stalls that emit no media event.
 * Legacy phase10 recovery is held inside its existing orchestra cooldown while this owner is active.
 * Confirmed failure of the backup/fallback stream fails over to the already-stable primary /stream route.
 * No EQ, Boost, limiter, MeterBus, auth, skip, Discord or Messenger logic.
 */
(function installS666AllPlayerAudioRecovery(global){
  'use strict';
  if(global.S666AllPlayerAudioRecovery) return;

  const VERSION='1.0.3';
  const OWNER='all-player-audio-recovery-v1';
  const PRIMARY_ROUTE='/stream';
  const BACKUP_ROUTE='/fallback-stream';
  const states=new WeakMap();
  const attached=new WeakSet();
  let scanObserver=null;
  let sensorObserver=null;

  const isMobile=()=>/iphone|ipad|ipod|android/i.test(navigator.userAgent||'')||global.innerWidth<=760;
  const profile=()=>isMobile()
    ? {pausedConfirmMs:5000,stallConfirmMs:14000,readyLowConfirmMs:9000,hardConfirmMs:4500,cooldownMs:10000,hardReloadMs:26000,pollSeedMs:3000}
    : {pausedConfirmMs:8000,stallConfirmMs:18000,readyLowConfirmMs:12000,hardConfirmMs:6500,cooldownMs:14000,hardReloadMs:32000,pollSeedMs:4000};

  function now(){return Date.now();}
  function sourceOf(audio){return String(audio?.currentSrc||audio?.getAttribute?.('src')||audio?.src||'').trim();}
  function isBackupSource(src){
    const value=String(src||'').trim().toLowerCase();
    if(!value) return false;
    if(value===BACKUP_ROUTE||value.endsWith(BACKUP_ROUTE)) return true;
    try{
      const url=new URL(value,global.location?.href||'https://local.invalid/');
      return url.pathname===BACKUP_ROUTE||url.pathname.endsWith(BACKUP_ROUTE)||(/:8686$/).test(url.host)&&url.pathname==='/stream';
    }catch(_){return value.includes('/fallback-stream')||value.includes(':8686/stream');}
  }
  function uiSaysStopped(){
    const body=String(document.body?.getAttribute('data-player-state')||'').toLowerCase();
    const mff=String(document.documentElement.getAttribute('data-mff-transport')||'').toLowerCase();
    return body==='pause'||body==='paused'||body==='stop'||body==='stopped'||mff==='pause'||mff==='stop';
  }
  function stateFor(audio){
    let s=states.get(audio);
    if(!s){
      s={wanted:false,lastTime:Number(audio.currentTime||0),lastMoveAt:now(),candidateAt:0,candidateReason:'',lastRecoverAt:0,softAttempts:0,hardAttempts:0,manualStopAt:0};
      states.set(audio,s);
    }
    return s;
  }
  function markMove(audio,s){
    const t=Number(audio.currentTime||0);
    if(Math.abs(t-s.lastTime)>.05){s.lastTime=t;s.lastMoveAt=now();s.candidateAt=0;s.candidateReason='';s.softAttempts=0;}
  }
  function setDiag(name,value){try{document.documentElement.setAttribute(name,String(value));}catch(_){} }
  function suppressLegacyRecovery(){
    try{
      const orchestra=global.S666_AUDIO_HEALING_ORCHESTRA;
      if(!orchestra||orchestra.owner!==OWNER) return;
      orchestra.active=true;
      orchestra.lastRecoveryAt=now();
      setDiag('data-audio-legacy-recovery','cooldown-muted');
    }catch(_){}
  }
  function resumeContexts(){
    for(const key of ['__radioAudioContext','__mffAudioContext']){
      try{const ctx=global[key];if(ctx&&ctx.state==='suspended'){const p=ctx.resume();p?.catch?.(()=>{});}}catch(_){}
    }
  }
  function expectedToPlay(audio,s){
    if(!audio||uiSaysStopped()) return false;
    if(now()-s.manualStopAt<2500) return false;
    const mff=String(document.documentElement.getAttribute('data-mff-playing')||'');
    return s.wanted||mff==='1'||(!audio.paused&&!audio.ended&&!!sourceOf(audio));
  }
  function noteCandidate(audio,reason){
    const s=stateFor(audio);
    if(!expectedToPlay(audio,s)) return;
    if(!s.candidateAt) s.candidateAt=now();
    s.candidateReason=String(reason||'sensor');
    setDiag('data-audio-recovery-sensor',s.candidateReason);
    setDiag('data-audio-recovery-candidate-since',s.candidateAt);
  }
  function clearCandidate(audio){const s=stateFor(audio);s.candidateAt=0;s.candidateReason='';}

  async function softRecover(audio,s,reason){
    const p=profile();
    if(now()-s.lastRecoverAt<p.cooldownMs) return false;
    if(!expectedToPlay(audio,s)||!sourceOf(audio)) return false;
    s.lastRecoverAt=now();s.softAttempts+=1;
    resumeContexts();
    setDiag('data-audio-recovery-action','soft-play');
    setDiag('data-audio-recovery-reason',reason||s.candidateReason||'confirmed-stall');
    try{await Promise.resolve(audio.play());return true;}catch(_){return false;}
  }

  async function hardRecover(audio,s,reason){
    const p=profile();
    if(now()-s.lastRecoverAt<p.cooldownMs) return false;
    if(!expectedToPlay(audio,s)) return false;
    const src=sourceOf(audio);if(!src) return false;
    const targetSrc=isBackupSource(src)?PRIMARY_ROUTE:src;
    s.lastRecoverAt=now();s.hardAttempts+=1;
    resumeContexts();
    setDiag('data-audio-recovery-action',targetSrc===PRIMARY_ROUTE&&src!==PRIMARY_ROUTE?'backup-to-primary':'confirmed-reload');
    setDiag('data-audio-recovery-route',targetSrc===PRIMARY_ROUTE&&src!==PRIMARY_ROUTE?'backup-to-primary':'same-source');
    setDiag('data-audio-recovery-reason',reason||'confirmed-hard-stall');
    try{
      audio.pause();
      if(sourceOf(audio)!==targetSrc||audio.getAttribute('src')!==targetSrc) audio.src=targetSrc;
      audio.load();
      await Promise.resolve(audio.play());
      return true;
    }catch(_){return false;}
  }

  function evaluate(audio,trigger){
    if(!audio) return;
    suppressLegacyRecovery();
    const s=stateFor(audio);markMove(audio,s);
    if(!expectedToPlay(audio,s)){clearCandidate(audio);return;}
    const p=profile();
    const t=now();
    const stalledFor=Math.max(0,t-s.lastMoveAt);
    const ready=Number(audio.readyState||0),network=Number(audio.networkState||0);
    const src=sourceOf(audio);

    if(!s.candidateAt){
      if(audio.paused){s.candidateAt=t;s.candidateReason='poll-paused';}
      else if(network===3){s.candidateAt=t;s.candidateReason='poll-network-no-source';}
      else if(ready<2){s.candidateAt=t;s.candidateReason='poll-ready-low';}
      else if(stalledFor>=p.pollSeedMs){s.candidateAt=t;s.candidateReason='poll-currenttime-stall';}
      if(s.candidateAt){
        setDiag('data-audio-recovery-sensor',s.candidateReason);
        setDiag('data-audio-recovery-candidate-since',s.candidateAt);
      }
    }

    const candidateFor=s.candidateAt?Math.max(0,t-s.candidateAt):0;
    const hard=/error|abort|emptied|no-source|decode/i.test(String(s.candidateReason||trigger||''))||network===3||!src;
    setDiag('data-audio-recovery-stall-ms',stalledFor);
    setDiag('data-audio-recovery-ready',ready);
    setDiag('data-audio-recovery-network',network);

    if(!audio.paused&&ready>=2&&network===2&&stalledFor<p.pollSeedMs){clearCandidate(audio);return;}
    if(audio.paused&&candidateFor>=p.pausedConfirmMs){void softRecover(audio,s,'paused-confirmed');return;}
    if(hard&&candidateFor>=p.hardConfirmMs){
      if(stalledFor>=p.hardReloadMs) void hardRecover(audio,s,isBackupSource(src)?'backup-hard-stall-primary-failover':'hard-stall-confirmed');
      else void softRecover(audio,s,'hard-sensor-soft-first');
      return;
    }
    if(isBackupSource(src)&&candidateFor>=p.stallConfirmMs&&stalledFor>=p.hardReloadMs){
      void hardRecover(audio,s,'backup-stall-primary-failover');
      return;
    }
    if(ready<2&&candidateFor>=p.readyLowConfirmMs&&stalledFor>=p.readyLowConfirmMs){void softRecover(audio,s,'ready-low-confirmed');return;}
    if(candidateFor>=p.stallConfirmMs&&stalledFor>=p.stallConfirmMs){void softRecover(audio,s,'time-stall-confirmed');}
  }

  function markManualStop(audio){const s=stateFor(audio);s.wanted=false;s.manualStopAt=now();clearCandidate(audio);setDiag('data-audio-recovery-intent','stopped');}
  function markWanted(audio){const s=stateFor(audio);s.wanted=true;s.lastMoveAt=now();setDiag('data-audio-recovery-intent','play');}

  function attach(audio){
    if(!audio||attached.has(audio)||typeof audio.play!=='function') return false;
    attached.add(audio);const s=stateFor(audio);
    for(const ev of ['play','playing','canplay','canplaythrough']) audio.addEventListener(ev,()=>{markWanted(audio);markMove(audio,s);clearCandidate(audio);},{passive:true});
    for(const ev of ['timeupdate','progress','loadeddata']) audio.addEventListener(ev,()=>markMove(audio,s),{passive:true});
    for(const ev of ['waiting','stalled','suspend']) audio.addEventListener(ev,()=>noteCandidate(audio,ev),{passive:true});
    for(const ev of ['error','abort','emptied']) audio.addEventListener(ev,()=>noteCandidate(audio,ev),{passive:true});
    audio.addEventListener('pause',()=>{if(expectedToPlay(audio,s)) noteCandidate(audio,'pause');},{passive:true});
    setDiag('data-audio-recovery-owner',OWNER);
    return true;
  }

  function scan(){document.querySelectorAll('audio').forEach(attach);}
  function installIntentGuard(){
    document.addEventListener('click',ev=>{
      const control=ev.target?.closest?.('#pauseBtn,#stopBtn,[data-mff="pause"],[data-mff="stop"],[data-action="pause"],[data-action="stop"],button[aria-label*="Pause" i],button[aria-label*="Stop" i]');
      if(!control) return;document.querySelectorAll('audio').forEach(markManualStop);
    },true);
  }
  function installSensorHandoff(){
    if(sensorObserver) return;
    sensorObserver=new MutationObserver(()=>{
      const reason=document.documentElement.getAttribute('data-audio-sensor-event');
      if(!reason) return;document.querySelectorAll('audio').forEach(a=>noteCandidate(a,reason));
    });
    sensorObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-audio-sensor-event']});
  }
  function boot(){
    global.S666_AUDIO_AUTHORITY=Object.assign({},global.S666_AUDIO_AUTHORITY||{}, {transport:'player-owned',recovery:OWNER,legacyRecoveryMuted:true});
    global.S666_AUDIO_HEALING_ORCHESTRA=Object.assign(global.S666_AUDIO_HEALING_ORCHESTRA||{}, {active:true,owner:OWNER,version:VERSION});
    document.documentElement.setAttribute('data-audio-orchestra','active');
    suppressLegacyRecovery();
    scan();installIntentGuard();installSensorHandoff();
    if(!scanObserver&&document.body){scanObserver=new MutationObserver(scan);scanObserver.observe(document.body,{childList:true,subtree:true});}
    global.setInterval(()=>{suppressLegacyRecovery();document.querySelectorAll('audio').forEach(a=>evaluate(a,'tick'));},1000);
    for(const ev of ['focus','pageshow','online']) global.addEventListener(ev,()=>document.querySelectorAll('audio').forEach(a=>noteCandidate(a,ev)),{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden) document.querySelectorAll('audio').forEach(a=>noteCandidate(a,'visibility'));},{passive:true});
  }

  global.S666AllPlayerAudioRecovery=Object.freeze({version:VERSION,owner:OWNER,attach,scan,evaluate,noteCandidate,markManualStop,markWanted,isBackupSource});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})(window);
