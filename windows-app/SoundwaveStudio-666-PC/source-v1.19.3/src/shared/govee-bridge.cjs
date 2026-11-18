const origin = 'http://localhost:3000';
const routes = {
  enabled: '/api/enabled',
  mode: '/api/mode',
  on: '/api/test/on',
  off: '/api/test/off',
  color: '/api/test/color',
  audio: '/api/audio'
};
const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;

function requestBody(action, value) {
  switch (action) {
    case 'enabled':
      if (typeof value === 'boolean') return { enabled: value };
      break;
    case 'mode':
      if (['ambient', 'cyber', 'club'].includes(value)) return { mode: value };
      break;
    case 'on':
    case 'off':
      return {};
    case 'color':
      if (value && [value.r, value.g, value.b].every(byte) &&
          Number.isInteger(value.brightness) && value.brightness >= 1 && value.brightness <= 100) {
        return { r: value.r, g: value.g, b: value.b, brightness: value.brightness };
      }
      break;
    case 'audio':
      if (value && [value.bass, value.mid, value.high, value.energy].every(byte)) {
        return { bass: value.bass, mid: value.mid, high: value.high, energy: value.energy,
          kick: false, drop: false, breakMode: false };
      }
      break;
  }
  throw new Error('govee_invalid_command');
}

async function sendGovee(action, value) {
  const body = requestBody(action, value);
  let response;
  try {
    response = await fetch(origin + routes[action], {
      method: 'POST',
      redirect: 'error',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1800)
    });
  } catch {
    throw new Error('govee_bridge_unreachable');
  }
  if (!response.ok) throw new Error('govee_bridge_rejected');
  const data = await response.json().catch(() => null);
  if (data?.ok === false || data?.success === false ||
      (data?.ok !== true && data?.success !== true)) throw new Error('govee_bridge_invalid_ack');
  return { ok: true, confirmed: false };
}

// Der 8766-Controller quittiert das UDP-Senden pro Gerät.
function createLocalGovee({ request = fetch, now = Date.now } = {}) {
  const endpoint = 'http://127.0.0.1:8766';
  let catalog = new Map();
  let target = '';
  let mode = 'cyber';
  let nextFrame = 0;
  let lastColor = '';
  const palettes = {
    cyber: [[55, 0, 155], [15, 205, 255], [255, 15, 176]],
    club: [[120, 0, 18], [255, 78, 0], [255, 0, 128]],
    ambient: [[25, 40, 110], [28, 125, 235], [70, 90, 255]]
  };

  async function json(route, body) {
    let response;
    try {
      response = await request(endpoint + route, {
        method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(1800),
        ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
      });
    } catch {
      throw new Error('govee_local_unreachable');
    }
    if (!response.ok) throw new Error('govee_local_http_' + response.status);
    const data = await response.json().catch(() => null);
    if (!data || typeof data !== 'object') throw new Error('govee_bridge_invalid_ack');
    return data;
  }

  async function command(action, value) {
    if (action === 'devices') {
      const data = await json('/api/devices');
      if (!Array.isArray(data.devices)) throw new Error('govee_local_invalid_catalog');
      catalog = new Map(data.devices.slice(0, 100).filter(device =>
        typeof device?.id === 'string' && device.id.length > 0 && device.id.length <= 160
      ).map(device => [device.id, String(device.name || device.label || device.id).slice(0, 100)]));
      target = '';
      lastColor = '';
      return { devices: [...catalog].map(([id, label]) => ({ id, label })) };
    }
    if (action === 'target') {
      if (value !== '' && !catalog.has(value)) throw new Error('govee_local_choose_device');
      target = value;
      lastColor = '';
      return { configured: true };
    }

    const body = requestBody(action, value);
    if (action === 'mode') {
      mode = body.mode;
      lastColor = '';
      return { configured: true };
    }
    if (action === 'enabled' && !body.enabled) return { configured: true };
    if (!target) throw new Error('govee_local_choose_device');

    async function send(type, payload) {
      const data = await json('/api/control', { devices: [target], action: type, value: payload });
      if (!Array.isArray(data.results) || data.results.length !== 1 ||
          data.results[0]?.id !== target || data.results[0]?.sent !== true) {
        throw new Error('govee_local_command_not_sent');
      }
      return { ok: true, confirmed: false, udpSent: true };
    }

    if (action === 'enabled') {
      lastColor = '';
      nextFrame = 0;
      return { configured: true };
    }
    if (action === 'on' || action === 'off') {
      lastColor = '';
      return send('turn', action === 'on');
    }
    const toHex = channels => '#' + channels.map(channel => channel.toString(16).padStart(2, '0')).join('');
    if (action === 'color') {
      lastColor = '';
      await send('color', toHex([body.r, body.g, body.b]));
      try {
        return await send('brightness', body.brightness);
      } catch {
        throw new Error('govee_local_color_sent_brightness_failed');
      }
    }
    if (body.energy === 0 || now() < nextFrame) return { skipped: true };
    const band = [body.bass, body.mid, body.high].indexOf(Math.max(body.bass, body.mid, body.high));
    const gain = Math.max(0.25, Math.round(body.energy / 255 * 8) / 8);
    const color = toHex(palettes[mode][band].map(channel => Math.round(channel * gain)));
    if (color === lastColor) return { skipped: true };
    nextFrame = now() + 600;
    const result = await send('color', color);
    lastColor = color;
    return result;
  }

  return { command };
}

module.exports = { sendGovee, createLocalGovee };
