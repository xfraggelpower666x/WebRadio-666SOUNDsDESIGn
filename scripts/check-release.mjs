import { readdir, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { basename, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootUrl = new URL("../", import.meta.url);
const rootPath = fileURLToPath(rootUrl);
const release = JSON.parse(await readFile(new URL("config/release.json", rootUrl), "utf8"));
const packageJson = JSON.parse(await readFile(new URL("package.json", rootUrl), "utf8"));

const releaseManifest = JSON.parse(await readFile(new URL("RELEASE-MANIFEST.json", rootUrl), "utf8"));
if (process.env.S666_ENFORCE_RELEASE_FOLDER === "1" && releaseManifest.expectedTopLevelFolder && basename(rootPath) !== releaseManifest.expectedTopLevelFolder) {
  throw new Error(`top-level folder mismatch: expected ${releaseManifest.expectedTopLevelFolder}, got ${basename(rootPath)}`);
}
if (releaseManifest.hardAuditPolicy !== true) throw new Error("HARD AUDIT policy flag missing");

const required = [
  "worker.js", "wrangler.jsonc", "index.html", "package.json", "package-lock.json",
  ".assetsignore", ".gitignore", "RELEASE-MANIFEST.json", "config/release.json",
  "config/radio-runtime.json", "js/admin-auth-client.js", "js/player-alert-client.js",
  "js/messenger-overlay.js", "js/broadcast-message-history.js", "js/skip-control.js",
  "js/player-stage-v2.js", "js/addons/discord-player-addon-v3.js",
  "worker-addons/skip-api-addon.js", "worker-addons/radio-admin-config-addon.js",
  "worker-addons/discord-notify-addon-v3.js", "worker-addons/chaos-engine-api-addon.js",
  "Scriptable/Scripts/666SOUNDsDESIGn_FOLDER_UPLOADER_LIVE_UI.js",
  "public/index.html", "workers/webradio-666soundsdesign-worker/worker.js",
  "workers/webradio-666soundsdesign-worker/wrangler.jsonc",
  "HARD_AUDIT_POLICY.md", "HARDLOCK_REPAIR_REPORT.md", "HARDLOCK_VALIDATION.json",
  "external-workers/666-system-pw-worker/worker.js",
  "external-workers/666-system-auth-worker/worker.js",
  "AMARIS/index.html", "amaris/index.html", "public/AMARIS/index.html", "public/amaris/index.html"
];
for (const path of required) {
  const info = await stat(new URL(path, rootUrl));
  if (!info.isFile()) throw new Error(`required file missing: ${path}`);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}
const files = await walk(rootPath);
const nestedZips = files.filter(file => file.toLowerCase().endsWith(".zip"));
const bytecode = files.filter(file => /(?:__pycache__|\.pyc$)/i.test(file));
if (nestedZips.length) throw new Error(`nested ZIP files forbidden: ${nestedZips.map(file => relative(rootPath, file)).join(", ")}`);
if (bytecode.length) throw new Error(`generated Python bytecode forbidden: ${bytecode.map(file => relative(rootPath, file)).join(", ")}`);

for (const file of files.filter(file => file.endsWith(".json"))) {
  try { JSON.parse(await readFile(file, "utf8")); }
  catch (error) { throw new Error(`invalid JSON: ${relative(rootPath, file)}: ${error.message}`); }
}

let syntaxChecked = 0;
for (const file of files.filter(file => /\.(?:js|mjs)$/i.test(file))) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`JavaScript syntax error: ${relative(rootPath, file)}\n${result.stderr || result.stdout}`);
  syntaxChecked += 1;
}

const worker = await readFile(new URL("worker.js", rootUrl), "utf8");
for (const marker of ["playerAlertRateIdentity", "STREAM_FAILOVER_BUDGET_MS", "handleDiscordNotifyV3", "serveAmarisPlayer", "isAmarisPlayerPath", "normalizeMetadataDjPayload", "apiNotFound", release.release]) {
  if (!worker.includes(marker)) throw new Error(`worker integration missing: ${marker}`);
}
for (const forbidden of [
  "FALLBACK_DISCORD_GATE_SHA256", "x-discord-gate-code", "discordAdminOrGateOk",
  "CHAOS_ENGINE_STATIC_B64_V2", "THE_DARK_DANCER", "data:image/png;base64"
]) {
  if (worker.includes(forbidden)) throw new Error(`forbidden legacy/security/bundle marker in worker: ${forbidden}`);
}

