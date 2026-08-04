import { GOVEE_SYNC_CONFIG } from "/js/system-extra/govee/govee-sync-config.js";
import { goveeSetEnabled, goveeSetMode, goveeTestColor } from "/js/system-extra/govee/govee-bridge-client.js";

function runtime() {
  return window.S666GoveeSync || null;
}

function bindControl(element, eventName, handler) {
  if (!element || element.dataset.goveeHookBound === "1") return false;
  element.dataset.goveeHookBound = "1";
  element.addEventListener(eventName, handler);
  return true;
}

export function initGoveeFxControlHooks() {
  const enable = document.getElementById("goveeEnableSync");
  const mode = document.getElementById("goveeModeSelect");
  const test = document.getElementById("goveeTestColor");
  let bound = 0;

  if (enable) enable.checked = !!GOVEE_SYNC_CONFIG.enabled;
  if (bindControl(enable, "change", () => {
    const action = runtime()?.setEnabled?.(enable.checked) || goveeSetEnabled(enable.checked);
    Promise.resolve(action).catch((e) => console.warn(e.message));
  })) bound += 1;

  if (bindControl(mode, "change", () => {
    const action = runtime()?.setMode?.(mode.value) || goveeSetMode(mode.value);
    Promise.resolve(action).catch((e) => console.warn(e.message));
  })) bound += 1;

  if (bindControl(test, "click", () => {
    const payload = { r: 0, g: 220, b: 255, brightness: 70 };
    const action = runtime()?.sendPreview?.({ previewColor: payload }) || goveeTestColor(payload);
    Promise.resolve(action).catch((e) => console.warn(e.message));
  })) bound += 1;

  return bound;
}

function bootHooks() {
  if (window.__S666_GOVEE_CONTROL_HOOKS__) return;
  window.__S666_GOVEE_CONTROL_HOOKS__ = true;
  initGoveeFxControlHooks();
  [500, 1500, 4000].forEach((delay) => setTimeout(initGoveeFxControlHooks, delay));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootHooks, { once: true });
} else {
  bootHooks();
}
