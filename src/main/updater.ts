import pkg from 'electron-updater'
const { autoUpdater } = pkg
import type { UpdateInfo, ProgressInfo } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log/main.js'

// Use electron-log for updater logging
autoUpdater.logger = log
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

export function initializeUpdater(mainWindow: BrowserWindow): void {
  // Notify renderer of update events
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info(`Update available: ${info.version}`)
    mainWindow.webContents.send('updater:update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', () => {
    log.info('No update available')
    mainWindow.webContents.send('updater:update-not-available')
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    mainWindow.webContents.send('updater:download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info(`Update downloaded: ${info.version}`)
    mainWindow.webContents.send('updater:update-downloaded', {
      version: info.version,
    })
  })

  autoUpdater.on('error', (error) => {
    log.error('Updater error:', error)
  })

  // IPC handlers for renderer-triggered actions
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { updateAvailable: result?.updateInfo != null }
    } catch (error) {
      log.error('Check for updates failed:', error)
      return { updateAvailable: false }
    }
  })

  ipcMain.handle('updater:download', async () => {
    await autoUpdater.downloadUpdate()
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
  })

  // Check for updates 10s after startup (avoid blocking init)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.warn('Auto-update check failed:', err)
    })
  }, 10_000)
}
