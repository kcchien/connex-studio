import { app, BrowserWindow, ipcMain, shell, dialog, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import log from 'electron-log/main.js'
import { registerAllHandlers, handleWindowClose, stopAllPollingGracefully, setForceQuit } from './ipc'
import { initializeProtocols } from './protocols'
import { getDataBuffer, closeDataBuffer, getConnectionManager, getPollingEngine, disposePollingEngine, getProfileService } from './services'
import { initializeUpdater } from './updater'

// Ignore EPIPE errors from broken stdout/stderr pipes (e.g. when parent process exits)
process.stdout?.on?.('error', () => {})
process.stderr?.on?.('error', () => {})

// Configure electron-log
log.initialize()
log.transports.file.level = 'info'
log.transports.file.maxSize = 10 * 1024 * 1024 // 10MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
log.transports.console.level = is.dev ? 'debug' : 'warn'

// Initialize Sentry error reporting (production only)
const SENTRY_DSN = process.env.SENTRY_DSN || ''
if (SENTRY_DSN && !is.dev) {
  import('@sentry/electron/main')
    .then((Sentry) => {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: 'production',
        release: `connex-studio@${app.getVersion()}`,
      })
      log.info('Sentry error reporting initialized')
    })
    .catch((error) => {
      log.warn('Sentry initialization skipped (module unavailable):', error)
    })
}

// Global error handlers — prevent silent crashes
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason)
})

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error)
  dialog.showErrorBox(
    'Unexpected Error',
    `An unexpected error occurred:\n\n${error.message}\n\nThe application will restart.`
  )
  app.quit()
})

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
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: true,
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
    // Only allow http(s) links to reach the OS browser; drop everything else
    if (/^https?:\/\//i.test(details.url)) {
      shell.openExternal(details.url)
    }
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

  // Initialize data buffer (SQLite). Continue startup even if native binding is unavailable.
  try {
    getDataBuffer()
    log.info('Data buffer initialized')
  } catch (error) {
    log.error('Data buffer initialization failed, continuing without DVR buffer', error)
  }

  // Register IPC handlers
  registerAllHandlers()
  log.info('IPC handlers registered')

  // Restore last session (connections + tags from previous run)
  getProfileService().restoreSession().catch((err) => {
    log.warn('Session restore failed:', err)
  })

  // Deny unnecessary permission requests (camera, microphone, geolocation, etc.)
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowedPermissions: string[] = ['clipboard-read']
    if (allowedPermissions.includes(permission)) {
      callback(true)
    } else {
      log.warn(`Denied permission request: ${permission}`)
      callback(false)
    }
  })

  // Set CSP headers — relaxed in dev for Vite HMR, strict in production
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = is.dev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws://localhost:*; img-src 'self' data:"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io"
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })

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

  // Initialize auto-updater (production only)
  if (!is.dev) {
    initializeUpdater(mainWindow!)
  }
})

app.on('window-all-closed', () => {
  log.info('All windows closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  log.info('App quitting')
  // Allow windows to close without confirmation dialog
  setForceQuit(true)
  // Auto-save session before shutdown
  try {
    await getProfileService().saveSession()
  } catch (err) {
    log.warn('Session auto-save failed:', err)
  }
  // Stop polling gracefully and close data buffer connection
  stopAllPollingGracefully()
  disposePollingEngine()
  closeDataBuffer()
})

// Export log instance for use in other modules
export { log, mainWindow }
