import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function assertMirror(path) {
  assert.equal(await read(path), await read(`public/${path}`), `mirror drift: ${path}`);
}

test("messenger uses one authoritative Player Alert client", async () => {
  const messenger = await read("js/messenger-overlay.js");
  const client = await read("js/player-alert-client.js");
  assert.match(messenger, /window\.S666PlayerAlertClient[\s\S]*client\.send/);
  assert.doesNotMatch(messenger, /playerAlertPcSend|existingSend\.click|text:\s*msg/);
  assert.match(client, /message:\s*text/);
  assert.match(client, /state\.inFlight/);
  assert.match(client, /response\.ok/);
});

test("legacy inline senders stay disabled and fetch is not monkey-patched", async () => {
  const index = await read("index.html");
  assert.equal((index.match(/data-disabled="audit-repair-v1"/g) || []).length, 3);
  assert.doesNotMatch(index, /window\.fetch\s*=\s*function/);
  assert.doesNotMatch(index, /document\.addEventListener\(['"]click['"],hardSend/);
  assert.match(index, /\/js\/admin-auth-client\.js/);
  assert.match(index, /\/js\/player-alert-client\.js/);
});

test("Skip owns interactive Bearer auth while Discord remains public", async () => {
  const auth = await read("js/admin-auth-client.js");
  const stage = await read("js/player-stage-v2.js");
  const skip = await read("js/skip-control.js");
  const discord = await read("js/addons/discord-player-addon-v3.js");
  const veluna = await read("veluna/index.html");
  assert.match(auth, /s666_admin_session_token_v1/);
  assert.match(auth, /authorization/);
  assert.match(skip, /S666AdminAuth\.ensure/);
  assert.match(skip, /S666AdminAuth\.fetch/);
  assert.match(stage, /S666SkipControl\.skip/);
  assert.match(veluna, /S666SkipControl\.skip/);
  assert.doesNotMatch(stage, /function withGate\(|S666AdminAuth/);
  assert.doesNotMatch(discord, /ensureInteractiveAuth|S666AdminAuth\.ensure|admin_session_required|x-discord-gate-code/);
  assert.match(veluna, /d\.path==='\/api\/discord\/nowplaying'&&activeSecureAction!=='discord'/);
});

test("main player has one canonical EQ and meter writer", async () => {
  const equalizer = await read("js/equalizer.js");
  const stage = await read("js/player-stage-v2.js");
  assert.match(equalizer, /canonical audio visualizer authority V14/);
  assert.match(equalizer, /analyser\.fftSize = mobileLike\(\) \? 128 : 1024/);
  assert.match(equalizer, /const bandCount = Math.max\(1, bars.length\)/);
  assert.match(equalizer, /const signalPresent = globalMax >= 3/);
  assert.match(equalizer, /applyBottomMeter/);
  assert.match(equalizer, /window\.__MeterBus/);
  assert.match(equalizer, /target > meterEnvelope \? 0\.82 : 0\.13/);
  assert.match(equalizer, /--eq-scale/);
  assert.doesNotMatch(equalizer, /const halfBars|const mirrored|useHybrid|fallbackValue/);
  assert.doesNotMatch(equalizer, /const offset = side|index === 1 \? -5|index === 1 \? -10/);
  assert.doesNotMatch(equalizer, /slotHeight\(|clientHeight.*eq-bar|getBoundingClientRect.*eq-bar/);
  assert.match(stage, /Single MeterBus consumer/);
  assert.match(stage, /consumeMeterBus/);
  assert.match(stage, /driveStatus/);
  assert.match(stage, /driveReactiveVisuals/);
  assert.doesNotMatch(stage, /function setEq\(|function setSideMeters\(|function setBottom\(|\.side-meter-fill|#pcBottomSyncMeter|\.eq-bar-fill/);
});

test("main player restores responsive header, cockpit buttons and clean Now Playing", async () => {
  const css = await read("css/player-stage-v2.css");
  const stage = await read("js/player-stage-v2.js");
  assert.match(css, /Player Stage V12: real-spectrum geometry/);
  assert.match(css, /\.s666-main-header-image/);
  assert.match(css, /\.s666-main-header-line/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(css, /nth-child\(13\)[\s\S]*nth-child\(16\)/);
  assert.match(css, /\.now-playing \.now-cover-wrap[\s\S]*grid-column:1/);
  assert.match(css, /\.now-playing \.section-kicker/);
  assert.match(css, /animation:s666TitleMarquee 14s linear infinite/);
  assert.match(css, /#phase10NowVersion[\s\S]*#pcTickerRebuildLane/);
  assert.match(css, /\.side-meter-stack\{display:grid!important;grid-template-columns:repeat\(3/);
  assert.match(stage, /assets\/main\/header\/666soundsdesign-lyvra-main-header\.webp/);
  assert.match(stage, /NOW PLAYING/);
  assert.match(stage, /s666-now-static-title/);
  assert.match(stage, /s666-title-marquee/);
  assert.match(stage, /normalizeQueued/);
});

test("legacy primary action stylesheet never owns main-player geometry", async () => {
  const actions = await read("css/primary-player-actions.css");
  assert.match(actions, /Main-player geometry belongs to player-stage-v2\.css/);
  assert.match(actions, /\.s666-primary-action-dock/);
  assert.doesNotMatch(actions, /player-shell\s*>\s*\.visualizer/);
  assert.doesNotMatch(actions, /player-shell\s*>\s*\.now-playing/);
  assert.doesNotMatch(actions, /player-shell\s*>\s*\.bottom-console/);
  assert.doesNotMatch(actions, /\.visualizer\s*\{[\s\S]*height:/);
});

test("VELUNA desktop player remains centered and compact", async () => {
  const theme = await read("css/veluna-theme.css");
  assert.match(theme, /data-veluna-page="veluna"\] \.app-shell[\s\S]*align-items:center!important;justify-content:center!important/);
  assert.match(theme, /width:clamp\(430px,37vw,500px\)/);
  assert.match(theme, /margin:0 auto!important/);
  assert.match(theme, /grid-template-rows:repeat\(9,auto\)/);
  assert.match(theme, /grid-template-rows:auto auto minmax\(76px,96px\)/);
  assert.match(theme, /height:clamp\(76px,10vh,96px\)/);
  assert.doesNotMatch(theme, /data-veluna-page="veluna"\] \.app-shell[^}]*align-items:flex-start/);
});

test("VELUNA keeps persistent purple active states and volume", async () => {
  const ui = await read("js/veluna-ui.js");
  assert.match(ui, /VELUNA Central UI Runtime v1\.2\.32/);
  assert.match(ui, /function installPersistentActiveState\(\)/);
  assert.match(ui, /transport-active/);
  assert.match(ui, /rgba\(180,92,255,\.78\)/);
  assert.match(ui, /function injectVolumeControl\(\)/);
  assert.match(ui, /velunaVolumeSlider/);
  assert.match(ui, /veluna_volume_v1/);
  assert.match(ui, /VELUNA_VOLUME_CONTROL/);
  assert.match(ui, /sourceSwitch\.appendChild\(row\)/);
});

test("VELUNA iPhone geometry clears Dynamic Island and uses lower free space", async () => {
  const lock = await read("js/veluna-viewport-lock.js");
  const veluna = await read("VELUNA/index.html");
  assert.match(veluna, /viewport-fit=cover/);
  assert.match(veluna, /id="listenersText"[\s\S]*id="bitrateText"[\s\S]*id="djText"/);
  assert.match(lock, /stable iPhone fullscreen geometry lock v1\.3\.0/);
  assert.match(lock, /--veluna-safe-player-top/);
  assert.match(lock, /max\(56px, calc\(env\(safe-area-inset-top\) \+ 10px\)\)/);
  assert.match(lock, /--veluna-safe-player-bottom/);
  assert.match(lock, /card\.style\.setProperty\('bottom'/);
  assert.match(lock, /grid-template-rows/);
  assert.match(lock, /displayMinimum = compact \? 150 : 188/);
  assert.match(lock, /minmax\(\$\{displayMinimum\}px,1fr\) auto 0px/);
  assert.match(lock, /placeInRow\(miniGrid, 5\)/);
  assert.match(lock, /placeInRow\(sourceSwitch, 7\)/);
  assert.match(lock, /placeInRow\(footer, 12\)/);
  assert.match(lock, /miniGrid\.style\.setProperty\('visibility','visible','important'\)/);
  assert.match(lock, /veluna-bottom-brand/);
  assert.doesNotMatch(lock, /visualViewport\?\.addEventListener|addEventListener\('resize'/);
});

test("all player overlays use one design-neutral safe-area core", async () => {
  const core = await read("core/overlay/overlay-core.js");
  const css = await read("core/overlay/overlay-core.css");
  assert.match(core, /v179-overlay-safe-area-core/);
  assert.match(core, /visualViewport/);
  assert.match(core, /scanOverlays/);
  assert.match(core, /s666SoundControlOverlay/);
  assert.match(core, /s666MsgOverlay/);
  assert.match(core, /smfp-overlay-close-managed/);
  assert.match(css, /--smfp-overlay-safe-top/);
  assert.match(css, /\.smfp-overlay-managed/);
  assert.match(css, /\.smfp-overlay-panel-managed/);
  assert.match(css, /overflow-y:auto!important/);
  assert.match(css, /position:sticky!important/);
  assert.doesNotMatch(css, /background:|border-color:|color:/);
});

test("all repaired runtime mirrors are byte-identical", async () => {
  for (const path of [
    "_headers", "index.html", "js/admin-auth-client.js", "js/player-alert-client.js", "js/messenger-overlay.js",
    "js/broadcast-message-history.js", "js/skip-control.js", "js/equalizer.js", "js/player-stage-v2.js",
    "js/overlay-core.js", "core/overlay/overlay-core.js", "core/overlay/overlay-core.css",
    "js/addons/discord-player-addon-v3.js", "js/version-core.js", "css/player-stage-v2.css",
    "css/primary-player-actions.css", "css/veluna-theme.css", "config/radio-runtime.json", "config/release.json", "VELUNA/index.html",
    "veluna/index.html", "js/veluna-ui.js", "js/veluna-viewport-lock.js", "config/veluna-assets.js"
  ]) await assertMirror(path);
});

test("UI assets are revalidated instead of being frozen behind stale cache", async () => {
  const headers = await read("_headers");
  assert.match(headers, /\/js\/\*/);
  assert.match(headers, /\/css\/\*/);
  assert.match(headers, /Cache-Control: no-cache, must-revalidate/);
});

test("all player frontends use the canonical title and LYVRA DJ identity", async () => {
  for (const path of ["VELUNA/index.html", "veluna/index.html", "index.html", "js/player-core.js", "js/extern.js", "dashboard/index.html"]) {
    const source = await read(path);
    assert.match(source, /LYVRA is alive · 666SOUNDsDESIGn · /, path);
    assert.match(source, /display_title/, path);
    assert.match(source, /Fraggle|fraggle/, path);
    assert.match(source, /LYVRA DJ/, path);
    assert.doesNotMatch(source, /['"](?:DJ 666|666 DJ|666SOUNDsDESIGn DJ)['"]/, path);
  }
});

test("VELUNA preserves its EQ, Booster, limiter and recovery chain", async () => {
  const veluna = await read("VELUNA/index.html");
  assert.match(veluna, /let node=source;eqNodes\.forEach\(filter=>\{node\.connect\(filter\);node=filter\}\);node\.connect\(gainNode\)/);
  assert.match(veluna, /gainNode\.connect\(limiterNode\);limiterNode\.connect\(analyser\)/);
  assert.match(veluna, /createDynamicsCompressor/);
  assert.match(veluna, /audio\.dataset\.audioChain='eq-boost-limiter-active'/);
  assert.match(veluna, /visibilitychange/);
  assert.match(veluna, /pageshow/);
  assert.match(veluna, /BOOST 0–5/);
  assert.match(veluna, /SUB[\s\S]*LOW[\s\S]*MID[\s\S]*HIGH[\s\S]*AIR/);
});

test("shared visual assets, touch feedback and inert message overlay stay wired", async () => {
  const assets = await read("config/veluna-assets.js");
  const ui = await read("js/veluna-ui.js");
  const stage = await read("js/player-stage-v2.js");
  const stageCss = await read("css/player-stage-v2.css");
  const theme = await read("css/veluna-theme.css");
  const client = await read("js/player-alert-client.js");
  for (const marker of ["background", "header", "fallbackCover", "appIcon", "bottomBanner", "splashWebm", "splashMp4"]) assert.match(assets, new RegExp(marker));
  assert.match(ui, /function installTouchFeedback\(\)/);
  assert.match(stage, /function installTouchFeedback\(\)/);
  assert.match(stageCss, /translateY\(2px\) scale\(\.955\)/);
  assert.match(theme, /translateY\(2px\) scale\(\.955\)/);
  assert.match(client, /PLAYER_MESSAGE_OVERLAY_INERT_V1/);
  assert.match(theme, /#playerAlertReceiveBackdrop\[aria-hidden="true"\]/);
  assert.match(theme, /#playerAlertReceiveBackdrop \.player-alert-modal/);
  assert.doesNotMatch(theme, /\[role=["']dialog["']\]/);
});
