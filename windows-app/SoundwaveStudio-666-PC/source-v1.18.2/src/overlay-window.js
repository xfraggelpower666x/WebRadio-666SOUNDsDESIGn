'use strict';
(()=>{
  const root=document.getElementById('overlay-root');
  let overlayKey='';
  const applyControls=(controls=[])=>{
    for(const s of controls){
      if(!s?.id)continue;
      const el=document.getElementById(s.id);
      if(!el)continue;
      if((el.type==='checkbox'||el.type==='radio')&&typeof s.checked==='boolean')el.checked=s.checked;
      else if(s.value!==undefined&&s.value!==null)el.value=String(s.value);
      if(typeof s.disabled==='boolean')el.disabled=s.disabled;
    }
  };
  const wire=()=>{
    root.addEventListener('input',e=>{
      const el=e.target;
      if(!el?.id||!el.matches('input,select,textarea'))return;
      window.rwOverlay.action({key:overlayKey,kind:'input',id:el.id,value:el.value,checked:!!el.checked}).catch(()=>{});
    },true);
    root.addEventListener('change',e=>{
      const el=e.target;
      if(!el?.id||!el.matches('input,select,textarea'))return;
      window.rwOverlay.action({key:overlayKey,kind:'change',id:el.id,value:el.value,checked:!!el.checked}).catch(()=>{});
    },true);
    root.addEventListener('click',e=>{
      const b=e.target.closest('button[id]');
      if(!b)return;
      window.rwOverlay.action({key:overlayKey,kind:'click',id:b.id}).catch(()=>{});
    },true);
  };
  window.rwOverlay.onInit(payload=>{
    overlayKey=String(payload?.key||'');
    document.title='RADIO WAVE · '+String(payload?.title||overlayKey||'CONTROL');
    root.innerHTML=String(payload?.html||'');
    applyControls(payload?.controls||[]);
    wire();
  });
  window.rwOverlay.onSync(payload=>{
    if(payload?.html!==undefined)root.innerHTML=String(payload.html||'');
    applyControls(payload?.controls||[]);
  });
  window.rwOverlay.ready().catch(()=>{});
})();
