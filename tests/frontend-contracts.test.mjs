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

test("Skip owns interactive Bearer auth while Discord stays public", async () => {
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
  assert.doesNotMatch(stage, /S666AdminAuth|withGate\(/);
  assert.doesNotMatch(stage, /Admin-Passwort für den Discord Shooter/);
  assert.doesNotMatch(veluna, /S666AdminAuth\.fetch\(ENDPOINTS\.skip|async function ensureAdmin/);
  assert.doesNotMatch(discord, /S666AdminAuth\.ensure|ensureInteractiveAuth|authorizedAdminFetch/);
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

test("VELUNA delegates Skip centrally, keeps Discord public, and preserves sound/stability controls", async () => {
  const veluna = await read("VELUNA/index.html");
  const skip = await read("js/skip-control.js");
  assert.match(veluna, /id="skipBtn"/);
  assert.match(veluna, /S666SkipControl\.skip/);
  assert.match(skip, /\/api\/admin\/skip/);
  assert.match(skip, /\/api\/radio\/skip/);
  assert.doesNotMatch(veluna, /S666AdminAuth\.fetch\(ENDPOINTS\.skip|async function ensureAdmin/);
  assert.match(veluna, /id="discordBtn"/);
  assert.match(veluna, /S666DiscordPlayerAddonV3\?\.messagePost/);
  assert.doesNotMatch(veluna, /Admin-Passwort für VELUNA Discord Shooter/);
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
  assert.match(ui, /data-veluna-central-splash/);
  assert.match(ui, /body\.appendChild\(splash\)/);
  assert.match(ui, /VELUNA_CENTRAL_SPLASH_READY/);
  assert.doesNotMatch(ui, /veluna-desktop-outside/);
  assert.match(main, /assets\/veluna\/icons\/favicon-16x16\.png/);
  assert.match(main, /assets\/veluna\/icons\/favicon-32x32\.png/);
  assert.match(veluna, /assets\/veluna\/icons\/favicon-32x32\.png/);
  assert.equal(siteManifest.orientation, "any");
});


test("VELUNA EQ shapes first, Booster amplifies second, and limiter protects the combined output", async () => {
  const veluna = await read("VELUNA/index.html");
  assert.match(veluna, /let node=source;eqNodes\.forEach\(filter=>\{node\.connect\(filter\);node=filter\}\);node\.connect\(gainNode\)/);
  assert.match(veluna, /gainNode\.connect\(limiterNode\);limiterNode\.connect\(analyser\)/);
  assert.match(veluna, /createDynamicsCompressor/);
  assert.match(veluna, /audio\.dataset\.audioChain='eq-boost-limiter-active'/);
  assert.match(veluna, /EQ bleibt aktiv · Boost/);
  assert.doesNotMatch(veluna, /source\.connect\(gainNode\);let node=gainNode/);
});


test("VELUNA iPhone footer uses the available lower panel space without changing fullscreen geometry", async () => {
  const theme = await read("css/veluna-theme.css");
  assert.match(theme, /SMART IPHONE FOOTER FIT/);
  assert.match(theme, /clamp\(88px,16dvh,136px\)/);
  assert.match(theme, /\.veluna-bottom-brand[\s\S]*height:100%!important/);
  assert.match(theme, /max-width:96%!important/);
  assert.match(theme, /object-fit:contain!important/);
  assert.match(theme, /data-veluna-fixed-viewport/);
});


test('all player variants use one Skip auth owner and a public Discord owner', async () => {
  const stage = await read('js/player-stage-v2.js');
  const skip = await read('js/skip-control.js');
  const discord = await read('js/addons/discord-player-addon-v3.js');
  const veluna = await read('veluna/index.html');
  assert.match(skip, /function ensureInteractiveAuth\(options\)/);
  assert.match(skip, /S666AdminAuth\.ensure/);
  assert.match(skip, /S666AdminAuth\.fetch/);
  assert.match(stage, /S666SkipControl\.skip/);
  assert.match(veluna, /S666SkipControl\.skip/);
  assert.doesNotMatch(stage, /function withGate\(|S666AdminAuth/);
  assert.doesNotMatch(discord, /ensureInteractiveAuth|S666AdminAuth\.ensure|admin_session_required/);
});


test("all player variants expose immediate touch feedback without overlay interception", async () => {
  const velunaUi = await read("js/veluna-ui.js");
  const velunaTheme = await read("css/veluna-theme.css");
  const stage = await read("js/player-stage-v2.js");
  const stageCss = await read("css/player-stage-v2.css");
  const veluna = await read("veluna/index.html");
  const main = await read("index.html");
  assert.match(velunaUi, /function installTouchFeedback\(\)/);
  assert.match(velunaUi, /pointerdown/);
  assert.match(velunaUi, /pointercancel/);
  assert.match(velunaUi, /data-veluna-press/);
  assert.match(velunaTheme, /translateY\(2px\) scale\(\.955\)/);
  assert.match(velunaTheme, /tool-strip\{grid-template-columns:repeat\(4/);
  assert.match(stage, /function installTouchFeedback\(\)/);
  assert.match(stage, /data-s666-press/);
  assert.match(stageCss, /Shared Main-player touch authority/);
  assert.match(stageCss, /translateY\(2px\) scale\(\.955\)/);
  assert.match(veluna, /veluna-theme\.css\?v=2026-07-19-overlay-inert-v1226/);
  assert.match(veluna, /veluna-ui\.js\?v=2026-07-19-touch-feedback-v1225/);
  assert.match(main, /player-stage-v2\.css\?v=2026-07-19-touch-feedback-v1/);
  assert.match(main, /player-stage-v2\.js\?v=2026-07-19-touch-feedback-v1/);
});



test("player message overlay is inert when closed and inner dialogs never own viewport geometry", async () => {
  const client = await read("js/player-alert-client.js");
  const theme = await read("css/veluna-theme.css");
  const discord = await read("js/addons/discord-player-addon-v3.js");
  assert.match(client, /PLAYER_MESSAGE_OVERLAY_INERT_V1/);
  assert.match(client, /backdrop\.hidden = !visible/);
  assert.match(client, /setReceiveOverlayOpen\(backdrop, false\)/);
  assert.match(client, /pointer-events.*none/);
  assert.doesNotMatch(theme, /\[role=["']dialog["']\]/);
  assert.match(theme, /#playerAlertReceiveBackdrop\[aria-hidden="true"\]/);
  assert.match(theme, /#playerAlertReceiveBackdrop \.player-alert-modal/);
  assert.match(discord, /overlay-inert-v121/);
});
