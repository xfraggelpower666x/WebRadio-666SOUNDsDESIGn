'use strict';
(()=>{
  const q=s=>document.querySelector(s);
  const root=q('#rw-diagnostics');
  if(!root||!window.api)return;
  const esc=v=>String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const renderDisplays=list=>{
    const el=q('#rw-diag-displays');if(!el)return;
    el.innerHTML=(list||[]).map(d=>`<article class="rw-diag-card"><strong>${esc(d.label||('Display '+d.index))}</strong><span>ID ${esc(d.id)}</span><span>${esc(d.bounds?.width)}×${esc(d.bounds?.height)} @ ${esc(d.bounds?.x)},${esc(d.bounds?.y)}</span><span>Work ${esc(d.workArea?.width)}×${esc(d.workArea?.height)}</span><span>Scale ${esc(d.scaleFactor)} · Rotation ${esc(d.rotation)}</span></article>`).join('')||'<span class="rw-diag-empty">No displays reported</span>';
  };
  const renderOutputs=s=>{
    const el=q('#rw-diag-outputs');if(!el)return;
    const active=s?.active||[];
    el.innerHTML=active.map(o=>`<article class="rw-diag-card"><strong>OUTPUT ${esc(o.id)}</strong><span>${esc(o.bounds?.width)}×${esc(o.bounds?.height)} @ ${esc(o.bounds?.x)},${esc(o.bounds?.y)}</span><span>Engine ${esc(o.engine)} · FPS ${esc(o.fps)}</span><span>${o.responsive?'RESPONSIVE':'NO HEARTBEAT'} · Recoveries ${esc(o.recoveries)}</span></article>`).join('')||'<span class="rw-diag-empty">No secondary output window active</span>';
  };
  const syncDetached=()=>{
    const controls=Array.from(root.querySelectorAll('input[id],select[id],textarea[id],button[id]')).map(el=>({
      id:el.id,tag:el.tagName,type:el.type||'',value:el.value??'',checked:!!el.checked,disabled:!!el.disabled
    }));
    window.api.syncDetachedOverlay?.('diagnostics',{html:root.innerHTML,controls}).catch(()=>{});
  };
  const renderRuntime=d=>{
    const gpu=q('#rw-diag-gpu'),rt=q('#rw-diag-runtime');
    if(gpu)gpu.textContent=JSON.stringify(d?.gpu||{},null,2);
    if(rt)rt.textContent=JSON.stringify({
      generatedAt:d?.generatedAt,version:d?.version,platform:d?.platform,arch:d?.arch,
      electron:d?.electron,chrome:d?.chrome,node:d?.node,memory:d?.memory,source:d?.source
    },null,2);
  };
  const history={memory:[],fps:[]}, sampleLimit=30;
  const finiteNumber=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
  function led(selector,value,status){
    const el=q(selector);if(!el)return;
    const text=el.querySelector('strong');if(text)text.textContent=value;
    el.dataset.state=status;
  }
  function graph(selector,label,series,value,unit){
    const el=q(selector);if(!el)return;
    if(finiteNumber(value)){series.push(value);if(series.length>sampleLimit)series.shift();}else series.length=0;
    if(!series.length){el.innerHTML='<span>'+esc(label)+'</span><div>Measurement unavailable</div>';return;}
    const max=Math.max(...series),scale=max||1;
    el.innerHTML='<span>'+esc(label)+' · '+esc(value.toFixed(1))+' '+esc(unit)+'</span><div class="rw-diag-bars" aria-hidden="true">'+series.map(n=>'<i style="height:'+(n/scale*100).toFixed(2)+'%"></i>').join('')+'</div><small>'+series.length+' samples · scale 0–'+max.toFixed(1)+' '+esc(unit)+'</small>';
    el.setAttribute('aria-label',label+': '+value.toFixed(1)+' '+unit+', '+series.length+' samples, scale 0 to '+max.toFixed(1));
  }
  function renderMeasurements(runtime,outputs){
    const rss=finiteNumber(runtime?.memory?.rss)?runtime.memory.rss/1048576:null;
    const heap=finiteNumber(runtime?.memory?.heapUsed)?runtime.memory.heapUsed/1048576:null;
    const active=Array.isArray(outputs?.active)?outputs.active:null;
    const responsive=active?.filter(o=>o.responsive)??[];
    const values=responsive.filter(o=>finiteNumber(o.fps)).map(o=>o.fps);
    const fps=values.length?values.reduce((sum,n)=>sum+n,0)/values.length:null;
    led('#rw-diag-led-memory',rss===null?'UNAVAILABLE':rss.toFixed(1)+' MiB',rss===null?'unknown':'measured');
    led('#rw-diag-led-heap',heap===null?'UNAVAILABLE':heap.toFixed(1)+' MiB',heap===null?'unknown':'measured');
    led('#rw-diag-led-outputs',active?responsive.length+' / '+active.length:'UNAVAILABLE',!active||!active.length?'unknown':responsive.length===active.length?'measured':'warning');
    graph('#rw-diag-graph-memory','MAIN PROCESS RSS',history.memory,rss,'MiB');
    graph('#rw-diag-graph-fps','RESPONSIVE OUTPUT AVG FPS',history.fps,fps,'FPS');
  }
  const audioBands=[['low',20,250],['mid',250,2000],['high',2000,16000]];
  function renderAudioBand(name,value,status){
    const el=q('#rw-diag-audio-'+name);if(!el)return;
    const text=el.querySelector('strong'),meter=el.querySelector('.rw-diag-audio-meter'),bar=el.querySelector('.rw-diag-audio-meter i');
    el.dataset.state=status;
    if(text)text.textContent=value===null?'—':value+'%';
    if(bar)bar.style.width=value===null?'0%':value+'%';
    if(meter){if(value===null){meter.removeAttribute('aria-valuenow');meter.setAttribute('aria-valuetext',status);}else{meter.setAttribute('aria-valuenow',String(value));meter.setAttribute('aria-valuetext',value+' percent of analyser byte range');}}
  }
  function unavailableAudio(reason){
    const el=q('#rw-diag-audio-state');if(el)el.textContent='ANALYSER · '+reason;
    for(const [name] of audioBands)renderAudioBand(name,null,reason==='STALE'?'stale':'unavailable');
  }
  function sampleAudio(){
    if(document.hidden){unavailableAudio('STALE');return;}
    try{
      const runtime=window.SoundwaveRuntime,audio=runtime?.audio,analyser=runtime?.getAnalyser?.(),context=runtime?.getAudioContext?.();
      if(!audio||!analyser||!context){unavailableAudio('UNAVAILABLE');return;}
      if(audio.error){unavailableAudio('ERROR');return;}
      if(audio.paused){unavailableAudio('PAUSED');return;}
      if(context.state!=='running'){unavailableAudio('CONTEXT NOT RUNNING');return;}
      if(audio.readyState<3){unavailableAudio('BUFFERING');return;}
      const count=analyser.frequencyBinCount,fft=analyser.fftSize,rate=context.sampleRate;
      if(!Number.isInteger(count)||count<=0||count>32768||!finiteNumber(fft)||!fft||!finiteNumber(rate)||!rate){unavailableAudio('UNAVAILABLE');return;}
      const bins=new Uint8Array(count);analyser.getByteFrequencyData(bins);
      for(const [name,min,max] of audioBands){
        let total=0,n=0;
        for(let i=0;i<bins.length;i++){const hz=i*rate/fft;if(hz>=min&&hz<max){total+=bins[i];n++;}}
        renderAudioBand(name,n?Math.round(total/n/255*100):null,n?'measured':'unavailable');
      }
      const el=q('#rw-diag-audio-state');if(el)el.textContent='ANALYSER · LIVE INPUT SAMPLE';
    }catch{unavailableAudio('UNAVAILABLE');}
  }
  const hostRow=(label,status,detail='')=>'<article class="rw-host-check-row '+esc(status.toLowerCase())+'"><strong>'+esc(label)+'</strong><span>'+esc(status)+'</span><small>'+esc(detail)+'</small></article>';
  async function runHostCheck(){
    const box=q('#rw-host-check-state');if(!box)return;
    box.innerHTML='<div class="file-meta-tag">HOST CHECK · RUNNING REAL RUNTIME READS…</div>';
    const rows=[];
    try{
      const readers={
        displays:()=>window.api.displays(),
        outputStatus:()=>window.api.outputStatus(),
        remoteHealth:()=>window.api.remoteHealth(),
        localQueueState:()=>window.api.localQueueState(),
        personalMilkdropLibrary:()=>window.api.personalMilkdropLibrary(),
        soundCloudStatus:()=>window.api.soundCloudStatus()
      };
      const results=await Promise.allSettled(Object.values(readers).map(read=>Promise.resolve().then(read)));
      const evidence=Object.fromEntries(Object.keys(readers).map((name,index)=>[name,results[index]]));
      const [displays,outputs,remote,queue,milkdrop,sc]=results.map(result=>result.value);
      const addEvidence=(source,label,status,detail)=>{
        const result=evidence[source];
        rows.push(result.status==='rejected'
          ?hostRow(label,'ERROR',String(result.reason?.message??result.reason))
          :hostRow(label,status,detail));
      };
      const displayCount=Array.isArray(displays)?displays.length:0;
      // Presence, configuration, and reachability are not functional host acceptance.
      addEvidence('displays','Displays',displayCount>=2?'DETECTED':'PENDING',displayCount+' detected · multi-monitor output not yet verified');
      const detached=outputs?.detachedVisualizer;
      const db=detached?.bounds||{};
      addEvidence('outputStatus','Detached Visualizer',detached?.visible?'VISIBLE':detached?'DETECTED':'PENDING',detached?(String(db.width||0)+'×'+String(db.height||0)+' @ '+String(db.x||0)+','+String(db.y||0)+' · visual output not verified'):'Open VISUALIZER ↗ and move it to another monitor');
      const activeOutputs=Array.isArray(outputs?.active)?outputs.active:[];
      addEvidence('outputStatus','Secondary Outputs',activeOutputs.some(x=>x.responsive)?'HEARTBEAT':'PENDING',activeOutputs.length+' active · rendering not verified');
      addEvidence('localQueueState','Local Queue',queue?.count>0?'LOADED':'PENDING',String(queue?.count||0)+' tracks · index '+String(queue?.index??-1)+' · playback/transition not verified');
      addEvidence('personalMilkdropLibrary','MilkDrop Personal Library',milkdrop?.installed&&milkdrop?.milk>0?'INDEXED':'PENDING',milkdrop?.installed?(String(milkdrop.milk||0)+' .milk · '+String(milkdrop.milk2||0)+' .milk2 · render not verified'):'Not installed');
      addEvidence('soundCloudStatus','SoundCloud API',sc?.configured?'CONFIGURED':'PENDING',sc?.configured?'Credentials configured · playback not verified':'Credentials missing');
      addEvidence('remoteHealth','Admin Session',remote?.admin?.ok?'AUTHENTICATED':'PENDING',remote?.admin?.ok?'Authenticated · actions not verified':String(remote?.admin?.error||'Login required'));
      addEvidence('remoteHealth','Skip Bridge',remote?.skip?.ok&&remote?.skip?.configured!==false?'REACHABLE':'PENDING',remote?.skip?.ok?String(remote?.skip?.configured===false?'Bridge not configured':'Reachable · skip action not verified'):String(remote?.skip?.error||remote?.skip?.status||'Unavailable'));
      addEvidence('remoteHealth','Player Messenger',remote?.messenger?.ok?'REACHABLE':'PENDING',remote?.messenger?.ok?'Reachable · message delivery not verified':String(remote?.messenger?.error||remote?.messenger?.status||'Unavailable'));
      const visual=document.getElementById('visual-engine')?.value||'unknown';
      rows.push(hostRow('Visualizer Engine',visual!=='unknown'?'SELECTED':'PENDING',visual+' · audio-driven rendering not verified'));
      box.innerHTML=rows.join('');
      const partial=results.some(result=>result.status==='rejected');
      q('#rw-diag-state').textContent=(partial?'HOST CHECK PARTIAL · ':'HOST CHECK COMPLETE · ')+new Date().toLocaleTimeString();
      syncDetached();
    }catch(e){
      box.innerHTML=hostRow('Host Check','ERROR',String(e.message||e));
      q('#rw-diag-state').textContent='HOST CHECK ERROR';
      syncDetached();
    }
  }

  let refreshGeneration=0;
  async function refresh(){
    const generation=++refreshGeneration;
    q('#rw-diag-state').textContent='REFRESHING…';
    try{
      const results=await Promise.allSettled([()=>window.api.displays(),()=>window.api.outputStatus(),()=>window.api.runtimeDiagnostics()].map(read=>Promise.resolve().then(read)));
      if(generation!==refreshGeneration)return;
      const [displays,outputs,runtime]=results.map(r=>r.status==='fulfilled'?r.value:null);
      if(displays)renderDisplays(displays);else{const el=q('#rw-diag-displays');if(el)el.textContent='Displays unavailable';}
      if(outputs)renderOutputs(outputs);else{const el=q('#rw-diag-outputs');if(el)el.textContent='Output status unavailable';}
      if(runtime)renderRuntime(runtime);else{const gpu=q('#rw-diag-gpu'),rt=q('#rw-diag-runtime');if(gpu)gpu.textContent='Unavailable';if(rt)rt.textContent='Unavailable';}
      renderMeasurements(runtime,outputs);
      q('#rw-diag-state').textContent=(results.some(r=>r.status==='rejected')?'PARTIAL · ':'LIVE · ')+new Date().toLocaleTimeString();
      syncDetached();
    }catch(e){if(generation!==refreshGeneration)return;renderMeasurements(null,null);q('#rw-diag-state').textContent='ERROR · '+String(e.message||e);syncDetached();}
  }
  q('#rw-diag-refresh')?.addEventListener('click',refresh);
  q('#rw-host-check')?.addEventListener('click',runHostCheck);
  q('#rw-diag-export')?.addEventListener('click',async()=>{
    const state=q('#rw-diag-state'); if(state)state.textContent='EXPORTING JSON…';
    try{const r=await window.api.exportRuntimeDiagnostics();if(state)state.textContent=r?.ok?'JSON EXPORTED · '+String(r.filePath||''):'EXPORT CANCELLED';syncDetached();}
    catch(e){if(state)state.textContent='EXPORT ERROR · '+String(e.message||e);syncDetached();}
  });
  window.api.onDisplaysChanged?.(renderDisplays);
  window.api.onWindowMetrics?.(()=>refresh());
  document.addEventListener?.('visibilitychange',()=>{if(document.hidden){unavailableAudio('STALE');syncDetached();}else sampleAudio();});
  setInterval(sampleAudio,250);
  refresh();
  setInterval(()=>{if(!document.hidden)refresh();},5000);
})();