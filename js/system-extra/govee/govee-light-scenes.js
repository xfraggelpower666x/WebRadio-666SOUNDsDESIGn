export const LIGHT_SCENES = Object.freeze({ bunker: 0x6400a0, break: 0x193c82, drop: 0x8800ff });
export const SCENE_OPTIONS = [['bunker', 'Bunker'], ['break', 'Break'], ['drop', 'Drop']];
const RGB = { type: 'devices.capabilities.color_setting', instance: 'colorRgb' };
const deviceKey = ({ sku, device }) => sku + '|' + device;

export function supportsScene(device) {
  return Array.isArray(device.capabilities) && device.capabilities.some(cap =>
    cap.type === RGB.type && cap.instance === RGB.instance);
}

export function fillScenes(select) {
  for (const [value, label] of SCENE_OPTIONS) select.add(new Option(label, value));
}

// Nur manuelle Szenenwechsel senden. Der vorhandene Worker begrenzt die Rate kontoweit.
export function createSceneSender(send, now = Date.now) {
  const sent = new Map();
  let busy = false;
  let nextAt = 0;
  return {
    reset() { sent.clear(); },
    async apply(devices, scene) {
      if (!Object.hasOwn(LIGHT_SCENES, scene)) throw new Error('Unbekannte Lichtszene.');
      if (!devices.length || devices.length > 8) throw new Error('Bitte 1 bis 8 Geräte auswählen.');
      if (devices.some(device => !supportsScene(device))) throw new Error('Alle ausgewählten Geräte müssen RGB unterstützen.');
      const value = LIGHT_SCENES[scene];
      const remaining = devices.filter(device => sent.get(deviceKey(device)) !== value);
      if (!remaining.length) return { ok: true, unchanged: true };
      if (busy || now() < nextAt) throw new Error('Govee wartet auf das nächste Befehlsfenster.');
      busy = true;
      nextAt = now() + 3000;
      try {
        const result = await send(remaining, { ...RGB, value });
        if (result.ok) remaining.forEach(device => sent.set(deviceKey(device), value));
        const rows = Array.isArray(result.results) ? result.results : [];
        for (const row of rows) {
          if (row.ok) sent.set(deviceKey(row), value);
          nextAt = Math.max(nextAt, now() + (Number(row.retryAfterMs) || 0));
        }
        return { ...result, targeted: remaining };
      } catch (error) {
        nextAt = Math.max(nextAt, now() + (Number(error.retryAfterMs) || 0));
        throw error;
      } finally {
        busy = false;
      }
    }
  };
}

export function describeScene(result) {
  if (result.unchanged) return 'Szene bereits gesendet.';
  if (Array.isArray(result.results)) {
    const labels = new Map(result.targeted.map(device => [deviceKey(device), device.deviceName || device.sku]));
    return result.results.map(item =>
      (labels.get(deviceKey(item)) || item.sku) + ': ' + (item.ok ? 'Bestätigt' : item.error || 'Unbestätigt')
    ).join(' · ');
  }
  return result.ok ? 'Govee hat die Szene bestätigt.' : result.error || 'Szene unbestätigt.';
}
