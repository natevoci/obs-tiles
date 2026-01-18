// src/preload/index.ts
const { contextBridge, ipcRenderer } = require('electron')

// Expose IPC methods for settings and config management
contextBridge.exposeInMainWorld('ipcRenderer', {
  getSettings: () => {
    return ipcRenderer.invoke('get-settings')
  },
  getConfig: () => {
    return ipcRenderer.invoke('get-config')
  },
  saveConfig: (config: any) => {
    return ipcRenderer.invoke('save-config', config)
  },
})
