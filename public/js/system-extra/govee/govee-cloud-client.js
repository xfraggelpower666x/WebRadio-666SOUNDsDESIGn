const route = '/api/admin/govee';
const timeoutMs = 12000;

async function call(path, payload) {
  const auth = window.S666AdminAuth;
  if (!auth?.getToken()) throw new Error('govee_admin_required');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await auth.fetch(route + path, {
      signal: controller.signal,
      redirect: 'error',
      ...(payload === undefined ? {} : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true) {
      const error = new Error(response.status === 429 ? 'govee_rate_limit' :
        result?.error || (response.status === 207 ? 'govee_partial' : `GOVEE HTTP ${response.status}`));
      const retryAfter = response.headers.get('Retry-After');
      const retrySeconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : 0;
      const members = Array.isArray(result?.results) ? result.results : [];
      error.retryAfterMs = Math.max(retrySeconds * 1000, Number(result?.retryAfterMs) || 0,
        ...members.map(member => Number(member.retryAfterMs) || 0));
      throw error;
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

async function getAreaDevices(area) {
  const params = new URLSearchParams({ area });
  const { devices } = await call('/devices?' + params);
  if (!Array.isArray(devices) || devices.length === 0) throw new Error('govee_no_devices');
  return devices;
}

export async function checkGoveeArea(area) {
  const devices = await getAreaDevices(area);
  return devices.length;
}

async function controlArea(area, capability) {
  const devices = await getAreaDevices(area);
  const members = devices.filter(device => device.capabilities?.some(
    advertised => advertised.type === capability.type && advertised.instance === capability.instance
  )).map(({ sku, device }) => ({ sku, device }));
  if (!members.length) throw new Error('govee_capability_unavailable');

  return members.length === 1
    ? call('/control', { ...members[0], capability })
    : call('/groups/control', { members, capability });
}

export function goveeCloudPower(area, enabled) {
  return controlArea(area, {
    type: 'devices.capabilities.on_off', instance: 'powerSwitch', value: enabled ? 1 : 0
  });
}

export function goveeCloudTestColor(area, { r, g, b, brightness }) {
  const scale = brightness / 100;
  return controlArea(area, {
    type: 'devices.capabilities.color_setting', instance: 'colorRgb',
    value: (Math.round(r * scale) << 16) | (Math.round(g * scale) << 8) | Math.round(b * scale)
  });
}

export function goveeSendAudio(payload) {
  return call('/audio', payload);
}

export function goveePreviewAudio(payload) {
  return call('/audio/preview', payload);
}
