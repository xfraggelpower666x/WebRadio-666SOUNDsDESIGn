/* 666SOUNDsDESIGn Radio — Central LYVRA Boot Screen v1.0.1
 * Optik/HTML aus NEOCITIES_REDIRECT_LYVRA_v1.1.1 übernommen.
 * Redirect-/Navigation-Code absichtlich entfernt.
 * Zentraler Owner für Root Player + VELUNA Player auf Desktop/iPhone/Android.
 * v1.0.1: zusätzliche Start-/Bestätigungsstufe entfernt; Boot endet automatisch.
 */
(function installS666CentralBootScreen(global){
  'use strict';
  if(global.S666CentralBootScreen) return;

  const VERSION='1.0.1';
  const TEMPLATE_URL='/components/boot-screen/boot-screen.html?v=20260809';
  const STYLE_URL='/css/central-boot-screen.css?v=20260809';
  const DEFAULT_DURATION=4200;
  let root=null,raf=0,startAt=0,duration=DEFAULT_DURATION,lastPhase=-1,readyPromise=null;

  const phases=[
    {at:0,status:'INITIALIZING PLAYER',label:'CONNECTING RADIO CORE',step:0},
    {at:24,status:'STARTING AUDIO PATH',label:'PREPARING PLAYER ENGINE',step:1},
    {at:52,status:'SYNCHRONIZING SYSTEMS',label:'CONNECTING RADIO SERVICES',step:2},
    {at:82,status:'PLAYER SEQUENCE ARMED',label:'HANDING OFF TO PLAYER',step:3},
    {at:98,status:'BOOT COMPLETE',label:'666SOUNDsDESIGn READY',step:3}
  ];

  function ensureStyle(){
    if(document.querySelector('link[data-s666-central-boot-style]')) return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=STYLE_URL;link.dataset.s666CentralBootStyle='1';(document.head||document.documentElement).appendChild(link);
  }
  function legacyOverlay(){return document.getElementById('bootOverlay')}
  function suppressLegacy(){const el=legacyOverlay();if(el){el.dataset.s666CentralBootSuppressed='1';el.style.setProperty('display','none','important');}}
  function restoreLegacy(){const el=legacyOverlay();if(el&&el.dataset.s666CentralBootSuppressed==='1'){el.style.removeProperty('display');delete el.dataset.s666CentralBootSuppressed;}}
  async function mount(){
    if(root&&root.isConnected) return root;
    ensureStyle();
    if(!document.body) await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
    suppressLegacy();
    const response=await fetch(TEMPLATE_URL,{cache:'no-store',credentials:'same-origin'});
    if(!response.ok) throw new Error('central_boot_template_http_'+response.status);
    const holder=document.createElement('div');holder.innerHTML=await response.text();root=holder.firstElementChild;
    if(!root) throw new Error('central_boot_template_empty');
    document.body.appendChild(root);document.documentElement.classList.add('s666-central-boot-active');
    return root;
  }
  function nodes(){return root?{bar:root.querySelector('#s666boot-bar'),percent:root.querySelector('#s666boot-percent'),track:root.querySelector('#s666boot-track'),status:root.querySelector('#s666boot-status'),phase:root.querySelector('#s666boot-phase'),steps:[...root.querySelectorAll('.s666boot-step')]}:{}}
  function setProgress(progress){
    if(!root) return;const n=nodes();const p=Math.max(0,Math.min(100,Math.round(Number(progress)||0)));if(n.bar)n.bar.style.width=p+'%';if(n.percent)n.percent.textContent=p+'%';if(n.track)n.track.setAttribute('aria-valuenow',String(p));
    let current=phases[0];for(const phase of phases)if(p>=phase.at)current=phase;const idx=phases.indexOf(current);if(idx!==lastPhase){lastPhase=idx;if(n.status)n.status.textContent=current.status;if(n.phase)n.phase.textContent=current.label;n.steps?.forEach((step,i)=>{step.classList.toggle('done',i<current.step);step.classList.toggle('active',i===current.step);});}
  }
  function tick(now){if(!root) return;const elapsed=now-startAt;const progress=Math.min(100,(elapsed/duration)*100);setProgress(progress);if(elapsed<duration){raf=requestAnimationFrame(tick);return;}complete('timer');}
  async function show(options={}){await mount();cancelAnimationFrame(raf);duration=Math.max(600,Number(options.duration)||DEFAULT_DURATION);startAt=performance.now();lastPhase=-1;root.dataset.state='booting';root.style.removeProperty('display');root.style.removeProperty('opacity');setProgress(0);raf=requestAnimationFrame(tick);return root;}
  function complete(reason='complete'){
    if(!root) return;cancelAnimationFrame(raf);setProgress(100);const n=nodes();if(n.status)n.status.textContent='BOOT COMPLETE';if(n.phase)n.phase.textContent='666SOUNDsDESIGn READY';n.steps?.forEach(step=>{step.classList.remove('active');step.classList.add('done');});global.setTimeout(()=>hide(reason),180);
  }
  function hide(reason='hide'){
    if(!root) return;cancelAnimationFrame(raf);root.dataset.state='leaving';root.dataset.closeReason=String(reason);global.setTimeout(()=>{if(root){root.remove();root=null;}document.documentElement.classList.remove('s666-central-boot-active');suppressLegacy();},300);
  }
  function status(text,label){const n=nodes();if(n.status&&text)n.status.textContent=String(text);if(n.phase&&label)n.phase.textContent=String(label)}
  function bootOnce(){if(readyPromise) return readyPromise;readyPromise=show().catch(error=>{restoreLegacy();document.documentElement.classList.remove('s666-central-boot-active');console.warn('[S666 Central Boot]',error);return null;});return readyPromise;}

  global.S666CentralBootScreen=Object.freeze({version:VERSION,show,hide,complete,setProgress,status,bootOnce,isActive:()=>Boolean(root&&root.isConnected)});
  bootOnce();
})(window);
