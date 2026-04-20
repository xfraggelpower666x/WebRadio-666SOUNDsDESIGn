/*
==========================================
DATEI: external-player/js/responsive-ui.js
ERSTELLT: 2026-04-20
GEÄNDERT: 2026-04-20
ZWECK: Kleine Responsive-Helfer für UI-Zustände.
ÄNDERUNG: History-Panel und einfache Device-Klasse ergänzt.
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
