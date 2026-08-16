import test from 'node:test';
import assert from 'node:assert/strict';

const endpoints = [
  ['LIVE_PROXY', 'https://webradio.666soundsdesign-broadcaster.com/api/nowplaying?diag=listener-capacity'],
  ['UPSTREAM', 'https://my.idjstream.com/cp/get_info.php?p=8686&diag=listener-capacity']
];

test('diagnose public live listener capacity fields', async () => {
  for (const [label, url] of endpoints) {
    const response = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
    assert.equal(response.ok, true, `${label} HTTP ${response.status}`);
    const text = await response.text();
    let value;
    try { value = JSON.parse(text); } catch { value = { __nonJsonLength: text.length }; }
    const obj = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const listenerFields = Object.fromEntries(
      Object.entries(obj).filter(([key, field]) =>
        /listen|max|client|slot|capacity/i.test(key) &&
        (typeof field === 'number' || /^\d+$/.test(String(field)))
      )
    );
    console.log(`${label}_KEYS=${Object.keys(obj).sort().join(',')}`);
    console.log(`${label}_LISTENER_FIELDS=${JSON.stringify(listenerFields)}`);
  }
});
