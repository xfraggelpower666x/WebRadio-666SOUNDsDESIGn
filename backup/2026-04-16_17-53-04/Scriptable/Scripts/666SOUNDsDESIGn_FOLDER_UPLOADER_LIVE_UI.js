// ==========================================
// DATEI: Scriptable/Scripts/666SOUNDsDESIGn_FOLDER_UPLOADER_LIVE_UI.js
// ERSTELLT: 2026-04-16
// GEÄNDERT: 2026-04-16
// STATUS: AKTIV
// ZWECK: Scriptable-Uploadskript für iPhone/iPad. Lädt einen gewählten Projektordner
//        rekursiv in das GitHub-Repo hoch und hält den Upload über Lock/Heartbeat stabil.
// ÄNDERUNG: In die Repo-Vollversion aufgenommen, damit der mobile Deploy-Weg vollständig
//           dokumentiert und direkt verfügbar ist.
// HINWEIS: Dieses Skript erwartet, dass der ausgewählte Ordner bereits die Repo-Root ist.
// ==========================================

// ==========================================
// 666SOUNDsDESIGn — FOLDER UPLOADER LIVE UI
// UPLOADER V3
// - repeat-safe
// - lock system
// - heartbeat
// - auto reset after 5 min
// ==========================================

const DEFAULT_OWNER = "xfraggelpower666x";
const DEFAULT_REPO = "WebRadio-666SOUNDsDESIGn";
const DEFAULT_BRANCH = "WebRadio-666SOUNDsDESIGn";

const KEY_TOKEN = "gh_token";
const KEY_OWNER = "gh_owner";
const KEY_REPO = "gh_repo";
const KEY_BRANCH = "gh_branch";

const fm = FileManager.local();
const LOCK_FILE = fm.joinPath(fm.documentsDirectory(), "666soundsdesign_upload.lock");
const LOCK_TIMEOUT_SECONDS = 300; // 5 Minuten

// ========= COLORS =========
const GREEN = new Color("#0a8f08");
const RED = new Color("#b30021");
const CYAN = new Color("#006d78");
const GRAY = new Color("#555555");
const BLACK = new Color("#111111");
const ORANGE = new Color("#b36b00");

// ========= SETTINGS =========
function get(k, d) {
  return Keychain.contains(k) ? Keychain.get(k) : d;
}

function set(k, v) {
  Keychain.set(k, String(v ?? ""));
}

// ========= LOCK SYSTEM =========
function nowTs() {
  return Date.now();
}

function readLock() {
  if (!fm.fileExists(LOCK_FILE)) return null;

  try {
    const raw = fm.readString(LOCK_FILE);
    const data = JSON.parse(raw);
    if (!data || typeof data.timestamp !== "number") return null;
    return data;
  } catch (e) {
    return null;
  }
}

function writeLock(extra = {}) {
  const payload = {
    timestamp: nowTs(),
    ...extra
  };
  fm.writeString(LOCK_FILE, JSON.stringify(payload));
}

function removeLock() {
  if (fm.fileExists(LOCK_FILE)) {
    fm.remove(LOCK_FILE);
  }
}

async function ensureUploadLock() {
  const existing = readLock();

  if (existing) {
    const age = (nowTs() - existing.timestamp) / 1000;

    if (age > LOCK_TIMEOUT_SECONDS) {
      // Alter Lock wird automatisch entsorgt, damit du mobil weiterarbeiten kannst.
      removeLock();
    } else {
      const a = new Alert();
      a.title = "UPLOAD BLOCKIERT";
      a.message =
        `Ein Upload läuft bereits oder wurde nicht sauber beendet.

` +
        `Alter Lock: ${Math.floor(age)} Sekunden
` +
        `Timeout: ${LOCK_TIMEOUT_SECONDS} Sekunden`;
      a.addAction("OK");
      await a.present();
      return false;
    }
  }

  writeLock({ state: "running", step: "init" });
  return true;
}

