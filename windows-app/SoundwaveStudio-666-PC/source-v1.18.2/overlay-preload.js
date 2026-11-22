'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('rwOverlay',{
  ready:()=>ipcRenderer.invoke('workspace:overlay-ready'),
  action:(payload)=>ipcRenderer.invoke('workspace:overlay-action',payload),
  onInit:(fn)=>ipcRenderer.on('workspace:overlay-init',(_e,payload)=>fn(payload)),
  onSync:(fn)=>ipcRenderer.on('workspace:overlay-sync',(_e,payload)=>fn(payload))
});
