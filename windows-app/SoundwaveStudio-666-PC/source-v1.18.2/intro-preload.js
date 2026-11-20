const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('introApi', {
  complete: () => ipcRenderer.invoke('intro:complete')
});
