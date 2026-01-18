// src/preload/index.ts
const { contextBridge, ipcRenderer } = require('electron')

// Expose IPC method so renderer can fetch portable config on demand
contextBridge.exposeInMainWorld('ipcRenderer', {
  getPortableConfig: () => {
    return ipcRenderer.invoke('get-portable-config')
  },
})
