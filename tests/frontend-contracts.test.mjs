import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("messenger uses one authoritative Player Alert client", async () => {
  const messenger = await read("js/messenger-overlay.js");
  assert.match(messenger, /window\.S666PlayerAlertClient[\s\S]*client\.send/);
  assert.doesNotMatch(messenger, /playerAlertPcSend|existingSend\.click|text:\s*msg/);
  const client = await read("js/player-alert-client.js");
  assert.match(client, /message:\s*text/);
  assert.match(client, /state\.inFlight/);
  assert.match(client, /response\.ok/);
});

test("legacy inline senders are disabled and fetch is not monkey-patched", async () => {
  const index = await read("index.html");
  assert.equal((index.match(/data-disabled="audit-repair-v1"/g) || []).length, 3);
  assert.doesNotMatch(index, /window\.fetch\s*=\s*function/);
  assert.doesNotMatch(index, /document\.addEventListener\(['"]click['"],hardSend/);
  assert.match(index, /\/js\/admin-auth-client\.js/);
  assert.match(index, /\/js\/player-alert-client\.js/);
});

test("Admin, Discord and Skip share one Bearer client", async () => {
  const auth = await read("js/admin-auth-client.js");
  const stage = await read("js/player-stage-v2.js");
  const skip = await read("js/skip-control.js");
  const discord = await read("js/addons/discord-player-addon-v3.js");
  assert.match(auth, /s666_admin_session_token_v1/);
  assert.match(auth, /authorization/);
  assert.match(stage, /S666AdminAuth/);
  assert.match(stage, /S666SkipControl/);
  assert.doesNotMatch(stage, /sessionStorage|\/api\/admin\/login|fetch\('\/api\/admin\/skip/);
  assert.match(skip, /S666AdminAuth\.fetch/);
  assert.match(discord, /S666AdminAuth\.fetch/);
  assert.doesNotMatch(discord, /x-discord-gate-code|DISCORD_GATE_CODE|gateCode/);
});

test("Discord worker has no public fallback code and debug is protected", async () => {
  const discord = await read("worker-addons/discord-notify-addon-v3.js");
  assert.match(discord, /verifyPwIssuedToken/);
  assert.match(discord, /path === '\/api\/discord\/debug'/);
  assert.match(discord, /discordAccessOk/);
  assert.doesNotMatch(discord, /FALLBACK_DISCORD_GATE_SHA256|x-discord-gate-code|gateCodeOk/);
});

test("responsive V6 layout removes fixed V5 takeover", async () => {
  const css = await read("css/player-stage-v2.css");
  assert.match(css, /INTERIOR_LAYOUT_V6/);
  assert.match(css, /max-height:720px/);
  assert.match(css, /clamp\(156px,20vh,220px\)/);
  assert.doesNotMatch(css, /INTERIOR_LAYOUT_V5/);
});


test("VELUNA uses a fixed no-scroll iPhone viewport, bounded PC layout and central responsive artwork", async () => {
  const veluna = await read("VELUNA/index.html");
  const theme = await read("css/veluna-theme.css");
  const ui = await read("js/veluna-ui.js");
  assert.match(veluna, /height:100dvh/);
  assert.match(veluna, /overflow:hidden;overscroll-behavior:none/);
  assert.match(veluna, /@media \(min-width:769px\)/);
  assert.match(veluna, /id="nowPlayingClone"/);
  assert.match(veluna, /@keyframes velunaTicker/);
  assert.match(veluna, /WORKER AUTO SWITCH/);
  assert.match(veluna, /L\.Y\.V\.R\.A\. – Living Yielding Vibration and Resonance Architecture/);
  assert.match(veluna, /veluna-theme\.css/);
  assert.match(theme, /width:min\(1180px,calc\(100vw - 310px\)\)/);
  assert.match(theme, /position:fixed!important;inset:0!important/);
  assert.match(theme, /orientation:landscape/);
  assert.match(theme, /--veluna-fixed-vw/);
  assert.match(theme, /contain:strict!important/);
  const viewportLock = await read("js/veluna-viewport-lock.js");
  assert.match(viewportLock, /orientationchange/);
  assert.match(viewportLock, /data-veluna-keyboard-open/);
  assert.match(veluna, /maximum-scale=1/);
  assert.match(veluna, /veluna-viewport-lock\.js/);
  assert.match(ui, /injectHeader/);
  assert.match(ui, /injectBottomBanner/);
  assert.match(ui, /injectSplash/);
});

test("all player frontends consume the central de-duplicated title and LYVRA prefix contract", async () => {
  for (const path of ["VELUNA/index.html", "veluna/index.html", "index.html", "js/player-core.js", "js/extern.js", "dashboard/index.html"]) {
    const source = await read(path);
    assert.match(source, /LYVRA is alive · 666SOUNDsDESIGn · /, path);
    assert.match(source, /display_title/, path);
    assert.match(source, /Fraggle|fraggle/, path);
  }
  const worker = await read("worker.js");
  assert.match(worker, /normalizeMetadataBroadcastPayload/);
  assert.match(worker, /display_title: displayTitle/);
  assert.match(worker, /BROADCAST_TITLE_PREFIX/);
});

test("all repaired root/public files are byte-identical", async () => {
  for (const path of [
    "index.html", "js/admin-auth-client.js", "js/player-alert-client.js",
    "js/messenger-overlay.js", "js/broadcast-message-history.js", "js/skip-control.js",
    "js/player-stage-v2.js", "js/addons/discord-player-addon-v3.js", "js/version-core.js",
    "css/player-stage-v2.css", "config/radio-runtime.json", "config/release.json", "VELUNA/index.html", "veluna/index.html", "css/veluna-theme.css", "js/veluna-ui.js", "js/veluna-viewport-lock.js", "config/veluna-assets.js"
  ]) {
    assert.equal(await read(path), await read(`public/${path}`), `mirror drift: ${path}`);
  }
});


test("LYVRA DJ is the canonical Auto-DJ name while live-DJ values remain dynamic", async () => {
  for (const path of [
    "index.html", "VELUNA/index.html", "veluna/index.html", "js/player-core.js", "js/extern.js",
    "dashboard/index.html", "config/ui.config.js", "worker-addons/discord-notify-addon-v3.js"
  ]) {
    const source = await read(path);
    assert.match(source, /LYVRA DJ/, path);
    assert.doesNotMatch(source, /['\"](?:DJ 666|666 DJ|666SOUNDsDESIGn DJ)['\"]/, path);
  }
  const worker = await read("worker.js");
  assert.match(worker, /normalizeMetadataDjPayload/);
  assert.match(worker, /dj_mode: dj === AUTO_DJ_DISPLAY_NAME \? 'autodj' : 'live'/);
});

test("VELUNA preserves canonical WebRadio Skip/Discord routes, protected modals, mobile sound panel, stability recovery and levelmeter", async () => {
  const veluna = await read("VELUNA/index.html");
  assert.match(veluna, /id="skipBtn"/);
  assert.match(veluna, /S666AdminAuth\.ensure/);
  assert.match(veluna, /ENDPOINTS\.skip/);
  assert.match(veluna, /\/api\/admin\/skip/);
  assert.match(veluna, /canonical:'webradio-worker'/);
  assert.match(veluna, /id="discordBtn"/);
  assert.match(veluna, /\/api\/discord\/manual/);
  assert.match(veluna, /activeSecureAction='discord'/);
  assert.match(veluna, /s666:admin-auth-overlay/);
  assert.match(veluna, /id="soundPanel"/);
  assert.match(veluna, /SUB[\s\S]*LOW[\s\S]*MID[\s\S]*HIGH[\s\S]*AIR/);
  assert.match(veluna, /BOOST 0–5/);
  assert.match(veluna, /id="levelMeter"/);
  assert.match(veluna, /createMediaElementSource/);
  assert.match(veluna, /visibilitychange/);
  assert.match(veluna, /pageshow/);
  assert.match(veluna, /#soundBtn\{display:none\}/);
  assert.match(veluna, /source-led-btn/);
});


test("VELUNA central asset registry is the single runtime source for shared player visuals", async () => {
  const assets = await read("config/veluna-assets.js");
  const theme = await read("css/veluna-theme.css");
  const manifest = JSON.parse(await read("veluna.webmanifest"));
  for (const marker of ["background", "header", "fallbackCover", "appIcon", "bottomBanner", "splashWebm", "splashMp4"]) assert.match(assets, new RegExp(marker));
  assert.match(theme, /--veluna-laser-blue/);
  assert.match(theme, /--veluna-laser-violet/);
  assert.match(theme, /--veluna-laser-pink/);
  assert.equal(manifest.start_url, "/veluna/");
  assert.equal(manifest.scope, "/veluna/");
  assert.equal(manifest.short_name, "VELUNA");
});


test("VELUNA app icon pack, internal splash and requested banner placement are wired centrally", async () => {
  const assets = await read("config/veluna-assets.js");
  const ui = await read("js/veluna-ui.js");
  const main = await read("index.html");
  const veluna = await read("veluna/index.html");
  const siteManifest = JSON.parse(await read("site.webmanifest"));
  assert.match(assets, /veluna-loading-splash\.webm/);
  assert.match(assets, /veluna-bottom-banner\.webp/);
  assert.doesNotMatch(ui, /veluna_splash_seen_v128/);
  assert.match(ui, /const allowed = page === 'veluna' && mobileContext/);
  assert.doesNotMatch(ui, /veluna-desktop-outside/);
  assert.match(main, /assets\/veluna\/icons\/favicon-16x16\.png/);
  assert.match(main, /assets\/veluna\/icons\/favicon-32x32\.png/);
  assert.match(veluna, /assets\/veluna\/icons\/favicon-32x32\.png/);
  assert.equal(siteManifest.orientation, "any");
});
