import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from '@renderer/components/common'
import './styles/globals.css'

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
