import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import log from 'electron-log/main.js'
import { registerAllHandlers } from './ipc'
import { initializeProtocols } from './protocols'
import { getDataBuffer, closeDataBuffer } from './services'

// Configure electron-log
log.initialize()
log.transports.file.level = 'info'
log.transports.file.maxSize = 10 * 1024 * 1024 // 10MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
log.transports.console.level = is.dev ? 'debug' : 'warn'

// Log app startup
log.info('======================================')
log.info('Connex Studio starting...')
log.info(`Version: ${app.getVersion()}`)
log.info(`Platform: ${process.platform}`)
log.info(`Electron: ${process.versions.electron}`)
log.info(`Node: ${process.versions.node}`)
log.info('======================================')

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    log.info('Main window ready')
  })

  mainWindow.on('close', async (event) => {
    // TODO: Check for unsaved changes before closing
    log.info('Main window closing')
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Open DevTools in development
  if (is.dev) {
    mainWindow.webContents.openDevTools()
  }
}

// App lifecycle
app.whenReady().then(() => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId('com.connex-studio')

  // Initialize protocol adapters
  initializeProtocols()
  log.info('Protocol adapters initialized')

  // Initialize data buffer (SQLite)
  const dataBuffer = getDataBuffer()
  log.info('Data buffer initialized')

  // Register IPC handlers
  registerAllHandlers()
  log.info('IPC handlers registered')

  // Default open or close DevTools by F12 in dev
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  log.info('App ready')
})

app.on('window-all-closed', () => {
  log.info('All windows closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  log.info('App quitting')
  // Close data buffer connection
  closeDataBuffer()
})

// App lifecycle IPC handlers (not part of domain-specific handlers)
ipcMain.handle('app:check-unsaved', async () => {
  // TODO: Implement actual check with ConnectionManager state
  return {
    hasUnsavedChanges: false,
    pollingActive: false
  }
})

ipcMain.on('app:force-quit', () => {
  log.info('Force quit requested')
  app.quit()
})

// Export log instance for use in other modules
export { log, mainWindow }