function heartbeat(step = "running") {
  writeLock({ state: "running", step });
}

// ========= UI HELPERS =========
async function showMessage(title, message) {
  const a = new Alert();
  a.title = title;
  a.message = message;
  a.addAction("OK");
  await a.present();
}

function makeRow(title, subtitle, titleColor = BLACK, subtitleColor = GRAY) {
  const row = new UITableRow();
  row.dismissOnSelect = false;
  row.height = 58;

  const txt = row.addText(title, subtitle);
  txt.titleColor = titleColor;
  txt.subtitleColor = subtitleColor;
  txt.titleFont = Font.boldSystemFont(16);
  txt.subtitleFont = Font.systemFont(12);

  return { row, txt };
}

// ========= SETTINGS UI =========
async function openSettings() {
  const a = new Alert();
  a.title = "SETTINGS";
  a.message = "GitHub Repo Uploader";

  a.addSecureTextField("Token", get(KEY_TOKEN, ""));
  a.addTextField("Owner", get(KEY_OWNER, DEFAULT_OWNER));
  a.addTextField("Repo", get(KEY_REPO, DEFAULT_REPO));
  a.addTextField("Branch", get(KEY_BRANCH, DEFAULT_BRANCH));

  a.addAction("Save");
  a.addCancelAction("Cancel");

  const r = await a.present();
  if (r === -1) return false;

  set(KEY_TOKEN, a.textFieldValue(0).trim());
  set(KEY_OWNER, a.textFieldValue(1).trim());
  set(KEY_REPO, a.textFieldValue(2).trim());
  set(KEY_BRANCH, a.textFieldValue(3).trim());

  return true;
}

