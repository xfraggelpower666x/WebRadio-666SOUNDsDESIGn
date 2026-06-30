import { readdir, readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const rootUrl = new URL("../", import.meta.url);
const rootPath = fileURLToPath(rootUrl);
const expectedRootName = "WebRadio-666SOUNDsDESIGn_FULLVERSION_AUTH_HARDLOCK_REPAIR_v1_1_0";

const required = [
  "worker.js",
  "wrangler.jsonc",
  "index.html",
  "package.json",
  "package-lock.json",
  ".assetsignore",
  ".gitignore",
  "RELEASE-MANIFEST.json",
  "config/radio-runtime.json",
  "worker-addons/skip-api-addon.js",
  "worker-addons/radio-admin-config-addon.js",
  "worker-addons/discord-notify-addon-v3.js",
  "js/admin-auth.js",
  "docs/AUTH_ARCHITECTURE_CANONICAL_v1_0_0.md",
  "Scriptable/Scripts/666SOUNDsDESIGn_FOLDER_UPLOADER_LIVE_UI.js",
  "public/index.html",
  "public/js/admin-auth.js",
  "workers/webradio-666soundsdesign-worker/worker.js",
  "workers/webradio-666soundsdesign-worker/wrangler.jsonc"
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
const forbiddenLocalState = files.filter(file => /(?:^|\/)(?:\.git|\.wrangler)(?:\/|$)/.test(relative(rootPath, file).replaceAll("\\", "/")));
if (nestedZips.length) throw new Error(`nested ZIP files forbidden: ${nestedZips.map(file => relative(rootPath, file)).join(", ")}`);
if (bytecode.length) throw new Error(`generated Python bytecode forbidden: ${bytecode.map(file => relative(rootPath, file)).join(", ")}`);
if (forbiddenLocalState.length) throw new Error(`local Git/Wrangler state forbidden in deploy root: ${forbiddenLocalState.slice(0, 8).map(file => relative(rootPath, file)).join(", ")}`);

for (const file of files.filter(file => file.endsWith(".json"))) {
  const text = await readFile(file, "utf8");
  try { JSON.parse(text); }
  catch (error) { throw new Error(`invalid JSON: ${relative(rootPath, file)}: ${error.message}`); }
}

const worker = await readFile(new URL("worker.js", rootUrl), "utf8");
for (const symbol of ["handleSkipApi", "loadRadioRuntimeConfig", "apiNotFound", "darkDancerResponse", "handleRadioAdminConfigAddon"]) {
  if (!worker.includes(symbol)) throw new Error(`worker integration missing: ${symbol}`);
}

const scriptable = await readFile(new URL("Scriptable/Scripts/666SOUNDsDESIGn_FOLDER_UPLOADER_LIVE_UI.js", rootUrl), "utf8");
for (const marker of ["ROOT_MARKERS", "validateRepoRoot", "shouldIgnore", "ATOMIC FULLVERSION UPLOAD V5", "git/trees", "git/commits"]) {
  if (!scriptable.includes(marker)) throw new Error(`Scriptable root-safety marker missing: ${marker}`);
}

const rendererMirrorPairs = ["src/server.py", "src/index.html", "requirements.txt", "render.yaml", ".env.example"];
for (const item of rendererMirrorPairs) {
  const canonical = await readFile(new URL(`Render/666SOUNDsDESIGn-Alert-Service-Renderer/${item}`, rootUrl));
  const mirror = await readFile(new URL(`renderer-resources/666SOUNDsDESIGn-Alert-Service-Renderer/${item}`, rootUrl));
  if (!canonical.equals(mirror)) throw new Error(`renderer mirror drift: ${item}`);
}

let syntaxChecked = 0;
const syntaxFiles = files.filter(file => /\.(?:js|mjs)$/i.test(file));

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => resolve({ code, stdout, stderr }));
  });
}

let syntaxIndex = 0;
const syntaxWorkers = Array.from({ length: Math.min(8, Math.max(1, syntaxFiles.length)) }, async () => {
  while (true) {
    const current = syntaxIndex++;
    if (current >= syntaxFiles.length) return;
    const file = syntaxFiles[current];
    const result = await runProcess(process.execPath, ["--check", file]);
    if (result.code !== 0) throw new Error(`JavaScript syntax error: ${relative(rootPath, file)}\n${result.stderr || result.stdout}`);
    syntaxChecked++;
  }
});
await Promise.all(syntaxWorkers);

const pythonFiles = files.filter(file => /\.py$/i.test(file));
let pythonSyntaxChecked = 0;
if (pythonFiles.length) {
  const pythonAst = "import ast, pathlib, sys; [ast.parse(pathlib.Path(p).read_text(encoding='utf-8'), filename=p) for p in sys.argv[1:]]";
  const result = await runProcess("python3", ["-c", pythonAst, ...pythonFiles]);
  if (result.code !== 0) throw new Error(`Python syntax error:\n${result.stderr || result.stdout}`);
  pythonSyntaxChecked = pythonFiles.length;
}

