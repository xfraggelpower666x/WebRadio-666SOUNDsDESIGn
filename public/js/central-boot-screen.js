/* 666SOUNDsDESIGn Radio — Central Player Boot + Session Identity v2.1.0
 * One boot owner for Hub/Main, iPhone, Android, VELUNA and Internal.
 * Also owns route-specific PWA + MediaSession identity used by system media surfaces.
 * No stream/audio graph/EQ/boost/Discord transport changes.
 */
(function installS666CentralBootScreen(global){
  'use strict';
  if(global.S666CentralBootScreen) return;

  const VERSION='2.1.0';
  const STYLE_URL='/css/central-boot-screen.css?v=20260812-v200';
  const DEFAULT_DURATION=4200;
  const OWNER_KEY='s666_active_player_owner_v2';
  const BOOT_MARKER='2026-08-13-root-identity-regression-v4';

  let root=null,raf=0,startAt=0,duration=DEFAULT_DURATION,lastPhase=-1,readyPromise=null;

  const phases=[
    {at:0,status:'INITIALIZING PLAYER',label:'CONNECTING RADIO CORE',step:0},
    {at:24,status:'STARTING AUDIO PATH',label:'PREPARING PLAYER ENGINE',step:1},
    {at:52,status:'SYNCHRONIZING SYSTEMS',label:'CONNECTING RADIO SERVICES',step:2},
    {at:82,status:'PLAYER SEQUENCE ARMED',label:'HANDING OFF TO PLAYER',step:3},
    {at:98,status:'BOOT COMPLETE',label:'666SOUNDsDESIGn READY',step:3}
  ];

  function isIOS(){
    const ua=String(global.navigator?.userAgent||'');
    return /iPad|iPhone|iPod/i.test(ua) || (global.navigator?.platform==='MacIntel' && Number(global.navigator?.maxTouchPoints||0)>1);
  }

  function deviceClass(){
    const ua=String(global.navigator?.userAgent||'');
    if(isIOS()) return 'iphone';
    if(/Android/i.test(ua)) return 'android';
    return 'desktop';
  }

  function pageClass(){
    const declared=String(document.body?.dataset?.velunaPage||'').toLowerCase();
    if(declared==='veluna'||declared==='internal'||declared==='main') return declared;
    const path=String(global.location?.pathname||'/').toLowerCase();
    if(path==='/veluna'||path.startsWith('/veluna/')) return 'veluna';
    if(path==='/internal'||path.startsWith('/internal/')) return 'internal';
    return 'main';
  }

  function playerIdentity(){
    const page=pageClass();
    const device=deviceClass();
    if(page==='veluna') return {page,device,playerId:'veluna',route:'/veluna/',manifest:'/veluna.webmanifest',title:'VELUNA LYVRA'};
    if(page==='internal') return {page,device,playerId:'internal',route:'/internal/',manifest:'/internal.webmanifest',title:'666 Internal Player'};
    if(device==='iphone') return {page,device,playerId:'iphone',route:'/',manifest:'/site.webmanifest',title:'666 WebRadio iPhone'};
    if(device==='android') return {page,device,playerId:'android',route:'/',manifest:'/site.webmanifest',title:'666 WebRadio Android'};
    return {page,device,playerId:'hub',route:'/',manifest:'/site.webmanifest',title:'666 WebRadio Hub'};
  }

  function mediaIdentity(identity){
    if(identity.page==='veluna') return {
      title:'VELUNA WebRadio',artist:'LYVRA DJ',album:'VELUNA / LYVRA / 666SOUNDsDESIGn',
      artwork:[
        {src:'/assets/veluna/covers/veluna-stream-fallback.webp',sizes:'1200x1200',type:'image/webp'},
        {src:'/assets/veluna/icons/icon-512x512.png',sizes:'512x512',type:'image/png'}
      ]
    };
    if(identity.page==='internal') return {
      title:'666 Internal Player',artist:'666SOUNDsDESIGn',album:'Emergency WebRadio Player',
      artwork:[{src:'/assets/logos/phase10-new-header-logo.png',type:'image/png'}]
    };
    return {
      title:'666SOUNDsDESIGn WebRadio',artist:'RadioBotAI DJ',album:'666SOUNDsDESIGn',
      artwork:[{src:'/assets/logos/phase10-new-header-logo.png',type:'image/png'}]
    };
  }

  function applyMediaIdentity(identity,reason='identity'){
    if(!('mediaSession' in navigator)||typeof MediaMetadata==='undefined') return false;
    try{
      const meta=mediaIdentity(identity);
      navigator.mediaSession.metadata=new MediaMetadata(meta);
      document.documentElement.dataset.s666MediaIdentityOwner=identity.playerId;
      document.documentElement.dataset.s666MediaIdentityReason=String(reason);
      return true;
    }catch(_){return false;}
  }

  function upsertMeta(name,value){
    if(!document.head) return;
    let node=document.head.querySelector(`meta[name="${name}"]`);
    if(!node){
      node=document.createElement('meta');
      node.name=name;
      document.head.appendChild(node);
    }
    node.content=String(value);
  }

  function installPlayerIdentity(){
    const identity=playerIdentity();
    const html=document.documentElement;
    html.dataset.s666PlayerId=identity.playerId;
    html.dataset.s666PlayerPage=identity.page;
    html.dataset.s666PlayerDevice=identity.device;
    html.dataset.s666PlayerRoute=identity.route;
    html.dataset.s666PlayerIdentityVersion=VERSION;

    if(document.head){
      let manifest=document.head.querySelector('link[rel="manifest"]');
      if(!manifest){
        manifest=document.createElement('link');
        manifest.rel='manifest';
        document.head.appendChild(manifest);
      }
      const wanted=`${identity.manifest}?v=${BOOT_MARKER}`;
      if(manifest.getAttribute('href')!==wanted) manifest.setAttribute('href',wanted);
      manifest.dataset.s666PlayerOwned='1';
      upsertMeta('apple-mobile-web-app-title',identity.title);
      upsertMeta('application-name',identity.title);
      upsertMeta('s666-player-id',identity.playerId);
      upsertMeta('s666-player-route',identity.route);
    }

    const reassertMedia=(reason)=>{
      applyMediaIdentity(identity,reason);
      global.setTimeout(()=>applyMediaIdentity(identity,`${reason}-settled`),0);
    };

    const markActive=(reason='runtime')=>{
      const payload={
        version:2,
        playerId:identity.playerId,
        page:identity.page,
        device:identity.device,
        route:identity.route,
        pathname:String(global.location?.pathname||identity.route),
        origin:String(global.location?.origin||''),
        reason:String(reason),
        at:Date.now()
      };
      try{global.sessionStorage?.setItem(OWNER_KEY,JSON.stringify(payload));}catch(_){}
      try{global.localStorage?.setItem(OWNER_KEY,JSON.stringify(payload));}catch(_){}
      html.dataset.s666PlayerOwnerReason=String(reason);
      html.dataset.s666PlayerOwnerAt=String(payload.at);
      reassertMedia(reason);
      try{global.dispatchEvent(new CustomEvent('s666:player-owner',{detail:payload}));}catch(_){}
      return payload;
    };

    const bindAudio=()=>{
      const audio=document.getElementById('radio')||document.querySelector('audio');
      if(!audio||audio.dataset.s666PlayerOwnerBound==='1') return false;
      audio.dataset.s666PlayerOwnerBound='1';
      audio.addEventListener('play',()=>markActive('audio-play'),true);
      audio.addEventListener('playing',()=>markActive('audio-playing'),true);
      return true;
    };

    markActive('page-load');
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',()=>{bindAudio();markActive('dom-ready');},{once:true});
    }else{
      bindAudio();
    }
    global.addEventListener('pageshow',()=>{bindAudio();markActive('pageshow');},{passive:true});
    global.addEventListener('focus',()=>markActive('focus'),{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){bindAudio();markActive('visible');}
    },true);

    global.S666PlayerIdentity=Object.freeze({
      version:VERSION,
      ownerKey:OWNER_KEY,
      identity:Object.freeze({...identity}),
      markActive,
      bindAudio,
      applyMediaIdentity:(reason='manual')=>applyMediaIdentity(identity,reason),
      readLastOwner:()=>{
        try{return JSON.parse(global.localStorage?.getItem(OWNER_KEY)||'null');}catch(_){return null;}
      }
    });
    return identity;
  }

  const identity=installPlayerIdentity();

  function domReady(){
    if(document.readyState!=='loading') return Promise.resolve();
    return new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  }

  function ensureStyle(){
    let bootLink=Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(link=>String(link.getAttribute('href')||'').includes('/css/central-boot-screen.css'));
    if(!bootLink){
      bootLink=document.createElement('link');
      bootLink.rel='stylesheet';
      (document.head||document.documentElement).appendChild(bootLink);
    }
    bootLink.href=STYLE_URL;
    bootLink.dataset.s666CentralBootStyle='1';
    if(!document.getElementById('s666CentralBootPreflightStyle')){
      const style=document.createElement('style');
      style.id='s666CentralBootPreflightStyle';
      style.textContent='#s666CentralBoot{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;width:100vw;height:100vh;height:100svh;background:#020006;color:#f7edff;overflow:hidden;font-family:Segoe UI,Inter,Arial,sans-serif}#s666CentralBoot .s666boot-panel{width:min(91vw,42rem);padding:1rem;text-align:center;border:1px solid rgba(194,112,255,.72);background:rgba(5,0,20,.82);box-shadow:0 0 32px rgba(145,55,255,.3)}#s666CentralBoot #s666boot-title{letter-spacing:.24em}html.s666-central-boot-active,html.s666-central-boot-active body{overflow:hidden!important}';
      (document.head||document.documentElement).appendChild(style);
    }
  }

  function bootMarkup(){
    return '<div class="s666boot-scanlines" aria-hidden="true"></div>'+
      '<section class="s666boot-panel" aria-live="polite">'+
      '<p class="s666boot-eyebrow">666SOUNDsDESIGn RADIO SYSTEM</p>'+
      '<h1 id="s666boot-title">CYBER BOOTING</h1>'+
      '<p class="s666boot-status" id="s666boot-status">INITIALIZING PLAYER</p>'+
      '<div class="s666boot-core" aria-hidden="true"></div>'+
      '<div class="s666boot-progress-wrap" aria-label="Player boot progress">'+
      '<div class="s666boot-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="s666boot-track"><div class="s666boot-bar" id="s666boot-bar"></div></div>'+
      '<div class="s666boot-percent" id="s666boot-percent">0%</div></div>'+
      '<p class="s666boot-phase-label" id="s666boot-phase">CONNECTING RADIO CORE</p>'+
      '<div class="s666boot-steps" aria-hidden="true">'+
      '<div class="s666boot-step active" data-step="0">Connect</div><div class="s666boot-step" data-step="1">Audio</div><div class="s666boot-step" data-step="2">Systems</div><div class="s666boot-step" data-step="3">Player</div>'+
      '</div></section>';
  }

  function primeBootShell(){
    ensureStyle();
    const existing=document.getElementById('s666CentralBoot');
    if(existing){root=existing;}
    if(!root){
      root=document.createElement('main');
      root.id='s666CentralBoot';
      root.className='s666boot-scene';
      root.setAttribute('aria-labelledby','s666boot-title');
      root.dataset.state='booting';
      root.dataset.player=identity.playerId;
      root.dataset.playerRoute=identity.route;
      root.dataset.bootOwner=BOOT_MARKER;
      root.innerHTML=bootMarkup();
      (document.body||document.documentElement).appendChild(root);
    }
    document.documentElement.classList.add('s666-central-boot-active');
    return root;
  }

  primeBootShell();

  function detachLegacyBootDom(){
    for(const legacy of Array.from(document.querySelectorAll('#bootOverlay,[data-veluna-central-splash="1"]'))){
      const isBootOverlay=legacy.id==='bootOverlay';
      if(isBootOverlay && pageClass()==='internal'){
        const legacyButton=document.getElementById('bootButton');
        if(legacyButton&&typeof legacyButton.click==='function'){
          try{legacyButton.click();}catch(_){}
        }
      }
      try{legacy.remove();}catch(_){legacy.parentNode?.removeChild?.(legacy);}
    }
  }

  async function mount(){
    if(root&&root.isConnected) return root;
    primeBootShell();
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

  void domReady().then(()=>{
    if(root&&document.body&&root.parentNode!==document.body) document.body.appendChild(root);
    detachLegacyBootDom();
    global.S666PlayerIdentity?.bindAudio?.();
    global.S666PlayerIdentity?.applyMediaIdentity?.('dom-ready-final');
  });

  global.S666CentralBootScreen=Object.freeze({
    version:VERSION,
    marker:BOOT_MARKER,
    show,hide,complete,setProgress,status,bootOnce,
    removeLegacyBootDom:detachLegacyBootDom,
    playerIdentity:()=>global.S666PlayerIdentity?.identity||identity,
    isActive:()=>Boolean(root&&root.isConnected)
  });
  bootOnce();
})(window);
