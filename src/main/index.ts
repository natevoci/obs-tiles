import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import path from 'path'
import fs from 'fs'
import { DEFAULT_SETTINGS } from '../shared/defaults'
import { RtspManager } from './RtspManager'
import { registerYouTubeOAuthIpc } from './YouTubeOAuthServer'
import type { RtspStartOptions } from './RtspManager'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const rtspManager = new RtspManager()

const isDev = process.env.NODE_ENV === 'development'
const basePath = isDev ? process.cwd() : path.join(process.resourcesPath, '..')

// All user data lives in <basePath>/data
const dataDir = path.join(basePath, 'data')
app.setPath('userData', dataDir)

let mainWindow: BrowserWindow | null = null

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Load settings from data/settings.json
function loadSettings(): any {
  const settingsPath = path.join(dataDir, 'settings.json')

  console.log('Loading settings from:', settingsPath)

  if (fs.existsSync(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf-8')
      return { ...DEFAULT_SETTINGS, ...JSON.parse(content) }
    } catch (error) {
      console.error('Error reading settings.json:', error)
      return { ...DEFAULT_SETTINGS }
    }
  }

  // Create default settings file
  ensureDataDir()
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(DEFAULT_SETTINGS, null, 2))
    console.log('Created default settings.json')
  } catch (error) {
    console.error('Error creating settings.json:', error)
  }
  return { ...DEFAULT_SETTINGS }
}

// Save settings to data/settings.json
function saveSettings(settings: any): boolean {
  const settingsPath = path.join(dataDir, 'settings.json')

  ensureDataDir()
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
    return true
  } catch (error) {
    console.error('Error saving settings.json:', error)
    return false
  }
}

function backupConfigOnClose() {
  const settings = loadSettings()
  const enabled = Boolean(settings?.autoBackupConfigOnClose)
  const configuredFolder = String(settings?.autoBackupConfigFolder ?? '').trim()

  if (!enabled || !configuredFolder) {
    return
  }

  const backupDir = path.isAbsolute(configuredFolder)
    ? configuredFolder
    : path.join(basePath, configuredFolder)

  const sourceConfigPath = path.join(dataDir, 'config.json')
  const targetConfigPath = path.join(backupDir, 'config.json')

  try {
    fs.mkdirSync(backupDir, { recursive: true })

    if (fs.existsSync(sourceConfigPath)) {
      fs.copyFileSync(sourceConfigPath, targetConfigPath)
      return
    }

    const currentConfigIndex = Number(settings?.currentConfigIndex ?? 0)
    const configs = Array.isArray(settings?.configs) ? settings.configs : []
    const fallbackConfig = configs[currentConfigIndex] ?? configs[0] ?? DEFAULT_SETTINGS.configs[0]
    fs.writeFileSync(targetConfigPath, JSON.stringify(fallbackConfig, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error backing up config.json on close:', error)
  }
}

// Load window state from storage
function loadWindowState() {
  const stateFile = path.join(app.getPath('userData'), 'windowState.json')
  const defaultState = { width: 1200, height: 800 }
  
  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'))
      return state
    } catch (error) {
      console.error('Error reading window state:', error)
      return defaultState
    }
  }
  
  return defaultState
}

// Save window state to storage
function saveWindowState(window: BrowserWindow) {
  if (!window) return

  const isMaximized = window.isMaximized()
  const currentState = loadWindowState()
  const bounds = window.getBounds()
  const contentBounds = window.getContentBounds()

  const state = {
    x: isMaximized ? currentState.x ?? bounds.x : bounds.x,
    y: isMaximized ? currentState.y ?? bounds.y : bounds.y,
    // Persist content size to avoid frame rounding drift on fractional DPI scaling.
    width: isMaximized ? currentState.width ?? contentBounds.width : contentBounds.width,
    height: isMaximized ? currentState.height ?? contentBounds.height : contentBounds.height,
    isMaximized,
  }
  
  const stateFile = path.join(app.getPath('userData'), 'windowState.json')
  
  // Ensure directory exists
  const dir = path.dirname(stateFile)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2))
}

function createWindow() {
  const windowState = loadWindowState()
  const appSettings = loadSettings()
  const windowTitle: string = appSettings?.title || 'obs-tiles'

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    useContentSize: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Restore maximized state if it was maximized before
  if (windowState.isMaximized) {
    mainWindow.maximize()
  }

  // Set window title from stored settings
  mainWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault()
    mainWindow?.setTitle(windowTitle)
  })

  if (isDev) {
    const DEV_URL = 'http://localhost:5173'
    const MAX_RETRIES = 20
    const RETRY_DELAY_MS = 500
    let loadAttempts = 0

    mainWindow.webContents.openDevTools()
    mainWindow.webContents.on('did-finish-load', () => console.log('[dev] webContents: did-finish-load'))
    mainWindow.webContents.on('did-fail-load', (_e, code, desc, failedUrl, isMainFrame) => {
      console.error(`[dev] webContents: did-fail-load — ${code} ${desc} (${failedUrl})`)
      if (!isMainFrame) return
      if (loadAttempts < MAX_RETRIES) {
        console.log(`[dev] Retrying loadURL in ${RETRY_DELAY_MS}ms (attempt ${loadAttempts + 1}/${MAX_RETRIES})...`)
        setTimeout(() => mainWindow?.loadURL(DEV_URL), RETRY_DELAY_MS)
      } else {
        console.error('[dev] Giving up after max retries.')
      }
    })

    console.log(`[dev] Loading ${DEV_URL} (attempt 1)...`)
    loadAttempts++
    mainWindow.loadURL(DEV_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Save window state on close
  mainWindow.on('close', () => {
    backupConfigOnClose()
    saveWindowState(mainWindow!)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  rtspManager.stopAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// IPC handlers
ipcMain.handle('get-settings', () => {
  return loadSettings()
})

ipcMain.handle('save-settings', (_event, settings: any) => {
  return saveSettings(settings)
})

ipcMain.handle('select-folder', async (_event, defaultPath?: string) => {
  const result = await dialog.showOpenDialog({
    title: 'Select backup folder',
    defaultPath: typeof defaultPath === 'string' && defaultPath.trim() ? defaultPath : undefined,
    properties: ['openDirectory', 'createDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
})

// RTSP IPC handlers
ipcMain.handle('rtsp-start', async (event, options: RtspStartOptions) => {
  await rtspManager.start(options, event.sender)
})

ipcMain.handle('rtsp-stop', async (_event, streamId: string) => {
  await rtspManager.stop(streamId)
})

ipcMain.handle('rtsp-set-muted', (_event, streamId: string, muted: boolean) => {
  rtspManager.setMuted(streamId, muted)
})

// ---------------------------------------------------------------------------
// YouTube OAuth IPC
// ---------------------------------------------------------------------------

registerYouTubeOAuthIpc()

// ---------------------------------------------------------------------------
