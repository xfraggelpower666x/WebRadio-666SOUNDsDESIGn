import { GOVEE_SYNC_CONFIG } from "/js/system-extra/govee/govee-sync-config.js";
import { goveeSendAudio, goveeSetMode, goveeSetEnabled } from "/js/system-extra/govee/govee-bridge-client.js";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function sceneToMode(scene) {
  return GOVEE_SYNC_CONFIG.sceneModeMap?.[scene] || "cyber";
}

function readFxContext() {
  const body = document.body;
  return {
    scene: body.dataset.fxSceneMode || "idle",
    theme: body.dataset.fxTheme || "pink-cyan",
    tunnel: body.dataset.fxTunnel || "off",
    lightning: body.dataset.fxLightning || "off",
    tiles: body.dataset.fxTiles || "off",
    glow: body.dataset.fxGlow || "medium",
    reactor: body.dataset.fxReactor || "off"
  };
}

function mapAnalyzer(detail, fx) {
  const bass = clamp(Number(detail.bass || 0) * GOVEE_SYNC_CONFIG.bassWeight * GOVEE_SYNC_CONFIG.gain, 0, 255);
  const mid = clamp(Number(detail.mid || detail.lowMid || 0) * GOVEE_SYNC_CONFIG.midWeight * GOVEE_SYNC_CONFIG.gain, 0, 255);
  const high = clamp(Number(detail.high || detail.highMid || 0) * GOVEE_SYNC_CONFIG.highWeight * GOVEE_SYNC_CONFIG.gain, 0, 255);
  const energy = clamp(Number(detail.energy || 0) * 255 * GOVEE_SYNC_CONFIG.gain, 0, 255);
  const kick = !!detail.kick || !!detail.beat;
  const drop = fx.scene === "drop" || fx.scene === "storm";
  const breakMode = fx.scene === "break";

  return {
    bass,
    mid,
    high,
    energy,
    kick,
    drop,
    breakMode,
    fx
  };
}

export function initGoveeSceneSync(ctx) {
  if (!ctx?.analyzer) return null;

  let lastSend = 0;
  let lastScene = null;
  let connected = false;

  goveeSetEnabled(true).then(() => { connected = true; }).catch(() => {});

  const onAnalyzer = async (event) => {
    if (!GOVEE_SYNC_CONFIG.enabled) return;

    const now = performance.now();
    if (now - lastSend < GOVEE_SYNC_CONFIG.sendIntervalMs) return;

    const fx = readFxContext();
    const payload = mapAnalyzer(event.detail || {}, fx);

    if (GOVEE_SYNC_CONFIG.sceneCoupling && fx.scene !== lastScene) {
      lastScene = fx.scene;
      try {
        await goveeSetMode(sceneToMode(fx.scene));
      } catch (error) {
        console.warn("Govee mode switch failed:", error.message);
      }
    }

    try {
      await goveeSendAudio(payload);
      lastSend = now;
    } catch (error) {
      console.warn("Govee audio sync failed:", error.message);
    }
  };

  ctx.analyzer.addEventListener("analyzer:update", onAnalyzer);

  return {
    setEnabled(enabled) {
      GOVEE_SYNC_CONFIG.enabled = !!enabled;
      return goveeSetEnabled(!!enabled);
    },
    setMode(mode) {
      return goveeSetMode(mode);
    },
    sendPreview(payload) {
      return goveeSendAudio(payload);
    }
  };
}
