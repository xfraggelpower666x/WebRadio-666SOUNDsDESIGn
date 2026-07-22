/*
 * 666SOUNDsDESIGn central audio control UI v2.0.0.
 * Uses SMFPBoostCore for device policy, graph, 160 ms boost ramp and 5-band EQ.
 */
(() => {
  'use strict';
  if (window.SMFPAudioPolicyUI?.version === '2.0.0') return;

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const core = () => window.SMFPBoostCore;
  const page = () => document.body?.dataset?.velunaPage || (location.pathname.toLowerCase().startsWith('/veluna') ? 'veluna' : location.pathname.toLowerCase().startsWith('/internal') ? 'internal' : 'main');
  const audio = () => q('audio#radio') || q('audio');
  const isMobile = () => core()?.isMobileDevice?.() ?? (matchMedia('(pointer: coarse)').matches || innerWidth <= 860);
  const volumeKey = 'smfp_desktop_volume_v2';

  function clamp(value, min, max) {
    const number = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
  }

  function restoreVolume() {
    try { return clamp(localStorage.getItem(volumeKey) ?? 0.75, 0, 1); } catch (_) { return 0.75; }
  }

  function saveVolume(value) {
    try { localStorage.setItem(volumeKey, String(value)); } catch (_) {}
  }

  function volumeHost() {
    const currentPage = page();
    if (currentPage === 'main') return q('.volume-wrap')?.parentElement || q('.bottom-console');
    if (currentPage === 'veluna') return q('.source-switch') || q('.player-card');
    return q('.audio-tools') || q('.control-strip') || q('.player-card');
  }

  function ensureDesktopVolume() {
    const engine = core();
    const playerAudio = audio();
    if (!engine || !playerAudio) return;
    engine.applyVolumePolicy?.(document);

    if (isMobile()) {
      qa('.smfp-desktop-volume-row').forEach(node => node.remove());
      return;
    }

    const existing = q('#volumeSlider') || q('#velunaVolumeSlider') || q('#smfpDesktopVolumeSlider');
    if (existing) {
      existing.closest('.volume-wrap,.veluna-volume-row,.smfp-desktop-volume-row')?.classList.add('smfp-volume-policy-desktop');
      return;
    }

    const host = volumeHost();
    if (!host || q('.smfp-desktop-volume-row', host)) return;

    const row = document.createElement('div');
    row.className = 'smfp-desktop-volume-row smfp-volume-policy-desktop';
    row.dataset.playerVolume = 'desktop';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Desktop Lautstärke');

    const label = document.createElement('label');
    label.htmlFor = 'smfpDesktopVolumeSlider';
    label.textContent = 'VOL';

    const slider = document.createElement('input');
    slider.id = 'smfpDesktopVolumeSlider';
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = String(restoreVolume());
    slider.setAttribute('aria-label', 'Desktop Lautstärke');

    const output = document.createElement('output');
    output.htmlFor = slider.id;

    const render = () => {
      const value = clamp(slider.value, 0, 1);
      output.value = `${Math.round(value * 100)}%`;
      output.textContent = output.value;
      slider.setAttribute('aria-valuetext', `${Math.round(value * 100)} Prozent`);
      return value;
    };

    const apply = () => {
      const value = render();
      try { playerAudio.volume = value; } catch (_) {}
      saveVolume(value);
    };

    slider.addEventListener('input', apply);
    slider.addEventListener('change', apply);
    playerAudio.addEventListener('volumechange', () => {
      if (playerAudio.muted) return;
      slider.value = String(clamp(playerAudio.volume, 0, 1));
      render();
    });

    row.append(label, slider, output);
    if (page() === 'internal') host.insertAdjacentElement('afterend', row);
    else host.appendChild(row);
    apply();
  }

  function centralPanelHost() {
    return q('.player-card') || q('.player-shell') || q('main') || document.body;
  }

  function setPanelOpen(panel, button, open) {
    panel.hidden = !open;
    panel.classList.toggle('hidden', !open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    button?.classList.toggle('is-active', open);
    button?.setAttribute('aria-pressed', open ? 'true' : 'false');
    if (open) {
      core()?.ensureGraph?.(audio());
      void core()?.resume?.(audio());
      requestAnimationFrame(() => panel.querySelector('button,input')?.focus?.({ preventScroll:true }));
    }
  }

  function readPanelEq(panel) {
    const values = {};
    qa('[data-central-eq]', panel).forEach(input => { values[input.dataset.centralEq] = input.value; });
    return values;
  }

  function syncPanel(panel) {
    const engine = core();
    if (!engine) return;
    const values = engine.loadEq?.() || { sub:0, low:0, mid:0, high:0, air:0 };
    qa('[data-central-eq]', panel).forEach(input => {
      input.value = String(values[input.dataset.centralEq] ?? 0);
      const output = q(`[data-central-eq-value="${input.dataset.centralEq}"]`, panel);
      if (output) output.textContent = String(input.value);
    });
    const stage = engine.loadStage?.() || 0;
    qa('[data-central-boost]', panel).forEach(button => {
      const active = Number(button.dataset.centralBoost) === stage;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const status = q('[data-central-sound-status]', panel);
    if (status) {
      const graph = engine.graphFor?.(audio());
      status.textContent = `CENTRAL SOUND · DESKTOP · BOOST ${stage}/1 · ${graph?.gains?.length ? 'GRAPH ACTIVE' : 'GRAPH WAIT'} · RAMP 160ms`;
    }
  }

  function ensureDesktopSoundPanel() {
    const currentPage = page();
    if (isMobile() || currentPage === 'main' || q('#smfpCentralSoundPanel')) return;
    const playerAudio = audio();
    const engine = core();
    const host = centralPanelHost();
    if (!playerAudio || !engine || !host) return;

    const button = document.createElement('button');
    button.id = 'smfpCentralSoundButton';
    button.type = 'button';
    button.className = currentPage === 'veluna' ? 'small-btn smfp-central-sound-button' : 'small-btn internal-action-btn smfp-central-sound-button';
    button.textContent = 'SOUND';
    button.setAttribute('aria-controls', 'smfpCentralSoundPanel');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-pressed', 'false');

    const buttonHost = currentPage === 'veluna' ? q('.tool-strip') : q('.internal-action-grid');
    buttonHost?.appendChild(button);

    const panel = document.createElement('section');
    panel.id = 'smfpCentralSoundPanel';
    panel.className = 'panel-overlay smfp-central-sound-panel hidden';
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Central Sound');
    panel.innerHTML = `
      <div class="smfp-central-sound-head">
        <strong>CENTRAL SOUND · PC</strong>
        <button type="button" class="panel-close" data-central-sound-close aria-label="Sound schließen">×</button>
      </div>
      <div class="smfp-central-boost-row" role="group" aria-label="Desktop Boost">
        <button type="button" data-central-boost="0" aria-pressed="true">BOOST 0</button>
        <button type="button" data-central-boost="1" aria-pressed="false">BOOST 1</button>
      </div>
      <div class="smfp-central-eq-grid">
        ${['sub','low','mid','high','air'].map(key => `<label><span>${key.toUpperCase()}</span><input type="range" min="-12" max="12" step="1" value="0" data-central-eq="${key}"><output data-central-eq-value="${key}">0</output></label>`).join('')}
      </div>
      <div class="smfp-central-sound-actions">
        <button type="button" data-central-sound-reset>RESET</button>
        <button type="button" data-central-sound-apply>APPLY</button>
      </div>
      <div class="smfp-central-sound-status" data-central-sound-status>GRAPH WAIT</div>`;
    host.appendChild(panel);

    button.addEventListener('click', () => {
      const open = panel.hidden || panel.classList.contains('hidden');
      setPanelOpen(panel, button, open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      syncPanel(panel);
    });
    q('[data-central-sound-close]', panel)?.addEventListener('click', () => {
      setPanelOpen(panel, button, false);
      button.setAttribute('aria-expanded', 'false');
    });
    panel.addEventListener('click', event => {
      if (event.target !== panel) return;
      setPanelOpen(panel, button, false);
      button.setAttribute('aria-expanded', 'false');
    });

    qa('[data-central-boost]', panel).forEach(boost => boost.addEventListener('click', () => {
      const stage = engine.clampStage?.(boost.dataset.centralBoost) || 0;
      engine.ensureGraph?.(playerAudio);
      void engine.resume?.(playerAudio);
      engine.applyBoost?.(playerAudio, stage, 'central-desktop-ui');
      engine.saveStage?.(stage);
      engine.publish?.(stage, engine.getGain?.(stage), 'central-desktop-ui');
      syncPanel(panel);
    }));

    qa('[data-central-eq]', panel).forEach(input => input.addEventListener('input', () => {
      const output = q(`[data-central-eq-value="${input.dataset.centralEq}"]`, panel);
      if (output) output.textContent = String(input.value);
      engine.ensureGraph?.(playerAudio);
      void engine.resume?.(playerAudio);
      engine.applyEq?.(playerAudio, readPanelEq(panel), 'central-desktop-ui');
      syncPanel(panel);
    }));

    q('[data-central-sound-reset]', panel)?.addEventListener('click', () => {
      const flat = { sub:0, low:0, mid:0, high:0, air:0 };
      engine.applyBoost?.(playerAudio, 0, 'central-reset');
      engine.saveStage?.(0);
      engine.applyEq?.(playerAudio, flat, 'central-reset');
      syncPanel(panel);
    });
    q('[data-central-sound-apply]', panel)?.addEventListener('click', () => {
      engine.ensureGraph?.(playerAudio);
      void engine.resume?.(playerAudio);
      engine.applyBoost?.(playerAudio, engine.loadStage?.() || 0, 'central-apply');
      engine.applyEq?.(playerAudio, readPanelEq(panel), 'central-apply');
      syncPanel(panel);
    });

    syncPanel(panel);
  }

  function bindMobileSoundRecovery() {
    if (!isMobile()) return;
    const playerAudio = audio();
    const engine = core();
    if (!playerAudio || !engine) return;

    const activate = () => {
      engine.ensureGraph?.(playerAudio);
      void engine.resume?.(playerAudio);
    };
    document.addEventListener('pointerdown', event => {
      if (event.target?.closest?.('#soundPanel,[data-veluna-eq],.boost-chip,#soundBtn')) activate();
    }, true);
    document.addEventListener('input', event => {
      if (!event.target?.matches?.('[data-veluna-eq]')) return;
      activate();
      const values = {};
      qa('[data-veluna-eq]').forEach(input => { values[input.dataset.velunaEq] = input.value; });
      setTimeout(() => engine.applyEq?.(playerAudio, values, 'mobile-sound-panel'), 0);
      setTimeout(() => engine.applyEq?.(playerAudio, values, 'mobile-sound-panel-confirm'), 190);
    }, true);
    document.addEventListener('click', event => {
      const boost = event.target?.closest?.('.boost-chip[data-boost]');
      if (!boost) return;
      activate();
      const stage = engine.clampStage?.(boost.dataset.boost) || 0;
      setTimeout(() => engine.applyBoost?.(playerAudio, stage, 'mobile-sound-panel'), 0);
      setTimeout(() => engine.applyBoost?.(playerAudio, stage, 'mobile-sound-panel-confirm'), 190);
    }, true);
  }

  function activate() {
    ensureDesktopVolume();
    ensureDesktopSoundPanel();
    bindMobileSoundRecovery();
    core()?.applyVolumePolicy?.(document);
  }

  window.SMFPAudioPolicyUI = Object.freeze({
    version:'2.0.0',
    activate,
    ensureDesktopVolume,
    ensureDesktopSoundPanel
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate, { once:true });
  else activate();
  window.addEventListener('pageshow', activate, { passive:true });
  window.addEventListener('resize', () => requestAnimationFrame(activate), { passive:true });
})();