const rateIdentityBlock = worker.match(/async function playerAlertRateIdentity[\s\S]*?\n\}/)?.[0] || "";
if (/senderId/.test(rateIdentityBlock)) throw new Error("client senderId still influences Player Alert rate identity");
if (/clientId:senderId,rateKey/.test(worker)) throw new Error("rateKey still exposed in Player Alert payload");
if (!worker.includes("playerAlertPublicPayload")) throw new Error("Player Alert privacy sanitizer missing");
const workerBytes = Buffer.byteLength(worker, "utf8");
if (workerBytes > 150_000) throw new Error(`worker bundle unexpectedly large: ${workerBytes} bytes`);

const index = await readFile(new URL("index.html", rootUrl), "utf8");
for (const marker of ["/js/admin-auth-client.js", "/js/player-alert-client.js", "data-disabled=\"audit-repair-v1\""]) {
  if (!index.includes(marker)) throw new Error(`index repair marker missing: ${marker}`);
}
for (const forbidden of ["window.fetch=function", "document.addEventListener('click',hardSend", "setInterval(calmBottom,180)"]) {
  if (index.includes(forbidden)) throw new Error(`active legacy frontend marker remains: ${forbidden}`);
}


const adminAddon = await readFile(new URL("worker-addons/radio-admin-config-addon.js", rootUrl), "utf8");
for (const marker of [
  "requireAdminGate(request, env, { requireGithub: true })",
  "requireAdminGate(request, env, { requireGithub: true, requireWriteOrigin: true })",
  "issuer_invalid", "scope_invalid", "token_expired", "ADMIN_SERVICE_TOKEN"
]) {
  if (!adminAddon.includes(marker)) throw new Error(`admin hardlock marker missing: ${marker}`);
}
for (const forbidden of ["async function requireAdmin(", "password_verification_failed\\\" }, 403", "pw_issuer_invalid"]) {
  if (adminAddon.includes(forbidden)) throw new Error(`weak admin authorization marker remains: ${forbidden}`);
}

const adminOverlay = await readFile(new URL("js/player-admin-overlay.js", rootUrl), "utf8");
for (const marker of ["window.S666AdminAuth", "client.ensure", "client.fetch"]) {
  if (!adminOverlay.includes(marker)) throw new Error(`shared admin overlay marker missing: ${marker}`);
}
for (const forbidden of ["AUTH_LOGIN_URL", "x-admin-password", "pwOkCache", "function checkPw("]) {
  if (adminOverlay.includes(forbidden)) throw new Error(`legacy admin overlay marker remains: ${forbidden}`);
}

const phase10 = await readFile(new URL("js/phase10-stability-iphone-panel-hud.js", rootUrl), "utf8");
for (const forbidden of [
  "improveMeterScaling", "phase10-meter-boost-scale", "Date.now()/140",
  "Date.now()/95", "boostPush", "m.boost", "installAudioRecovery"
]) {
  if (phase10.includes(forbidden)) throw new Error(`synthetic/Boost meter marker remains: ${forbidden}`);
}
if ((phase10.match(/function startIphoneAudioStabilityGuardV2/g) || []).length !== 1) {
  throw new Error("single audio recovery authority hardlock failed");
}

const authClient = await readFile(new URL("js/admin-auth-client.js", rootUrl), "utf8");
for (const marker of ["cross_origin_authorized_fetch_rejected", "ensure: ensure", "credentials: 'same-origin'"]) {
  if (!authClient.includes(marker)) throw new Error(`admin auth client hardlock marker missing: ${marker}`);
}

const messenger = await readFile(new URL("js/messenger-overlay.js", rootUrl), "utf8");
if (!messenger.includes("window.S666PlayerAlertClient") && messenger.includes("client.send")) throw new Error("messenger does not use authoritative player-alert client");
for (const forbidden of ["playerAlertPcSend", "existingSend.click", "text: msg"]) {
  if (messenger.includes(forbidden)) throw new Error(`messenger legacy path remains: ${forbidden}`);
}

