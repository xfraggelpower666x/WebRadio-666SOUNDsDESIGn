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


// ==========================================================
// 666SOUNDsDESIGn — v69 Mobile History Overlay
// Zweck: History auf iPhone/Mobile als echtes Overlay wie am PC.
// ==========================================================
(function installMobileHistoryOverlayV69(){
  function boot(){
    const toggle=document.getElementById('historyToggle');
    const panel=document.getElementById('historyPanel');
    if(!toggle||!panel)return;
    let backdrop=document.getElementById('historyOverlayBackdrop');
    if(!backdrop){
      backdrop=document.createElement('div');
      backdrop.id='historyOverlayBackdrop';
      backdrop.className='history-overlay-backdrop hidden';
      backdrop.setAttribute('aria-hidden','true');
      document.body.appendChild(backdrop);
    }
    if(panel.parentElement!==document.body)document.body.appendChild(panel);
    panel.classList.add('history-overlay-panel','hidden');
    const open=()=>{panel.classList.remove('hidden');backdrop.classList.remove('hidden');document.documentElement.classList.add('history-overlay-open');document.body.classList.add('history-overlay-open');};
    const close=()=>{panel.classList.add('hidden');backdrop.classList.add('hidden');document.documentElement.classList.remove('history-overlay-open');document.body.classList.remove('history-overlay-open');};
    const onToggle=(e)=>{e.preventDefault();e.stopPropagation();panel.classList.contains('hidden')?open():close();};
    if(toggle.__historyOverlayV69)toggle.removeEventListener('click',toggle.__historyOverlayV69);
    toggle.__historyOverlayV69=onToggle;
    toggle.addEventListener('click',onToggle);
    backdrop.onclick=close;
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close();},{passive:true});
    document.addEventListener('click',e=>{if(panel.classList.contains('hidden'))return;if(panel.contains(e.target)||toggle.contains(e.target))return;close();},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
// END v69 Mobile History Overlay

