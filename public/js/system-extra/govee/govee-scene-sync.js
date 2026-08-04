import { GOVEE_SYNC_CONFIG } from "/js/system-extra/govee/govee-sync-config.js";
import { goveeSendAudio, goveeSetMode, goveeSetEnabled } from "/js/system-extra/govee/govee-bridge-client.js";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}

function sceneToMode(scene) {
  return GOVEE_SYNC_CONFIG.sceneModeMap?.[scene] || "cyber";
}

function readFxContext() {
  const body = document.body;
  return {
    scene: body?.dataset.fxSceneMode || "idle",
    theme: body?.dataset.fxTheme || "pink-cyan",
    tunnel: body?.dataset.fxTunnel || "off",
    lightning: body?.dataset.fxLightning || "off",
    tiles: body?.dataset.fxTiles || "off",
    glow: body?.dataset.fxGlow || "medium",
    reactor: body?.dataset.fxReactor || "off"
  };
}

function toBridgeLevel(value, weight = 1) {
  const numeric = Number(value) || 0;
  const scaled = Math.abs(numeric) <= 1.25 ? numeric * 255 : numeric;
  return Math.round(clamp(scaled * weight * GOVEE_SYNC_CONFIG.gain, 0, 255));
}

function mapAnalyzer(detail, fx) {
  const pulse = clamp(detail.pulse || 0, 0, 1);
  return {
    bass: toBridgeLevel(detail.bass ?? detail.low, GOVEE_SYNC_CONFIG.bassWeight),
    mid: toBridgeLevel(detail.mid ?? detail.lowMid, GOVEE_SYNC_CONFIG.midWeight),
    high: toBridgeLevel(detail.high ?? detail.highMid, GOVEE_SYNC_CONFIG.highWeight),
    energy: toBridgeLevel(detail.energy ?? detail.level, 1),
    kick: !!detail.kick || !!detail.beat || pulse > 0.24,
    drop: fx.scene === "drop" || fx.scene === "storm",
    breakMode: fx.scene === "break",
    fx
  };
}

function publishState(state, error = "") {
  const root = document.documentElement;
  root?.setAttribute("data-govee-sync", state);
  if (error) root?.setAttribute("data-govee-error", String(error).slice(0, 160));
  else root?.removeAttribute("data-govee-error");
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
    const message = error?.message || String(error || "bridge_unavailable");
    if (message !== lastError) console.warn("Govee bridge offline:", message);
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
      if (!connected) {
        publishState("connecting");
        await goveeSetEnabled(true);
        connected = true;
      }

      const fx = readFxContext();
      const payload = mapAnalyzer(event.detail || {}, fx);

      if (GOVEE_SYNC_CONFIG.sceneCoupling && fx.scene !== lastScene) {
        await goveeSetMode(sceneToMode(fx.scene));
        lastScene = fx.scene;
      }

      await goveeSendAudio(payload);
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
      GOVEE_SYNC_CONFIG.enabled = !!enabled;
      retryAt = 0;
      if (!enabled) {
        connected = false;
        publishState("disabled");
      }
      return goveeSetEnabled(!!enabled);
    },
    setMode(mode) {
      lastScene = null;
      return goveeSetMode(mode);
    },
    sendPreview(payload) {
      return goveeSendAudio(payload);
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
    if (bus && ts > lastBusTs) {
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
    timer = window.setTimeout(pump, Math.max(40, Number(GOVEE_SYNC_CONFIG.sendIntervalMs) || 90));
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
