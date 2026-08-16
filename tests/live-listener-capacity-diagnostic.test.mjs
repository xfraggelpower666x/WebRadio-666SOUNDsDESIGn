import test from 'node:test';
import assert from 'node:assert/strict';

const endpoints = [
  ['LIVE_PROXY', 'https://webradio.666soundsdesign-broadcaster.com/api/nowplaying?diag=listener-capacity'],
  ['UPSTREAM_META', 'https://my.idjstream.com/cp/get_info.php?p=8686&diag=listener-capacity'],
  ['ICECAST_STATUS', 'https://my.idjstream.com:8686/status-json.xsl'],
  ['SHOUTCAST_STATS', 'https://my.idjstream.com:8686/stats?sid=1&json=1'],
  ['SHOUTCAST_STATISTICS', 'https://my.idjstream.com:8686/statistics?json=1']
];

function collectListenerFields(value, prefix = '', out = {}) {
  if (!value || typeof value !== 'object') return out;
  for (const [key, field] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (/listen|max|client|slot|capacity/i.test(key) && (typeof field === 'number' || /^\d+$/.test(String(field)))) {
      out[path] = field;
    }
    if (field && typeof field === 'object') collectListenerFields(field, path, out);
  }
  return out;
}

test('diagnose public live listener capacity fields', async () => {
  let successful = 0;
  for (const [label, url] of endpoints) {
    try {
      const response = await fetch(url, { headers: { 'cache-control': 'no-cache' }, redirect: 'follow' });
      const text = await response.text();
      console.log(`${label}_HTTP=${response.status}`);
      if (!response.ok) continue;
      successful += 1;
      let value;
      try { value = JSON.parse(text); } catch { value = { __nonJsonLength: text.length, __preview: text.slice(0, 120).replace(/\s+/g, ' ') }; }
      const obj = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      console.log(`${label}_KEYS=${Object.keys(obj).sort().join(',')}`);
      console.log(`${label}_LISTENER_FIELDS=${JSON.stringify(collectListenerFields(obj))}`);
    } catch (error) {
      console.log(`${label}_ERROR=${error && error.message ? error.message : String(error)}`);
    }
  }
  assert.ok(successful >= 2, 'expected public live proxy and metadata endpoint to remain reachable');
});
