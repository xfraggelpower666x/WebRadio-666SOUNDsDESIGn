'use strict';

(() => {
  const storageKey = 'rw666-background-preset-v1';
  const assetRoot = 'assets/radio-wave/visuals/';
  const presets = new Set([
    'starfield', 'lyvra-music-discovery', 'lyvra-portal', 'lyvra-resonance', 'radio-wave-v666'
  ]);
  const outputOnly = new URLSearchParams(location.search).get('output') === '1';
  const select = document.getElementById('rw-background-preset');
  const preview = document.getElementById('rw-background-preview');
  const status = document.getElementById('bg-meta');
  const customButton = document.getElementById('btn-select-bg');
  const brandDialog = document.getElementById('rw-brand-dialog');
  const words = {
    en: {
      title: 'Visualizer background', preset: 'Background preset', starfield: 'Starfield', custom: 'Custom image',
      browse: 'Open custom image', failed: 'The image could not be loaded.', close: 'Close'
    },
    de: {
      title: 'Visualizer-Hintergrund', preset: 'Standardhintergrund', starfield: 'Sternenfeld', custom: 'Eigenes Bild',
      browse: 'Eigenes Bild öffnen', failed: 'Das Bild konnte nicht geladen werden.', close: 'Schließen'
    }
  };

  let active = { id: 'starfield' };
  let request = 0;
  let failed = false;

  function readPreset() {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  }

  function renderControls() {
    if (outputOnly) return;
    const labels = words[document.documentElement.lang.startsWith('de') ? 'de' : 'en'];
    document.getElementById('rw-background-title').textContent = labels.title;
    document.getElementById('rw-background-label').textContent = labels.preset;
    document.getElementById('label-bg-file').textContent = labels.browse;
    document.getElementById('rw-brand-close').textContent = labels.close;
    select.querySelector('[value="starfield"]').textContent = labels.starfield;
    select.querySelector('[value="custom"]').textContent = labels.custom;
    select.value = active.id;
    status.textContent = failed ? labels.failed : (active.name || select.selectedOptions[0]?.textContent || '');
    preview.hidden = !active.preview;
    if (active.preview) preview.src = active.preview;
    else preview.removeAttribute('src');
  }

  function customPreview(image) {
    // Die abgelöste Einstellung erhält nur ein Vorschaubild, keine große Original-Datei.
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 320 / image.naturalWidth, 180 / image.naturalHeight);
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#01000f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.75);
  }

  async function loadBackground(id, file, ticket) {
    const next = { id };
    if (id !== 'starfield') {
      const image = new Image();
      image.src = file ? file.dataUri : assetRoot + id + '.png';
      await image.decode();
      next.image = image;
      next.preview = file ? customPreview(image) : image.src;
      if (file) next.name = file.name;
    }
    if (ticket !== request) return;
    active = next;
    failed = false;
    if (document.body.dataset.rwBackground !== id) document.body.dataset.rwBackground = id;
    if (!outputOnly) {
      try { localStorage.setItem(storageKey, id); } catch {}
    }
    renderControls();
  }

  async function choosePreset(id) {
    if (!presets.has(id)) return;
    const ticket = ++request;
    try {
      await loadBackground(id, null, ticket);
    } catch {
      if (ticket !== request) return;
      failed = true;
      renderControls();
    }
  }

  function drawBackground(ctx, width, height) {
    const { image, id } = active;
    if (!image) return false;
    // Eigene Bilder behalten das bisherige Cover-Verhalten. Standardmotive bleiben vollständig sichtbar.
    const fit = id === 'custom' ? Math.max : Math.min;
    const zoom = id === 'custom'
      ? (Number(document.getElementById('background-scale')?.value) || 100) / 100 : 1;
    const scale = fit(width / image.naturalWidth, height / image.naturalHeight) * zoom;
    const imageWidth = image.naturalWidth * scale;
    const imageHeight = image.naturalHeight * scale;
    ctx.save();
    ctx.globalAlpha = id === 'custom' ? 0.35 : 0.64;
    ctx.drawImage(image, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
    ctx.restore();
    return true;
  }

  if (outputOnly) {
    window.addEventListener('storage', event => {
      if (event.key === storageKey || event.key === null) void choosePreset(presets.has(readPreset()) ? readPreset() : 'starfield');
    });
  } else {
    select.addEventListener('change', () => void choosePreset(select.value));
    customButton.addEventListener('click', () => void openCustom(() => window.api.openBackground()));
    document.getElementById('btn-clear-bg').addEventListener('click', async () => {
      const ticket = ++request;
      try {
        await window.api.clearBackground();
        if (ticket === request) await choosePreset('starfield');
      } catch {
        if (ticket !== request) return;
        failed = true;
        renderControls();
      }
    });
    const scale = document.getElementById('background-scale');
    const showScale = () => {
      document.getElementById('background-scale-value').textContent = (scale.value || 100) + '%';
    };
    scale.addEventListener('input', showScale);
    showScale();
    window.addEventListener('rw:language-changed', renderControls);
    document.getElementById('rw-brand-open').addEventListener('click', () => brandDialog.showModal());
  }
  async function openCustom(read, restore = false) {
    const ticket = ++request;
    try {
      const file = await read();
      if (ticket !== request) return;
      if (file) await loadBackground('custom', file, ticket);
      else if (restore) await choosePreset('starfield');
      else renderControls();
    } catch {
      if (ticket !== request) return;
      failed = true;
      renderControls();
    }
  }

  window.RWAppearance = Object.freeze({ drawBackground });
  const saved = readPreset();
  if (!outputOnly && (saved == null || saved === 'custom') && window.api?.restoreBackground) {
    renderControls();
    void openCustom(() => window.api.restoreBackground(), true);
  } else {
    void choosePreset(presets.has(saved) ? saved : 'starfield');
  }
})();
