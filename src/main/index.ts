import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import log from 'electron-log/main.js'
import { registerAllHandlers, handleWindowClose, stopAllPollingGracefully } from './ipc'
import { initializeProtocols } from './protocols'
import { getDataBuffer, closeDataBuffer, getConnectionManager, getPollingEngine, disposePollingEngine } from './services'

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
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    log.info('Main window ready')
  })

  mainWindow.on('close', (event) => {
    handleWindowClose(event, mainWindow!)
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

  // Set mainWindow on ConnectionManager for push events
  getConnectionManager().setMainWindow(mainWindow)

  // Set mainWindow on PollingEngine for push events
  getPollingEngine().setMainWindow(mainWindow)

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

app.on('before-quit', async () => {
  log.info('App quitting')
  // Stop polling gracefully and close data buffer connection
  await stopAllPollingGracefully()
  disposePollingEngine()
  closeDataBuffer()
})

// Export log instance for use in other modules
export { log, mainWindow }
