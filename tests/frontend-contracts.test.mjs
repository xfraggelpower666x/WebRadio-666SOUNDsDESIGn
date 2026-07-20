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
});

test("main player has one canonical EQ and meter writer", async () => {
  const equalizer = await read("js/equalizer.js");
  const stage = await read("js/player-stage-v2.js");
  assert.match(equalizer, /analyser\.fftSize = mobileLike\(\) \? 128 : 512/);
  assert.match(equalizer, /centerSupport/);
  assert.match(equalizer, /applyBottomMeter/);
  assert.match(equalizer, /window\.__MeterBus/);
  assert.match(equalizer, /target > meterEnvelope \? 0\.72 : 0\.20/);
  assert.match(stage, /installMeterBusHook/);
  assert.match(stage, /driveSideLeds/);
  assert.doesNotMatch(stage, /function setEq\(|function setSideMeters\(|function setBottom\(|function setPanelModules\(/);
  assert.doesNotMatch(stage, /\.eq-bar-fill[\s\S]*style\.height/);
});

test("main PC layout is centered, compact below and keeps large square side modules", async () => {
  const css = await read("css/player-stage-v2.css");
  assert.match(css, /\.frame-stage \.player-shell\{position:relative!important/);
  assert.match(css, /transform:none!important/);
  assert.match(css, /margin:6px auto!important/);
  assert.match(css, /--s666-side-panel-width:clamp\(220px/);
  assert.match(css, /aspect-ratio:1\/1!important/);
  assert.match(css, /\.visualizer \.(?:eq-bars|eq-bar-slot)/);
  assert.match(css, /grid-template-columns:auto auto minmax\(90px,1fr\) minmax\(142px,174px\)/);
  assert.match(css, /\.now-playing\{order:8!important[\s\S]*clamp\(126px,13\.5vh,146px\)/);
  assert.match(css, /\.volume-wrap\{display:flex!important/);
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

test("VELUNA desktop player is centered and its Now Playing area is compact", async () => {
  const theme = await read("css/veluna-theme.css");
  assert.match(theme, /data-veluna-page="veluna"\] \.app-shell[\s\S]*align-items:center!important;justify-content:center!important/);
  assert.match(theme, /width:clamp\(430px,37vw,500px\)/);
  assert.match(theme, /margin:0 auto!important/);
  assert.match(theme, /grid-template-rows:repeat\(9,auto\)/);
  assert.match(theme, /grid-template-rows:auto auto minmax\(76px,96px\)/);
  assert.match(theme, /height:clamp\(76px,10vh,96px\)/);
  assert.doesNotMatch(theme, /data-veluna-page="veluna"\] \.app-shell[^}]*align-items:flex-start/);
});

test("VELUNA central UI restores persistent purple active states and volume", async () => {
  const ui = await read("js/veluna-ui.js");
  assert.match(ui, /VELUNA Central UI Runtime v1\.2\.26/);
  assert.match(ui, /function installPersistentActiveState\(\)/);
  assert.match(ui, /transport-active/);
  assert.match(ui, /rgba\(180,92,255,\.78\)/);
  assert.match(ui, /function injectVolumeControl\(\)/);
  assert.match(ui, /velunaVolumeSlider/);
  assert.match(ui, /veluna_volume_v1/);
  assert.match(ui, /VELUNA_VOLUME_CONTROL/);
  assert.match(ui, /sourceSwitch\.appendChild\(row\)/);
});

test("VELUNA keeps fixed iPhone geometry and central responsive artwork", async () => {
  const veluna = await read("VELUNA/index.html");
  const theme = await read("css/veluna-theme.css");
  const ui = await read("js/veluna-ui.js");
  assert.match(veluna, /height:100dvh/);
  assert.match(veluna, /overflow:hidden;overscroll-behavior:none/);
  assert.match(veluna, /id="nowPlayingClone"/);
  assert.match(veluna, /@keyframes velunaTicker/);
  assert.match(theme, /position:fixed!important/);
  assert.match(theme, /orientation:landscape/);
  assert.match(theme, /--veluna-fixed-vw/);
  assert.match(theme, /contain:strict!important/);
  assert.match(theme, /\.veluna-bottom-brand[\s\S]*height:100%!important/);
  assert.match(theme, /max-width:96%!important/);
  assert.match(ui, /injectHeader/);
  assert.match(ui, /injectBottomBanner/);
  assert.match(ui, /injectSplash/);
});

test("all repaired runtime mirrors are byte-identical", async () => {
  for (const path of [
    "_headers", "index.html", "js/admin-auth-client.js", "js/player-alert-client.js", "js/messenger-overlay.js",
    "js/broadcast-message-history.js", "js/skip-control.js", "js/equalizer.js", "js/player-stage-v2.js",
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
