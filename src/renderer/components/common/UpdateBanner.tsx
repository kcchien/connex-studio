import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, RefreshCw, X } from 'lucide-react'

type UpdateState = 'idle' | 'available' | 'downloading' | 'ready'

export function UpdateBanner(): React.ReactElement | null {
  const { t } = useTranslation('layout')
  const [state, setState] = useState<UpdateState>('idle')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsubs = [
      window.electronAPI.updater.onUpdateAvailable((info) => {
        setVersion(info.version)
        setState('available')
        setDismissed(false)
      }),
      window.electronAPI.updater.onDownloadProgress((p) => {
        setState('downloading')
        setProgress(Math.round(p.percent))
      }),
      window.electronAPI.updater.onUpdateDownloaded(() => {
        setState('ready')
      }),
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [])

  const handleDownload = useCallback(() => {
    setState('downloading')
    window.electronAPI.updater.download()
  }, [])

  const handleInstall = useCallback(() => {
    window.electronAPI.updater.install()
  }, [])

  if (state === 'idle' || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800 text-sm"
    >
      <Download className="w-4 h-4 text-blue-500 flex-shrink-0" />

      {state === 'available' && (
        <>
          <span className="text-gray-700 dark:text-gray-300">
            {t('update.available', { version })}
          </span>
          <button
            onClick={handleDownload}
            className="ml-auto px-3 py-1 rounded bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors"
          >
            {t('update.download')}
          </button>
        </>
      )}

      {state === 'downloading' && (
        <span className="text-gray-700 dark:text-gray-300">
          {t('update.downloading', { progress })}
        </span>
      )}

      {state === 'ready' && (
        <>
          <span className="text-gray-700 dark:text-gray-300">
            {t('update.ready')}
          </span>
          <button
            onClick={handleInstall}
            className="ml-auto inline-flex items-center gap-1 px-3 py-1 rounded bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            {t('update.restart')}
          </button>
        </>
      )}

      <button
        onClick={() => setDismissed(true)}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        aria-label={t('update.dismiss')}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
