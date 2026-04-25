/*
==========================================
DATEI: external-player/js/responsive-ui.js
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-21
ZWECK: Kleine Responsive-Helfer.
ÄNDERUNG: Device-Klasse und History-Toggle bleiben zentral.
==========================================
*/
export function installResponsiveHelpers(historyToggle, historyPanel) {
  historyToggle?.addEventListener('click', () => {
    historyPanel?.classList.toggle('hidden');
  });

  const setMode = () => {
    document.body.dataset.device = window.innerWidth <= 860 ? 'mobile' : 'desktop';
  };

  setMode();
  window.addEventListener('resize', setMode);
}
