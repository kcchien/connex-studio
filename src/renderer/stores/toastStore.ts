/**
 * Zustand store for toast notifications.
 */

import { create } from 'zustand'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  action?: ToastAction
  duration?: number // ms, undefined = no auto-dismiss
  createdAt: number
}

interface ToastState {
  toasts: Toast[]

  // Actions
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

let toastIdCounter = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++toastIdCounter}`
    const newToast: Toast = {
      ...toast,
      id,
      createdAt: Date.now(),
    }

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))

    // Auto-dismiss if duration is set
    if (toast.duration) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, toast.duration)
    }

    return id
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  clearToasts: () => {
    set({ toasts: [] })
  },
}))

// Helper function for showing disconnection toast
export function showDisconnectionToast(
  connectionName: string,
  host: string,
  error: string,
  onReconnect: () => void
): string {
  return useToastStore.getState().addToast({
    type: 'error',
    title: 'Connection Lost',
    message: `${connectionName} (${host}): ${error}`,
    action: {
      label: 'Reconnect',
      onClick: onReconnect,
    },
    duration: 10000, // 10 seconds
  })
}
