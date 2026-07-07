import { goveeSetEnabled, goveeSetMode, goveeTestColor } from "/js/system-extra/govee/govee-bridge-client.js";

export function initGoveeFxControlHooks() {
  const enable = document.getElementById("goveeEnableSync");
  const mode = document.getElementById("goveeModeSelect");
  const test = document.getElementById("goveeTestColor");

  enable?.addEventListener("change", () => {
    goveeSetEnabled(enable.checked).catch((e) => console.warn(e.message));
  });

  mode?.addEventListener("change", () => {
    goveeSetMode(mode.value).catch((e) => console.warn(e.message));
  });

  test?.addEventListener("click", () => {
    goveeTestColor({ r: 0, g: 220, b: 255, brightness: 70 }).catch((e) => console.warn(e.message));
  });
}
