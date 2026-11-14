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

  async function refresh(){
    q('#rw-diag-state').textContent='REFRESHING…';
    try{
      const [displays,outputs,runtime]=await Promise.all([window.api.displays(),window.api.outputStatus(),window.api.runtimeDiagnostics()]);
      renderDisplays(displays);renderOutputs(outputs);renderRuntime(runtime);
      q('#rw-diag-state').textContent='LIVE · '+new Date().toLocaleTimeString();
      syncDetached();
    }catch(e){q('#rw-diag-state').textContent='ERROR · '+String(e.message||e);syncDetached();}
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
  refresh();
  setInterval(()=>{if(!document.hidden)refresh();},5000);
})();