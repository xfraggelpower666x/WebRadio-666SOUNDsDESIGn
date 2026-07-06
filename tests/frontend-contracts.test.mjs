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


test("AMARIS is a no-scroll iPhone viewport and a compact black-background PC mini-player", async () => {
  const amaris = await read("AMARIS/index.html");
  assert.match(amaris, /height:100dvh/);
  assert.match(amaris, /overflow:hidden;overscroll-behavior:none/);
  assert.match(amaris, /@media \(min-width:769px\)/);
  assert.match(amaris, /width:min\(520px,calc\(100vw - 48px\)\)/);
  assert.match(amaris, /background:#000/);
  assert.match(amaris, /id="nowPlayingClone"/);
  assert.match(amaris, /@keyframes amarisTicker/);
  assert.match(amaris, /WORKER AUTO SWITCH/);
  assert.match(amaris, /L\.Y\.V\.R\.A\. – Living Yielding Vibration and Resonance Architecture/);
  assert.doesNotMatch(amaris, /\.status-grid\{grid-template-columns:1fr\}/);
});

test("all player frontends consume the central de-duplicated title and LYVRA prefix contract", async () => {
  for (const path of ["AMARIS/index.html", "amaris/index.html", "index.html", "js/player-core.js", "js/extern.js", "dashboard/index.html"]) {
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
    "css/player-stage-v2.css", "config/radio-runtime.json", "config/release.json", "AMARIS/index.html", "amaris/index.html"
  ]) {
    assert.equal(await read(path), await read(`public/${path}`), `mirror drift: ${path}`);
  }
});


test("LYVRA DJ is the canonical Auto-DJ name while live-DJ values remain dynamic", async () => {
  for (const path of [
    "index.html", "AMARIS/index.html", "amaris/index.html", "js/player-core.js", "js/extern.js",
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

test("AMARIS v1.2.4 adds protected Skip, Discord Shooter, mobile 5-band sound panel, stability recovery and levelmeter", async () => {
  const amaris = await read("AMARIS/index.html");
  assert.match(amaris, /id="skipBtn"/);
  assert.match(amaris, /S666AdminAuth\.ensure/);
  assert.match(amaris, /S666SkipControl\.skip/);
  assert.match(amaris, /\/api\/admin\/skip/);
  assert.match(amaris, /id="discordBtn"/);
  assert.match(amaris, /\/api\/discord\/manual/);
  assert.match(amaris, /id="soundPanel"/);
  assert.match(amaris, /SUB[\s\S]*LOW[\s\S]*MID[\s\S]*HIGH[\s\S]*AIR/);
  assert.match(amaris, /BOOST 0–5/);
  assert.match(amaris, /id="levelMeter"/);
  assert.match(amaris, /createMediaElementSource/);
  assert.match(amaris, /visibilitychange/);
  assert.match(amaris, /pageshow/);
  assert.match(amaris, /#soundBtn\{display:none\}/);
  assert.match(amaris, /source-led-btn/);
});
