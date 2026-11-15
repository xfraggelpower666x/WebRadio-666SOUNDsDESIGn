'use strict';
(()=>{
  const root=document.getElementById('overlay-root');
  let overlayKey='';
  let rangeGesture=null,pendingSync=null;
  const applyControls=(controls=[],protectedIds=new Set())=>{
    for(const s of controls){
      if(!s?.id)continue;
      const el=document.getElementById(s.id);
      if(!el)continue;
      if((el.type==='checkbox'||el.type==='radio')&&typeof s.checked==='boolean')el.checked=s.checked;
      else if(el.type==='password'){
        if(s.hasValue===false&&!protectedIds.has(s.id))el.value='';
      }else if(!protectedIds.has(s.id)&&s.value!==undefined&&s.value!==null)el.value=String(s.value);
      if(typeof s.disabled==='boolean')el.disabled=s.disabled;
    }
  };
  const finishRangeGesture=()=>{
    if(!rangeGesture||rangeGesture.releasing)return;
    rangeGesture.releasing=true;
    setTimeout(()=>{
      const gesture=rangeGesture,payload=pendingSync;
      rangeGesture=null;pendingSync=null;
      if(payload)syncOverlay(payload,gesture.changed?gesture.id:'');
    },0);
  };
  const wire=()=>{
    root.addEventListener('pointerdown',e=>{
      const el=e.target;
      if(!rangeGesture&&e.isPrimary&&e.button===0&&el?.id&&el.matches('input[type="range"]'))
        rangeGesture={id:el.id,pointerId:e.pointerId,changed:false,releasing:false};
    },true);
    for(const event of ['pointerup','pointercancel'])window.addEventListener(event,e=>{
      if(rangeGesture?.pointerId===e.pointerId)finishRangeGesture();
    },true);
    window.addEventListener('blur',finishRangeGesture,true);
    root.addEventListener('toggle',e=>{
      const el=e.target;
      if(!el?.id||!el.matches('details'))return;
      window.rwOverlay.action({key:overlayKey,kind:'toggle',id:el.id,checked:el.open}).catch(error=>console.error('Overlay toggle failed',error));
    },true);
    root.addEventListener('input',e=>{
      const el=e.target;
      if(!el?.id||!el.matches('input,select,textarea'))return;
      if(rangeGesture?.id===el.id)rangeGesture.changed=true;
      window.rwOverlay.action({key:overlayKey,kind:'input',id:el.id,value:el.value,checked:!!el.checked}).catch(()=>{});
    },true);
    root.addEventListener('change',e=>{
      const el=e.target;
      if(!el?.id||!el.matches('input,select,textarea'))return;
      window.rwOverlay.action({key:overlayKey,kind:'change',id:el.id,value:el.value,checked:!!el.checked}).catch(()=>{});
    },true);
    root.addEventListener('click',e=>{
      const b=e.target.closest('button');
      if(!b)return;
      if(b.id==='audio-input-start')return;
      const action=b.id?{id:b.id}:{selector:b.dataset.source?('[data-source="'+CSS.escape(b.dataset.source)+'"]'):(b.dataset.openWindow?('[data-open-window="'+CSS.escape(b.dataset.openWindow)+'"]'):'')};
      if(!action.id&&!action.selector)return;
      window.rwOverlay.action({key:overlayKey,kind:'click',...action}).catch(()=>{});
    },true);
  };
  window.rwOverlay.onInit(payload=>{
    overlayKey=String(payload?.key||'');
    document.title='RADIO WAVE · '+String(payload?.title||overlayKey||'CONTROL');
    root.innerHTML=String(payload?.html||'');
    applyControls(payload?.controls||[]);
    wire();
  });
  const syncOverlay=(payload,heldId='')=>{
    const active=document.activeElement;
    const editing=active?.id&&root.contains(active)&&active.matches('input,textarea,select')?{
      id:active.id,value:active.value,start:active.selectionStart,end:active.selectionEnd,direction:active.selectionDirection
    }:null;
    const heldElement=heldId&&document.getElementById(heldId);
    const held=heldElement&&root.contains(heldElement)&&heldElement.matches('input[type="range"]')
      ? {id:heldId,value:heldElement.value}:null;
    if(payload?.html!==undefined){
      const secrets=Array.from(root.querySelectorAll('input[type="password"][id]'),el=>({id:el.id,value:el.value}));
      const scrollTop=root.scrollTop,scrollLeft=root.scrollLeft;
      root.innerHTML=String(payload.html||'');
      for(const secret of secrets){
        const el=document.getElementById(secret.id);
        if(el&&root.contains(el)&&el.type==='password')el.value=secret.value;
      }
      if(held){
        const el=document.getElementById(held.id);
        if(el&&root.contains(el)&&el.matches('input[type="range"]'))el.value=held.value;
      }
      if(editing){
        const el=document.getElementById(editing.id);
        if(el&&root.contains(el)&&el.matches('input,textarea,select')&&!el.disabled){
          if(el.type!=='checkbox'&&el.type!=='radio')el.value=editing.value;
          el.focus({preventScroll:true});
          if(editing.start!==null&&editing.end!==null&&typeof el.setSelectionRange==='function')
            el.setSelectionRange(editing.start,editing.end,editing.direction);
        }
      }
      root.scrollTop=scrollTop;root.scrollLeft=scrollLeft;
    }
    applyControls(payload?.controls||[],new Set([editing?.id,held?.id].filter(Boolean)));
  };
  window.rwOverlay.onSync(payload=>{
    if(rangeGesture){pendingSync=payload;return;}
    syncOverlay(payload);
  });
  window.rwOverlay.ready().catch(()=>{});
})();
