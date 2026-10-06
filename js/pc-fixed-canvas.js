(() => {
  'use strict';

  /*
   * 666SOUNDsDESIGn — PC layout continuity controller.
   *
   * The former fixed 1720x980 canvas activated late in boot and replaced the
   * already rendered responsive player with a second geometry system. Keep the
   * existing file/loader as the canonical PC layout owner, but do not create a
   * fixed canvas anymore. This controller restores documented PC state and
   * normalizes existing controls without adding wrappers or a second layout.
   */
  const DESKTOP_MIN = 761;
  const ADDON_LAYOUT_MIN = 1221;
  const STORAGE_KEY = 's666_pc_addon_fx_v128';
  const CHIP_STATE_CLASSES = [
    'state-main', 'state-backup', 'state-api', 'state-fallback', 'state-external',
    'state-internal', 'state-error', 'state-ok', 'state-warn', 'state-empty',
    'state-stopped', 'state-paused', 'state-off', 'is-active'
  ];

  let raf = 0;
  let fxState = readStoredState();

  function clamp(min, value, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isDesktop() {
    return window.matchMedia(`(min-width:${DESKTOP_MIN}px)`).matches;
  }

  function readStoredState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        left: parsed.left !== false,
        right: parsed.right !== false
      };
    } catch (_) {
      return { left: true, right: true };
    }
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fxState));
    } catch (_) {}
  }

  function clearFixedCanvasState() {
    const root = document.documentElement;
    root.classList.remove('pc-fixed-canvas');
    root.style.removeProperty('--pc-canvas-scale');
    document.body?.style.removeProperty('--pc-scaled-height');
  }

  function addonNodes(side) {
    const left = side === 'left';
    return {
      panel: document.getElementById(left ? 'pcLeftFxAddon' : 'pcRightFxAddon'),
      button: document.getElementById(left ? 'pcLeftFxToggle' : 'pcRightFxToggle'),
      label: document.getElementById(left ? 'pcLeftFxState' : 'pcRightFxState')
    };
  }

  function applyAddonVisualState(side) {
    const enabled = fxState[side] !== false;
    const nodes = addonNodes(side);
    const body = document.body;

    body?.classList.toggle(`pc-${side}-addon-off`, !enabled);

    if (nodes.button) {
      nodes.button.classList.toggle('is-on', enabled);
      nodes.button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      nodes.button.dataset.state = enabled ? 'on' : 'off';
      nodes.button.title = `${side === 'left' ? 'Linke' : 'Rechte'} Add-on FX ${enabled ? 'ausblenden' : 'einblenden'}`;
    }

    if (nodes.label) nodes.label.textContent = enabled ? 'ON' : 'OFF';

    if (nodes.panel) {
      if (enabled) nodes.panel.style.removeProperty('display');
      else nodes.panel.style.setProperty('display', 'none', 'important');
      nodes.panel.setAttribute('aria-hidden', enabled ? 'false' : 'true');
    }
  }

  function setPanelChipState(chip, state, title) {
    if (!chip) return;
    CHIP_STATE_CLASSES.forEach((className) => chip.classList.remove(className));
    const normalized = String(state || 'empty').toLowerCase();
    const nextClass = normalized === 'ok' || normalized === 'online' || normalized === 'success'
      ? 'state-main'
      : normalized === 'warn' || normalized === 'warning' || normalized === 'sending'
        ? 'state-warn'
        : normalized === 'error' || normalized === 'offline' || normalized === 'failed'
          ? 'state-error'
          : 'state-empty';
    chip.classList.add(nextClass);
    if (nextClass !== 'state-empty') chip.classList.add('is-active');
    chip.dataset.ledState = nextClass.replace(/^state-/, '');
    if (title) chip.title = title;
  }

  function updateDiscordPanelState(detail = {}) {
    const chip = document.getElementById('statusDiscord');
    if (!chip) return;
    const phase = String(detail.phase || '').toLowerCase();
    if (phase === 'status') {
      setPanelChipState(chip, detail.ok === true ? 'online' : 'error', detail.ok === true ? 'Discord Worker verbunden — Klick öffnet Shooter' : 'Discord Worker nicht bereit — Klick öffnet Shooter');
      return;
    }
    if (phase === 'sending') {
      setPanelChipState(chip, 'sending', 'Discord sendet — Klick öffnet Shooter');
      return;
    }
    if (phase === 'success' || phase.endsWith('-success')) {
      setPanelChipState(chip, 'success', 'Discord Versand erfolgreich — Klick öffnet Shooter');
      return;
    }
    if (phase === 'warning' || phase.endsWith('-warning')) {
      setPanelChipState(chip, 'warning', 'Discord meldet Warnung — Klick öffnet Shooter');
      return;
    }
    if (phase === 'error' || phase.endsWith('-error')) {
      setPanelChipState(chip, 'error', 'Discord Fehler — Klick öffnet Shooter');
    }
  }

  function bindSystemPanel() {
    if (!isDesktop()) return;

    const statusOnly = [
      'statusStream', 'statusBuffer', 'statusSource', 'statusMeta',
      'statusWorker', 'statusAudio', 'statusWatchdog', 'statusMeter', 'statusGovee'
    ];
    statusOnly.forEach((id) => {
      const chip = document.getElementById(id);
      if (chip) chip.dataset.panelRole = 'status';
    });

    ['mainBtn', 'fallbackBtn', 'statusAdmin'].forEach((id) => {
      const chip = document.getElementById(id);
      if (chip) chip.dataset.panelRole = 'action';
    });

    const reconnect = document.getElementById('statusReconnect');
    const reconnectButton = document.getElementById('reconnectBtn');
    if (reconnect) {
      reconnect.dataset.panelRole = 'action';
      reconnect.title = 'Reconnect — Stream kontrolliert neu verbinden';
      if (reconnectButton && reconnect.dataset.s666PanelActionBound !== '1') {
        reconnect.dataset.s666PanelActionBound = '1';
        reconnect.addEventListener('click', () => reconnectButton.click());
      }
    }

    const discord = document.getElementById('statusDiscord');
    if (discord) {
      discord.dataset.panelRole = 'action-status';
      if (discord.dataset.s666PanelActionBound !== '1') {
        discord.dataset.s666PanelActionBound = '1';
        discord.addEventListener('click', () => {
          const addon = window.S666DiscordPlayerAddonV3;
          if (addon && typeof addon.messagePost === 'function') {
            addon.messagePost().catch(() => {});
          }
        });
      }
    }

    if (!window.__S666_SYSTEM_PANEL_DISCORD_BRIDGE__) {
      window.__S666_SYSTEM_PANEL_DISCORD_BRIDGE__ = true;
      window.addEventListener('s666:discord-state', (event) => updateDiscordPanelState(event.detail || {}));
    }

    const addon = window.S666DiscordPlayerAddonV3;
    if (addon && typeof addon.checkStatus === 'function' && discord?.dataset.s666InitialStatusChecked !== '1') {
      discord.dataset.s666InitialStatusChecked = '1';
      addon.checkStatus().catch(() => {});
    }
  }

  function normalizeExistingControls() {
    if (!isDesktop()) return;

    const shell = document.querySelector('body[data-veluna-page="main"] .player-shell');
    if (!shell) return;

    const veluna = document.getElementById('playerDesignSwitch');
    const topRight = shell.querySelector('.top-hud .systempanel-right');
    if (veluna && topRight && veluna.parentElement !== topRight) {
      topRight.appendChild(veluna);
    }
    if (veluna && topRight) {
      veluna.textContent = 'VELUNA';
      veluna.setAttribute('aria-label', 'Zum VELUNA Player wechseln');
      veluna.title = 'VELUNA Player öffnen';
      veluna.style.setProperty('position', 'relative', 'important');
      veluna.style.setProperty('inset', 'auto', 'important');
      veluna.style.setProperty('flex', '0 0 auto', 'important');
      veluna.style.setProperty('width', 'auto', 'important');
      veluna.style.setProperty('min-width', '66px', 'important');
      veluna.style.setProperty('max-width', '78px', 'important');
      veluna.style.setProperty('height', '28px', 'important');
      veluna.style.setProperty('min-height', '28px', 'important');
      veluna.style.setProperty('margin', '0', 'important');
      veluna.style.setProperty('padding', '0 8px', 'important');
      veluna.style.setProperty('font-size', '9px', 'important');
      veluna.style.setProperty('font-weight', '900', 'important');
      veluna.style.setProperty('letter-spacing', '.06em', 'important');
      veluna.style.setProperty('white-space', 'nowrap', 'important');
    }

    const timeline = shell.querySelector('.bottom-console .timeline-wrap');
    if (timeline) {
      timeline.setAttribute('aria-hidden', 'true');
      timeline.style.setProperty('display', 'none', 'important');
    }

    const bottom = shell.querySelector('.bottom-console');
    if (bottom) {
      bottom.style.setProperty('grid-template-columns', 'minmax(0,1fr) minmax(142px,174px)', 'important');
    }
  }

  function normalizeTicker() {
    if (!isDesktop()) return;

    const viewport = document.querySelector('body[data-veluna-page="main"] .now-playing .ticker-window');
    const ticker = viewport?.querySelector('#nowPlayingTicker');
    if (!viewport || !ticker) return;

    /* The stage CSS used 100% left padding, so a fresh title starts completely
       outside the visible ticker. Keep the same canonical ticker element, start
       it flush-left and only move by the real overflow distance. */
    ticker.style.setProperty('padding-left', '0', 'important');
    ticker.style.setProperty('padding-right', '0', 'important');
    ticker.style.setProperty('min-width', '0', 'important');
    ticker.style.setProperty('width', 'max-content', 'important');
    ticker.style.setProperty('text-align', 'left', 'important');
    ticker.style.setProperty('animation', 'none', 'important');

    if (ticker.__s666TickerAnimation) {
      ticker.__s666TickerAnimation.cancel();
      ticker.__s666TickerAnimation = null;
    }

    const overflow = Math.max(0, ticker.scrollWidth - viewport.clientWidth + 4);
    if (overflow <= 4 || !ticker.textContent?.trim()) return;

    const duration = clamp(8000, 7000 + overflow * 34, 22000);
    ticker.__s666TickerAnimation = ticker.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(0)', offset: 0.12 },
        { transform: `translateX(-${overflow}px)`, offset: 0.88 },
        { transform: `translateX(-${overflow}px)` }
      ],
      { duration, iterations: Infinity, direction: 'alternate', easing: 'linear', fill: 'both' }
    );
  }

  function applyResponsivePlayerExpansion() {
    const player = document.querySelector('body[data-veluna-page="main"] .frame-stage .player-shell');
    if (!player) return;

    const viewportWidth = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 0);
    const canExpand = isDesktop() && viewportWidth >= ADDON_LAYOUT_MIN;
    const leftOff = fxState.left === false;
    const rightOff = fxState.right === false;

    if (!canExpand || (!leftOff && !rightOff)) {
      player.style.removeProperty('width');
      player.style.removeProperty('max-width');
      player.style.removeProperty('transform');
      return;
    }

    const baseWidth = Math.min(viewportWidth * 0.56, 1080);
    const panelWidth = clamp(220, viewportWidth * 0.19 - 16, 300);
    const panelGap = clamp(7, viewportWidth * 0.0065, 12);
    const freedSide = panelWidth + panelGap;
    const meterWidth = clamp(54, viewportWidth * 0.037, 72);
    const viewportMax = Math.max(baseWidth, viewportWidth - meterWidth * 2 - 32);
    const requestedWidth = baseWidth + (leftOff ? freedSide : 0) + (rightOff ? freedSide : 0);
    const width = Math.min(requestedWidth, viewportMax);

    /* Shift by half of the one-sided expansion so the still-active side keeps
       its original edge. With both sides off the player remains centered. */
    let shift = 0;
    if (leftOff !== rightOff) {
      const actualExpansion = Math.max(0, width - baseWidth);
      shift = (rightOff ? 1 : -1) * actualExpansion / 2;
    }

    player.style.setProperty('width', `${width.toFixed(2)}px`, 'important');
    player.style.setProperty('max-width', `${width.toFixed(2)}px`, 'important');
    player.style.setProperty('transform', shift ? `translateX(${shift.toFixed(2)}px)` : 'none', 'important');
  }

  function applyLayout() {
    clearFixedCanvasState();
    applyAddonVisualState('left');
    applyAddonVisualState('right');
    normalizeExistingControls();
    bindSystemPanel();
    applyResponsivePlayerExpansion();
    normalizeTicker();
  }

  function toggleAddon(side) {
    fxState = { ...fxState, [side]: fxState[side] === false };
    persistState();
    applyLayout();
  }

  function bindToggle(side) {
    const { button } = addonNodes(side);
    if (!button || button.dataset.s666FxBound === '1') return;
    button.dataset.s666FxBound = '1';
    button.addEventListener('click', () => toggleAddon(side));
  }

  function bind() {
    bindToggle('left');
    bindToggle('right');
    applyLayout();
  }

  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(applyLayout);
  }

  clearFixedCanvasState();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }

  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('s666:metadata-live', schedule, { passive: true });
})();
