'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const src = path.join(__dirname, '..', 'src');
const source = fs.readFileSync(path.join(src, 'appearance.js'), 'utf8');
const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const preference = 'rw666-background-preset-v1';
const backgrounds = [
  ['lyvra-music-discovery', 1672, 941],
  ['lyvra-portal', 1672, 941],
  ['lyvra-resonance', 1916, 821],
  ['radio-wave-v666', 1672, 941]
];
const wait = () => new Promise(resolve => setImmediate(resolve));

function element() {
  const listeners = {};
  return {
    addEventListener: (name, listener) => { listeners[name] = listener; },
    emit: (name, event) => listeners[name]?.(event),
    removeAttribute() {},
    selectedOptions: []
  };
}

function renderer({ output = false, saved, api } = {}) {
  const elements = new Map();
  const document = {
    documentElement: { lang: 'en' },
    body: { dataset: {} },
    createElement: () => ({
      getContext: () => ({ fillRect() {}, drawImage() {} }),
      toDataURL: () => 'data:image/jpeg;base64,preview'
    }),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    }
  };
  const select = document.getElementById('rw-background-preset');
  select.querySelector = () => element();
  const window = Object.assign(element(), { api });
  const storage = new Map(saved ? [[preference, saved]] : []);
  const pending = new Map();
  class Image {
    decode() {
      return new Promise((resolve, reject) => {
        pending.set(this.src, (failure = false) => {
          if (failure) return reject(new Error('Image unavailable'));
          const dims = backgrounds.find(([name]) => this.src.endsWith('/' + name + '.png')) || ['custom', 800, 600];
          this.naturalWidth = dims[1];
          this.naturalHeight = dims[2];
          resolve();
        });
      });
    }
  }
  vm.runInNewContext(source, {
    document, window, Image, URLSearchParams,
    location: { search: output ? '?output=1' : '' },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) }
  });
  return { document, window, select, storage, pending };
}

const url = id => 'assets/radio-wave/visuals/' + id + '.png';

test('vier Hintergrundmotive und fünf Marken-PNGs sind als lokale Dateien eingebunden', () => {
  for (const [id, width, height] of backgrounds) {
    assert.match(html, new RegExp('value="' + id + '"'));
    const data = fs.readFileSync(path.join(src, url(id)));
    assert.equal(data.subarray(1, 4).toString(), 'PNG');
    assert.equal(data.readUInt32BE(16), width);
    assert.equal(data.readUInt32BE(20), height);
  }
  for (const id of ['666soundsdesign', 'fraggel-paypal-badge', 'fraggelpower666-banner', 'paypal-banner', 'lyvra-soundlogo']) {
    assert.ok(html.includes(url(id)));
    assert.ok(fs.existsSync(path.join(src, url(id))));
  }
});

test('Auswahl bleibt beim Neustart erhalten und Motiv wird vollständig eingepasst', async () => {
  const id = 'lyvra-resonance';
  const { document, window, select, storage, pending } = renderer({ saved: id });
  pending.get(url(id))();
  await wait();
  assert.equal(select.value, id);
  assert.equal(storage.get(preference), id);
  assert.equal(document.getElementById('rw-background-preview').src, url(id));

  for (const [width, height] of [[1920, 1080], [1080, 1920], [3440, 1440]]) {
    let position;
    const context = { save() {}, restore() {}, drawImage(_image, ...args) { position = args; } };
    assert.equal(window.RWAppearance.drawBackground(context, width, height), true);
    const [x, y, w, h] = position;
    assert.ok(x >= -0.001 && y >= -0.001);
    assert.ok(Math.abs(w / h - 1916 / 821) < 0.001);
    assert.ok(Math.abs(x * 2 + w - width) < 0.001);
    assert.ok(Math.abs(y * 2 + h - height) < 0.001);
  }

  select.value = 'starfield';
  await select.emit('change');
  assert.equal(window.RWAppearance.drawBackground(null, 1920, 1080), false);
  assert.equal(storage.get(preference), 'starfield');
});

