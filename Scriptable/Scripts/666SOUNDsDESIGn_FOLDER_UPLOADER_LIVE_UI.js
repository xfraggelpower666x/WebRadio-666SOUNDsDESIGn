// ==========================================
// DATEI: Scriptable/Scripts/666SOUNDsDESIGn_FOLDER_UPLOADER_LIVE_UI.js
// VERSION: 5.0.0 ATOMIC BRANCH COMMIT
// GEÄNDERT: 2026-06-25
// STATUS: AKTIV
// ZWECK: Vollständige Repo-Mappe auf iPhone/iPad hochladen und den Branch
//        erst nach allen Datei-Uploads mit GENAU EINEM Commit aktualisieren.
// WICHTIG: Die Projektmappe auswählen, in der worker.js, wrangler.jsonc,
//          public/ und index.html direkt liegen.
// ==========================================

const DEFAULT_OWNER = "xfraggelpower666x";
const DEFAULT_REPO = "WebRadio-666SOUNDsDESIGn";
const DEFAULT_BRANCH = "WebRadio-666SOUNDsDESIGn";

const KEY_TOKEN = "gh_token";
const KEY_OWNER = "gh_owner";
const KEY_REPO = "gh_repo";
const KEY_BRANCH = "gh_branch";

const fm = FileManager.local();
const LOCK_FILE = fm.joinPath(fm.documentsDirectory(), "666soundsdesign_atomic_upload.lock");
const LOCK_TIMEOUT_SECONDS = 1800;

const ROOT_MARKERS = [
  "worker.js", "wrangler.jsonc", "index.html", "package.json", "public",
  "config", "worker-addons", "workers", "Scriptable"
];

const CRITICAL_REMOTE_PATHS = [
  "worker.js",
  "wrangler.jsonc",
  "package.json",
  "public/index.html",
  ".assetsignore",
  ".github/workflows/release-integrity.yml",
  "workers/webradio-666soundsdesign-worker/worker.js",
  "workers/webradio-666soundsdesign-worker/wrangler.jsonc"
];

const IGNORED_DIRECTORY_NAMES = new Set([
  ".git", ".wrangler", "node_modules", "__pycache__", "__MACOSX"
]);
const IGNORED_FILE_NAMES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

const GREEN = new Color("#0a8f08");
const RED = new Color("#b30021");
const CYAN = new Color("#006d78");
const GRAY = new Color("#555555");
const BLACK = new Color("#111111");
const ORANGE = new Color("#b36b00");

function get(key, fallback) { return Keychain.contains(key) ? Keychain.get(key) : fallback; }
function set(key, value) { Keychain.set(key, String(value ?? "")); }
function nowTs() { return Date.now(); }

async function showMessage(title, message) {
  const alert = new Alert();
  alert.title = title;
  alert.message = message;
  alert.addAction("OK");
  await alert.present();
}

async function confirmAction(title, message, action = "Weiter") {
  const alert = new Alert();
  alert.title = title;
  alert.message = message;
  alert.addAction(action);
  alert.addCancelAction("Abbrechen");
  return (await alert.present()) === 0;
}

function makeRow(title, subtitle, titleColor = BLACK, subtitleColor = GRAY) {
  const row = new UITableRow();
  row.dismissOnSelect = false;
  row.height = 58;
  const text = row.addText(title, subtitle);
  text.titleColor = titleColor;
  text.subtitleColor = subtitleColor;
  text.titleFont = Font.boldSystemFont(16);
  text.subtitleFont = Font.systemFont(12);
  return { row, text };
}

function readLock() {
  if (!fm.fileExists(LOCK_FILE)) return null;
  try { return JSON.parse(fm.readString(LOCK_FILE)); } catch { return null; }
}
function writeLock(extra = {}) { fm.writeString(LOCK_FILE, JSON.stringify({ timestamp: nowTs(), ...extra })); }
function removeLock() { if (fm.fileExists(LOCK_FILE)) fm.remove(LOCK_FILE); }
function heartbeat(step) { writeLock({ state: "running", step }); }

