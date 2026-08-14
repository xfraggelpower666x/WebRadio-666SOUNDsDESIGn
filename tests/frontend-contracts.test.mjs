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
  assert.match(css, /animation:tickerMove 14s linear infinite/);
  assert.match(css, /#phase10NowVersion[\s\S]*#pcTickerRebuildLane/);
  assert.match(css, /\.side-meter-stack\{display:grid!important;grid-template-columns:repeat\(3/);
  assert.match(stage, /veluna-player-header\.webp/);
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
  const theme = await read("css/veluna-theme.css");
  assert.match(ui, /s666_veluna_volume_v2/);
  assert.match(ui, /s666_veluna_boost_v2/);
  assert.match(ui, /s666_veluna_eq_v2/);
  assert.match(theme, /s666-veluna-active/);
});
