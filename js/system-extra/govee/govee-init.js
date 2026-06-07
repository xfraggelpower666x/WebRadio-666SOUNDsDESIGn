import { initGoveeSceneSync } from "/js/system-extra/govee/govee-scene-sync.js";
import { initGoveeFxControlHooks } from "/js/system-extra/govee/govee-fx-control-hooks.js";

const analyzerBus = window.__S666_GOVEE_ANALYZER__ || new EventTarget();
window.__S666_GOVEE_ANALYZER__ = analyzerBus;

function setGoveeState(state, label) {
  try {
    document.documentElement.setAttribute("data-govee-state", state);
    document.body && document.body.setAttribute("data-govee-state", state);
    const led = document.getElementById("statusGovee") || document.querySelector("[data-status='govee']");
    if (led) {
      led.classList.remove("state-main", "state-api", "state-off", "state-error", "state-warning");
      if (state === "sync") led.classList.add("state-main");
      else if (state === "connected") led.classList.add("state-api");
      else if (state === "warning") led.classList.add("state-warning");
      else if (state === "error") led.classList.add("state-error");
      else led.classList.add("state-off");
      led.title = label || "GOVEE FX / Scene Sync";
      led.setAttribute("aria-label", label || "GOVEE FX / Scene Sync");
    }
  } catch (_) {}
}

function bootGovee() {
  try {
    initGoveeFxControlHooks();
    const sync = initGoveeSceneSync({ analyzer: analyzerBus });
    window.__S666_GOVEE_SYNC__ = sync;
    setGoveeState(sync ? "sync" : "warning", sync ? "GOVEE Sync aktiv" : "GOVEE wartet auf Analyzer");
  } catch (error) {
    console.warn("GOVEE init failed:", error?.message || error);
    setGoveeState("error", "GOVEE Bridge Fehler oder lokal nicht erreichbar");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootGovee, { once: true });
} else {
  bootGovee();
}
