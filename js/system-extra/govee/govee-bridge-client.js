import { GOVEE_SYNC_CONFIG } from "/js/system-extra/govee/govee-sync-config.js";

async function post(path, payload) {
  const url = `${GOVEE_SYNC_CONFIG.baseUrl}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bridge error ${res.status}: ${text}`);
  }
  return res.json().catch(() => ({}));
}

export async function goveeSetEnabled(enabled) {
  return post("/api/enabled", { enabled: !!enabled });
}

export async function goveeSetMode(mode) {
  return post("/api/mode", { mode });
}

export async function goveeSendAudio(payload) {
  return post("/api/audio", payload);
}

export async function goveeTestOn() {
  return post("/api/test/on");
}

export async function goveeTestOff() {
  return post("/api/test/off");
}

export async function goveeTestColor({ r = 0, g = 180, b = 255, brightness = 65 } = {}) {
  return post("/api/test/color", { r, g, b, brightness });
}
