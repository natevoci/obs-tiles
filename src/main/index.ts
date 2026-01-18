import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const isDev = process.env.NODE_ENV === 'development'
const basePath = isDev ? process.cwd() : path.join(process.resourcesPath, '..')

let mainWindow: BrowserWindow | null = null
let portableConfig: any = null

// Configure portable mode: check if app is running in portable mode
function setupPortableMode() {
  // In dev mode, check project root. In production, check app directory.
  const portableConfigPath = path.join(basePath, isDev ? 'portable.dev.json' : 'portable.json')
  
  console.log('Checking for portable config at:', portableConfigPath)
  
  if (fs.existsSync(portableConfigPath)) {
    try {
      const configContent = fs.readFileSync(portableConfigPath, 'utf-8')
      portableConfig = JSON.parse(configContent)
      
      // Use custom data directory if specified, otherwise use default 'data' subfolder
      // If dataDir is relative, resolve it relative to basePath
      const portableDataDir = portableConfig.dataDir || 'data';
      const portableDataDirFull = path.isAbsolute(portableDataDir) ? portableDataDir : path.join(basePath, portableDataDir)
      console.log('Setting userData path to:', portableDataDirFull)
      app.setPath('userData', portableDataDirFull)
    } catch (error) {
      console.error('Error reading portable.json:', error)
    }
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

  // Set window title from portable.json if available
  if (portableConfig?.title) {
    mainWindow.setTitle(portableConfig.title)
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
ipcMain.handle('get-portable-config', () => {
  return portableConfig
})
