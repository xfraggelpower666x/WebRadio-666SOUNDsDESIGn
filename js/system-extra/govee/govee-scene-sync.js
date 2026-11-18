import { GOVEE_SYNC_CONFIG } from "/js/system-extra/govee/govee-sync-config.js";
import { checkGoveeArea, goveePreviewAudio, goveeSendAudio } from "./govee-cloud-client.js?v=cloud-restore-1";
import { applyStatusChip } from "/js/shared-status.js";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}

const cloudIntervalMs = 2500;
const cloudReconnectMs = 10000;
const manualScenes = new Map([["cyber", "build"], ["club", "drop"], ["ambient", "break"]]);

function inferSignalScene(detail = {}) {
  const energy = clamp(detail.energy ?? detail.level, 0, 1);
  const pulse = clamp(detail.pulse || 0, 0, 1);
  const playing = document.documentElement.getAttribute("data-mff-playing") === "1";
  const realSignal = detail.source === "real" || energy > 0.025;

  if ((!playing && !realSignal) || energy < 0.025) return "idle";
  if (pulse > 0.42 || energy > 0.78) return "drop";
  if (energy > 0.32) return "build";
  if (energy < 0.12) return "break";
  return "build";
}

function readFxContext(detail = {}) {
  const body = document.body;
  const explicitScene = String(body?.dataset.fxSceneMode || "").trim();
  return {
    scene: explicitScene || inferSignalScene(detail),
    sceneSource: explicitScene ? "dataset" : "meterbus",
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
    pulse,
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

  const chip = document.getElementById("statusGovee");
  const ledState = state === "connecting" ? "warn" : state === "disabled" ? "off" : state;
  const labels = {
    online: "GOVEE / FX - Govee-Cloud erreichbar",
    connecting: "GOVEE / FX - Govee-Cloud wird verbunden",
    offline: "GOVEE / FX - Govee-Cloud nicht verfügbar",
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
  let pendingScene = null;
  let pendingSceneSince = 0;
  let connected = false;
  let retryAt = 0;
  let inFlight = false;
  let destroyed = false;
  let lastError = "";
  let enabling = false;
  let area = "bars";
  let manualScene;
  let generation = 0;
  GOVEE_SYNC_CONFIG.enabled = false;

  const markOffline = error => {
    connected = false;
    retryAt = Date.now() + Math.max(cloudReconnectMs, error?.retryAfterMs || 0);
    const message = error?.message || String(error || "cloud_unavailable");
    if (message !== lastError) console.warn("Govee-Cloud nicht verfügbar:", message);
    lastError = message;
    publishState("offline", message);
  };

  const onAnalyzer = async (event) => {
    if (destroyed || enabling) return;
    if (!GOVEE_SYNC_CONFIG.enabled) {
      publishState("disabled");
      return;
    }

    const detail = event.detail || {};
    const now = Date.now();
    if (!window.S666AdminAuth?.getToken() ||
      document.documentElement.getAttribute("data-mff-playing") !== "1" ||
      detail.source !== "real" || !Number.isFinite(detail.ts) || now - detail.ts > 1000
    ) return;
    if (inFlight || now < retryAt || now - lastSend < cloudIntervalMs) return;
    inFlight = true;
    const requestGeneration = generation;

    try {
      if (!connected) publishState("connecting");
      const fx = readFxContext(detail);
      if (manualScene) {
        fx.scene = manualScene;
        fx.sceneSource = "manual";
      }
      const payload = mapAnalyzer(detail, fx);
      document.documentElement.setAttribute("data-govee-scene", fx.scene);
      document.documentElement.setAttribute("data-govee-scene-source", fx.sceneSource);

      if (fx.scene !== pendingScene) {
        pendingScene = fx.scene;
        pendingSceneSince = now;
      }

      const immediateScene = fx.sceneSource === "dataset" || fx.sceneSource === "manual" || fx.scene === "drop" || fx.scene === "storm";
      const stableScene = now - pendingSceneSince >= 1200;
      if (GOVEE_SYNC_CONFIG.sceneCoupling && fx.scene !== lastScene && (lastScene === null || immediateScene || stableScene)) {
        lastScene = fx.scene;
      }

      if (!GOVEE_SYNC_CONFIG.enabled) return;
      const cloudEvent = {
        ...payload,
        area,
        scene: lastScene ?? fx.scene,
        theme: fx.theme,
        energy: payload.energy / 255
      };
      await goveeSendAudio(cloudEvent);
      if (destroyed || requestGeneration !== generation) return;
      connected = true;
      lastSend = Date.now();
      lastError = "";
      publishState("online");
    } catch (error) {
      if (!destroyed && requestGeneration === generation) markOffline(error);
    } finally {
      inFlight = false;
    }
  };

  ctx.analyzer.addEventListener("analyzer:update", onAnalyzer);

  return {
    async setEnabled(enabled) {
      const next = !!enabled;
      const requestGeneration = ++generation;
      GOVEE_SYNC_CONFIG.enabled = false;
      enabling = true;
      retryAt = 0;
      try {
        if (next) await checkGoveeArea(area);
        if (requestGeneration !== generation || destroyed) return;
        connected = next;
        GOVEE_SYNC_CONFIG.enabled = next;
        publishState(next ? "online" : "disabled");
        return { ok: true, enabled: next };
      } catch (error) {
        if (requestGeneration === generation && !destroyed) markOffline(error);
        throw error;
      } finally {
        if (requestGeneration === generation) enabling = false;
      }
    },
    setMode(mode) {
      manualScene = manualScenes.get(mode);
      lastScene = null;
      pendingScene = null;
      pendingSceneSince = 0;
    },
    async setArea(next) {
      await checkGoveeArea(next);
      generation++;
      area = next;
      retryAt = 0;
    },
    sendPreview(payload) {
      return goveePreviewAudio(payload);
    },
    getState() {
      return { enabled: GOVEE_SYNC_CONFIG.enabled, connected, retryAt, lastScene, pendingScene };
    },
    destroy() {
      destroyed = true;
      ctx.analyzer.removeEventListener("analyzer:update", onAnalyzer);
      publishState("stopped");
    }
  };
}

export function bootFromCanonicalMeterBus() {
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
        source: bus.source,
        ts
      } }));
    }
    timer = window.setTimeout(pump, Math.max(40, cloudIntervalMs));
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
