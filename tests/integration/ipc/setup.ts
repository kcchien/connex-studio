/**
 * IPC Integration Test Infrastructure
 *
 * Provides mock infrastructure for testing IPC handlers without Electron runtime.
 * Captures registered ipcMain.handle handlers and provides a helper to invoke them
 * directly, simulating ipcRenderer.invoke calls.
 */

// ---------------------------------------------------------------------------
// Handler registry: captures all ipcMain.handle registrations
// ---------------------------------------------------------------------------

type IpcHandler = (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown

const handlerRegistry = new Map<string, IpcHandler>()

/**
 * Reset all captured handlers. Call in afterEach / beforeEach.
 */
export function resetHandlerRegistry(): void {
  handlerRegistry.clear()
}

/**
 * Invoke a registered IPC handler by channel name.
 * Simulates what ipcRenderer.invoke does on the Renderer side.
 */
export async function invokeHandler<T = unknown>(
  channel: string,
  ...args: unknown[]
): Promise<T> {
  const handler = handlerRegistry.get(channel)
  if (!handler) {
    throw new Error(`No handler registered for channel: ${channel}`)
  }
  // First argument to ipcMain.handle callback is the IpcMainInvokeEvent (mocked as null)
  const result = await handler(null, ...args)
  return result as T
}

/**
 * Check whether a handler has been registered for a channel.
 */
export function hasHandler(channel: string): boolean {
  return handlerRegistry.has(channel)
}

// ---------------------------------------------------------------------------
// Electron module mock
// ---------------------------------------------------------------------------

// ipcMain mock that stores handlers in the registry
const ipcMainMock = {
  handle: jest.fn((channel: string, handler: IpcHandler) => {
    handlerRegistry.set(channel, handler)
  }),
  removeHandler: jest.fn((channel: string) => {
    handlerRegistry.delete(channel)
  }),
  on: jest.fn(),
  once: jest.fn()
}

// BrowserWindow mock
const browserWindowMock = {
  getFocusedWindow: jest.fn(() => null),
  getAllWindows: jest.fn(() => [])
}

// dialog mock
const dialogMock = {
  showSaveDialog: jest.fn(),
  showOpenDialog: jest.fn(),
  showMessageBox: jest.fn()
}

// Mock the entire electron module
jest.mock('electron', () => ({
  ipcMain: ipcMainMock,
  BrowserWindow: browserWindowMock,
  dialog: dialogMock,
  app: {
    getVersion: jest.fn(() => '1.0.0-test'),
    getPath: jest.fn((name: string) => `/tmp/connex-test/${name}`),
    getName: jest.fn(() => 'connex-studio-test'),
    isReady: jest.fn(() => true)
  }
}))

// Mock electron-log
jest.mock('electron-log/main.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn()
  },
  __esModule: true
}))

// ---------------------------------------------------------------------------
// Exports for test files
// ---------------------------------------------------------------------------

export { ipcMainMock, browserWindowMock, dialogMock }
