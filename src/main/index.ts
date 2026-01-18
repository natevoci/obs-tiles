import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import path from 'path'
import fs from 'fs'
import { DEFAULT_CONFIG } from '../shared/defaults'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const isDev = process.env.NODE_ENV === 'development'
const basePath = isDev ? process.cwd() : path.join(process.resourcesPath, '..')

let mainWindow: BrowserWindow | null = null

// Default settings for settings.json
const DEFAULT_SETTINGS = {
  title: 'obs-tiles',
  dataDir: 'data'
}

interface Settings {
  title: string
  dataDir: string
}

let appSettings: Settings = { ...DEFAULT_SETTINGS }
let dataDir: string = ''

// Load or create settings.json
function loadSettings(): Settings {
  const settingsPath = path.join(basePath, 'settings.json')
  
  console.log('Loading settings from:', settingsPath)
  
  if (fs.existsSync(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf-8')
      return { ...DEFAULT_SETTINGS, ...JSON.parse(content) }
    } catch (error) {
      console.error('Error reading settings.json:', error)
      return { ...DEFAULT_SETTINGS }
    }
  } else {
    // Create default settings file
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(DEFAULT_SETTINGS, null, 2))
      console.log('Created default settings.json')
    } catch (error) {
      console.error('Error creating settings.json:', error)
    }
    return { ...DEFAULT_SETTINGS }
  }
}

// Setup portable mode (always enabled now)
function setupPortableMode() {
  appSettings = loadSettings()
  
  // Use custom data directory if specified, otherwise use default 'data' subfolder
  // If dataDir is relative, resolve it relative to basePath
  const configuredDataDir = appSettings.dataDir || 'data'
  dataDir = path.isAbsolute(configuredDataDir) ? configuredDataDir : path.join(basePath, configuredDataDir)
  
  console.log('Setting userData path to:', dataDir)
  app.setPath('userData', dataDir)
}

// Load config from data directory
function loadConfig(): any {
  const configPath = path.join(dataDir, 'config.json')
  
  console.log('Loading config from:', configPath)
  
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('Error reading config.json:', error)
      return { ...DEFAULT_CONFIG }
    }
  }
  
  // Create default config file
  ensureDataDir()
  try {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2))
    console.log('Created default config.json')
  } catch (error) {
    console.error('Error creating config.json:', error)
  }
  return { ...DEFAULT_CONFIG }
}

// Save config to data directory
function saveConfig(config: any): boolean {
  const configPath = path.join(dataDir, 'config.json')
  
  ensureDataDir()
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    return true
  } catch (error) {
    console.error('Error saving config.json:', error)
    return false
  }
}

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Setup portable mode before app is ready
setupPortableMode()

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

  // Set window title from settings
  if (appSettings.title) {
    mainWindow.setTitle(appSettings.title)
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Save window state on close
  mainWindow.on('close', () => {
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
  return appSettings
})

ipcMain.handle('get-config', () => {
  return loadConfig()
})

ipcMain.handle('save-config', (_event, config: any) => {
  return saveConfig(config)
})
