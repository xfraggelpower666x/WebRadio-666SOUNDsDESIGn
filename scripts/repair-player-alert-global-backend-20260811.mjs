import fs from 'node:fs';

const workerPaths = [
  'worker.js',
  'workers/webradio-666soundsdesign-worker/worker.js'
];
const messengerPaths = [
  'js/messenger-overlay.js',
  'public/js/messenger-overlay.js'
];
const velunaPaths = [
  'VELUNA/index.html',
  'veluna/index.html',
  'public/VELUNA/index.html',
  'public/veluna/index.html'
];

function patchFile(path, mutate) {
  const before = fs.readFileSync(path, 'utf8');
  const after = mutate(before, path);
  if (after === before) {
    console.log(`UNCHANGED ${path}`);
    return;
  }
  fs.writeFileSync(path, after, 'utf8');
  console.log(`PATCHED ${path}`);
}

for (const path of workerPaths) {
  patchFile(path, (text) => {
    if (text.includes("source:playerAlertCleanText(payload.source||'web-player'),rateKey};")) return text;
    const needle = "source:playerAlertCleanText(payload.source||'web-player')};\n    const backend = await playerAlertBackendFetch(env, '/send'";
    if (!text.includes(needle)) throw new Error(`worker send contract not found in ${path}`);
    return text.replace(
      needle,
      "source:playerAlertCleanText(payload.source||'web-player'),rateKey};\n    const backend = await playerAlertBackendFetch(env, '/send'"
    );
  });
}

for (const path of messengerPaths) {
  patchFile(path, (text) => {
    if (text.includes("document.querySelector('.tool-strip')")) return text;
    const before = `  function desiredTarget() {\n    if (window.innerWidth <= 760) {\n      return document.getElementById('s666StageMobileActions') || document.getElementById('s666MobileExtraRow') || document.querySelector('#mffApp .mff-discord-slot');\n    }\n    return document.querySelector('.player-shell .bottom-console .control-toolbar') || document.getElementById('s666MessageActionSlot');\n  }`;
    const after = `  function desiredTarget() {\n    if (window.innerWidth <= 760) {\n      return document.getElementById('s666StageMobileActions') || document.getElementById('s666MobileExtraRow') || document.querySelector('#mffApp .mff-discord-slot') || document.querySelector('.tool-strip');\n    }\n    return document.querySelector('.player-shell .bottom-console .control-toolbar') || document.getElementById('s666MessageActionSlot') || document.querySelector('.tool-strip');\n  }`;
    if (!text.includes(before)) throw new Error(`messenger target contract not found in ${path}`);
    return text.replace(before, after);
  });
}

const clientTag = '  <script src="/js/player-alert-client.js?v=2026-08-11-global-player-alert-v1"></script>';
const messengerTag = '  <script src="/js/messenger-overlay.js?v=2026-08-11-global-player-alert-v1"></script>';
const configTag = '  <script src="/config/veluna-assets.js?v=2026-07-23-reactive-visual-v183"></script>';
for (const path of velunaPaths) {
  patchFile(path, (text) => {
    if (text.includes(clientTag) && text.includes(messengerTag)) return text;
    if (!text.includes(configTag)) throw new Error(`VELUNA shared config tag not found in ${path}`);
    return text.replace(configTag, `${clientTag}\n${messengerTag}\n${configTag}`);
  });
}

const roots = fs.readFileSync(workerPaths[0], 'utf8');
const mirror = fs.readFileSync(workerPaths[1], 'utf8');
if (roots !== mirror) throw new Error('worker mirrors diverged after patch');
const messengerRoot = fs.readFileSync(messengerPaths[0], 'utf8');
const messengerMirror = fs.readFileSync(messengerPaths[1], 'utf8');
if (messengerRoot !== messengerMirror) throw new Error('messenger mirrors diverged after patch');

console.log('Player Alert global backend repair applied safely.');
