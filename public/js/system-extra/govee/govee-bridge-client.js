import { GOVEE_SYNC_CONFIG } from "./govee-sync-config.js?v=govee-cloud-r02";

async function call(path, payload, { interactive = true } = {}) {
  const auth = window.S666AdminAuth;
  if (!auth) throw new Error("Admin-Anmeldung nicht verfügbar");
  if (interactive) await auth.ensure({ message: "Admin-Passwort für Govee eingeben:" });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOVEE_SYNC_CONFIG.requestTimeoutMs);
  try {
    const response = await auth.fetch(`${GOVEE_SYNC_CONFIG.baseUrl}${path}`, {
      signal: controller.signal,
      ...(payload === undefined ? {} : {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || `Govee HTTP ${response.status}`);
      const header = response.headers.get("Retry-After");
      const seconds = header && /^\d+$/.test(header) ? Number(header) : 0;
      error.retryAfterMs = Math.max(seconds * 1000, Number(result.retryAfterMs) || 0);
      throw error;
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

export const goveeDevices = () => call("/devices");

export const goveeState = ({ sku, device }) => call("/state", { sku, device });

export function goveeControl(members, capability) {
  const targets = members.map(({ sku, device }) => ({ sku, device }));
  return targets.length === 1
    ? call("/control", { ...targets[0], capability })
    : call("/groups/control", { members: targets, capability });
}

export async function goveeSetEnabled(enabled) {
  if (enabled) await goveeDevices();
  return { ok: true, enabled: !!enabled };
}

export function goveeSetMode(mode) {
  GOVEE_SYNC_CONFIG.area = mode === "tv" ? "tv" : "bars";
  return { ok: true, area: GOVEE_SYNC_CONFIG.area };
}

export function goveeSendAudio(payload) {
  return call("/audio", { ...payload, area: GOVEE_SYNC_CONFIG.area }, { interactive: false });
}

export function goveePreviewAudio(payload) {
  return call("/audio/preview", payload);
}

export async function goveeTestColor({ r = 0, g = 180, b = 255 } = {}) {
  const { devices } = await goveeDevices();
  const sku = GOVEE_SYNC_CONFIG.area === "tv" ? "H6198" : "H6047";
  const members = devices.filter(device => device.sku === sku &&
    device.capabilities?.some(c => c.type === "devices.capabilities.color_setting" && c.instance === "colorRgb"));
  if (!members.length) throw new Error("Keine RGB-fähigen Geräte in diesem Bereich");
  return goveeControl(members, {
    type: "devices.capabilities.color_setting", instance: "colorRgb", value: (r << 16) | (g << 8) | b
  });
}
