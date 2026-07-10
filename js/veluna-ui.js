/* VELUNA Central UI Runtime v1.2.12 */
(() => {
  'use strict';
  const A = window.VELUNA_ASSETS || {};
  const path = location.pathname.toLowerCase();
  const body = document.body;
  const declaredPage = body?.dataset?.velunaPage;
  const page = declaredPage || (path.startsWith('/veluna') ? 'veluna' : path.startsWith('/internal') ? 'internal' : 'main');
  if (!body) return;
  body.dataset.velunaUi = '1';
  body.dataset.velunaPage = page;
  body.style.setProperty('--veluna-background-image', `url("${A.background || '/assets/veluna/background/veluna-player-background.webp'}")`);

  const q = (sel, root = document) => root.querySelector(sel);
  const host = (page === 'main' ? q('.player-shell') : q('.player-card')) || q('[data-player-root]') || q('.player-card') || q('.player-shell') || q('main');
  if (!host) return;
  host.classList.add('veluna-splash-host');

  function injectHeader(){
    if (q('.veluna-global-header', host)) return;
    const header = document.createElement('div');
    header.className = 'veluna-global-header';
    header.setAttribute('role','img');
    header.setAttribute('aria-label','LYVRA VELUNA');
    const img = new Image();
    img.src = A.header || '/assets/veluna/header/veluna-player-header.webp';
    img.alt = 'LYVRA VELUNA';
    img.decoding = 'async';
    img.fetchPriority = 'high';
    header.appendChild(img);
    if (page === 'main') host.prepend(header);
    else {
      const topbar = q('.topbar', host);
      if (topbar) topbar.insertAdjacentElement('afterend', header); else host.prepend(header);
    }
  }

  function injectBottomBanner(){
    const existing = q('.veluna-bottom-brand');
    const mobileContext = matchMedia('(pointer:coarse)').matches && matchMedia('(max-width:1024px)').matches;
    const allowed = page === 'veluna' && mobileContext;
    if (!allowed) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    const img = new Image();
    img.className = 'veluna-bottom-brand';
    img.src = A.bottomBanner || '/assets/veluna/banner/veluna-bottom-banner.webp';
    img.alt = 'VELUNA LYVRA Minimal WebRadio 666';
    img.loading = 'eager';
    img.decoding = 'async';
    host.appendChild(img);
  }

  function replaceFallbackArtwork(){
    const fallback = A.fallbackCover || '/assets/veluna/covers/veluna-stream-fallback.webp';
    for (const img of document.querySelectorAll('#nowCover,.now-cover,[data-stream-cover]')) {
      if (!img.dataset.trackArtworkActive) img.src = fallback;
    }
    window.dispatchEvent(new CustomEvent('veluna:fallback-ready',{detail:{src:fallback}}));
  }

  function injectSplash(){
    if (q('[data-veluna-central-splash="1"]')) return;
    const splash = document.createElement('div');
    splash.className = 'veluna-splash veluna-splash-global';
    splash.dataset.velunaCentralSplash = '1';
    splash.dataset.player = page;
    splash.setAttribute('aria-hidden','true');
    const video = document.createElement('video');
    video.autoplay = true; video.muted = true; video.playsInline = true; video.preload = 'auto';
    video.setAttribute('webkit-playsinline','');
    video.setAttribute('disablepictureinpicture','');
    const webm = document.createElement('source'); webm.src = A.splashWebm || '/assets/veluna/splash/veluna-loading-splash.webm'; webm.type='video/webm';
    const mp4 = document.createElement('source'); mp4.src = A.splashMp4 || '/assets/veluna/splash/veluna-loading-splash.mp4'; mp4.type='video/mp4';
    video.append(webm,mp4); splash.appendChild(video); body.appendChild(splash);
    body.dataset.velunaSplash = 'active';
    window.VELUNA_CENTRAL_SPLASH_READY = true;
    let finished = false;
    const finish = () => {
      if (finished || !splash.isConnected) return;
      finished = true;
      splash.classList.add('is-leaving');
      body.dataset.velunaSplash = 'complete';
      setTimeout(() => splash.remove(), 480);
    };
    video.addEventListener('ended',finish,{once:true});
    video.addEventListener('error',finish,{once:true});
    setTimeout(finish,7200);
    video.play().catch(() => setTimeout(finish,1600));
  }

  function mediaSessionFallback(){
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const fallback = A.fallbackCover || '/assets/veluna/covers/veluna-stream-fallback.webp';
    const existing = navigator.mediaSession.metadata;
    if (!existing) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title:'VELUNA WebRadio',artist:'LYVRA DJ',album:'VELUNA / LYVRA / 666SOUNDsDESIGn',
        artwork:[{src:fallback,sizes:'1200x1200',type:'image/webp'},{src:A.appIcon || '/assets/veluna/icons/icon-512x512.png',sizes:'512x512',type:'image/png'}]
      });
    }
  }

  function animateBackground(){
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let smooth=.04, phase=0;
    const tick=()=>{
      const bus=window.__MeterBus;
      let level=Number(bus?.level||0), peak=Number(bus?.peak||level);
      const audio=q('audio');
      if ((!Number.isFinite(level)||level<=0) && audio && !audio.paused) level=.14+Math.abs(Math.sin(phase))*.08;
      phase+=.035;
      smooth += (Math.min(1,Math.max(0,level)) - smooth) * .09;
      const high=Math.min(1,Math.max(0,peak||smooth*.8));
      body.style.setProperty('--veluna-bass',smooth.toFixed(3));
      body.style.setProperty('--veluna-mid',(smooth*.72).toFixed(3));
      body.style.setProperty('--veluna-high',(high*.58).toFixed(3));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  injectHeader();
  injectBottomBanner();
  replaceFallbackArtwork();
  mediaSessionFallback();
  animateBackground();
  requestAnimationFrame(injectSplash);
})();
