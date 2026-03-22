import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/electron/renderer'
import App from './App'
import { ErrorBoundary } from '@renderer/components/common'
import './styles/globals.css'

// Initialize Sentry error reporting (production only)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || ''
if (SENTRY_DSN && !import.meta.env.DEV) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: 'production',
  })
}

// Global error handlers for renderer process
window.onerror = (_message, _source, _lineno, _colno, error) => {
  console.error('[window.onerror]', error)
}

window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  console.error('[unhandledrejection]', event.reason)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
