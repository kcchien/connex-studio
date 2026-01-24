/**
 * useKeyboardShortcuts Hook
 *
 * Provides global keyboard shortcuts for the application.
 *
 * Shortcuts:
 * - Ctrl+Enter (Cmd+Enter on Mac): Connect to selected connection
 * - F5: Start polling
 * - Shift+F5: Stop polling
 * - Ctrl+L (Cmd+L on Mac): Toggle log viewer
 *
 * @see spec.md FR-027
 */

import { useEffect, useCallback } from 'react'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useTagStore } from '@renderer/stores/tagStore'
import { useUIStore } from '@renderer/stores/uiStore'

interface KeyboardShortcutHandlers {
  onConnect?: () => void
  onStartPolling?: () => void
  onStopPolling?: () => void
  onToggleLogViewer?: () => void
}

/**
 * Custom hook to handle global keyboard shortcuts.
 *
 * @param handlers - Optional custom handlers for keyboard shortcuts
 */
export function useKeyboardShortcuts(handlers?: KeyboardShortcutHandlers): void {
  const selectedConnectionId = useConnectionStore((state) => state.selectedConnectionId)
  const connections = useConnectionStore((state) => state.connections)
  const getTags = useTagStore((state) => state.getTags)
  const toggleLogViewer = useUIStore((state) => state.toggleLogViewer)

  const selectedConnection = connections.find((c) => c.id === selectedConnectionId)

  // Default connect handler
  const handleConnect = useCallback(async () => {
    if (handlers?.onConnect) {
      handlers.onConnect()
      return
    }

    if (!selectedConnectionId) return

    const connection = connections.find((c) => c.id === selectedConnectionId)
    if (!connection) return

    try {
      if (connection.status === 'connected') {
        await window.electronAPI.connection.disconnect(selectedConnectionId)
      } else if (connection.status === 'disconnected' || connection.status === 'error') {
        await window.electronAPI.connection.connect(selectedConnectionId)
      }
    } catch (error) {
      console.error('Keyboard shortcut connect failed:', error)
    }
  }, [selectedConnectionId, connections, handlers])

  // Default polling handlers
  const handleStartPolling = useCallback(async () => {
    if (handlers?.onStartPolling) {
      handlers.onStartPolling()
      return
    }

    if (!selectedConnectionId) return
    if (selectedConnection?.status !== 'connected') return

    // Get all enabled tags for this connection
    const tags = getTags(selectedConnectionId)
    const enabledTagIds = tags.filter((t) => t.enabled).map((t) => t.id)

    if (enabledTagIds.length === 0) {
      console.warn('No enabled tags to poll')
      return
    }

    try {
      await window.electronAPI.polling.start({
        connectionId: selectedConnectionId,
        tagIds: enabledTagIds,
        intervalMs: 1000
      })
    } catch (error) {
      console.error('Keyboard shortcut start polling failed:', error)
    }
  }, [selectedConnectionId, selectedConnection, getTags, handlers])

  const handleStopPolling = useCallback(async () => {
    if (handlers?.onStopPolling) {
      handlers.onStopPolling()
      return
    }

    if (!selectedConnectionId) return

    try {
      await window.electronAPI.polling.stop(selectedConnectionId)
    } catch (error) {
      console.error('Keyboard shortcut stop polling failed:', error)
    }
  }, [selectedConnectionId, handlers])

  // Log viewer toggle handler
  const handleToggleLogViewer = useCallback(() => {
    if (handlers?.onToggleLogViewer) {
      handlers.onToggleLogViewer()
      return
    }

    toggleLogViewer()
  }, [toggleLogViewer, handlers])

  // Global keyboard event listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const ctrlOrMeta = isMac ? event.metaKey : event.ctrlKey

      // Ctrl+Enter (Cmd+Enter on Mac): Connect/Disconnect
      if (ctrlOrMeta && event.key === 'Enter') {
        event.preventDefault()
        handleConnect()
        return
      }

      // F5: Start polling
      if (event.key === 'F5' && !event.shiftKey) {
        event.preventDefault()
        handleStartPolling()
        return
      }

      // Shift+F5: Stop polling
      if (event.key === 'F5' && event.shiftKey) {
        event.preventDefault()
        handleStopPolling()
        return
      }

      // Ctrl+L (Cmd+L on Mac): Toggle log viewer
      if (ctrlOrMeta && event.key === 'l') {
        event.preventDefault()
        handleToggleLogViewer()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleConnect, handleStartPolling, handleStopPolling, handleToggleLogViewer])
}
