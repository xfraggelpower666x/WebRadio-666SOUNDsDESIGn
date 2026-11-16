import { GOVEE_SYNC_CONFIG } from "/js/system-extra/govee/govee-sync-config.js";

async function post(path, payload) {
  const url = `${GOVEE_SYNC_CONFIG.baseUrl}${path}`;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutMs = Math.max(250, Number(GOVEE_SYNC_CONFIG.requestTimeoutMs) || 1800);
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : 0;

  try {
    const res = await fetch(url, {
      method: "POST",
      mode: "cors",
      redirect: "error",
      cache: "no-store",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
      ...(controller ? { signal: controller.signal } : {})
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Bridge error ${res.status}: ${text}`);
    }
    const data = await res.json().catch(() => ({}));
    if (data?.ok === false || data?.success === false) throw new Error("Bridge rejected the command");
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`Bridge timeout after ${timeoutMs}ms`);
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
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
