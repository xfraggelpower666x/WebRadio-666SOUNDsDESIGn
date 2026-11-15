'use strict';
(() => {
  const q=(s)=>document.querySelector(s), qa=(s)=>Array.from(document.querySelectorAll(s));
  const rt=window.SoundwaveRuntime, audio=rt.audio;
  const outputMode=new URLSearchParams(location.search).get('output')==='1';
  let mode='local', soundCloudErrorSkips=0, radioCfg=null, np={}, poll=0, messengerPoll=0, lastPlayerMessageId='', lastDiscordTrack='', discordAutoEnabled=false, radioUsingFallback=false, radioFailoverBusy=false, radioFallbackFailed=false, radioFailoverAttempts=0, radioRecoveryTimer=0, radioRecoveryBusy=false, analyzer=null, barEngine=null, geometry=null, geometryCanvas=null, shaderHost=null, shaderKey='', milkdrop=null, milkdropCanvas=null, importedMilkdrop=null, milkdropLiveSyncId='', senderId=localStorage.getItem('s666-sender-id');
  let radioPreference='auto', radioGeneration=0, radioPlaybackState='INACTIVE', radioLoaded=false;
  let discordAutoCheckVersion=0, remoteHealthGeneration=0;
  const soundCloudPlayback=window.createSoundCloudPlayback(audio,window.Hls,message=>{if(mode==='soundcloud'){q('#soundcloud-state').textContent=message;rt.reportPlaybackError(message);}});
  if(!senderId){senderId='sw666-'+crypto.randomUUID();localStorage.setItem('s666-sender-id',senderId);}
  const state=(t)=>{const e=q('#radio-action-state');if(e)e.textContent=t;};
  const artBg=q('#source-artwork-bg'), visualHeader=q('#radio-visual-header'), ticker=q('#source-nowplaying-ticker'), tickerTrack=q('#source-nowplaying-track');
  const tuneTicker=()=>{
    if(!ticker||!tickerTrack||ticker.classList.contains('hidden'))return;
    requestAnimationFrame(()=>{
      const viewport=Math.max(1,ticker.clientWidth);
      const textWidth=Math.max(1,tickerTrack.scrollWidth);
      const fits=textWidth<=viewport*.82;
      tickerTrack.classList.toggle('rw-ticker-static',fits);
      if(fits){
        tickerTrack.style.removeProperty('--rw-ticker-start');
        tickerTrack.style.removeProperty('--rw-ticker-end');
        tickerTrack.style.removeProperty('--rw-ticker-duration');
        return;
      }
      const gap=Math.max(70,Math.min(220,viewport*.16));
      const distance=viewport+textWidth+gap;
      const speed=Math.max(85,Math.min(150,viewport/8));
      const duration=Math.max(7,Math.min(18,distance/speed));
      tickerTrack.style.setProperty('--rw-ticker-start',viewport+'px');
      tickerTrack.style.setProperty('--rw-ticker-end',(-textWidth-gap)+'px');
      tickerTrack.style.setProperty('--rw-ticker-duration',duration.toFixed(2)+'s');
      tickerTrack.style.animation='none';
      void tickerTrack.offsetWidth;
      tickerTrack.style.animation='';
    });
  };
  if('ResizeObserver' in window&&ticker)new ResizeObserver(tuneTicker).observe(ticker);
  window.addEventListener('resize',tuneTicker);
  const statusPanel=q('#radio-status-panel'), statusArtwork=q('#radio-status-artwork'), statusTitle=q('#radio-status-title'), statusArtist=q('#radio-status-artist'), statusDj=q('#radio-status-dj'), statusRoute=q('#radio-status-route'), statusListeners=q('#radio-status-listeners'), statusStream=q('#radio-status-stream');
  // Stream artwork hardlock: supplied stream artwork always wins. Fallback branding is only allowed when artwork is absent.
  const artworkOf=o=>{
    const raw=String(
      o?.artwork_hd||o?.artworkHD||o?.cover_hd||o?.coverHD||o?.image_hd||o?.imageHD||
      o?.artwork||o?.artwork_url||o?.cover||o?.image||o?.album_art||o?.thumbnail||''
    ).trim();
    if(!raw)return '';
    // Preserve provider artwork. Only request a higher SoundCloud rendition when the known token is present.
    return raw.replace('-large.','-t1080x1080.').replace('-t500x500.','-t1080x1080.');
  };
  const cleanText=(v,fallback='—')=>{const s=String(v??'').trim();return s||fallback;};
  const radioRoute=()=>radioFallbackFailed?'DEGRADED':(radioUsingFallback?'FALLBACK':'MAIN');
  const radioStreamSummary=(data={})=>[data.bitrate||data.kbps||'',data.codec||data.format||'',data.sampleRate||data.sample_rate||data.samplerate||''].filter(Boolean).map(String).join(' · ')||'LIVE';
  const overlayPrefs=()=>({tickerEnabled:q('#radio-ticker-enabled')?.checked!==false,statusEnabled:q('#radio-status-enabled')?.checked!==false,overlayMode:q('#display-visual-mode')?.value||'visual+ticker+status'});
  function updateRadioStatus(kind,data={}){
    if(!statusPanel)return;
    const prefs=overlayPrefs();
    const outputOverlay=String(data.overlayMode||prefs.overlayMode);
    const showStatus=kind==='radio'&&(outputMode?outputOverlay==='visual+ticker+status':(data.statusEnabled??prefs.statusEnabled));
    statusPanel.classList.toggle('hidden',!showStatus);
    if(!showStatus)return;
    const art=artworkOf(data);
    if(statusArtwork){
      const fallbackArt=window.RWAssets?.inAppLogo||'';
      const useFallback=()=>{
        if(statusArtwork.dataset.artworkSource==='fallback')return;
        statusArtwork.dataset.artworkSource='fallback';
        if(fallbackArt){statusArtwork.src=fallbackArt;statusArtwork.style.visibility='visible';}else{statusArtwork.removeAttribute('src');statusArtwork.style.visibility='hidden';}
      };
      statusArtwork.onerror=()=>{
        if(statusArtwork.dataset.artworkSource==='stream')useFallback();
        else statusArtwork.style.visibility='hidden';
      };
      if(art){
        statusArtwork.dataset.artworkSource='stream';
        statusArtwork.src=art;
        statusArtwork.style.visibility='visible';
      }else{
        useFallback();
      }
    }
    if(statusTitle)statusTitle.textContent=cleanText(data.title||data.name||data.track,'RADIO WAVE v6.66');
    if(statusArtist)statusArtist.textContent=cleanText(data.artist||data.user||data.station,'666SOUNDsDESIGn');
    if(statusDj)statusDj.textContent=cleanText(data.dj);
    if(statusRoute)statusRoute.textContent=cleanText(data.routeState,radioRoute());
    if(statusListeners)statusListeners.textContent=cleanText(data.listeners||data.listener_count||data.listenerCount);
    if(statusStream)statusStream.textContent=radioStreamSummary(data);
  }
  function composeStage(kind,data={}){
    const art=artworkOf(data);
    if(artBg){
      artBg.style.backgroundImage=art?`url(${JSON.stringify(art).slice(1,-1)})`:'';
      // Radio artwork belongs in the HD status panel; never blow it up behind Soundwave.
      artBg.classList.toggle('active',!!art&&kind==='soundcloud');
    }
    if(visualHeader)visualHeader.classList.toggle('hidden',kind!=='radio');
    const prefs=overlayPrefs();
    const outputOverlay=String(data.overlayMode||prefs.overlayMode);
    const showTicker=kind!=='local'&&(outputMode?outputOverlay!=='visual':(kind!=='radio'||(data.tickerEnabled??prefs.tickerEnabled)));
    if(ticker){
      ticker.classList.toggle('hidden',!showTicker);
      if(showTicker){
        const artist=cleanText(data.artist||data.user||data.dj,'666SOUNDsDESIGn');
        const title=cleanText(data.title||data.name||data.track,'');
        const dj=cleanText(data.dj,'');
        if(kind==='radio'){
          const bits=[artist,title&&title!=='—'?title:'',dj&&dj!=='—'&&dj!==artist?'DJ: '+dj:'',data.listeners||data.listener_count?('Listeners: '+(data.listeners||data.listener_count)):'',data.bitrate||data.kbps?((data.bitrate||data.kbps)+' kbps'):'',cleanText(data.routeState,radioRoute())].filter(Boolean);
          tickerTrack.textContent=bits.join('   •   '); tuneTicker();
        }else { tickerTrack.textContent=`${artist} — ${title}`; tuneTicker(); }
      }
    }
    updateRadioStatus(kind,data);
  }

  async function setMode(next){
    if(mode==='soundcloud'&&next!=='soundcloud')soundCloudPlayback.stop();
    if(next!=='local')window.RWLocalQueue?.cancelTransition();
    radioGeneration++;radioLoaded=false;radioPlaybackState=next==='radio'?'CONNECTING':'INACTIVE';
    mode=next;
    updatePlayerRadioStatus();
    document.body.classList.remove('source-local','source-radio','source-soundcloud');
    document.body.classList.add('source-'+next);
    qa('.source-btn').forEach(b=>b.classList.toggle('active',b.dataset.source===next));
    q('#radio-controls').classList.toggle('hidden',next!=='radio'); q('#soundcloud-controls').classList.toggle('hidden',next!=='soundcloud');
    window.api.syncSource({mode:next});
    if(next==='radio'){
      await startRadio();
      return;
    }
    clearTimeout(poll);clearTimeout(radioRecoveryTimer);poll=0;radioRecoveryTimer=0;radioUsingFallback=false;radioFallbackFailed=false;radioFailoverAttempts=0;radioFailoverBusy=false;radioRecoveryBusy=false;
    if(next==='local'){
      rt.setStatus('Local mode');
      composeStage('local');
      try{
        const state=await window.RWLocalQueue?.resumeCurrent?.({autoplay:true});
        if(mode==='local'&&!state?.count){audio.pause();rt.setStatus('Local mode · add audio files');}
      }catch(e){if(mode==='local')state('LOCAL · '+String(e.message||e));}
    }
  }
  const radioUrl=(fallback=false)=>new URL(fallback?radioCfg.fallback:radioCfg.stream,radioCfg.radioBase).href;
  function updatePlayerRadioStatus(){
    const active=mode==='radio', selector=q('#player-radio-route'), route=q('#player-radio-route-state'), now=q('#player-radio-now'), details=q('#player-radio-details');
    if(selector){selector.disabled=!active||!radioLoaded||outputMode;selector.value=radioPreference;}
    if(route){
      route.textContent=active?(radioLoaded?(radioUsingFallback?'FALLBACK':'MAIN')+' · '+radioPlaybackState:'RADIO · '+radioPlaybackState):'RADIO INACTIVE';
      route.dataset.state=radioPlaybackState==='ERROR'?'error':radioPlaybackState.toLowerCase();
    }
    if(now){now.textContent=active?[cleanText(np.artist||np.dj,''),cleanText(np.title||np.song||np.track||np.songtitle,'')].filter(Boolean).join(' — ')||'Now playing unavailable':'—';now.title=now.textContent;}
    if(details){
      const listeners=np.listeners??np.listener_count??np.listenerCount;
      const stream=[np.bitrate||np.kbps,np.codec||np.format,np.sampleRate||np.sample_rate||np.samplerate].filter(Boolean).join(' · ');
      details.textContent=active?`DJ: ${cleanText(np.dj)} · LISTENERS: ${cleanText(listeners)} · STREAM: ${cleanText(stream)}`:'DJ: — · LISTENERS: — · STREAM: —';
    }
  }
  function publishRadioRoute(src){
    const routeState=radioRoute();
    window.api.syncSource({mode:'radio',...(src?{src}:{}),routeState,...overlayPrefs()});
    composeStage('radio',{...np,routeState,...overlayPrefs()});
    updatePlayerRadioStatus();
  }
  const stopRadioRecovery=()=>{clearTimeout(radioRecoveryTimer);radioRecoveryTimer=0;};
  const scheduleRadioRecovery=(delay=45000+Math.floor(Math.random()*30001))=>{stopRadioRecovery();if(mode!=='radio'||!radioUsingFallback||radioPreference!=='auto'||outputMode)return;radioRecoveryTimer=setTimeout(()=>recoverRadioMain(),delay);};
  async function probeRadioMain(){const probe=new Audio();probe.muted=true;probe.preload='none';probe.src=radioUrl(false);return await new Promise(resolve=>{let done=false;const finish=(ok)=>{if(done)return;done=true;clearTimeout(timer);probe.pause();probe.removeAttribute('src');try{probe.load();}catch{}resolve(ok);};const timer=setTimeout(()=>finish(false),10000);probe.addEventListener('canplay',()=>finish(true),{once:true});probe.addEventListener('error',()=>finish(false),{once:true});probe.load();probe.play().catch(()=>{});});}
  async function recoverRadioMain(){
    if(mode!=='radio'||!radioUsingFallback||radioPreference!=='auto'||radioRecoveryBusy||outputMode)return;
    const generation=radioGeneration;radioRecoveryBusy=true;state('RADIO RECOVERY · CHECKING MAIN');
    try{
      if(await probeRadioMain()){
        if(generation!==radioGeneration||mode!=='radio'||radioPreference!=='auto'||!radioUsingFallback)return;
        const resume=!audio.paused,src=radioUrl(false);radioUsingFallback=false;radioFallbackFailed=false;radioFailoverAttempts=0;audio.src=src;audio.load();publishRadioRoute(src);rt.enablePlayback();if(resume)await audio.play();
        if(generation!==radioGeneration||mode!=='radio')return;
        stopRadioRecovery();rt.setStatus('666 Radio ready · MAIN');state('RADIO RECOVERY · MAIN RESTORED');return;
      }
      if(generation===radioGeneration&&mode==='radio')state('RADIO RECOVERY · FALLBACK STABLE');
    }catch(e){if(generation===radioGeneration&&mode==='radio')state('RADIO RECOVERY · '+e.message);}
    finally{if(generation===radioGeneration){radioRecoveryBusy=false;if(mode==='radio'&&radioUsingFallback)scheduleRadioRecovery();}}
  }
  const scheduleNowPlaying=()=>{clearTimeout(poll);if(mode!=='radio'){poll=0;return;}poll=setTimeout(async()=>{await refreshNP();scheduleNowPlaying();},document.hidden?30000:10000);};
  async function startRadio(){
    const generation=radioGeneration;
    try{const cfg=radioCfg||await window.api.radioConfig();if(generation!==radioGeneration||mode!=='radio')return;radioCfg=cfg;stopRadioRecovery();radioPreference='auto';radioUsingFallback=false;radioFallbackFailed=false;radioFailoverAttempts=0;radioFailoverBusy=false;radioRecoveryBusy=false;radioLoaded=true;np={};const src=radioUrl(false);audio.pause();audio.src=src;audio.load();radioPlaybackState='CONNECTING';publishRadioRoute(src);rt.enablePlayback();rt.setStatus('666 Radio ready · MAIN');q('#seek-slider').disabled=true;await refreshNP();if(generation===radioGeneration&&mode==='radio')scheduleNowPlaying();}catch(e){if(generation===radioGeneration&&mode==='radio'){radioPlaybackState='ERROR';updatePlayerRadioStatus();state('RADIO ERROR · '+e.message);}}
  }
  async function refreshNP(){try{
    const generation=radioGeneration;const x=await window.api.radioNowPlaying();if(mode!=='radio'||generation!==radioGeneration)return;const n=x.nowplaying||x.now_playing||x;np=(n&&typeof n==='object')?{...x,...n}:{};
    const title=n.title||n.song||n.track||n.songtitle||'666SOUNDsDESIGn';
    const artist=n.artist||n.dj||'ONLINE RADIO';
    const dj=n.dj||x.dj||'';
    const streamMeta={
      mode:'radio',name:title,title,artist,dj,artwork:artworkOf(np),
      listeners:np.listeners||np.listener_count||np.listenerCount||'',
      bitrate:np.bitrate||np.kbps||'',
      codec:np.codec||np.format||'',
      sampleRate:np.sampleRate||np.sample_rate||np.samplerate||'',
      station:np.station||np.station_name||'RADIO WAVE v6.66',
      routeState:radioRoute(),
      ...overlayPrefs()
    };
    q('#radio-now-title').textContent=title;q('#radio-now-artist').textContent=artist;q('#input-title').value=title;q('#input-artist').value=artist;
    composeStage('radio',{...np,...streamMeta});updatePlayerRadioStatus();window.api.syncSource(streamMeta);
    const key=[artist,title].join(' – ');if(discordAutoEnabled&&(n.title||n.song||n.track||n.songtitle)&&key&&key!==lastDiscordTrack){lastDiscordTrack=key;window.api.discordNowPlaying(metadata()).then(r=>state('AUTO NOW PLAYING · '+actionOutcome(r))).catch(e=>{disableDiscordAuto();state('AUTO NOW PLAYING · ERROR · '+e.message);});}
  }catch(e){state('NOWPLAYING · '+e.message);}}
  document.addEventListener('visibilitychange',()=>{if(mode==='radio')scheduleNowPlaying();clearTimeout(messengerPoll);messengerPoll=setTimeout(refreshPlayerMessenger,250);});
  window.addEventListener('online',()=>{if(mode==='radio'&&radioUsingFallback)scheduleRadioRecovery(1500);});
  for(const [event,status] of [['loadstart','CONNECTING'],['play','CONNECTING'],['playing','PLAYING'],['waiting','BUFFERING'],['stalled','BUFFERING'],['pause','PAUSED'],['canplay','PAUSED']]){
    audio.addEventListener(event,()=>{if(mode!=='radio'||!radioLoaded||outputMode)return;if((event==='waiting'||event==='stalled')&&audio.paused)return;if(event==='canplay'&&!audio.paused)return;if(event==='pause'&&radioPlaybackState==='ERROR')return;radioPlaybackState=status;updatePlayerRadioStatus();});
  }
  q('#player-radio-route')?.addEventListener('change',async e=>{
    if(mode!=='radio'||!radioLoaded||outputMode)return;
    const preference=e.target.value;if(!['auto','main','fallback'].includes(preference))return;
    const generation=++radioGeneration,resume=!audio.paused;radioPreference=preference;stopRadioRecovery();radioRecoveryBusy=false;radioFailoverBusy=false;radioFailoverAttempts=0;radioFallbackFailed=false;radioUsingFallback=preference==='fallback';
    const src=radioUrl(radioUsingFallback);audio.src=src;audio.load();radioPlaybackState='CONNECTING';publishRadioRoute(src);rt.enablePlayback();scheduleNowPlaying();
    if(resume)try{await audio.play();}catch(err){if(generation===radioGeneration&&mode==='radio'){if(err.name==='NotAllowedError'){radioPlaybackState='BLOCKED';updatePlayerRadioStatus();}state('RADIO ROUTE · '+err.message);}}
  });
  audio.addEventListener('error',async()=>{
    if(mode!=='radio'||outputMode||!radioCfg||!radioLoaded)return;
    radioPlaybackState='ERROR';
    if(radioPreference!=='auto'){radioFallbackFailed=true;state('RADIO ROUTE · '+(radioUsingFallback?'FALLBACK':'MAIN')+' UNAVAILABLE');publishRadioRoute();return;}
    if(radioUsingFallback){radioFallbackFailed=true;state('RADIO DEGRADED · MAIN + FALLBACK UNAVAILABLE');publishRadioRoute();scheduleRadioRecovery(5000);return;}
    if(radioFailoverBusy)return;
    if(radioFailoverAttempts>=1){radioFallbackFailed=true;state('RADIO DEGRADED · FAILOVER BUDGET EXHAUSTED');publishRadioRoute();return;}
    const generation=radioGeneration;radioFailoverBusy=true;radioFailoverAttempts++;
    try{const src=radioUrl(true);radioUsingFallback=true;radioFallbackFailed=false;audio.src=src;audio.load();radioPlaybackState='CONNECTING';publishRadioRoute(src);rt.enablePlayback();await audio.play();if(generation!==radioGeneration||mode!=='radio')return;if(!radioFallbackFailed){rt.setStatus('666 Radio ready · FALLBACK');state('RADIO FAILOVER · FALLBACK ACTIVE');scheduleRadioRecovery();}}
    catch(e){if(generation===radioGeneration&&mode==='radio'){if(e.name==='NotAllowedError'){radioPlaybackState='BLOCKED';updatePlayerRadioStatus();}else{radioFallbackFailed=true;radioPlaybackState='ERROR';publishRadioRoute();}state('RADIO FAILOVER ERROR · '+e.message);scheduleRadioRecovery(5000);}}
    finally{if(generation===radioGeneration)radioFailoverBusy=false;}
  });
  updatePlayerRadioStatus();
  function metadata(){const title=q('#radio-now-title').textContent,artist=q('#radio-now-artist').textContent;return {artist,title,track:title,nowPlaying:[artist,title].filter(Boolean).join(' – '),listeners:np.listeners||np.listener_count||'',bitrate:np.bitrate||np.kbps||'',dj:np.dj||'',source:'SoundwaveStudio 666 Radio',artwork:np.artwork||np.cover||np.image||''};}
  async function refreshRemoteHealth(){
    const remote=q('#radio-runtime-health'),sc=q('#soundcloud-runtime-health');
    const generation=++remoteHealthGeneration;
    try{
      const h=await window.api.remoteHealth();
      if(generation!==remoteHealthGeneration)return h;
      if(remote){
        const admin=h?.admin?.ok?'ADMIN AUTHENTICATED':'ADMIN '+String(h?.admin?.error||'LOGIN REQUIRED').toUpperCase();
        const skip=h?.skip?.ok?(h.skip.configured===false?'SKIP BRIDGE NOT CONFIGURED':'SKIP STATUS REACHABLE'):'SKIP '+String(h?.skip?.error||h?.skip?.status||'ERROR').toUpperCase();
        const msg=h?.messenger?.ok?'MESSENGER STATUS REACHABLE':'MESSENGER '+String(h?.messenger?.error||h?.messenger?.status||'ERROR').toUpperCase();
        remote.textContent='REMOTE HEALTH · '+admin+' · '+skip+' · '+msg;
      }
      const session=q('#radio-auth-state');if(session)session.textContent=h?.admin?.ok?'SESSION · AUTHENTICATED':'SESSION · '+String(h?.admin?.error||'NOT AUTHENTICATED').toUpperCase();
      if(sc)sc.textContent='SOUNDCLOUD HEALTH · '+String(h?.soundcloud||'UNKNOWN').replaceAll('_',' ');
      return h;
    }catch(e){
      if(generation!==remoteHealthGeneration)return null;
      if(remote)remote.textContent='REMOTE HEALTH · ERROR · '+String(e.message||e);
      if(sc)sc.textContent='SOUNDCLOUD HEALTH · ERROR · '+String(e.message||e);
      return null;
    }
  }
  function disableDiscordAuto(){discordAutoCheckVersion++;discordAutoEnabled=false;lastDiscordTrack='';const auto=q('#discord-auto');if(auto)auto.checked=false;}
  const actionOutcome=r=>r?.skipped?'SKIPPED · '+String(r.reason||'server declined'):r?.partial?'PARTIAL · CHECK DELIVERY':'ACCEPTED';
  async function act(label,fn){
    state(label+' · SENDING…');
    try{
      const r=await fn();
      if(r&&r.ok===false)throw new Error(r.error||r.reason||'action_rejected');
      state(label+' · '+actionOutcome(r));
      refreshRemoteHealth();
      return r;
    }catch(e){
      state(label+' · ERROR · '+e.message);
      refreshRemoteHealth();
      throw e;
    }
  }
  qa('.source-btn').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.source).catch(e=>state('SOURCE SWITCH · '+String(e.message||e)))));
  q('#radio-login').onclick=()=>act('LOGIN',async()=>{disableDiscordAuto();try{return await window.api.adminLogin(q('#radio-password').value);}finally{q('#radio-password').value='';}}).catch(()=>{});
  q('#radio-auth-check')?.addEventListener('click',()=>act('SESSION CHECK',async()=>{try{const r=await window.api.adminCheck();if(!r?.ok)disableDiscordAuto();return r;}catch(e){disableDiscordAuto();throw e;}}).catch(()=>{}));
  q('#radio-logout')?.addEventListener('click',()=>act('LOGOUT',async()=>{disableDiscordAuto();return window.api.adminLogout();}).catch(()=>{}));
  let probeGeneration=0;
  for(const name of ['password-health','auth-health','auth-debug','admin-debug','radio-debug','discord-status']){
    q('#radio-probe-'+name)?.addEventListener('click',async()=>{const generation=++probeGeneration,target=q('#radio-probe-result');target.textContent=name+' · CHECKING…';try{const r=await window.api.adminProbe(name);if(generation===probeGeneration)target.textContent=name+' · '+JSON.stringify(r,null,2);}catch(e){if(generation===probeGeneration)target.textContent=name+' · ERROR · '+String(e.message||e);}});
  }
  async function sendRadioTest(kind){
    state(kind.toUpperCase()+' TEST · WAITING FOR CONFIRMATION…');
    try{const r=await window.api.adminTestMessage(kind);if(r?.cancelled){state(kind.toUpperCase()+' TEST · CANCELLED');return;}if(!r?.ok)throw new Error(r?.reason||'test_rejected');state(kind.toUpperCase()+' TEST · '+(r.skipped?'SKIPPED':r.partial?'PARTIAL · CHECK DELIVERY':'ACCEPTED · DELIVERY NOT VERIFIED')+(kind==='broadcast'?' · SOURCE '+String(r.source||'unknown'):''));
    }catch(e){state(kind.toUpperCase()+' TEST · ERROR · '+String(e.message||e));}
  }
  q('#radio-discord-test')?.addEventListener('click',()=>sendRadioTest('discord'));
  q('#radio-broadcast-test')?.addEventListener('click',()=>sendRadioTest('broadcast'));
  const configFields=[
    ['primaryStream','primary',false],['backupStream','backup',false],['emergencyStream','emergency',false],
    ['primaryStreams','primary-list',true],['backupStreams','backup-list',true],['emergencyStreams','emergency-list',true],['metadataUpstreams','metadata-list',true]
  ];
  const configState=text=>{const el=q('#radio-config-state');if(el)el.textContent=text;};
  const configSummary=r=>Object.entries(r.fields||{}).map(([name,value])=>`${name}: ${value.configured?`${value.count} · ${(value.origins||[]).join(', ')}`:'not configured'}`).join('\n');
  q('#radio-config-load')?.addEventListener('click',async()=>{configState('LOADING CONFIGURATION…');try{const r=await window.api.adminConfigCurrent();q('#radio-config-current').textContent='Stored config version: '+String(r.version??'unknown')+'\n'+configSummary(r);configState('CONFIGURATION LOADED · URL PATHS HIDDEN');}catch(e){configState('CONFIGURATION ERROR · '+String(e.message||e));}});
  q('#radio-config-list')?.addEventListener('click',async()=>{configState('LOADING BACKUPS…');try{const r=await window.api.adminConfigBackups();q('#radio-config-backups').textContent=r.items.length?r.items.map(item=>item.name+' · '+String(item.size??'?')+' bytes').join('\n'):'No backups reported';configState('BACKUPS LOADED');}catch(e){configState('BACKUPS ERROR · '+String(e.message||e));}});
  q('#radio-config-active')?.addEventListener('click',async()=>{configState('CHECKING ACTIVE CONFIGURATION…');try{const r=await window.api.adminConfigActive();q('#radio-config-active-state').textContent='Active version: '+String(r.version??'unknown')+' · source: '+r.source+'\n'+configSummary(r)+'\nmetadata upstreams: '+String(r.metadataUpstreamCount??'unknown');configState('ACTIVE CONFIGURATION READ');}catch(e){configState('ACTIVE CONFIGURATION ERROR · '+String(e.message||e));}});
  function configPayload(){
    const payload={};
    for(const [key,id,isList] of configFields){
      const mode=q('#radio-config-'+id+'-mode').value;if(mode==='keep')continue;
      if(mode==='clear'){payload[key]=isList?[]:'';continue;}
      if(mode!=='set')throw new Error('invalid_field_mode');
      const raw=q('#radio-config-'+id).value.trim(),values=isList?raw.split(/\r?\n/).map(v=>v.trim()).filter(Boolean):[raw];
      if(!values.length||values.length>12||values.some(v=>!v))throw new Error('invalid_'+key);
      for(const value of values){let parsed;try{parsed=new URL(value);}catch{throw new Error('invalid_'+key);}if(value.length>2048||!['http:','https:'].includes(parsed.protocol))throw new Error('invalid_'+key);}
      payload[key]=isList?values:values[0];
    }
    if(!Object.keys(payload).length)throw new Error('no_config_changes');
    const note=q('#radio-config-note').value.trim();if(note)payload.note=note;
    return payload;
  }
  async function configMutation(label,operation){
    configState(label+' · WAITING FOR CONFIRMATION…');
    try{
      const r=await operation();
      if(r?.cancelled){configState(label+' · CANCELLED');return;}
      if(!r?.ok)throw new Error(r?.reason||'request_rejected');
      const activation=r.effectiveImmediately?'IMMEDIATE ACTIVATION REPORTED':r.deploymentPending?'DEPLOYMENT PENDING':'ACTIVATION UNKNOWN';
      configState(label+' · ACCEPTED · '+activation+' · CHECK ACTIVE');
      return true;
    }catch(e){configState(label+' · ERROR · '+String(e.message||e)+' · BACKUPS MAY HAVE CHANGED; CHECK CURRENT');}
  }
  q('#radio-config-preview')?.addEventListener('click',()=>{try{const payload=configPayload();q('#radio-config-preview-state').textContent=Object.entries(payload).map(([key,value])=>{if(key==='note')return 'note: provided';const values=Array.isArray(value)?value:(value?[value]:[]);return key+': '+(values.length?values.length+' · '+[...new Set(values.map(v=>new URL(v).origin))].join(', '):'CLEAR');}).join('\n');configState('PREVIEW READY · URL PATHS HIDDEN');}catch(e){configState('PREVIEW · ERROR · '+String(e.message||e));}});
  q('#radio-config-update')?.addEventListener('click',async()=>{let payload;try{payload=configPayload();}catch(e){configState('UPDATE · ERROR · '+String(e.message||e));return;}if(await configMutation('UPDATE',()=>window.api.adminConfigUpdate(payload))){for(const [,id] of configFields){q('#radio-config-'+id+'-mode').value='keep';q('#radio-config-'+id).value='';}q('#radio-config-note').value='';}});
  q('#radio-config-rollback')?.addEventListener('click',()=>configMutation('ROLLBACK',()=>window.api.adminConfigRollback()));
  q('#radio-skip').onclick=()=>act('SKIP',()=>window.api.radioSkip()).catch(()=>{});
  q('#player-message-send').onclick=()=>act('PLAYER',()=>window.api.playerAlertSend({message:q('#player-message').value,senderId})).catch(()=>{});
  const playerMessagePayload=x=>typeof x?.message==='string'?x:(x?.current||x?.alert||x?.data||null);
  async function refreshPlayerMessenger(){try{const x=await window.api.playerAlertCurrent();const m=playerMessagePayload(x);if(m&&typeof m==='object'&&m.active!==false){const mid=String(m.id||m.messageId||m.createdAt||m.timestamp||JSON.stringify(m));const from=String(m.senderId||m.clientId||'');if(mid!==lastPlayerMessageId){lastPlayerMessageId=mid;if(from!==senderId){const text=String(m.message||m.text||'').slice(0,240);if(text)q('#player-message-receive').textContent='PLAYER · '+text;}}}}catch(e){q('#player-message-receive').textContent='PLAYER · UNAVAILABLE · '+String(e.message||e);}finally{clearTimeout(messengerPoll);messengerPoll=setTimeout(refreshPlayerMessenger,document.hidden?30000:10000);}}
  refreshPlayerMessenger();
  q('#player-message-history')?.addEventListener('click',async()=>{const target=q('#player-message-history-state');try{const r=await window.api.playerAlertHistory();const items=Array.isArray(r?.items)?r.items:[];target.textContent=items.length?'HISTORY · '+items.slice(0,10).map(m=>String(m.message||m.text||'').slice(0,240)).filter(Boolean).join(' | '):'HISTORY · NO MESSAGES';}catch(e){target.textContent='HISTORY · ERROR · '+String(e.message||e);}});
  q('#discord-send').onclick=()=>act('DISCORD',()=>window.api.discordMessage(q('#discord-message').value)).catch(()=>{});
  q('#discord-now').onclick=()=>act('NOW PLAYING',()=>{if(mode!=='radio'||!(np.title||np.song||np.track||np.songtitle))throw new Error('radio_metadata_unavailable');return window.api.discordNowPlaying(metadata());}).catch(()=>{});
  q('#discord-auto')?.addEventListener('change',async e=>{if(!e.target.checked){disableDiscordAuto();return;}const generation=++discordAutoCheckVersion;try{const r=await window.api.adminCheck();if(generation!==discordAutoCheckVersion||!e.target.checked)return;if(!r?.ok)throw new Error(r?.error||'auth_required');discordAutoEnabled=true;lastDiscordTrack='';state('AUTO NOW PLAYING · ENABLED FOR TRACK CHANGES');}catch(err){if(generation!==discordAutoCheckVersion)return;disableDiscordAuto();state('AUTO NOW PLAYING · ERROR · '+String(err.message||err));}});
  q('#btn-fullscreen')?.addEventListener('click',async()=>{document.body.classList.toggle('fullframe');await window.api.setFullscreen(document.body.classList.contains('fullframe'));});
  q('#export-diagnostics')?.addEventListener('click',async()=>{try{const r=await window.api.exportRuntimeDiagnostics();state(r?.ok?'DIAGNOSTICS EXPORTED':'DIAGNOSTICS CANCELLED');}catch(e){state('DIAGNOSTICS ERROR · '+e.message);}});
  async function displays(){try{const ds=await window.api.displays();
  const applyOutputs=async()=>{const ids=[q('#display-one').value,q('#display-two').value].filter(Boolean).map(Number);try{const r=await window.api.openOutputs(ids);localStorage.setItem('s666-display-one',q('#display-one').value||'');localStorage.setItem('s666-display-two',q('#display-two').value||'');q('#display-state').textContent=`${r.displayIds.length} fullscreen output${r.displayIds.length===1?'':'s'} active · leader/follower sync`; }catch(e){q('#display-state').textContent='Output error · '+e.message;}};
  q('#display-one').addEventListener('change',applyOutputs);q('#display-two').addEventListener('change',applyOutputs);
  if(outputMode){
    document.body.classList.add('fullframe','output-only');
    window.api.onSourceState(st=>{if(st?.visual){const v=st.visual;q('#visual-engine').value=v.engine||'soundwave';if(v.milkdropPreset!=null)q('#milkdrop-preset').value=String(v.milkdropPreset);if(v.shaderPreset)q('#shader-preset').value=v.shaderPreset;if(v.geometryPreset)q('#geometry-preset').value=v.geometryPreset;if(v.importedMilkdrop)importedMilkdrop=v.importedMilkdrop;}if(st?.mode)composeStage(st.mode,st);});
    window.api.onVisualFrame?.(frame=>{rt.setExternalAnalyserFrame?.(frame);});
  }
  if(outputMode){let frames=0,last=performance.now();const beat=()=>{frames++;const now=performance.now();if(now-last>=5000){const fps=frames*1000/(now-last);frames=0;last=now;window.api.outputHeartbeat({engine:q('#visual-engine')?.value||'soundwave',fps}).catch(()=>{});}requestAnimationFrame(beat);};requestAnimationFrame(beat);}
  if(!outputMode&&window.api.sendVisualFrame){
    let lastVisualFrame=0;
    const pumpVisualFrame=()=>{const now=performance.now();if(now-lastVisualFrame>=50){lastVisualFrame=now;const an=rt.getAnalyser?.();if(an){const frequency=new Uint8Array(an.frequencyBinCount);const time=new Uint8Array(an.fftSize);an.getByteFrequencyData(frequency);an.getByteTimeDomainData(time);window.api.sendVisualFrame({frequency:Array.from(frequency),time:Array.from(time)}).catch(()=>{});}}requestAnimationFrame(pumpVisualFrame);};
    requestAnimationFrame(pumpVisualFrame);
  }
const a=q('#display-one'),b=q('#display-two');const prevA=a.value||localStorage.getItem('s666-display-one')||'';const prevB=b.value||localStorage.getItem('s666-display-two')||'';a.innerHTML='<option value="">Disabled</option>';b.innerHTML='<option value="">Disabled</option>';for(const d of ds){for(const el of [a,b]){const o=document.createElement('option');o.value=d.id;o.textContent=`${d.label} · ${d.size.width}×${d.size.height} @${d.scaleFactor}x`;el.appendChild(o);}}if([...a.options].some(o=>o.value===prevA))a.value=prevA;if([...b.options].some(o=>o.value===prevB))b.value=prevB;const os=window.api.outputStatus?await window.api.outputStatus():{active:[]};q('#display-state').textContent=`${ds.length} display${ds.length===1?'':'s'} detected · ${os.active.length} output${os.active.length===1?'':'s'} active`;}catch(e){q('#display-state').textContent='Display error · '+e.message;}}
  const tickerToggle=q('#radio-ticker-enabled'),statusToggle=q('#radio-status-enabled'),displayVisualMode=q('#display-visual-mode');
  if(tickerToggle)tickerToggle.checked=localStorage.getItem('rw666-radio-ticker')!=='0';
  if(statusToggle)statusToggle.checked=localStorage.getItem('rw666-radio-status')!=='0';
  if(displayVisualMode){const saved=localStorage.getItem('rw666-display-visual-mode');if(['visual','visual+ticker','visual+ticker+status'].includes(saved))displayVisualMode.value=saved;}
  const applyOverlayPrefs=()=>{const p=overlayPrefs();localStorage.setItem('rw666-radio-ticker',p.tickerEnabled?'1':'0');localStorage.setItem('rw666-radio-status',p.statusEnabled?'1':'0');localStorage.setItem('rw666-display-visual-mode',p.overlayMode);if(mode==='radio')composeStage('radio',{...np,routeState:radioRoute(),...p});if(!outputMode)window.api.syncSource(p);};
  tickerToggle?.addEventListener('change',applyOverlayPrefs);statusToggle?.addEventListener('change',applyOverlayPrefs);displayVisualMode?.addEventListener('change',applyOverlayPrefs);
  applyOverlayPrefs();
  displays();
  if(window.api.onDisplaysChanged) window.api.onDisplaysChanged(()=>displays());
  // CaYaDev spectrum engine is runtime-active without replacing Soundwave's audio owner.
  if(window.SVSpectrum) barEngine=new window.SVSpectrum.BarEngine();
  q('#visual-engine').addEventListener('change',(e)=>{if(e.target.value==='analysis'&&window.SVAnalysis&&!analyzer)analyzer=new window.SVAnalysis.Analyser();});
  // MilkDrop runtime controls are UI-owned state, while audio reactivity remains analyzer-owned.
  const mdNumber=(sel,fallback)=>{const el=q(sel);const n=Number(el?.value);return Number.isFinite(n)?n:fallback;};
  const milkdropRuntimeConfig=()=>({
    autoNext:q('#milkdrop-auto')?.checked===true,
    autoNextUnit:q('#milkdrop-auto-unit')?.value==='bars'?'bars':'seconds',
    autoNextSeconds:mdNumber('#milkdrop-auto-seconds',30),
    autoNextBars:mdNumber('#milkdrop-auto-bars',8),
    blendTime:mdNumber('#milkdrop-blend-time',1.5),
    hardCut:q('#milkdrop-hardcut')?.value||'off',
    hardCutBass:mdNumber('#milkdrop-hardcut-bass',1.5),
    hardCutTreb:mdNumber('#milkdrop-hardcut-treb',2.9),
    hardCutMinDelay:0.6,
    neverRepeat:q('#milkdrop-never-repeat')?.checked!==false,
    repeatWindow:mdNumber('#milkdrop-repeat-window',8),
    onTrack:q('#milkdrop-on-track')?.checked===true,
    locked:q('#milkdrop-lock')?.checked===true
  });
  const milkdropControlConfig=()=>({locked:q('#milkdrop-lock')?.checked===true,reduceMotion:'off'});

  // RADIO WAVE hardlock: every reactive extension reads the live Soundwave WebAudio Analyser. No random/demo amplitudes are permitted.
  window.SoundwaveExtensionRenderer={draw(frame){const engine=q('#visual-engine').value;if(engine==='soundwave'||!frame.analyser)return false;if(engine==='analysis'&&analyzer){const bins=new Uint8Array(frame.analyser.frequencyBinCount);const wave=new Uint8Array(frame.analyser.fftSize);frame.analyser.getByteFrequencyData(bins);frame.analyser.getByteTimeDomainData(wave);const spec=Float32Array.from(bins,v=>v/255);const time=Float32Array.from(wave,v=>(v-128)/128);analyzer.sampleRate=rt.getAudioContext()?.sampleRate||48000;analyzer.fftSize=frame.analyser.fftSize;analyzer.binHz=analyzer.sampleRate/analyzer.fftSize;analyzer.update(spec,time,1/60);q('#diag-bpm').textContent=`${analyzer.key.name} · ${analyzer.pitch.note}`;return false;}if(engine==='shader'&&window.SVShaderHost){if(!shaderHost||shaderHost.contextLost()){try{shaderHost?.dispose();}catch{}shaderHost=new window.SVShaderHost({transparent:true});shaderKey='';}const presets={neon:`void mainImage(out vec4 c,in vec2 p){vec2 uv=(p-.5*iResolution.xy)/iResolution.y;float r=length(uv);float a=atan(uv.y,uv.x);float w=.5+.5*sin(12.*r-4.*iTime+sv_bass*5.+sin(a*6.));vec3 col=mix(sv_col(.05),sv_col(.85),w);col*=.25+1.8*exp(-abs(sin(8.*r-2.*iTime))*.12/(.01+r));c=vec4(col,1.);}`,tunnel:`void mainImage(out vec4 c,in vec2 p){vec2 uv=(p-.5*iResolution.xy)/iResolution.y;float a=atan(uv.y,uv.x);float r=max(.02,length(uv));float z=1./r+iTime*.8;float rings=.5+.5*sin(z*5.+sv_bass*7.);float spokes=.5+.5*sin(a*12.+iTime+sv_treble*3.);vec3 col=mix(sv_col(.15),sv_col(.75),rings);col*=.18+1.5*pow(rings*spokes,3.);c=vec4(col,1.);}`,grid:`void mainImage(out vec4 c,in vec2 p){vec2 uv=p/iResolution.xy;float s=sv_spec(uv.x);float line=smoothstep(.018,0.,abs(uv.y-(.12+s*.76)));float grid=.08*(step(.96,fract(uv.x*24.))+step(.96,fract(uv.y*12.)));vec3 col=sv_col(uv.x)*(line*(1.+sv_beat*2.)+grid);c=vec4(col,1.);}`};const key=q('#shader-preset')?.value||'neon';if(key!==shaderKey){const r=shaderHost.setSource(presets[key],[]);if(!r.ok){state('SHADER ERROR');return false;}shaderKey=key;}if(shaderHost.canvas.width!==frame.width)shaderHost.canvas.width=frame.width;if(shaderHost.canvas.height!==frame.height)shaderHost.canvas.height=frame.height;const bins=new Uint8Array(frame.analyser.frequencyBinCount),wave=new Uint8Array(frame.analyser.fftSize);frame.analyser.getByteFrequencyData(bins);frame.analyser.getByteTimeDomainData(wave);const spec=Float32Array.from(bins,v=>v/255);const audioAdapter={level:frame.volume,bass:frame.bass,mid:frame.mid,treble:frame.treble,timeBytes:wave,getBars:(count)=>{const out=new Float32Array(count);for(let i=0;i<count;i++){const x=i*(spec.length-1)/(count-1),a=Math.floor(x),b=Math.min(spec.length-1,a+1),f=x-a;out[i]=spec[a]*(1-f)+spec[b]*f;}return out;}};const cfg={background:{gradient:{colors:[q('#color-primary').value,q('#color-secondary').value,'#a855f7','#ff2bd6','#00f2fe']}}};if(shaderHost.render(audioAdapter,cfg,frame.time/1000,1/60,[],{})){frame.ctx.drawImage(shaderHost.canvas,-frame.width/2,-frame.height/2,frame.width,frame.height);return true;}return false;}if(engine==='milkdrop'&&window.SVModes?.milkdrop){if(!milkdropCanvas){milkdropCanvas=document.createElement('canvas');milkdropCanvas.width=frame.width;milkdropCanvas.height=frame.height;milkdrop=new window.SVModes.milkdrop(milkdropCanvas);}if(milkdropCanvas.width!==frame.width)milkdropCanvas.width=frame.width;if(milkdropCanvas.height!==frame.height)milkdropCanvas.height=frame.height;const wave=new Uint8Array(frame.analyser.fftSize);frame.analyser.getByteTimeDomainData(wave);const presets=window.SVPresets?.byKind?.('milkdrop')||window.SVMilkdropBuiltins||[];const selectedPresetValue=String(q('#milkdrop-preset')?.value||'');const byId=presets.find(x=>String(x?.id||'')===selectedPresetValue);const pi=Math.max(0,Math.min(Math.max(0,presets.length-1),Number(selectedPresetValue)||0));const pr=importedMilkdrop||byId||presets[pi]||{};const audioAdapter={level:frame.volume,bass:frame.bass,mid:frame.mid,treble:frame.treble,timeBytes:wave,timeL:wave,timeR:wave};const mdCtl=milkdropRuntimeConfig();const cfg={milkdrop:{presetId:pr.id||'soundwave-default',source:pr.source||'',maxSize:1920,renderScale:1,mesh:64,accurate:true,lineStyle:'smooth',flashLimit:true,...mdCtl},milkdropControl:milkdropControlConfig(),milkdropLibrary:{},autovj:{beatsPerBar:4,bpmLock:0}};try{milkdrop.draw(audioAdapter,cfg,frame.time/1000,1/60);const live=milkdrop.livePreset?.();const liveEl=q('#milkdrop-live-preset'),cycleEl=q('#milkdrop-cycle-state');if(liveEl){const manual=importedMilkdrop?.id||pr.name||pr.id||'MANUAL';liveEl.textContent='PRESET · '+(live?.name||live?.id||manual);}if(cycleEl){const bars=live?.bars;cycleEl.textContent=bars&&bars.bpm?(`CYCLE · ${bars.bpm} BPM · BAR ${bars.count}/${bars.of||'?'}`):(mdCtl.locked?'CYCLE · LOCKED':(mdCtl.autoNext?(`CYCLE · ${mdCtl.autoNextUnit.toUpperCase()}`):'CYCLE · OFF'));}if(!outputMode&&live?.id&&live.id!==milkdropLiveSyncId){const lp=window.SVPresets?.get?.(live.id);if(lp?.source){milkdropLiveSyncId=live.id;window.api.syncSource({visual:{...visualState(),importedMilkdrop:{id:lp.id,name:lp.name||lp.id,source:lp.source}}}).catch(()=>{});}}frame.ctx.drawImage(milkdropCanvas,-frame.width/2,-frame.height/2,frame.width,frame.height);return true;}catch(e){console.error('MilkDrop render',e);state('MILKDROP ERROR');if(q('#milkdrop-state'))q('#milkdrop-state').textContent='MilkDrop error · '+String(e.message||e);return false;}}if(engine==='geometry3d'&&window.SVModes?.geometry){if(!geometryCanvas){geometryCanvas=document.createElement('canvas');geometryCanvas.width=frame.width;geometryCanvas.height=frame.height;geometry=new window.SVModes.geometry(geometryCanvas);}if(geometry.contextLost&&geometry.contextLost()){try{geometry.dispose();}catch{} geometry=new window.SVModes.geometry(geometryCanvas);}if(geometryCanvas.width!==frame.width)geometryCanvas.width=frame.width;if(geometryCanvas.height!==frame.height)geometryCanvas.height=frame.height;const bins=new Uint8Array(frame.analyser.frequencyBinCount);frame.analyser.getByteFrequencyData(bins);const spec=Float32Array.from(bins,v=>v/255);const audioAdapter={level:frame.volume,bass:frame.bass,getBars:(count)=>{const out=new Float32Array(count);for(let i=0;i<count;i++){const x=i*(spec.length-1)/(count-1);const a=Math.floor(x),b=Math.min(spec.length-1,a+1),f=x-a;out[i]=spec[a]*(1-f)+spec[b]*f;}return out;}};const gp=(q('#geometry-preset')?.value||'surface:torus').split(':');const cfg={geometry:{family:gp[0],formula:gp[1],render:gp[0]==='attractor'?'points':'wireframe',resolution:72,deform:.32,deformMode:'normal',spin:.22,tilt:.32,zoom:1,cameraAudio:.16,colorMode:'palette',alpha:1,attractorPoints:20000,attractorStep:.006},background:{gradient:{colors:[q('#color-primary').value,q('#color-secondary').value,'#a855f7','#ff2bd6','#00f2fe']}},visualizer:{minFreq:20,maxFreq:20000,spectrum:{}}};geometry.draw(audioAdapter,cfg,frame.time/1000,1/60);frame.ctx.drawImage(geometryCanvas,-frame.width/2,-frame.height/2,frame.width,frame.height);return true;}if(engine==='spectrum'&&barEngine){const bins=new Uint8Array(frame.analyser.frequencyBinCount);frame.analyser.getByteFrequencyData(bins);const spec=Float32Array.from(bins,v=>v/255);const ac=rt.getAudioContext();const bars=barEngine.compute({spec,binHz:(ac?.sampleRate||48000)/frame.analyser.fftSize},{count:72,scale:'log',amplitude:'db',floorDb:-66,attack:.02,release:.18,smooth:.22,tilt:2,dt:1/60});const c=frame.ctx,W=frame.width,H=frame.height,bw=W/bars.length;c.save();c.fillStyle=q('#color-primary').value;for(let i=0;i<bars.length;i++){const h=bars[i]*H*.72;c.fillRect(-W/2+i*bw,H/2-h,Math.max(1,bw*.72),h);}c.restore();return true;}return false;}};
  // MilkDrop Studio overlay controls.
  const milkdropPreset=q('#milkdrop-preset');
  const milkdropState=q('#milkdrop-state');
  const milkdropGpuStatus=q('#milkdrop-gpu-status');
  const milkdropHistory=[];
  let milkdropLastIndex=milkdropPreset?.selectedIndex??0;
  let milkdropLibraryFilter='all';
  let personalMilkdropDoubles=[];
  let personalMilkdropMeta=null;

  const personalStateText=()=>{
    const el=q('#milkdrop-personal-state');
    if(!el)return;
    if(!personalMilkdropMeta?.installed){el.textContent='PERSONAL LIBRARY · NOT INSTALLED';return;}
    el.textContent=`PERSONAL LIBRARY · ${personalMilkdropMeta.milk} .MILK · ${personalMilkdropMeta.milk2} .MILK2 · TOP100 ${personalMilkdropMeta.top100Count||0}`;
  };

  const refreshMilkdropPresetOptions=(preferredId)=>{
    if(!milkdropPreset)return [];
    let list=window.SVPresets?.byKind?.('milkdrop')||window.SVMilkdropBuiltins||[];
    if(milkdropLibraryFilter==='classic')list=list.filter(p=>!p.personal||p.format==='milk');
    if(milkdropLibraryFilter==='top100')list=list.filter(p=>p.top100===true);
    const current=preferredId||milkdropPreset.value;
    milkdropPreset.replaceChildren();

    if(milkdropLibraryFilter==='double'){
      for(const p of personalMilkdropDoubles){
        const o=document.createElement('option');
        o.value=String(p.id||'');
        o.textContent=String(p.name||p.id||'MilkDrop3 Double')+' · DOUBLE · INDEXED';
        o.disabled=true;
        milkdropPreset.appendChild(o);
      }
      if(milkdropState)milkdropState.textContent=`MilkDrop3 double presets · ${personalMilkdropDoubles.length} indexed · native .milk2 renderer pending`;
      return personalMilkdropDoubles;
    }

    for(const p of list){
      const o=document.createElement('option');
      o.value=String(p.id||'');
      o.textContent=String(p.name||p.id||'MilkDrop');
      if(p.personal)o.textContent+=(p.top100?' · PERSONAL · TOP100':' · PERSONAL');
      else if(!p.builtin)o.textContent+=' · IMPORT';
      milkdropPreset.appendChild(o);
    }
    if([...milkdropPreset.options].some(o=>o.value===current))milkdropPreset.value=current;
    else if(milkdropPreset.options.length)milkdropPreset.selectedIndex=0;
    milkdropLastIndex=milkdropPreset.selectedIndex;
    return list;
  };

  const installPersonalMilkdropLibrary=lib=>{
    personalMilkdropMeta=lib||null;
    personalMilkdropDoubles=Array.isArray(lib?.doubles)?lib.doubles:[];
    let accepted=0;
    for(const item of lib?.presets||[]){
      if(!item?.source)continue;
      window.SVPresets?.upsert?.({
        id:item.id,name:item.name||item.relativePath||item.id,source:item.source,
        kind:'milkdrop',engine:'milkdrop',builtin:false,personal:true,format:'milk',
        top100:item.top100===true,relativePath:item.relativePath||''
      });
      accepted++;
    }
    personalStateText();
    refreshMilkdropPresetOptions();
    return accepted;
  };

  refreshMilkdropPresetOptions();
  const personalMilkdropBoot=window.api?.personalMilkdropLibrary?.().then(lib=>{
    const accepted=installPersonalMilkdropLibrary(lib);
    if(lib?.installed){
      if(milkdropState)milkdropState.textContent=`AUTOLOADED · ${accepted} .milk ready · ${lib.milk2||0} .milk2 indexed`;
      if(q('#milkdrop-personal-state'))q('#milkdrop-personal-state').textContent=`AUTOLOADED PERSONAL LIBRARY · ${lib.milk||0} .MILK · ${lib.milk2||0} .MILK2 · TOP100 ${lib.top100Count||0}`;
    }
    return {lib,accepted};
  }).catch(e=>{
    if(milkdropState)milkdropState.textContent='Personal library autoload error · '+String(e.message||e);
    return {lib:null,accepted:0,error:e};
  });
  window.RWPersonalMilkdropBoot=personalMilkdropBoot;
  const visualEngine=q('#visual-engine');
  const setVisualEngine=(engine)=>{
    const allowed=['soundwave','spectrum','analysis','shader','geometry3d','milkdrop'];
    const next=allowed.includes(engine)?engine:'soundwave';
    visualEngine.value=next;
    localStorage.setItem('rw666-visual-engine',next);
    visualEngine.dispatchEvent(new Event('change',{bubbles:true}));
    return next;
  };
  const savedVisualEngine=localStorage.getItem('rw666-visual-engine');
  if(savedVisualEngine&&['soundwave','spectrum','analysis','shader','geometry3d','milkdrop'].includes(savedVisualEngine))visualEngine.value=savedVisualEngine;
  const milkdropActivate=()=>{setVisualEngine('milkdrop');syncVisual();if(milkdropState)milkdropState.textContent='MilkDrop active · GPU feedback renderer';};
  const milkdropDeactivate=()=>{setVisualEngine('soundwave');syncVisual();if(milkdropState)milkdropState.textContent='MilkDrop OFF · Soundwave Classic active';};
  q('#milkdrop-activate')?.addEventListener('click',milkdropActivate);
  q('#milkdrop-deactivate')?.addEventListener('click',milkdropDeactivate);
  visualEngine?.addEventListener('change',()=>{
    const engine=visualEngine.value||'soundwave';
    localStorage.setItem('rw666-visual-engine',engine);
    document.body.classList.toggle('milkdrop-active',engine==='milkdrop');
    if(engine!=='milkdrop'&&milkdropState)milkdropState.textContent='MilkDrop OFF · '+(visualEngine.options[visualEngine.selectedIndex]?.textContent||engine)+' active';
  });
  q('#visualizer-style')?.addEventListener('change',()=>{if(visualEngine?.value==='milkdrop')milkdropDeactivate();});
  const selectMilkdropIndex=(index,remember=true)=>{
    if(!milkdropPreset||!milkdropPreset.options.length)return;
    const count=milkdropPreset.options.length;
    const next=((Number(index)||0)%count+count)%count;
    if(remember&&milkdropPreset.selectedIndex!==next){milkdropHistory.push(milkdropPreset.selectedIndex);if(milkdropHistory.length>64)milkdropHistory.shift();}
    importedMilkdrop=null;milkdropPreset.selectedIndex=next;milkdropLastIndex=next;
    milkdropPreset.dispatchEvent(new Event('change',{bubbles:true}));milkdropActivate();
  };
  const stepMilkdrop=(delta)=>selectMilkdropIndex((milkdropPreset?.selectedIndex||0)+delta,true);
  q('#milkdrop-prev')?.addEventListener('click',()=>{if(milkdropHistory.length)selectMilkdropIndex(milkdropHistory.pop(),false);else stepMilkdrop(-1);});
  q('#milkdrop-next')?.addEventListener('click',()=>stepMilkdrop(1));
  q('#milkdrop-random')?.addEventListener('click',()=>{
    if(!milkdropPreset||!milkdropPreset.options.length)return;
    importedMilkdrop=null;
    let next=Math.floor(Math.random()*milkdropPreset.options.length);
    if(milkdropPreset.options.length>1&&next===milkdropPreset.selectedIndex)next=(next+1)%milkdropPreset.options.length;
    selectMilkdropIndex(next,true);
  });

  // Controlled MilkDrop import: text-only .milk preset, max size enforced in main process.
  q('#milkdrop-import').onclick=async()=>{try{const f=await window.api.openMilkdrop();if(!f)return;let compat='COMPATIBILITY · UNKNOWN';try{const probe=window.SVMilkdrop?.Preset?new window.SVMilkdrop.Preset(f.source,{accurate:true,name:f.name}):null;if(probe){const errs=Array.isArray(probe.errors)?probe.errors:[];const waves=Array.isArray(probe.waves)?probe.waves.filter(x=>x?.enabled).length:0;const shapes=Array.isArray(probe.shapes)?probe.shapes.filter(x=>x?.enabled).length:0;const warp=String(probe.file?.warpShader||'').trim()?1:0;const comp=String(probe.file?.compShader||'').trim()?1:0;compat=(errs.length?'PARTIAL':'PASS')+` · WAVES ${waves} · SHAPES ${shapes} · WARP ${warp} · COMP ${comp}`+(errs.length?` · WARN ${errs.length}`:'');}}catch(err){compat='PARTIAL · PARSER '+String(err.message||err).slice(0,80);}importedMilkdrop={id:'imported:'+f.name,name:f.name,source:f.source,kind:'milkdrop',engine:'milkdrop',builtin:false};window.SVPresets?.upsert?.(importedMilkdrop);refreshMilkdropPresetOptions(importedMilkdrop.id);milkdropActivate();if(milkdropState)milkdropState.textContent='Imported .milk · '+f.name+' · '+compat;}catch(e){if(milkdropState)milkdropState.textContent='MilkDrop import error · '+e.message;state('MILKDROP IMPORT ERROR · '+e.message);}};
  milkdropPreset?.addEventListener('change',()=>{if(milkdropPreset.selectedIndex!==milkdropLastIndex){milkdropHistory.push(milkdropLastIndex);if(milkdropHistory.length>64)milkdropHistory.shift();milkdropLastIndex=milkdropPreset.selectedIndex;}const selected=window.SVPresets?.get?.(milkdropPreset.value);importedMilkdrop=selected&&!selected.builtin?{id:selected.id,name:selected.name||selected.id,source:selected.source,kind:'milkdrop',engine:'milkdrop'}:null;milkdropLiveSyncId='';if(milkdropState)milkdropState.textContent='Preset · '+milkdropPreset.options[milkdropPreset.selectedIndex]?.textContent;});

  q('#milkdrop-import-personal')?.addEventListener('click',async()=>{
    try{
      if(milkdropState)milkdropState.textContent='Personal MilkDrop library · importing ZIP…';
      const stateResult=await window.api.importMilkdropPersonalLibrary();
      if(!stateResult)return;
      const lib=await window.api.personalMilkdropLibrary();
      const accepted=installPersonalMilkdropLibrary(lib);
      milkdropLibraryFilter='all';
      refreshMilkdropPresetOptions();
      if(milkdropState)milkdropState.textContent=`Personal library installed · ${accepted} .milk renderable · ${lib.milk2||0} .milk2 indexed · LICENSE RETAINED`;
    }catch(e){
      if(milkdropState)milkdropState.textContent='Personal library error · '+String(e.message||e);
      state('MILKDROP PERSONAL LIBRARY ERROR · '+String(e.message||e));
    }
  });

  const setMilkdropFilter=filter=>{
    milkdropLibraryFilter=filter;
    const list=refreshMilkdropPresetOptions();
    if(milkdropState)milkdropState.textContent=`Library filter · ${filter.toUpperCase()} · ${list?.length||0}`;
  };
  q('#milkdrop-filter-all')?.addEventListener('click',()=>setMilkdropFilter('all'));
  q('#milkdrop-filter-top100')?.addEventListener('click',()=>setMilkdropFilter('top100'));
  q('#milkdrop-filter-classic')?.addEventListener('click',()=>setMilkdropFilter('classic'));
  q('#milkdrop-filter-double')?.addEventListener('click',()=>setMilkdropFilter('double'));
  q('#milkdrop-license')?.addEventListener('click',async()=>{
    try{
      const x=await window.api.personalMilkdropLibraryLicense();
      if(milkdropState)milkdropState.textContent=x?.license?String(x.license).split(/\r?\n/).filter(Boolean)[0]:'Personal library license not installed';
    }catch(e){if(milkdropState)milkdropState.textContent='License read error · '+String(e.message||e);}
  });

  q('#milkdrop-import-pack')?.addEventListener('click',async()=>{
    try{
      const pack=await window.api.openMilkdropPack();
      if(!pack)return;
      let accepted=0;
      for(const item of pack.presets||[]){
        const rel=String(item.relativePath||item.name||'preset').replace(/\\/g,'/');
        const id='pack:'+rel;
        window.SVPresets?.upsert?.({id,name:item.name||rel,source:item.source,kind:'milkdrop',engine:'milkdrop',builtin:false,pack:pack.folder||''});
        accepted++;
      }
      importedMilkdrop=null;
      const list=refreshMilkdropPresetOptions();
      if(milkdropState)milkdropState.textContent=`Preset folder · ${pack.folder||'folder'} · ${accepted} loaded · ${pack.persisted||0} PERSISTED${pack.truncated?' · LIMIT REACHED':''} · LIBRARY ${list?.length||0}`;
    }catch(e){
      if(milkdropState)milkdropState.textContent='Preset folder error · '+String(e.message||e);
      state('MILKDROP PACK ERROR · '+String(e.message||e));
    }
  });

  const visualState=()=>({engine:q('#visual-engine').value||'soundwave',milkdropPreset:q('#milkdrop-preset').value,shaderPreset:q('#shader-preset').value,geometryPreset:q('#geometry-preset').value,importedMilkdrop});
  const syncVisual=()=>{if(!outputMode)window.api.syncSource({visual:visualState()});};
  const mdUi=[
    ['#milkdrop-auto-seconds','#milkdrop-auto-seconds-value',v=>Math.round(v)+'s'],
    ['#milkdrop-auto-bars','#milkdrop-auto-bars-value',v=>Math.round(v)],
    ['#milkdrop-blend-time','#milkdrop-blend-time-value',v=>Number(v).toFixed(1)+'s'],
    ['#milkdrop-hardcut-bass','#milkdrop-hardcut-bass-value',v=>Number(v).toFixed(2)],
    ['#milkdrop-hardcut-treb','#milkdrop-hardcut-treb-value',v=>Number(v).toFixed(2)],
    ['#milkdrop-repeat-window','#milkdrop-repeat-window-value',v=>Math.round(v)]
  ];
  const refreshMilkdropUi=()=>{
    const unit=q('#milkdrop-auto-unit')?.value||'seconds';
    q('#milkdrop-seconds-group')?.classList.toggle('hidden',unit!=='seconds');
    q('#milkdrop-bars-group')?.classList.toggle('hidden',unit!=='bars');
    for(const [sel,out,fmt] of mdUi){const a=q(sel),b=q(out);if(a&&b)b.textContent=fmt(a.value);}
    syncVisual();
  };
  for(const [sel] of mdUi)q(sel)?.addEventListener('input',refreshMilkdropUi);
  ['#milkdrop-auto','#milkdrop-lock','#milkdrop-never-repeat','#milkdrop-on-track','#milkdrop-auto-unit','#milkdrop-hardcut'].forEach(sel=>q(sel)?.addEventListener('change',refreshMilkdropUi));
  refreshMilkdropUi();

  // Report actual WebGL2 availability; no fake GPU PASS.
  try{
    const probe=document.createElement('canvas');
    const gl=probe.getContext('webgl2',{powerPreference:'high-performance'});
    if(milkdropGpuStatus)milkdropGpuStatus.textContent=gl?'WEBGL2 · GPU CONTEXT READY':'WEBGL2 · GPU CONTEXT UNAVAILABLE';
    const ext=gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'';
    if(gl&&renderer&&milkdropState)milkdropState.textContent='GPU · '+String(renderer).slice(0,120);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }catch{
    if(milkdropGpuStatus)milkdropGpuStatus.textContent='WEBGL2 · GPU CHECK FAILED';
  }
  ['#visual-engine','#milkdrop-preset','#shader-preset','#geometry-preset'].forEach(sel=>q(sel)?.addEventListener('change',syncVisual));
  // Apply supplied RADIO WAVE artwork from embedded package assets.
  const brandingMap=[
    ['#rw-brand-banner-img','banner'],
    ['#rw-brand-logo-img','inAppLogo'],
    ['#rw-stage-branding img','stage']
  ];
  brandingMap.forEach(([sel,key])=>{
    const img=q(sel);
    if(!img)return;
    img.addEventListener('error',()=>{img.style.display='none';});
    const src=window.RWAssets?.[key];
    if(src){img.src=src;img.style.display='block';}else img.style.display='none';
  });

  // Current SoundCloud API: credentials and OAuth stay in main process; renderer only receives metadata + internal media URL.
  refreshRemoteHealth();
  async function refreshSoundCloudStatus(){try{const x=await window.api.soundCloudStatus();q('#soundcloud-state').textContent=x.configured?`SoundCloud API configured · ${x.source==='stored'?'encrypted credentials':'environment credentials'}`:(x.encryptionAvailable?'SoundCloud API credentials required · enter and save Client ID + Secret':'Secure credential storage unavailable · environment credentials required');}catch(e){q('#soundcloud-state').textContent='SoundCloud status error · '+String(e.message||e);}}
  refreshSoundCloudStatus();
  q('#soundcloud-save-credentials').onclick=async()=>{
    const id=q('#soundcloud-client-id'),secret=q('#soundcloud-client-secret');
    try{await window.api.soundCloudSaveCredentials({clientId:id.value,clientSecret:secret.value});id.value='';secret.value='';await refreshSoundCloudStatus();}
    catch(e){q('#soundcloud-state').textContent='SoundCloud credential save failed · '+String(e.message||e);}
  };
  q('#soundcloud-clear-credentials').onclick=async()=>{
    try{await window.api.soundCloudClearCredentials();q('#soundcloud-client-id').value='';q('#soundcloud-client-secret').value='';await refreshSoundCloudStatus();}
    catch(e){q('#soundcloud-state').textContent='SoundCloud credential removal failed · '+String(e.message||e);}
  };
  q('#soundcloud-test-credentials').onclick=async()=>{
    q('#soundcloud-state').textContent='Testing SoundCloud credentials…';
    try{await window.api.soundCloudTestCredentials();q('#soundcloud-state').textContent='SoundCloud authentication successful';}
    catch(e){q('#soundcloud-state').textContent='SoundCloud authentication failed · '+String(e.message||e);}
  };
  q('#soundcloud-open').onclick=()=>window.api.soundCloudOpenCurrent().catch(e=>{q('#soundcloud-state').textContent='SoundCloud link · '+e.message;});
  const playSoundCloud=async x=>{if(mode!=='soundcloud')return;audio.pause();soundCloudPlayback.load(x);rt.enablePlayback();q('#input-title').value=x.title||'SoundCloud';q('#input-artist').value=x.artist||'SoundCloud';composeStage('soundcloud',x);q('#soundcloud-state').textContent=`${x.artist} · ${x.title}${x.preview?' · PREVIEW ONLY':''}`;q('#soundcloud-queue').textContent=`Queue · ${x.queueIndex+1} / ${x.queueLength}`;window.api.syncSource({mode:'soundcloud',src:x.mediaUrl,name:x.title,artist:x.artist,paused:false,time:0,queueIndex:x.queueIndex,queueLength:x.queueLength});rt.ensureAudioContext();await audio.play();};
  async function refreshSoundCloudLibrary(){const box=q('#soundcloud-library');box.innerHTML='<div class="file-meta-tag">Loading 666SOUNDsDESIGN library…</div>';try{const lib=await window.api.soundCloudLibrary();const esc=v=>String(v||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));const section=(name,items,kind)=>`<div class="sc-library-section"><div class="sc-library-title">${name} · ${items.length}</div>${items.map((x,i)=>`<button id="soundcloud-item-${kind}-${i}" class="sc-library-item" data-sc-url="${esc(x.permalink)}"><img src="${esc(x.artwork)}" alt=""><span>${esc(x.title)}</span><small>${x.kind==='playlist'?(x.trackCount+' tracks'):'TRACK'}</small></button>`).join('')}</div>`;box.innerHTML=section('PLAYLISTS / ALBUMS',lib.playlists||[],'playlist')+section('TRACKS',lib.tracks||[],'track');box.querySelectorAll('[data-sc-url]').forEach(b=>b.onclick=async()=>{q('#soundcloud-url').value=b.dataset.scUrl;try{await playSoundCloud(await window.api.soundCloudResolve(b.dataset.scUrl));}catch(err){q('#soundcloud-state').textContent='SoundCloud error · '+err.message;}});}catch(err){box.replaceChildren();const msg=document.createElement('div');msg.className='file-meta-tag';msg.textContent='Library unavailable · '+String(err.message||err);box.appendChild(msg);}}
  q('#soundcloud-library-refresh').onclick=refreshSoundCloudLibrary;
  refreshSoundCloudLibrary();
  q('#soundcloud-load').onclick=async()=>{const e=q('#soundcloud-state');e.textContent='Resolving SoundCloud…';try{await playSoundCloud(await window.api.soundCloudResolve(q('#soundcloud-url').value));}catch(err){e.textContent='SoundCloud error · '+err.message;}};
  q('#soundcloud-prev').onclick=async()=>{try{await playSoundCloud(await window.api.soundCloudPrevious());}catch(err){q('#soundcloud-state').textContent='SoundCloud error · '+err.message;}};
  q('#soundcloud-next').onclick=async()=>{try{await playSoundCloud(await window.api.soundCloudNext());}catch(err){q('#soundcloud-state').textContent='SoundCloud error · '+err.message;}};
  audio.addEventListener('playing',()=>{if(mode==='soundcloud')soundCloudErrorSkips=0;});
  audio.addEventListener('ended',async()=>{if(mode==='soundcloud'&&!outputMode&&!rt.isExporting()){try{await playSoundCloud(await window.api.soundCloudNext());}catch(err){q('#soundcloud-state').textContent='SoundCloud queue · '+err.message;}}});
  audio.addEventListener('error',async()=>{
    if(mode!=='soundcloud'||outputMode||soundCloudErrorSkips>=3)return;
    if(rt.isExporting()){q('#soundcloud-state').textContent='SoundCloud stream error · automatic skip paused during export';return;}
    soundCloudErrorSkips++;
    q('#soundcloud-state').textContent=`SoundCloud stream error · skipping ${soundCloudErrorSkips}/3`;
    try{
      const x=await window.api.soundCloudNext();
      await new Promise(r=>setTimeout(r,500*soundCloudErrorSkips));
      if(rt.isExporting()){q('#soundcloud-state').textContent='SoundCloud recovery paused during export';return;}
      await playSoundCloud(x);
    }catch(err){q('#soundcloud-state').textContent='SoundCloud recovery · '+err.message;}
  });
  window.addEventListener('offline',()=>{if(mode==='radio')state('NETWORK OFFLINE · STREAM MAY CONTINUE FROM BUFFER');if(mode==='soundcloud')q('#soundcloud-state').textContent='Network offline · waiting for connection';});
  window.api.onRuntimeLifecycle?.(async ev=>{
    if(ev?.type==='lyvra:system-start'){
      window.dispatchEvent(new CustomEvent('lyvra:system-start',{detail:{product:ev.product||'RADIO WAVE v6.66'}}));
      rt.setStatus('RADIO WAVE v6.66 · SYSTEM ONLINE');
      return;
    }
    if(ev?.type!=='resume'||outputMode)return;
    state('SYSTEM RESUME · REHYDRATING');
    try{if(mode==='radio'){await refreshNP();if(radioUsingFallback)scheduleRadioRecovery(1500);else if(audio.paused){rt.enablePlayback();await audio.play().catch(()=>{});}scheduleNowPlaying();}else if(mode==='soundcloud'&&audio.src&&audio.paused){rt.enablePlayback();await audio.play().catch(()=>{});}syncVisual();state('SYSTEM RESUME · READY');}catch(e){state('SYSTEM RESUME · '+e.message);}
  });
  // Best-effort media clock correction for secondary output windows. Radio is live and does not seek.
  if(!outputMode){let lastSync=0;const syncClock=()=>{const now=Date.now();if(now-lastSync<900)return;lastSync=now;window.api.syncSource({mode,...(mode==='soundcloud'?{}:{src:audio.currentSrc||audio.src}),paused:audio.paused,time:(mode==='radio'?null:audio.currentTime)});};audio.addEventListener('play',syncClock);audio.addEventListener('pause',syncClock);audio.addEventListener('seeked',syncClock);audio.addEventListener('timeupdate',syncClock);}

})();
