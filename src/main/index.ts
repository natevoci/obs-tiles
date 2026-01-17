import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let portableConfig: any = null

// Configure portable mode: check if app is running in portable mode
function setupPortableMode() {
  // In dev mode, check project root. In production, check app directory.
  const portableConfigPath = isDev 
    ? path.join(process.cwd(), 'portable.json')
    : path.join(process.resourcesPath, '..', 'portable.json')
  
  console.log('Checking for portable config at:', portableConfigPath)
  
  if (fs.existsSync(portableConfigPath)) {
    try {
      const configContent = fs.readFileSync(portableConfigPath, 'utf-8')
      portableConfig = JSON.parse(configContent)
      
      // Use custom data directory if specified, otherwise use default 'data' subfolder
      const portableDataDir = portableConfig.dataDir || path.join(process.resourcesPath, '..', 'data')
      app.setPath('userData', portableDataDir)
    } catch (error) {
      console.error('Error reading portable.json:', error)
    }
  }
}

// Setup portable mode before app is ready
setupPortableMode()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

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
