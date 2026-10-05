const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openAudio: () => ipcRenderer.invoke('dialog:openAudio'),
  openBackground: () => ipcRenderer.invoke('dialog:openBackground'),
  openMilkdrop: () => ipcRenderer.invoke('dialog:openMilkdrop'),
  getSavePath: () => ipcRenderer.invoke('dialog:getSavePath'),
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
  runtimeDiagnostics: () => ipcRenderer.invoke('runtime:diagnostics'),
  exportRuntimeDiagnostics: () => ipcRenderer.invoke('runtime:export-diagnostics'),
  syncSource: (state) => ipcRenderer.invoke('source:sync', state),
  onSourceState: (fn) => ipcRenderer.on('source:state', (_e, state) => fn(state)),
  onDisplaysChanged: (fn) => ipcRenderer.on('display:changed', (_e, list) => fn(list)),
  onRuntimeLifecycle: (fn) => ipcRenderer.on('runtime:lifecycle', (_e, state) => fn(state)),
  setFullscreen: (enabled) => ipcRenderer.invoke('window:fullscreen', enabled),
  soundCloudStatus: () => ipcRenderer.invoke('soundcloud:status'),
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
  radioSkip: () => ipcRenderer.invoke('radio:skip'),
  discordMessage: (message) => ipcRenderer.invoke('radio:discord-message', message),
  discordManual: (payload) => ipcRenderer.invoke('radio:discord-manual', payload),
  discordNowPlaying: (payload) => ipcRenderer.invoke('radio:discord-nowplaying', payload),
  playerAlertSend: (payload) => ipcRenderer.invoke('player-alert:send', payload),
  playerAlertCurrent: () => ipcRenderer.invoke('player-alert:current'),
  playerAlertHistory: () => ipcRenderer.invoke('player-alert:history'),
  playerAlertStatus: () => ipcRenderer.invoke('player-alert:status')
});