test('schneller Wechsel und Ladefehler überschreiben kein gültiges Motiv', async () => {
  const { document, select, storage, pending } = renderer();
  select.value = 'lyvra-music-discovery';
  select.emit('change');
  select.value = 'lyvra-portal';
  select.emit('change');
  pending.get(url('lyvra-portal'))();
  await wait();
  pending.get(url('lyvra-music-discovery'))();
  await wait();
  assert.equal(select.value, 'lyvra-portal');
  select.value = 'radio-wave-v666';
  select.emit('change');
  pending.get(url('radio-wave-v666'))(true);
  await wait();
  assert.equal(select.value, 'lyvra-portal');
  assert.equal(storage.get(preference), 'lyvra-portal');
  assert.match(document.getElementById('bg-meta').textContent, /could not be loaded/);
});

test('Visualizer-Ausgabe übernimmt Änderungen der gemeinsamen Standardauswahl', async () => {
  const { document, window, storage, pending } = renderer({ output: true });
  assert.equal(document.body.dataset.rwBackground, 'starfield');
  storage.set(preference, 'radio-wave-v666');
  window.emit('storage', { key: preference });
  pending.get(url('radio-wave-v666'))();
  await wait();
  assert.equal(document.body.dataset.rwBackground, 'radio-wave-v666');
});

test('vorhandene eigene Datei wird übernommen, skaliert und auf Wunsch gelöscht', async () => {
  const dataUri = 'data:image/png;base64,custom';
  let cleared = false;
  const fixture = renderer({ api: {
    restoreBackground: async () => ({ dataUri, name: 'existing.png' }),
    clearBackground: async () => { cleared = true; }
  } });
  await wait();
  fixture.pending.get(dataUri)();
  await wait();
  assert.equal(fixture.storage.get(preference), 'custom');
  assert.equal(fixture.select.value, 'custom');
  const scale = fixture.document.getElementById('background-scale');
  scale.value = '50';
  scale.emit('input');
  let size;
  const context = { save() {}, restore() {}, drawImage(_image, _x, _y, width, height) { size = [width, height]; } };
  assert.equal(fixture.window.RWAppearance.drawBackground(context, 800, 600), true);
  assert.deepEqual(size, [400, 300]);
  await fixture.document.getElementById('btn-clear-bg').emit('click');
  assert.equal(cleared, true);
  assert.equal(fixture.storage.get(preference), 'starfield');
});

const appBackgroundSource = fs.readFileSync(path.join(src, 'app-background.js'), 'utf8');
const appPreference = 'rw666-app-background-v1';

test('Anwendungshintergründe werden getrennt gespeichert und nur im Hauptfenster angewandt', () => {
  const themes = ['default', 'cyber-temple', 'neon-grid', '666-broadcaster'];
  const css = fs.readFileSync(path.join(src, 'style.css'), 'utf8');
  for (const theme of themes.slice(1)) {
    const file = 'assets/radio-wave/app-backgrounds/' + theme + '.jpg';
    assert.match(html, new RegExp('value="' + theme + '"'));
    assert.ok(css.includes(file));
    assert.equal(fs.readFileSync(path.join(src, file)).readUInt16BE(0), 0xffd8);
  }
  const store = new Map([[appPreference, 'neon-grid'], [preference, 'lyvra-portal']]);
  const language = { lang: 'en' };
  const select = Object.assign(element(), { options: themes.map(value => ({ value })) });
  const label = element();
  const body = { dataset: {} };
  const window = element();
  const environment = {
    document: {
      body, documentElement: language,
      getElementById: id => id === 'rw-app-background' ? select : label
    },
    window, URLSearchParams,
    location: { search: '' },
    localStorage: { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) }
  };
  vm.runInNewContext(appBackgroundSource, environment);
  assert.equal(body.dataset.rwAppBackground, 'neon-grid');
  for (const theme of themes) {
    select.value = theme;
    select.emit('change');
    assert.equal(body.dataset.rwAppBackground, theme);
    assert.equal(store.get(appPreference), theme);
    assert.equal(store.get(preference), 'lyvra-portal');
  }
  select.value = 'unknown';
  select.emit('change');
  assert.equal(body.dataset.rwAppBackground, 'default');
  language.lang = 'de-DE';
  window.emit('rw:language-changed');
  assert.equal(label.textContent, 'App-Hintergrund');

  environment.location.search = '?output=1';
  environment.document = { getElementById: () => assert.fail('Kein Zugriff auf die App-Bedienleiste') };
  vm.runInNewContext(appBackgroundSource, environment);
});
