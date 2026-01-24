/**
 * Type-safe IPC wrapper for Renderer process.
 * Provides typed access to the electronAPI exposed via preload.
 */

// Re-export the electronAPI from window for convenience
export const api = window.electronAPI

// Helper type to extract the API structure
export type ElectronAPI = typeof window.electronAPI

// Connection API
export const connectionApi = api.connection
export const tagApi = api.tag
export const pollingApi = api.polling
export const dvrApi = api.dvr
export const profileApi = api.profile
export const exportApi = api.export
export const virtualServerApi = api.virtualServer
export const logApi = api.log
export const appApi = api.app
export const environmentApi = api.environment
export const collectionApi = api.collection
export const bridgeApi = api.bridge
export const dashboardApi = api.dashboard
export const alertApi = api.alert
export const opcuaApi = api.opcua

// Utility function to handle IPC results
export function handleIpcResult<T>(
  result: { success: true } & T | { success: false; error: string }
): T {
  if (!result.success) {
    throw new Error(result.error)
  }
  // Remove success property and return the rest
  const { success, ...data } = result
  return data as T
}

// Async wrapper that throws on error
export async function invokeWithError<T>(
  promise: Promise<{ success: true } & T | { success: false; error: string }>
): Promise<T> {
  const result = await promise
  return handleIpcResult(result)
}
