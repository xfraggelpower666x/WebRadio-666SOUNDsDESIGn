/* 666SOUNDsDESIGn Radio — Central LYVRA Boot Screen v1.1.0
 * Optik/HTML aus NEOCITIES_REDIRECT_LYVRA_v1.1.1 übernommen.
 * Redirect-/Navigation-Code absichtlich entfernt.
 * EIN zentraler Boot-Owner für Main + VELUNA + Internal auf Desktop/iPhone/Android.
 * v1.1.0: keine versteckten Legacy-Layer, keine Bestätigung; alte Boot-DOMs werden entfernt.
 */
(function installS666CentralBootScreen(global){
  'use strict';
  if(global.S666CentralBootScreen) return;

  const VERSION='1.1.0';
  const TEMPLATE_URL='/components/boot-screen/boot-screen.html?v=20260810-v110';
  const STYLE_URL='/css/central-boot-screen.css?v=20260810-v110';
  const DEFAULT_DURATION=4200;
  let root=null,raf=0,startAt=0,duration=DEFAULT_DURATION,lastPhase=-1,readyPromise=null;

  const phases=[
    {at:0,status:'INITIALIZING PLAYER',label:'CONNECTING RADIO CORE',step:0},
    {at:24,status:'STARTING AUDIO PATH',label:'PREPARING PLAYER ENGINE',step:1},
    {at:52,status:'SYNCHRONIZING SYSTEMS',label:'CONNECTING RADIO SERVICES',step:2},
    {at:82,status:'PLAYER SEQUENCE ARMED',label:'HANDING OFF TO PLAYER',step:3},
    {at:98,status:'BOOT COMPLETE',label:'666SOUNDsDESIGn READY',step:3}
  ];

  function domReady(){
    if(document.readyState!=='loading') return Promise.resolve();
    return new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  }

  function ensureStyle(){
    if(document.querySelector('link[data-s666-central-boot-style]')) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=STYLE_URL;
    link.dataset.s666CentralBootStyle='1';
    (document.head||document.documentElement).appendChild(link);
  }

  function detachLegacyBootDom(){
    const legacy=document.getElementById('bootOverlay');
    if(!legacy) return {removed:false,handoff:false};

    const page=String(document.body?.dataset?.velunaPage||'').toLowerCase();
    let handoff=false;

    // INTERNAL besitzt historisch Audio-Startlogik am alten bootButton.
    // Handler nach DOMContentLoaded automatisch auslösen, dann den alten DOM wirklich entfernen.
    if(page==='internal'){
      const legacyButton=document.getElementById('bootButton');
      if(legacyButton&&typeof legacyButton.click==='function'){
        try{legacyButton.click();handoff=true;}catch(_){}
      }
    }

    try{legacy.remove();}catch(_){legacy.parentNode?.removeChild?.(legacy);}
    return {removed:true,handoff};
  }

  async function mount(){
    if(root&&root.isConnected) return root;
    await domReady();
    ensureStyle();

    // Kein Layer-Hide: vorhandener alter Boot-DOM wird nach initialisierten Handlern physisch entfernt.
    detachLegacyBootDom();

    const response=await fetch(TEMPLATE_URL,{cache:'no-store',credentials:'same-origin'});
    if(!response.ok) throw new Error('central_boot_template_http_'+response.status);
    const holder=document.createElement('div');
    holder.innerHTML=await response.text();
    root=holder.firstElementChild;
    if(!root) throw new Error('central_boot_template_empty');
    document.body.appendChild(root);
    document.documentElement.classList.add('s666-central-boot-active');
    return root;
  }

  function nodes(){
    return root?{
      bar:root.querySelector('#s666boot-bar'),
      percent:root.querySelector('#s666boot-percent'),
      track:root.querySelector('#s666boot-track'),
      status:root.querySelector('#s666boot-status'),
      phase:root.querySelector('#s666boot-phase'),
      steps:[...root.querySelectorAll('.s666boot-step')]
    }:{};
  }

  function setProgress(progress){
    if(!root) return;
    const n=nodes();
    const p=Math.max(0,Math.min(100,Math.round(Number(progress)||0)));
    if(n.bar)n.bar.style.width=p+'%';
    if(n.percent)n.percent.textContent=p+'%';
    if(n.track)n.track.setAttribute('aria-valuenow',String(p));
    let current=phases[0];
    for(const phase of phases)if(p>=phase.at)current=phase;
    const idx=phases.indexOf(current);
    if(idx!==lastPhase){
      lastPhase=idx;
      if(n.status)n.status.textContent=current.status;
      if(n.phase)n.phase.textContent=current.label;
      n.steps?.forEach((step,i)=>{
        step.classList.toggle('done',i<current.step);
        step.classList.toggle('active',i===current.step);
      });
    }
  }

  function tick(now){
    if(!root) return;
    const elapsed=now-startAt;
    const progress=Math.min(100,(elapsed/duration)*100);
    setProgress(progress);
    if(elapsed<duration){raf=requestAnimationFrame(tick);return;}
    complete('timer');
  }

  async function show(options={}){
    await mount();
    cancelAnimationFrame(raf);
    duration=Math.max(600,Number(options.duration)||DEFAULT_DURATION);
    startAt=performance.now();
    lastPhase=-1;
    root.dataset.state='booting';
    root.style.removeProperty('display');
    root.style.removeProperty('opacity');
    setProgress(0);
    raf=requestAnimationFrame(tick);
    return root;
  }

  function complete(reason='complete'){
    if(!root) return;
    cancelAnimationFrame(raf);
    setProgress(100);
    const n=nodes();
    if(n.status)n.status.textContent='BOOT COMPLETE';
    if(n.phase)n.phase.textContent='666SOUNDsDESIGn READY';
    n.steps?.forEach(step=>{step.classList.remove('active');step.classList.add('done');});
    global.setTimeout(()=>hide(reason),180);
  }

  function hide(reason='hide'){
    if(!root) return;
    cancelAnimationFrame(raf);
    root.dataset.state='leaving';
    root.dataset.closeReason=String(reason);
    global.setTimeout(()=>{
      if(root){root.remove();root=null;}
      document.documentElement.classList.remove('s666-central-boot-active');
      // Guard: auch verspätet erzeugte historische Boot-DOMs nicht verstecken, sondern entfernen.
      detachLegacyBootDom();
    },300);
  }

  function status(text,label){
    const n=nodes();
    if(n.status&&text)n.status.textContent=String(text);
    if(n.phase&&label)n.phase.textContent=String(label);
  }

  function bootOnce(){
    if(readyPromise) return readyPromise;
    readyPromise=show().catch(error=>{
      document.documentElement.classList.remove('s666-central-boot-active');
      console.warn('[S666 Central Boot]',error);
      return null;
    });
    return readyPromise;
  }

  global.S666CentralBootScreen=Object.freeze({
    version:VERSION,show,hide,complete,setProgress,status,bootOnce,
    removeLegacyBootDom:detachLegacyBootDom,
    isActive:()=>Boolean(root&&root.isConnected)
  });
  bootOnce();
})(window);