async function ensureUploadLock() {
  const existing = readLock();
  if (existing && typeof existing.timestamp === "number") {
    const age = (nowTs() - existing.timestamp) / 1000;
    if (age <= LOCK_TIMEOUT_SECONDS) {
      await showMessage("UPLOAD BLOCKIERT", `Ein atomarer Upload läuft bereits.\nAlter: ${Math.floor(age)} Sekunden`);
      return false;
    }
    removeLock();
  }
  writeLock({ state: "running", step: "init" });
  return true;
}

async function openSettings() {
  const alert = new Alert();
  alert.title = "SETTINGS";
  alert.message = "GitHub Atomic Repo Uploader";
  alert.addSecureTextField("Token", get(KEY_TOKEN, ""));
  alert.addTextField("Owner", get(KEY_OWNER, DEFAULT_OWNER));
  alert.addTextField("Repo", get(KEY_REPO, DEFAULT_REPO));
  alert.addTextField("Branch", get(KEY_BRANCH, DEFAULT_BRANCH));
  alert.addAction("Save");
  alert.addCancelAction("Cancel");
  const result = await alert.present();
  if (result === -1) return false;
  set(KEY_TOKEN, alert.textFieldValue(0).trim());
  set(KEY_OWNER, alert.textFieldValue(1).trim());
  set(KEY_REPO, alert.textFieldValue(2).trim());
  set(KEY_BRANCH, alert.textFieldValue(3).trim());
  return true;
}

