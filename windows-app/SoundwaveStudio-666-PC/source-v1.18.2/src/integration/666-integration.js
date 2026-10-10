'use strict';
(() => {
  const q=(s)=>document.querySelector(s), qa=(s)=>Array.from(document.querySelectorAll(s));
  const rt=window.SoundwaveRuntime, audio=rt.audio;
  const outputMode=new URLSearchParams(location.search).get('output')==='1';
  let mode='local', soundCloudErrorSkips=0, radioCfg=null, np={}, poll=0, messengerPoll=0, lastPlayerMessageId='', lastDiscordTrack='', discordAutoEnabled=false, radioUsingFallback=false, radioFailoverBusy=false, radioFallbackFailed=false, radioFailoverAttempts=0, radioRecoveryTimer=0, radioRecoveryBusy=false, analyzer=null, barEngine=null, geometry=null, geometryCanvas=null, shaderHost=null, shaderKey='', milkdrop=null, milkdropCanvas=null, importedMilkdrop=null, senderId=localStorage.getItem('s666-sender-id');
  if(!senderId){senderId='sw666-'+crypto.randomUUID();localStorage.setItem('s666-sender-id',senderId);}
  const state=(t)=>{const e=q('#radio-action-state');if(e)e.textContent=t;};
  const artBg=q('#source-artwork-bg'), visualHeader=q('#radio-visual-header'), ticker=q('#source-nowplaying-ticker'), tickerTrack=q('#source-nowplaying-track');
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
      if(art){
        statusArtwork.src=art;
        statusArtwork.dataset.artworkSource='stream';
        statusArtwork.style.visibility='visible';
      }else{
        statusArtwork.removeAttribute('src');
        statusArtwork.dataset.artworkSource='fallback';
        statusArtwork.style.visibility='hidden';
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
          tickerTrack.textContent=bits.join('   •   ');
        }else tickerTrack.textContent=`${artist} — ${title}`;
      }
    }
    updateRadioStatus(kind,data);
  }

  function setMode(next){
    mode=next; qa('.source-btn').forEach(b=>b.classList.toggle('active',b.dataset.source===next));
    q('#radio-controls').classList.toggle('hidden',next!=='radio'); q('#soundcloud-controls').classList.toggle('hidden',next!=='soundcloud');
    window.api.syncSource({mode:next});if(next==='radio') startRadio(); else {clearTimeout(poll);clearTimeout(radioRecoveryTimer);poll=0;radioRecoveryTimer=0;radioUsingFallback=false;radioFallbackFailed=false;radioFailoverAttempts=0;radioFailoverBusy=false;radioRecoveryBusy=false;if(next==='local'){rt.setStatus('Local mode');composeStage('local');}}
  }
  const radioUrl=(fallback=false)=>new URL(fallback?radioCfg.fallback:radioCfg.stream,radioCfg.radioBase).href;
  const stopRadioRecovery=()=>{clearTimeout(radioRecoveryTimer);radioRecoveryTimer=0;};
  const scheduleRadioRecovery=(delay=45000+Math.floor(Math.random()*30001))=>{stopRadioRecovery();if(mode!=='radio'||!radioUsingFallback||outputMode)return;radioRecoveryTimer=setTimeout(()=>recoverRadioMain(),delay);};
  async function probeRadioMain(){const probe=new Audio();probe.muted=true;probe.preload='none';probe.src=radioUrl(false);return await new Promise(resolve=>{let done=false;const finish=(ok)=>{if(done)return;done=true;clearTimeout(timer);probe.pause();probe.removeAttribute('src');try{probe.load();}catch{}resolve(ok);};const timer=setTimeout(()=>finish(false),10000);probe.addEventListener('canplay',()=>finish(true),{once:true});probe.addEventListener('error',()=>finish(false),{once:true});probe.load();probe.play().catch(()=>{});});}
  async function recoverRadioMain(){if(mode!=='radio'||!radioUsingFallback||radioRecoveryBusy||outputMode)return;radioRecoveryBusy=true;state('RADIO RECOVERY · CHECKING MAIN');try{if(await probeRadioMain()){const src=radioUrl(false);audio.src=src;audio.load();window.api.syncSource({mode:'radio',src,routeState:'MAIN'});rt.enablePlayback();await audio.play();radioUsingFallback=false;radioFallbackFailed=false;radioFailoverAttempts=0;stopRadioRecovery();rt.setStatus('666 Radio ready · MAIN');state('RADIO RECOVERY · MAIN RESTORED');return;}state('RADIO RECOVERY · FALLBACK STABLE');}catch(e){state('RADIO RECOVERY · '+e.message);}finally{radioRecoveryBusy=false;if(mode==='radio'&&radioUsingFallback)scheduleRadioRecovery();}}
  const scheduleNowPlaying=()=>{clearTimeout(poll);if(mode!=='radio'){poll=0;return;}poll=setTimeout(async()=>{await refreshNP();scheduleNowPlaying();},document.hidden?30000:10000);};
  async function startRadio(){
    try{radioCfg=radioCfg||await window.api.radioConfig();stopRadioRecovery();radioUsingFallback=false;radioFallbackFailed=false;radioFailoverAttempts=0;radioFailoverBusy=false;radioRecoveryBusy=false;const src=radioUrl(false);audio.pause();audio.src=src;audio.load();window.api.syncSource({mode:'radio',src,routeState:'MAIN',...overlayPrefs()});rt.enablePlayback();rt.setStatus('666 Radio ready · MAIN');q('#seek-slider').disabled=true;await refreshNP();scheduleNowPlaying();}catch(e){state('RADIO ERROR · '+e.message);}
  }
  async function refreshNP(){try{
    const x=await window.api.radioNowPlaying();const n=x.nowplaying||x.now_playing||x;np=(n&&typeof n==='object')?{...x,...n}:{};
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
    composeStage('radio',{...np,...streamMeta});window.api.syncSource(streamMeta);
    const key=[artist,title].join(' – ');if(discordAutoEnabled&&key&&key!==lastDiscordTrack){lastDiscordTrack=key;window.api.discordNowPlaying(metadata()).catch(()=>{});}
  }catch(e){state('NOWPLAYING · '+e.message);}}
  document.addEventListener('visibilitychange',()=>{if(mode==='radio')scheduleNowPlaying();clearTimeout(messengerPoll);messengerPoll=setTimeout(refreshPlayerMessenger,250);});
  window.addEventListener('online',()=>{if(mode==='radio'&&radioUsingFallback)scheduleRadioRecovery(1500);});
  audio.addEventListener('error',async()=>{if(mode!=='radio'||outputMode||radioFailoverBusy||!radioCfg)return;if(radioUsingFallback){radioFallbackFailed=true;state('RADIO DEGRADED · MAIN + FALLBACK UNAVAILABLE');window.api.syncSource({mode:'radio',routeState:'DEGRADED',...overlayPrefs()});composeStage('radio',{...np,routeState:'DEGRADED',...overlayPrefs()});scheduleRadioRecovery(5000);return;}if(radioFailoverAttempts>=1){state('RADIO DEGRADED · FAILOVER BUDGET EXHAUSTED');window.api.syncSource({mode:'radio',routeState:'DEGRADED',...overlayPrefs()});composeStage('radio',{...np,routeState:'DEGRADED',...overlayPrefs()});scheduleRadioRecovery(5000);return;}radioFailoverBusy=true;radioFailoverAttempts++;try{const src=radioUrl(true);radioUsingFallback=true;audio.src=src;audio.load();window.api.syncSource({mode:'radio',src,routeState:'FALLBACK',...overlayPrefs()});rt.enablePlayback();await audio.play();radioFallbackFailed=false;rt.setStatus('666 Radio ready · FALLBACK');state('RADIO FAILOVER · FALLBACK ACTIVE');scheduleRadioRecovery();}catch(e){radioFallbackFailed=true;state('RADIO FAILOVER ERROR · '+e.message);scheduleRadioRecovery(5000);}finally{radioFailoverBusy=false;}});
  function metadata(){const title=q('#radio-now-title').textContent,artist=q('#radio-now-artist').textContent;return {artist,title,track:title,nowPlaying:[artist,title].filter(Boolean).join(' – '),listeners:np.listeners||np.listener_count||'',bitrate:np.bitrate||np.kbps||'',dj:np.dj||'',source:'SoundwaveStudio 666 Radio',artwork:np.artwork||np.cover||np.image||''};}
  async function act(label,fn){state(label+' · SENDING…');try{const r=await fn();state(label+' · PASS');return r;}catch(e){state(label+' · ERROR · '+e.message);}}
  qa('.source-btn').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.source)));
  q('#radio-login').onclick=()=>act('LOGIN',async()=>{const r=await window.api.adminLogin(q('#radio-password').value);discordAutoEnabled=true;lastDiscordTrack='';await refreshNP();return r;});
  q('#radio-skip').onclick=()=>act('SKIP',()=>window.api.radioSkip());
  q('#player-message-send').onclick=()=>act('PLAYER',()=>window.api.playerAlertSend({message:q('#player-message').value,senderId}));
  const playerMessagePayload=x=>x?.message||x?.current||x?.alert||x?.data||null;
  async function refreshPlayerMessenger(){try{const x=await window.api.playerAlertCurrent();const m=playerMessagePayload(x);if(m&&typeof m==='object'){const mid=String(m.id||m.messageId||m.createdAt||m.timestamp||JSON.stringify(m));const from=String(m.senderId||m.clientId||'');if(mid!==lastPlayerMessageId){lastPlayerMessageId=mid;if(from!==senderId){const text=String(m.message||m.text||'').slice(0,240);if(text)q('#player-message-receive').textContent='PLAYER · '+text;}}}}catch{}finally{clearTimeout(messengerPoll);messengerPoll=setTimeout(refreshPlayerMessenger,document.hidden?30000:10000);}}
  refreshPlayerMessenger();
  q('#discord-send').onclick=()=>act('DISCORD',()=>window.api.discordMessage(q('#discord-message').value));
  q('#discord-now').onclick=()=>act('NOW PLAYING',()=>window.api.discordNowPlaying(metadata()));
  q('#btn-fullscreen').onclick=async()=>{document.body.classList.toggle('fullframe');await window.api.setFullscreen(document.body.classList.contains('fullframe'));};
  q('#export-diagnostics').onclick=async()=>{try{const r=await window.api.exportRuntimeDiagnostics();state(r?.ok?'DIAGNOSTICS EXPORTED':'DIAGNOSTICS CANCELLED');}catch(e){state('DIAGNOSTICS ERROR · '+e.message);}};
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
  // RADIO WAVE hardlock: every reactive extension reads the live Soundwave WebAudio Analyser. No random/demo amplitudes are permitted.
  window.SoundwaveExtensionRenderer={draw(frame){const engine=q('#visual-engine').value;if(engine==='soundwave'||!frame.analyser)return false;if(engine==='analysis'&&analyzer){const bins=new Uint8Array(frame.analyser.frequencyBinCount);const wave=new Uint8Array(frame.analyser.fftSize);frame.analyser.getByteFrequencyData(bins);frame.analyser.getByteTimeDomainData(wave);const spec=Float32Array.from(bins,v=>v/255);const time=Float32Array.from(wave,v=>(v-128)/128);analyzer.sampleRate=rt.getAudioContext()?.sampleRate||48000;analyzer.fftSize=frame.analyser.fftSize;analyzer.binHz=analyzer.sampleRate/analyzer.fftSize;analyzer.update(spec,time,1/60);q('#diag-bpm').textContent=`${analyzer.key.name} · ${analyzer.pitch.note}`;return false;}if(engine==='shader'&&window.SVShaderHost){if(!shaderHost||shaderHost.contextLost()){try{shaderHost?.dispose();}catch{}shaderHost=new window.SVShaderHost({transparent:true});shaderKey='';}const presets={neon:`void mainImage(out vec4 c,in vec2 p){vec2 uv=(p-.5*iResolution.xy)/iResolution.y;float r=length(uv);float a=atan(uv.y,uv.x);float w=.5+.5*sin(12.*r-4.*iTime+sv_bass*5.+sin(a*6.));vec3 col=mix(sv_col(.05),sv_col(.85),w);col*=.25+1.8*exp(-abs(sin(8.*r-2.*iTime))*.12/(.01+r));c=vec4(col,1.);}`,tunnel:`void mainImage(out vec4 c,in vec2 p){vec2 uv=(p-.5*iResolution.xy)/iResolution.y;float a=atan(uv.y,uv.x);float r=max(.02,length(uv));float z=1./r+iTime*.8;float rings=.5+.5*sin(z*5.+sv_bass*7.);float spokes=.5+.5*sin(a*12.+iTime+sv_treble*3.);vec3 col=mix(sv_col(.15),sv_col(.75),rings);col*=.18+1.5*pow(rings*spokes,3.);c=vec4(col,1.);}`,grid:`void mainImage(out vec4 c,in vec2 p){vec2 uv=p/iResolution.xy;float s=sv_spec(uv.x);float line=smoothstep(.018,0.,abs(uv.y-(.12+s*.76)));float grid=.08*(step(.96,fract(uv.x*24.))+step(.96,fract(uv.y*12.)));vec3 col=sv_col(uv.x)*(line*(1.+sv_beat*2.)+grid);c=vec4(col,1.);}`};const key=q('#shader-preset')?.value||'neon';if(key!==shaderKey){const r=shaderHost.setSource(presets[key],[]);if(!r.ok){state('SHADER ERROR');return false;}shaderKey=key;}if(shaderHost.canvas.width!==frame.width)shaderHost.canvas.width=frame.width;if(shaderHost.canvas.height!==frame.height)shaderHost.canvas.height=frame.height;const bins=new Uint8Array(frame.analyser.frequencyBinCount),wave=new Uint8Array(frame.analyser.fftSize);frame.analyser.getByteFrequencyData(bins);frame.analyser.getByteTimeDomainData(wave);const spec=Float32Array.from(bins,v=>v/255);const audioAdapter={level:frame.volume,bass:frame.bass,mid:frame.mid,treble:frame.treble,timeBytes:wave,getBars:(count)=>{const out=new Float32Array(count);for(let i=0;i<count;i++){const x=i*(spec.length-1)/(count-1),a=Math.floor(x),b=Math.min(spec.length-1,a+1),f=x-a;out[i]=spec[a]*(1-f)+spec[b]*f;}return out;}};const cfg={background:{gradient:{colors:[q('#color-primary').value,q('#color-secondary').value,'#a855f7','#ff2bd6','#00f2fe']}}};if(shaderHost.render(audioAdapter,cfg,frame.time/1000,1/60,[],{})){frame.ctx.drawImage(shaderHost.canvas,-frame.width/2,-frame.height/2,frame.width,frame.height);return true;}return false;}if(engine==='milkdrop'&&window.SVModes?.milkdrop){if(!milkdropCanvas){milkdropCanvas=document.createElement('canvas');milkdropCanvas.width=frame.width;milkdropCanvas.height=frame.height;milkdrop=new window.SVModes.milkdrop(milkdropCanvas);}if(milkdropCanvas.width!==frame.width)milkdropCanvas.width=frame.width;if(milkdropCanvas.height!==frame.height)milkdropCanvas.height=frame.height;const wave=new Uint8Array(frame.analyser.fftSize);frame.analyser.getByteTimeDomainData(wave);const presets=window.__SVMilkdropBuiltins||window.SVMilkdropBuiltins||[];const pi=Math.max(0,Math.min(presets.length-1,Number(q('#milkdrop-preset')?.value||0)));const pr=importedMilkdrop||presets[pi]||{};const audioAdapter={level:frame.volume,bass:frame.bass,mid:frame.mid,treble:frame.treble,timeBytes:wave,timeL:wave,timeR:wave};const cfg={milkdrop:{presetId:pr.id||'soundwave-default',source:pr.source||'',maxSize:1920,renderScale:1,mesh:64,accurate:true,lineStyle:'smooth',flashLimit:true,autoNext:false},milkdropControl:{reduceMotion:'off'},milkdropLibrary:{},autovj:{beatsPerBar:4,bpmLock:0}};try{milkdrop.draw(audioAdapter,cfg,frame.time/1000,1/60);frame.ctx.drawImage(milkdropCanvas,-frame.width/2,-frame.height/2,frame.width,frame.height);return true;}catch(e){console.error('MilkDrop render',e);state('MILKDROP ERROR');return false;}}if(engine==='geometry3d'&&window.SVModes?.geometry){if(!geometryCanvas){geometryCanvas=document.createElement('canvas');geometryCanvas.width=frame.width;geometryCanvas.height=frame.height;geometry=new window.SVModes.geometry(geometryCanvas);}if(geometry.contextLost&&geometry.contextLost()){try{geometry.dispose();}catch{} geometry=new window.SVModes.geometry(geometryCanvas);}if(geometryCanvas.width!==frame.width)geometryCanvas.width=frame.width;if(geometryCanvas.height!==frame.height)geometryCanvas.height=frame.height;const bins=new Uint8Array(frame.analyser.frequencyBinCount);frame.analyser.getByteFrequencyData(bins);const spec=Float32Array.from(bins,v=>v/255);const audioAdapter={level:frame.volume,bass:frame.bass,getBars:(count)=>{const out=new Float32Array(count);for(let i=0;i<count;i++){const x=i*(spec.length-1)/(count-1);const a=Math.floor(x),b=Math.min(spec.length-1,a+1),f=x-a;out[i]=spec[a]*(1-f)+spec[b]*f;}return out;}};const gp=(q('#geometry-preset')?.value||'surface:torus').split(':');const cfg={geometry:{family:gp[0],formula:gp[1],render:gp[0]==='attractor'?'points':'wireframe',resolution:72,deform:.32,deformMode:'normal',spin:.22,tilt:.32,zoom:1,cameraAudio:.16,colorMode:'palette',alpha:1,attractorPoints:20000,attractorStep:.006},background:{gradient:{colors:[q('#color-primary').value,q('#color-secondary').value,'#a855f7','#ff2bd6','#00f2fe']}},visualizer:{minFreq:20,maxFreq:20000,spectrum:{}}};geometry.draw(audioAdapter,cfg,frame.time/1000,1/60);frame.ctx.drawImage(geometryCanvas,-frame.width/2,-frame.height/2,frame.width,frame.height);return true;}if(engine==='spectrum'&&barEngine){const bins=new Uint8Array(frame.analyser.frequencyBinCount);frame.analyser.getByteFrequencyData(bins);const spec=Float32Array.from(bins,v=>v/255);const ac=rt.getAudioContext();const bars=barEngine.compute({spec,binHz:(ac?.sampleRate||48000)/frame.analyser.fftSize},{count:72,scale:'log',amplitude:'db',floorDb:-66,attack:.02,release:.18,smooth:.22,tilt:2,dt:1/60});const c=frame.ctx,W=frame.width,H=frame.height,bw=W/bars.length;c.save();c.fillStyle=q('#color-primary').value;for(let i=0;i<bars.length;i++){const h=bars[i]*H*.72;c.fillRect(-W/2+i*bw,H/2-h,Math.max(1,bw*.72),h);}c.restore();return true;}return false;}};
  // Controlled MilkDrop import: text-only .milk preset, max size enforced in main process.
  q('#milkdrop-import').onclick=async()=>{try{const f=await window.api.openMilkdrop();if(!f)return;importedMilkdrop={id:'imported:'+f.name,source:f.source};q('#visual-engine').value='milkdrop';syncVisual();state('MILKDROP IMPORT · '+f.name);}catch(e){state('MILKDROP IMPORT ERROR · '+e.message);}};
  q('#milkdrop-preset').addEventListener('change',()=>{importedMilkdrop=null;});
  const visualState=()=>({engine:q('#visual-engine').value,milkdropPreset:q('#milkdrop-preset').value,shaderPreset:q('#shader-preset').value,geometryPreset:q('#geometry-preset').value,importedMilkdrop});
  const syncVisual=()=>{if(!outputMode)window.api.syncSource({visual:visualState()});};
  ['#visual-engine','#milkdrop-preset','#shader-preset','#geometry-preset'].forEach(sel=>q(sel)?.addEventListener('change',syncVisual));
  // Current SoundCloud API: credentials and OAuth stay in main process; renderer only receives metadata + internal media URL.
  (async()=>{try{const x=await window.api.soundCloudStatus();q('#soundcloud-state').textContent=x.configured?'SoundCloud API configured · secure resolver ready':'SoundCloud API credentials required in environment';}catch{}})();
  q('#soundcloud-open').onclick=()=>window.api.soundCloudOpenCurrent().catch(e=>{q('#soundcloud-state').textContent='SoundCloud link · '+e.message;});
  const playSoundCloud=async x=>{audio.pause();audio.src=x.mediaUrl;audio.load();rt.enablePlayback();q('#input-title').value=x.title||'SoundCloud';q('#input-artist').value=x.artist||'SoundCloud';composeStage('soundcloud',x);q('#soundcloud-state').textContent=`${x.artist} · ${x.title}`;q('#soundcloud-queue').textContent=`Queue · ${x.queueIndex+1} / ${x.queueLength}`;window.api.syncSource({mode:'soundcloud',src:x.mediaUrl,name:x.title,artist:x.artist,paused:false,time:0,queueIndex:x.queueIndex,queueLength:x.queueLength});rt.ensureAudioContext();await audio.play();};
  async function refreshSoundCloudLibrary(){const box=q('#soundcloud-library');box.innerHTML='<div class="file-meta-tag">Loading 666SOUNDsDESIGN library…</div>';try{const lib=await window.api.soundCloudLibrary();const esc=v=>String(v||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));const section=(name,items)=>`<div class="sc-library-section"><div class="sc-library-title">${name} · ${items.length}</div>${items.map((x,i)=>`<button class="sc-library-item" data-sc-url="${esc(x.permalink)}"><img src="${esc(x.artwork)}" alt=""><span>${esc(x.title)}</span><small>${x.kind==='playlist'?(x.trackCount+' tracks'):'TRACK'}</small></button>`).join('')}</div>`;box.innerHTML=section('PLAYLISTS / ALBUMS',lib.playlists||[])+section('TRACKS',lib.tracks||[]);box.querySelectorAll('[data-sc-url]').forEach(b=>b.onclick=async()=>{q('#soundcloud-url').value=b.dataset.scUrl;try{await playSoundCloud(await window.api.soundCloudResolve(b.dataset.scUrl));}catch(err){q('#soundcloud-state').textContent='SoundCloud error · '+err.message;}});}catch(err){box.replaceChildren();const msg=document.createElement('div');msg.className='file-meta-tag';msg.textContent='Library unavailable · '+String(err.message||err);box.appendChild(msg);}}
  q('#soundcloud-library-refresh').onclick=refreshSoundCloudLibrary;
  refreshSoundCloudLibrary();
  q('#soundcloud-load').onclick=async()=>{const e=q('#soundcloud-state');e.textContent='Resolving SoundCloud…';try{await playSoundCloud(await window.api.soundCloudResolve(q('#soundcloud-url').value));}catch(err){e.textContent='SoundCloud error · '+err.message;}};
  q('#soundcloud-prev').onclick=async()=>{try{await playSoundCloud(await window.api.soundCloudPrevious());}catch(err){q('#soundcloud-state').textContent='SoundCloud error · '+err.message;}};
  q('#soundcloud-next').onclick=async()=>{try{await playSoundCloud(await window.api.soundCloudNext());}catch(err){q('#soundcloud-state').textContent='SoundCloud error · '+err.message;}};
  audio.addEventListener('playing',()=>{if(mode==='soundcloud')soundCloudErrorSkips=0;});
  audio.addEventListener('ended',async()=>{if(mode==='soundcloud'&&!outputMode){try{await playSoundCloud(await window.api.soundCloudNext());}catch(err){q('#soundcloud-state').textContent='SoundCloud queue · '+err.message;}}});
  audio.addEventListener('error',async()=>{if(mode!=='soundcloud'||outputMode||soundCloudErrorSkips>=3)return;soundCloudErrorSkips++;q('#soundcloud-state').textContent=`SoundCloud stream error · skipping ${soundCloudErrorSkips}/3`;try{const x=await window.api.soundCloudNext();await new Promise(r=>setTimeout(r,500*soundCloudErrorSkips));await playSoundCloud(x);}catch(err){q('#soundcloud-state').textContent='SoundCloud recovery · '+err.message;}});
  window.addEventListener('offline',()=>{if(mode==='radio')state('NETWORK OFFLINE · STREAM MAY CONTINUE FROM BUFFER');if(mode==='soundcloud')q('#soundcloud-state').textContent='Network offline · waiting for connection';});
  window.api.onRuntimeLifecycle?.(async ev=>{if(ev?.type!=='resume'||outputMode)return;state('SYSTEM RESUME · REHYDRATING');try{if(mode==='radio'){await refreshNP();if(radioUsingFallback)scheduleRadioRecovery(1500);else if(audio.paused){rt.enablePlayback();await audio.play().catch(()=>{});}scheduleNowPlaying();}else if(mode==='soundcloud'&&audio.src&&audio.paused){rt.enablePlayback();await audio.play().catch(()=>{});}syncVisual();state('SYSTEM RESUME · READY');}catch(e){state('SYSTEM RESUME · '+e.message);}});
  // Best-effort media clock correction for secondary output windows. Radio is live and does not seek.
  if(!outputMode){let lastSync=0;const syncClock=()=>{const now=Date.now();if(now-lastSync<900)return;lastSync=now;window.api.syncSource({mode,src:audio.currentSrc||audio.src,paused:audio.paused,time:(mode==='radio'?null:audio.currentTime)});};audio.addEventListener('play',syncClock);audio.addEventListener('pause',syncClock);audio.addEventListener('seeked',syncClock);audio.addEventListener('timeupdate',syncClock);}

})();
