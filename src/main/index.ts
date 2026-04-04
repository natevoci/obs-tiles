import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import path from 'path'
import fs from 'fs'
import { DEFAULT_SETTINGS } from '../shared/defaults'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
  
  const bounds = window.getBounds()
  const state = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized: window.isMaximized(),
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
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
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
