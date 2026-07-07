/*
==========================================
DATEI: external-player/js/responsive-ui.js
GEÄNDERT: 2026-04-30
ZWECK: Responsive-Helfer + History als echtes Overlay.
ÄNDERUNG: v56 portalt History in document.body, fixed Overlay, Outside-Click.
==========================================
*/
export function installResponsiveHelpers(historyToggle, historyPanel) {
  let backdrop = null;

  const ensurePortal = () => {
    if (!historyPanel) return;
    if (historyPanel.parentElement !== document.body) {
      document.body.appendChild(historyPanel);
    }
    historyPanel.classList.add('history-overlay-panel');
  };

  const ensureBackdrop = () => {
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.id = 'historyOverlayBackdrop';
    backdrop.className = 'history-overlay-backdrop hidden';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', () => setHistoryOpen(false));
    return backdrop;
  };

  const setHistoryOpen = (open) => {
    if (!historyPanel) return;
    ensurePortal();
    const bd = ensureBackdrop();
    historyPanel.classList.toggle('hidden', !open);
    historyPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    bd.classList.toggle('hidden', !open);
    document.body.classList.toggle('history-overlay-open', !!open);
  };

  historyToggle?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const isOpen = historyPanel && !historyPanel.classList.contains('hidden');
    setHistoryOpen(!isOpen);
  });

  historyPanel?.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  document.addEventListener('click', (event) => {
    if (!historyPanel || historyPanel.classList.contains('hidden')) return;
    const target = event.target;
    if (target === historyToggle || historyToggle?.contains(target) || historyPanel.contains(target)) return;
    setHistoryOpen(false);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setHistoryOpen(false);
  });

  const setMode = () => {
    document.body.dataset.device = window.innerWidth <= 860 ? 'mobile' : 'desktop';
  };

  setMode();
  window.addEventListener('resize', setMode);
}



