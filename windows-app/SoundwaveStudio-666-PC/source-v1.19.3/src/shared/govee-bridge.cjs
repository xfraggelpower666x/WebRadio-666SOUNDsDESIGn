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
  if (data?.ok === false || data?.success === false) throw new Error('govee_bridge_rejected');
  return { ok: true };
}

module.exports = { sendGovee };
