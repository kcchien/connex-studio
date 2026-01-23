import { useState } from 'react'

function App(): React.ReactElement {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Connex Studio
          </h1>
          <p className="text-muted-foreground mt-2">
            IIoT Protocol Studio - Industrial Communication Testing Tool
          </p>
        </header>

        <main className="space-y-6">
          <div className="p-6 rounded-lg border bg-card">
            <h2 className="text-xl font-semibold mb-4">Development Mode</h2>
            <p className="text-muted-foreground mb-4">
              The application is running in development mode.
              Hot Module Replacement (HMR) is enabled.
            </p>
            <button
              onClick={() => setCount(count + 1)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Click Count: {count}
            </button>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <h2 className="text-xl font-semibold mb-4">Status</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-connected"></span>
                <span>Electron + Vite: Ready</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-connected"></span>
                <span>React 19: Ready</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-connected"></span>
                <span>Tailwind CSS: Ready</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-connected"></span>
                <span>IPC Bridge: Ready</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-connected"></span>
                <span>SQLite (DVR): Ready</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-connected"></span>
                <span>Protocol Adapters: Ready</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
            <p className="text-muted-foreground">
              Phase 2 complete. Proceed to Phase 3: User Story 1 - Quick Connection Test.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