const publicPairs = [
  "index.html",
  "site.webmanifest",
  "config/radio-runtime.json",
  "config/stream.config.js",
  "config/ui.config.js",
  "js/admin-auth.js",
  "js/player-stage-v2.js",
  "js/player-admin-overlay.js",
  "js/addons/discord-player-addon-v3.js",
  "js/version-core.js",
  "js/version-state-guard-v1.js",
  "js/phase10-stability-iphone-panel-hud.js",
  "js/player-core.js"
];
for (const item of publicPairs) {
  const source = await readFile(new URL(item, rootUrl));
  const deployed = await readFile(new URL(`public/${item}`, rootUrl));
  if (!source.equals(deployed)) throw new Error(`public deploy mirror drift: ${item}`);
}

const legacyPairs = [
  "worker.js",
  "worker-addons/radio-admin-config-addon.js",
  "worker-addons/discord-notify-addon-v3.js",
  "worker-addons/skip-api-addon.js"
];
for (const item of legacyPairs) {
  const rootFile = await readFile(new URL(item, rootUrl));
  const legacy = await readFile(new URL(`workers/webradio-666soundsdesign-worker/${item}`, rootUrl));
  if (!rootFile.equals(legacy)) throw new Error(`legacy worker mirror drift: ${item}`);
}

const runtimeFiles = [
  "worker.js",
  "worker-addons/radio-admin-config-addon.js",
  "worker-addons/discord-notify-addon-v3.js",
  "js/admin-auth.js",
  "js/player-stage-v2.js",
  "js/player-admin-overlay.js",
  "js/addons/discord-player-addon-v3.js",
  "index.html",
  "Render/666SOUNDsDESIGn-Alert-Service-Renderer/src/server.py",
  "Render/666SOUNDsDESIGn-Alert-Service-Renderer/src/index.html",
  "renderer-resources/666SOUNDsDESIGn-Alert-Service-Renderer/src/server.py",
  "renderer-resources/666SOUNDsDESIGn-Alert-Service-Renderer/src/index.html"
];
const runtimeText = (await Promise.all(runtimeFiles.map(path => readFile(new URL(path, rootUrl), "utf8")))).join("\n");
for (const forbidden of [
  "x-admin-password",
  "FALLBACK_DISCORD_GATE_SHA256",
  "x-discord-gate-code",
  "PW_VERIFY_URL",
  "PW_AUTH_SECRET",
  "MASTER_ADMIN_PASSWORD",
  "666-system-auth.666soundsdesign-broadcaster.com/login"
]) {
  if (runtimeText.includes(forbidden)) throw new Error(`forbidden legacy auth marker in runtime: ${forbidden}`);
}
const authClientDefinitions = runtimeText.match(/window\.S666AdminAuth\s*=/g) || [];
if (authClientDefinitions.length !== 1) throw new Error(`expected exactly one browser auth client, found ${authClientDefinitions.length}`);

const radioConfig = JSON.parse(await readFile(new URL("config/radio-runtime.json", rootUrl), "utf8"));
if (radioConfig.adminAuthLoginUrl !== "/api/admin/login") throw new Error("browser login must be same-origin /api/admin/login");
if (radioConfig.adminAuthVerifyUrl !== "/api/admin/auth-check") throw new Error("browser auth check must be same-origin /api/admin/auth-check");

const wrangler = JSON.parse(await readFile(new URL("wrangler.jsonc", rootUrl), "utf8"));
const vars = wrangler.vars || {};
const requiredAuthVars = ["ADMIN_AUTH_LOGIN_URL", "ADMIN_AUTH_VERIFY_URL", "ADMIN_SERVICE_ORIGIN", "AUTH_AUDIENCE", "AUTH_MODE"];
for (const key of requiredAuthVars) if (!vars[key]) throw new Error(`canonical auth variable missing from wrangler.jsonc: ${key}`);
if (!String(vars.ADMIN_AUTH_LOGIN_URL).includes("666-system-pw")) throw new Error("ADMIN_AUTH_LOGIN_URL must target Password Worker");
if (!String(vars.ADMIN_AUTH_VERIFY_URL).includes("666-system-auth")) throw new Error("ADMIN_AUTH_VERIFY_URL must target Auth Worker");

console.log(JSON.stringify({
  ok: true,
  rootName: basename(rootPath),
  expectedRootName,
  files: files.length,
  nestedZips: 0,
  bytecode: 0,
  localStateFiles: 0,
  required: required.length,
  rendererMirrorPairs: rendererMirrorPairs.length,
  javascriptSyntaxChecked: syntaxChecked,
  pythonSyntaxChecked,
  publicMirrorPairs: publicPairs.length,
  legacyMirrorPairs: legacyPairs.length,
  canonicalAuth: true,
  atomicUploader: true,
  legacyBuildRoot: true
}, null, 2));
process.exit(0);
