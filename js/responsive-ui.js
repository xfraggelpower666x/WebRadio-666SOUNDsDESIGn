/*
==========================================
DATEI: external-player/js/responsive-ui.js
GEÄNDERT: 2026-04-30
ZWECK: Responsive-Helfer + History als echtes Overlay.
ÄNDERUNG: v55 History öffnet als Overlay und schließt bei Outside-Click.
==========================================
*/
export function installResponsiveHelpers(historyToggle, historyPanel) {
  const setHistoryOpen = (open) => {
    if (!historyPanel) return;
    historyPanel.classList.toggle('hidden', !open);
    historyPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body?.classList.toggle('history-overlay-open', !!open);
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
