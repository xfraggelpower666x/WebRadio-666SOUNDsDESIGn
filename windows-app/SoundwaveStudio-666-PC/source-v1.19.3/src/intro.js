'use strict';
(() => {
  const q=s=>document.querySelector(s);
  const banner=q('#intro-banner'), logo=q('#intro-logo');
  if(window.RWAssets?.banner) banner.src=window.RWAssets.banner; else banner.style.display='none';
  if(window.RWAssets?.inAppLogo) logo.src=window.RWAssets.inAppLogo; else logo.style.display='none';
  banner.onerror=()=>banner.style.display='none';
  logo.onerror=()=>logo.style.display='none';

  const phase=q('#phase-line'), detail=q('#phase-detail'), fill=q('#progress-fill'), online=q('#system-online');
  let completed=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const setPhase=(title,text,pct)=>{phase.textContent=title;detail.textContent=text;fill.style.width=pct+'%';};

  async function run(){
    setPhase('PHASE 1 · INITIALIZING','Preparing RADIO WAVE runtime and visual surface…',18);
    await sleep(1600);

    setPhase('PHASE 2 · SOUNDWAVE CORE','Loading audio analyser, visual engines and radio addon…',56);
    await sleep(2500);

    setPhase('PHASE 2 · SYNCHRONIZING','Binding real audio reactivity, metadata and display outputs…',82);
    await sleep(1200);

    setPhase('SYSTEM HANDOFF · READY','RADIO WAVE v6.66 is ready.',100);
    online.classList.add('blinking');
    await sleep(2700);

    online.classList.remove('blinking');
    online.classList.add('hold');
    await sleep(2000);

    if(completed)return;
    completed=true;
    try{await window.introApi.complete();}catch{}
  }
  run();
})();
