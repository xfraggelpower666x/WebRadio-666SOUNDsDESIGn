const { contextBridge, ipcRenderer, webUtils } = require('electron');

let localDropListener = null;
let detachedMicrophoneListener = null;
let microphoneGestureTime = 0;
window.addEventListener('click', event => {
  if (event.isTrusted && event.target?.closest?.('#audio-input-start')) microphoneGestureTime = Date.now();
}, true);
ipcRenderer.on('audio:overlay-microphone',()=>{
  if(!detachedMicrophoneListener)return;
  microphoneGestureTime=Date.now();
  try { detachedMicrophoneListener(); } finally { microphoneGestureTime=0; }
});
window.addEventListener('drop', event => {
  if (!event.isTrusted || !event.target?.closest?.('#local-drop-zone')) return;
  const paths = Array.from(event.dataTransfer?.files || [], file => {
    try { return webUtils.getPathForFile(file); } catch { return ''; }
  }).filter(Boolean).slice(0, 500);
  if (paths.length) ipcRenderer.invoke('local:queue-add-paths', paths)
    .then(state => localDropListener?.(state, null))
    .catch(error => localDropListener?.(null, String(error?.message || error)));
}, true);

contextBridge.exposeInMainWorld('api', {
  vjChooseVideos: () => ipcRenderer.invoke('vj:choose-videos'),
  vjClearVideos: () => ipcRenderer.invoke('vj:clear-videos'),
  vjSyncState: (state) => ipcRenderer.invoke('vj:sync', state),
  vjFollowerState: () => ipcRenderer.invoke('vj:state'),
  onVjFollowerState: (fn) => ipcRenderer.on('vj:state', (_e, state) => fn(state)),
  openAudio: () => ipcRenderer.invoke('dialog:openAudio'),
  audioPermissionBegin: (kind) => {
    if (kind === 'microphone') {
      if (!microphoneGestureTime || Date.now() - microphoneGestureTime > 1500) return Promise.reject(new Error('Enable the microphone in the main window.'));
      microphoneGestureTime = 0;
    }
    return ipcRenderer.invoke('audio:permission-begin', kind);
  },
  audioPermissionEnd: (kind) => ipcRenderer.invoke('audio:permission-end', kind),
  onDetachedMicrophoneRequest: (fn) => { detachedMicrophoneListener = fn; },
  localQueueState: () => ipcRenderer.invoke('local:queue-state'),
  onLocalFilesDropped: (fn) => { localDropListener = fn; },
  localQueueActivate: (index) => ipcRenderer.invoke('local:queue-activate', index),
  localQueueRemove: (index) => ipcRenderer.invoke('local:queue-remove', index),
  localQueueClear: () => ipcRenderer.invoke('local:queue-clear'),
  localQueueShuffle: () => ipcRenderer.invoke('local:queue-shuffle'),
  localLibraryState: () => ipcRenderer.invoke('local:library-state'),
  localLibrarySetRating: (id, rating) => ipcRenderer.invoke('local:library-set-rating', id, rating),
  localLibraryRefresh: () => ipcRenderer.invoke('local:library-refresh'),
  localLibraryClearFolder: () => ipcRenderer.invoke('local:library-clear-folder'),
  localLibraryChooseFolder: () => ipcRenderer.invoke('local:library-choose-folder'),
  onLocalLibraryChanged: (fn) => ipcRenderer.on('local:library-changed', (_e, state) => fn(state)),
  localPlaylistCreate: (name) => ipcRenderer.invoke('local:playlist-create', name),
  localPlaylistRename: (id, name) => ipcRenderer.invoke('local:playlist-rename', id, name),
  localPlaylistDelete: (id) => ipcRenderer.invoke('local:playlist-delete', id),
  localPlaylistAddPool: (id, tracks) => ipcRenderer.invoke('local:playlist-add-pool', id, tracks),
  localPlaylistAddFiles: (id) => ipcRenderer.invoke('local:playlist-add-files', id),
  localPlaylistRemoveTrack: (id, track) => ipcRenderer.invoke('local:playlist-remove-track', id, track),
  localPlaylistAddQueue: (id) => ipcRenderer.invoke('local:playlist-add-queue', id),
  openBackground: () => ipcRenderer.invoke('dialog:openBackground'),
  openCyberStudio: (language) => ipcRenderer.invoke('milkdrop:open-cyber-studio', language),
  openMilkdrop: () => ipcRenderer.invoke('dialog:openMilkdrop'),
  openMilkdropPack: () => ipcRenderer.invoke('dialog:openMilkdropPack'),
  importMilkdropPersonalLibrary: () => ipcRenderer.invoke('dialog:importMilkdropPersonalLibrary'),
  personalMilkdropLibrary: () => ipcRenderer.invoke('milkdrop:personal-library'),
  personalMilkdropLibraryLicense: () => ipcRenderer.invoke('milkdrop:personal-library-license'),
  openDetachedOverlay: (payload) => ipcRenderer.invoke('workspace:overlay-open', payload),
  detachedOverlayState: () => ipcRenderer.invoke('workspace:overlay-state'),
  focusDetachedOverlay: (key) => ipcRenderer.invoke('workspace:overlay-focus', key),
  closeDetachedOverlay: (key) => ipcRenderer.invoke('workspace:overlay-close', key),
  appVersion: () => ipcRenderer.invoke('app:version'),
  openVjData: (kind) => ipcRenderer.invoke('dialog:openVjData', kind),
  openApprovedWebsite: (key) => ipcRenderer.invoke('app:open-site', key),
  openDetachedVisualizer: () => ipcRenderer.invoke('display:open-detached-visualizer'),
  focusDetachedVisualizer: () => ipcRenderer.invoke('display:focus-detached-visualizer'),
  onDetachedVisualizerClosed: (fn) => ipcRenderer.on('visualizer:detached-closed', () => fn()),
  syncDetachedOverlay: (key, payload) => ipcRenderer.invoke('workspace:overlay-sync', key, payload),
  onDetachedOverlayAction: (fn) => ipcRenderer.on('workspace:overlay-action', (_e, payload) => fn(payload)),
  onDetachedOverlayClosed: (fn) => ipcRenderer.on('workspace:overlay-closed', (_e, payload) => fn(payload)),
  onWindowMetrics: (fn) => ipcRenderer.on('window:metrics', (_e, payload) => fn(payload)),
  getSavePath: (formats) => ipcRenderer.invoke('dialog:getSavePath', formats),
  startFileWrite: (savePath) => ipcRenderer.invoke('file:startWrite', savePath),
  writeFileChunk: (chunkArrayBuffer) => {
    // Convert ArrayBuffer to Uint8Array so it transfers cleanly over IPC
    const uint8Array = new Uint8Array(chunkArrayBuffer);
    return ipcRenderer.invoke('file:writeChunk', uint8Array);
  },
  closeFile: () => ipcRenderer.invoke('file:close'),
  displays: () => ipcRenderer.invoke('display:list'),
  openOutputs: (ids) => ipcRenderer.invoke('display:open-output', ids),
  outputStatus: () => ipcRenderer.invoke('display:status'),
  outputHeartbeat: (payload) => ipcRenderer.invoke('display:heartbeat', payload),
  sendVisualFrame: (payload) => ipcRenderer.invoke('visual:frame', payload),
  onVisualFrame: (fn) => ipcRenderer.on('visual:frame', (_e, frame) => fn(frame)),
  runtimeDiagnostics: () => ipcRenderer.invoke('runtime:diagnostics'),
  remoteHealth: () => ipcRenderer.invoke('runtime:remote-health'),
  exportRuntimeDiagnostics: () => ipcRenderer.invoke('runtime:export-diagnostics'),
  syncSource: (state) => ipcRenderer.invoke('source:sync', state),
  onSourceState: (fn) => ipcRenderer.on('source:state', (_e, state) => fn(state)),
  onDisplaysChanged: (fn) => ipcRenderer.on('display:changed', (_e, list) => fn(list)),
  onRuntimeLifecycle: (fn) => ipcRenderer.on('runtime:lifecycle', (_e, state) => fn(state)),
  setFullscreen: (enabled) => ipcRenderer.invoke('window:fullscreen', enabled),
  soundCloudStatus: () => ipcRenderer.invoke('soundcloud:status'),
  soundCloudSaveCredentials: (credentials) => ipcRenderer.invoke('soundcloud:credentials-save', credentials),
  soundCloudClearCredentials: () => ipcRenderer.invoke('soundcloud:credentials-clear'),
  soundCloudTestCredentials: () => ipcRenderer.invoke('soundcloud:credentials-test'),
  soundCloudLibrary: () => ipcRenderer.invoke('soundcloud:library'),
  soundCloudResolve: (url) => ipcRenderer.invoke('soundcloud:resolve', url),
  soundCloudNext: () => ipcRenderer.invoke('soundcloud:next'),
  soundCloudPrevious: () => ipcRenderer.invoke('soundcloud:previous'),
  soundCloudQueueState: () => ipcRenderer.invoke('soundcloud:queue-state'),
  soundCloudOpenCurrent: () => ipcRenderer.invoke('soundcloud:open-current'),
  radioConfig: () => ipcRenderer.invoke('radio:config'),
  radioNowPlaying: () => ipcRenderer.invoke('radio:nowplaying'),
  adminLogin: (password) => ipcRenderer.invoke('auth:login', password),
  adminCheck: () => ipcRenderer.invoke('auth:check'),
  adminLogout: () => ipcRenderer.invoke('auth:logout'),
  adminConfigCurrent: () => ipcRenderer.invoke('radio:admin-config-current'),
  adminConfigBackups: () => ipcRenderer.invoke('radio:admin-config-backups'),
  adminConfigActive: () => ipcRenderer.invoke('radio:admin-config-active'),
  adminConfigUpdate: (payload) => ipcRenderer.invoke('radio:admin-config-update', payload),
  adminConfigRollback: () => ipcRenderer.invoke('radio:admin-config-rollback'),
  adminProbe: (name) => ipcRenderer.invoke('radio:admin-probe', name),
  adminTestMessage: (kind) => ipcRenderer.invoke('radio:admin-test-message', kind),
  radioSkip: () => ipcRenderer.invoke('radio:skip'),
  discordMessage: (message) => ipcRenderer.invoke('radio:discord-message', message),
  discordManual: (payload) => ipcRenderer.invoke('radio:discord-manual', payload),
  discordNowPlaying: (payload) => ipcRenderer.invoke('radio:discord-nowplaying', payload),
  playerAlertSend: (payload) => ipcRenderer.invoke('player-alert:send', payload),
  playerAlertCurrent: () => ipcRenderer.invoke('player-alert:current'),
  playerAlertHistory: () => ipcRenderer.invoke('player-alert:history'),
  playerAlertStatus: () => ipcRenderer.invoke('player-alert:status')
});
