const SCENES = Object.freeze({
  bunker: { govee: 0x6400a0, aura: 0x8a20ed },
  break: { govee: 0x193c82, aura: 0x2164c8 },
  drop: { govee: 0x8800ff, aura: 0x00ffff }
});
const KEYBOARDS = ['NB_Keyboard', 'NB_Keyboard_4Zone'];
const COLOR = { type: 'devices.capabilities.color_setting', instance: 'colorRgb' };

function createLightScenes({ radioJson, fetchAura = fetch, platform = process.platform, now = Date.now }) {
  let keyboard;
  let owned = false;
  let uncertain = false;
  let pending = Promise.resolve();
  let latestAura;
  let lastAuraAt = -Infinity;
  let bassPending = false;
  let lastAuraColor;
  let cloudBusy = false;
  let cloudNextAt = 0;
  let catalog = new Map();
  let applied = new Map();
  let session = 0;

  function queueAura(task) {
    const result = pending.then(task);
    pending = result.catch(() => {});
    return result;
  }

  async function aura(method, path = '', payload) {
    const response = await fetchAura('http://127.0.0.1:27339/AuraSDK' + path, {
      method, redirect: 'error', signal: AbortSignal.timeout(2500),
      ...(payload ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {})
    });
    if (!response.ok) throw new Error('Aura HTTP ' + response.status);
    const result = await response.json();
    if (typeof result?.result !== 'string' && typeof result?.result !== 'number') {
      throw new Error('Ungültige Aura-Antwort');
    }
    return result;
  }

  async function release() {
    latestAura = undefined;
    if (!owned) return;
    keyboard = undefined;
    if (String((await aura('DELETE')).result) !== '0') throw new Error('Aura-Freigabe fehlgeschlagen');
    owned = false;
    lastAuraColor = undefined;
  }

  async function startAura() {
    if (platform !== 'win32') throw new Error('Aura benötigt Windows');
    return queueAura(async () => {
      if (keyboard) return keyboard;
      if (owned) throw new Error('Zuerst Aura freigeben');
      if (uncertain) throw new Error('Aura-Übernahme unklar. Armoury Crate prüfen und die App neu starten.');
      const before = await aura('GET', '/AuraDevice');
      if (String(before.result) !== '5') throw new Error('Aura ist belegt oder nicht verfügbar (' + before.result + ')');
      uncertain = true;
      const init = await aura('POST', '', { category: 'SDK' });
      uncertain = false;
      if (String(init.result) !== '0') throw new Error('Aura-Übernahme abgelehnt (' + init.result + ')');
      owned = true;
      try {
        const devices = await aura('GET', '/AuraDevice');
        keyboard = String(devices.result) === '0' && KEYBOARDS.find(name => Object.hasOwn(devices, name));
        if (!keyboard) throw new Error('Keine unterstützte Aura-Notebook-Tastatur erkannt');
        return keyboard;
      } catch (error) {
        await release();
        throw error;
      }
    });
  }

  async function sendAura(color, gain = 1) {
    if (!keyboard) throw new Error('Aura zuerst aktivieren');
    const bytes = [16, 8, 0].map(shift => Math.round(((color >> shift) & 255) * gain));
    const bgr = (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
    if (bgr === lastAuraColor) return;
    const result = await aura('PUT', '/AuraDevice', {
      data: [{ device: keyboard, range: 'all', color: String(bgr), apply: 'true' }]
    });
    if (String(result.result) !== '0') throw new Error('Aura-Farbe abgelehnt (' + result.result + ')');
    lastAuraColor = bgr;
  }

  async function devices() {
    const requestSession = session;
    const response = await radioJson('/api/admin/govee/devices', {}, true);
    if (session !== requestSession) throw new Error('Radio-Admin-Sitzung wurde gewechselt');
    if (!response.ok || !Array.isArray(response.data?.devices)) {
      throw new Error(response.data?.error || 'Govee-Geräteliste nicht verfügbar');
    }
    catalog = new Map(response.data.devices.filter(device => typeof device.sku === 'string' &&
      typeof device.device === 'string' && device.capabilities?.some(cap =>
        cap.type === COLOR.type && cap.instance === COLOR.instance)
    ).map(({ sku, device, deviceName, name }) => [
      sku + '|' + device, { sku, device, label: String(deviceName || name || sku).slice(0, 100) }
    ]));
    applied = new Map();
    return [...catalog].map(([id, { label }]) => ({ id, label }));
  }

  async function sendGovee(ids, color) {
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 8 ||
        ids.some(id => !catalog.has(id)) || new Set(ids).size !== ids.length) {
      throw new Error('1 bis 8 geladene RGB-Geräte auswählen');
    }
    const targets = ids.filter(id => applied.get(id) !== color);
    if (!targets.length) return 'Szene bereits gesendet';
    if (cloudBusy || now() < cloudNextAt) throw new Error('Govee wartet auf das nächste Befehlsfenster');
    const requestSession = session;
    cloudBusy = true;
    cloudNextAt = now() + 3000;
    const members = targets.map(id => {
      const { sku, device } = catalog.get(id);
      return { sku, device };
    });
    const capability = { ...COLOR, value: color };
    const action = members.length === 1 ? 'control' : 'groups/control';
    const payload = members.length === 1 ? { ...members[0], capability } : { members, capability };
    try {
      const response = await radioJson('/api/admin/govee/' + action, {
        method: 'POST', body: JSON.stringify(payload)
      }, true);
      if (session !== requestSession) throw new Error('Radio-Admin-Sitzung wurde gewechselt');
      const data = response.data || {};
      const results = Array.isArray(data.results) ? data.results : [];
      const retry = Math.max(0, ...[data, ...results].map(row => Number(row.retryAfterMs) || 0));
      cloudNextAt = Math.max(cloudNextAt, now() + retry);
      if (response.ok && data.ok === true) {
        targets.forEach(id => applied.set(id, color));
        return 'Szene gesendet';
      }
      const successful = new Set(results.filter(row => row.ok === true).map(row => row.sku + '|' + row.device));
      targets.filter(id => successful.has(id)).forEach(id => applied.set(id, color));
      throw new Error(results.length
        ? successful.size + '/' + targets.length + ' erreicht. ' + (results.find(row => !row.ok)?.error || '')
        : data.error || 'Govee HTTP ' + response.status);
    } finally {
      cloudBusy = false;
    }
  }

  async function apply({ scene, ids, auraEnabled } = {}) {
    if (!Object.hasOwn(SCENES, scene)) throw new Error('Unbekannte Lichtszene');
    const profile = SCENES[scene];
    const jobs = [];
    if (auraEnabled === true) jobs.push(['Aura', queueAura(async () => {
      latestAura = undefined;
      await sendAura(profile.aura);
      latestAura = profile.aura;
      return 'Szene gesendet';
    })]);
    if (Array.isArray(ids) && ids.length) jobs.push(['Govee', sendGovee(ids, profile.govee)]);
    if (!jobs.length) throw new Error('Mindestens einen Lichtausgang auswählen');
    return Promise.all(jobs.map(async ([name, result]) => {
      try { return { name, ok: true, message: await result }; }
      catch (error) { return { name, ok: false, message: error.message }; }
    }));
  }

  function bass(level) {
    if (!keyboard || latestAura === undefined || bassPending) return;
    if (!Number.isFinite(level) || level < 0 || level > 1 || now() - lastAuraAt < 125) return;
    lastAuraAt = now();
    bassPending = true;
    return queueAura(async () => {
      if (latestAura !== undefined) await sendAura(latestAura, Math.round((0.25 + level * 0.75) * 8) / 8);
    }).finally(() => { bassPending = false; });
  }

  return { devices, apply, startAura, stopAura: () => queueAura(release), bass,
    resetGovee: () => { session++; catalog.clear(); applied.clear(); } };
}

module.exports = { createLightScenes };
