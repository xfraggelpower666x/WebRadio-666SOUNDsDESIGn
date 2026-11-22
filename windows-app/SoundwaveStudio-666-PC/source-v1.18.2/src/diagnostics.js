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
      const [displays,outputs,remote,queue,milkdrop,sc]=await Promise.all([
        window.api.displays(),
        window.api.outputStatus(),
        window.api.remoteHealth(),
        window.api.localQueueState(),
        window.api.personalMilkdropLibrary(),
        window.api.soundCloudStatus()
      ]);
      const displayCount=Array.isArray(displays)?displays.length:0;
      rows.push(hostRow('Displays',displayCount>=2?'PASS':'PENDING',displayCount+' detected'));
      const detached=outputs?.detachedVisualizer;
      const db=detached?.bounds||{};
      rows.push(hostRow('Detached Visualizer',detached?'PASS':'PENDING',detached?(String(db.width||0)+'×'+String(db.height||0)+' @ '+String(db.x||0)+','+String(db.y||0)):'Open VISUALIZER ↗ and move it to another monitor'));
      const activeOutputs=Array.isArray(outputs?.active)?outputs.active:[];
      rows.push(hostRow('Secondary Outputs',activeOutputs.some(x=>x.responsive)?'PASS':'PENDING',activeOutputs.length+' active'));
      rows.push(hostRow('Local Queue',queue?.count>0?'PASS':'PENDING',String(queue?.count||0)+' tracks · index '+String(queue?.index??-1)));
      rows.push(hostRow('MilkDrop Personal Library',milkdrop?.installed&&milkdrop?.milk>0?'PASS':'PENDING',milkdrop?.installed?(String(milkdrop.milk||0)+' .milk · '+String(milkdrop.milk2||0)+' .milk2'):'Not installed'));
      rows.push(hostRow('SoundCloud API',sc?.configured?'PASS':'PENDING',sc?.configured?'Configured':'Credentials missing'));
      rows.push(hostRow('Admin Session',remote?.admin?.ok?'PASS':'PENDING',remote?.admin?.ok?'Authenticated':String(remote?.admin?.error||'Login required')));
      rows.push(hostRow('Skip Bridge',remote?.skip?.ok&&remote?.skip?.configured!==false?'PASS':'PENDING',remote?.skip?.ok?String(remote?.skip?.configured===false?'Bridge not configured':'Reachable'):String(remote?.skip?.error||remote?.skip?.status||'Unavailable')));
      rows.push(hostRow('Player Messenger',remote?.messenger?.ok?'PASS':'PENDING',remote?.messenger?.ok?'Reachable':String(remote?.messenger?.error||remote?.messenger?.status||'Unavailable')));
      const visual=document.getElementById('visual-engine')?.value||'unknown';
      rows.push(hostRow('Visualizer Engine','PASS',visual));
      box.innerHTML=rows.join('');
      q('#rw-diag-state').textContent='HOST CHECK COMPLETE · '+new Date().toLocaleTimeString();
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