// ========= GITHUB =========
async function github(path, method, body) {
  const token = get(KEY_TOKEN, "");
  if (!token) throw new Error("Token fehlt → SETTINGS");

  const owner = get(KEY_OWNER, DEFAULT_OWNER);
  const repo = get(KEY_REPO, DEFAULT_REPO);

  const req = new Request(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(path)}`);
  req.method = method;
  req.headers = {
    "Authorization": `token ${token}`,
    "Content-Type": "application/json",
    "Accept": "application/vnd.github+json"
  };

  if (body) req.body = JSON.stringify(body);

  return await req.loadJSON();
}

// ========= FILE SYSTEM =========
function getFiles(dir) {
  let result = [];
  const items = fm.listContents(dir);

  for (const i of items) {
    const full = fm.joinPath(dir, i);

    if (fm.isDirectory(full)) {
      // Rekursiv durchlaufen, damit wirklich die komplette Repo-Struktur hochgeht.
      result = result.concat(getFiles(full));
    } else {
      result.push(full);
    }
  }

  return result;
}

function rel(full, root) {
  return full.replace(root + "/", "");
}

// ========= SMART UPLOAD =========
async function upload(path, data, branch) {
  let sha = null;
  let remoteContent = null;

  heartbeat(`check:${path}`);

  try {
    const res = await github(`${path}?ref=${encodeURIComponent(branch)}`, "GET");
    sha = res.sha || null;

    if (res.content) {
      remoteContent = res.content.replace(/
/g, "");
    }
  } catch (e) {
    // Datei existiert nicht -> CREATE
  }

  const localBase64 = data.toBase64String();

  // Identische Datei nicht unnötig neu hochladen.
  if (remoteContent && remoteContent === localBase64) {
    return { status: "SKIP" };
  }

  const body = {
    message: `UPLOAD ${path}`,
    content: localBase64,
    branch
  };

  if (sha) body.sha = sha;

  heartbeat(`put:${path}`);

  const result = await github(path, "PUT", body);

  if (result.content?.path || result.commit?.sha) {
    return { status: sha ? "UPDATED" : "CREATED" };
  }

  throw new Error(`Upload fehlgeschlagen: ${path}`);
}

// ========= MAIN =========
async function uploadFolderLive() {
  const token = get(KEY_TOKEN, "");
  if (!token) {
    await showMessage("Token fehlt", "Bitte zuerst SETTINGS öffnen und Token speichern.");
    return;
  }

  const lockOk = await ensureUploadLock();
  if (!lockOk) return;

  let table = null;

  try {
    heartbeat("pick-folder");

    const branch = get(KEY_BRANCH, DEFAULT_BRANCH);
    const folder = await DocumentPicker.openFolder();
    if (!folder) {
      removeLock();
      return;
    }

    heartbeat("scan-files");

    const files = getFiles(folder);

    table = new UITable();
    table.showSeparators = true;

    const header1 = makeRow("666SOUNDsDESIGn", "LIVE FOLDER UPLOAD V3", CYAN, GRAY);
    table.addRow(header1.row);

    const header2 = makeRow(`Dateien: ${files.length}`, "Status: bereit", BLACK, GRAY);
    table.addRow(header2.row);

    const rows = [];

    for (let i = 0; i < files.length; i++) {
      const relative = rel(files[i], folder);
      const entry = makeRow(relative, "⏳ waiting", GRAY, GRAY);
      table.addRow(entry.row);
      rows.push({
        file: files[i],
        relative,
        textCell: entry.txt
      });
    }

    table.present(false);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const failList = [];

    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];

      heartbeat(`file:${i + 1}/${files.length}:${item.relative}`);

      header2.txt.subtitle = `Status: ${i + 1}/${files.length}`;
      item.textCell.subtitle = "uploading...";
      item.textCell.titleColor = BLACK;
      item.textCell.subtitleColor = GRAY;
      table.reload();

      try {
        const data = fm.read(item.file);
        const result = await upload(item.relative, data, branch);

        if (result.status === "CREATED") {
          item.textCell.subtitle = "✔ CREATED";
          item.textCell.titleColor = GREEN;
          item.textCell.subtitleColor = GREEN;
          created++;
        } else if (result.status === "UPDATED") {
          item.textCell.subtitle = "✔ UPDATED";
          item.textCell.titleColor = CYAN;
          item.textCell.subtitleColor = CYAN;
          updated++;
        } else if (result.status === "SKIP") {
          item.textCell.subtitle = "⏭ SKIPPED";
          item.textCell.titleColor = ORANGE;
          item.textCell.subtitleColor = ORANGE;
          skipped++;
        }
      } catch (e) {
        item.textCell.subtitle = "✖ FAIL";
        item.textCell.titleColor = RED;
        item.textCell.subtitleColor = RED;
        failed++;
        failList.push(`${item.relative}
${String(e)}`);
        console.error(item.relative, String(e));
      }

      table.reload();
    }

    heartbeat("done");

    header2.txt.subtitle = `Fertig: +${created}  ↻${updated}  »${skipped}  ✖${failed}`;
    table.reload();

    let msg =
      `CREATED: ${created}
` +
      `UPDATED: ${updated}
` +
      `SKIPPED: ${skipped}
` +
      `FAILED: ${failed}`;

    if (failList.length) {
      msg += `

Fehler:
` + failList.join("

").slice(0, 2500);
    }

    await showMessage("UPLOAD DONE", msg);
  } catch (e) {
    console.error(String(e));
    await showMessage("UPLOAD ERROR", String(e));
  } finally {
    removeLock();
  }
}

// ========= MENU =========
async function mainMenu() {
  const menu = new Alert();
  menu.title = "666 CONTROL PANEL";
  menu.message = "Folder Upload mit Live-Status + Lock";

  menu.addAction("UPLOAD FOLDER (LIVE)");
  menu.addAction("SETTINGS");
  menu.addCancelAction("Close");

  const r = await menu.present();

  if (r === 0) {
    await uploadFolderLive();
  } else if (r === 1) {
    const ok = await openSettings();
    if (ok) {
      await showMessage("Settings", "Gespeichert.");
    }
  }
}

await mainMenu();
Script.complete();
