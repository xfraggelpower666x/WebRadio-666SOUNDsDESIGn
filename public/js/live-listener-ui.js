/*
 * 666SOUNDsDESIGn — Shared Live Listener Capacity UI Guard
 * Removes legacy static listener-capacity fallbacks from visible player UIs.
 * The authoritative maximum comes only from /api/nowplaying maxlisteners.
 */
(() => {
  'use strict';
  if (window.S666LiveListenerUI?.version) return;

  const VERSION = '1.0.0';
  const LEGACY_MAX = 250;
  const UNKNOWN = '—';
  let observer = null;

  const normalizeText = (text) => {
    const value = String(text ?? '').trim();
    const match = value.match(/^\s*(\d+)\s*\/\s*(\d+|—|-)\s*$/);
    if (!match) return value;
    const current = match[1];
    const max = Number(match[2]);
    return Number.isFinite(max) && max === LEGACY_MAX ? `${current} / ${UNKNOWN}` : value;
  };

  const scan = (root = document) => {
    const nodes = [];
    if (root?.matches?.('[data-listeners],#listenersText')) nodes.push(root);
    root?.querySelectorAll?.('[data-listeners],#listenersText')?.forEach(node => nodes.push(node));
    for (const node of nodes) {
      const next = normalizeText(node.textContent);
      if (next !== node.textContent) node.textContent = next;
    }
  };

  const mount = () => {
    scan(document);
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') scan(record.target?.parentElement || document);
        else record.addedNodes?.forEach(node => {
          if (node.nodeType === 1) scan(node);
        });
        if (record.target?.nodeType === 1) scan(record.target);
      }
    });
    observer.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true });
  else mount();

  window.S666LiveListenerUI = Object.freeze({ version: VERSION, scan, normalizeText });
})();
