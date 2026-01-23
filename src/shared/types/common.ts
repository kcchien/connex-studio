/**
 * Common type definitions shared between Main and Renderer processes.
 */

// IPC result type - success with optional data or error
export type IpcResultSuccess<T = unknown> = { success: true } & T
export type IpcResultError = { success: false; error: string }
export type IpcResult<T = unknown> = IpcResultSuccess<T> | IpcResultError

export type DataQuality = 'good' | 'bad' | 'uncertain'
