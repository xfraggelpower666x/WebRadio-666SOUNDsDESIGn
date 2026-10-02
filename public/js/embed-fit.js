// Die sichtbare Player-Karte bestimmen, niemals die iframe-Viewport-Höhe messen.
(() => {
  const allowed = new Set(['https://weblyvra.666soundsdesign-broadcaster.com', 'https://lyvra-living-universe.crisp-siren-2613.chatgpt.site']);
  const player = document.querySelector('.player');
  if (!player || window.parent === window) return;
  let target = null, last = 0, scheduled = false;
  function publish() {
    scheduled = false;
    if (!target) return;
    const height = Math.ceil(player.getBoundingClientRect().bottom + (parseFloat(getComputedStyle(document.body).paddingBottom) || 0) + 2);
    if (height < 120 || height > 1000 || height === last) return;
    last = height;
    window.parent.postMessage({ type: 'lyvra:embed:resize', version: 1, height }, target);
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(publish); } }
  window.addEventListener('message', event => {
    if (event.source !== window.parent || !allowed.has(event.origin) || event.data?.type !== 'lyvra:embed:subscribe' || event.data.version !== 1) return;
    target = event.origin; last = 0; schedule();
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(schedule).observe(player);
  window.addEventListener('resize', schedule);
  player.addEventListener('click', schedule);
  document.fonts?.ready.then(schedule);
})();
