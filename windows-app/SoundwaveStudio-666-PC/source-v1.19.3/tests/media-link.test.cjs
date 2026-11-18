'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const root = path.join(__dirname, '..');
const html = readFileSync(path.join(root, 'src/index.html'), 'utf8');
const source = readFileSync(path.join(root, 'src/integration/666-integration.js'), 'utf8');
const controller = source.slice(source.indexOf('  const mediaLinkTab'), source.indexOf('  async function refreshRemoteHealth'));

function harness() {
  const nodes = new Map();
  function q(id) {
    assert.ok(html.includes('id="' + id.slice(1) + '"'), id);
    if (!nodes.has(id)) {
      const classes = new Set(['hidden']);
      const events = new Map();
      nodes.set(id, {
        classList: {
          contains: name => classes.has(name),
          toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name)
        },
        setAttribute() {}, focus() {},
        addEventListener: (name, callback) => events.set(name, callback),
        emit: (name, event) => events.get(name)?.(event)
      });
    }
    return nodes.get(id);
  }
  let paused = 0;
  const audio = { addEventListener(_name, handler) { this.onPlay = handler; }, pause() { paused++; } };
  const player = Object.assign(q('#media-link-player'), {
    paused: true,
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; },
    removeAttribute() { delete this.src; },
    hasAttribute() { return Boolean(this.src); },
    load() {}
  });
  const runtime = {
    exporting: false,
    isExporting() { return this.exporting; }
  };
  runInNewContext(controller, { URL, q, audio, rt: runtime, mode: 'local', window: {}, showYouTube() {} });
  q('#media-link-category').emit('click');
  async function submit(value) {
    q('#media-link-url').value = value;
    await q('#media-link-form').emit('submit', { preventDefault() {} });
  }
  return { q, player, runtime, audio, submit, mainPauseCount: () => paused };
}

test('direct playback accepts HTTP(S), extends bare hosts and recognizes audio and video metadata', async () => {
  const h = harness();
  await h.submit('www.example.com/recording.MP4?stream=1');
  assert.equal(h.player.src, 'https://www.example.com/recording.MP4?stream=1');
  h.player.videoWidth = 1920;
  h.player.emit('loadedmetadata');
  h.player.emit('playing');
  assert.equal(h.player.classList.contains('audio-only'), false);
  assert.equal(h.mainPauseCount(), 1);
  await h.submit('http://localhost:8080/music.wav');
  h.player.videoWidth = 0;
  h.player.emit('loadedmetadata');
  assert.equal(h.player.classList.contains('audio-only'), true);
  h.audio.onPlay();
  assert.equal(h.player.paused, true);
  h.q('#media-link-stop').emit('click');
  assert.equal(h.player.src, undefined);
  assert.equal(h.player.hidden, true);
});

test('invalid links and active exports do not load media; load errors are visible', async () => {
  const h = harness();
  for (const link of ['file:///test.mp4', 'data:video/mp4;base64,abc', 'https://name:pass@example.com/file.mp4']) {
    await h.submit(link);
    assert.equal(h.player.src, undefined);
  }
  h.runtime.exporting = true;
  await h.submit('https://example.com/test.mp3');
  assert.equal(h.player.src, undefined);
  assert.match(h.q('#media-link-status').textContent, /Stop the active/);
  h.runtime.exporting = false;
  await h.submit('https://example.com/test.mp3');
  h.player.emit('error');
  assert.match(h.q('#media-link-status').textContent, /Media unavailable/);
});
