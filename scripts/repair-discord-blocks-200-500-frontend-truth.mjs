import fs from 'node:fs';

const files = [
  'js/addons/discord-player-addon-v3.js',
  'public/js/addons/discord-player-addon-v3.js'
];

function replaceOnce(text, before, after, label) {
  const count = text.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, got ${count}`);
  return text.replace(before, after);
}

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');

  text = replaceOnce(text,
`    var summary = {
      sent: false,
      skipped: false,
      mode: 'unknown',
      text: fallback || 'Discord-Antwort empfangen'
    };`,
`    var summary = {
      sent: false,
      skipped: false,
      warning: false,
      mode: 'unknown',
      text: fallback || 'Discord-Antwort empfangen'
    };`,
'add warning flag');

  text = replaceOnce(text,
`      summary.sent = okCount > 0;
      summary.mode = okCount + '/' + deliveries.length;
      summary.text = okCount === deliveries.length
        ? '✓ Discord angenommen: ' + okCount + '/' + deliveries.length
        : (okCount > 0 ? '⚠ Discord Teil-Erfolg: ' + okCount + '/' + deliveries.length + ' · ' + failed.join(', ') : '✗ Discord nicht angenommen: ' + failed.join(', '));
      return summary;`,
`      summary.sent = okCount > 0;
      summary.warning = data.partial === true || data.led === 'warning' || okCount !== deliveries.length;
      summary.mode = summary.warning ? 'partial' : (okCount + '/' + deliveries.length);
      if (summary.warning && okCount === deliveries.length) {
        var privateError = clean(data.privateTrack && (data.privateTrack.error || data.privateTrack.message) || '', 120);
        summary.text = '⚠ Discord Teil-Erfolg: Hauptziele ' + okCount + '/' + deliveries.length + (privateError ? ' · Private: ' + privateError : ' · mindestens ein weiteres Ziel fehlgeschlagen');
      } else {
        summary.text = okCount === deliveries.length
          ? '✓ Discord angenommen: ' + okCount + '/' + deliveries.length
          : (okCount > 0 ? '⚠ Discord Teil-Erfolg: ' + okCount + '/' + deliveries.length + ' · ' + failed.join(', ') : '✗ Discord nicht angenommen: ' + failed.join(', '));
      }
      return summary;`,
'honor partial delivery truth');

  text = replaceOnce(text,
`    if (data.ok === true) {
      summary.sent = true;
      summary.mode = 'ok';
      summary.text = fallback || '✓ Discord angenommen';
    }`,
`    if (data.ok === true) {
      summary.sent = true;
      summary.warning = data.partial === true || data.led === 'warning';
      summary.mode = summary.warning ? 'partial' : 'ok';
      summary.text = summary.warning ? '⚠ Discord Teil-Erfolg' : (fallback || '✓ Discord angenommen');
    }`,
'honor top-level warning truth');

  text = replaceOnce(text,
`      dispatch('s666:discord-state', { phase: 'success', path: path, data: data, summary: deliverySummary(data) });`,
`      var summary = deliverySummary(data);
      dispatch('s666:discord-state', { phase: summary.warning ? 'warning' : 'success', path: path, data: data, summary: summary });`,
'dispatch warning phase');

  text = replaceOnce(text,
`      if (summary.skipped || !summary.sent) {
        setDiscordOverlayStatus(summary.text, summary.skipped ? 'warn' : 'error');
      } else {
        if (input) input.value = '';
        setDiscordOverlayStatus(summary.text, 'ok');
      }`,
`      if (summary.skipped || !summary.sent) {
        setDiscordOverlayStatus(summary.text, summary.skipped ? 'warn' : 'error');
      } else {
        if (input) input.value = '';
        setDiscordOverlayStatus(summary.text, summary.warning ? 'warn' : 'ok');
      }`,
'message overlay warning mode');

  text = replaceOnce(text,
`      setDiscordOverlayStatus(summary.text, summary.skipped ? 'warn' : (summary.sent ? 'ok' : 'error'));`,
`      setDiscordOverlayStatus(summary.text, summary.skipped || summary.warning ? 'warn' : (summary.sent ? 'ok' : 'error'));`,
'nowplaying overlay warning mode');

  text = replaceOnce(text,
`      .then(function (result) {
        dispatch('s666:discord-state', { phase: result && result.skipped ? 'startup-autopost-skipped' : 'startup-autopost-success', data: result, summary: deliverySummary(result) });
      })`,
`      .then(function (result) {
        var summary = deliverySummary(result);
        dispatch('s666:discord-state', { phase: result && result.skipped ? 'startup-autopost-skipped' : (summary.warning ? 'startup-autopost-warning' : 'startup-autopost-success'), data: result, summary: summary });
      })`,
'startup warning phase');

  text = replaceOnce(text,
`      if (current && current !== lastTrackKey) {
        lastTrackKey = current;
        try { await postTrackIfChanged(false, 'watcher-track-change'); } catch (_) {}
      }`,
`      if (current && current !== lastTrackKey) {
        try {
          var result = await postTrackIfChanged(false, 'watcher-track-change');
          if (result && result.ok === true) lastTrackKey = current;
        } catch (_) {}
      }`,
'watcher commit after success');

  fs.writeFileSync(file, text);
}

const root = fs.readFileSync(files[0], 'utf8');
const mirror = fs.readFileSync(files[1], 'utf8');
if (root !== mirror) throw new Error('frontend Discord addon mirrors diverged');

const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');
test('Discord frontend addon mirrors remain byte-identical',()=>assert.equal(root,mirror));
test('partial worker truth becomes a frontend warning',()=>{
  assert.ok(root.includes("warning: false"));
  assert.ok(root.includes("data.partial === true || data.led === 'warning'"));
  assert.ok(root.includes("phase: summary.warning ? 'warning' : 'success'"));
});
test('Discord overlays render partial delivery as warning',()=>{
  assert.ok(root.includes("summary.warning ? 'warn' : 'ok'"));
  assert.ok(root.includes("summary.skipped || summary.warning ? 'warn'"));
});
test('track watcher commits the key only after a successful request',()=>{
  const block=root.slice(root.indexOf('function scheduleWatcher'),root.indexOf('function loadScriptOnce'));
  const requestPos=block.indexOf("await postTrackIfChanged(false, 'watcher-track-change')");
  const commitPos=block.indexOf('lastTrackKey = current;');
  assert.ok(requestPos >= 0 && commitPos > requestPos);
});
`;
fs.writeFileSync('tests/discord-blocks-200-500-frontend-truth.test.mjs', test);