const discordWorker = await readFile(new URL("worker-addons/discord-notify-addon-v3.js", rootUrl), "utf8");
if (!discordWorker.includes("verifyPwIssuedToken")) throw new Error("Discord worker does not use shared admin verifier");
for (const forbidden of ["FALLBACK_DISCORD_GATE_SHA256", "x-discord-gate-code", "gateCodeOk"]) {
  if (discordWorker.includes(forbidden)) throw new Error(`Discord legacy gate remains: ${forbidden}`);
}

const rendererPairs = ["src/server.py", "requirements.txt", "render.yaml", ".env.example"];
for (const item of rendererPairs) {
  const canonical = await readFile(new URL(`Render/666SOUNDsDESIGn-Alert-Service-Renderer/${item}`, rootUrl));
  const mirror = await readFile(new URL(`renderer-resources/666SOUNDsDESIGn-Alert-Service-Renderer/${item}`, rootUrl));
  if (!canonical.equals(mirror)) throw new Error(`renderer mirror drift: ${item}`);
}

const productiveRoots = ["js", "css", "config"];
const publicPairs = ["index.html", "site.webmanifest", "chaos-matrix-control.html", "AMARIS/index.html", "amaris/index.html"];
for (const directory of productiveRoots) {
  const sourceFiles = files.filter(file => relative(rootPath, file).split(sep)[0] === directory);
  for (const source of sourceFiles) {
    const item = relative(rootPath, source).split(sep).join("/");
    const mirrorUrl = new URL(`public/${item}`, rootUrl);
    let mirror;
    try { mirror = await readFile(mirrorUrl); }
    catch { continue; }
    const original = await readFile(source);
    if (!original.equals(mirror)) throw new Error(`public deploy mirror drift: ${item}`);
    publicPairs.push(item);
  }
}
for (const item of ["index.html", "site.webmanifest", "chaos-matrix-control.html", "AMARIS/index.html", "amaris/index.html"]) {
  const source = await readFile(new URL(item, rootUrl));
  const mirror = await readFile(new URL(`public/${item}`, rootUrl));
  if (!source.equals(mirror)) throw new Error(`public deploy mirror drift: ${item}`);
}

const legacyWorker = await readFile(new URL("workers/webradio-666soundsdesign-worker/worker.js", rootUrl));
if (!legacyWorker.equals(await readFile(new URL("worker.js", rootUrl)))) throw new Error("legacy worker mirror drift");
for (const addon of ["radio-admin-config-addon.js", "discord-notify-addon-v3.js"]) {
  const canonical = await readFile(new URL(`worker-addons/${addon}`, rootUrl));
  const mirror = await readFile(new URL(`workers/webradio-666soundsdesign-worker/worker-addons/${addon}`, rootUrl));
  if (!canonical.equals(mirror)) throw new Error(`legacy worker addon mirror drift: ${addon}`);
}

if (packageJson.version !== release.version) throw new Error("package/release version drift");
const versionCore = await readFile(new URL("js/version-core.js", rootUrl), "utf8");
if (!versionCore.includes(release.frontendVersion) || !versionCore.includes(release.build)) throw new Error("frontend version core drift");

console.log(JSON.stringify({
  ok: true,
  rootName: basename(rootPath),
  release: release.release,
  version: release.version,
  files: files.length,
  nestedZips: 0,
  bytecode: 0,
  required: required.length,
  rendererMirrorPairs: rendererPairs.length,
  javascriptSyntaxChecked: syntaxChecked,
  publicMirrorPairs: new Set(publicPairs).size,
  sharedAdminAuth: true,
  singleMessengerEngine: true,
  streamFailoverBudget: true,
  workerBytes,
  embeddedBase64Assets: false,
  legacyBuildRoot: true,
  hardAuditPolicy: true,
  strictAdminAuthorization: true,
  singleAuthAuthority: true,
  preBoostMeterAuthority: true,
  privateRateIdentity: true
}, null, 2));
