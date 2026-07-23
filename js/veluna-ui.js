/* VELUNA Central UI Runtime v1.2.32 — no delayed splash ownership + shared live audio-reactive graphics */
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

  function installTouchFeedback(){
    if (document.documentElement.dataset.velunaTouchFeedback === '1') return;
    document.documentElement.dataset.velunaTouchFeedback = '1';
    const selector = 'button,a[href],[role="button"],input[type="button"],input[type="submit"],.control-btn,.small-btn,.source-led-btn,.tiny-btn';
    let pressed = null;
    let releaseTimer = 0;

    const release = (delay = 0) => {
      clearTimeout(releaseTimer);
      const current = pressed;
      releaseTimer = window.setTimeout(() => {
        if (!current) return;
        current.classList.remove('is-pressed');
        current.removeAttribute('data-veluna-press');
        if (pressed === current) pressed = null;
      }, delay);
    };

    const press = (target, inputType) => {
      const control = target?.closest?.(selector);
      if (!control || !body.contains(control) || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
      if (pressed && pressed !== control) release(0);
      pressed = control;
      clearTimeout(releaseTimer);
      control.classList.add('is-pressed');
      control.setAttribute('data-veluna-press','1');
      try {
        window.dispatchEvent(new CustomEvent('veluna:button-feedback', { detail: {
          page,
          id: control.id || '',
          action: control.getAttribute('data-action') || control.textContent?.trim().slice(0,40) || '',
          input: inputType || 'pointer'
        }}));
      } catch (_) {}
    };

    document.addEventListener('pointerdown', event => press(event.target, event.pointerType || 'pointer'), { capture:true, passive:true });
    document.addEventListener('pointerup', () => release(150), { capture:true, passive:true });
    document.addEventListener('pointercancel', () => release(0), { capture:true, passive:true });
    document.addEventListener('touchend', () => release(170), { capture:true, passive:true });
    document.addEventListener('touchcancel', () => release(0), { capture:true, passive:true });
    document.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') press(event.target, 'keyboard');
    }, true);
    document.addEventListener('keyup', event => {
      if (event.key === 'Enter' || event.key === ' ') release(120);
    }, true);
    window.addEventListener('blur', () => release(0), { passive:true });
  }

  const ACTIVE_STYLE_PROPERTIES = ['color','border-color','background','box-shadow','text-shadow','filter'];

  function isPersistentActive(control){
    return control.classList.contains('is-active') ||
      control.classList.contains('transport-active') ||
      control.getAttribute('aria-pressed') === 'true' ||
      control.getAttribute('data-state') === 'active';
  }

  function syncPersistentControlState(control){
    if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
    if (isPersistentActive(control)) {
      control.dataset.velunaActivePaint = '1';
      control.style.setProperty('color','#fff','important');
      control.style.setProperty('border-color','rgba(222,176,255,.98)','important');
      control.style.setProperty('background','linear-gradient(135deg,rgba(180,92,255,.78),rgba(86,27,145,.88)),rgba(10,5,20,.98)','important');
      control.style.setProperty('box-shadow','0 0 7px rgba(255,255,255,.78),0 0 20px rgba(180,92,255,.92),0 0 28px rgba(115,63,255,.52),inset 0 0 16px rgba(255,255,255,.12)','important');
      control.style.setProperty('text-shadow','0 0 8px rgba(255,255,255,.72)','important');
      control.style.setProperty('filter','brightness(1.12) saturate(1.2)','important');
      return;
    }
    if (control.dataset.velunaActivePaint !== '1') return;
    for (const property of ACTIVE_STYLE_PROPERTIES) control.style.removeProperty(property);
    delete control.dataset.velunaActivePaint;
  }

  function installPersistentActiveState(){
    if (page !== 'veluna' || host.dataset.velunaPersistentActive === '1') return;
    host.dataset.velunaPersistentActive = '1';
    const selector = 'button,.control-btn,.small-btn,.source-led-btn,.tiny-btn';
    const syncAll = () => host.querySelectorAll(selector).forEach(syncPersistentControlState);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') syncPersistentControlState(record.target);
        for (const node of record.addedNodes || []) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.(selector)) syncPersistentControlState(node);
          node.querySelectorAll?.(selector).forEach(syncPersistentControlState);
        }
      }
    });
    observer.observe(host, { subtree:true, childList:true, attributes:true, attributeFilter:['class','aria-pressed','disabled','data-state'] });
    document.addEventListener('click', event => {
      const control = event.target?.closest?.(selector);
      if (control && host.contains(control)) requestAnimationFrame(() => syncPersistentControlState(control));
    }, true);
    requestAnimationFrame(syncAll);
  }

  function injectVolumeControl(){
    if (page !== 'veluna' || q('#velunaVolumeSlider', host)) return;
    const sourceSwitch = q('.source-switch', host);
    const audio = q('#radio', host) || q('audio', host) || q('audio');
    if (!sourceSwitch || !audio) return;

    const row = document.createElement('div');
    row.className = 'veluna-volume-row';
    row.dataset.velunaVolume = '1';
    row.setAttribute('role','group');
    row.setAttribute('aria-label','Lautstärke');
    row.style.cssText = 'grid-column:1/-1;min-width:0;min-height:28px;display:grid;grid-template-columns:auto minmax(0,1fr) 42px;align-items:center;gap:7px;padding:3px 8px;border:1px solid rgba(22,139,255,.46);border-radius:11px;background:linear-gradient(90deg,rgba(180,92,255,.10),rgba(22,139,255,.08));box-shadow:inset 0 0 12px rgba(180,92,255,.08),0 0 10px rgba(22,139,255,.16);';

    const label = document.createElement('label');
    label.htmlFor = 'velunaVolumeSlider';
    label.textContent = 'VOL';
    label.style.cssText = 'color:#dcb0ff;font-weight:900;font-size:.68rem;letter-spacing:.06em;text-shadow:0 0 8px rgba(180,92,255,.56);';

    const slider = document.createElement('input');
    slider.id = 'velunaVolumeSlider';
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = '1';
    slider.setAttribute('aria-label','Lautstärke');
    slider.style.cssText = 'width:100%;min-width:0;accent-color:#b45cff;cursor:pointer;pointer-events:auto;';

    const output = document.createElement('output');
    output.id = 'velunaVolumeValue';
    output.htmlFor = 'velunaVolumeSlider';
    output.textContent = '100%';
    output.style.cssText = 'color:#dcb0ff;font-weight:900;font-size:.68rem;letter-spacing:.03em;text-align:right;font-variant-numeric:tabular-nums;text-shadow:0 0 8px rgba(180,92,255,.56);';

    row.append(label, slider, output);
    sourceSwitch.appendChild(row);

    const key = 'veluna_volume_v1';
    const clamp = value => Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : 1));
    const load = () => {
      try {
        const saved = localStorage.getItem(key);
        return saved === null ? 1 : clamp(saved);
      } catch (_) {
        return 1;
      }
    };
    const render = value => {
      const next = clamp(value);
      slider.value = String(next);
      slider.setAttribute('aria-valuetext', `${Math.round(next * 100)} Prozent`);
      output.value = `${Math.round(next * 100)}%`;
      output.textContent = output.value;
      return next;
    };
    const apply = (value, persist = true) => {
      const next = render(value);
      try { audio.volume = next; } catch (_) {}
      if (persist) {
        try { localStorage.setItem(key, String(next)); } catch (_) {}
      }
      return next;
    };
    const unmuteForManualVolume = () => {
      if (!audio.muted) return;
      audio.muted = false;
      const mute = q('#muteBtn', host);
      if (mute) {
        mute.textContent = 'MUTE';
        mute.classList.remove('is-active');
        mute.setAttribute('aria-pressed','false');
        syncPersistentControlState(mute);
      }
    };

    slider.addEventListener('input', () => {
      unmuteForManualVolume();
      apply(slider.value, true);
    });
    slider.addEventListener('change', () => apply(slider.value, true));
    audio.addEventListener('volumechange', () => {
      if (!audio.muted) render(audio.volume);
    });

    apply(load(), false);
    window.VELUNA_VOLUME_CONTROL = Object.freeze({ apply, slider, output });
  }

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
    img.width = 1536;
    img.height = 509;
    img.classList.add('s666-canonical-header-image');
    img.style.aspectRatio = '1536 / 509';
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
    if (window.SMFPArtworkCore?.enforce) { window.SMFPArtworkCore.enforce(); return; }
    for (const img of document.querySelectorAll('#nowCover,.now-cover,[data-stream-cover]')) {
      if (!img.getAttribute('src')) img.src = fallback;
    }
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
    let lastFrame = 0;
    const envelope = { bass:.02, mid:.02, high:.02, pulse:0, stereo:0 };
    const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
    const average = (values, fallback = 0) => values?.length ? values.reduce((sum,value)=>sum+(Number(value)||0),0)/values.length : fallback;
    const follow = (key,target,attack=.70,release=.10) => {
      const previous = envelope[key] || 0;
      envelope[key] = previous + (target - previous) * (target > previous ? attack : release);
      return envelope[key];
    };
    const tick = timestamp => {
      if (timestamp - lastFrame < 33) { requestAnimationFrame(tick); return; }
      lastFrame = timestamp;
      const bus = window.__MeterBus || {};
      const fresh = Boolean(bus.ts && Date.now() - bus.ts < 1000);
      const eq = fresh && Array.isArray(bus.eq) ? bus.eq : [];
      const half = eq.slice(0, Math.max(1, Math.ceil(eq.length / 2)));
      const level = fresh ? clamp01(bus.level) : 0;
      const targetBass = fresh ? clamp01(Number.isFinite(Number(bus.low)) ? bus.low : average(half.slice(0,Math.max(1,Math.ceil(half.length*.34))),level)) : 0;
      const targetMid = fresh ? clamp01(Number.isFinite(Number(bus.mid)) ? bus.mid : average(half.slice(Math.floor(half.length*.25),Math.max(2,Math.ceil(half.length*.72))),level)) : 0;
      const targetHigh = fresh ? clamp01(Number.isFinite(Number(bus.high)) ? bus.high : average(half.slice(Math.floor(half.length*.62)),level)) : 0;
      const targetPulse = fresh ? clamp01(bus.pulse || Math.max(0,(Number(bus.peak)||level)-level)) : 0;
      const targetStereo = fresh ? clamp01(Math.abs(average(bus.left,level)-average(bus.right,level))*2.5) : 0;
      const bass = follow('bass',targetBass,.72,.08);
      const mid = follow('mid',targetMid,.66,.09);
      const high = follow('high',targetHigh,.74,.12);
      const pulse = follow('pulse',targetPulse,.84,.07);
      const stereo = follow('stereo',targetStereo,.70,.10);
      body.style.setProperty('--veluna-bass',bass.toFixed(3));
      body.style.setProperty('--veluna-mid',mid.toFixed(3));
      body.style.setProperty('--veluna-high',high.toFixed(3));
      body.style.setProperty('--veluna-pulse',pulse.toFixed(3));
      body.style.setProperty('--veluna-stereo',stereo.toFixed(3));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  installTouchFeedback();
  installPersistentActiveState();
  injectVolumeControl();
  injectHeader();
  injectBottomBanner();
  replaceFallbackArtwork();
  mediaSessionFallback();
  animateBackground();
})();