function encodeRepoPath(path) {
  return String(path).split("/").filter(Boolean).map(encodeURIComponent).join("/");
}
function encodeRefPath(ref) {
  return String(ref).split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

async function githubApi(endpoint, method = "GET", body = null) {
  const token = get(KEY_TOKEN, "");
  if (!token) throw new Error("Token fehlt → SETTINGS");
  const owner = get(KEY_OWNER, DEFAULT_OWNER);
  const repo = get(KEY_REPO, DEFAULT_REPO);
  const cleanEndpoint = String(endpoint || "").replace(/^\/+/, "");
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${cleanEndpoint ? "/" + cleanEndpoint : ""}`;
  const request = new Request(url);
  request.method = method;
  request.headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (body !== null) request.body = JSON.stringify(body);
  let raw = "";
  try { raw = await request.loadString(); }
  catch (error) { throw new Error(`GitHub-Netzwerkfehler: ${String(error)}`); }
  const statusCode = request.response?.statusCode ?? 0;
  let parsed = {};
  if (raw) {
    try { parsed = JSON.parse(raw); }
    catch { parsed = { message: raw.slice(0, 500) }; }
  }
  if (statusCode < 200 || statusCode >= 300) {
    const error = new Error(`GitHub ${statusCode}: ${parsed.message || "Request fehlgeschlagen"}`);
    error.statusCode = statusCode;
    throw error;
  }
  return parsed;
}

function shouldIgnore(relativePath, isDirectory) {
  const normalized = relativePath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const name = parts[parts.length - 1] || "";
  if (parts.some(part => IGNORED_DIRECTORY_NAMES.has(part))) return true;
  if (isDirectory) return IGNORED_DIRECTORY_NAMES.has(name);
  if (IGNORED_FILE_NAMES.has(name)) return true;
  if (/\.pyc$/i.test(name)) return true;
  if (/\.zip$/i.test(name)) return true;
  return false;
}

function relativePath(fullPath, rootPath) {
  const prefix = rootPath.endsWith("/") ? rootPath : `${rootPath}/`;
  return fullPath.startsWith(prefix) ? fullPath.slice(prefix.length) : fullPath;
}

function getFiles(rootPath, currentPath = rootPath) {
  let result = [];
  const items = fm.listContents(currentPath).sort((a, b) => a.localeCompare(b));
  for (const item of items) {
    const fullPath = fm.joinPath(currentPath, item);
    const relative = relativePath(fullPath, rootPath);
    const isDirectory = fm.isDirectory(fullPath);
    if (shouldIgnore(relative, isDirectory)) continue;
    if (isDirectory) result = result.concat(getFiles(rootPath, fullPath));
    else result.push(fullPath);
  }
  return result;
}

function validateRepoRoot(folder) {
  const missing = ROOT_MARKERS.filter(marker => !fm.fileExists(fm.joinPath(folder, marker)));
  return { ok: missing.length === 0, missing };
}

async function getBranchState(branch) {
  const repo = await githubApi("");
  const ref = await githubApi(`git/ref/heads/${encodeRefPath(branch)}`);
  const headSha = ref.object?.sha;
  if (!headSha) throw new Error(`Branch-HEAD nicht lesbar: ${branch}`);
  const commit = await githubApi(`git/commits/${encodeURIComponent(headSha)}`);
  const treeSha = commit.tree?.sha;
  if (!treeSha) throw new Error("Basis-Tree nicht lesbar");
  return { repo, headSha, treeSha };
}

async function createBlob(data) {
  return githubApi("git/blobs", "POST", { content: data.toBase64String(), encoding: "base64" });
}

async function verifyCriticalPaths(branch) {
  const missing = [];
  for (const path of CRITICAL_REMOTE_PATHS) {
    try {
      await githubApi(`contents/${encodeRepoPath(path)}?ref=${encodeURIComponent(branch)}`);
    } catch (error) {
      missing.push(`${path}: ${String(error)}`);
    }
  }
  return missing;
}

async function uploadFolderAtomic(exactMirror = false) {
  if (!get(KEY_TOKEN, "")) {
    await showMessage("Token fehlt", "Bitte zuerst SETTINGS öffnen und Token speichern.");
    return;
  }
  if (!await ensureUploadLock()) return;

  try {
    const branch = get(KEY_BRANCH, DEFAULT_BRANCH);
    heartbeat("pick-folder");
    const folder = await DocumentPicker.openFolder();
    if (!folder) return;

    const rootCheck = validateRepoRoot(folder);
    if (!rootCheck.ok) {
      await showMessage("FALSCHE ORDNER-EBENE", `Fehlende Repo-Root-Marker:\n${rootCheck.missing.join("\n")}`);
      return;
    }

    heartbeat("scan-files");
    const files = getFiles(folder).sort((a, b) => relativePath(a, folder).localeCompare(relativePath(b, folder)));
    if (!files.length) throw new Error("Keine uploadbaren Dateien gefunden");

    const state = await getBranchState(branch);
    const modeText = exactMirror ? "EXACT MIRROR: Remote-Extras werden entfernt" : "PRESERVE: Remote-Extras bleiben erhalten";
    const proceed = await confirmAction(
      "ATOMIC FULLVERSION",
      `Repo: ${state.repo.full_name}\nBranch: ${branch}\nDefault branch: ${state.repo.default_branch}\nDateien: ${files.length}\nModus: ${modeText}\n\nDer Branch wird erst nach allen Blob-Uploads genau einmal aktualisiert.`,
      "Upload starten"
    );
    if (!proceed) return;

    const table = new UITable();
    table.showSeparators = true;
    const h1 = makeRow("666SOUNDsDESIGn", "ATOMIC FULLVERSION UPLOAD V5", CYAN, GRAY);
    const h2 = makeRow(`0 / ${files.length}`, "Blob-Upload läuft – Branch bleibt unverändert", BLACK, GRAY);
    const h3 = makeRow(branch, modeText, ORANGE, GRAY);
    const h4 = makeRow("Vorbereitung", "Noch kein Branch-Deploy ausgelöst", BLACK, GRAY);
    table.addRow(h1.row); table.addRow(h2.row); table.addRow(h3.row); table.addRow(h4.row);
    table.present(false);

    const tree = [];
    for (let i = 0; i < files.length; i++) {
      const fullPath = files[i];
      const relative = relativePath(fullPath, folder).replace(/\\/g, "/");
      heartbeat(`blob:${i + 1}/${files.length}:${relative}`);
      h2.text.title = `${i + 1} / ${files.length}`;
      h2.text.subtitle = relative;
      h4.text.subtitle = "Blobs werden vorbereitet; produktiver Branch noch unverändert";
      table.reload();

      const blob = await createBlob(fm.read(fullPath));
      if (!blob.sha) throw new Error(`Blob-SHA fehlt: ${relative}`);
      tree.push({ path: relative, mode: "100644", type: "blob", sha: blob.sha });
    }

    heartbeat("create-tree");
    h4.text.title = "Tree";
    h4.text.subtitle = "Vollständigen Repo-Tree erzeugen";
    table.reload();
    const treeBody = { tree };
    if (!exactMirror) treeBody.base_tree = state.treeSha;
    const newTree = await githubApi("git/trees", "POST", treeBody);
    if (!newTree.sha) throw new Error("Neuer Tree-SHA fehlt");

    heartbeat("create-commit");
    h4.text.title = "Commit";
    h4.text.subtitle = "Atomaren Vollversions-Commit erzeugen";
    table.reload();
    const newCommit = await githubApi("git/commits", "POST", {
      message: `FULLVERSION ATOMIC BRANCH RECOVERY v1.0.2 (${files.length} files)`,
      tree: newTree.sha,
      parents: [state.headSha]
    });
    if (!newCommit.sha) throw new Error("Neuer Commit-SHA fehlt");

    heartbeat("update-ref");
    h4.text.title = "Branch-Aktivierung";
    h4.text.subtitle = "Genau ein Branch-Update – jetzt startet Cloudflare einmal vollständig";
    table.reload();
    await githubApi(`git/refs/heads/${encodeRefPath(branch)}`, "PATCH", { sha: newCommit.sha, force: false });

    heartbeat("verify");
    h4.text.title = "Remote-Verifikation";
    h4.text.subtitle = "Kritische Root-, Hidden- und Legacy-Dateien prüfen";
    table.reload();
    const missing = await verifyCriticalPaths(branch);
    if (missing.length) throw new Error(`Remote-Verifikation fehlgeschlagen:\n${missing.join("\n")}`);

    h2.text.title = `${files.length} / ${files.length}`;
    h2.text.subtitle = "Alle Dateien atomar committed";
    h2.text.titleColor = GREEN;
    h3.text.titleColor = GREEN;
    h4.text.title = "PASS";
    h4.text.subtitle = `Commit ${newCommit.sha.slice(0, 12)} · kritische Dateien bestätigt`;
    h4.text.titleColor = GREEN;
    h4.text.subtitleColor = GREEN;
    table.reload();

    await showMessage(
      "ATOMIC UPLOAD PASS",
      `Branch: ${branch}\nDateien: ${files.length}\nCommit: ${newCommit.sha}\n\nDer Branch wurde nur einmal und erst nach vollständigem Upload aktualisiert.\n\nCloudflare muss diesen Branch als Production branch und den korrekten Root-Pfad verwenden.`
    );
  } catch (error) {
    console.error(String(error));
    await showMessage("ATOMIC UPLOAD ERROR", String(error));
  } finally {
    removeLock();
  }
}

async function mainMenu() {
  const menu = new Alert();
  menu.title = "666 CONTROL PANEL";
  menu.message = "Atomarer Repo-Upload: keine halbfertigen Branch-Deploys";
  menu.addAction("ATOMIC FULLVERSION – EXTRAS ERHALTEN");
  menu.addDestructiveAction("ATOMIC EXACT MIRROR – EXTRAS LÖSCHEN");
  menu.addAction("SETTINGS");
  menu.addCancelAction("Close");
  const result = await menu.present();
  if (result === 0) await uploadFolderAtomic(false);
  else if (result === 1) await uploadFolderAtomic(true);
  else if (result === 2 && await openSettings()) await showMessage("Settings", "Gespeichert.");
}

await mainMenu();
Script.complete();
