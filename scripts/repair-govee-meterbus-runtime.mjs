import fs from 'node:fs';

const config=`export const GOVEE_SYNC_CONFIG = {
  enabled: true,

  // local bridge endpoint
  baseUrl: "http://localhost:3000",

  // runtime pacing and bridge recovery
  sendIntervalMs: 90,
  requestTimeoutMs: 1800,
  reconnectDelayMs: 5000,

  // scene coupling
  sceneCoupling: true,
  effectCoupling: true,

  // payload scaling
  gain: 1,
  bassWeight: 1.15,
  midWeight: 0.95,
  highWeight: 1.0,

  // flash behavior
  beatFlash: true,
  dropFlash: true,

  // scene -> bridge mode mapping
  sceneModeMap: {
    idle: "ambient",
    build: "cyber",
    break: "ambient",
    drop: "club",
    storm: "club"
  },

  // preset/theme coupling hints for local light styling
  themeColorMap: {
    "pink-cyan": { r: 255, g: 70, b: 220 },
    "neon-green": { r: 70, g: 255, b: 170 },
    "cyan-yellow": { r: 0, g: 220, b: 255 },
    "electric-blue": { r: 50, g: 150, b: 255 },
    "cyan": { r: 0, g: 210, b: 255 }
  }
};
`;

const bridge=`import { GOVEE_SYNC_CONFIG } from "/js/system-extra/govee/govee-sync-config.js";

async function post(path, payload) {
  const url = \`${'${GOVEE_SYNC_CONFIG.baseUrl}'}${'${path}'}\`;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutMs = Math.max(250, Number(GOVEE_SYNC_CONFIG.requestTimeoutMs) || 1800);
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : 0;

  try {
    const res = await fetch(url, {
      method: "POST",
      mode: "cors",
      cache: "no-store",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
      ...(controller ? { signal: controller.signal } : {})
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(\`Bridge error ${'${res.status}'}: ${'${text}'}\`);
    }
    return res.json().catch(() => ({}));
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(\`Bridge timeout after ${'${timeoutMs}'}ms\`);
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
`;

const scene=`import { GOVEE_SYNC_CONFIG } from "/js/system-extra/govee/govee-sync-config.js";
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
`;

const hooks=`import { GOVEE_SYNC_CONFIG } from "/js/system-extra/govee/govee-sync-config.js";
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
`;

const targets={
  'js/system-extra/govee/govee-sync-config.js':config,
  'public/js/system-extra/govee/govee-sync-config.js':config,
  'js/system-extra/govee/govee-bridge-client.js':bridge,
  'public/js/system-extra/govee/govee-bridge-client.js':bridge,
  'js/system-extra/govee/govee-scene-sync.js':scene,
  'public/js/system-extra/govee/govee-scene-sync.js':scene,
  'js/system-extra/govee/govee-fx-control-hooks.js':hooks,
  'public/js/system-extra/govee/govee-fx-control-hooks.js':hooks
};

for(const [file,next] of Object.entries(targets)){
  const current=fs.readFileSync(file,'utf8');
  if(file.endsWith('govee-sync-config.js') && !current.includes('baseUrl: "http://localhost:3000"')) throw new Error(file+': unexpected config base');
  if(file.endsWith('govee-bridge-client.js') && !current.includes('async function post(path, payload)')) throw new Error(file+': bridge contract missing');
  if(file.endsWith('govee-scene-sync.js') && !current.includes('export function initGoveeSceneSync(ctx)')) throw new Error(file+': scene init missing');
  if(file.endsWith('govee-fx-control-hooks.js') && !current.includes('export function initGoveeFxControlHooks()')) throw new Error(file+': hook init missing');
  fs.writeFileSync(file,next);
}

const test=`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pairs=[
  ['js/system-extra/govee/govee-sync-config.js','public/js/system-extra/govee/govee-sync-config.js'],
  ['js/system-extra/govee/govee-bridge-client.js','public/js/system-extra/govee/govee-bridge-client.js'],
  ['js/system-extra/govee/govee-scene-sync.js','public/js/system-extra/govee/govee-scene-sync.js'],
  ['js/system-extra/govee/govee-fx-control-hooks.js','public/js/system-extra/govee/govee-fx-control-hooks.js']
];
for(const [root,mirror] of pairs){
  test(root+' mirrors public',()=>assert.equal(fs.readFileSync(root,'utf8'),fs.readFileSync(mirror,'utf8')));
}
const config=fs.readFileSync(pairs[0][0],'utf8');
const bridge=fs.readFileSync(pairs[1][0],'utf8');
const scene=fs.readFileSync(pairs[2][0],'utf8');
const hooks=fs.readFileSync(pairs[3][0],'utf8');
const index=fs.readFileSync('index.html','utf8');
const publicIndex=fs.readFileSync('public/index.html','utf8');

test('player root mirror remains intact',()=>assert.equal(index,publicIndex));
test('Govee runtime uses canonical MeterBus without a second audio graph',()=>{
  assert.match(scene,/window\\.__MeterBus/);
  assert.match(scene,/analyzer:update/);
  assert.match(scene,/toBridgeLevel/);
  assert.match(scene,/numeric \\* 255/);
  assert.match(scene,/reconnectDelayMs/);
  assert.match(scene,/inFlight/);
  assert.doesNotMatch(scene,/AudioContext|createMediaElementSource|createAnalyser/);
});
test('Govee bridge has timeout and offline recovery controls',()=>{
  assert.match(config,/requestTimeoutMs: 1800/);
  assert.match(config,/reconnectDelayMs: 5000/);
  assert.match(bridge,/AbortController/);
  assert.match(bridge,/Bridge timeout after/);
});
test('Govee controls and module loading are wired',()=>{
  assert.match(hooks,/bootHooks/);
  assert.match(hooks,/window\\.S666GoveeSync/);
  assert.match(index,/govee-scene-sync\\.js/);
  assert.match(index,/govee-fx-control-hooks\\.js/);
});
`;
fs.writeFileSync('tests/govee-meterbus-runtime.test.mjs',test);
