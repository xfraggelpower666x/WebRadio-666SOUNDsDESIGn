'use strict';
(() => {
  const STORAGE='rw666-workspace-v1';
  const SETTINGS='rw666-ui-settings-v1';
  const q=s=>document.querySelector(s);
  const qa=s=>Array.from(document.querySelectorAll(s));
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const safeParse=(raw,fallback)=>{try{return raw?JSON.parse(raw):fallback;}catch{return fallback;}};

  const saved=safeParse(localStorage.getItem(STORAGE),{windows:{},dockOpen:true});
  const settings=safeParse(localStorage.getItem(SETTINGS),{});

  // Restore user-facing control values before app.js binds behavior.
  for(const [id,value] of Object.entries(settings)){
    if(id==='radio-password')continue;
    const el=document.getElementById(id);
    if(!el||el.type==='password')continue;
    if(el.type==='checkbox'||el.type==='radio')el.checked=!!value;
    else if(typeof value==='string'||typeof value==='number')el.value=String(value);
  }

  const sectionDefs=[
    {key:'source',title:'SOURCE HUB',icon:'⚡',node:q('#source-hub'),x:28,y:95,w:420,h:470,open:true},
    {key:'media',title:'MEDIA LIBRARY',icon:'📁',match:'Media Library',x:70,y:135,w:390,h:360},
    {key:'wave',title:'WAVE DESIGN',icon:'🎨',match:'Wave Design',x:120,y:115,w:420,h:520},
    {key:'position',title:'POSITION & SIZE',icon:'📐',match:'Position & Size',x:170,y:135,w:420,h:500},
    {key:'text',title:'TEXT OVERLAYS',icon:'✏️',match:'Text Overlays',x:220,y:155,w:410,h:430},
    {key:'engines',title:'PRESENTATION & ENGINES',icon:'🖥️',match:'Presentation & Engines',x:260,y:105,w:440,h:610},
    {key:'export',title:'EXPORT STUDIO',icon:'📹',match:'Export Studio',x:310,y:145,w:410,h:420}
  ];

  const sectionNodes=qa('.panel-section');
  for(const def of sectionDefs){
    if(!def.node&&def.match){
      def.node=sectionNodes.find(n=>n.querySelector('.section-title')?.textContent.includes(def.match));
    }
  }

  const dock=document.createElement('nav');
  dock.className='rw-window-dock';
  dock.id='rw-window-dock';
  dock.setAttribute('aria-label','RADIO WAVE windows');
  const dockHead=document.createElement('div');
  dockHead.className='rw-window-dock-title';
  dockHead.textContent='WINDOWS';
  dock.appendChild(dockHead);
  document.body.appendChild(dock);

  const windows=new Map();
  let z=30;

  function stateFor(key,def){
    const s=saved.windows?.[key]||{};
    return {
      x:Number.isFinite(s.x)?s.x:def.x,
      y:Number.isFinite(s.y)?s.y:def.y,
      w:Number.isFinite(s.w)?s.w:def.w,
      h:Number.isFinite(s.h)?s.h:def.h,
      open:typeof s.open==='boolean'?s.open:!!def.open,
      z:Number.isFinite(s.z)?s.z:0
    };
  }

  function saveWorkspace(){
    const out={dockOpen:!document.body.classList.contains('rw-dock-collapsed'),windows:{}};
    for(const [key,win] of windows){
      const r=win.getBoundingClientRect();
      out.windows[key]={
        x:Math.round(r.left),y:Math.round(r.top),
        w:Math.round(r.width),h:Math.round(r.height),
        open:!win.classList.contains('rw-window-closed'),
        z:Number(win.style.zIndex)||0
      };
    }
    // Stream status is inside the visualizer rather than viewport-fixed.
    const status=q('#radio-status-panel');
    const frame=q('#video-frame-outer');
    if(status&&frame){
      const sr=status.getBoundingClientRect(),fr=frame.getBoundingClientRect();
      out.windows.status={
        x:Math.round(sr.left-fr.left),y:Math.round(sr.top-fr.top),
        w:Math.round(sr.width),h:Math.round(sr.height),
        open:!status.classList.contains('hidden'),
        z:Number(status.style.zIndex)||0
      };
    }
    try{localStorage.setItem(STORAGE,JSON.stringify(out));}catch{}
  }

  function saveSettings(){
    const out={};
    qa('input[id],select[id],textarea[id]').forEach(el=>{
      if(el.id==='radio-password'||el.type==='password'||el.type==='file')return;
      out[el.id]=(el.type==='checkbox'||el.type==='radio')?!!el.checked:el.value;
    });
    try{localStorage.setItem(SETTINGS,JSON.stringify(out));}catch{}
  }

  function bringToFront(win){
    z=Math.max(z+1,...Array.from(windows.values()).map(w=>Number(w.style.zIndex)||0));
    win.style.zIndex=String(z);
  }

  function clampWindow(win){
    const dockWidth=document.body.classList.contains('rw-dock-collapsed')?14:116;
    const r=win.getBoundingClientRect();
    const maxX=Math.max(0,window.innerWidth-dockWidth-r.width-8);
    const maxY=Math.max(0,window.innerHeight-r.height-8);
    win.style.left=clamp(r.left,8,maxX)+'px';
    win.style.top=clamp(r.top,50,maxY)+'px';
  }

  function openWindow(key){
    if(key==='status'){
      const status=q('#radio-status-panel'),toggle=q('#radio-status-enabled');
      if(toggle&&!toggle.checked){toggle.checked=true;toggle.dispatchEvent(new Event('change',{bubbles:true}));}
      if(status){status.classList.remove('hidden');status.style.visibility='visible';bringToFront(status);}
      saveWorkspace();return;
    }
    const win=windows.get(key);if(!win)return;
    win.classList.remove('rw-window-closed');
    bringToFront(win);clampWindow(win);saveWorkspace();
  }

  function closeWindow(key){
    if(key==='status'){
      const status=q('#radio-status-panel'),toggle=q('#radio-status-enabled');
      if(toggle&&toggle.checked){toggle.checked=false;toggle.dispatchEvent(new Event('change',{bubbles:true}));}
      status?.classList.add('hidden');
      saveWorkspace();return;
    }
    const win=windows.get(key);if(!win)return;
    win.classList.add('rw-window-closed');saveWorkspace();
  }

  function makeDraggable(win,handle,key,boundsProvider=()=>document.documentElement){
    let active=false,startX=0,startY=0,startL=0,startT=0;
    handle.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('button,input,select,textarea'))return;
      active=true;bringToFront(win);
      const r=win.getBoundingClientRect();startX=e.clientX;startY=e.clientY;startL=r.left;startT=r.top;
      handle.setPointerCapture?.(e.pointerId);e.preventDefault();
    });
    handle.addEventListener('pointermove',e=>{
      if(!active)return;
      const bounds=boundsProvider().getBoundingClientRect();
      const wr=win.getBoundingClientRect();
      const left=clamp(startL+(e.clientX-startX),bounds.left+4,bounds.right-wr.width-4);
      const top=clamp(startT+(e.clientY-startY),bounds.top+4,bounds.bottom-wr.height-4);
      if(key==='status'){
        win.style.left=(left-bounds.left)+'px';win.style.top=(top-bounds.top)+'px';
        win.style.right='auto';
      }else{
        win.style.left=left+'px';win.style.top=top+'px';
      }
    });
    const done=e=>{if(!active)return;active=false;try{handle.releasePointerCapture?.(e.pointerId);}catch{}saveWorkspace();};
    handle.addEventListener('pointerup',done);handle.addEventListener('pointercancel',done);
  }

  for(const def of sectionDefs){
    if(!def.node)continue;
    const st=stateFor(def.key,def);
    const win=document.createElement('section');
    win.className='rw-floating-window'+(st.open?'':' rw-window-closed');
    win.dataset.rwWindow=def.key;
    win.style.left=st.x+'px';win.style.top=st.y+'px';win.style.width=st.w+'px';win.style.height=st.h+'px';
    win.dataset.baseWidth=String(def.w);
    win.dataset.baseHeight=String(def.h);
    win.style.zIndex=String(st.z||++z);

    const head=document.createElement('header');
    head.className='rw-floating-window-head';
    head.innerHTML=`<span class="rw-window-grip">⠿</span><strong>${def.icon} ${def.title}</strong><button type="button" class="rw-window-close" aria-label="Close ${def.title}">×</button>`;
    const body=document.createElement('div');body.className='rw-floating-window-body';
    def.node.classList.add('rw-window-content');body.appendChild(def.node);
    win.append(head,body);document.body.appendChild(win);
    windows.set(def.key,win);

    head.querySelector('.rw-window-close').addEventListener('click',()=>closeWindow(def.key));
    win.addEventListener('pointerdown',()=>bringToFront(win));
    win.addEventListener('mouseup',saveWorkspace);
    makeDraggable(win,head,def.key);

    const btn=document.createElement('button');
    btn.type='button';btn.className='rw-dock-button';btn.dataset.openWindow=def.key;
    btn.innerHTML=`<span>${def.icon}</span><small>${def.title}</small>`;
    btn.addEventListener('click',()=>openWindow(def.key));
    dock.appendChild(btn);
  }

  // Stream status remains inside the video frame so it moves with the visual canvas.
  const status=q('#radio-status-panel');
  const frame=q('#video-frame-outer');
  if(status&&frame){
    status.classList.add('rw-draggable-status');
    const handle=document.createElement('div');
    handle.className='rw-status-drag-head';
    handle.innerHTML='<span>⠿ LIVE STREAM STATUS</span><button type="button" class="rw-status-close" aria-label="Close live stream status">×</button>';
    status.prepend(handle);
    const ss=saved.windows?.status;
    if(ss){
      if(Number.isFinite(ss.x)){status.style.left=ss.x+'px';status.style.right='auto';}
      if(Number.isFinite(ss.y))status.style.top=ss.y+'px';
      if(Number.isFinite(ss.w))status.style.width=ss.w+'px';
      if(Number.isFinite(ss.h))status.style.height=ss.h+'px';
    }
    handle.querySelector('.rw-status-close').addEventListener('click',()=>closeWindow('status'));
    makeDraggable(status,handle,'status',()=>frame);
    const btn=document.createElement('button');
    btn.type='button';btn.className='rw-dock-button';btn.innerHTML='<span>📡</span><small>LIVE STATUS</small>';
    btn.addEventListener('click',()=>openWindow('status'));dock.appendChild(btn);
  }

  document.body.classList.add('rw-workspace-enabled');
  document.body.classList.toggle('rw-dock-collapsed',saved.dockOpen===false);

  // Keep the existing top button as dock toggle rather than old scrolling-sidebar toggle.
  window.RWWorkspace=Object.freeze({
    open:openWindow,close:closeWindow,
    toggleDock(){
      document.body.classList.toggle('rw-dock-collapsed');
      saveWorkspace();
      return !document.body.classList.contains('rw-dock-collapsed');
    },
    save(){saveSettings();saveWorkspace();}
  });

  // Save all user-adjustable controls continuously and again on exit.
  const queueSave=(()=>{let t;return()=>{clearTimeout(t);t=setTimeout(()=>{saveSettings();saveWorkspace();},120);};})();
  document.addEventListener('input',e=>{if(e.target?.matches?.('input,select,textarea'))queueSave();},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('input,select,textarea'))queueSave();},true);
  // Persist dynamic resizing and adapt content scale so smaller windows reflow instead of scrolling.
  const applyAdaptiveScale=win=>{
    const body=win.querySelector?.('.rw-floating-window-body');
    if(!body)return;
    const baseW=Math.max(280,Number(win.dataset.baseWidth)||420);
    const baseH=Math.max(180,Number(win.dataset.baseHeight)||420);
    const r=win.getBoundingClientRect();
    const sx=(r.width-18)/Math.max(1,baseW-18);
    const sy=(r.height-46)/Math.max(1,baseH-46);
    const scale=clamp(Math.min(sx,sy),0.68,1.12);
    body.style.setProperty('--rw-content-scale',scale.toFixed(3));
    body.dataset.compact=scale<0.86?'1':'0';
  };

  if('ResizeObserver' in window){
    const ro=new ResizeObserver(entries=>{
      for(const entry of entries){
        const win=entry.target;
        if(win.classList?.contains('rw-floating-window'))applyAdaptiveScale(win);
      }
      if(entries.length)queueSave();
    });
    for(const w of windows.values()){ro.observe(w);applyAdaptiveScale(w);}
    const status=q('#radio-status-panel');if(status)ro.observe(status);
  }

  window.addEventListener('resize',()=>{
    for(const w of windows.values())clampWindow(w);
    const status=q('#radio-status-panel'),frame=q('#video-frame-outer');
    if(status&&frame){
      const fr=frame.getBoundingClientRect(),sr=status.getBoundingClientRect();
      const maxLeft=Math.max(4,fr.width-sr.width-4);
      const maxTop=Math.max(4,fr.height-sr.height-4);
      status.style.left=clamp(parseFloat(status.style.left)||Math.max(4,fr.width-sr.width-16),4,maxLeft)+'px';
      status.style.top=clamp(parseFloat(status.style.top)||16,4,maxTop)+'px';
      status.style.right='auto';
    }
    saveWorkspace();
  });
  window.addEventListener('beforeunload',()=>{saveSettings();saveWorkspace();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){saveSettings();saveWorkspace();}});

  // Remove the old scrolling sidebar from layout after its controls have been moved.
  q('.control-panel')?.classList.add('rw-sidebar-retired');
})();
