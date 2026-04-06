// src/preload/index.ts
const { contextBridge, ipcRenderer } = require('electron')

// ============================================================================
// Listener wrapper maps - needed so removeListener can receive the same
// function reference that was registered with ipcRenderer.on()
// ============================================================================
const rtspFrameListeners = new Map<Function, Function>()
const rtspErrorListeners = new Map<Function, Function>()
const rtspConnectingListeners = new Map<Function, Function>()
const rtspAudioLevelListeners = new Map<Function, Function>()

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

  // RTSP stream control (Electron-only)
  rtspStart: (options: any) => {
    return ipcRenderer.invoke('rtsp-start', options)
  },
  rtspStop: (streamId: string) => {
    return ipcRenderer.invoke('rtsp-stop', streamId)
  },
  rtspSetMuted: (streamId: string, muted: boolean) => {
    return ipcRenderer.invoke('rtsp-set-muted', streamId, muted)
  },
  onRtspFrame: (callback: (payload: { streamId: string; data: string }) => void) => {
    const wrapped = (_event: any, payload: any) => callback(payload)
    rtspFrameListeners.set(callback, wrapped)
    ipcRenderer.on('rtsp-frame', wrapped)
  },
  offRtspFrame: (callback: (payload: { streamId: string; data: string }) => void) => {
    const wrapped = rtspFrameListeners.get(callback)
    if (wrapped) {
      ipcRenderer.removeListener('rtsp-frame', wrapped as any)
      rtspFrameListeners.delete(callback)
    }
  },
  onRtspError: (callback: (payload: { streamId: string; message: string }) => void) => {
    const wrapped = (_event: any, payload: any) => callback(payload)
    rtspErrorListeners.set(callback, wrapped)
    ipcRenderer.on('rtsp-error', wrapped)
  },
  offRtspError: (callback: (payload: { streamId: string; message: string }) => void) => {
    const wrapped = rtspErrorListeners.get(callback)
    if (wrapped) {
      ipcRenderer.removeListener('rtsp-error', wrapped as any)
      rtspErrorListeners.delete(callback)
    }
  },
  onRtspConnecting: (callback: (payload: { streamId: string }) => void) => {
    const wrapped = (_event: any, payload: any) => callback(payload)
    rtspConnectingListeners.set(callback, wrapped)
    ipcRenderer.on('rtsp-connecting', wrapped)
  },
  offRtspConnecting: (callback: (payload: { streamId: string }) => void) => {
    const wrapped = rtspConnectingListeners.get(callback)
    if (wrapped) {
      ipcRenderer.removeListener('rtsp-connecting', wrapped as any)
      rtspConnectingListeners.delete(callback)
    }
  },
  onRtspAudioLevel: (callback: (payload: { streamId: string; level: number }) => void) => {
    const wrapped = (_event: any, payload: any) => callback(payload)
    rtspAudioLevelListeners.set(callback, wrapped)
    ipcRenderer.on('rtsp-audio-level', wrapped)
  },
  offRtspAudioLevel: (callback: (payload: { streamId: string; level: number }) => void) => {
    const wrapped = rtspAudioLevelListeners.get(callback)
    if (wrapped) {
      ipcRenderer.removeListener('rtsp-audio-level', wrapped as any)
      rtspAudioLevelListeners.delete(callback)
    }
  },
})
