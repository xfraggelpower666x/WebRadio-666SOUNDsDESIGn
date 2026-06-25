import { readdir, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const rootUrl = new URL("../", import.meta.url);
const rootPath = fileURLToPath(rootUrl);
const expectedRootName = "WebRadio-666SOUNDsDESIGn_FULLVERSION_BRANCH_RECOVERY_v1_0_2";

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
  "worker-addons/chaos-engine-api-addon.js",
  "Scriptable/Scripts/666SOUNDsDESIGn_FOLDER_UPLOADER_LIVE_UI.js",
  "public/index.html",
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
if (nestedZips.length) throw new Error(`nested ZIP files forbidden: ${nestedZips.map(file => relative(rootPath, file)).join(", ")}`);
if (bytecode.length) throw new Error(`generated Python bytecode forbidden: ${bytecode.map(file => relative(rootPath, file)).join(", ")}`);

for (const file of files.filter(file => file.endsWith(".json"))) {
  const text = await readFile(file, "utf8");
  try {
    JSON.parse(text);
  } catch (error) {
    throw new Error(`invalid JSON: ${relative(rootPath, file)}: ${error.message}`);
  }
}

const worker = await readFile(new URL("worker.js", rootUrl), "utf8");
for (const symbol of ["handleSkipApi", "handleChaosEngineApiAddon", "loadRadioRuntimeConfig", "apiNotFound"]) {
  if (!worker.includes(symbol)) throw new Error(`worker integration missing: ${symbol}`);
}

const scriptable = await readFile(new URL("Scriptable/Scripts/666SOUNDsDESIGn_FOLDER_UPLOADER_LIVE_UI.js", rootUrl), "utf8");
for (const marker of ["ROOT_MARKERS", "validateRepoRoot", "shouldIgnore", "ATOMIC FULLVERSION UPLOAD V5", "git/trees", "git/commits"]) {
  if (!scriptable.includes(marker)) throw new Error(`Scriptable root-safety marker missing: ${marker}`);
}

const mirrorPairs = [
  "src/server.py",
  "requirements.txt",
  "render.yaml",
  ".env.example"
];
for (const item of mirrorPairs) {
  const canonical = await readFile(new URL(`Render/666SOUNDsDESIGn-Alert-Service-Renderer/${item}`, rootUrl));
  const mirror = await readFile(new URL(`renderer-resources/666SOUNDsDESIGn-Alert-Service-Renderer/${item}`, rootUrl));
  if (!canonical.equals(mirror)) throw new Error(`renderer mirror drift: ${item}`);
}

let syntaxChecked = 0;
for (const file of files.filter(file => /\.(?:js|mjs)$/i.test(file))) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`JavaScript syntax error: ${relative(rootPath, file)}\n${result.stderr || result.stdout}`);
  }
  syntaxChecked++;
}

const publicPairs = [
  "index.html",
  "site.webmanifest",
  "chaos-matrix-control.html",
  "config/radio-runtime.json",
  "config/stream.config.js",
  "config/ui.config.js"
];
for (const item of publicPairs) {
  const source = await readFile(new URL(item, rootUrl));
  const deployed = await readFile(new URL(`public/${item}`, rootUrl));
  if (!source.equals(deployed)) throw new Error(`public deploy mirror drift: ${item}`);
}
const legacyWorker = await readFile(new URL("workers/webradio-666soundsdesign-worker/worker.js", rootUrl));
if (!legacyWorker.equals(await readFile(new URL("worker.js", rootUrl)))) {
  throw new Error("legacy worker mirror drift");
}

console.log(JSON.stringify({
  ok: true,
  rootName: basename(rootPath),
  expectedRootName,
  files: files.length,
  nestedZips: 0,
  bytecode: 0,
  required: required.length,
  rendererMirrorPairs: mirrorPairs.length,
  javascriptSyntaxChecked: syntaxChecked,
  publicMirrorPairs: publicPairs.length,
  atomicUploader: true,
  legacyBuildRoot: true
}, null, 2));
