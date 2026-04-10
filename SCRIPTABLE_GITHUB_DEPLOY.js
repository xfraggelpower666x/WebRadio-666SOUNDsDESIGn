// 666SOUNDsDESIGn — Scriptable GitHub Deploy Tool
// Version: v1.0 practical
// Zweck:
// - eine oder mehrere Dateien vom iPhone auswählen
// - direkt per GitHub Contents API in dein Repo hochladen / ersetzen
// - gut für Worker JS, HTML, CSS, JSON, Assets
//
// WICHTIG:
// - echtes ZIP-Entpacken ist in reinem Scriptable allein unzuverlässig.
// - für ZIP-Deploy: ZIP erst in Dateien entpacken, dann dieses Script starten.
// - Token am besten im Scriptable-Keychain speichern.

const SETTINGS = {
  owner: "xfraggelpower666x",
  repo: "WebRadio-666SOUNDsDESIGn",
  branch: "main",
  repoBasePath: "",
  tokenKeychainName: "GITHUB_TOKEN_666SOUNDSDESIGN",
  apiBase: "https://api.github.com"
};

async function getToken() {
  if (Keychain.contains(SETTINGS.tokenKeychainName)) {
    return Keychain.get(SETTINGS.tokenKeychainName);
  }
  const alert = new Alert();
  alert.title = "GitHub Token fehlt";
  alert.message = `Lege deinen GitHub Token im Keychain unter ${SETTINGS.tokenKeychainName} ab.`;
  alert.addTextField("GitHub Token");
  alert.addAction("Speichern");
  alert.addCancelAction("Abbrechen");
  const result = await alert.present();
  if (result === -1) throw new Error("Abgebrochen");
  const token = alert.textFieldValue(0).trim();
  if (!token) throw new Error("Leerer Token");
  Keychain.set(SETTINGS.tokenKeychainName, token);
  return token;
}

function joinRepoPath(base, rel) {
  return [base, rel].filter(Boolean).join("/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

function guessMime(name) {
  const n = name.toLowerCase();
  if (n.endsWith('.js')) return 'application/javascript';
  if (n.endsWith('.json')) return 'application/json';
  if (n.endsWith('.html')) return 'text/html';
  if (n.endsWith('.css')) return 'text/css';
  if (n.endsWith('.md')) return 'text/markdown';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.mp3')) return 'audio/mpeg';
  return 'application/octet-stream';
}

async function githubRequest(url, method, token, bodyObj) {
  const req = new Request(url);
  req.method = method;
  req.headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Scriptable-666SOUNDsDESIGn-Deploy"
  };
  if (bodyObj) {
    req.headers["Content-Type"] = "application/json";
    req.body = JSON.stringify(bodyObj);
  }
  return await req.loadJSON();
}

async function getShaIfExists(repoPath, token) {
  const url = `${SETTINGS.apiBase}/repos/${SETTINGS.owner}/${SETTINGS.repo}/contents/${encodeURI(repoPath)}?ref=${encodeURIComponent(SETTINGS.branch)}`;
  const req = new Request(url);
  req.method = "GET";
  req.headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Scriptable-666SOUNDsDESIGn-Deploy"
  };
  try {
    return await req.loadJSON();
  } catch (e) {
    return null;
  }
}

async function uploadFile(localPath, repoRelativePath, token) {
  const fm = FileManager.iCloud();
  if (fm.isFileStoredIniCloud(localPath)) {
    await fm.downloadFileFromiCloud(localPath);
  }
  const data = fm.read(localPath);
  const b64 = Data.fromData(data).toBase64String();
  const repoPath = joinRepoPath(SETTINGS.repoBasePath, repoRelativePath);
  const existing = await getShaIfExists(repoPath, token);
  const body = {
    message: `Scriptable deploy: ${repoPath}`,
    content: b64,
    branch: SETTINGS.branch
  };
  if (existing && existing.sha) body.sha = existing.sha;
  const url = `${SETTINGS.apiBase}/repos/${SETTINGS.owner}/${SETTINGS.repo}/contents/${encodeURI(repoPath)}`;
  return await githubRequest(url, "PUT", token, body);
}

async function chooseFiles() {
  return await DocumentPicker.openFile();
}

async function askRepoPath(defaultName) {
  const a = new Alert();
  a.title = "Repo-Zielpfad";
  a.message = "Pfad relativ zum Repo. Beispiel: workers/radio-worker.js";
  a.addTextField("Pfad", defaultName || "");
  a.addAction("OK");
  a.addCancelAction("Abbrechen");
  const r = await a.present();
  if (r === -1) throw new Error("Abgebrochen");
  return a.textFieldValue(0).trim();
}

async function deploySingle() {
  const token = await getToken();
  const file = await chooseFiles();
  const fm = FileManager.iCloud();
  const name = fm.fileName(file, true);
  const repoPath = await askRepoPath(name);
  const res = await uploadFile(file, repoPath, token);
  return [`OK: ${repoPath}`, JSON.stringify(res, null, 2)];
}

async function deployManyFlat() {
  const token = await getToken();
  const files = await DocumentPicker.open(['public.item']);
  const fm = FileManager.iCloud();
  const logs = [];
  for (const file of files) {
    const name = fm.fileName(file, true);
    const repoPath = await askRepoPath(name);
    const res = await uploadFile(file, repoPath, token);
    logs.push(`OK: ${repoPath}`);
    logs.push(JSON.stringify(res, null, 2));
  }
  return logs;
}

async function backupZipOnly() {
  const token = await getToken();
  const file = await chooseFiles();
  const fm = FileManager.iCloud();
  const name = fm.fileName(file, true);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const repoPath = `_uploads/${stamp}-${name}`;
  const res = await uploadFile(file, repoPath, token);
  return [`ZIP Backup gespeichert: ${repoPath}`, JSON.stringify(res, null, 2)];
}

async function main() {
  const menu = new Alert();
  menu.title = '666 GitHub Deploy';
  menu.message = `${SETTINGS.owner}/${SETTINGS.repo} @ ${SETTINGS.branch}`;
  menu.addAction('Eine Datei deployen');
  menu.addAction('Mehrere Dateien deployen');
  menu.addAction('ZIP nur als Backup hochladen');
  menu.addCancelAction('Abbrechen');
  const choice = await menu.present();
  if (choice === -1) return;
  let out = [];
  if (choice === 0) out = await deploySingle();
  if (choice === 1) out = await deployManyFlat();
  if (choice === 2) out = await backupZipOnly();
  const result = new QuickLook();
  await QuickLook.present(out.join('\n\n'));
}

await main();
Script.complete();
