// Öffentlicher Einbettungscode; keine Nutzerdaten oder Zugangsdaten kopieren.
(() => {
  const open = document.getElementById('embedBtn');
  const panel = document.getElementById('embedPanel');
  const code = document.getElementById('embedCode');
  const copy = document.getElementById('copyEmbedBtn');
  const status = document.getElementById('embedCopyStatus');
  if (!open || !panel || !code || !copy || !status) return;
  code.value = `<iframe
  src="https://webradio.666soundsdesign-broadcaster.com/embed/miniplayer.html"
  title="666SOUNDsDESIGn WebRadio MiniPlayer"
  width="100%"
  height="365"
  style="display:block;max-width:680px;border:0;border-radius:18px;background:transparent"
  loading="lazy"
  allow="autoplay">
</iframe>`;
  open.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    open.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) code.focus();
  });
  copy.addEventListener('click', async () => {
    copy.disabled = true;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code.value);
      status.textContent = 'Kopiert! / Copied!';
    } catch (_) {
      code.focus(); code.select();
      status.textContent = 'Code markiert — bitte manuell kopieren. / Code selected — please copy manually.';
    } finally { copy.disabled = false; }
  });
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      panel.hidden = true; open.setAttribute('aria-expanded', 'false'); open.focus();
    }
  });
})();
