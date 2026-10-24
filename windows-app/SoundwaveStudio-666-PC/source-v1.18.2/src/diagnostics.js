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