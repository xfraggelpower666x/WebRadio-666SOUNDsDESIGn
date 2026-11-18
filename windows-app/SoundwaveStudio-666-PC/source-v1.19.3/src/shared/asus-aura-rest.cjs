'use strict';

const keyboards = ['NB_Keyboard', 'NB_Keyboard_4Zone'];

function createAuraRest({ request = fetch, platform = process.platform, now = Date.now } = {}) {
  let ownership = 'idle';
  let devices = [];
  let selected;
  let baseColor;
  let lastColor;
  let lastFrame = -Infinity;
  let pending = Promise.resolve();

  async function call(method, path = '', body) {
    const response = await request('http://127.0.0.1:27339/AuraSDK' + path, {
      method, redirect: 'error', signal: AbortSignal.timeout(2500),
      ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
    });
    if (!response.ok) throw new Error('Aura HTTP ' + response.status);
    const data = await response.json();
    if (typeof data?.result !== 'string' && typeof data?.result !== 'number') {
      throw new Error('Ungültige Antwort vom Aura-Dienst.');
    }
    return { data, code: String(data.result) };
  }

  function enqueue(task) {
    const result = pending.then(task);
    pending = result.catch(() => {});
    return result;
  }

  async function release() {
    // Bei unklarer Übernahme keinen fremden Besitzer freigeben.
    if (ownership === 'uncertain') throw new Error('Aura-Übernahme unklar. Bitte in Armoury Crate prüfen.');
    if (ownership !== 'owned') return;
    if ((await call('DELETE')).code !== '0') throw new Error('Aura-Freigabe fehlgeschlagen.');
    ownership = 'idle';
    devices = [];
    selected = baseColor = lastColor = undefined;
    lastFrame = -Infinity;
  }

  async function color(rgb, gain = 1) {
    const [r, g, b] = rgb.map(channel => Math.round(channel * gain));
    const bgr = String((b << 16) | (g << 8) | r);
    if (lastColor === bgr) return;
    const result = await call('PUT', '/AuraDevice', {
      data: [{ device: selected, range: 'all', color: bgr, apply: 'true' }]
    });
    if (result.code !== '0') throw new Error('Aura hat die Farbe abgelehnt (' + result.code + ').');
    lastColor = bgr;
  }

  function command(action, value, authorized) {
    return enqueue(async () => {
      if (platform !== 'win32') throw new Error('ASUS Aura REST benötigt Windows.');
      if (!authorized()) throw new Error('govee_auth_required');
      if (action === 'release') return release();
      if (action === 'acquire') {
        if (ownership === 'uncertain') throw new Error('Aura-Übernahme unklar. Bitte in Armoury Crate prüfen und RADIO WAVE neu starten.');
        if (ownership === 'owned') return { devices, selected };
        const before = await call('GET', '/AuraDevice');
        if (before.code !== '5') throw new Error('Aura ist belegt oder nicht bereit (' + before.code + ').');
        if (!authorized()) throw new Error('govee_auth_required');
        ownership = 'uncertain';
        const result = await call('POST', '', { category: 'SDK' });
        ownership = result.code === '0' ? 'owned' : 'idle';
        if (ownership !== 'owned') throw new Error('Aura-Übernahme abgelehnt (' + result.code + ').');
        try {
          const found = await call('GET', '/AuraDevice');
          if (!authorized()) throw new Error('govee_auth_required');
          devices = found.code === '0' ? keyboards.filter(name => Object.hasOwn(found.data, name)) : [];
          if (!devices.length) throw new Error('Keine kompatible ASUS-Notebooktastatur erkannt.');
          selected = devices[0];
          return { devices, selected };
        } catch (error) {
          try { await release(); } catch {
            throw new Error(error.message + ' · Aura-Freigabe fehlgeschlagen. Bitte in Armoury Crate prüfen.');
          }
          throw error;
        }
      }
      if (ownership !== 'owned' || !selected) throw new Error('Aura zuerst übernehmen.');
      if (action === 'select') {
        if (!devices.includes(value)) throw new Error('Unbekanntes Aura-Gerät.');
        selected = value;
        baseColor = lastColor = undefined;
        return;
      }
      if (action === 'color') {
        if (typeof value !== 'string' || !/^[0-9a-f]{6}$/i.test(value)) throw new Error('Ungültige Aura-Farbe.');
        const rgb = value.match(/../g).map(part => parseInt(part, 16));
        await color(rgb);
        baseColor = rgb;
        return;
      }
      if (action === 'bass') {
        if (!Number.isFinite(value) || value < 0 || value > 1 || !baseColor || now() - lastFrame < 125) return;
        lastFrame = now();
        return color(baseColor, Math.round((0.25 + 0.75 * value) * 8) / 8);
      }
      throw new Error('Unbekannter Aura-Befehl.');
    });
  }

  return { command, release: () => enqueue(release), isReserved: () => ownership !== 'idle' };
}

module.exports = { createAuraRest };
