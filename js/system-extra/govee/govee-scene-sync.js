import { GOVEE_SYNC_CONFIG } from "/js/system-extra/govee/govee-sync-config.js?v=govee-cloud-r01";
import { goveeSendAudio, goveeSetMode, goveeSetEnabled, goveePreviewAudio } from "/js/system-extra/govee/govee-bridge-client.js?v=govee-cloud-r01";
import { applyStatusChip } from "/js/shared-status.js";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}

function readFxContext() {
  const body = document.body;
  const explicitScene = String(body?.dataset.fxSceneMode || "").trim();
  return {
    scene: explicitScene || undefined,
    sceneSource: explicitScene ? "dataset" : "meterbus",
    theme: document.body?.dataset.fxTheme || "pink-cyan"
  };
}

function publishState(state, error = "") {
  const root = document.documentElement;
  root?.setAttribute("data-govee-sync", state);
  if (error) root?.setAttribute("data-govee-error", String(error).slice(0, 160));
  else root?.removeAttribute("data-govee-error");

  const chip = document.getElementById("statusGovee");
  const ledState = state === "connecting" ? "warn" : state === "disabled" ? "off" : state;
  const labels = {
    online: "GOVEE / FX - Govee-Cloud online",
    connecting: "GOVEE / FX - Govee-Cloud wird verbunden",
    offline: "GOVEE / FX - Govee-Cloud offline",
    disabled: "GOVEE / FX - Synchronisation deaktiviert",
    stopped: "GOVEE / FX - Synchronisation gestoppt"
  };
  const tooltip = error
    ? `${labels[state] || "GOVEE / FX"}: ${String(error).slice(0, 100)}`
    : (labels[state] || "GOVEE / FX");
  applyStatusChip(chip, ledState, tooltip);

  try { window.dispatchEvent(new CustomEvent("s666:govee-state", { detail: { state, error } })); } catch (_) {}
}

export function initGoveeSceneSync(ctx) {
  if (!ctx?.analyzer) return null;

  let lastSend = 0;
  let lastScene = null;
  let connected = false;
  let retryAt = 0;
  let inFlight = false;
  let destroyed = false;
  let lastError = "";

  const markOffline = (error, now) => {
    connected = false;
    retryAt = now + Math.max(1000, Number(GOVEE_SYNC_CONFIG.reconnectDelayMs) || 5000);
    const message = error?.message || String(error || "cloud_unavailable");
    if (message !== lastError) console.warn("Govee-Cloud nicht verfügbar:", message);
    lastError = message;
    publishState("offline", message);
  };

  const onAnalyzer = async (event) => {
    if (destroyed) return;
    if (!GOVEE_SYNC_CONFIG.enabled) {
      publishState("disabled");
      return;
    }

    const now = Date.now();
    if (inFlight || now < retryAt || now - lastSend < GOVEE_SYNC_CONFIG.sendIntervalMs) return;
    inFlight = true;

    try {
      if (!window.S666AdminAuth?.getToken()) {
        GOVEE_SYNC_CONFIG.enabled = false;
        connected = false;
        publishState("disabled");
        return;
      }
      const detail = event.detail || {};
      const fx = readFxContext();
      if (detail.source !== "real") return;
      const energy = clamp(detail.energy ?? detail.level, 0, 1);
      const payload = { scene: fx.scene, theme: fx.theme, energy, pulse: clamp(detail.pulse, 0, 1) };
      const result = await goveeSendAudio(payload);
      connected = true;
      lastScene = fx.scene;
      if (fx.scene) document.documentElement.setAttribute("data-govee-scene", fx.scene);
      else document.documentElement.removeAttribute("data-govee-scene");
      document.documentElement.setAttribute("data-govee-scene-source", fx.sceneSource);
      if (!result.ok) throw new Error("Govee-Cloud meldet Teilerfolg oder Fehler");
      lastSend = now;
      lastError = "";
      publishState("online");
    } catch (error) {
      markOffline(error, now);
    } finally {
      inFlight = false;
    }
  };

  ctx.analyzer.addEventListener("analyzer:update", onAnalyzer);

  return {
    async setEnabled(enabled) {
      if (enabled) await goveeSetEnabled(true);
      GOVEE_SYNC_CONFIG.enabled = !!enabled;
      retryAt = 0;
      connected = false;
      publishState(enabled ? "connecting" : "disabled");
      return { ok: true, enabled: !!enabled };
    },
    setMode(area) {
      lastScene = null;
      return goveeSetMode(area);
    },
    sendPreview(payload) {
      return goveePreviewAudio(payload);
    },
    getState() {
      return { enabled: GOVEE_SYNC_CONFIG.enabled, connected, retryAt, lastScene };
    },
    destroy() {
      destroyed = true;
      ctx.analyzer.removeEventListener("analyzer:update", onAnalyzer);
      publishState("stopped");
    }
  };
}

function bootFromCanonicalMeterBus() {
  if (window.__S666_GOVEE_METERBUS_RUNTIME__) return window.__S666_GOVEE_METERBUS_RUNTIME__;

  const analyzer = new EventTarget();
  const sync = initGoveeSceneSync({ analyzer });
  if (!sync) return null;

  let lastBusTs = 0;
  let timer = 0;
  let stopped = false;

  const pump = () => {
    if (stopped) return;
    const bus = window.__MeterBus;
    const ts = Number(bus?.ts) || 0;
    if (bus && ts > lastBusTs && Date.now() - ts < 1500) {
      lastBusTs = ts;
      const pulse = clamp(bus.pulse || 0, 0, 1);
      analyzer.dispatchEvent(new CustomEvent("analyzer:update", { detail: {
        bass: bus.low,
        mid: bus.mid,
        high: bus.high,
        energy: bus.level,
        level: bus.level,
        peak: bus.peak,
        pulse,
        kick: pulse > 0.24,
        source: bus.source
      } }));
    }
    timer = window.setTimeout(pump, Math.max(40, Number(GOVEE_SYNC_CONFIG.sendIntervalMs) || 2500));
  };

  const runtime = {
    sync,
    analyzer,
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      sync.destroy();
    }
  };

  window.__S666_GOVEE_METERBUS_RUNTIME__ = runtime;
  window.S666GoveeSync = sync;
  publishState(GOVEE_SYNC_CONFIG.enabled ? "connecting" : "disabled");
  pump();
  return runtime;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootFromCanonicalMeterBus, { once: true });
} else {
  bootFromCanonicalMeterBus();
}
