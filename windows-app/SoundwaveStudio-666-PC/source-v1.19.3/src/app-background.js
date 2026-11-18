'use strict';

(() => {
  // Die Hintergrundgrafik gehört zur Bedienoberfläche des Hauptfensters.
  if (new URLSearchParams(location.search).get('output') === '1') return;

  const storageKey = 'rw666-app-background-v1';
  const select = document.getElementById('rw-app-background');
  const label = document.getElementById('rw-app-background-label');
  const choices = new Set(Array.from(select.options, option => option.value));

  function apply(value) {
    const theme = choices.has(value) ? value : 'default';
    select.value = theme;
    document.body.dataset.rwAppBackground = theme;
    return theme;
  }

  function translate() {
    const german = document.documentElement.lang.startsWith('de');
    label.textContent = german ? 'App-Hintergrund' : 'App background';
    select.options[0].textContent = german ? 'Standard' : 'Default';
  }

  let saved;
  try { saved = localStorage.getItem(storageKey); } catch {}
  apply(saved);
  translate();

  select.addEventListener('change', () => {
    const theme = apply(select.value);
    try { localStorage.setItem(storageKey, theme); } catch {}
  });
  window.addEventListener('rw:language-changed', translate);
})();
