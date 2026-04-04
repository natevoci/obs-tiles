// src/preload/index.ts
const { contextBridge, ipcRenderer } = require('electron')

// Expose IPC methods for settings management
contextBridge.exposeInMainWorld('ipcRenderer', {
  getSettings: () => {
    return ipcRenderer.invoke('get-settings')
  },
  saveSettings: (settings: any) => {
    return ipcRenderer.invoke('save-settings', settings)
  },
  selectFolder: (defaultPath?: string) => {
    return ipcRenderer.invoke('select-folder', defaultPath)
  },
})
